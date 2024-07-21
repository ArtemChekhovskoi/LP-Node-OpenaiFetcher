import { KafkaConfig } from "@helpers/kafkaConnection";
import { logger } from "../logger";

const kafka = new KafkaConfig();

kafka.producer.on(kafka.producer.events.CONNECT, () => {
	logger.info("Kafka producer connected");
});

kafka.producer.on(kafka.producer.events.DISCONNECT, () => {
	logger.info("Kafka producer disconnected");
});

kafka.consumer.on(kafka.consumer.events.CONNECT, () => {
	logger.info("Kafka consumer connected");
});

kafka.consumer.on(kafka.consumer.events.DISCONNECT, () => {
	logger.info("Kafka consumer disconnected");
});

export { kafka };
