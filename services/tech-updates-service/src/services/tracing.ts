import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class TracingService {
  private static instance: TracingService;
  private sdk!: NodeSDK;

  private constructor() {
    this.initializeTracing();
  }

  public static getInstance(): TracingService {
    if (!TracingService.instance) {
      TracingService.instance = new TracingService();
    }
    return TracingService.instance;
  }

  private initializeTracing(): void {
    try {
      // Create resource
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'tech-updates-service',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.nodeEnv,
      });

      // Create Jaeger exporter
      const jaegerExporter = new JaegerExporter({
        endpoint: config.observability.jaeger.endpoint,
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

      logger.info('Tracing service initialized');
    } catch (error) {
      logger.error('Failed to initialize tracing service:', error);
    }
  }

  public async start(): Promise<void> {
    try {
      this.sdk.start();
      logger.info('Tracing service started');
    } catch (error) {
      logger.error('Failed to start tracing service:', error);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      await this.sdk.shutdown();
      logger.info('Tracing service shutdown');
    } catch (error) {
      logger.error('Failed to shutdown tracing service:', error);
    }
  }
}
