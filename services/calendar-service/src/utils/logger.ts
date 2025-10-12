import winston from 'winston';
import { config } from '../config/config';

/**
 * Logger Utility - Centralized logging configuration
 * 
 * This utility provides:
 * - Structured logging with Winston
 * - Multiple log levels
 * - JSON formatting for production
 * - Console formatting for development
 * - Log rotation and file management
 */

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: 'calendar-service',
    version: '1.0.0',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.nodeEnv === 'development' ? consoleFormat : logFormat,
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Add request ID to logs
logger.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
}));

export { logger };
