import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Metrics Service - Manages Prometheus metrics collection
 * 
 * This service handles:
 * - Custom metrics definition
 * - Metrics collection and export
 * - Performance monitoring
 * - Business metrics tracking
 */

export class MetricsService {
  private static isInitialized = false;

  // HTTP Metrics
  private static httpRequestsTotal: Counter<string>;
  private static httpRequestDuration: Histogram<string>;
  private static httpRequestSize: Histogram<string>;
  private static httpResponseSize: Histogram<string>;

  // Database Metrics
  private static dbConnectionsActive: Gauge<string>;
  private static dbOperationsTotal: Counter<string>;
  private static dbOperationDuration: Histogram<string>;

  // Cache Metrics
  private static cacheHitsTotal: Counter<string>;
  private static cacheMissesTotal: Counter<string>;
  private static cacheOperationsTotal: Counter<string>;
  private static cacheOperationDuration: Histogram<string>;

  // Kafka Metrics
  private static kafkaMessagesProduced: Counter<string>;
  private static kafkaMessagesConsumed: Counter<string>;
  private static kafkaMessageProcessingDuration: Histogram<string>;

  // Business Metrics
  private static eventsCreatedTotal: Counter<string>;
  private static eventsUpdatedTotal: Counter<string>;
  private static eventsDeletedTotal: Counter<string>;
  private static remindersCreatedTotal: Counter<string>;
  private static remindersSentTotal: Counter<string>;
  private static recurringPatternsCreatedTotal: Counter<string>;

  // System Metrics
  private static activeConnections: Gauge<string>;
  private static memoryUsage: Gauge<string>;
  private static cpuUsage: Gauge<string>;

  /**
   * Initialize metrics service
   */
  public static initialize(): void {
    if (this.isInitialized) {
      logger.info('Metrics service already initialized');
      return;
    }

    try {
      // Collect default metrics
      collectDefaultMetrics({ register });

      // Initialize HTTP metrics
      this.httpRequestsTotal = new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'],
        registers: [register],
      });

      this.httpRequestDuration = new Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.1, 0.5, 1, 2, 5, 10],
        registers: [register],
      });

      this.httpRequestSize = new Histogram({
        name: 'http_request_size_bytes',
        help: 'Size of HTTP requests in bytes',
        labelNames: ['method', 'route'],
        buckets: [100, 1000, 10000, 100000, 1000000],
        registers: [register],
      });

      this.httpResponseSize = new Histogram({
        name: 'http_response_size_bytes',
        help: 'Size of HTTP responses in bytes',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [100, 1000, 10000, 100000, 1000000],
        registers: [register],
      });

      // Initialize database metrics
      this.dbConnectionsActive = new Gauge({
        name: 'db_connections_active',
        help: 'Number of active database connections',
        registers: [register],
      });

      this.dbOperationsTotal = new Counter({
        name: 'db_operations_total',
        help: 'Total number of database operations',
        labelNames: ['operation', 'collection', 'status'],
        registers: [register],
      });

      this.dbOperationDuration = new Histogram({
        name: 'db_operation_duration_seconds',
        help: 'Duration of database operations in seconds',
        labelNames: ['operation', 'collection'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
        registers: [register],
      });

      // Initialize cache metrics
      this.cacheHitsTotal = new Counter({
        name: 'cache_hits_total',
        help: 'Total number of cache hits',
        labelNames: ['cache_type', 'key_pattern'],
        registers: [register],
      });

      this.cacheMissesTotal = new Counter({
        name: 'cache_misses_total',
        help: 'Total number of cache misses',
        labelNames: ['cache_type', 'key_pattern'],
        registers: [register],
      });

      this.cacheOperationsTotal = new Counter({
        name: 'cache_operations_total',
        help: 'Total number of cache operations',
        labelNames: ['operation', 'cache_type', 'status'],
        registers: [register],
      });

      this.cacheOperationDuration = new Histogram({
        name: 'cache_operation_duration_seconds',
        help: 'Duration of cache operations in seconds',
        labelNames: ['operation', 'cache_type'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
        registers: [register],
      });

      // Initialize Kafka metrics
      this.kafkaMessagesProduced = new Counter({
        name: 'kafka_messages_produced_total',
        help: 'Total number of Kafka messages produced',
        labelNames: ['topic', 'status'],
        registers: [register],
      });

      this.kafkaMessagesConsumed = new Counter({
        name: 'kafka_messages_consumed_total',
        help: 'Total number of Kafka messages consumed',
        labelNames: ['topic', 'status'],
        registers: [register],
      });

      this.kafkaMessageProcessingDuration = new Histogram({
        name: 'kafka_message_processing_duration_seconds',
        help: 'Duration of Kafka message processing in seconds',
        labelNames: ['topic'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
        registers: [register],
      });

      // Initialize business metrics
      this.eventsCreatedTotal = new Counter({
        name: 'events_created_total',
        help: 'Total number of events created',
        labelNames: ['user_id', 'category'],
        registers: [register],
      });

      this.eventsUpdatedTotal = new Counter({
        name: 'events_updated_total',
        help: 'Total number of events updated',
        labelNames: ['user_id', 'category'],
        registers: [register],
      });

      this.eventsDeletedTotal = new Counter({
        name: 'events_deleted_total',
        help: 'Total number of events deleted',
        labelNames: ['user_id', 'category'],
        registers: [register],
      });

      this.remindersCreatedTotal = new Counter({
        name: 'reminders_created_total',
        help: 'Total number of reminders created',
        labelNames: ['user_id', 'type'],
        registers: [register],
      });

      this.remindersSentTotal = new Counter({
        name: 'reminders_sent_total',
        help: 'Total number of reminders sent',
        labelNames: ['user_id', 'type', 'status'],
        registers: [register],
      });

      this.recurringPatternsCreatedTotal = new Counter({
        name: 'recurring_patterns_created_total',
        help: 'Total number of recurring patterns created',
        labelNames: ['user_id', 'frequency'],
        registers: [register],
      });

      // Initialize system metrics
      this.activeConnections = new Gauge({
        name: 'active_connections',
        help: 'Number of active connections',
        registers: [register],
      });

      this.memoryUsage = new Gauge({
        name: 'memory_usage_bytes',
        help: 'Memory usage in bytes',
        labelNames: ['type'],
        registers: [register],
      });

      this.cpuUsage = new Gauge({
        name: 'cpu_usage_percent',
        help: 'CPU usage percentage',
        registers: [register],
      });

      this.isInitialized = true;
      logger.info('Metrics service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize metrics service:', error);
      throw error;
    }
  }

  /**
   * Record HTTP request metrics
   */
  public static recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    requestSize?: number,
    responseSize?: number
  ): void {
    if (!this.isInitialized) {
      return;
    }

    const labels = { method, route, status_code: statusCode.toString() };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);

    if (requestSize !== undefined) {
      this.httpRequestSize.observe({ method, route }, requestSize);
    }

    if (responseSize !== undefined) {
      this.httpResponseSize.observe(labels, responseSize);
    }
  }

  /**
   * Record database operation metrics
   */
  public static recordDbOperation(
    operation: string,
    collection: string,
    duration: number,
    status: 'success' | 'error'
  ): void {
    if (!this.isInitialized) {
      return;
    }

    const labels = { operation, collection, status };

    this.dbOperationsTotal.inc(labels);
    this.dbOperationDuration.observe({ operation, collection }, duration);
  }

  /**
   * Record cache operation metrics
   */
  public static recordCacheOperation(
    operation: string,
    cacheType: string,
    duration: number,
    status: 'success' | 'error',
    hit?: boolean
  ): void {
    if (!this.isInitialized) {
      return;
    }

    const labels = { operation, cache_type: cacheType, status };

    this.cacheOperationsTotal.inc(labels);
    this.cacheOperationDuration.observe({ operation, cache_type: cacheType }, duration);

    if (hit !== undefined) {
      if (hit) {
        this.cacheHitsTotal.inc({ cache_type: cacheType, key_pattern: 'default' });
      } else {
        this.cacheMissesTotal.inc({ cache_type: cacheType, key_pattern: 'default' });
      }
    }
  }

  /**
   * Record Kafka message metrics
   */
  public static recordKafkaMessage(
    topic: string,
    type: 'produced' | 'consumed',
    duration: number,
    status: 'success' | 'error'
  ): void {
    if (!this.isInitialized) {
      return;
    }

    const labels = { topic, status };

    if (type === 'produced') {
      this.kafkaMessagesProduced.inc(labels);
    } else {
      this.kafkaMessagesConsumed.inc(labels);
      this.kafkaMessageProcessingDuration.observe({ topic }, duration);
    }
  }

  /**
   * Record business metrics
   */
  public static recordEventCreated(userId: string, category: string): void {
    if (!this.isInitialized) {
      return;
    }

    this.eventsCreatedTotal.inc({ user_id: userId, category });
  }

  public static recordEventUpdated(userId: string, category: string): void {
    if (!this.isInitialized) {
      return;
    }

    this.eventsUpdatedTotal.inc({ user_id: userId, category });
  }

  public static recordEventDeleted(userId: string, category: string): void {
    if (!this.isInitialized) {
      return;
    }

    this.eventsDeletedTotal.inc({ user_id: userId, category });
  }

  public static recordReminderCreated(userId: string, type: string): void {
    if (!this.isInitialized) {
      return;
    }

    this.remindersCreatedTotal.inc({ user_id: userId, type });
  }

  public static recordReminderSent(userId: string, type: string, status: string): void {
    if (!this.isInitialized) {
      return;
    }

    this.remindersSentTotal.inc({ user_id: userId, type, status });
  }

  public static recordRecurringPatternCreated(userId: string, frequency: string): void {
    if (!this.isInitialized) {
      return;
    }

    this.recurringPatternsCreatedTotal.inc({ user_id: userId, frequency });
  }

  /**
   * Update system metrics
   */
  public static updateSystemMetrics(): void {
    if (!this.isInitialized) {
      return;
    }

    const memUsage = process.memoryUsage();
    this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    this.memoryUsage.set({ type: 'external' }, memUsage.external);

    // Update CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.cpuUsage.set(cpuUsage.user + cpuUsage.system);
  }

  /**
   * Get metrics registry
   */
  public static getRegistry() {
    return register;
  }

  /**
   * Get metrics as string
   */
  public static async getMetrics(): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Metrics service not initialized');
    }

    return register.metrics();
  }

  /**
   * Clear all metrics
   */
  public static clearMetrics(): void {
    if (!this.isInitialized) {
      return;
    }

    register.clear();
    logger.info('Metrics cleared');
  }
}
