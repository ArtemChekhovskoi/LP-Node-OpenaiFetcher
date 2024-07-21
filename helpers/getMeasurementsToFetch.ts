import { ACTIVE_MEASUREMENTS } from "@constants/measurements";
import { UsersDailyReflections } from "@models/users_daily_reflections";
import { Types } from "mongoose";
import { UsersDailyMeasurementsSum } from "@models/users_daily_measurements_sum";
import { UsersDailyHeartRate } from "@models/users_daily_heart_rate";

const { ObjectId } = Types;
interface IGetMeasurementParameters {
	startDate: Date;
	usersID: Types.ObjectId;
	operationType: "countDocuments" | "find";
}

interface IFetchMeasurementsToFetchParameters extends IGetMeasurementParameters {
	measurementCode: (typeof ACTIVE_MEASUREMENTS)[keyof typeof ACTIVE_MEASUREMENTS];
}

interface IGetHeartRateParameters extends IGetMeasurementParameters {
	measurementCode: keyof typeof HEART_RATE_CODE_TO_PREFIX;
}
interface IGetDailyReflectionsParameters extends IGetMeasurementParameters {
	measurementCode: keyof typeof REFLECTIONS_CODE_TO_FIELD;
}

type TMeasurementCode = keyof typeof GET_MEASUREMENTS_STRATEGY;
interface IGetMeasurementsToFetchParameters extends IGetMeasurementParameters {
	measurementCode: TMeasurementCode;
}

const HEART_RATE_CODE_TO_PREFIX = {
	[ACTIVE_MEASUREMENTS.AVG_HEART_RATE]: "avg",
	[ACTIVE_MEASUREMENTS.MAX_HEART_RATE]: "max",
	[ACTIVE_MEASUREMENTS.MIN_HEART_RATE]: "min",
} as const;

const REFLECTIONS_CODE_TO_FIELD = {
	[ACTIVE_MEASUREMENTS.DAILY_SLEEP_QUALITY]: "sleepQuality",
	[ACTIVE_MEASUREMENTS.DAILY_ACTIVITY_FEELING]: "activityFeeling",
	[ACTIVE_MEASUREMENTS.DAILY_EMOTION]: "emotion",
} as const;

const fetchDailyReflections = async ({ startDate, usersID, operationType, measurementCode }: IGetDailyReflectionsParameters) => {
	const fieldToFetch = REFLECTIONS_CODE_TO_FIELD[measurementCode];
	const dailyReflectionInfo = await UsersDailyReflections[operationType](
		{
			usersID: new ObjectId(usersID),
			date: { $gte: startDate, $lte: new Date() },
			[fieldToFetch]: { $exists: true },
		},
		{ [measurementCode]: `$${fieldToFetch}`, date: true, _id: false }
	);
	return dailyReflectionInfo;
};

const fetchDailyMeasurementsSum = async ({ startDate, usersID, operationType, measurementCode }: IFetchMeasurementsToFetchParameters) => {
	const dailyMeasurementsSumInfo = await UsersDailyMeasurementsSum[operationType](
		{
			usersID: new ObjectId(usersID),
			date: { $gte: startDate, $lte: new Date() },
			measurementCode,
		},
		{ [measurementCode]: "$value", date: true, _id: false }
	);
	return dailyMeasurementsSumInfo;
};

const fetchDailyHeartRate = async ({ startDate, usersID, operationType, measurementCode }: IGetHeartRateParameters) => {
	const prefix = HEART_RATE_CODE_TO_PREFIX[measurementCode];
	const heartRateField = `heartRate.${prefix}`;
	const heartRateInfo = await UsersDailyHeartRate[operationType](
		{
			usersID: new ObjectId(usersID),
			date: { $gte: startDate, $lte: new Date() },
			[heartRateField]: { $exists: true },
		},
		{ [measurementCode]: `$heartRate.${prefix}`, date: true, _id: false }
	);
	return heartRateInfo;
};

const GET_MEASUREMENTS_STRATEGY = {
	[ACTIVE_MEASUREMENTS.DAILY_SLEEP_QUALITY]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) =>
		fetchDailyReflections({ startDate, usersID, operationType, measurementCode: ACTIVE_MEASUREMENTS.DAILY_SLEEP_QUALITY }),
	[ACTIVE_MEASUREMENTS.SLEEP_DURATION]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) =>
		fetchDailyMeasurementsSum({ startDate, usersID, operationType, measurementCode: ACTIVE_MEASUREMENTS.SLEEP_DURATION }),
	[ACTIVE_MEASUREMENTS.DAILY_STEPS]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) =>
		fetchDailyMeasurementsSum({ startDate, usersID, operationType, measurementCode: ACTIVE_MEASUREMENTS.DAILY_STEPS }),
	[ACTIVE_MEASUREMENTS.DAILY_DISTANCE]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) =>
		fetchDailyMeasurementsSum({ startDate, usersID, operationType, measurementCode: ACTIVE_MEASUREMENTS.DAILY_DISTANCE }),
	[ACTIVE_MEASUREMENTS.DAILY_CALORIES_BURNED]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) =>
		fetchDailyMeasurementsSum({ startDate, usersID, operationType, measurementCode: ACTIVE_MEASUREMENTS.DAILY_CALORIES_BURNED }),
	[ACTIVE_MEASUREMENTS.DAILY_ACTIVITY_DURATION]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) =>
		fetchDailyMeasurementsSum({ startDate, usersID, operationType, measurementCode: ACTIVE_MEASUREMENTS.DAILY_ACTIVITY_DURATION }),
	[ACTIVE_MEASUREMENTS.AVG_HEART_RATE]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) =>
		fetchDailyHeartRate({ startDate, usersID, operationType, measurementCode: ACTIVE_MEASUREMENTS.AVG_HEART_RATE }),
	[ACTIVE_MEASUREMENTS.MAX_HEART_RATE]: async ({ startDate, usersID, operationType }: IGetMeasurementParameters) =>
		fetchDailyHeartRate({ startDate, usersID, operationType, measurementCode: ACTIVE_MEASUREMENTS.MAX_HEART_RATE }),
} as const;
const getMeasurementsToFetch = async ({ startDate, usersID, operationType, measurementCode }: IGetMeasurementsToFetchParameters) => {
	const measurementsInfo = await GET_MEASUREMENTS_STRATEGY[measurementCode]({ startDate, usersID, operationType });
	return measurementsInfo;
};

export { getMeasurementsToFetch, TMeasurementCode };
