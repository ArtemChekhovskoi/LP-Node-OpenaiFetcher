import { OpenaiPatterns } from "@models/openai_patterns";
import { Users } from "@models/users";
import { logger } from "@logger/index";
import { UsersOpenaiPatternsQueue } from "@models/users_openai_patterns_queue";
import dayjs from "dayjs";
import { getMeasurementsToFetch, TMeasurementCode } from "@helpers/getMeasurementsToFetch";
import { USERS_PATTERNS_STATUSES } from "@constants/patterns";

const USERS_BATCH_SIZE = 100;
const createOpenaiQueue = async () => {
	try {
		const [usersCount, openaiPatterns] = await Promise.all([
			Users.countDocuments({ active: true }),
			OpenaiPatterns.find({ active: true }),
		]);

		if (!usersCount || !openaiPatterns?.length) {
			throw new Error("No users or patterns found");
		}

		for (let i = 0; i < usersCount; i += USERS_BATCH_SIZE) {
			const users = await Users.find({ active: true }, { _id: true }).skip(i).limit(USERS_BATCH_SIZE).lean();
			if (!users || !users?.length) {
				break;
			}
			const usersIDs = users.map((user) => user._id);
			const usersPatterns = await UsersOpenaiPatternsQueue.find(
				{ usersID: { $in: usersIDs } },
				{ usersID: true, openaiPatternsID: true }
			).lean();

			const usersPatternsQueueBulkWrite = [];
			for (const user of users) {
				const activePatternsIDsInQueue = usersPatterns
					.filter((usersPattern) => usersPattern.usersID.toString() === user._id.toString())
					.map((usersPattern) => usersPattern.openaiPatternsID.toString());
				const usersPatternsToFetch = openaiPatterns.filter((pattern) => !activePatternsIDsInQueue.includes(pattern._id.toString()));

				if (!usersPatternsToFetch?.length) {
					continue;
				}
				const usersPatternsFetchParams = usersPatternsToFetch.map((pattern) => {
					const fetchStartDate = dayjs()
						.subtract(pattern.compareIntervalValue, pattern.compareIntervalType)
						.startOf("day")
						.toDate();
					const measurementsInfo = pattern.pair.map((pair) => {
						return {
							measurementCode: pair.measurementCode as TMeasurementCode,
							recordsToFetch: {
								min: pair?.recordsToFetch?.min || 0,
								max: pair?.recordsToFetch?.max || 0,
							},
							startDate: fetchStartDate,
						};
					});
					return {
						patternsID: pattern._id,
						measurementsInfo,
					};
				});

				const patternsToFetchWithCounts = await Promise.all(
					usersPatternsFetchParams.map(async (params) => {
						const measurementsInfo = await Promise.all(
							params.measurementsInfo.map(async (measurementInfo) => {
								const count = await getMeasurementsToFetch({
									...measurementInfo,
									usersID: user._id,
									operationType: "countDocuments",
								});

								return {
									...measurementInfo,
									count,
								};
							})
						);
						return {
							...params,
							measurementsInfo,
						};
					})
				);

				const patternsToAddToQueue = patternsToFetchWithCounts.filter((pattern) => {
					return pattern.measurementsInfo.every((measurement) => {
						return (
							typeof measurement.count === "number" &&
							measurement.count >= measurement.recordsToFetch.min &&
							measurement.count <= measurement.recordsToFetch.max
						);
					});
				});

				for (const patternToAdd of patternsToAddToQueue) {
					usersPatternsQueueBulkWrite.push({
						insertOne: {
							document: {
								usersID: user._id,
								openaiPatternsID: patternToAdd.patternsID,
								statusCode: USERS_PATTERNS_STATUSES.NEW,
								statusCodesHistory: [
									{
										statusCode: USERS_PATTERNS_STATUSES.NEW,
										created: new Date(),
									},
								],
							},
						},
					});
				}
			}

			if (usersPatternsQueueBulkWrite?.length) {
				logger.debug(`Bulk writing ${usersPatternsQueueBulkWrite.length} patterns`);
				await UsersOpenaiPatternsQueue.bulkWrite(usersPatternsQueueBulkWrite);
			}
		}
	} catch (e) {
		logger.error(`Error at createOpenaiQueue ${e}`);
		logger.error(e);
	}
};

export default createOpenaiQueue;
