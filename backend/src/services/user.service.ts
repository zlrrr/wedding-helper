import bcrypt from 'bcrypt';
import { db, DatabaseService } from '../database/database.service.js';
import logger from '../utils/logger.js';

const SALT_ROUNDS = 10;

/**
 * User interface
 */
export interface User {
  id: number;
  username: string;
  password_hash?: string; // Should not be returned to client
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
  is_active: boolean;
  last_login_at: string | null;
}

/**
 * User registration data
 */
export interface UserRegistration {
  username: string;
  password: string;
}

/**
 * User login data
 */
export interface UserLogin {
  username: string;
  password: string;
}

/**
 * Safe user object (without password hash)
 */
export interface SafeUser {
  id: number;
  username: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

/**
 * User Service
 * Handles user authentication and management
 */
export class UserService {
  private db: DatabaseService;

  /**
   * Constructor
   * @param dbService - Optional database service instance (defaults to singleton)
   */
  constructor(dbService?: DatabaseService) {
    this.db = dbService || db;
  }

  /**
   * Register a new user
   */
  async register(data: UserRegistration): Promise<SafeUser> {
    try {
      const { username, password } = data;

      // Validate input
      this.validateUsername(username);
      this.validatePassword(password);

      // Check if username already exists
      const existingUser = this.db.queryOne<User>(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert new user
      const result = this.db.execute(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, passwordHash, 'user']
      );

      logger.info('User registered successfully', { userId: result.lastInsertRowid, username });

      // Get the newly created user
      const user = this.db.queryOne<User>(
        'SELECT * FROM users WHERE id = ?',
        [result.lastInsertRowid]
      );

      if (!user) {
        throw new Error('Failed to retrieve newly created user');
      }

      return this.toSafeUser(user);
    } catch (error) {
      logger.error('User registration failed', {
        error,
        username: data.username,
      });

      // Handle database constraint errors (e.g., concurrent registration attempts)
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as { code: string };
        if (dbError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          throw new Error('Username already exists');
        }
      }

      throw error;
    }
  }

  /**
   * Login user with username and password
   */
  async login(data: UserLogin): Promise<SafeUser> {
    try {
      const { username, password } = data;

      // Get user from database
      const user = this.db.queryOne<User>(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        logger.warn('Login attempt with non-existent username', { username });
        throw new Error('Invalid username or password');
      }

      // Check if user is active
      if (!user.is_active) {
        logger.warn('Login attempt for inactive user', { username, userId: user.id });
        throw new Error('Account is disabled');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash!);

      if (!isPasswordValid) {
        logger.warn('Login attempt with invalid password', {
          username,
          userId: user.id,
        });
        throw new Error('Invalid username or password');
      }

      // Update last login timestamp
      this.db.execute(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      logger.info('User logged in successfully', { userId: user.id, username });

      // Get updated user data
      const updatedUser = this.db.queryOne<User>(
        'SELECT * FROM users WHERE id = ?',
        [user.id]
      );

      return this.toSafeUser(updatedUser!);
    } catch (error) {
      logger.error('User login failed', {
        error,
        username: data.username,
      });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  getUserById(userId: number): SafeUser | null {
    try {
      const user = this.db.queryOne<User>(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        return null;
      }

      return this.toSafeUser(user);
    } catch (error) {
      logger.error('Failed to get user by ID', { userId, error });
      throw error;
    }
  }

  /**
   * Get user by username
   */
  getUserByUsername(username: string): SafeUser | null {
    try {
      const user = this.db.queryOne<User>(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return null;
      }

      return this.toSafeUser(user);
    } catch (error) {
      logger.error('Failed to get user by username', { username, error });
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  getAllUsers(): SafeUser[] {
    try {
      const users = this.db.query<User>(
        'SELECT * FROM users ORDER BY created_at DESC'
      );

      return users.map((user) => this.toSafeUser(user));
    } catch (error) {
      logger.error('Failed to get all users', { error });
      throw error;
    }
  }

  /**
   * Update user active status
   */
  updateUserStatus(userId: number, isActive: boolean): SafeUser {
    try {
      this.db.execute(
        'UPDATE users SET is_active = ? WHERE id = ?',
        [isActive ? 1 : 0, userId]
      );

      logger.info('User status updated', { userId, isActive });

      const user = this.db.queryOne<User>(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      return this.toSafeUser(user);
    } catch (error) {
      logger.error('Failed to update user status', { userId, isActive, error });
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user with password hash
      const user = this.db.queryOne<User>(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Verify old password
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash!);

      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      this.validatePassword(newPassword);

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password
      this.db.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId]
      );

      logger.info('User password changed', { userId });
    } catch (error) {
      logger.error('Failed to change password', { userId, error });
      throw error;
    }
  }

  /**
   * Delete user (soft delete - set is_active to false)
   */
  deleteUser(userId: number): void {
    try {
      this.db.execute(
        'UPDATE users SET is_active = 0 WHERE id = ?',
        [userId]
      );

      logger.info('User deleted (soft delete)', { userId });
    } catch (error) {
      logger.error('Failed to delete user', { userId, error });
      throw error;
    }
  }

  /**
   * Convert database user to safe user object (without password hash)
   */
  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      isActive: Boolean(user.is_active),
      lastLoginAt: user.last_login_at,
    };
  }

  /**
   * Validate username
   */
  private validateUsername(username: string): void {
    if (!username || typeof username !== 'string') {
      throw new Error('Username is required');
    }

    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (username.length > 50) {
      throw new Error('Username must be at most 50 characters long');
    }

    // Only allow alphanumeric characters, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
    }
  }

  /**
   * Validate password
   */
  private validatePassword(password: string): void {
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    if (password.length > 128) {
      throw new Error('Password must be at most 128 characters long');
    }

    // Recommended: Check for password strength (at least one number and one letter)
    // Commenting out for MVP, but recommended for production
    // if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
    //   throw new Error('Password must contain at least one letter and one number');
    // }
  }

  /**
   * Get user statistics
   */
  getUserStats(userId: number): {
    userId: number;
    sessionCount: number;
    messageCount: number;
    firstSessionDate: string | null;
    lastActivityDate: string | null;
  } {
    try {
      const sessionCount = this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM sessions WHERE user_id = ?',
        [userId]
      );

      const messageCount = this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM messages WHERE user_id = ?',
        [userId]
      );

      const activityDates = this.db.queryOne<{
        first_session: string | null;
        last_activity: string | null;
      }>(
        `SELECT
          MIN(created_at) as first_session,
          MAX(updated_at) as last_activity
        FROM sessions
        WHERE user_id = ?`,
        [userId]
      );

      return {
        userId,
        sessionCount: sessionCount?.count || 0,
        messageCount: messageCount?.count || 0,
        firstSessionDate: activityDates?.first_session || null,
        lastActivityDate: activityDates?.last_activity || null,
      };
    } catch (error) {
      logger.error('Failed to get user stats', { userId, error });
      throw error;
    }
  }
}

// Export singleton instance
export const userService = new UserService();
