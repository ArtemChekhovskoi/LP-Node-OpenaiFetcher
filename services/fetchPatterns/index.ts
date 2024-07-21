import { UsersOpenaiPatternsQueue } from "@models/users_openai_patterns_queue";
import { encode } from "gpt-3-encoder";
import { logger } from "@logger/index";
import { OpenaiPatterns } from "@models/openai_patterns";
import { getMeasurementsToFetch, TMeasurementCode } from "@helpers/getMeasurementsToFetch";
import dayjs from "dayjs";
import OpenAI from "openai";
import { FETCH_PATTERNS_PROMPT } from "@constants/prompts";
import validateOpenaiPatternsResponse from "@helpers/validateOpenaiPatternsResponse";
import { ClientSession, Document } from "mongoose";
import { TUsersOpenaiPatterns, UsersOpenaiPatterns } from "@models/users_openai_patterns";
import { kafka } from "@helpers/kafkaConnectionManager";
import { KAFKA_TOPICS } from "@constants/kafkaTopics";
import config from "../../config";

const PATTERNS_BATCH_SIZE = 5;
const MAX_INPUT_TOKENS = 8000;
const { OPENAI_API_KEY } = process.env;

async function main() {
	let mongoSession: null | ClientSession = null;

	try {
		const patternsInUsersQueueCount = await UsersOpenaiPatternsQueue.countDocuments();
		if (!patternsInUsersQueueCount) {
			return;
		}

		const patternsConfig = await OpenaiPatterns.find(
			{ active: true },
			{ pair: true, compareIntervalValue: true, compareIntervalType: true }
		).lean();

		const usersOpenaiPatternsIDsArray: string[] = [];
		for (let i = 0; i < patternsInUsersQueueCount; i += PATTERNS_BATCH_SIZE) {
			const patternsInUsersQueue = await UsersOpenaiPatternsQueue.find({}, { openaiPatternsID: true, usersID: true })
				.skip(i)
				.limit(PATTERNS_BATCH_SIZE)
				.lean();
			const patternsInUsersQueueWithConfig = patternsInUsersQueue.map((pattern) => {
				const patternConfig = patternsConfig.find(
					(pairsConfig) => pairsConfig._id.toString() === pattern.openaiPatternsID.toString()
				);
				return { ...patternConfig, usersID: pattern.usersID };
			});

			const usersPatternsQueueWithData = await Promise.all(
				patternsInUsersQueueWithConfig.map(async (pattern) => {
					if (!pattern.pair?.length) {
						return;
					}
					const measurementPairWithData = await Promise.all(
						pattern.pair.map(async (pair) => {
							const fetchStartDate = dayjs()
								.subtract(pattern?.compareIntervalValue || 1, pattern.compareIntervalType)
								.startOf("day")
								.toDate();
							const fetchedMeasurements = await getMeasurementsToFetch({
								startDate: fetchStartDate,
								measurementCode: pair.measurementCode as TMeasurementCode,
								usersID: pattern.usersID,
								operationType: "find",
							});
							return {
								measurementCode: pair.measurementCode as TMeasurementCode,
								fetchedMeasurements,
							};
						})
					);

					return { usersID: pattern.usersID, openaiPatternsID: pattern._id, measurementPairWithData };
				})
			);

			if (
				!usersPatternsQueueWithData?.length ||
				!usersPatternsQueueWithData.every((pattern) => !pattern || pattern?.measurementPairWithData?.length)
			) {
				logger.error(`No data fetched for patterns ${JSON.stringify(usersPatternsQueueWithData)}`);
				return;
			}
			const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
			const content = FETCH_PATTERNS_PROMPT + JSON.stringify(usersPatternsQueueWithData);
			const contentTokenized = encode(content);
			if (contentTokenized.length > MAX_INPUT_TOKENS) {
				logger.error(`Content is too long ${contentTokenized.length}`);
			}

			const completion = await openai.chat.completions
				.create({
					messages: [
						{ role: "system", content: FETCH_PATTERNS_PROMPT },
						{ role: "user", content: JSON.stringify(usersPatternsQueueWithData) as string },
					],
					model: "gpt-4",
				})
				.catch(async (err) => {
					if (err instanceof OpenAI.APIError) {
						logger.error(`Openai response error: ${err}`);
					} else {
						throw err;
					}
				});

			logger.info("Openai response", completion?.choices?.[0]?.message?.content);
			const openaiAnswer = JSON.parse(completion?.choices?.[0]?.message?.content || "");
			const isAnswerValid = validateOpenaiPatternsResponse(openaiAnswer);
			if (!isAnswerValid) {
				logger.error(`Openai answer is not valid ${JSON.stringify(openaiAnswer)}`);
				return;
			}

			const usersPatternsQueueIDsToDelete = patternsInUsersQueue.map((pattern) => pattern._id);
			const newUsersOpenaiPatternsDocs: Document<TUsersOpenaiPatterns>[] = openaiAnswer.map((answer: any) => {
				return new UsersOpenaiPatterns({
					usersID: answer.usersID,
					openaiPatternsID: answer.openaiPatternsID,
					measurementCodes: answer.measurementCodes,
					isPatternFound: answer.isPatternFound,
					title: answer.title,
					description: answer.description,
					isShownToUser: false,
				});
			});
			mongoSession = await UsersOpenaiPatternsQueue.startSession();
			await mongoSession.withTransaction(async () => {
				await UsersOpenaiPatternsQueue.deleteMany({ _id: { $in: usersPatternsQueueIDsToDelete } });
				await UsersOpenaiPatterns.insertMany(newUsersOpenaiPatternsDocs);
			});
			await mongoSession.endSession();

			const usersOpenaiPatternsIDs = newUsersOpenaiPatternsDocs.map((doc) => doc._id!.toString());
			usersOpenaiPatternsIDsArray.push(...usersOpenaiPatternsIDs);
		}
		await kafka.produce(KAFKA_TOPICS.NEW_PATTERNS_FOUND, [{ value: JSON.stringify({ usersOpenaiPatternsIDsArray }) }]);
	} catch (e) {
		logger.error(`Error at fetchPatterns ${e}`, e);
	} finally {
		if (mongoSession) {
			await mongoSession.endSession();
		}
		logger.info(`Going to sleep for ${config.fetchPatterns.sleepTimeSeconds} seconds`);
	}
}

export default main;
