import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/objectives_db',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    options: {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    },
  },

  // Kafka configuration
  kafka: {
    clientId: 'objectives-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    topics: {
      objectiveCreated: 'objective.created',
      objectiveUpdated: 'objective.updated',
      objectiveCompleted: 'objective.completed',
      milestoneCreated: 'milestone.created',
      milestoneUpdated: 'milestone.updated',
      milestoneCompleted: 'milestone.completed',
      progressLogged: 'progress.logged',
    },
    consumer: {
      groupId: 'objectives-service-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    },
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    expiresIn: '24h',
    issuer: 'objectives-service',
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Observability
  observability: {
    jaeger: {
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    },
    prometheus: {
      port: parseInt(process.env.PROMETHEUS_PORT || '9092', 10),
    },
  },

  // Cache configuration
  cache: {
    ttl: {
      objectives: 3600, // 1 hour
      milestones: 1800, // 30 minutes
      progressLogs: 900, // 15 minutes
      goalCategories: 7200, // 2 hours
    },
    keys: {
      objectives: 'objectives:objectives',
      milestones: 'objectives:milestones',
      progressLogs: 'objectives:progress_logs',
      goalCategories: 'objectives:goal_categories',
    },
  },
};
