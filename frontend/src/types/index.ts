// Wedding Helper - Frontend Type Definitions

export interface User {
  id: number
  username: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface ChatMessage {
  id?: number
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
  tokensUsed?: number
}

export interface ChatSession {
  id: string
  userId: number
  guestName?: string
  createdAt: string
  updatedAt: string
}

export interface SendMessageResponse {
  response: string
  sessionId: string
}

export interface KnowledgeDocument {
  id: number
  userId: number
  filename: string
  originalFilename: string
  fileType: string
  fileSize: number
  uploadDate: string
  updatedAt: string
}

export interface UploadDocumentResponse {
  documentId: number
  chunksCount: number
}

export interface GuestMessage {
  id: number
  sessionId: string
  userId: number
  guestName: string
  messageType: 'blessing' | 'question' | 'message'
  content: string
  createdAt: string
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
}
