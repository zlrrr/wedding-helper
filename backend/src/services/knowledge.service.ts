// Wedding Helper - Knowledge Management Service
// Admin-only document upload, processing, and RAG retrieval

import fs from 'fs';
import path from 'path';
import { DatabaseService, db } from '../database/database.service.js';
import { documentParser, DocumentParserService } from './document-parser.service.js';
import logger from '../utils/logger.js';

// Database document record
export interface DBDocument {
  id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  content_text: string;
  upload_date: string;
  updated_at: string;
}

// Database chunk record
export interface DBChunk {
  id: number;
  document_id: number;
  user_id: number;
  chunk_text: string;
  chunk_index: number;
  embedding_vector: string | null;
  created_at: string;
}

// Upload result
export interface UploadResult {
  documentId: number;
  filename: string;
  chunksCount: number;
  fileSize: number;
}

/**
 * Knowledge Management Service for Wedding Assistant
 * Handles document upload, processing, chunking, and RAG retrieval
 * Admin-only operations for managing wedding knowledge base
 */
export class KnowledgeService {
  private db: DatabaseService;
  private documentParser: DocumentParserService;
  private uploadDir: string;

  constructor(dbService?: DatabaseService, docParser?: DocumentParserService) {
    this.db = dbService || db;
    this.documentParser = docParser || documentParser;
    // Create upload directory if it doesn't exist
    this.uploadDir = path.join(process.cwd(), 'data', 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      logger.info('[KNOWLEDGE-001] Upload directory created', { path: this.uploadDir });
    }
  }

  /**
   * Upload and process a single document (Admin only)
   * Steps:
   * 1. Validate file
   * 2. Parse document to extract text
   * 3. Save document record to database
   * 4. Chunk text for RAG
   * 5. Save chunks to database
   * 6. Move file to permanent storage
   */
  async uploadDocument(
    userId: number,
    file: Express.Multer.File
  ): Promise<UploadResult> {
    const startTime = Date.now();

    try {
      logger.info('[KNOWLEDGE-002] Starting document upload', {
        userId,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      });

      // Extract file type from filename
      const fileType = path.extname(file.originalname).substring(1).toLowerCase();

      // Validate file
      this.documentParser.validateFile(file.path, fileType, 10 * 1024 * 1024); // 10MB limit

      // Parse document to extract text
      const text = await this.documentParser.parseDocument(file.path, fileType);

      if (!text || text.trim().length === 0) {
        throw new Error('Document contains no extractable text');
      }

      logger.info('[KNOWLEDGE-003] Document parsed successfully', {
        userId,
        filename: file.originalname,
        textLength: text.length,
        wordCount: text.split(/\s+/).length,
      });

      // Generate unique filename for storage
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${file.originalname}`;
      const permanentPath = path.join(this.uploadDir, uniqueFilename);

      // Move file to permanent storage
      fs.renameSync(file.path, permanentPath);

      // Save document record to database
      const result = this.db.execute(
        `INSERT INTO knowledge_documents
         (user_id, filename, original_filename, file_type, file_size, content_text)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, uniqueFilename, file.originalname, fileType, file.size, text]
      );

      const documentId = result.lastInsertRowid as number;

      logger.info('[KNOWLEDGE-004] Document record saved', {
        userId,
        documentId,
        filename: uniqueFilename,
      });

      // Chunk text for RAG
      const chunks = this.documentParser.chunkText(text, 500, 50);

      logger.info('[KNOWLEDGE-005] Text chunked', {
        userId,
        documentId,
        chunksCount: chunks.length,
      });

      // Save chunks to database
      for (let i = 0; i < chunks.length; i++) {
        this.db.execute(
          `INSERT INTO knowledge_chunks
           (document_id, user_id, chunk_text, chunk_index)
           VALUES (?, ?, ?, ?)`,
          [documentId, userId, chunks[i], i]
        );
      }

      logger.info('[KNOWLEDGE-006] Document upload completed', {
        userId,
        documentId,
        filename: file.originalname,
        chunksCount: chunks.length,
        duration: Date.now() - startTime,
      });

      return {
        documentId,
        filename: file.originalname,
        chunksCount: chunks.length,
        fileSize: file.size,
      };
    } catch (error) {
      logger.error('[KNOWLEDGE-ERROR] Document upload failed', {
        error,
        userId,
        filename: file.originalname,
      });

      // Clean up file if it still exists
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      throw error;
    }
  }

  /**
   * Upload multiple documents in batch
   */
  async uploadDocuments(
    userId: number,
    files: Express.Multer.File[]
  ): Promise<UploadResult[]> {
    logger.info('[KNOWLEDGE-007] Starting batch document upload', {
      userId,
      fileCount: files.length,
    });

    const results: UploadResult[] = [];
    const errors: Array<{ filename: string; error: string }> = [];

    for (const file of files) {
      try {
        const result = await this.uploadDocument(userId, file);
        results.push(result);
      } catch (error) {
        logger.error('[KNOWLEDGE-ERROR] Failed to upload document in batch', {
          error,
          userId,
          filename: file.originalname,
        });
        errors.push({
          filename: file.originalname,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('[KNOWLEDGE-008] Batch upload completed', {
      userId,
      successful: results.length,
      failed: errors.length,
    });

    if (errors.length > 0) {
      logger.warn('[KNOWLEDGE-WARN] Some documents failed to upload', { errors });
    }

    return results;
  }

  /**
   * Replace all knowledge base documents with new ones
   * This is a destructive operation - deletes all existing documents first
   */
  async replaceAllDocuments(
    userId: number,
    files: Express.Multer.File[]
  ): Promise<{ deleted: number; uploaded: UploadResult[] }> {
    logger.info('[KNOWLEDGE-009] Starting full knowledge base replacement', {
      userId,
      newFileCount: files.length,
    });

    try {
      // Delete all existing documents for this user
      const deletedCount = this.deleteAllDocuments(userId);

      logger.info('[KNOWLEDGE-010] Existing documents deleted', {
        userId,
        deletedCount,
      });

      // Upload new documents
      const uploadResults = await this.uploadDocuments(userId, files);

      logger.info('[KNOWLEDGE-011] Knowledge base replacement completed', {
        userId,
        deleted: deletedCount,
        uploaded: uploadResults.length,
      });

      return {
        deleted: deletedCount,
        uploaded: uploadResults,
      };
    } catch (error) {
      logger.error('[KNOWLEDGE-ERROR] Knowledge base replacement failed', {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get all documents for a user
   */
  getDocuments(userId: number): DBDocument[] {
    try {
      const documents = this.db.query<DBDocument>(
        `SELECT id, user_id, filename, original_filename, file_type, file_size,
                upload_date, updated_at
         FROM knowledge_documents
         WHERE user_id = ?
         ORDER BY upload_date DESC`,
        [userId]
      );

      logger.info('[KNOWLEDGE-012] Documents retrieved', {
        userId,
        count: documents.length,
      });

      return documents;
    } catch (error) {
      logger.error('[KNOWLEDGE-ERROR] Failed to retrieve documents', {
        error,
        userId,
      });
      return [];
    }
  }

  /**
   * Get a single document by ID
   */
  getDocument(documentId: number, userId: number): DBDocument | undefined {
    try {
      const document = this.db.queryOne<DBDocument>(
        `SELECT * FROM knowledge_documents
         WHERE id = ? AND user_id = ?`,
        [documentId, userId]
      );

      if (document) {
        logger.info('[KNOWLEDGE-013] Document retrieved', {
          userId,
          documentId,
        });
      }

      return document;
    } catch (error) {
      logger.error('[KNOWLEDGE-ERROR] Failed to retrieve document', {
        error,
        userId,
        documentId,
      });
      return undefined;
    }
  }

  /**
   * Delete a document by ID
   */
  deleteDocument(documentId: number, userId: number): boolean {
    try {
      // Get document info first to delete file
      const document = this.getDocument(documentId, userId);

      if (!document) {
        logger.warn('[KNOWLEDGE-WARN] Document not found for deletion', {
          userId,
          documentId,
        });
        return false;
      }

      // Delete from database (cascades to chunks)
      const result = this.db.execute(
        'DELETE FROM knowledge_documents WHERE id = ? AND user_id = ?',
        [documentId, userId]
      );

      if (result.changes > 0) {
        // Delete physical file
        const filePath = path.join(this.uploadDir, document.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info('[KNOWLEDGE-014] Document file deleted', {
            userId,
            documentId,
            filename: document.filename,
          });
        }

        logger.info('[KNOWLEDGE-015] Document deleted successfully', {
          userId,
          documentId,
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('[KNOWLEDGE-ERROR] Failed to delete document', {
        error,
        userId,
        documentId,
      });
      return false;
    }
  }

  /**
   * Delete all documents for a user
   */
  deleteAllDocuments(userId: number): number {
    try {
      // Get all documents to delete files
      const documents = this.getDocuments(userId);

      // Delete from database
      const result = this.db.execute(
        'DELETE FROM knowledge_documents WHERE user_id = ?',
        [userId]
      );

      // Delete physical files
      for (const doc of documents) {
        const filePath = path.join(this.uploadDir, doc.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (fileError) {
            logger.warn('[KNOWLEDGE-WARN] Failed to delete document file', {
              userId,
              filename: doc.filename,
              error: fileError,
            });
          }
        }
      }

      logger.info('[KNOWLEDGE-016] All documents deleted', {
        userId,
        deletedCount: result.changes,
      });

      return result.changes;
    } catch (error) {
      logger.error('[KNOWLEDGE-ERROR] Failed to delete all documents', {
        error,
        userId,
      });
      return 0;
    }
  }

  /**
   * Get document count for statistics
   */
  getDocumentCount(userId: number): number {
    try {
      const result = this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM knowledge_documents WHERE user_id = ?',
        [userId]
      );
      return result?.count || 0;
    } catch (error) {
      logger.error('[KNOWLEDGE-ERROR] Failed to get document count', {
        error,
        userId,
      });
      return 0;
    }
  }

  /**
   * Get chunk count for statistics
   */
  getChunkCount(userId: number): number {
    try {
      const result = this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM knowledge_chunks WHERE user_id = ?',
        [userId]
      );
      return result?.count || 0;
    } catch (error) {
      logger.error('[KNOWLEDGE-ERROR] Failed to get chunk count', {
        error,
        userId,
      });
      return 0;
    }
  }

  /**
   * Retrieve relevant context for RAG
   * Phase 5: Simple keyword-based search (can be upgraded to embeddings later)
   *
   * @param userId User ID for data isolation
   * @param query User's question
   * @param maxChunks Maximum number of chunks to return
   * @returns Array of relevant text chunks
   */
  /**
   * Retrieve context using RAG (keyword-based search)
   * Improved with character-level tokenization for Chinese
   */
  retrieveContext(userId: number, query: string, maxChunks: number = 5): string[] {
    try {
      logger.info('[KNOWLEDGE-017] Retrieving RAG context', {
        userId,
        queryLength: query.length,
        maxChunks,
      });

      // Improved keyword extraction for Chinese
      // Split into individual characters for better Chinese matching
      const queryLower = query.toLowerCase();

      // Extract meaningful Chinese characters and English words
      const chineseChars = queryLower.match(/[\u4e00-\u9fa5]/g) || [];
      const englishWords = queryLower
        .replace(/[\u4e00-\u9fa5]/g, ' ')  // Remove Chinese
        .replace(/[^a-z0-9\s]/g, ' ')      // Keep only English and numbers
        .split(/\s+/)
        .filter(word => word.length > 1);

      // Combine: use Chinese characters + English words
      const keywords = [...chineseChars, ...englishWords].filter(kw => kw.length > 0);

      if (keywords.length === 0) {
        logger.warn('[KNOWLEDGE-WARN] No keywords extracted from query', {
          userId,
          query,
        });
        return [];
      }

      logger.info('[KNOWLEDGE-018] Keywords extracted', {
        userId,
        keywords: keywords.slice(0, 10),  // Log first 10 to avoid spam
        totalKeywords: keywords.length,
      });

      // Search chunks using keyword matching
      // Use OR logic: match any keyword
      const searchConditions = keywords
        .map(() => 'LOWER(chunk_text) LIKE ?')
        .join(' OR ');

      const searchParams = [
        userId,
        ...keywords.map(kw => `%${kw}%`),
        maxChunks,
      ];

      const chunks = this.db.query<DBChunk>(
        `SELECT chunk_text, chunk_index, document_id
         FROM knowledge_chunks
         WHERE user_id = ? AND (${searchConditions})
         ORDER BY chunk_index ASC
         LIMIT ?`,
        searchParams
      );

      logger.info('[KNOWLEDGE-019] Context chunks retrieved', {
        userId,
        chunksFound: chunks.length,
      });

      return chunks.map(chunk => chunk.chunk_text);
    } catch (error) {
      logger.error('[KNOWLEDGE-ERROR] Failed to retrieve context', {
        error,
        userId,
        query,
      });
      return [];
    }
  }

  /**
   * Retrieve context using FULL TEXT mode (all documents)
   * Lightweight alternative to RAG - just return all content
   * Best for small knowledge bases (<50KB)
   */
  retrieveContextFullText(userId: number): string {
    try {
      logger.info('[KNOWLEDGE-020] Retrieving full text context', { userId });

      const documents = this.db.query<DBDocument>(
        `SELECT original_filename, content_text
         FROM knowledge_documents
         WHERE user_id = ?
         ORDER BY upload_date ASC`,
        [userId]
      );

      if (documents.length === 0) {
        logger.info('[KNOWLEDGE-021] No documents found', { userId });
        return '';
      }

      // Concatenate all documents with headers
      const fullText = documents
        .map(doc => `【文档: ${doc.original_filename}】\n${doc.content_text}`)
        .join('\n\n---\n\n');

      logger.info('[KNOWLEDGE-022] Full text context retrieved', {
        userId,
        documentCount: documents.length,
        totalLength: fullText.length,
      });

      return fullText;
    } catch (error) {
      logger.error('[KNOWLEDGE-ERROR] Failed to retrieve full text context', {
        error,
        userId,
      });
      return '';
    }
  }

  /**
   * Get full knowledge base as plain text (for debugging or export)
   */
  getFullKnowledgeBase(userId: number): string {
    try {
      const documents = this.db.query<DBDocument>(
        `SELECT original_filename, content_text
         FROM knowledge_documents
         WHERE user_id = ?
         ORDER BY upload_date ASC`,
        [userId]
      );

      if (documents.length === 0) {
        return '';
      }

      const fullText = documents
        .map(doc => `=== ${doc.original_filename} ===\n\n${doc.content_text}`)
        .join('\n\n---\n\n');

      logger.info('[KNOWLEDGE-020] Full knowledge base retrieved', {
        userId,
        documentCount: documents.length,
        totalLength: fullText.length,
      });

      return fullText;
    } catch (error) {
      logger.error('[KNOWLEDGE-ERROR] Failed to retrieve full knowledge base', {
        error,
        userId,
      });
      return '';
    }
  }
}

// Export singleton instance
export const knowledgeService = new KnowledgeService();
