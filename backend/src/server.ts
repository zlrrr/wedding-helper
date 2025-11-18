import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat.routes.js';
// import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
// import adminRoutes from './routes/admin.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { optionalAuthenticate, isAuthEnabled } from './middleware/auth.middleware.js';
import logger, { requestLogger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 5001;

// Request logging middleware (before other middleware)
app.use(requestLogger);

// CORS configuration
// Always include localhost for development, plus any configured production URLs
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL || '',
  process.env.CORS_ORIGIN || '',
].filter(origin => origin.length > 0);

// Helper function to check if origin is allowed
const isOriginAllowed = (origin: string): boolean => {
  // Check exact match in allowedOrigins
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // In production, allow Vercel deployments for this project
  if (process.env.NODE_ENV === 'production') {
    // Allow any vercel.app deployment that starts with wedding-helper
    if (origin.includes('wedding-helper') && origin.includes('.vercel.app')) {
      return true;
    }
    // Allow the render backend itself
    if (origin.includes('wedding-helper') && origin.includes('.onrender.com')) {
      return true;
    }
  }

  return false;
};

// IMPORTANT: When credentials: true, we cannot use wildcard '*' origin
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS origin blocked', { origin, allowedOrigins, env: process.env.NODE_ENV });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware with security validation
const SESSION_SECRET = process.env.SESSION_SECRET || (() => {
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultSecret = 'insecure-dev-session-secret-DO-NOT-USE-IN-PRODUCTION';

  if (isProduction) {
    logger.error('CRITICAL SECURITY ERROR: SESSION_SECRET not set in production!');
    throw new Error('SESSION_SECRET environment variable is required in production');
  }

  logger.warn('⚠️  Using default SESSION_SECRET for development. DO NOT use in production!');
  return defaultSecret;
})();

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production with HTTPS
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Optional authentication middleware (doesn't block if no auth configured)
app.use(optionalAuthenticate);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/knowledge', knowledgeRoutes);
// TODO: Add routes as they are implemented
// app.use('/api/admin', adminRoutes);
// app.use('/api/health', healthRoutes);

// Test endpoint (for backward compatibility)
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Root path handler (for health check and general info)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'wedding-helper-backend',
    version: '1.0.0',
    deployed: new Date().toISOString(),
    message: 'Backend service is running',
    endpoints: {
      // health: '/api/health',
      // healthDetailed: '/api/health/detailed',
      // healthLLM: '/api/health/llm',
      // chat: '/api/chat/message',
      auth: '/api/auth/status'
    }
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  const authEnabled = isAuthEnabled();

  logger.info('Server started', {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    authEnabled,
    corsOrigins: allowedOrigins.length > 0 ? allowedOrigins : 'all (not recommended for production)',
  });

  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  // console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
  // console.log(`📊 Detailed health: http://localhost:${PORT}/api/health/detailed`);
  // console.log(`🤖 LLM health: http://localhost:${PORT}/api/health/llm`);

  if (authEnabled) {
    console.log(`⚠️  Authentication is ENABLED`);
  } else {
    console.log(`⚠️  Authentication is DISABLED (set INVITE_CODES or ACCESS_PASSWORD to enable)`);
  }

  // CORS configuration info
  if (allowedOrigins.length > 0) {
    console.log(`🌐 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  } else {
    console.log(`⚠️  CORS: No FRONTEND_URL configured - allowing all origins (set FRONTEND_URL in production!)`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
