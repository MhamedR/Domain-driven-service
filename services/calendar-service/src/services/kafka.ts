import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Kafka Service - Manages Kafka connections and event publishing/consuming
 * 
 * This service handles:
 * - Kafka connection management
 * - Event publishing
 * - Event consuming
 * - Topic management
 * - Message serialization/deserialization
 */

export class KafkaService {
  private static kafka: Kafka | null = null;
  private static producer: Producer | null = null;
  private static consumer: Consumer | null = null;
  private static isConnected = false;

  /**
   * Initialize Kafka service
   */
  public static async initialize(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.info('Kafka already initialized');
        return;
      }

      // Create Kafka instance
      this.kafka = new Kafka({
        clientId: config.kafka.clientId,
        brokers: config.kafka.brokers,
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
      });

      // Initialize producer
      this.producer = this.kafka.producer();
      await this.producer.connect();

      // Initialize consumer
      this.consumer = this.kafka.consumer({
        groupId: config.kafka.consumer.groupId,
        sessionTimeout: config.kafka.consumer.sessionTimeout,
        heartbeatInterval: config.kafka.consumer.heartbeatInterval,
      });

      await this.consumer.connect();

      // Subscribe to topics
      await this.subscribeToTopics();

      // Start consuming messages
      await this.startConsuming();

      this.isConnected = true;
      logger.info('Kafka service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Kafka service:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka
   */
  public static async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.info('Kafka not connected');
        return;
      }

      if (this.producer) {
        await this.producer.disconnect();
        this.producer = null;
      }

      if (this.consumer) {
        await this.consumer.disconnect();
        this.consumer = null;
      }

      this.kafka = null;
      this.isConnected = false;

      logger.info('Disconnected from Kafka');

    } catch (error) {
      logger.error('Error disconnecting from Kafka:', error);
      throw error;
    }
  }

  /**
   * Get Kafka connection status
   */
  public static getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Subscribe to Kafka topics
   */
  private static async subscribeToTopics(): Promise<void> {
    if (!this.consumer) {
      throw new Error('Kafka consumer not initialized');
    }

    const topics = [
      config.kafka.topics.eventCreated,
      config.kafka.topics.eventUpdated,
      config.kafka.topics.eventDeleted,
      config.kafka.topics.reminderCreated,
      config.kafka.topics.reminderUpdated,
      config.kafka.topics.reminderDeleted,
    ];

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      logger.debug(`Subscribed to topic: ${topic}`);
    }
  }

  /**
   * Start consuming messages
   */
  private static async startConsuming(): Promise<void> {
    if (!this.consumer) {
      throw new Error('Kafka consumer not initialized');
    }

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        try {
          await this.handleMessage(topic, message);
        } catch (error) {
          logger.error(`Error handling message from topic ${topic}:`, error);
        }
      },
    });

    logger.info('Started consuming Kafka messages');
  }

  /**
   * Handle incoming Kafka messages
   */
  private static async handleMessage(topic: string, message: any): Promise<void> {
    try {
      const messageValue = message.value?.toString();
      if (!messageValue) {
        logger.warn(`Empty message received from topic ${topic}`);
        return;
      }

      const eventData = JSON.parse(messageValue);
      logger.debug(`Received message from topic ${topic}:`, eventData);

      // Handle different event types
      switch (topic) {
        case config.kafka.topics.eventCreated:
          await this.handleEventCreated(eventData);
          break;
        case config.kafka.topics.eventUpdated:
          await this.handleEventUpdated(eventData);
          break;
        case config.kafka.topics.eventDeleted:
          await this.handleEventDeleted(eventData);
          break;
        case config.kafka.topics.reminderCreated:
          await this.handleReminderCreated(eventData);
          break;
        case config.kafka.topics.reminderUpdated:
          await this.handleReminderUpdated(eventData);
          break;
        case config.kafka.topics.reminderDeleted:
          await this.handleReminderDeleted(eventData);
          break;
        default:
          logger.warn(`Unknown topic: ${topic}`);
      }

    } catch (error) {
      logger.error(`Error processing message from topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Handle event created message
   */
  private static async handleEventCreated(eventData: any): Promise<void> {
    logger.info('Handling event created:', eventData);
    // Implement event created logic
    // e.g., update cache, send notifications, etc.
  }

  /**
   * Handle event updated message
   */
  private static async handleEventUpdated(eventData: any): Promise<void> {
    logger.info('Handling event updated:', eventData);
    // Implement event updated logic
  }

  /**
   * Handle event deleted message
   */
  private static async handleEventDeleted(eventData: any): Promise<void> {
    logger.info('Handling event deleted:', eventData);
    // Implement event deleted logic
  }

  /**
   * Handle reminder created message
   */
  private static async handleReminderCreated(eventData: any): Promise<void> {
    logger.info('Handling reminder created:', eventData);
    // Implement reminder created logic
  }

  /**
   * Handle reminder updated message
   */
  private static async handleReminderUpdated(eventData: any): Promise<void> {
    logger.info('Handling reminder updated:', eventData);
    // Implement reminder updated logic
  }

  /**
   * Handle reminder deleted message
   */
  private static async handleReminderDeleted(eventData: any): Promise<void> {
    logger.info('Handling reminder deleted:', eventData);
    // Implement reminder deleted logic
  }

  /**
   * Publish event to Kafka
   */
  public static async publishEvent(
    topic: string,
    eventData: any,
    key?: string
  ): Promise<void> {
    try {
      if (!this.isConnected || !this.producer) {
        throw new Error('Kafka producer not connected');
      }

      const message = {
        key: key || eventData.id || eventData._id,
        value: JSON.stringify(eventData),
        timestamp: Date.now().toString(),
        headers: {
          'content-type': 'application/json',
          'service': 'calendar-service',
          'version': '1.0.0',
        },
      };

      await this.producer.send({
        topic,
        messages: [message],
      });

      logger.info(`Published event to topic ${topic}:`, eventData);

    } catch (error) {
      logger.error(`Failed to publish event to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Publish event created
   */
  public static async publishEventCreated(eventData: any): Promise<void> {
    await this.publishEvent(config.kafka.topics.eventCreated, eventData);
  }

  /**
   * Publish event updated
   */
  public static async publishEventUpdated(eventData: any): Promise<void> {
    await this.publishEvent(config.kafka.topics.eventUpdated, eventData);
  }

  /**
   * Publish event deleted
   */
  public static async publishEventDeleted(eventData: any): Promise<void> {
    await this.publishEvent(config.kafka.topics.eventDeleted, eventData);
  }

  /**
   * Publish reminder created
   */
  public static async publishReminderCreated(reminderData: any): Promise<void> {
    await this.publishEvent(config.kafka.topics.reminderCreated, reminderData);
  }

  /**
   * Publish reminder updated
   */
  public static async publishReminderUpdated(reminderData: any): Promise<void> {
    await this.publishEvent(config.kafka.topics.reminderUpdated, reminderData);
  }

  /**
   * Publish reminder deleted
   */
  public static async publishReminderDeleted(reminderData: any): Promise<void> {
    await this.publishEvent(config.kafka.topics.reminderDeleted, reminderData);
  }

  /**
   * Get Kafka statistics
   */
  public static async getStats(): Promise<any> {
    try {
      if (!this.isConnected || !this.kafka) {
        throw new Error('Kafka not connected');
      }

      const admin = this.kafka.admin();
      await admin.connect();

      const topics = await admin.listTopics();
      const metadata = await admin.fetchTopicMetadata({ topics });

      await admin.disconnect();

      return {
        connected: this.isConnected,
        topics: topics.length,
        metadata,
      };

    } catch (error) {
      logger.error('Failed to get Kafka stats:', error);
      throw error;
    }
  }
}
