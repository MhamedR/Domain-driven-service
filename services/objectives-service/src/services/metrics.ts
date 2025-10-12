import { register, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../utils/logger';

export class MetricsService {
  private static instance: MetricsService;
  
  // HTTP metrics
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private httpRequestSize: Histogram<string>;
  private httpResponseSize: Histogram<string>;
  
  // Business metrics
  private objectivesCreated: Counter<string>;
  private objectivesUpdated: Counter<string>;
  private objectivesDeleted: Counter<string>;
  private milestonesCreated: Counter<string>;
  private progressLogged: Counter<string>;
  
  // System metrics
  private activeConnections: Gauge<string>;
  private cacheHits: Counter<string>;
  private cacheMisses: Counter<string>;

  private constructor() {
    // HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.httpRequestSize = new Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000]
    });

    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000]
    });

    // Business metrics
    this.objectivesCreated = new Counter({
      name: 'objectives_created_total',
      help: 'Total number of objectives created',
      labelNames: ['category', 'priority']
    });

    this.objectivesUpdated = new Counter({
      name: 'objectives_updated_total',
      help: 'Total number of objectives updated',
      labelNames: ['category', 'priority']
    });

    this.objectivesDeleted = new Counter({
      name: 'objectives_deleted_total',
      help: 'Total number of objectives deleted',
      labelNames: ['category', 'priority']
    });

    this.milestonesCreated = new Counter({
      name: 'milestones_created_total',
      help: 'Total number of milestones created',
      labelNames: ['objective_category']
    });

    this.progressLogged = new Counter({
      name: 'progress_logged_total',
      help: 'Total number of progress entries logged',
      labelNames: ['objective_category']
    });

    // System metrics
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections'
    });

    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type']
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type']
    });

    // Register all metrics
    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.httpRequestSize);
    register.registerMetric(this.httpResponseSize);
    register.registerMetric(this.objectivesCreated);
    register.registerMetric(this.objectivesUpdated);
    register.registerMetric(this.objectivesDeleted);
    register.registerMetric(this.milestonesCreated);
    register.registerMetric(this.progressLogged);
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.cacheHits);
    register.registerMetric(this.cacheMisses);
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  // HTTP metrics methods
  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number, requestSize?: number, responseSize?: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
    
    if (requestSize) {
      this.httpRequestSize.observe({ method, route }, requestSize);
    }
    
    if (responseSize) {
      this.httpResponseSize.observe({ method, route, status_code: statusCode.toString() }, responseSize);
    }
  }

  // Business metrics methods
  public recordObjectiveCreated(category: string, priority: string): void {
    this.objectivesCreated.inc({ category, priority });
  }

  public recordObjectiveUpdated(category: string, priority: string): void {
    this.objectivesUpdated.inc({ category, priority });
  }

  public recordObjectiveDeleted(category: string, priority: string): void {
    this.objectivesDeleted.inc({ category, priority });
  }

  public recordMilestoneCreated(objectiveCategory: string): void {
    this.milestonesCreated.inc({ objective_category: objectiveCategory });
  }

  public recordProgressLogged(objectiveCategory: string): void {
    this.progressLogged.inc({ objective_category: objectiveCategory });
  }

  // System metrics methods
  public setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  public recordCacheHit(cacheType: string): void {
    this.cacheHits.inc({ cache_type: cacheType });
  }

  public recordCacheMiss(cacheType: string): void {
    this.cacheMisses.inc({ cache_type: cacheType });
  }

  public async getMetrics(): Promise<string> {
    return await register.metrics();
  }
}
