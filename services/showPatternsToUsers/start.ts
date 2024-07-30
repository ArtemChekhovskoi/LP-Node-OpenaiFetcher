/* eslint-disable no-await-in-loop */
/* eslint-disable import/first */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, `../../.env.${process.env.NODE_ENV}`) });
import { mongoMain } from "@helpers/mongoConnectionManager";
import config from "@config/index";
import { logger } from "@logger/index";
import { CronJob } from "cron";

import showPatternsToUser from "./index";

const { frequency } = config.showPatternsToUser;

process.on("SIGINT", async () => {
	await mongoMain.destroy();
	process.exit(0);
});

const main = async () => {
	try {
		await mongoMain.connect();
		logger.info("Show patterns to users service started");
		const scheduleDailyNotifications = new CronJob(frequency, showPatternsToUser, null, true);
		logger.info(`Cron job scheduled to run at ${scheduleDailyNotifications.nextDate()}`);
	} catch (e) {
		logger.error(`Error at showPatternsToUsers/start.js: ${e}`, e);
		process.exit(1);
	}
};

main();
