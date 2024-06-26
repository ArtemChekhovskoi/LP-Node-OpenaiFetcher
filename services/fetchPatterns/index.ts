import { UsersOpenaiPatternsQueue } from "@models/users_openai_patterns_queue";
import { logger } from "@logger/index";
import { OpenaiPatterns } from "@models/openai_patterns";
import { getMeasurementsToFetch, TMeasurementCode } from "@helpers/getMeasurementsToFetch";
import dayjs from "dayjs";
import OpenAI from "openai";
import { FETCH_PATTERNS_PROMPT } from "@constants/prompts";
import validateOpenaiPatternsResponse from "@helpers/validateOpenaiPatternsResponse";
import config from "../../config";

const PATTERNS_BATCH_SIZE = 5;
async function main() {
	try {
		const patternsInUsersQueueCount = await UsersOpenaiPatternsQueue.countDocuments({ statusCode: 0 });
		if (!patternsInUsersQueueCount) {
			return;
		}

		const patternsConfig = await OpenaiPatterns.find(
			{ active: true },
			{ pair: true, compareIntervalValue: true, compareIntervalType: true }
		).lean();
		for (let i = 0; i < patternsInUsersQueueCount; i += PATTERNS_BATCH_SIZE) {
			const patternsInUsersQueue = await UsersOpenaiPatternsQueue.find({ statusCode: 0 }, { openaiPatternsID: true, usersID: true })
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

					return { usersID: pattern.usersID, measurementPairWithData };
				})
			);

			const openai = new OpenAI({ apiKey: config.fetchPatterns.openaiApi });
			const content = FETCH_PATTERNS_PROMPT(JSON.stringify(usersPatternsQueueWithData));
			const completion = await openai.chat.completions.create({
				messages: [{ role: "system", content }],
				model: "gpt-4",
			});

			const openaiAnswer = JSON.parse(completion?.choices?.[0]?.message?.content || "");
			const isAnswerValid = validateOpenaiPatternsResponse(openaiAnswer);
		}
	} catch (e) {
		logger.error(`Error at fetchPatterns ${e}`, e);
	} finally {
		logger.info(`Going to sleep for ${config.fetchPatterns.sleepTimeSeconds} seconds`);
	}
}

export default main;
