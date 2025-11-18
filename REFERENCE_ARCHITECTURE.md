# Reference Project Architecture Analysis
## "Apologize Is All You Need" - Complete Architecture Guide

---

## 1. PROJECT OVERVIEW

**Repository**: https://github.com/zlrrr/apologize-is-all-you-need.git  
**Project Type**: Full-stack monorepo with separate frontend (Vercel) and backend (Render) deployments  
**Tech Stack**: TypeScript, React 18, Express.js, SQLite, Vite  
**Status**: MVP Complete (v0.1.0)  

---

## 2. HIGH-LEVEL ARCHITECTURE

```
apologize-is-all-you-need/
├── frontend/                    # React + Vite (deployed to Vercel)
│   ├── src/
│   │   ├── components/         # React UI components
│   │   ├── services/           # API client services
│   │   ├── contexts/           # Auth context (React Context API)
│   │   ├── i18n/               # i18next internationalization
│   │   ├── types/              # TypeScript interfaces
│   │   ├── utils/              # Utilities (logger, storage)
│   │   └── App.tsx             # Main app component
│   ├── vite.config.ts          # Vite configuration with proxy
│   └── package.json
│
├── backend/                     # Express.js (deployed to Render)
│   ├── src/
│   │   ├── routes/             # API endpoints
│   │   ├── services/           # Business logic (LLM, Session, User)
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── database/           # SQLite database service + schema
│   │   ├── prompts/            # System prompts for LLM
│   │   ├── utils/              # Logger, utilities
│   │   ├── types/              # TypeScript interfaces
│   │   └── server.ts           # Express app setup
│   ├── tests/                  # Vitest unit tests
│   ├── package.json
│   └── tsconfig.json
│
├── vercel.json                 # Vercel deployment config
├── .env.example               # Root environment template
├── backend/.env.example       # Backend environment template
├── frontend/.env.example      # Frontend environment template
└── README.md                  # Project documentation
```

---

## 3. TECHNOLOGY STACK

### Frontend
- **Framework**: React 18.2.0 + TypeScript 5.3.3
- **Build Tool**: Vite 5.0.8
- **Styling**: Tailwind CSS 3.4.0
- **HTTP Client**: Axios 1.6.2
- **State Management**: React Context API + localStorage
- **Internationalization**: i18next 25.6.2
- **Testing**: Vitest 1.0.4

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.2 + TypeScript 5.3.3
- **Database**: SQLite 3 (better-sqlite3 12.4.1)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcrypt 6.0.0
- **Session Management**: express-session 1.17.3
- **HTTP Client**: Axios 1.6.2
- **Logging**: Winston 3.18.3
- **Testing**: Vitest 1.0.4, Supertest 7.1.4

### Deployment
- **Frontend**: Vercel (CI/CD enabled)
- **Backend**: Render (Docker-based)

---

## 4. CORE ARCHITECTURE PATTERNS

### 4.1 Authentication & Authorization

#### JWT-Based Authentication
```
Flow: Login → JWT Token → Stored in localStorage → Attached to API requests

Auth Middleware Stack:
1. authenticate() - Strict auth (blocks if no token)
2. optionalAuthenticate() - Permissive auth (continues without token)
3. requireAdmin() - Admin-only routes (must be used after authenticate)

Token Structure:
{
  userId: number,
  username: string,
  role: 'user' | 'admin',
  timestamp: number
}

Expiry: 7 days
```

#### User Model (SQLite)
```sql
users:
  - id (INTEGER PRIMARY KEY)
  - username (TEXT UNIQUE, 3-50 chars)
  - password_hash (bcrypt with 10 salt rounds)
  - role ('user' | 'admin')
  - is_active (boolean, soft delete)
  - created_at, updated_at, last_login_at (timestamps)
```

#### Data Isolation
- Each user can only access their own sessions
- Admin users can access any user's data
- Session ownership verified at route level
- Collision prevention for session IDs across users

**Key Files:**
- `/backend/src/middleware/auth.middleware.ts` - Auth functions
- `/backend/src/middleware/session-authorization.middleware.ts` - Session verification
- `/backend/src/services/user.service.ts` - User management
- `/frontend/src/contexts/AuthContext.tsx` - Frontend auth state

---

### 4.2 Admin User Management System

#### Default Admin Creation
```bash
Environment Variables:
- DEFAULT_ADMIN_USERNAME=admin          (required to create admin)
- DEFAULT_ADMIN_PASSWORD=               (auto-generates if empty)
- JWT_SECRET=your-secret                (required in production)
```

#### Admin Routes (Protected)
```
GET    /api/admin/users                  - List all users
GET    /api/admin/users/:userId          - Get user details with stats
PATCH  /api/admin/users/:userId/status   - Enable/disable user
GET    /api/admin/sessions               - List sessions (optionally filtered by userId)
GET    /api/admin/sessions/:sessionId    - Get session with full message history
GET    /api/admin/stats                  - System statistics
```

**Admin Capabilities:**
- View all users and sessions
- Disable/enable user accounts
- View user statistics (session count, message count, activity dates)
- Access any user's conversation history
- View system-wide statistics

**Key Files:**
- `/backend/src/routes/admin.routes.ts` - Admin API endpoints
- `/backend/src/database/database.service.ts` - Admin user creation logic (lines 82-144)
- `/frontend/src/components/AdminDashboard.tsx` - Admin UI
- `/frontend/src/services/adminApi.ts` - Admin API client

---

### 4.3 LLM Integration Architecture

#### Multi-Provider Support
```
Supported Providers:
1. lm-studio (local, free, default)
2. openai (gpt-4o-mini, gpt-4, etc)
3. anthropic (claude-3-5-sonnet, etc)
4. gemini (1.5-flash, etc)
5. custom (any OpenAI-compatible API)

Configuration:
Environment variables configure provider and credentials
Dynamic switching supported via API

Class: LLMService (singleton pattern)
- Constructor auto-detects provider
- Normalizes all responses to OpenAI format
- Error handling with detailed logging
```

#### Provider-Specific Implementation
```typescript
// OpenAI-compatible (LM Studio, OpenAI, Custom)
POST /v1/chat/completions

// Anthropic-specific
POST /messages
- Separate system message handling
- Response format conversion

// Gemini-specific
POST /models/{model}:generateContent
- API key as query parameter
- Special handling for safety ratings
- Tracking of internal reasoning tokens
```

#### Prompt System
```
System Prompts by Style:
1. Gentle - Warm, caring, friend-like tone
2. Formal - Professional, respectful, maintaining distance
3. Empathetic - Deep understanding, strong emotional resonance

Emotion Detection:
- Simple keyword-based detection (Chinese keywords)
- Returns: 'tired', 'annoyed', 'sad', 'angry', etc.

System Prompt Format:
- Base prompt with core instructions
- Style-specific modifications
- Token limits and format requirements
```

**Key Files:**
- `/backend/src/services/llm.service.ts` - LLM service (550+ lines, multi-provider)
- `/backend/src/prompts/apology.prompts.ts` - System prompts and emotion detection
- `/backend/src/routes/chat.routes.ts` - Chat API endpoints
- `/frontend/src/services/api.ts` - Frontend LLM API wrapper

---

### 4.4 Session Management

#### Session Model
```
Database Structure:
sessions:
  - id (UUID, PRIMARY KEY)
  - user_id (FK to users)
  - title (nullable)
  - created_at, updated_at (timestamps)

messages:
  - id (INTEGER PRIMARY KEY)
  - session_id (FK)
  - user_id (FK)
  - role ('user' | 'assistant' | 'system')
  - content (message text)
  - tokens_used (for tracking)
  - created_at (timestamp)

Indexes:
- idx_sessions_user_id
- idx_messages_session_id, idx_messages_user_id, idx_messages_created_at
```

#### Session Operations
```
API Endpoints:
POST   /api/chat/message          - Send message, create session if needed
GET    /api/chat/history          - Get session conversation history
DELETE /api/chat/history          - Clear session messages
DELETE /api/chat/session          - Delete entire session
GET    /api/chat/sessions         - List all user's sessions

Features:
- Auto-create sessions on first message
- Session ownership verification
- Context window limiting (last 10 messages)
- Session title generation from first user message
```

**Key Files:**
- `/backend/src/services/session.service.ts` - Session management logic
- `/backend/src/routes/chat.routes.ts` - Chat API endpoints

---

### 4.5 Database Architecture

#### SQLite Database Service
```typescript
Class: DatabaseService
- Singleton pattern
- Connection pooling via better-sqlite3
- Transaction support
- Migration system via schema.sql

Methods:
- initialize() - Schema creation, default admin creation
- query(), queryOne(), execute() - CRUD operations
- transaction() - Multi-statement transactions
- close() - Graceful shutdown
```

#### Schema Features
- Foreign key constraints enabled
- CASCADE delete for data cleanup
- AUTO_INCREMENT for IDs
- UNIQUE constraints (e.g., username)
- CHECK constraints (e.g., role enum)
- Triggers for auto-updating timestamps
- Named indexes for query optimization

#### Default Data
```
Auto-created on initialization:
1. Default admin user (if DEFAULT_ADMIN_USERNAME env var set)
2. Orphaned session migration (reassigns to admin if user deleted)
```

**Key Files:**
- `/backend/src/database/database.service.ts` - Database service class
- `/backend/src/database/schema.sql` - SQLite schema

---

## 5. API ARCHITECTURE

### 5.1 API Routes Structure

```
/api/auth/
  POST   /register         - User registration
  POST   /login           - User login
  POST   /verify          - Legacy auth (invite code/password)
  GET    /me              - Get current user
  GET    /status          - Check if auth enabled
  POST   /refresh         - Refresh JWT token
  POST   /logout          - Logout (client-side token deletion)

/api/chat/
  POST   /message         - Send message & get response [Auth Required]
  GET    /history         - Get session history [Auth Required]
  DELETE /history         - Clear session [Auth Required]
  DELETE /session         - Delete session [Auth Required]
  GET    /sessions        - List user's sessions [Auth Required]

/api/admin/
  GET    /users           - List all users [Admin Required]
  GET    /users/:userId   - Get user details [Admin Required]
  PATCH  /users/:userId/status - Enable/disable user [Admin Required]
  GET    /sessions        - List sessions [Admin Required]
  GET    /sessions/:sessionId - Get session details [Admin Required]
  GET    /stats           - System statistics [Admin Required]

/api/health/
  GET    /                - Basic health check
  GET    /detailed        - Detailed health info
  GET    /llm             - LLM provider status

Root:
  GET    /                - Service info (for Render health check)
  GET    /api/test        - Test endpoint
```

### 5.2 Error Handling

#### Middleware Stack
1. Request logging (Winston logger)
2. CORS validation
3. Body parsing (JSON, URL-encoded)
4. Session middleware
5. Authentication (optional or required)
6. Request validation
7. Route handlers
8. Error handling middleware

#### Error Response Format
```json
{
  "error": "ErrorType",
  "message": "Human-readable message",
  "statusCode": 400
}
```

**Key Files:**
- `/backend/src/middleware/error.middleware.ts` - Global error handler
- `/backend/src/middleware/validation.middleware.ts` - Input validation

---

## 6. FRONTEND ARCHITECTURE

### 6.1 Component Structure

```
src/components/
├── ChatInterface.tsx        - Main chat UI with message display
├── AuthPage.tsx             - Login/register forms
├── AuthGate.tsx             - Protected route wrapper
├── SessionList.tsx          - Session management sidebar
├── InputBox.tsx             - Message input with send button
├── MessageBubble.tsx        - Individual message display
├── ApologyCharacter.tsx      - Animated character
├── AdminDashboard.tsx        - Admin user/session management
├── UserMenu.tsx             - User profile menu
├── LanguageSwitcher.tsx      - i18n language selector
├── HealthIndicator.tsx       - Backend health status
├── DiagnosticsPanel.tsx      - Debug information
└── EnvDebug.tsx             - Environment variables display
```

### 6.2 State Management

#### Authentication State (React Context)
```typescript
AuthContext provides:
- user: User | null
- isAuthenticated: boolean
- isLoading: boolean
- login(username, password): Promise<void>
- register(username, password): Promise<void>
- logout(): void
- isAdmin: boolean

Token Storage:
- auth_token (JWT)
- auth_expiry (timestamp)
```

#### Local Storage Structure
```
auth_token          - JWT for API requests
auth_expiry         - Token expiration timestamp
sessions            - Cached session list
currentSessionId    - Active session ID
sessionMessages     - Cached messages per session
```

### 6.3 API Client Setup

```typescript
// Axios instance with interceptors
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  timeout: 30000,
})

// Request Interceptor
- Log requests with timing
- Add auth token to headers

// Response Interceptor
- Log responses with duration
- Handle errors with user-friendly messages
- Type conversion
```

**Key Files:**
- `/frontend/src/services/api.ts` - API client (350+ lines)
- `/frontend/src/services/adminApi.ts` - Admin-specific API client
- `/frontend/src/contexts/AuthContext.tsx` - Auth state management

---

## 7. INTERNATIONALIZATION (i18n)

### Implementation
```
Library: i18next + react-i18next + i18next-browser-languagedetector

Features:
- Auto-detect user's browser language
- Runtime language switching
- Translation files in src/i18n/locales/

Supported Languages:
- English (en.json)
- Chinese (zh.json)

Usage:
const { t, i18n } = useTranslation()
t('key.path')  // Get translation
i18n.changeLanguage('zh')  // Switch language
```

**Key Files:**
- `/frontend/src/i18n/config.ts` - i18n configuration
- `/frontend/src/i18n/locales/*.json` - Translation files

---

## 8. DEPLOYMENT CONFIGURATION

### 8.1 Frontend Deployment (Vercel)

**Configuration File: `vercel.json`**
```json
{
  "version": 2,
  "name": "apologize-frontend",
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite",
  "devCommand": "cd frontend && npm run dev",
  "rewrites": [{
    "source": "/(.*)",
    "destination": "/index.html"  // SPA routing
  }],
  "headers": [
    // Security headers
    "X-Content-Type-Options: nosniff",
    "X-Frame-Options: DENY",
    "X-XSS-Protection: 1; mode=block"
  ]
}
```

**Vite Configuration:**
```typescript
// Development proxy for local testing
proxy: {
  '/api': {
    target: 'http://localhost:5001',
    changeOrigin: true,
  }
}
```

**Environment Variables:**
```
VITE_API_URL=https://your-backend.onrender.com
```

### 8.2 Backend Deployment (Render)

**Docker Support**: Backend is containerized  
**Build Command**: `npm run build`  
**Start Command**: `npm start`  

**Environment Variables (Required in production):**
```
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
SESSION_SECRET=<strong-random-secret>
FRONTEND_URL=https://your-frontend.vercel.app
VITE_API_URL=https://your-backend.onrender.com
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=<secure-password>
LLM_PROVIDER=openai (or your choice)
OPENAI_API_KEY=<your-api-key>
```

---

## 9. SECURITY FEATURES

### 9.1 Authentication Security
- JWT with 7-day expiry
- bcrypt password hashing (10 salt rounds)
- Password validation (6-128 characters)
- Soft user deletion (is_active flag)
- Account disable/enable functionality

### 9.2 Authorization
- Role-based access control (user/admin)
- Session ownership verification
- Admin-only routes with middleware
- Cross-origin session isolation

### 9.3 API Security
```
CORS Configuration:
- Configurable allowed origins
- Credentials support
- Environment-based origin lists
- Localhost always allowed in development

HTTP Headers:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block

Validation:
- Input sanitization
- Message length validation
- Session ID validation
- Type checking with TypeScript
```

### 9.4 Data Protection
```
Database Level:
- SQLite encryption-at-rest (with setup)
- Foreign key constraints
- Cascade delete for orphaned data
- Indexed queries for performance

Application Level:
- Password hashing with bcrypt
- JWT secret configuration
- Secure session cookies (httpOnly, secure, sameSite)
- SQL injection prevention (parameterized queries)
```

---

## 10. LOGGING & MONITORING

### Winston Logger Setup
```
Log Levels: error, warn, info, http, debug
Transports: Console output with formatting
Metadata: Timestamps, request IDs, user info

LLM Logging:
- [LLM-001] Starting apology generation
- [LLM-002] Emotion detected
- [LLM-003] Calling LLM API
- [LLM-004] LLM API call successful
- [LLM-ERROR] Detailed error information

Chat Logging:
- [CHAT-001] Processing chat message
- [CHAT-002] Retrieved conversation history
- [CHAT-003] Calling LLM service
- [CHAT-004] LLM response received
- [CHAT-005] Session updated successfully
- [CHAT-006] Chat request completed
```

**Key Files:**
- `/backend/src/utils/logger.ts` - Logger setup and utilities
- `/frontend/src/utils/logger.ts` - Frontend logger

---

## 11. TESTING STRATEGY

### Backend Tests
```
Tools: Vitest + Supertest

Test Files (14 tests):
- admin-credentials.test.ts
- auth.middleware.test.ts
- auth.routes.test.ts
- llm-integration.test.ts
- llm.service.test.ts
- multi-user-integration.test.ts
- session-authorization.test.ts
- session-list-isolation.test.ts
- user.service.test.ts

Run: npm run test
Watch: npm run test:watch
```

### Frontend Tests
```
Tools: Vitest

Test Files:
- storage.test.ts
- API integration tests
- Component tests (optional)

Run: npm run test
Watch: npm run test:watch
```

---

## 12. ENVIRONMENT VARIABLES REFERENCE

### Backend (.env)
```
# Server
BACKEND_PORT=5001
NODE_ENV=production
SESSION_SECRET=<required-in-prod>
JWT_SECRET=<required-in-prod>

# CORS
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGIN=https://your-frontend.vercel.app

# LLM Configuration
LLM_PROVIDER=openai|anthropic|gemini|lm-studio|custom
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000

# Database
# (SQLite uses data/apologize.db by default)

# Admin
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=<secure-password>

# Logging
LOG_LEVEL=info
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend.onrender.com
```

---

## 13. KEY IMPLEMENTATION PATTERNS

### 13.1 Singleton Pattern
```typescript
// Database
export const db = new DatabaseService();
db.initialize();  // Called on module load

// LLM Service
export const llmService = new LLMService();

// User Service
export const userService = new UserService();

// Session Service
export const sessionService = new SessionService();
```

### 13.2 Dependency Injection
```typescript
constructor(dbService?: DatabaseService) {
  this.db = dbService || db;  // Default to singleton, allow override
}
```

### 13.3 Error Handling Pattern
```typescript
try {
  // Operation
  logger.info('Success event', { metadata });
} catch (error) {
  logger.error('Failure event', {
    error,
    userId: req.user?.userId,
  });
  res.status(status).json({ error: 'Error type', message: 'User message' });
}
```

### 13.4 Middleware Chain Pattern
```
Express Middleware Order:
1. Logging (requestLogger)
2. CORS (cors)
3. Body parsing (json, urlencoded)
4. Sessions (express-session)
5. Optional/Required Auth
6. Route handlers
7. Error handler (notFoundHandler, errorHandler)
```

---

## 14. CRITICAL FILES & PURPOSES

| File | Purpose | Lines |
|------|---------|-------|
| `/backend/src/server.ts` | Express app setup, middleware stack, CORS config | 175 |
| `/backend/src/services/llm.service.ts` | Multi-provider LLM integration | 550+ |
| `/backend/src/services/session.service.ts` | Session CRUD with data isolation | 300+ |
| `/backend/src/services/user.service.ts` | User auth, registration, password mgmt | 437 |
| `/backend/src/middleware/auth.middleware.ts` | JWT verification, role checking | 252 |
| `/backend/src/routes/auth.routes.ts` | Auth endpoints (login, register, refresh) | 330 |
| `/backend/src/routes/admin.routes.ts` | Admin user/session management | 290 |
| `/backend/src/routes/chat.routes.ts` | Chat API with session management | 310 |
| `/backend/src/database/database.service.ts` | SQLite abstraction, migrations | 342 |
| `/backend/src/database/schema.sql` | Database schema with constraints | 80 |
| `/backend/src/prompts/apology.prompts.ts` | System prompts and emotion detection | 112 |
| `/frontend/src/services/api.ts` | Axios client with interceptors | 353 |
| `/frontend/src/contexts/AuthContext.tsx` | React authentication state | 156 |
| `/frontend/src/App.tsx` | Main app routing logic | 38 |
| `/frontend/src/components/ChatInterface.tsx` | Main chat UI | Variable |
| `/vercel.json` | Frontend deployment config | 35 |
| `backend/package.json` | Backend dependencies | 40 |
| `frontend/package.json` | Frontend dependencies | 34 |

---

## 15. RECOMMENDED PATTERNS TO REPLICATE

For the **wedding-helper** project, replicate these patterns:

1. **Authentication**: JWT + bcrypt + React Context
2. **Data Isolation**: Verify ownership at route level
3. **Database**: SQLite with schema migrations
4. **Error Handling**: Winston logger with metadata
5. **API Structure**: RESTful routes with consistent naming
6. **Frontend State**: React Context for auth, localStorage for cache
7. **Environment Config**: Flexible .env setup with validation
8. **Validation**: Input validation middleware
9. **Testing**: Vitest for both backend and frontend
10. **Deployment**: Separate Vercel (frontend) and Render (backend)
11. **Logging**: Structured logging with request IDs
12. **Admin Features**: Role-based access control with middleware
13. **Multi-user**: Built-in data isolation from day one
14. **Security**: CORS, headers, secure cookies, parameterized queries

---

## 16. QUICK START COMMANDS

```bash
# Local Development
npm run install:all
cp .env.example .env
./scripts/start.sh

# Backend Only
cd backend
npm install
npm run dev    # With tsx watch

# Frontend Only
cd frontend
npm install
npm run dev    # Vite dev server on :3000

# Build for Production
cd backend && npm run build
cd frontend && npm run build

# Testing
cd backend && npm run test
cd frontend && npm run test

# Deployment
# Frontend: Push to GitHub, auto-deploy to Vercel
# Backend: Push to GitHub, auto-deploy to Render
```

