-- Wedding Helper Database Schema
-- SQLite3 Schema with Foreign Key Constraints

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- =====================================================
-- Users Table
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL CHECK(length(username) >= 3 AND length(username) <= 50),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================
-- Knowledge Base Documents Table
-- =====================================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK(file_type IN ('pdf', 'docx', 'txt', 'md', 'doc')),
  file_size INTEGER NOT NULL CHECK(file_size > 0),
  content_text TEXT NOT NULL,
  upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for knowledge documents
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_user_id ON knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_upload_date ON knowledge_documents(upload_date DESC);

-- =====================================================
-- Knowledge Chunks Table (for RAG)
-- =====================================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  chunk_text TEXT NOT NULL CHECK(length(chunk_text) > 0),
  chunk_index INTEGER NOT NULL CHECK(chunk_index >= 0),
  embedding_vector TEXT,
  -- JSON format for vector storage (optional)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for knowledge chunks
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user_id ON knowledge_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_text ON knowledge_chunks(chunk_text);

-- =====================================================
-- Chat Sessions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  -- UUID format
  user_id INTEGER NOT NULL,
  guest_name TEXT,
  -- Optional guest name
  title TEXT,
  -- Session title
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for chat sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

-- =====================================================
-- Chat Messages Table
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0 CHECK(tokens_used >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- =====================================================
-- Guest Messages Table (Blessings and Messages)
-- =====================================================
CREATE TABLE IF NOT EXISTS guest_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  -- Owner of the wedding (the couple)
  guest_name TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK(message_type IN ('blessing', 'question', 'message')),
  content TEXT NOT NULL CHECK(length(content) > 0),
  is_read INTEGER NOT NULL DEFAULT 0,
  -- For tracking read status
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for guest messages
CREATE INDEX IF NOT EXISTS idx_guest_messages_user_id ON guest_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_messages_type ON guest_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_guest_messages_created_at ON guest_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_messages_read ON guest_messages(is_read);

-- =====================================================
-- Triggers for Auto-Updating Timestamps
-- =====================================================

-- Update users.updated_at on update
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update knowledge_documents.updated_at on update
CREATE TRIGGER IF NOT EXISTS update_knowledge_documents_timestamp
AFTER UPDATE ON knowledge_documents
FOR EACH ROW
BEGIN
  UPDATE knowledge_documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update chat_sessions.updated_at on new message
CREATE TRIGGER IF NOT EXISTS update_chat_sessions_timestamp
AFTER INSERT ON chat_messages
FOR EACH ROW
BEGIN
  UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.session_id;
END;

-- =====================================================
-- Optional: Views for Convenient Queries
-- =====================================================

-- View for getting user statistics
CREATE VIEW IF NOT EXISTS user_stats AS
SELECT
  u.id AS user_id,
  u.username,
  u.role,
  u.is_active,
  COUNT(DISTINCT cs.id) AS total_sessions,
  COUNT(DISTINCT cm.id) AS total_messages,
  COUNT(DISTINCT kd.id) AS total_documents,
  COUNT(DISTINCT gm.id) AS total_guest_messages,
  MAX(cs.created_at) AS last_session_date,
  MAX(cm.created_at) AS last_message_date
FROM users u
LEFT JOIN chat_sessions cs ON u.id = cs.user_id
LEFT JOIN chat_messages cm ON u.id = cm.user_id
LEFT JOIN knowledge_documents kd ON u.id = kd.user_id
LEFT JOIN guest_messages gm ON u.id = gm.user_id
GROUP BY u.id;

-- View for recent blessings (for admin dashboard)
CREATE VIEW IF NOT EXISTS recent_blessings AS
SELECT
  gm.id,
  gm.guest_name,
  gm.content,
  gm.created_at,
  gm.is_read,
  u.username AS owner_username,
  cs.guest_name AS session_guest_name
FROM guest_messages gm
JOIN users u ON gm.user_id = u.id
JOIN chat_sessions cs ON gm.session_id = cs.id
WHERE gm.message_type = 'blessing'
ORDER BY gm.created_at DESC;

-- =====================================================
-- Data Integrity Notes
-- =====================================================
-- 1. All foreign keys have ON DELETE CASCADE for automatic cleanup
-- 2. All tables have appropriate indexes for query performance
-- 3. Triggers maintain updated_at timestamps automatically
-- 4. CHECK constraints ensure data validity
-- 5. Views provide convenient aggregate queries
-- 6. User data is isolated via user_id foreign keys

-- =====================================================
-- Schema Version
-- =====================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO schema_version (version) VALUES (1);
