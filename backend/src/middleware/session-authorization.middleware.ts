import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/session.service.js';
import logger from '../utils/logger.js';

/**
 * Verify session ownership middleware
 * Checks if the requested session exists and belongs to the authenticated user
 * Admin users can access any session via the admin API
 *
 * Usage: Apply to routes that access specific sessions
 */
export function verifySessionOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.query.sessionId as string || req.body.sessionId;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!sessionId) {
      // No sessionId provided - will create new session, allow to proceed
      return next();
    }

    // Admin can access any session regardless of owner
    if (userRole === 'admin') {
      logger.info('Admin accessing session', {
        userId,
        username: req.user!.username,
        sessionId,
        path: req.path,
      });
      return next();
    }

    // Check if session exists globally
    const allSessions = sessionService.getAllSessions();
    const existingSession = allSessions.find(s => s.id === sessionId);

    if (existingSession && existingSession.userId !== userId) {
      // Session exists but belongs to another user - access denied for non-admin
      logger.warn('Unauthorized session access attempt', {
        userId,
        username: req.user!.username,
        sessionId,
        ownerId: existingSession.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this session',
      });
    }

    // Session doesn't exist or belongs to current user - allow
    next();
  } catch (error) {
    logger.error('Session authorization error', { error });
    next(error);
  }
}

/**
 * Prevent session ID collision middleware
 * Ensures sessionId is unique across all users when creating new sessions
 *
 * Usage: Apply to routes that create new sessions
 */
export function preventSessionCollision(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.body.sessionId;
    const userId = req.user!.userId;

    if (!sessionId) {
      // No sessionId provided - system will auto-generate unique UUID
      return next();
    }

    // Check if session exists globally
    const allSessions = sessionService.getAllSessions();
    const existingSession = allSessions.find(s => s.id === sessionId);

    if (existingSession) {
      // Session ID already exists
      if (existingSession.userId === userId) {
        // User's own session - allow (continuing existing conversation)
        return next();
      }

      // Session ID collision - belongs to another user
      logger.warn('Session ID collision detected', {
        userId,
        username: req.user!.username,
        sessionId,
        existingOwnerId: existingSession.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'This session ID already exists. Please use a different ID or let the system generate one.',
      });
    }

    // Session ID is unique - allow creation
    next();
  } catch (error) {
    logger.error('Session collision check error', { error });
    next(error);
  }
}
