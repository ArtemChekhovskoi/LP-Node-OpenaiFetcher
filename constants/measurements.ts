const ACTIVE_MEASUREMENTS = {
	SLEEP_DURATION: "sleepDuration",
	AVG_HEART_RATE: "avgHeartRate",
	MAX_HEART_RATE: "maxHeartRate",
	MIN_HEART_RATE: "minHeartRate",
	WEIGHT: "weight",
	HEIGHT: "height",
	DAILY_STEPS: "dailySteps",
	DAILY_DISTANCE: "dailyDistance",
	DAILY_ACTIVITY_DURATION: "dailyActivityDuration",
	DAILY_SLEEP_QUALITY: "dailySleepQuality",
	DAILY_ACTIVITY_FEELING: "dailyActivityFeeling",
	HEART_RATE_VARIABILITY: "heartRateVariability",
	DAILY_CALORIES_BURNED: "dailyCaloriesBurned",
	DAILY_EMOTION: "dailyEmotion",
	DAILY_WEATHER: "dailyWeather",
} as const;

export { ACTIVE_MEASUREMENTS };
