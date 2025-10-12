import { Kafka, Producer, Consumer } from 'kafkajs';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class KafkaService {
  private static instance: KafkaService;
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  private constructor() {
    this.kafka = new Kafka({
      clientId: 'objectives-service',
      brokers: config.kafka.brokers,
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'objectives-service-group' });
  }

  public static getInstance(): KafkaService {
    if (!KafkaService.instance) {
      KafkaService.instance = new KafkaService();
    }
    return KafkaService.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      logger.info('Kafka connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      logger.info('Kafka disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from Kafka:', error);
    }
  }

  public async publishObjectiveCreated(data: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'objective.created',
        messages: [{ value: JSON.stringify(data) }],
      });
      logger.info('Objective created event published');
    } catch (error) {
      logger.error('Failed to publish objective created event:', error);
    }
  }

  public async publishObjectiveUpdated(data: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'objective.updated',
        messages: [{ value: JSON.stringify(data) }],
      });
      logger.info('Objective updated event published');
    } catch (error) {
      logger.error('Failed to publish objective updated event:', error);
    }
  }

  public async publishObjectiveDeleted(data: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'objective.deleted',
        messages: [{ value: JSON.stringify(data) }],
      });
      logger.info('Objective deleted event published');
    } catch (error) {
      logger.error('Failed to publish objective deleted event:', error);
    }
  }
}
