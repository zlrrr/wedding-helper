// Wedding Helper - Chat Routes
// API endpoints for wedding assistant chat functionality

import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { verifySessionOwnership } from '../middleware/session-authorization.middleware.js';
import { sessionService } from '../services/session.service.js';
import { llmService } from '../services/llm.service.js';
import { knowledgeService } from '../services/knowledge.service.js';
import {
  generateGreeting,
  detectMessageType,
  buildSystemPromptWithContext,
  validateGuestMessage,
  WEDDING_ASSISTANT_SYSTEM_PROMPT,
} from '../prompts/wedding-assistant.prompts.js';
import logger from '../utils/logger.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

/**
 * POST /api/chat/message
 * Send a message and get assistant response
 * Creates new session if sessionId is null
 */
router.post('/message', optionalAuthenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Allow anonymous users (guests) - use userId 0 for anonymous
    const userId = req.user?.userId || 0;
    const { sessionId, message, guestName } = req.body;

    logger.info('[CHAT-001] Processing chat message', {
      userId,
      sessionId: sessionId || 'new',
      messageLength: message?.length,
      guestName,
    });

    // Validate message
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Message is required and must be a string',
      });
    }

    const validation = validateGuestMessage(message);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'ValidationError',
        message: validation.error,
      });
    }

    const sanitizedMessage = validation.sanitized!;

    // Generate or use existing session ID
    const currentSessionId = sessionId || uuidv4();

    // Check if this is a new session (first message)
    const existingSession = sessionService.getSession(currentSessionId, userId);
    const isNewSession = !existingSession;

    if (isNewSession) {
      // Create new session
      sessionService.getOrCreateSession(currentSessionId, userId, guestName);

      // Send greeting message
      const greeting = generateGreeting(guestName);
      sessionService.addMessage(
        currentSessionId,
        userId,
        { role: 'assistant', content: greeting },
        0
      );

      logger.info('[CHAT-002] New session created with greeting', {
        userId,
        sessionId: currentSessionId,
        guestName,
      });

      return res.json({
        sessionId: currentSessionId,
        response: greeting,
        isNewSession: true,
      });
    }

    // Detect message type
    const messageType = detectMessageType(sanitizedMessage);

    logger.info('[CHAT-003] Message type detected', {
      userId,
      sessionId: currentSessionId,
      messageType,
    });

    // Get recent conversation history for context (before saving current message to avoid duplication)
    const conversationHistory = sessionService.getRecentMessages(currentSessionId, userId, 10);

    logger.info('[CHAT-005] Retrieved conversation history', {
      userId,
      sessionId: currentSessionId,
      messageCount: conversationHistory.length,
    });

    // Retrieve context from knowledge base
    // Supports multiple modes: rag (default), fulltext, hybrid
    let ragContext = '';
    const knowledgeMode = process.env.KNOWLEDGE_MODE || 'hybrid';  // rag | fulltext | hybrid

    try {
      if (knowledgeMode === 'fulltext') {
        // FULLTEXT MODE: Return all documents
        ragContext = knowledgeService.retrieveContextFullText(userId);

        if (ragContext.length > 0) {
          logger.info('[CHAT-005a] Full text context retrieved', {
            userId,
            sessionId: currentSessionId,
            contextLength: ragContext.length,
            mode: 'fulltext',
          });
        }
      } else if (knowledgeMode === 'hybrid') {
        // HYBRID MODE: Try RAG first, fallback to fulltext if no results
        const contextChunks = knowledgeService.retrieveContext(userId, sanitizedMessage, 5);

        if (contextChunks.length > 0) {
          ragContext = contextChunks.join('\n\n---\n\n');

          logger.info('[CHAT-005a] RAG context retrieved', {
            userId,
            sessionId: currentSessionId,
            chunksFound: contextChunks.length,
            contextLength: ragContext.length,
            mode: 'hybrid-rag',
          });
        } else {
          // No RAG results, fallback to fulltext
          ragContext = knowledgeService.retrieveContextFullText(userId);

          logger.info('[CHAT-005a] Fallback to full text', {
            userId,
            sessionId: currentSessionId,
            contextLength: ragContext.length,
            mode: 'hybrid-fulltext',
          });
        }
      } else {
        // RAG MODE (default): Keyword-based retrieval only
        const contextChunks = knowledgeService.retrieveContext(userId, sanitizedMessage, 5);

        if (contextChunks.length > 0) {
          ragContext = contextChunks.join('\n\n---\n\n');

          logger.info('[CHAT-005a] RAG context retrieved', {
            userId,
            sessionId: currentSessionId,
            chunksFound: contextChunks.length,
            contextLength: ragContext.length,
            mode: 'rag',
          });
        } else {
          logger.info('[CHAT-005b] No RAG context found', {
            userId,
            sessionId: currentSessionId,
            message: sanitizedMessage,
            mode: 'rag',
          });
        }
      }
    } catch (error) {
      logger.error('[CHAT-WARN] Failed to retrieve context', {
        error,
        userId,
        sessionId: currentSessionId,
        mode: knowledgeMode,
      });
      // Continue without context if retrieval fails
    }

    // Build system prompt with RAG context
    const systemPrompt = buildSystemPromptWithContext(ragContext);

    // Call LLM service
    logger.info('[CHAT-006] Calling LLM service', {
      userId,
      sessionId: currentSessionId,
      provider: process.env.LLM_PROVIDER || 'gemini',
      systemPromptLength: systemPrompt.length,
      hasRAGContext: ragContext.length > 0,
    });

    const llmResponse = await llmService.generateApology({
      message: sanitizedMessage,
      history: conversationHistory,
      systemPrompt: systemPrompt,  // Pass RAG-enhanced system prompt
    });

    logger.info('[CHAT-007] LLM response received', {
      userId,
      sessionId: currentSessionId,
      tokensUsed: llmResponse.tokensUsed,
      responseLength: llmResponse.apology.length,
    });

    // Save user message (after LLM call to avoid duplication in conversation history)
    sessionService.addMessage(
      currentSessionId,
      userId,
      { role: 'user', content: sanitizedMessage },
      0
    );

    // If it's a blessing, save to guest_messages table
    if (messageType === 'blessing') {
      sessionService.saveGuestMessage(
        currentSessionId,
        userId,
        guestName || '匿名宾客',
        messageType,
        sanitizedMessage
      );

      logger.info('[CHAT-004] Blessing saved', {
        userId,
        sessionId: currentSessionId,
        guestName: guestName || '匿名宾客',
      });
    }

    // Save assistant response
    sessionService.addMessage(
      currentSessionId,
      userId,
      { role: 'assistant', content: llmResponse.apology },
      llmResponse.tokensUsed
    );

    logger.info('[CHAT-008] Chat request completed', {
      userId,
      sessionId: currentSessionId,
      messageType,
    });

    res.json({
      sessionId: currentSessionId,
      response: llmResponse.apology,
      messageType,
      tokensUsed: llmResponse.tokensUsed,
    });
  } catch (error: any) {
    logger.error('[CHAT-ERROR] Chat request failed', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      userId: req.user?.userId,
      sessionId: req.body?.sessionId,
      message: req.body?.message,
      guestName: req.body?.guestName,
    });

    // Return user-friendly error message
    res.status(500).json({
      error: 'ChatError',
      message: '消息发送失败，请稍后重试',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
});

/**
 * GET /api/chat/history
 * Get conversation history for a session
 */
router.get('/history', authenticate, verifySessionOwnership, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'sessionId query parameter is required',
      });
    }

    logger.info('[CHAT-009] Fetching conversation history', { userId, sessionId });

    const messages = sessionService.getMessages(sessionId, userId);

    res.json({
      sessionId,
      messages,
      count: messages.length,
    });
  } catch (error) {
    logger.error('[CHAT-ERROR] Failed to fetch history', {
      error,
      userId: req.user?.userId,
      sessionId: req.query?.sessionId,
    });
    next(error);
  }
});

/**
 * DELETE /api/chat/history
 * Clear conversation history for a session
 */
router.delete('/history', authenticate, verifySessionOwnership, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'sessionId is required',
      });
    }

    logger.info('[CHAT-010] Clearing session history', { userId, sessionId });

    sessionService.clearSession(sessionId, userId);

    res.json({
      message: 'Session history cleared successfully',
      sessionId,
    });
  } catch (error) {
    logger.error('[CHAT-ERROR] Failed to clear history', {
      error,
      userId: req.user?.userId,
      sessionId: req.body?.sessionId,
    });
    next(error);
  }
});

/**
 * DELETE /api/chat/session
 * Delete a session completely
 */
router.delete('/session', authenticate, verifySessionOwnership, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'sessionId is required',
      });
    }

    logger.info('[CHAT-011] Deleting session', { userId, sessionId });

    const deleted = sessionService.deleteSession(sessionId, userId);

    if (!deleted) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Session not found or already deleted',
      });
    }

    res.json({
      message: 'Session deleted successfully',
      sessionId,
    });
  } catch (error) {
    logger.error('[CHAT-ERROR] Failed to delete session', {
      error,
      userId: req.user?.userId,
      sessionId: req.body?.sessionId,
    });
    next(error);
  }
});

/**
 * GET /api/chat/sessions
 * Get all sessions for the authenticated user
 */
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    logger.info('[CHAT-012] Fetching user sessions', { userId });

    const sessions = sessionService.getUserSessions(userId);

    // Return lightweight session list (without full message history)
    const sessionList = sessions.map(session => ({
      id: session.id,
      guestName: session.guestName,
      title: session.title,
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));

    res.json({
      sessions: sessionList,
      count: sessionList.length,
    });
  } catch (error) {
    logger.error('[CHAT-ERROR] Failed to fetch sessions', {
      error,
      userId: req.user?.userId,
    });
    next(error);
  }
});

/**
 * GET /api/chat/blessings
 * Get all guest blessings (admin or owner only)
 */
router.get('/blessings', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const unreadOnly = req.query.unreadOnly === 'true';

    logger.info('[CHAT-013] Fetching guest blessings', { userId, unreadOnly });

    const blessings = sessionService.getGuestMessages(userId, 'blessing', unreadOnly);

    res.json({
      blessings,
      count: blessings.length,
    });
  } catch (error) {
    logger.error('[CHAT-ERROR] Failed to fetch blessings', {
      error,
      userId: req.user?.userId,
    });
    next(error);
  }
});

/**
 * GET /api/chat/guest-messages
 * Get all guest messages (admin or owner only)
 * Optional filter by type: blessing, question, message
 */
router.get('/guest-messages', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const messageType = req.query.type as 'blessing' | 'question' | 'message' | undefined;
    const unreadOnly = req.query.unreadOnly === 'true';

    logger.info('[CHAT-014] Fetching guest messages', { userId, messageType, unreadOnly });

    const messages = sessionService.getGuestMessages(userId, messageType, unreadOnly);

    res.json({
      messages,
      count: messages.length,
    });
  } catch (error) {
    logger.error('[CHAT-ERROR] Failed to fetch guest messages', {
      error,
      userId: req.user?.userId,
    });
    next(error);
  }
});

/**
 * PATCH /api/chat/guest-messages/:messageId/read
 * Mark a guest message as read
 */
router.patch('/guest-messages/:messageId/read', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const messageId = parseInt(req.params.messageId);

    if (isNaN(messageId)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid message ID',
      });
    }

    logger.info('[CHAT-015] Marking guest message as read', { userId, messageId });

    sessionService.markGuestMessageAsRead(messageId, userId);

    res.json({
      message: 'Message marked as read',
      messageId,
    });
  } catch (error) {
    logger.error('[CHAT-ERROR] Failed to mark message as read', {
      error,
      userId: req.user?.userId,
      messageId: req.params.messageId,
    });
    next(error);
  }
});

export default router;
