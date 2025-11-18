/**
 * Session Management API
 * Server-side session storage with optional localStorage caching
 *
 * CRITICAL: All session data is stored on the backend server
 * localStorage is used ONLY for caching to improve performance
 * Cross-device synchronization is fully supported
 */

import { Message } from '../types';
import { Session } from '../components/SessionList';
import api from '../services/api';
import logger from './logger';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Generate user-specific cache keys for proper data isolation
const getActiveSessionKey = (userId: number) => `apology_active_session_user_${userId}`;
const getSessionCacheKey = (userId: number) => `apology_sessions_cache_user_${userId}`;

export interface StoredSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface CachedData {
  data: StoredSession[];
  timestamp: number;
}

/**
 * Get all sessions from backend API
 * Uses localStorage as temporary cache only
 * @param userId - Current user ID for cache isolation
 */
export async function getSessions(userId: number): Promise<StoredSession[]> {
  try {
    logger.info('[Storage] Fetching sessions from backend', { userId });

    // Try cache first (for performance)
    const cached = getCachedSessions(userId);
    if (cached) {
      logger.info('[Storage] Using cached sessions', { userId, count: cached.length });
      // Fetch fresh data in background
      fetchAndCacheSessions(userId).catch(err =>
        logger.error('[Storage] Background fetch failed', err)
      );
      return cached;
    }

    // Fetch from backend
    const sessions = await fetchAndCacheSessions(userId);
    return sessions;
  } catch (error) {
    logger.error('[Storage] Failed to get sessions from backend', error);
    // Fallback to cache even if expired
    const cacheKey = getSessionCacheKey(userId);
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const { data } = JSON.parse(cachedData) as CachedData;
      logger.warn('[Storage] Using expired cache as fallback', { userId, count: data.length });
      return data;
    }
    return [];
  }
}

/**
 * Fetch sessions from backend and update cache
 * @param userId - Current user ID for cache isolation
 */
async function fetchAndCacheSessions(userId: number): Promise<StoredSession[]> {
  const response = await api.get('/api/chat/sessions');
  const backendSessions = response.data.sessions;

  // Convert backend format to frontend format
  const sessions: StoredSession[] = backendSessions.map((s: any) => ({
    id: s.id,
    name: s.title || generateSessionName(''),
    messages: s.lastMessage ? [{ role: 'assistant', content: s.lastMessage, timestamp: s.updatedAt }] : [], // Store last message for preview
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  // Update user-specific cache
  const cacheKey = getSessionCacheKey(userId);
  const cacheData: CachedData = {
    data: sessions,
    timestamp: Date.now(),
  };
  localStorage.setItem(cacheKey, JSON.stringify(cacheData));

  logger.info('[Storage] Sessions fetched and cached', { userId, count: sessions.length });
  return sessions;
}

/**
 * Get cached sessions if not expired
 * @param userId - Current user ID for cache isolation
 */
function getCachedSessions(userId: number): StoredSession[] | null {
  try {
    const cacheKey = getSessionCacheKey(userId);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached) as CachedData;
    const age = Date.now() - timestamp;

    if (age > CACHE_DURATION) {
      logger.debug('[Storage] Cache expired', { userId, ageMs: age });
      return null;
    }

    return data;
  } catch (error) {
    logger.error('[Storage] Failed to parse cache', error);
    return null;
  }
}

/**
 * Get a specific session from backend with full message history
 * @param sessionId - Session ID to fetch
 * @param userId - Current user ID for cache isolation
 */
export async function getSession(sessionId: string, userId: number): Promise<StoredSession | null> {
  try {
    logger.info('[Storage] Fetching session from backend', { sessionId, userId });

    const response = await api.get(`/api/chat/history?sessionId=${sessionId}`);
    const { messages: backendMessages, createdAt, updatedAt } = response.data;

    // Find session metadata from cache or fetch list
    const sessions = await getSessions(userId);
    const sessionMeta = sessions.find(s => s.id === sessionId);

    const session: StoredSession = {
      id: sessionId,
      name: sessionMeta?.name || generateSessionName(backendMessages[0]?.content || ''),
      messages: backendMessages.map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date().toISOString(), // Backend doesn't store timestamp per message
      })),
      createdAt,
      updatedAt,
    };

    logger.info('[Storage] Session loaded', { sessionId, userId, messageCount: session.messages.length });
    return session;
  } catch (error) {
    logger.error('[Storage] Failed to get session from backend', { sessionId, error });
    return null;
  }
}

/**
 * Sessions are saved automatically by backend when messages are sent
 * This function exists for compatibility but doesn't need to do anything
 * @param session - Session to save
 * @param userId - Current user ID for cache isolation
 */
export function saveSession(session: StoredSession, userId: number): void {
  // IMPORTANT: Backend automatically saves sessions when messages are sent
  // No need to manually save - session data is already on the server
  logger.debug('[Storage] Session save requested (handled by backend)', {
    sessionId: session.id,
    userId,
  });

  // Invalidate user-specific cache so next load fetches fresh data
  const cacheKey = getSessionCacheKey(userId);
  localStorage.removeItem(cacheKey);
}

/**
 * Delete a session from backend
 * @param sessionId - Session ID to delete
 * @param userId - Current user ID for cache isolation
 */
export async function deleteSession(sessionId: string, userId: number): Promise<void> {
  try {
    logger.info('[Storage] Deleting session from backend', { sessionId, userId });

    await api.delete(`/api/chat/session?sessionId=${sessionId}`);

    // Invalidate user-specific cache
    const cacheKey = getSessionCacheKey(userId);
    localStorage.removeItem(cacheKey);

    logger.info('[Storage] Session deleted successfully', { sessionId, userId });
  } catch (error) {
    logger.error('[Storage] Failed to delete session from backend', { sessionId, error });
    throw error;
  }
}

/**
 * Clear session history (delete all messages but keep session)
 * @param sessionId - Session ID to clear
 * @param userId - Current user ID for cache isolation
 */
export async function clearSessionHistory(sessionId: string, userId: number): Promise<void> {
  try {
    logger.info('[Storage] Clearing session history from backend', { sessionId, userId });

    await api.delete(`/api/chat/history?sessionId=${sessionId}`);

    // Invalidate user-specific cache
    const cacheKey = getSessionCacheKey(userId);
    localStorage.removeItem(cacheKey);

    logger.info('[Storage] Session history cleared successfully', { sessionId, userId });
  } catch (error) {
    logger.error('[Storage] Failed to clear session history from backend', { sessionId, error });
    throw error;
  }
}

/**
 * Get active session ID (stored locally for UX)
 * @param userId - Current user ID for session isolation
 */
export function getActiveSessionId(userId: number): string | null {
  const key = getActiveSessionKey(userId);
  return localStorage.getItem(key);
}

/**
 * Set active session ID (stored locally for UX)
 * @param sessionId - Session ID to set as active
 * @param userId - Current user ID for session isolation
 */
export function setActiveSessionId(sessionId: string, userId: number): void {
  const key = getActiveSessionKey(userId);
  localStorage.setItem(key, sessionId);
}

/**
 * Clear active session ID
 * @param userId - Current user ID for session isolation
 */
export function clearActiveSessionId(userId: number): void {
  const key = getActiveSessionKey(userId);
  localStorage.removeItem(key);
}

/**
 * Invalidate session cache for a specific user (force refresh from backend)
 * @param userId - User ID whose cache to invalidate
 */
export function invalidateCache(userId: number): void {
  const cacheKey = getSessionCacheKey(userId);
  localStorage.removeItem(cacheKey);
  logger.info('[Storage] Cache invalidated', { userId });
}

/**
 * Clear all session-related data for a specific user
 * Used during logout to ensure clean state
 * @param userId - User ID whose data to clear
 */
export function clearUserSessionData(userId: number): void {
  const cacheKey = getSessionCacheKey(userId);
  const activeKey = getActiveSessionKey(userId);

  localStorage.removeItem(cacheKey);
  localStorage.removeItem(activeKey);

  logger.info('[Storage] User session data cleared', { userId });
}

/**
 * Clear ALL session-related data for all users
 * Used during logout to ensure complete cleanup
 */
export function clearAllSessionData(): void {
  // Remove all keys that start with our prefixes
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('apology_sessions_cache_user_') || key.startsWith('apology_active_session_user_'))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));

  logger.info('[Storage] All session data cleared', { count: keysToRemove.length });
}

/**
 * Convert stored session to session list item
 */
export function toSessionListItem(stored: StoredSession): Session {
  const lastMessage = stored.messages.length > 0
    ? stored.messages[stored.messages.length - 1].content
    : undefined;

  return {
    id: stored.id,
    name: stored.name,
    lastMessage: lastMessage?.substring(0, 50) + (lastMessage && lastMessage.length > 50 ? '...' : ''),
    updatedAt: new Date(stored.updatedAt),
    messageCount: stored.messages.length,
  };
}

/**
 * Generate session name from first message
 */
export function generateSessionName(firstMessage: string): string {
  if (!firstMessage || firstMessage.trim() === '') {
    return 'New Conversation';
  }

  const maxLength = 30;
  if (firstMessage.length <= maxLength) {
    return firstMessage;
  }
  return firstMessage.substring(0, maxLength) + '...';
}
