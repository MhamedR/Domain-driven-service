import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Tracing Service - Manages OpenTelemetry distributed tracing
 * 
 * This service handles:
 * - Distributed tracing setup
 * - Jaeger integration
 * - Prometheus metrics export
 * - Trace context propagation
 * - Performance monitoring
 */

export class TracingService {
  private static sdk: NodeSDK | null = null;
  private static isInitialized = false;

  /**
   * Initialize tracing service
   */
  public static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Tracing service already initialized');
      return;
    }

    try {
      // Create resource with service information
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'calendar-service',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.nodeEnv,
      });

      // Create Jaeger exporter
      const jaegerExporter = new JaegerExporter({
        endpoint: config.observability.jaeger.endpoint,
      });

      // Create Prometheus exporter
      const prometheusExporter = new PrometheusExporter({
        port: config.observability.prometheus.port,
        endpoint: '/metrics',
      });

      // Initialize SDK
      this.sdk = new NodeSDK({
        resource,
        traceExporter: jaegerExporter,
        instrumentations: [
          getNodeAutoInstrumentations({
            // Disable some instrumentations that might cause issues
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
            '@opentelemetry/instrumentation-net': {
              enabled: false,
            },
          }),
        ],
      });

      // Start the SDK
      this.sdk.start();

      this.isInitialized = true;
      logger.info('Tracing service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize tracing service:', error);
      throw error;
    }
  }

  /**
   * Shutdown tracing service
   */
  public static async shutdown(): Promise<void> {
    if (!this.isInitialized || !this.sdk) {
      logger.info('Tracing service not initialized');
      return;
    }

    try {
      await this.sdk.shutdown();
      this.sdk = null;
      this.isInitialized = false;

      logger.info('Tracing service shutdown complete');

    } catch (error) {
      logger.error('Error shutting down tracing service:', error);
      throw error;
    }
  }

  /**
   * Get tracing service status
   */
  public static getStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * Get SDK instance
   */
  public static getSDK(): NodeSDK | null {
    return this.sdk;
  }
}
