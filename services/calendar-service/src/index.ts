import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { requestLogger } from './middleware/requestLogger';
import { calendarRoutes } from './routes/calendar';
import { healthRoutes } from './routes/health';
import { DatabaseService } from './services/database';
import { RedisService } from './services/redis';
import { KafkaService } from './services/kafka';
import { MetricsService } from './services/metrics';
import { TracingService } from './services/tracing';

/**
 * Calendar Service - Domain-driven microservice for calendar management
 * 
 * This service handles:
 * - Calendar events CRUD operations
 * - Reminders management
 * - Recurring patterns
 * - Event caching with Redis
 * - Event publishing to Kafka
 * - Observability with metrics and tracing
 */

class CalendarService {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use(requestLogger);

    // Authentication middleware for protected routes
    this.app.use('/api/calendar', authMiddleware);
  }

  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.use('/health', healthRoutes);
    
    // Calendar routes
    this.app.use('/api/calendar', calendarRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize services
      await this.initializeServices();

      // Start server
      this.server = this.app.listen(config.port, () => {
        logger.info(`Calendar Service started on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`Health check: http://localhost:${config.port}/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown);
      process.on('SIGINT', this.gracefulShutdown);

    } catch (error) {
      logger.error('Failed to start Calendar Service:', error);
      process.exit(1);
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize tracing
      await TracingService.initialize();
      logger.info('Tracing service initialized');

      // Initialize metrics
      MetricsService.initialize();
      logger.info('Metrics service initialized');

      // Initialize database
      await DatabaseService.connect();
      logger.info('Database connected');

      // Initialize Redis
      await RedisService.connect();
      logger.info('Redis connected');

      // Initialize Kafka
      await KafkaService.initialize();
      logger.info('Kafka initialized');

    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      // Close server
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Close services
      await DatabaseService.disconnect();
      await RedisService.disconnect();
      await KafkaService.disconnect();

      logger.info('Calendar Service shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
}

// Start the service
const calendarService = new CalendarService();
calendarService.start().catch((error) => {
  logger.error('Failed to start Calendar Service:', error);
  process.exit(1);
});

export default calendarService;
