import { register, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../utils/logger';

export class MetricsService {
  private static instance: MetricsService;
  
  // HTTP metrics
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  
  // Business metrics
  private articlesCreated: Counter<string>;
  private articlesUpdated: Counter<string>;
  private articlesDeleted: Counter<string>;
  private articlesViewed: Counter<string>;
  
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

    // Business metrics
    this.articlesCreated = new Counter({
      name: 'articles_created_total',
      help: 'Total number of articles created',
      labelNames: ['category', 'author']
    });

    this.articlesUpdated = new Counter({
      name: 'articles_updated_total',
      help: 'Total number of articles updated',
      labelNames: ['category', 'author']
    });

    this.articlesDeleted = new Counter({
      name: 'articles_deleted_total',
      help: 'Total number of articles deleted',
      labelNames: ['category', 'author']
    });

    this.articlesViewed = new Counter({
      name: 'articles_viewed_total',
      help: 'Total number of articles viewed',
      labelNames: ['category', 'author']
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
    register.registerMetric(this.articlesCreated);
    register.registerMetric(this.articlesUpdated);
    register.registerMetric(this.articlesDeleted);
    register.registerMetric(this.articlesViewed);
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
  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
  }

  // Business metrics methods
  public recordArticleCreated(category: string, author: string): void {
    this.articlesCreated.inc({ category, author });
  }

  public recordArticleUpdated(category: string, author: string): void {
    this.articlesUpdated.inc({ category, author });
  }

  public recordArticleDeleted(category: string, author: string): void {
    this.articlesDeleted.inc({ category, author });
  }

  public recordArticleViewed(category: string, author: string): void {
    this.articlesViewed.inc({ category, author });
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
