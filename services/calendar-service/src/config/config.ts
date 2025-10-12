import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/calendar_db',
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
    clientId: 'calendar-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    topics: {
      eventCreated: 'calendar.event.created',
      eventUpdated: 'calendar.event.updated',
      eventDeleted: 'calendar.event.deleted',
      reminderCreated: 'calendar.reminder.created',
      reminderUpdated: 'calendar.reminder.updated',
      reminderDeleted: 'calendar.reminder.deleted',
    },
    consumer: {
      groupId: 'calendar-service-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    },
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    expiresIn: '24h',
    issuer: 'calendar-service',
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
      port: parseInt(process.env.PROMETHEUS_PORT || '9091', 10),
    },
  },

  // Cache configuration
  cache: {
    ttl: {
      events: 3600, // 1 hour
      reminders: 1800, // 30 minutes
      recurringPatterns: 7200, // 2 hours
    },
    keys: {
      events: 'calendar:events',
      reminders: 'calendar:reminders',
      recurringPatterns: 'calendar:recurring_patterns',
    },
  },
};
