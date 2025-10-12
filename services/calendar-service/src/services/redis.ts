import { createClient, RedisClientType } from 'redis';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Redis Service - Manages Redis connections and caching operations
 * 
 * This service handles:
 * - Redis connection management
 * - Cache operations (get, set, delete)
 * - Cache key management
 * - Cache expiration handling
 * - Connection health monitoring
 */

export class RedisService {
  private static client: RedisClientType | null = null;
  private static isConnected = false;

  /**
   * Connect to Redis
   */
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

      // Set up event listeners
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      
      logger.info(`Connected to Redis: ${config.redis.url}`);

    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
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

  /**
   * Get Redis connection status
   */
  public static getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get Redis client instance
   */
  public static getClient(): RedisClientType | null {
    return this.client;
  }

  /**
   * Check Redis health
   */
  public static async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      await this.client.ping();
      return true;

    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Set a key-value pair in Redis
   */
  public static async set(
    key: string,
    value: any,
    ttl?: number
  ): Promise<void> {
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

      logger.debug(`Cache set: ${key}`);

    } catch (error) {
      logger.error(`Failed to set cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value from Redis
   */
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

  /**
   * Delete a key from Redis
   */
  public static async del(key: string): Promise<void> {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('Redis not connected');
      }

      await this.client.del(key);
      logger.debug(`Cache deleted: ${key}`);

    } catch (error) {
      logger.error(`Failed to delete cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple keys from Redis
   */
  public static async delMultiple(keys: string[]): Promise<void> {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('Redis not connected');
      }

      if (keys.length === 0) {
        return;
      }

      await this.client.del(keys);
      logger.debug(`Cache deleted: ${keys.join(', ')}`);

    } catch (error) {
      logger.error(`Failed to delete cache keys:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists in Redis
   */
  public static async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('Redis not connected');
      }

      const result = await this.client.exists(key);
      return result === 1;

    } catch (error) {
      logger.error(`Failed to check cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration for a key
   */
  public static async expire(key: string, ttl: number): Promise<void> {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('Redis not connected');
      }

      await this.client.expire(key, ttl);
      logger.debug(`Cache expiration set: ${key} (${ttl}s)`);

    } catch (error) {
      logger.error(`Failed to set expiration for cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get keys matching a pattern
   */
  public static async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('Redis not connected');
      }

      return await this.client.keys(pattern);

    } catch (error) {
      logger.error(`Failed to get keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Clear cache by pattern
   */
  public static async clearByPattern(pattern: string): Promise<void> {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('Redis not connected');
      }

      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        await this.delMultiple(keys);
        logger.debug(`Cache cleared for pattern: ${pattern} (${keys.length} keys)`);
      }

    } catch (error) {
      logger.error(`Failed to clear cache for pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  public static async getStats(): Promise<any> {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('Redis not connected');
      }

      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        info,
        keyspace,
        connected: this.isConnected,
      };

    } catch (error) {
      logger.error('Failed to get Redis stats:', error);
      throw error;
    }
  }

  /**
   * Cache events for a user
   */
  public static async cacheEvents(userId: string, events: any[]): Promise<void> {
    const key = `${config.cache.keys.events}:${userId}`;
    await this.set(key, events, config.cache.ttl.events);
  }

  /**
   * Get cached events for a user
   */
  public static async getCachedEvents(userId: string): Promise<any[] | null> {
    const key = `${config.cache.keys.events}:${userId}`;
    return await this.get(key);
  }

  /**
   * Cache reminders for a user
   */
  public static async cacheReminders(userId: string, reminders: any[]): Promise<void> {
    const key = `${config.cache.keys.reminders}:${userId}`;
    await this.set(key, reminders, config.cache.ttl.reminders);
  }

  /**
   * Get cached reminders for a user
   */
  public static async getCachedReminders(userId: string): Promise<any[] | null> {
    const key = `${config.cache.keys.reminders}:${userId}`;
    return await this.get(key);
  }

  /**
   * Cache recurring patterns for a user
   */
  public static async cacheRecurringPatterns(userId: string, patterns: any[]): Promise<void> {
    const key = `${config.cache.keys.recurringPatterns}:${userId}`;
    await this.set(key, patterns, config.cache.ttl.recurringPatterns);
  }

  /**
   * Get cached recurring patterns for a user
   */
  public static async getCachedRecurringPatterns(userId: string): Promise<any[] | null> {
    const key = `${config.cache.keys.recurringPatterns}:${userId}`;
    return await this.get(key);
  }

  /**
   * Clear user cache
   */
  public static async clearUserCache(userId: string): Promise<void> {
    const patterns = [
      `${config.cache.keys.events}:${userId}`,
      `${config.cache.keys.reminders}:${userId}`,
      `${config.cache.keys.recurringPatterns}:${userId}`,
    ];

    await this.delMultiple(patterns);
    logger.debug(`Cache cleared for user: ${userId}`);
  }
}
