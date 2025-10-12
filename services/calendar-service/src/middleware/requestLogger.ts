import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { MetricsService } from '../services/metrics';

/**
 * Request Logger Middleware - HTTP request logging and metrics
 * 
 * This middleware handles:
 * - Request/response logging
 * - Performance metrics collection
 * - Request ID generation
 * - User context logging
 */

export interface LoggedRequest extends Request {
  requestId?: string;
  startTime?: number;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Request logger middleware
 */
export const requestLogger = (
  req: LoggedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Generate request ID
  req.requestId = generateRequestId();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  // Log request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    // Calculate response time
    const responseTime = Date.now() - (req.startTime || 0);

    // Log response
    logger.info('Outgoing response', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length'),
      userId: req.user?.id,
    });

    // Record metrics
    MetricsService.recordHttpRequest(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      responseTime / 1000, // Convert to seconds
      req.get('Content-Length') ? parseInt(req.get('Content-Length')!) : undefined,
      res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : undefined
    );

    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request ID middleware (standalone)
 */
export const requestIdMiddleware = (
  req: LoggedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Check if request ID already exists
  if (!req.requestId) {
    req.requestId = generateRequestId();
  }

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  next();
};

/**
 * User context middleware
 */
export const userContextMiddleware = (
  req: LoggedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Add user context to request if available
  if (req.user) {
    req.user = {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    };
  }

  next();
};

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware = (
  req: LoggedRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Log slow requests
    if (duration > 1000) { // Log requests taking more than 1 second
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        userId: req.user?.id,
      });
    }

    // Log very slow requests
    if (duration > 5000) { // Log requests taking more than 5 seconds
      logger.error('Very slow request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        userId: req.user?.id,
      });
    }
  });

  next();
};

/**
 * Security headers middleware
 */
export const securityHeadersMiddleware = (
  req: LoggedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};
