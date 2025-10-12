import { createClient, RedisClientType } from 'redis';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class RedisService {
  private static instance: RedisService;
  private client: RedisClientType;

  private constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Redis disconnection failed:', error);
      throw error;
    }
  }

  public async get(key: string): Promise<any> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  public async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error) {
      logger.error('Redis set error:', error);
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }
}
