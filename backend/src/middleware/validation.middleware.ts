import { Request, Response, NextFunction } from 'express';

/**
 * Validation error response
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate chat message request
 */
export function validateChatMessage(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { message, style } = req.body;

  // Validate message
  if (!message) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Message is required',
      field: 'message',
    });
    return;
  }

  if (typeof message !== 'string') {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Message must be a string',
      field: 'message',
    });
    return;
  }

  if (message.trim().length === 0) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Message cannot be empty',
      field: 'message',
    });
    return;
  }

  if (message.length > 2000) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Message is too long (max 2000 characters)',
      field: 'message',
    });
    return;
  }

  // Validate style (optional)
  if (style !== undefined) {
    const validStyles = ['gentle', 'formal', 'empathetic'];
    if (!validStyles.includes(style)) {
      res.status(400).json({
        error: 'Validation Error',
        message: `Invalid style. Must be one of: ${validStyles.join(', ')}`,
        field: 'style',
      });
      return;
    }
  }

  next();
}

/**
 * Validate session ID
 */
export function validateSessionId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const sessionId = req.query.sessionId as string || req.body.sessionId as string;

  if (!sessionId) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Session ID is required',
      field: 'sessionId',
    });
    return;
  }

  if (typeof sessionId !== 'string') {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Session ID must be a string',
      field: 'sessionId',
    });
    return;
  }

  if (sessionId.length > 100) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Session ID is too long',
      field: 'sessionId',
    });
    return;
  }

  next();
}
