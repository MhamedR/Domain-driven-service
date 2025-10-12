import mongoose from 'mongoose';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Database Service - Manages MongoDB connections and operations
 * 
 * This service handles:
 * - MongoDB connection management
 * - Connection health monitoring
 * - Graceful connection handling
 * - Database operation utilities
 */

export class DatabaseService {
  private static isConnected = false;
  private static connection: mongoose.Connection | null = null;

  /**
   * Connect to MongoDB database
   */
  public static async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.info('Database already connected');
        return;
      }

      // Set up connection event listeners
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB connected successfully');
        this.isConnected = true;
      });

      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      // Connect to MongoDB
      await mongoose.connect(config.mongodb.uri, config.mongodb.options);
      
      this.connection = mongoose.connection;
      this.isConnected = true;

      logger.info(`Connected to MongoDB: ${config.mongodb.uri}`);

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB database
   */
  public static async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.info('Database not connected');
        return;
      }

      await mongoose.disconnect();
      this.isConnected = false;
      this.connection = null;

      logger.info('Disconnected from MongoDB');

    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get database connection status
   */
  public static getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get database connection instance
   */
  public static getConnection(): mongoose.Connection | null {
    return this.connection;
  }

  /**
   * Check database health
   */
  public static async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.connection) {
        return false;
      }

      // Ping the database
      await this.connection.db.admin().ping();
      return true;

    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  public static async getStats(): Promise<any> {
    try {
      if (!this.isConnected || !this.connection) {
        throw new Error('Database not connected');
      }

      const stats = await this.connection.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        storageSize: stats.storageSize,
        uptime: stats.uptime,
      };

    } catch (error) {
      logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Create database indexes for performance
   */
  public static async createIndexes(): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      // Import models to ensure they are registered
      await import('../models/Event');
      await import('../models/Reminder');
      await import('../models/RecurringPattern');

      // Create indexes
      await this.connection!.db.collection('events').createIndex({ userId: 1, startDate: 1 });
      await this.connection!.db.collection('events').createIndex({ userId: 1, status: 1 });
      await this.connection!.db.collection('events').createIndex({ startDate: 1, endDate: 1 });
      
      await this.connection!.db.collection('reminders').createIndex({ userId: 1, reminderTime: 1 });
      await this.connection!.db.collection('reminders').createIndex({ eventId: 1, status: 1 });
      await this.connection!.db.collection('reminders').createIndex({ reminderTime: 1, status: 1 });
      
      await this.connection!.db.collection('recurring_patterns').createIndex({ userId: 1, isActive: 1 });
      await this.connection!.db.collection('recurring_patterns').createIndex({ eventId: 1, isActive: 1 });

      logger.info('Database indexes created successfully');

    } catch (error) {
      logger.error('Failed to create database indexes:', error);
      throw error;
    }
  }

  /**
   * Start a database transaction
   */
  public static async startTransaction(): Promise<mongoose.ClientSession> {
    if (!this.isConnected || !this.connection) {
      throw new Error('Database not connected');
    }

    const session = await this.connection.startSession();
    session.startTransaction();
    return session;
  }

  /**
   * Commit a database transaction
   */
  public static async commitTransaction(session: mongoose.ClientSession): Promise<void> {
    try {
      await session.commitTransaction();
      logger.debug('Transaction committed successfully');
    } catch (error) {
      logger.error('Failed to commit transaction:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Abort a database transaction
   */
  public static async abortTransaction(session: mongoose.ClientSession): Promise<void> {
    try {
      await session.abortTransaction();
      logger.debug('Transaction aborted');
    } catch (error) {
      logger.error('Failed to abort transaction:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }
}
