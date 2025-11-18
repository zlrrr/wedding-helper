import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { userService, SafeUser } from '../services/user.service.js';

// ⚠️ SECURITY WARNING: JWT_SECRET must be set in production
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultSecret = 'insecure-dev-secret-DO-NOT-USE-IN-PRODUCTION';

  if (isProduction) {
    logger.error('CRITICAL SECURITY ERROR: JWT_SECRET not set in production!');
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  logger.warn('⚠️  Using default JWT_SECRET for development. DO NOT use in production!');
  return defaultSecret;
})();

const INVITE_CODES = (process.env.INVITE_CODES || '').split(',').filter(Boolean);
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD;

// JWT payload interface
export interface JWTPayload {
  userId: number;
  username: string;
  role: 'user' | 'admin';
  timestamp: number;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verify JWT token from Authorization header
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      path: req.path,
      ip: req.ip,
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Verify user still exists and is active
    const user = userService.getUserById(decoded.userId);

    if (!user || !user.isActive) {
      logger.warn('Authentication failed: User not found or inactive', {
        userId: decoded.userId,
        path: req.path,
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    req.user = decoded;

    logger.debug('Authentication successful', {
      path: req.path,
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed: Invalid token', {
      path: req.path,
      ip: req.ip,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Optional authentication middleware
 * Does not block request if no token, but validates if present
 * Supports both new user-based tokens and legacy tokens
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Check if it's a new user-based token (has userId)
    if (decoded.userId) {
      req.user = decoded as JWTPayload;
      logger.debug('Optional authentication successful (user-based)', {
        path: req.path,
        userId: req.user.userId,
      });
    } else {
      // Legacy token - skip setting req.user
      logger.debug('Optional authentication successful (legacy)', {
        path: req.path,
      });
    }
  } catch (error) {
    logger.debug('Optional authentication: Invalid token', {
      path: req.path,
    });
    // Don't block the request, just continue without user
  }

  next();
}

/**
 * Verify invite code or password
 */
export function verifyCredentials(inviteCode?: string, password?: string): boolean {
  // Check invite code
  if (inviteCode && INVITE_CODES.includes(inviteCode)) {
    logger.info('Valid invite code used', { inviteCode });
    return true;
  }

  // Check password
  if (password && ACCESS_PASSWORD && password === ACCESS_PASSWORD) {
    logger.info('Valid password used');
    return true;
  }

  // If no auth configured, allow access (for development)
  if (INVITE_CODES.length === 0 && !ACCESS_PASSWORD) {
    logger.warn('No authentication configured - allowing access');
    return true;
  }

  logger.warn('Invalid credentials', {
    hasInviteCode: !!inviteCode,
    hasPassword: !!password,
  });

  return false;
}

/**
 * Generate JWT token for a user
 */
export function generateToken(user: SafeUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    timestamp: Date.now(),
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  return token;
}

/**
 * Generate legacy token (for backward compatibility with invite code/password auth)
 */
export function generateLegacyToken(payload: any = {}): string {
  const token = jwt.sign(
    {
      authenticated: true,
      timestamp: Date.now(),
      ...payload,
    },
    JWT_SECRET,
    { expiresIn: '7d' } // 7 days
  );

  return token;
}

/**
 * Require admin role middleware
 * Must be used after authenticate() middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    logger.warn('Admin check failed: No user in request', {
      path: req.path,
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'admin') {
    logger.warn('Admin check failed: User is not admin', {
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,
      path: req.path,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
    return;
  }

  logger.debug('Admin check passed', {
    userId: req.user.userId,
    username: req.user.username,
    path: req.path,
  });

  next();
}

/**
 * Check if authentication is enabled
 */
export function isAuthEnabled(): boolean {
  return INVITE_CODES.length > 0 || !!ACCESS_PASSWORD;
}
