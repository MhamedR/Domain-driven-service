import { createClient, RedisClientType } from 'redis';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Redis Service - Manages Redis connections and caching operations
 */

export class RedisService {
  private static client: RedisClientType | null = null;
  private static isConnected = false;

  public static async connect(): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        logger.info('Redis already connected');
        return;
      }

      this.client = createClient({
        url: config.redis.url,
        ...config.redis.options,
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
      });

      await this.client.connect();
      logger.info(`Connected to Redis: ${config.redis.url}`);

    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public static async disconnect(): Promise<void> {
    try {
      if (!this.isConnected || !this.client) {
        logger.info('Redis not connected');
        return;
      }

      await this.client.disconnect();
      this.client = null;
      this.isConnected = false;
      logger.info('Disconnected from Redis');

    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  public static getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public static async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('Redis not connected');
      }

      const serializedValue = JSON.stringify(value);
      
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }

    } catch (error) {
      logger.error(`Failed to set cache key ${key}:`, error);
      throw error;
    }
  }

  public static async get<T = any>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('Redis not connected');
      }

      const value = await this.client.get(key);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;

    } catch (error) {
      logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  public static async del(key: string): Promise<void> {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('Redis not connected');
      }

      await this.client.del(key);

    } catch (error) {
      logger.error(`Failed to delete cache key ${key}:`, error);
      throw error;
    }
  }

  public static async clearUserCache(userId: string): Promise<void> {
    const patterns = [
      `${config.cache.keys.objectives}:${userId}`,
      `${config.cache.keys.milestones}:${userId}`,
      `${config.cache.keys.progressLogs}:${userId}`,
      `${config.cache.keys.goalCategories}:${userId}`,
    ];

    for (const pattern of patterns) {
      await this.del(pattern);
    }
  }
}
