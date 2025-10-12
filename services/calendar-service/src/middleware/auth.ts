import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Authentication Middleware - JWT token validation
 * 
 * This middleware handles:
 * - JWT token extraction and validation
 * - User authentication
 * - Request context enrichment
 * - Error handling for authentication failures
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

/**
 * Authentication middleware
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    // Validate token structure
    if (!decoded.id || !decoded.email) {
      res.status(401).json({
        success: false,
        message: 'Invalid token structure',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Check token expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    // Enrich request with user information
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
      permissions: decoded.permissions || [],
    };

    logger.debug('User authenticated:', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });

    next();

  } catch (error) {
    logger.error('Authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      next();
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    // Enrich request with user information
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
      permissions: decoded.permissions || [],
    };

    logger.debug('User authenticated (optional):', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });

    next();

  } catch (error) {
    // For optional auth, we don't fail on token errors
    logger.debug('Optional authentication failed:', error);
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const hasPermission = permissions.some(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
        current: req.user.permissions,
      });
      return;
    }

    next();
  };
};
