# Wedding Helper - Implementation Checklist
## Using Reference Architecture from "Apologize Is All You Need"

---

## Phase 1: Project Structure Setup

### Create Directory Structure
```bash
wedding-helper/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── wedding.routes.ts (domain-specific)
│   │   │   ├── guest.routes.ts (domain-specific)
│   │   │   ├── admin.routes.ts
│   │   │   └── health.routes.ts
│   │   ├── services/
│   │   │   ├── user.service.ts (copy from reference)
│   │   │   ├── session.service.ts (copy/adapt)
│   │   │   ├── wedding.service.ts (NEW)
│   │   │   ├── guest.service.ts (NEW)
│   │   │   └── llm.service.ts (copy if using AI)
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts (copy from reference)
│   │   │   ├── error.middleware.ts (copy from reference)
│   │   │   ├── validation.middleware.ts (copy/adapt)
│   │   │   └── session-authorization.middleware.ts (copy/adapt)
│   │   ├── database/
│   │   │   ├── database.service.ts (copy from reference)
│   │   │   └── schema.sql (NEW - wedding-specific schema)
│   │   ├── utils/
│   │   │   └── logger.ts (copy from reference)
│   │   ├── types/
│   │   │   └── index.ts (NEW - wedding types)
│   │   └── server.ts (copy/adapt from reference)
│   ├── tests/
│   │   ├── auth.test.ts (copy/adapt)
│   │   ├── user.service.test.ts (copy/adapt)
│   │   └── wedding.service.test.ts (NEW)
│   ├── package.json (copy/adapt)
│   ├── tsconfig.json (copy)
│   └── vitest.config.ts (copy)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthPage.tsx (copy from reference)
│   │   │   ├── ChatInterface.tsx → WeddingDashboard.tsx (adapt)
│   │   │   ├── SessionList.tsx → EventList.tsx (adapt)
│   │   │   ├── AdminDashboard.tsx (copy/adapt)
│   │   │   ├── UserMenu.tsx (copy)
│   │   │   └── [wedding-specific components]
│   │   ├── services/
│   │   │   ├── api.ts (copy/adapt)
│   │   │   ├── adminApi.ts (copy/adapt)
│   │   │   └── weddingApi.ts (NEW)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx (copy from reference)
│   │   ├── types/
│   │   │   └── index.ts (NEW)
│   │   ├── utils/
│   │   │   ├── logger.ts (copy)
│   │   │   └── storage.ts (copy)
│   │   ├── i18n/
│   │   │   ├── config.ts (copy)
│   │   │   └── locales/ (NEW - wedding content)
│   │   ├── App.tsx (copy/adapt)
│   │   └── main.tsx (copy)
│   ├── vite.config.ts (copy)
│   ├── tailwind.config.js (copy)
│   ├── postcss.config.js (copy)
│   └── package.json (copy/adapt)
│
├── vercel.json (copy/adapt)
├── .env.example (NEW)
├── backend/.env.example (NEW)
├── frontend/.env.example (NEW)
├── REFERENCE_ARCHITECTURE.md (included)
└── README.md (NEW)
```

### Files to Copy Directly (No Changes)
- [ ] `/backend/tsconfig.json`
- [ ] `/backend/vitest.config.ts`
- [ ] `/backend/src/utils/logger.ts`
- [ ] `/backend/src/middleware/error.middleware.ts`
- [ ] `/backend/src/database/database.service.ts`
- [ ] `/frontend/tsconfig.json`
- [ ] `/frontend/tsconfig.node.json`
- [ ] `/frontend/vite.config.ts`
- [ ] `/frontend/tailwind.config.js`
- [ ] `/frontend/postcss.config.js`
- [ ] `/frontend/src/utils/logger.ts`
- [ ] `/frontend/src/utils/storage.ts`
- [ ] `/frontend/src/main.tsx`

### Files to Copy and Adapt (Minor Changes)
- [ ] `/backend/src/middleware/auth.middleware.ts` - No changes typically needed
- [ ] `/backend/src/middleware/validation.middleware.ts` - Add wedding-specific validators
- [ ] `/backend/src/routes/auth.routes.ts` - No changes typically needed
- [ ] `/backend/src/services/user.service.ts` - No changes typically needed
- [ ] `/backend/src/server.ts` - Update route imports, adjust CORS if needed
- [ ] `/backend/package.json` - Update name, version, dependencies
- [ ] `/frontend/src/contexts/AuthContext.tsx` - No changes typically needed
- [ ] `/frontend/src/services/api.ts` - Add wedding-specific endpoints
- [ ] `/frontend/src/App.tsx` - Update component imports
- [ ] `/frontend/package.json` - Update name, version, dependencies

---

## Phase 2: Authentication & User Management

### Backend Setup
- [ ] Copy `auth.middleware.ts` - handles JWT, roles, admin checks
- [ ] Copy `user.service.ts` - handles registration, login, password management
- [ ] Copy `auth.routes.ts` - endpoints for register, login, refresh, logout
- [ ] Create admin setup script or use DEFAULT_ADMIN_USERNAME env var
- [ ] Update `.env.example` with:
  ```
  JWT_SECRET=<required-in-production>
  SESSION_SECRET=<required-in-production>
  DEFAULT_ADMIN_USERNAME=admin
  DEFAULT_ADMIN_PASSWORD=<leave-empty-for-auto-generate>
  ```

### Frontend Setup
- [ ] Copy `AuthContext.tsx` - manages auth state, token storage
- [ ] Copy `api.ts` and adapt - add `setAuthToken()` to interceptors
- [ ] Create login/registration forms (or adapt `AuthPage.tsx`)
- [ ] Set up localStorage token persistence
- [ ] Update `.env.example`:
  ```
  VITE_API_URL=http://localhost:5001
  ```

### Database Schema
- [ ] Create `schema.sql` with user table (copy from reference)
- [ ] Add wedding-specific tables (events, guests, tasks, etc.)
- [ ] Implement data isolation (FK constraints, user_id on all tables)
- [ ] Create indexes for query performance

**Key Pattern**: Every data entity should have `user_id` FK for multi-user isolation.

---

## Phase 3: Admin System

### Backend Routes
- [ ] Copy `admin.routes.ts` from reference
- [ ] Update to include wedding-specific admin needs:
  - View all users' wedding data
  - Enable/disable user accounts
  - View system statistics

### Frontend Admin Dashboard
- [ ] Copy `AdminDashboard.tsx` concept
- [ ] Create wedding-specific admin views:
  - User management
  - Wedding events overview
  - Guest statistics
  - System health

### Admin API Client
- [ ] Create/adapt `adminApi.ts` with endpoints:
  ```
  GET /api/admin/users
  GET /api/admin/users/:userId
  PATCH /api/admin/users/:userId/status
  GET /api/admin/stats
  ```

---

## Phase 4: Core Domain Features (Wedding-Specific)

### Create Wedding Service
```typescript
// /backend/src/services/wedding.service.ts
export class WeddingService {
  // CRUD operations for weddings/events
  // Data isolation: verify user_id ownership
  // Methods:
  - createWedding(userId, data)
  - getWedding(weddingId, userId)  // verify ownership
  - updateWedding(weddingId, userId, data)
  - deleteWedding(weddingId, userId)
  - getUserWeddings(userId)
}
```

### Create Guest Service
```typescript
// /backend/src/services/guest.service.ts
export class GuestService {
  // Manage guests for weddings
  // Methods:
  - addGuest(weddingId, userId, guestData)
  - getGuests(weddingId, userId)
  - updateGuest(guestId, weddingId, userId, data)
  - deleteGuest(guestId, weddingId, userId)
}
```

### Database Schema (Wedding-Specific)
```sql
-- Users table (copy from reference)
-- Sessions table (if needed, or adapt for events)

-- Events/Weddings
CREATE TABLE IF NOT EXISTS weddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Guests
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  rsvp_status TEXT DEFAULT 'pending',
  dietary_restrictions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add appropriate indexes
```

---

## Phase 5: API Routes

### Create Wedding Routes
```typescript
// /backend/src/routes/wedding.routes.ts
router.post('/weddings', authenticate, validateWeddingData, async (req, res) => {
  // Create wedding for authenticated user
  // Verify user ownership
});

router.get('/weddings', authenticate, async (req, res) => {
  // Get user's weddings
  // Data isolation
});

router.get('/weddings/:weddingId', authenticate, async (req, res) => {
  // Get specific wedding with ownership check
});

router.put('/weddings/:weddingId', authenticate, validateWeddingData, async (req, res) => {
  // Update wedding with ownership verification
});

router.delete('/weddings/:weddingId', authenticate, async (req, res) => {
  // Delete wedding with ownership verification
});

// Similar for guests endpoints
```

### Middleware Patterns (from Reference)
```typescript
// Use authenticate middleware for all protected routes
router.post('/weddings', authenticate, validateWeddingData, async (req, res) => {
  const userId = req.user!.userId;  // From auth middleware
  // Always verify data ownership
});
```

---

## Phase 6: Frontend Components

### Create Wedding Components
- [ ] `WeddingForm.tsx` - Create/edit wedding
- [ ] `WeddingList.tsx` - List user's weddings
- [ ] `WeddingDetail.tsx` - View specific wedding
- [ ] `GuestList.tsx` - Manage guests
- [ ] `GuestForm.tsx` - Add/edit guest
- [ ] `Dashboard.tsx` - Main dashboard

### Update Main App Flow
```typescript
// App.tsx
if (!isAuthenticated) {
  return <AuthPage />;
}

if (user.role === 'admin') {
  return <AdminDashboard />;
}

return <WeddingDashboard />;  // Main app
```

---

## Phase 7: Deployment Configuration

### Vercel (Frontend)
- [ ] Copy `vercel.json` from reference
- [ ] Update build/output directories if different
- [ ] Update environment variable: `VITE_API_URL`

### Render (Backend)
- [ ] Create `Dockerfile` for backend
- [ ] Set `NODE_ENV=production`
- [ ] Configure environment variables:
  ```
  JWT_SECRET
  SESSION_SECRET
  FRONTEND_URL (for CORS)
  DEFAULT_ADMIN_USERNAME
  DEFAULT_ADMIN_PASSWORD
  ```

### GitHub Actions (Optional CI/CD)
- [ ] Set up deployment workflow (reference has examples)
- [ ] Auto-deploy on push to main

---

## Phase 8: Testing

### Backend Tests
- [ ] Copy and adapt auth tests
- [ ] Copy and adapt user service tests
- [ ] Create wedding service tests
- [ ] Create guest service tests
- [ ] Test data isolation for multi-user scenarios

### Frontend Tests
- [ ] Test AuthContext functionality
- [ ] Test API client interceptors
- [ ] Test component integration

---

## Phase 9: Environment & Documentation

### Environment Files
- [ ] Create `.env.example` at root (or in each directory)
- [ ] Create `backend/.env.example`:
  ```
  BACKEND_PORT=5001
  NODE_ENV=development
  JWT_SECRET=your-secret
  SESSION_SECRET=your-secret
  FRONTEND_URL=http://localhost:3000
  DEFAULT_ADMIN_USERNAME=admin
  DEFAULT_ADMIN_PASSWORD=
  ```
- [ ] Create `frontend/.env.example`:
  ```
  VITE_API_URL=http://localhost:5001
  ```

### Documentation
- [ ] Create `README.md` with setup instructions
- [ ] Document API endpoints
- [ ] Document database schema
- [ ] Add deployment guide
- [ ] Add troubleshooting guide

---

## Phase 10: Security Checklist

- [ ] CORS configured for production domain
- [ ] JWT_SECRET set to strong random value in production
- [ ] SESSION_SECRET set to strong random value in production
- [ ] Password validation enforced (6+ chars)
- [ ] HTTP headers configured (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- [ ] Secure cookies (httpOnly, secure, sameSite)
- [ ] SQL injection prevention (parameterized queries)
- [ ] User data isolation enforced at route level
- [ ] Admin role required for sensitive operations
- [ ] No sensitive data in logs
- [ ] HTTPS enforced in production

---

## Key Patterns to Remember

### 1. Data Isolation Pattern
```typescript
// Every route that accesses user data must verify ownership
router.get('/:id', authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const data = getDataForId(id);
  
  if (data.user_id !== userId && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json(data);
});
```

### 2. Service Pattern
```typescript
export class YourService {
  constructor(dbService?: DatabaseService) {
    this.db = dbService || db;  // Allow injection for testing
  }
  
  public methodName(requiredParam: string): ReturnType {
    try {
      // Do work
      logger.info('Success', { metadata });
      return result;
    } catch (error) {
      logger.error('Failure', { error, requiredParam });
      throw error;
    }
  }
}

export const yourService = new YourService();  // Singleton
```

### 3. Route Pattern
```typescript
router.post('/resource', authenticate, validateInput, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const result = await yourService.create(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);  // Pass to error middleware
  }
});
```

### 4. Frontend State Pattern
```typescript
// Use React Context for global auth state
// Use localStorage for token persistence
// Use component state for UI state
// Use service classes for API calls
```

---

## Reference Implementation Files

All of these files are in the reference project and should be copied/adapted:

**Backend Files** (absolute paths from reference repo):
- `/backend/src/middleware/auth.middleware.ts` - JWT auth
- `/backend/src/middleware/error.middleware.ts` - Error handling
- `/backend/src/services/user.service.ts` - User management
- `/backend/src/routes/auth.routes.ts` - Auth endpoints
- `/backend/src/database/database.service.ts` - DB abstraction
- `/backend/src/database/schema.sql` - DB schema
- `/backend/src/server.ts` - Express setup

**Frontend Files**:
- `/frontend/src/contexts/AuthContext.tsx` - Auth state
- `/frontend/src/services/api.ts` - API client
- `/frontend/src/App.tsx` - App structure
- `/frontend/src/components/AuthPage.tsx` - Login/register

---

## Quick Start

```bash
# 1. Set up backend
cd backend
npm install
cp .env.example .env
npm run dev

# 2. Set up frontend (in another terminal)
cd frontend
npm install
cp .env.example .env
npm run dev

# 3. Access the app
# Frontend: http://localhost:3000
# Backend: http://localhost:5001
# API: http://localhost:5001/api/*

# 4. Create admin account
# Use DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD in backend/.env

# 5. Test locally before deployment
```

---

## Common Pitfalls to Avoid

1. **Data Isolation**: Don't forget to check `userId` ownership on every route
2. **Error Handling**: Always use try-catch and pass errors to error middleware
3. **Logging**: Log important events with metadata for debugging
4. **Validation**: Validate input before processing
5. **Environment Variables**: Don't commit `.env` files, only `.env.example`
6. **Database Migrations**: Test schema changes locally first
7. **Security**: Never log passwords, API keys, or sensitive data
8. **Testing**: Write tests for data isolation and auth

---

## Next Steps

1. Review the full `REFERENCE_ARCHITECTURE.md` document
2. Clone the reference project to examine implementation details
3. Set up the basic project structure
4. Implement authentication (copy from reference)
5. Create domain-specific services (wedding, guest, etc.)
6. Implement routes with proper data isolation
7. Build frontend components
8. Write tests
9. Deploy to Vercel/Render

