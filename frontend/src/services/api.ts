// Wedding Helper - API Client Service
// Axios-based client for backend API communication

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  AuthResponse,
  ChatMessage,
  ChatSession,
  SendMessageResponse,
  KnowledgeDocument,
  UploadDocumentResponse,
  GuestMessage,
  ApiError,
} from '../types';
import { logger } from '../utils/logger';
import { storage } from '../utils/storage';

// API base URL from environment or default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/**
 * Axios instance for API requests
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for CORS
});

/**
 * Request interceptor - Add auth token to all requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logger.error('[API] Request error', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      const { status, data } = error.response;

      // Handle authentication errors
      if (status === 401) {
        logger.warn('[API] Unauthorized - clearing token');
        storage.clearToken();
        // Optionally redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }

      // Handle forbidden errors
      if (status === 403) {
        logger.warn('[API] Forbidden access', data);
      }

      // Log all API errors
      logger.error('[API] Response error', {
        status,
        url: error.config?.url,
        error: data,
      });

      return Promise.reject(data || error);
    }

    // Network errors
    if (error.request) {
      logger.error('[API] Network error - no response received', error);
      return Promise.reject({
        error: 'NETWORK_ERROR',
        message: '无法连接到服务器，请检查网络连接',
        statusCode: 0,
      } as ApiError);
    }

    // Other errors
    logger.error('[API] Request setup error', error);
    return Promise.reject(error);
  }
);

/**
 * Authentication API
 */
export const authApi = {
  /**
   * Login
   */
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      username,
      password,
    });

    // Save token to storage
    storage.setToken(response.data.token);
    logger.info('[API] User logged in', { username });

    return response.data;
  },

  /**
   * Register
   */
  async register(username: string, password: string, inviteCode?: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      username,
      password,
      inviteCode,
    });

    // Save token to storage
    storage.setToken(response.data.token);
    logger.info('[API] User registered', { username });

    return response.data;
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    storage.clearToken();
    logger.info('[API] User logged out');
  },

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<{ user: User }>('/auth/status');
    return response.data.user;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!storage.getToken();
  },
};

/**
 * Chat API
 */
export const chatApi = {
  /**
   * Send a message
   */
  async sendMessage(
    sessionId: string | null,
    message: string,
    guestName?: string
  ): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>('/chat/message', {
      sessionId,
      message,
      guestName,
    });

    logger.info('[API] Message sent', {
      sessionId: response.data.sessionId,
      messageLength: message.length,
    });

    return response.data;
  },

  /**
   * Get chat sessions
   */
  async getSessions(): Promise<ChatSession[]> {
    const response = await apiClient.get<{ sessions: ChatSession[] }>('/chat/sessions');
    return response.data.sessions;
  },

  /**
   * Get session history
   */
  async getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
    const response = await apiClient.get<{ messages: ChatMessage[] }>(
      `/chat/sessions/${sessionId}/messages`
    );
    return response.data.messages;
  },

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/chat/sessions/${sessionId}`);
    logger.info('[API] Session deleted', { sessionId });
  },
};

/**
 * Knowledge Base API (Admin only)
 */
export const knowledgeApi = {
  /**
   * Upload a document
   */
  async uploadDocument(file: File): Promise<UploadDocumentResponse> {
    const formData = new FormData();
    formData.append('document', file);

    const response = await apiClient.post<{ document: UploadDocumentResponse }>(
      '/knowledge/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    logger.info('[API] Document uploaded', {
      filename: file.name,
      documentId: response.data.document.documentId,
    });

    return response.data.document;
  },

  /**
   * Upload multiple documents
   */
  async uploadDocuments(files: File[]): Promise<UploadDocumentResponse[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('documents', file);
    });

    const response = await apiClient.post<{ documents: UploadDocumentResponse[] }>(
      '/knowledge/upload-batch',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    logger.info('[API] Documents uploaded', { count: files.length });

    return response.data.documents;
  },

  /**
   * Replace all documents
   */
  async replaceAllDocuments(
    files: File[]
  ): Promise<{ deleted: number; uploaded: UploadDocumentResponse[] }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('documents', file);
    });

    const response = await apiClient.post<{
      deleted: number;
      uploaded: UploadDocumentResponse[];
    }>('/knowledge/replace-all', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    logger.info('[API] Knowledge base replaced', {
      deleted: response.data.deleted,
      uploaded: response.data.uploaded.length,
    });

    return response.data;
  },

  /**
   * Get all documents
   */
  async getDocuments(): Promise<KnowledgeDocument[]> {
    const response = await apiClient.get<{ documents: KnowledgeDocument[] }>(
      '/knowledge/documents'
    );
    return response.data.documents;
  },

  /**
   * Get a single document
   */
  async getDocument(documentId: number): Promise<KnowledgeDocument> {
    const response = await apiClient.get<{ document: KnowledgeDocument }>(
      `/knowledge/documents/${documentId}`
    );
    return response.data.document;
  },

  /**
   * Delete a document
   */
  async deleteDocument(documentId: number): Promise<void> {
    await apiClient.delete(`/knowledge/documents/${documentId}`);
    logger.info('[API] Document deleted', { documentId });
  },

  /**
   * Get knowledge base statistics
   */
  async getStats(): Promise<{ documentCount: number; chunkCount: number }> {
    const response = await apiClient.get<{
      documentCount: number;
      chunkCount: number;
    }>('/knowledge/stats');
    return response.data;
  },
};

/**
 * Admin API - Guest messages
 */
export const adminApi = {
  /**
   * Get guest messages
   */
  async getGuestMessages(
    messageType?: 'blessing' | 'question' | 'message',
    unreadOnly: boolean = false
  ): Promise<GuestMessage[]> {
    const params = new URLSearchParams();
    if (messageType) params.append('type', messageType);
    if (unreadOnly) params.append('unread', 'true');

    const response = await apiClient.get<{ messages: GuestMessage[] }>(
      `/chat/guest-messages?${params.toString()}`
    );
    return response.data.messages;
  },

  /**
   * Mark guest message as read
   */
  async markMessageAsRead(messageId: number): Promise<void> {
    await apiClient.patch(`/chat/guest-messages/${messageId}/read`);
    logger.info('[API] Guest message marked as read', { messageId });
  },
};

/**
 * Export default API client
 */
export const api = {
  client: apiClient,
  auth: authApi,
  chat: chatApi,
  knowledge: knowledgeApi,
  admin: adminApi,
};

export default api;
