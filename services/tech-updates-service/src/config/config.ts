import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/tech_updates_db?authSource=admin',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['kafka:9092'],
    clientId: 'tech-updates-service',
    groupId: 'tech-updates-service-group',
  },
  observability: {
    prometheus: {
      port: parseInt(process.env.PROMETHEUS_PORT || '9091', 10),
    },
    jaeger: {
      endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces',
    },
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
};
