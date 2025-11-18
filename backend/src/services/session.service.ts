// Wedding Helper - Session Service
// Database-backed session management with multi-user data isolation

import { ChatMessage, LLMMessage } from '../types/index.js';
import { db, DatabaseService } from '../database/database.service.js';
import logger from '../utils/logger.js';

// Session data structure (database-backed)
export interface Session {
  id: string;
  userId: number;
  guestName?: string;
  title?: string;
  messages: LLMMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Database session record (chat_sessions table)
interface DBSession {
  id: string;
  user_id: number;
  guest_name: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// Database message record (chat_messages table)
interface DBMessage {
  id: number;
  session_id: string;
  user_id: number;
  role: string;
  content: string;
  tokens_used: number;
  created_at: string;
}

// Guest message record (guest_messages table)
interface DBGuestMessage {
  id: number;
  session_id: string;
  user_id: number;
  guest_name: string;
  message_type: 'blessing' | 'question' | 'message';
  content: string;
  is_read: number;
  created_at: string;
}

/**
 * Database-backed session management service for wedding assistant
 * Implements multi-user data isolation
 */
export class SessionService {
  private db: DatabaseService;

  constructor(dbService?: DatabaseService) {
    this.db = dbService || db;
  }

  /**
   * Get or create a session for a user
   * Data isolation: Users can only access their own sessions
   * Security: Prevents session ID collision across users
   */
  getOrCreateSession(sessionId: string, userId: number, guestName?: string): Session {
    try {
      // Try to get existing session belonging to this user
      const dbSession = this.db.queryOne<DBSession>(
        'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );

      if (dbSession) {
        // Session exists and belongs to this user
        const messages = this.getMessages(sessionId, userId);
        return this.toSession(dbSession, messages);
      }

      // Check if session exists with different owner (prevent ID collision)
      const existingSession = this.db.queryOne<DBSession>(
        'SELECT * FROM chat_sessions WHERE id = ?',
        [sessionId]
      );

      if (existingSession) {
        // Session exists but belongs to another user
        logger.error('Session ID collision attempt', {
          sessionId,
          requestedBy: userId,
          ownedBy: existingSession.user_id,
        });
        throw new Error(`Session ${sessionId} already exists and belongs to another user`);
      }

      // Create new session - session doesn't exist
      this.db.execute(
        'INSERT INTO chat_sessions (id, user_id, guest_name, title) VALUES (?, ?, ?, ?)',
        [sessionId, userId, guestName || null, null]
      );

      logger.info('New chat session created', { sessionId, userId, guestName });

      // Return new empty session
      return {
        id: sessionId,
        userId,
        guestName,
        title: undefined,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get or create session', { error, sessionId, userId });
      throw error; // Propagate the error to caller
    }
  }

  /**
   * Get an existing session without creating a new one
   * Data isolation: Users can only access their own sessions
   */
  getSession(sessionId: string, userId: number): Session | undefined {
    try {
      // Try to get existing session
      const dbSession = this.db.queryOne<DBSession>(
        'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );

      if (!dbSession) {
        return undefined;
      }

      // Load messages for the session
      const messages = this.getMessages(sessionId, userId);
      return this.toSession(dbSession, messages);
    } catch (error) {
      logger.error('Failed to get session', { error, sessionId, userId });
      throw new Error('Failed to get session');
    }
  }

  /**
   * Add a message to a session
   * Data isolation: Messages are associated with the session owner
   */
  addMessage(sessionId: string, userId: number, message: LLMMessage, tokensUsed: number = 0): void {
    try {
      // Ensure session exists and belongs to user
      this.getOrCreateSession(sessionId, userId);

      // Insert message
      this.db.execute(
        'INSERT INTO chat_messages (session_id, user_id, role, content, tokens_used) VALUES (?, ?, ?, ?, ?)',
        [sessionId, userId, message.role, message.content, tokensUsed]
      );

      // Session updated_at is automatically updated by trigger

      logger.info('Message added to session', { sessionId, userId, role: message.role });
    } catch (error) {
      logger.error('Failed to add message', { error, sessionId, userId });
      throw new Error('Failed to add message to session');
    }
  }

  /**
   * Get session messages
   * Data isolation: Only returns messages for user's sessions
   */
  getMessages(sessionId: string, userId: number): LLMMessage[] {
    try {
      const dbMessages = this.db.query<DBMessage>(
        'SELECT * FROM chat_messages WHERE session_id = ? AND user_id = ? ORDER BY created_at ASC',
        [sessionId, userId]
      );

      return dbMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));
    } catch (error) {
      logger.error('Failed to get messages', { error, sessionId, userId });
      return [];
    }
  }

  /**
   * Get recent messages (for LLM context)
   * Returns last N messages for conversation context
   */
  getRecentMessages(sessionId: string, userId: number, limit: number = 10): LLMMessage[] {
    try {
      const dbMessages = this.db.query<DBMessage>(
        'SELECT * FROM chat_messages WHERE session_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?',
        [sessionId, userId, limit]
      );

      // Reverse to get chronological order
      return dbMessages.reverse().map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));
    } catch (error) {
      logger.error('Failed to get recent messages', { error, sessionId, userId, limit });
      return [];
    }
  }

  /**
   * Get all sessions for a user
   * Data isolation: Only returns user's own sessions
   */
  getUserSessions(userId: number): Session[] {
    try {
      const dbSessions = this.db.query<DBSession>(
        'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
        [userId]
      );

      return dbSessions.map(dbSession => {
        const messages = this.getMessages(dbSession.id, userId);
        return this.toSession(dbSession, messages);
      });
    } catch (error) {
      logger.error('Failed to get user sessions', { error, userId });
      return [];
    }
  }

  /**
   * Clear session history (delete all messages)
   * Data isolation: Only clears user's own sessions
   */
  clearSession(sessionId: string, userId: number): void {
    try {
      this.db.execute(
        'DELETE FROM chat_messages WHERE session_id = ? AND user_id = ?',
        [sessionId, userId]
      );

      logger.info('Session cleared', { sessionId, userId });
    } catch (error) {
      logger.error('Failed to clear session', { error, sessionId, userId });
      throw new Error('Failed to clear session');
    }
  }

  /**
   * Delete a session
   * Data isolation: Only deletes user's own sessions
   */
  deleteSession(sessionId: string, userId: number): boolean {
    try {
      const result = this.db.execute(
        'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );

      logger.info('Session deleted', { sessionId, userId, deleted: result.changes > 0 });
      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to delete session', { error, sessionId, userId });
      return false;
    }
  }

  /**
   * Update session title
   * Data isolation: Only updates user's own sessions
   */
  updateSessionTitle(sessionId: string, userId: number, title: string): void {
    try {
      this.db.execute(
        'UPDATE chat_sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [title, sessionId, userId]
      );

      logger.info('Session title updated', { sessionId, userId, title });
    } catch (error) {
      logger.error('Failed to update session title', { error, sessionId, userId });
      throw new Error('Failed to update session title');
    }
  }

  /**
   * Save guest message (blessing, question, or message)
   * This is saved separately from chat messages for easy retrieval by admin
   */
  saveGuestMessage(
    sessionId: string,
    userId: number,
    guestName: string,
    messageType: 'blessing' | 'question' | 'message',
    content: string
  ): void {
    try {
      this.db.execute(
        'INSERT INTO guest_messages (session_id, user_id, guest_name, message_type, content) VALUES (?, ?, ?, ?, ?)',
        [sessionId, userId, guestName, messageType, content]
      );

      logger.info('Guest message saved', { sessionId, userId, guestName, messageType });
    } catch (error) {
      logger.error('Failed to save guest message', { error, sessionId, userId });
      throw new Error('Failed to save guest message');
    }
  }

  /**
   * Get guest messages for a user (wedding owner)
   * Optional filter by message type
   */
  getGuestMessages(
    userId: number,
    messageType?: 'blessing' | 'question' | 'message',
    unreadOnly: boolean = false
  ): DBGuestMessage[] {
    try {
      let query = 'SELECT * FROM guest_messages WHERE user_id = ?';
      const params: any[] = [userId];

      if (messageType) {
        query += ' AND message_type = ?';
        params.push(messageType);
      }

      if (unreadOnly) {
        query += ' AND is_read = 0';
      }

      query += ' ORDER BY created_at DESC';

      const messages = this.db.query<DBGuestMessage>(query, params);

      logger.info('Guest messages retrieved', { userId, messageType, count: messages.length });
      return messages;
    } catch (error) {
      logger.error('Failed to get guest messages', { error, userId, messageType });
      return [];
    }
  }

  /**
   * Mark guest message as read
   */
  markGuestMessageAsRead(messageId: number, userId: number): void {
    try {
      this.db.execute(
        'UPDATE guest_messages SET is_read = 1 WHERE id = ? AND user_id = ?',
        [messageId, userId]
      );

      logger.info('Guest message marked as read', { messageId, userId });
    } catch (error) {
      logger.error('Failed to mark guest message as read', { error, messageId, userId });
      throw new Error('Failed to mark guest message as read');
    }
  }

  /**
   * Admin: Get all sessions (across all users)
   */
  getAllSessions(): Array<{ id: string; userId: number }> {
    try {
      const dbSessions = this.db.query<DBSession>(
        'SELECT id, user_id FROM chat_sessions ORDER BY updated_at DESC'
      );

      return dbSessions.map(s => ({ id: s.id, userId: s.user_id }));
    } catch (error) {
      logger.error('Failed to get all sessions', { error });
      return [];
    }
  }

  /**
   * Admin: Get session count
   */
  getSessionCount(userId?: number): number {
    try {
      if (userId) {
        const result = this.db.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM chat_sessions WHERE user_id = ?',
          [userId]
        );
        return result?.count || 0;
      } else {
        const result = this.db.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM chat_sessions'
        );
        return result?.count || 0;
      }
    } catch (error) {
      logger.error('Failed to get session count', { error, userId });
      return 0;
    }
  }

  /**
   * Get message count for statistics
   */
  getMessageCount(userId?: number): number {
    try {
      if (userId) {
        const result = this.db.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM chat_messages WHERE user_id = ?',
          [userId]
        );
        return result?.count || 0;
      } else {
        const result = this.db.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM chat_messages'
        );
        return result?.count || 0;
      }
    } catch (error) {
      logger.error('Failed to get message count', { error, userId });
      return 0;
    }
  }

  /**
   * Convert database session to Session object
   */
  private toSession(dbSession: DBSession, messages: LLMMessage[]): Session {
    return {
      id: dbSession.id,
      userId: dbSession.user_id,
      guestName: dbSession.guest_name || undefined,
      title: dbSession.title || undefined,
      messages,
      createdAt: new Date(dbSession.created_at),
      updatedAt: new Date(dbSession.updated_at),
    };
  }
}

// Export singleton instance
export const sessionService = new SessionService();
