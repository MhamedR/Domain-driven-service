import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { requestLogger } from './middleware/requestLogger';
import articlesRoutes from './routes/articles';
import healthRoutes from './routes/health';
import { DatabaseService } from './services/database';
import { RedisService } from './services/redis';
import { KafkaService } from './services/kafka';
import { MetricsService } from './services/metrics';
import { TracingService } from './services/tracing';

/**
 * Tech Updates Service - Domain-driven microservice for technology articles management
 * 
 * This service handles:
 * - Technology articles CRUD operations
 * - Article categorization and tagging
 * - Trending and latest articles
 * - Author management
 * - Content publishing workflow
 * - Event-driven architecture with Kafka
 * - Redis caching for performance
 * - Comprehensive observability
 */

class TechUpdatesService {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    this.app.use(requestLogger);
  }

  private setupRoutes(): void {
    // Health check route (no auth required)
    this.app.use('/health', healthRoutes);

    // API routes (auth required)
    this.app.use('/api/articles', articlesRoutes);

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        const metricsService = MetricsService.getInstance();
        const metrics = await metricsService.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        logger.error('Error getting metrics:', error);
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // Error handling middleware
    this.app.use(errorHandler);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
      });
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize tracing
      const tracingService = TracingService.getInstance();
      await tracingService.start();
      logger.info('Tracing service initialized');

      // Initialize metrics
      const metricsService = MetricsService.getInstance();
      logger.info('Metrics service initialized');

      // Initialize database
      await DatabaseService.connect();
      logger.info('Database connected');

      // Initialize Redis
      const redisService = RedisService.getInstance();
      await redisService.connect();
      logger.info('Redis connected');

      // Initialize Kafka
      const kafkaService = KafkaService.getInstance();
      await kafkaService.connect();
      logger.info('Kafka initialized');

    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      await this.initializeServices();

      // Start HTTP server
      this.server = this.app.listen(config.port, () => {
        logger.info(`Tech Updates Service running on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`Service: tech-updates-service`);
        logger.info(`Version: 1.0.0`);
      });

      // Graceful shutdown handlers
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('Failed to start Tech Updates Service:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Tech Updates Service...');

      // Close HTTP server
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Close services
      await DatabaseService.disconnect();
      const redisService = RedisService.getInstance();
      await redisService.disconnect();
      const kafkaService = KafkaService.getInstance();
      await kafkaService.disconnect();

      logger.info('Tech Updates Service shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the service
const service = new TechUpdatesService();
service.start().catch((error) => {
  logger.error('Failed to start Tech Updates Service:', error);
  process.exit(1);
});

export default TechUpdatesService;
