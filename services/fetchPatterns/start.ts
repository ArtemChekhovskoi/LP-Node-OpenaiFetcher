/* eslint-disable no-await-in-loop */
import config from "../../config";
import "dotenv/config";
import {logger} from "../../logger"
import { mongoMain } from "@helpers/mongoConnectionManager";
import sleep from "../../helpers/sleep";

const sleepSeconds = config.fetchPatterns.sleepTimeSeconds;

(async () => {
      try {
            while (true) {
                  try {
                        await mongoMain.connect();
                        logger.info("Fetching patterns");
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
