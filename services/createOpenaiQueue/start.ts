/* eslint-disable no-await-in-loop */
/* eslint-disable import/first */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, `../../.env.${process.env.NODE_ENV}`) });

import { mongoMain } from "@helpers/mongoConnectionManager";
import { logger } from "../../logger";
import config from "../../config";
import sleep from "../../helpers/sleep";

import createOpenaiQueue from "./index";

const sleepSeconds = config.createOpenaiQueue.sleepTimeSeconds;

process.on("SIGINT", async () => {
	try {
		await mongoMain.destroy();
	} catch (e) {
		logger.error(`Error in disconnect event: ${e}`);
		logger.error(e);
	}
	process.exit(0);
});

(async () => {
	try {
		logger.info("Starting createOpenaiQueue");
		while (true) {
			try {
				await mongoMain.connect();
				await createOpenaiQueue();
			} catch (e) {
				logger.error(`Error at fetchPatterns ${e}`);
				logger.error(e);
			} finally {
				await mongoMain.destroy();
			}
			await sleep(sleepSeconds);
		}
	} catch (e) {
		logger.error(`Error at txReceiver start file ${e}`, e);
		process.exit(1);
	}
})();
