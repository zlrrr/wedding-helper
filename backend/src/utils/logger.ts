import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');

/**
 * Winston Logger Configuration
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'apologize-backend' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0 && meta.service) {
            const { service, ...rest } = meta;
            if (Object.keys(rest).length > 0) {
              msg += ` ${JSON.stringify(rest)}`;
            }
          } else if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
          }
          return msg;
        })
      ),
    }),
  ],
});

/**
 * Extend Request interface to include requestId
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Request logging middleware
 * Logs all HTTP requests with unique request ID and timing information
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = uuidv4();

  req.requestId = requestId;

  // Log request
  logger.info('HTTP Request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, 'HTTP Response', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    // Warn on slow requests
    if (duration > 1000) {
      logger.warn('Slow API Request', {
        requestId,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
      });
    }
  });

  next();
}

/**
 * Log LLM API calls
 */
export function logLLMCall(params: {
  requestId?: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  duration: number;
  error?: any;
}): void {
  if (params.error) {
    logger.error('LLM Call Failed', {
      requestId: params.requestId,
      provider: params.provider,
      model: params.model,
      duration: `${params.duration}ms`,
      error: {
        message: params.error.message,
        code: params.error.code,
        type: params.error.type,
      },
    });
  } else {
    logger.info('LLM Call Success', {
      requestId: params.requestId,
      provider: params.provider,
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.totalTokens,
      duration: `${params.duration}ms`,
    });
  }
}

/**
 * Log session operations
 */
export function logSessionOperation(operation: string, sessionId: string, details?: any): void {
  logger.info('Session Operation', {
    operation,
    sessionId,
    ...details,
  });
}

/**
 * Sanitize sensitive data before logging
 */
export function sanitizeForLog(data: any, maxLength: number = 200): any {
  if (!data) return data;

  if (typeof data === 'string') {
    return data.length > maxLength ? data.substring(0, maxLength) + '...' : data;
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive fields
      if (['password', 'token', 'apiKey', 'secret'].includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > maxLength) {
        sanitized[key] = value.substring(0, maxLength) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

export default logger;
