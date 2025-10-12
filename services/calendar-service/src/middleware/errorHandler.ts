import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { MetricsService } from '../services/metrics';

/**
 * Error Handler Middleware - Centralized error handling
 * 
 * This middleware handles:
 * - Error logging and monitoring
 * - Error response formatting
 * - Metrics collection for errors
 * - Security considerations for error messages
 */

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  details?: any;
}

/**
 * Custom error class
 */
export class CustomError extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Log error
    logger.error('Error occurred:', {
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      code: error.code,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?.id,
    });

    // Record error metrics
    MetricsService.recordHttpRequest(
      req.method,
      req.route?.path || req.path,
      error.statusCode || 500,
      0, // Duration not available in error handler
      undefined,
      undefined
    );

    // Determine status code
    const statusCode = error.statusCode || 500;
    const isOperational = error.isOperational !== false;

    // Prepare error response
    const errorResponse: any = {
      success: false,
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    };

    // Add details in development mode
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.details = error.details;
    }

    // Add request ID if available
    if (req.headers['x-request-id']) {
      errorResponse.requestId = req.headers['x-request-id'];
    }

    // Send error response
    res.status(statusCode).json(errorResponse);

  } catch (handlerError) {
    // If error handler itself fails, log and send generic error
    logger.error('Error handler failed:', handlerError);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'HANDLER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new CustomError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    'ROUTE_NOT_FOUND'
  );

  next(error);
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler
 */
export const validationErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error.name === 'ValidationError') {
    const validationError = new CustomError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      true,
      error.details
    );
    next(validationError);
    return;
  }

  next(error);
};

/**
 * JWT error handler
 */
export const jwtErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error.name === 'JsonWebTokenError') {
    const jwtError = new CustomError(
      'Invalid token',
      401,
      'INVALID_TOKEN'
    );
    next(jwtError);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    const jwtError = new CustomError(
      'Token expired',
      401,
      'TOKEN_EXPIRED'
    );
    next(jwtError);
    return;
  }

  next(error);
};

/**
 * MongoDB error handler
 */
export const mongoErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    let mongoError: CustomError;

    if (error.code === 11000) {
      // Duplicate key error
      mongoError = new CustomError(
        'Duplicate entry',
        409,
        'DUPLICATE_ENTRY',
        true,
        { field: Object.keys(error.keyPattern)[0] }
      );
    } else if (error.code === 11001) {
      // Duplicate key error (alternative)
      mongoError = new CustomError(
        'Duplicate entry',
        409,
        'DUPLICATE_ENTRY'
      );
    } else {
      mongoError = new CustomError(
        'Database error',
        500,
        'DATABASE_ERROR',
        false,
        { code: error.code }
      );
    }

    next(mongoError);
    return;
  }

  if (error.name === 'CastError') {
    const castError = new CustomError(
      'Invalid ID format',
      400,
      'INVALID_ID_FORMAT',
      true,
      { field: error.path, value: error.value }
    );
    next(castError);
    return;
  }

  next(error);
};

/**
 * Rate limit error handler
 */
export const rateLimitErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error.status === 429) {
    const rateLimitError = new CustomError(
      'Too many requests',
      429,
      'RATE_LIMIT_EXCEEDED',
      true,
      { retryAfter: error.retryAfter }
    );
    next(rateLimitError);
    return;
  }

  next(error);
};
