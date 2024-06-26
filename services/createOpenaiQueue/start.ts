/* eslint-disable no-await-in-loop */
import "dotenv/config";
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
		while (true) {
			try {
				await mongoMain.connect();
				logger.info("Fetching patterns");
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
