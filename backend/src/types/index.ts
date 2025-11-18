// Wedding Helper Backend - Type Definitions

import { Request } from 'express'

// ===== User Types =====
export interface User {
  id: number
  username: string
  password_hash: string
  role: 'user' | 'admin'
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface UserPublic {
  id: number
  username: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

// ===== JWT Types =====
export interface JWTPayload {
  userId: number
  username: string
  role: 'user' | 'admin'
  timestamp: number
}

// ===== Request Types =====
export interface AuthRequest extends Request {
  user?: JWTPayload
}

// ===== Knowledge Base Types =====
export interface KnowledgeDocument {
  id: number
  user_id: number
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  content_text: string
  upload_date: string
  updated_at: string
}

export interface KnowledgeChunk {
  id: number
  document_id: number
  user_id: number
  chunk_text: string
  chunk_index: number
  embedding_vector: string | null
  created_at: string
}

export interface DocumentUploadResult {
  documentId: number
  chunksCount: number
}

// ===== Chat Types =====
export interface ChatSession {
  id: string
  user_id: number
  guest_name: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: number
  session_id: string
  user_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens_used: number
  created_at: string
}

export interface GuestMessage {
  id: number
  session_id: string
  user_id: number
  guest_name: string
  message_type: 'blessing' | 'question' | 'message'
  content: string
  created_at: string
}

// ===== LLM Types =====
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMResponse {
  content: string
  tokensUsed: number
  model: string
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'lm-studio' | 'custom'
  apiKey?: string
  model: string
  temperature: number
  maxTokens: number
  apiUrl?: string
  baseURL?: string
  timeout?: number
}

// Apology/Response types (from reference project, adapted for wedding)
export type ApologyStyle = 'gentle' | 'formal' | 'empathetic'
export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'lm-studio' | 'custom'

export interface ApologyRequest {
  history?: LLMMessage[]
  message: string
  style?: ApologyStyle
  emotion?: string
}

export interface ApologyResponse {
  apology: string
  emotion?: string
  tokensUsed: number
  model: string
}

// OpenAI API types
export interface OpenAIChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface OpenAIChatRequest {
  model: string
  messages: OpenAIChatMessage[]
  temperature?: number
  max_tokens?: number
}

export interface OpenAIChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: OpenAIChatMessage
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// ===== RAG Types =====
export interface RAGContext {
  relevantChunks: string[]
  score: number
}

export interface ChunkScore {
  text: string
  score: number
}

// ===== API Response Types =====
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface AuthResponse {
  token: string
  user: UserPublic
}

export interface SendMessageRequest {
  sessionId: string | null
  message: string
}

export interface SendMessageResponse {
  response: string
  sessionId: string
}

// ===== Database Types =====
export interface DatabaseConfig {
  filename: string
  verbose?: boolean
}

// ===== Service Types =====
export interface ServiceDependencies {
  db?: any  // DatabaseService
}

// ===== Error Types =====
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message)
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(401, message)
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(403, message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message)
  }
}

export class LLMError extends Error {
  constructor(
    public code: string,
    public message: string,
    public originalError?: any,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'LLMError'
    Object.setPrototypeOf(this, LLMError.prototype)
  }
}
