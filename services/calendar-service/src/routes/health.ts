import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';
import { KafkaService } from '../services/kafka';
import { MetricsService } from '../services/metrics';
import { logger } from '../utils/logger';

/**
 * Health Routes - Service health monitoring endpoints
 * 
 * This router handles:
 * - Health check endpoints
 * - Service status monitoring
 * - Dependency health checks
 * - Metrics endpoints
 */

const router = Router();

/**
 * Basic health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'calendar-service',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'calendar-service',
      error: 'Health check failed',
    });
  }
});

/**
 * Detailed health check with dependencies
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'calendar-service',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      dependencies: {
        database: {
          status: 'unknown',
          responseTime: 0,
        } as any,
        redis: {
          status: 'unknown',
          responseTime: 0,
        } as any,
        kafka: {
          status: 'unknown',
          responseTime: 0,
        } as any,
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      },
    };

    // Check database health
    try {
      const dbStartTime = Date.now();
      const dbHealthy = await DatabaseService.healthCheck();
      const dbResponseTime = Date.now() - dbStartTime;
      
      health.dependencies.database = {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        responseTime: dbResponseTime,
      };
    } catch (error) {
      health.dependencies.database = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check Redis health
    try {
      const redisStartTime = Date.now();
      const redisHealthy = await RedisService.healthCheck();
      const redisResponseTime = Date.now() - redisStartTime;
      
      health.dependencies.redis = {
        status: redisHealthy ? 'healthy' : 'unhealthy',
        responseTime: redisResponseTime,
      };
    } catch (error) {
      health.dependencies.redis = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check Kafka health
    try {
      const kafkaStartTime = Date.now();
      const kafkaHealthy = KafkaService.getConnectionStatus();
      const kafkaResponseTime = Date.now() - kafkaStartTime;
      
      health.dependencies.kafka = {
        status: kafkaHealthy ? 'healthy' : 'unhealthy',
        responseTime: kafkaResponseTime,
      };
    } catch (error) {
      health.dependencies.kafka = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Determine overall health
    const allHealthy = Object.values(health.dependencies).every(
      dep => dep.status === 'healthy'
    );

    health.status = allHealthy ? 'healthy' : 'degraded';

    const responseTime = Date.now() - startTime;
    res.status(allHealthy ? 200 : 503).json({
      ...health,
      responseTime: `${responseTime}ms`,
    });

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'calendar-service',
      error: 'Detailed health check failed',
    });
  }
});

/**
 * Readiness probe
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await DatabaseService.healthCheck();
    const redisHealthy = await RedisService.healthCheck();
    const kafkaHealthy = KafkaService.getConnectionStatus();

    const isReady = dbHealthy && redisHealthy && kafkaHealthy;

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        dependencies: {
          database: dbHealthy,
          redis: redisHealthy,
          kafka: kafkaHealthy,
        },
      });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
    });
  }
});

/**
 * Liveness probe
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Metrics endpoint
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await MetricsService.getMetrics();
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(metrics);
  } catch (error) {
    logger.error('Metrics endpoint failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
    });
  }
});

/**
 * Service information endpoint
 */
router.get('/info', (req: Request, res: Response) => {
  res.status(200).json({
    service: 'calendar-service',
    version: '1.0.0',
    description: 'Domain-driven microservice for calendar management',
    endpoints: {
      events: '/api/calendar/events',
      reminders: '/api/calendar/reminders',
      recurringPatterns: '/api/calendar/recurring-patterns',
      analytics: '/api/calendar/analytics',
    },
    features: [
      'Event management',
      'Reminder system',
      'Recurring patterns',
      'Calendar analytics',
      'Event caching',
      'Event publishing',
    ],
  });
});

export { router as healthRoutes };
