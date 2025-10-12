import mongoose from 'mongoose';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class DatabaseService {
  public static async connect(): Promise<void> {
    try {
      await mongoose.connect(config.database.uri);
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  public static async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Database disconnection failed:', error);
      throw error;
    }
  }

  public static async healthCheck(): Promise<boolean> {
    try {
      const state = mongoose.connection.readyState;
      return state === 1; // 1 = connected
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}
