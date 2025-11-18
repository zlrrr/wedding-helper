// Wedding Helper - Role Authorization Middleware
// Middleware to restrict routes to specific user roles

import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * Middleware to require admin role
 * Must be used after authenticate middleware
 */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // Check if user is authenticated (should be set by authenticate middleware)
  if (!req.user) {
    logger.warn('[ROLE-AUTH-001] Access denied: User not authenticated', {
      path: req.path,
      ip: req.ip,
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    logger.warn('[ROLE-AUTH-002] Access denied: Admin role required', {
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,
      path: req.path,
      ip: req.ip,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
    return;
  }

  // User is admin, proceed
  logger.info('[ROLE-AUTH-003] Admin access granted', {
    userId: req.user.userId,
    username: req.user.username,
    path: req.path,
  });

  next();
}

/**
 * Middleware to require user or admin role (any authenticated user)
 * Must be used after authenticate middleware
 */
export function requireUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    logger.warn('[ROLE-AUTH-004] Access denied: User not authenticated', {
      path: req.path,
      ip: req.ip,
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Any authenticated user can proceed
  next();
}
