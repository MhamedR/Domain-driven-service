import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
  services: {
    calendar: process.env.CALENDAR_SERVICE_URL || 'http://calendar-service:3001',
    objectives: process.env.OBJECTIVES_SERVICE_URL || 'http://objectives-service:3002',
    techUpdates: process.env.TECH_UPDATES_SERVICE_URL || 'http://tech-updates-service:3003'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200'
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
};
