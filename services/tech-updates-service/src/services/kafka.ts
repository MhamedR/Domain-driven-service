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
      clientId: 'tech-updates-service',
      brokers: config.kafka.brokers,
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'tech-updates-service-group' });
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

  public async publishArticleCreated(data: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'tech.article.published',
        messages: [{ value: JSON.stringify(data) }],
      });
      logger.info('Article created event published');
    } catch (error) {
      logger.error('Failed to publish article created event:', error);
    }
  }

  public async publishArticleUpdated(data: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'tech.article.updated',
        messages: [{ value: JSON.stringify(data) }],
      });
      logger.info('Article updated event published');
    } catch (error) {
      logger.error('Failed to publish article updated event:', error);
    }
  }

  public async publishArticleDeleted(data: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'tech.article.deleted',
        messages: [{ value: JSON.stringify(data) }],
      });
      logger.info('Article deleted event published');
    } catch (error) {
      logger.error('Failed to publish article deleted event:', error);
    }
  }
}
