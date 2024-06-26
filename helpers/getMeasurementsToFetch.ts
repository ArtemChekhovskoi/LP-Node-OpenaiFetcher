import { ACTIVE_MEASUREMENTS } from "@constants/measurements";
import { UsersDailyReflections } from "@models/users_daily_reflections";
import { Types } from "mongoose";
import { EmotionsConfig } from "@models/emotions_config";
import { UsersDailyMeasurementsSum } from "@models/users_daily_measurements_sum";

const { ObjectId } = Types;
interface IGetMeasurementParameters {
	startDate: Date;
	usersID: Types.ObjectId;
	operationType: "countDocuments" | "find";
}

type TMeasurementCode = keyof typeof GET_MEASUREMENTS_STRATEGY;
interface IGetMeasurementsToFetchParameters extends IGetMeasurementParameters {
	measurementCode: TMeasurementCode;
}
const GET_MEASUREMENTS_STRATEGY = {
	[ACTIVE_MEASUREMENTS.DAILY_EMOTION]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) => {
		const result = (await UsersDailyReflections[operationType](
			{
				usersID: new ObjectId(usersID),
				date: { $gte: startDate, $lte: new Date() },
				emotionsID: { $exists: true },
			},
			{ emotionsID: true, date: true, _id: false }
		)) as { date: Date; emotionsID: Types.ObjectId[] }[] | number;
		if (operationType === "countDocuments") {
			return result;
		}

		if (!result || typeof result === "number" || !result?.length) {
			throw new Error("No emotions data");
		}

		const emotionsConfig = await EmotionsConfig.find({ active: true }, { emotion: true }).lean();
		const emotions = emotionsConfig.reduce(
			(acc, emotionData) => {
				acc[emotionData._id.toString()] = {
					emotion: emotionData.emotion,
				};
				return acc;
			},
			{} as Record<string, { emotion: string }>
		);
		const resultWithEmotions = result.map((dailyEmotion) => {
			return {
				date: dailyEmotion.date,
				...emotions[dailyEmotion.emotionsID.toString()],
			};
		});
		return resultWithEmotions;
	},
	[ACTIVE_MEASUREMENTS.DAILY_SLEEP_QUALITY]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) => {
		const sleepQualityInfo = await UsersDailyReflections[operationType](
			{
				usersID: new ObjectId(usersID),
				date: { $gte: startDate, $lte: new Date() },
				sleepQuality: { $exists: true },
			},
			{ sleepQuality: true, date: true, _id: false }
		);
		return sleepQualityInfo;
	},
	[ACTIVE_MEASUREMENTS.SLEEP_DURATION]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) => {
		console.log(usersID)
		const sleepDurationInfo = await UsersDailyMeasurementsSum[operationType](
			{
				usersID: new ObjectId(usersID),
				date: { $gte: startDate, $lte: new Date() },
				measurementCode: ACTIVE_MEASUREMENTS.SLEEP_DURATION,
			},
			{ [ACTIVE_MEASUREMENTS.SLEEP_DURATION]: "$measurementCode", date: true, _id: false }
		);
		return sleepDurationInfo;
	},
	[ACTIVE_MEASUREMENTS.DAILY_STEPS]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) => {
		const sleepDurationInfo = await UsersDailyMeasurementsSum[operationType](
			{
				usersID: new ObjectId(usersID),
				date: { $gte: startDate, $lte: new Date() },
				measurementCode: ACTIVE_MEASUREMENTS.DAILY_STEPS,
			},
			{ [ACTIVE_MEASUREMENTS.DAILY_STEPS]: "$measurementCode", date: true, _id: false }
		);
		return sleepDurationInfo;
	},
} as const;
const getMeasurementsToFetch = async ({ startDate, usersID, operationType, measurementCode }: IGetMeasurementsToFetchParameters) => {
	const measurementsInfo = await GET_MEASUREMENTS_STRATEGY[measurementCode]({ startDate, usersID, operationType });
	return measurementsInfo;
};

export { getMeasurementsToFetch, TMeasurementCode };
