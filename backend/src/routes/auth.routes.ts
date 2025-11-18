import { Router, Request, Response } from 'express';
import {
  verifyCredentials,
  generateToken,
  generateLegacyToken,
  isAuthEnabled,
  authenticate,
  requireAdmin,
} from '../middleware/auth.middleware.js';
import { userService } from '../services/user.service.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password are required',
      });
    }

    // Register user
    const user = await userService.register({ username, password });

    // Generate JWT token
    const token = generateToken(user);
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    logger.info('User registered successfully', {
      userId: user.id,
      username: user.username,
      ip: req.ip,
    });

    res.status(201).json({
      user,
      token,
      expiresIn,
      message: 'Registration successful',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';

    logger.error('User registration error', {
      error,
      username: req.body.username,
      ip: req.ip,
    });

    // Handle specific error cases
    if (errorMessage.includes('already exists')) {
      return res.status(409).json({
        error: 'Conflict',
        message: errorMessage,
      });
    }

    if (
      errorMessage.includes('at least') ||
      errorMessage.includes('must be') ||
      errorMessage.includes('can only contain')
    ) {
      return res.status(400).json({
        error: 'Bad Request',
        message: errorMessage,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed, please try again',
    });
  }
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password are required',
      });
    }

    // Login user
    const user = await userService.login({ username, password });

    // Generate JWT token
    const token = generateToken(user);
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    logger.info('User logged in successfully', {
      userId: user.id,
      username: user.username,
      role: user.role,
      ip: req.ip,
    });

    res.json({
      user,
      token,
      expiresIn,
      message: 'Login successful',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';

    logger.error('User login error', {
      error,
      username: req.body.username,
      ip: req.ip,
    });

    // Handle specific error cases
    if (errorMessage.includes('Invalid username or password')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: errorMessage,
      });
    }

    if (errorMessage.includes('disabled')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: errorMessage,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed, please try again',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const user = userService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get current user error', { error, userId: req.user?.userId });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user information',
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify invite code or password and return JWT token (Legacy)
 * NOTE: This endpoint is for backward compatibility with invite code/password system
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { inviteCode, password } = req.body;

    // Validate credentials
    const isValid = verifyCredentials(inviteCode, password);

    if (!isValid) {
      logger.warn('Authentication attempt failed', {
        ip: req.ip,
        hasInviteCode: !!inviteCode,
        hasPassword: !!password,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: '邀请码或密码错误',
      });
    }

    // Generate legacy JWT token (without user info)
    const token = generateLegacyToken();
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    logger.info('Authentication successful (legacy)', {
      ip: req.ip,
      method: inviteCode ? 'inviteCode' : 'password',
    });

    res.json({
      success: true,
      token,
      expiresIn,
      message: '认证成功',
    });
  } catch (error) {
    logger.error('Authentication error', { error });

    res.status(500).json({
      error: 'Internal Server Error',
      message: '认证过程出错，请稍后重试',
    });
  }
});

/**
 * GET /api/auth/status
 * Check if authentication is enabled and current auth status
 */
router.get('/status', async (req: Request, res: Response) => {
  const authEnabled = isAuthEnabled();

  // Try to verify token if provided
  const token = req.headers.authorization?.replace('Bearer ', '');
  let isAuthenticated = false;

  if (token) {
    try {
      const jwt = await import('jsonwebtoken');
      // Use the same JWT_SECRET as auth.middleware.ts
      const JWT_SECRET = process.env.JWT_SECRET || 'insecure-dev-secret-DO-NOT-USE-IN-PRODUCTION';
      jwt.default.verify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch (error) {
      isAuthenticated = false;
    }
  }

  res.json({
    authEnabled,
    isAuthenticated,
    requiresAuth: authEnabled,
  });
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token (extends expiry)
 */
router.post('/refresh', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Get current user data
    const user = userService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Generate new token with updated timestamp
    const token = generateToken(user);
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    logger.info('Token refreshed', {
      userId: user.id,
      username: user.username,
      ip: req.ip,
    });

    res.json({
      success: true,
      token,
      expiresIn,
      message: 'Token已刷新',
    });
  } catch (error) {
    logger.error('Token refresh error', { error, userId: req.user?.userId });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Token刷新失败',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client should delete token)
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  logger.info('User logged out', {
    ip: req.ip,
  });

  res.json({
    success: true,
    message: '已登出',
  });
});

export default router;
