import { Request, Response, NextFunction } from 'express';
import { LLMError } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * Error codes for different error scenarios
 */
export const ERROR_CODES = {
  // LLM errors (5000-5999)
  LLM_CONNECTION_REFUSED: 'ERR-5001',
  LLM_TIMEOUT: 'ERR-5002',
  LLM_API_ERROR: 'ERR-5003',
  LLM_NETWORK_ERROR: 'ERR-5004',
  LLM_UNKNOWN_ERROR: 'ERR-5005',
  LLM_NOT_CONFIGURED: 'ERR-5006',

  // Validation errors (4000-4999)
  VALIDATION_ERROR: 'ERR-4001',
  INVALID_INPUT: 'ERR-4002',
  MISSING_PARAMETER: 'ERR-4003',

  // Session errors (3000-3999)
  SESSION_NOT_FOUND: 'ERR-3001',
  SESSION_EXPIRED: 'ERR-3002',

  // Generic errors (1000-1999)
  INTERNAL_ERROR: 'ERR-1000',
  UNKNOWN_ERROR: 'ERR-1999',
} as const;

/**
 * Global error handling middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.requestId || 'unknown';

  logger.error('[ERROR-HANDLER] Handling error', {
    requestId,
    errorName: error.name,
    errorMessage: error.message,
    path: req.path,
    method: req.method,
  });

  // Handle LLM errors
  if (error instanceof LLMError) {
    const { statusCode, errorCode } = getErrorInfoForLLMError(error);

    const errorResponse = {
      error: error.code,
      errorCode,
      message: error.message,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Add diagnostic info in development
    if (process.env.NODE_ENV !== 'production') {
      (errorResponse as any).diagnostic = {
        provider: error.message.includes('Studio') ? 'lm-studio' :
                  error.message.includes('Gemini') ? 'gemini' :
                  error.message.includes('OpenAI') ? 'openai' : 'unknown',
        suggestion: getSuggestionForError(error),
      };
    }

    res.status(statusCode).json(errorResponse);
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation Error',
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      message: error.message,
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle generic errors
  const statusCode = (error as any).statusCode || 500;
  res.status(statusCode).json({
    error: 'Internal Server Error',
    errorCode: ERROR_CODES.INTERNAL_ERROR,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message,
    requestId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get HTTP status code and error code for LLM error
 */
function getErrorInfoForLLMError(error: LLMError): { statusCode: number; errorCode: string } {
  switch (error.code) {
    case 'CONNECTION_REFUSED':
      return {
        statusCode: 503,
        errorCode: ERROR_CODES.LLM_CONNECTION_REFUSED
      };
    case 'TIMEOUT':
      return {
        statusCode: 504,
        errorCode: ERROR_CODES.LLM_TIMEOUT
      };
    case 'API_ERROR':
      return {
        statusCode: error.statusCode || 502,
        errorCode: ERROR_CODES.LLM_API_ERROR
      };
    case 'NETWORK_ERROR':
      return {
        statusCode: 502,
        errorCode: ERROR_CODES.LLM_NETWORK_ERROR
      };
    default:
      return {
        statusCode: 500,
        errorCode: ERROR_CODES.LLM_UNKNOWN_ERROR
      };
  }
}

/**
 * Get suggestion for fixing the error
 */
function getSuggestionForError(error: LLMError): string {
  switch (error.code) {
    case 'CONNECTION_REFUSED':
      return 'Check if LLM provider is configured and accessible. For Gemini, verify GEMINI_API_KEY is set.';
    case 'TIMEOUT':
      return 'LLM provider is taking too long to respond. Try again or check provider status.';
    case 'API_ERROR':
      return 'LLM API returned an error. Check API key validity and quota limits.';
    case 'NETWORK_ERROR':
      return 'Network connection to LLM provider failed. Check network connectivity.';
    default:
      return 'An unknown error occurred with the LLM service. Check logs for details.';
  }
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
}
