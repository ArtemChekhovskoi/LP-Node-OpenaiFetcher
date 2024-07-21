import { Kafka, logLevel, Producer } from "kafkajs";
import { logger } from "logger";

interface IConsumerMessageHandler {
	topic: string;
	partition: number;
	message: {
		value: Buffer;
	};
}

class KafkaConfig {
	kafka: Kafka | null = null;

	producer: Producer;

	consumer: any;

	constructor() {
		this.kafka = !this.kafka
			? new Kafka({
					logLevel: logLevel.ERROR,
					brokers: ["localhost:9093"],
					clientId: "example-producer",
				})
			: this.kafka;
		this.producer = this.kafka.producer();
		this.consumer = this.kafka.consumer({
			groupId: "test-group",
			heartbeatInterval: 10000, // should be lower than sessionTimeout
			sessionTimeout: 60000,
		});
	}

	async connectProducer() {
		try {
			await this.producer.connect();
		} catch (e) {
			logger.error(e);
		}
	}

	async connectConsumer() {
		try {
			await this.consumer.connect();
			this.consumer.on(this.consumer.events.CONNECT, () => {
				logger.info("Kafka consumer connected");
			});
			this.consumer.on(this.consumer.events.DISCONNECT, () => {
				logger.info("Kafka consumer disconnected");
			});
		} catch (e) {
			logger.error(e);
		}
	}

	async disconnect() {
		try {
			await this.producer.disconnect();
			await this.consumer.disconnect();
		} catch (e) {
			logger.error(e);
		}
	}

	async produce(topic: string, messages: any) {
		try {
			await this.connectProducer();
			await this.producer.send({
				topic,
				messages,
			});
		} catch (e) {
			logger.error(e);
		} finally {
			await this.producer.disconnect();
		}
	}

	async consume(topic: string, callback: (message: string) => void) {
		try {
			await this.connectConsumer();
			await this.consumer.subscribe({ topic, fromBeginning: true });

			await this.consumer.run({
				eachMessage: async ({ message }: IConsumerMessageHandler) => {
					const value = message.value.toString();
					callback(value);
				},
			});
		} catch (e) {
			logger.error(e);
		}
	}
}

export { KafkaConfig };
