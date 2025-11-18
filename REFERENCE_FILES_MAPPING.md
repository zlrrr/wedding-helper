# Reference Project Files Mapping
## Complete File List from "Apologize Is All You Need"

This document provides exact paths and descriptions of all files from the reference project that should be copied or adapted for the wedding-helper project.

---

## Backend Files

### Configuration Files
```
backend/package.json
├── Purpose: npm dependencies and scripts
├── Key Dependencies: 
│   ├── express, cors, express-session
│   ├── jsonwebtoken, bcrypt
│   ├── better-sqlite3
│   ├── axios, winston
│   └── typescript, vitest
└── Action: Copy/Adapt - Update name, version, description

backend/tsconfig.json
├── Purpose: TypeScript configuration
├── Action: Copy directly - No changes needed

backend/vitest.config.ts
├── Purpose: Testing framework configuration
├── Action: Copy directly - No changes needed
```

### Middleware Files (src/middleware/)
```
backend/src/middleware/auth.middleware.ts
├── Lines: 252
├── Key Functions:
│   ├── authenticate() - Strict JWT validation
│   ├── optionalAuthenticate() - Permissive JWT validation
│   ├── requireAdmin() - Admin role check
│   ├── verifyCredentials() - Legacy invite code/password
│   └── generateToken() - JWT token creation
├── Purpose: Authentication and authorization middleware
└── Action: Copy directly - No changes typically needed

backend/src/middleware/error.middleware.ts
├── Purpose: Global error handler and 404 handler
├── Key Functions:
│   ├── errorHandler() - Convert errors to JSON responses
│   └── notFoundHandler() - Handle undefined routes
├── Action: Copy directly - No changes needed

backend/src/middleware/validation.middleware.ts
├── Purpose: Input validation for requests
├── Key Functions:
│   ├── validateChatMessage() - Validate message payload
│   ├── validateSessionId() - Validate UUID format
│   └── (Custom validators for your domain)
├── Action: Copy/Adapt - Add wedding-specific validators

backend/src/middleware/session-authorization.middleware.ts
├── Purpose: Verify session ownership
├── Key Functions:
│   ├── verifySessionOwnership() - Check user access to session
│   └── preventSessionCollision() - Prevent ID conflicts
├── Action: Copy/Adapt - Adapt for wedding data ownership
```

### Service Files (src/services/)
```
backend/src/services/user.service.ts
├── Lines: 437
├── Class: UserService
├── Key Methods:
│   ├── register(data) - User registration with validation
│   ├── login(data) - Login with password verification
│   ├── getUserById(userId) - Retrieve user
│   ├── getAllUsers() - Admin list all users
│   ├── updateUserStatus(userId, isActive) - Enable/disable user
│   ├── changePassword(userId, oldPassword, newPassword)
│   ├── deleteUser(userId) - Soft delete
│   └── getUserStats(userId) - Session and message counts
├── Database: Uses DatabaseService for all queries
├── Purpose: All user management operations
└── Action: Copy directly - No changes needed

backend/src/services/session.service.ts
├── Lines: 300+
├── Class: SessionService
├── Key Methods:
│   ├── getOrCreateSession(sessionId, userId)
│   ├── getMessages(sessionId, userId)
│   ├── addMessage(sessionId, userId, message, tokensUsed)
│   ├── clearSession(sessionId, userId)
│   ├── deleteSession(sessionId, userId)
│   ├── getUserSessions(userId)
│   ├── getSessionCount(userId?)
│   └── getAllSessions()
├── Features:
│   ├── Data isolation (userId checks)
│   ├── Session collision prevention
│   └── Message history management
├── Purpose: Session and conversation management
└── Action: Copy/Adapt - Adapt for wedding data structure (replace sessions with weddings/events)

backend/src/services/llm.service.ts
├── Lines: 550+
├── Class: LLMService
├── Supported Providers:
│   ├── openai (GPT models)
│   ├── anthropic (Claude models)
│   ├── gemini (Google Gemini)
│   ├── lm-studio (Local/free)
│   └── custom (Any OpenAI-compatible)
├── Key Methods:
│   ├── generateApology(params) - Main API for LLM
│   ├── chatCompletion(request) - Provider-agnostic
│   ├── openAIChatCompletion() - OpenAI/LM Studio/Custom
│   ├── anthropicChatCompletion() - Anthropic format
│   ├── geminiChatCompletion() - Gemini format
│   ├── healthCheck() - Provider availability
│   ├── getModels() - List available models
│   └── updateConfig() - Dynamic configuration
├── Features:
│   ├── Format normalization
│   ├── Error handling
│   ├── Token tracking
│   └── Provider-specific headers
├── Purpose: LLM integration (copy if using AI for wedding tasks)
└── Action: Copy/Adapt - Only if using LLM for AI features
```

### Route Files (src/routes/)
```
backend/src/routes/auth.routes.ts
├── Lines: 330
├── Endpoints:
│   ├── POST /api/auth/register - User registration
│   ├── POST /api/auth/login - Login with credentials
│   ├── POST /api/auth/verify - Legacy auth (invite code/password)
│   ├── GET /api/auth/me - Current user info
│   ├── GET /api/auth/status - Auth enabled status
│   ├── POST /api/auth/refresh - Extend token expiry
│   └── POST /api/auth/logout - Client-side logout
├── Middleware: Validates input, uses auth.middleware functions
├── Purpose: All authentication endpoints
└── Action: Copy directly - No changes needed

backend/src/routes/chat.routes.ts
├── Lines: 310
├── Endpoints:
│   ├── POST /api/chat/message - Send message [Auth]
│   ├── GET /api/chat/history - Get conversation [Auth]
│   ├── DELETE /api/chat/history - Clear messages [Auth]
│   ├── DELETE /api/chat/session - Delete session [Auth]
│   └── GET /api/chat/sessions - List sessions [Auth]
├── Features:
│   ├── Session management
│   ├── Message history
│   ├── Data isolation (userId verification)
│   └── Error handling with logging
├── Purpose: Chat API with session management
└── Action: Create similar for wedding.routes.ts

backend/src/routes/admin.routes.ts
├── Lines: 290
├── Endpoints:
│   ├── GET /api/admin/users - List all users [Admin]
│   ├── GET /api/admin/users/:userId - User details [Admin]
│   ├── PATCH /api/admin/users/:userId/status - Enable/disable [Admin]
│   ├── GET /api/admin/sessions - List sessions [Admin]
│   ├── GET /api/admin/sessions/:sessionId - Session details [Admin]
│   └── GET /api/admin/stats - System statistics [Admin]
├── Middleware: authenticate + requireAdmin (enforce both)
├── Features:
│   ├── Cross-user data access
│   ├── User statistics
│   ├── System monitoring
│   └── User management
├── Purpose: Admin panel API
└── Action: Copy/Adapt - Update session endpoints to wedding data

backend/src/routes/health.routes.ts
├── Purpose: Health check endpoints
├── Endpoints:
│   ├── GET /api/health - Basic check
│   ├── GET /api/health/detailed - Detailed info
│   └── GET /api/health/llm - LLM provider status
└── Action: Copy/Adapt - Add wedding-specific health checks
```

### Database Files (src/database/)
```
backend/src/database/database.service.ts
├── Lines: 342
├── Class: DatabaseService
├── Key Methods:
│   ├── initialize() - Create DB, run migrations, create admin
│   ├── query(sql, params) - Get all results
│   ├── queryOne(sql, params) - Get first result
│   ├── execute(sql, params) - INSERT/UPDATE/DELETE
│   ├── transaction(callback) - Multi-statement transaction
│   ├── close() - Graceful shutdown
│   └── isInitialized() - Connection check
├── Features:
│   ├── Singleton pattern
│   ├── Connection pooling
│   ├── SQL parameterization (security)
│   ├── Error logging
│   ├── Auto-migration
│   ├── Default admin creation
│   └── Orphaned data cleanup
├── Purpose: SQLite abstraction layer
└── Action: Copy directly - No changes needed

backend/src/database/schema.sql
├── Tables:
│   ├── users (8 columns + constraints)
│   │   ├── id (PRIMARY KEY AUTO_INCREMENT)
│   │   ├── username (UNIQUE)
│   │   ├── password_hash (bcrypt)
│   │   ├── role (user|admin)
│   │   ├── is_active (boolean for soft delete)
│   │   ├── created_at, updated_at, last_login_at (timestamps)
│   │   └── Constraints: username_length CHECK
│   ├── sessions (5 columns + FK)
│   │   ├── id (TEXT PRIMARY KEY)
│   │   ├── user_id (FK to users)
│   │   ├── title (nullable)
│   │   ├── created_at, updated_at
│   │   └── FK: CASCADE delete on user
│   └── messages (8 columns + FK)
│       ├── id (PRIMARY KEY AUTO_INCREMENT)
│       ├── session_id (FK)
│       ├── user_id (FK)
│       ├── role (user|assistant|system)
│       ├── content, tokens_used
│       ├── created_at
│       └── FKs: CASCADE delete on session/user
├── Indexes:
│   ├── idx_sessions_user_id
│   ├── idx_sessions_updated_at
│   ├── idx_messages_session_id
│   ├── idx_messages_user_id
│   └── idx_messages_created_at
├── Triggers:
│   ├── update_users_timestamp
│   └── update_sessions_timestamp
└── Action: Copy users table, adapt sessions/messages for weddings

backend/src/utils/logger.ts
├── Purpose: Structured logging with Winston
├── Key Functions:
│   ├── logger.info(message, metadata)
│   ├── logger.error(message, { error, ...metadata })
│   ├── logger.warn(message, metadata)
│   ├── logger.debug(message, metadata)
│   └── requestLogger middleware
├── Features:
│   ├── Automatic timestamps
│   ├── Metadata context
│   ├── Request/response logging
│   ├── Error stack traces
│   └── Log level configuration
└── Action: Copy directly - No changes needed

backend/src/types/index.ts
├── Key Types:
│   ├── ChatMessage { role, content }
│   ├── ApologyStyle ('gentle'|'formal'|'empathetic')
│   ├── ApologyRequest { message, style, history, emotion }
│   ├── ApologyResponse { reply, style, emotion, tokensUsed }
│   ├── LLMProvider ('lm-studio'|'openai'|'anthropic'|'gemini'|'custom')
│   ├── LLMConfig { provider, baseURL, apiKey, model, ... }
│   ├── OpenAIChatRequest/Response - API format
│   └── LLMError extends Error
└── Action: Create wedding-specific types

backend/src/server.ts
├── Lines: 175
├── Key Setup:
│   ├── Express app initialization
│   ├── CORS configuration with environment validation
│   ├── Body parsing middleware (json, urlencoded)
│   ├── Session middleware setup
│   ├── Authentication middleware (optional)
│   ├── Route mounting
│   ├── Error handling middleware
│   └── Server startup with logging
├── Features:
│   ├── Dynamic CORS origin checking
│   ├── Session security (httpOnly, sameSite, secure)
│   ├── Environment-based configuration
│   ├── Comprehensive logging
│   └── Graceful shutdown handling
└── Action: Copy/Adapt - Update route imports, adjust CORS
```

### Test Files (tests/)
```
backend/tests/admin-credentials.test.ts
├── Purpose: Test admin credential validation
└── Action: Copy/Adapt

backend/tests/auth.middleware.test.ts
├── Purpose: Test JWT verification and role checking
└── Action: Copy/Adapt

backend/tests/auth.routes.test.ts
├── Purpose: Test auth endpoints
└── Action: Copy/Adapt

backend/tests/llm-integration.test.ts
├── Purpose: Test LLM provider integration
└── Action: Copy only if using LLM

backend/tests/llm.service.test.ts
├── Purpose: Test LLM service
└── Action: Copy only if using LLM

backend/tests/multi-user-integration.test.ts
├── Purpose: Test data isolation between users
├── Key: CRITICAL for multi-user verification
└── Action: Copy/Adapt as data isolation test

backend/tests/session-authorization.test.ts
├── Purpose: Test session ownership verification
└── Action: Copy/Adapt

backend/tests/session-list-isolation.test.ts
├── Purpose: Test that users only see their own sessions
├── Key: CRITICAL for data isolation
└── Action: Copy/Adapt

backend/tests/user.service.test.ts
├── Purpose: Test user service methods
└── Action: Copy/Adapt
```

---

## Frontend Files

### Configuration Files
```
frontend/package.json
├── Purpose: npm dependencies and build scripts
├── Key Dependencies:
│   ├── react, react-dom
│   ├── vite, @vitejs/plugin-react
│   ├── tailwindcss, postcss, autoprefixer
│   ├── axios
│   ├── i18next, react-i18next
│   └── typescript
└── Action: Copy/Adapt - Update name, version

frontend/tsconfig.json
├── Purpose: TypeScript configuration
└── Action: Copy directly

frontend/tsconfig.node.json
├── Purpose: TypeScript config for Vite config file
└── Action: Copy directly

frontend/vite.config.ts
├── Purpose: Vite build and dev configuration
├── Key Settings:
│   ├── React plugin
│   ├── Dev server port: 3000
│   ├── API proxy to localhost:5001
│   └── Build optimization
├── Action: Copy directly - No changes needed for local dev

frontend/tailwind.config.js
├── Purpose: Tailwind CSS configuration
├── Content: src/** paths
└── Action: Copy directly

frontend/postcss.config.js
├── Purpose: PostCSS configuration for Tailwind
└── Action: Copy directly

frontend/.env.example
├── Variables:
│   └── VITE_API_URL=http://localhost:5001
├── Purpose: Environment template
└── Action: Copy/Update for your backend URL
```

### Component Files (src/components/)
```
frontend/src/components/AuthPage.tsx
├── Purpose: Login and registration forms
├── Features:
│   ├── Form validation
│   ├── Error messaging
│   ├── Loading states
│   └── Integrated with AuthContext
└── Action: Copy directly or create wedding-specific version

frontend/src/components/ChatInterface.tsx
├── Purpose: Main chat UI
├── Features:
│   ├── Message display
│   ├── Session management
│   ├── Message input
│   └── Style selection
├── Note: Replace with WeddingDashboard for wedding app
└── Action: Adapt for wedding interface

frontend/src/components/AuthGate.tsx
├── Purpose: Protected route wrapper
├── Logic: Redirect unauthenticated users
└── Action: Copy directly

frontend/src/components/SessionList.tsx
├── Purpose: Sidebar with session list
├── Features:
│   ├── Create new session
│   ├── Switch sessions
│   ├── Delete sessions
│   └── Active session highlighting
├── Note: Replace with EventList for wedding app
└── Action: Adapt for wedding events

frontend/src/components/AdminDashboard.tsx
├── Purpose: Admin panel UI
├── Features:
│   ├── User management
│   ├── Session viewing
│   └── System statistics
└── Action: Copy/Adapt for wedding admin features

frontend/src/components/UserMenu.tsx
├── Purpose: User profile and logout menu
└── Action: Copy directly

frontend/src/components/LanguageSwitcher.tsx
├── Purpose: i18n language selection
└── Action: Copy directly

frontend/src/components/HealthIndicator.tsx
├── Purpose: Backend health status display
└── Action: Copy directly

frontend/src/components/DiagnosticsPanel.tsx
├── Purpose: Debug information panel
└── Action: Copy directly

frontend/src/components/EnvDebug.tsx
├── Purpose: Display environment variables (dev only)
└── Action: Copy directly

frontend/src/components/ApologyCharacter.tsx
├── Purpose: Animated character (wedding-specific)
├── Note: Replace with appropriate wedding graphic
└── Action: Create new for wedding app
```

### Context Files (src/contexts/)
```
frontend/src/contexts/AuthContext.tsx
├── Lines: 156
├── Purpose: Global authentication state
├── Provides:
│   ├── user (User | null)
│   ├── isAuthenticated (boolean)
│   ├── isLoading (boolean)
│   ├── login() - async function
│   ├── register() - async function
│   ├── logout() - function
│   └── isAdmin (boolean)
├── Storage:
│   ├── auth_token in localStorage
│   ├── auth_expiry timestamp
│   └── Auto-restores on mount
├── Features:
│   ├── Token expiry checking
│   ├── API token header management
│   ├── Auto-logout on expiry
│   └── Session cleanup on logout
└── Action: Copy directly - No changes needed
```

### Service Files (src/services/)
```
frontend/src/services/api.ts
├── Lines: 353
├── Purpose: Axios HTTP client with interceptors
├── Key Functions:
│   ├── sendMessage(request) - POST /api/chat/message
│   ├── getHistory(sessionId) - GET /api/chat/history
│   ├── clearHistory(sessionId) - DELETE /api/chat/history
│   ├── deleteSession(sessionId) - DELETE /api/chat/session
│   ├── checkHealth() - GET /api/health
│   ├── checkDetailedHealth() - GET /api/health/detailed
│   ├── checkLLMHealth() - GET /api/health/llm
│   ├── register(data) - POST /api/auth/register
│   ├── login(data) - POST /api/auth/login
│   ├── getCurrentUser() - GET /api/auth/me
│   ├── refreshToken() - POST /api/auth/refresh
│   ├── logout() - POST /api/auth/logout
│   ├── setAuthToken(token) - Update auth header
│   └── getErrorMessage(error) - User-friendly errors
├── Features:
│   ├── Request/response logging
│   ├── Request timing
│   ├── Error handling
│   ├── Authentication header injection
│   └── Type safety with TypeScript
├── Error Handling:
│   ├── Network errors
│   ├── Timeout errors
│   ├── HTTP status codes (400-504)
│   └── User-friendly Chinese error messages
└── Action: Copy/Adapt - Add wedding-specific endpoints

frontend/src/services/adminApi.ts
├── Purpose: Admin-specific API calls
├── Key Functions:
│   ├── getAllUsers() - GET /api/admin/users
│   ├── getUser(userId) - GET /api/admin/users/:userId
│   ├── updateUserStatus() - PATCH /api/admin/users/:userId/status
│   ├── getAllSessions() - GET /api/admin/sessions
│   ├── getSession(sessionId) - GET /api/admin/sessions/:sessionId
│   └── getStats() - GET /api/admin/stats
└── Action: Copy/Adapt for wedding admin features

frontend/src/services/weddingApi.ts (NEW)
├── Purpose: Wedding-specific API calls
├── Key Functions:
│   ├── getWeddings(userId)
│   ├── createWedding(data)
│   ├── updateWedding(weddingId, data)
│   ├── deleteWedding(weddingId)
│   ├── getGuests(weddingId)
│   ├── addGuest(weddingId, guestData)
│   ├── updateGuest(guestId, data)
│   └── deleteGuest(guestId)
└── Action: Create new for wedding features
```

### Type Files (src/types/)
```
frontend/src/types/index.ts
├── Key Types:
│   ├── SendMessageRequest
│   ├── SendMessageResponse
│   ├── HistoryResponse
│   ├── SessionInfo
│   └── Custom types for your domain
└── Action: Create wedding-specific types
```

### Utility Files (src/utils/)
```
frontend/src/utils/logger.ts
├── Purpose: Client-side logging
├── Key Functions:
│   ├── logApiRequest()
│   ├── logApiResponse()
│   ├── logApiError()
│   ├── info(), warn(), error(), debug()
└── Action: Copy directly

frontend/src/utils/storage.ts
├── Purpose: localStorage utilities with encryption (optional)
├── Key Functions:
│   ├── getSessionData()
│   ├── setSessionData()
│   ├── clearAllSessionData()
│   └── Storage helpers
└── Action: Copy/Adapt

frontend/src/utils/debounce.ts
├── Purpose: Debounce utility for event handlers
└── Action: Copy directly
```

### i18n Files (src/i18n/)
```
frontend/src/i18n/config.ts
├── Purpose: i18next configuration
├── Features:
│   ├── Auto language detection
│   ├── Translation loading
│   └── Language persistence
└── Action: Copy directly

frontend/src/i18n/locales/en.json
├── Purpose: English translations
└── Action: Copy/Adapt with wedding content

frontend/src/i18n/locales/zh.json
├── Purpose: Chinese translations
└── Action: Copy/Adapt with wedding content
```

### Main App Files
```
frontend/src/App.tsx
├── Lines: 38
├── Purpose: Main app routing logic
├── Logic:
│   ├── Show loading state
│   ├── Show auth page if not authenticated
│   └── Show main app if authenticated
├── Features:
│   ├── i18n integration
│   ├── Auth context usage
│   └── Page title updates
└── Action: Copy/Adapt - Update component imports

frontend/src/main.tsx
├── Purpose: React app entry point
├── Setup:
│   ├── React 18 createRoot
│   ├── AuthProvider wrapper
│   ├── App component
│   └── i18n initialization
└── Action: Copy directly

frontend/src/vite-env.d.ts
├── Purpose: Vite environment variable types
└── Action: Copy directly

frontend/src/index.css
├── Purpose: Global styles
├── Content:
│   ├── Tailwind imports
│   └── Custom CSS
└── Action: Copy/Create with your styles
```

---

## Root Configuration Files

### vercel.json
```
Purpose: Vercel deployment configuration
Key Settings:
├── name: apologize-frontend
├── buildCommand: cd frontend && npm install && npm run build
├── outputDirectory: frontend/dist
├── framework: vite
├── devCommand: cd frontend && npm run dev
├── rewrites: /(.*) → /index.html (SPA routing)
└── headers: Security headers
Action: Copy/Adapt - Update paths, name, environment variables
```

### .env.example (Root)
```
Purpose: Environment variables template at root
Action: Copy/Create with your configuration
```

### backend/.env.example
```
Key Variables:
├── BACKEND_PORT=5001
├── NODE_ENV=production
├── SESSION_SECRET=<required>
├── JWT_SECRET=<required>
├── FRONTEND_URL=<for-CORS>
├── DEFAULT_ADMIN_USERNAME=admin
├── DEFAULT_ADMIN_PASSWORD=
├── LLM_PROVIDER=lm-studio|openai|anthropic|gemini|custom
├── LLM_TEMPERATURE=0.7
├── LLM_MAX_TOKENS=2000
└── LOG_LEVEL=info
Action: Copy/Create with your values
```

### frontend/.env.example
```
Key Variables:
└── VITE_API_URL=http://localhost:5001
Action: Copy/Create with your backend URL
```

### package.json (Root - Monorepo)
```
Purpose: Root package.json for monorepo scripts
Key Scripts:
├── install:all - npm install in both directories
├── dev:frontend - Start frontend dev server
├── dev:backend - Start backend dev server
├── build:all - Build both parts
└── test:all - Run tests for both parts
Action: Create if using monorepo structure
```

---

## Summary Statistics

### Total Files to Copy/Adapt
- **Direct Copy (No Changes)**: 20+ files
- **Copy/Adapt (Minor Changes)**: 25+ files
- **New Creation (Domain-Specific)**: 15+ files
- **Total**: 60+ files

### Lines of Code by Component
- **Backend Services**: 1,500+ lines
- **Backend Middleware/Routes**: 1,200+ lines
- **Backend Database**: 400+ lines
- **Frontend Services/Context**: 600+ lines
- **Frontend Components**: 2,000+ lines
- **Configuration**: 200+ lines

### Key Dependencies
**Backend**:
- express.js
- jsonwebtoken
- bcrypt
- better-sqlite3
- axios
- winston
- cors
- express-session

**Frontend**:
- react
- vite
- axios
- tailwindcss
- i18next
- typescript

---

## Copy Strategy

### Step 1: Infrastructure (Copy Directly)
1. TypeScript configs
2. Testing configs
3. Build tool configs (Vite, Tailwind)
4. Logger utilities
5. Database service

### Step 2: Authentication (Copy/Adapt)
1. Auth middleware
2. Auth routes
3. User service
4. AuthContext
5. Auth API client

### Step 3: Core Features (Copy/Adapt)
1. Error middleware
2. Validation middleware
3. Health routes
4. Session service
5. Session routes

### Step 4: Admin (Copy/Adapt)
1. Admin routes
2. Admin API client
3. Admin dashboard component

### Step 5: Domain-Specific (Create New)
1. Wedding service
2. Guest service
3. Wedding routes
4. Wedding components
5. Wedding types
6. Wedding database schema

### Step 6: Deployment (Copy/Adapt)
1. vercel.json
2. Environment files
3. Package.json files

---

## File Dependencies

```
server.ts depends on:
├── routes/* (all route files)
├── middleware/* (all middleware)
├── services/* (all services)
└── utils/logger.ts

routes/* depend on:
├── middleware/auth.middleware.ts
├── middleware/validation.middleware.ts
├── services/*
└── types/index.ts

services/* depend on:
├── database/database.service.ts
├── utils/logger.ts
└── types/index.ts

frontend/App.tsx depends on:
├── contexts/AuthContext.tsx
└── components/*

components/* depend on:
├── services/api.ts
├── services/adminApi.ts
├── contexts/AuthContext.tsx
└── utils/*
```

