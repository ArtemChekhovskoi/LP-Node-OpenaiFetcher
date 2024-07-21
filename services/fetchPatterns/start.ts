/* eslint-disable no-await-in-loop */
/* eslint-disable import/first */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, `../../.env.${process.env.NODE_ENV}`) });

import { mongoMain } from "@helpers/mongoConnectionManager";
import config from "../../config";
import { logger } from "../../logger";
import sleep from "../../helpers/sleep";

import fetchPatterns from "./index";

const sleepSeconds = config.fetchPatterns.sleepTimeSeconds;

// const kafka = new KafkaConfig();

process.on("SIGINT", async () => {
	try {
		await mongoMain.destroy();
		// await kafka.disconnect();
	} catch (e) {
		logger.error(`Error in disconnect event: ${e}`);
		logger.error(e);
	}
	process.exit(0);
});

(async () => {
	try {
		logger.info("Starting fetchPatterns");
		while (true) {
			try {
				await mongoMain.connect();
				await fetchPatterns();
			} catch (e) {
				logger.error(`Error at fetchPatterns ${e}`);
				logger.error(e);
			} finally {
				await mongoMain.destroy();
			}
			await sleep(sleepSeconds);
		}
	} catch (e) {
		logger.error(`Error at fetchPatterns start ${e}`, e);
		process.exit(1);
	}
})();
