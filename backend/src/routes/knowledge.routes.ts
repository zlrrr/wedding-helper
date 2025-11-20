// Wedding Helper - Knowledge Base Routes
// Admin-only endpoints for document management

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';
import { knowledgeService } from '../services/knowledge.service.js';
import logger from '../utils/logger.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'data', 'temp');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow specific document types
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['.pdf', '.docx', '.doc', '.txt', '.md', '.markdown'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * POST /api/knowledge/upload
 * Upload a single document (Admin only)
 */
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  upload.single('document'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      if (!req.file) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'No file uploaded',
        });
      }

      logger.info('[KNOWLEDGE-ROUTE-001] Processing document upload', {
        userId,
        filename: req.file.originalname,
        size: req.file.size,
      });

      const result = await knowledgeService.uploadDocument(userId, req.file);

      logger.info('[KNOWLEDGE-ROUTE-002] Document uploaded successfully', {
        userId,
        documentId: result.documentId,
        filename: result.filename,
      });

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: result,
      });
    } catch (error: any) {
      logger.error('[KNOWLEDGE-ROUTE-ERROR] Document upload failed', {
        error,
        errorMessage: error?.message,
        errorStack: error?.stack,
        userId: req.user?.userId,
        filename: req.file?.originalname,
        filePath: req.file?.path,
        fileSize: req.file?.size,
      });

      // Return user-friendly error message
      res.status(500).json({
        error: 'UploadError',
        message: '文档上传失败，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      });
    }
  }
);

/**
 * POST /api/knowledge/upload-batch
 * Upload multiple documents (Admin only)
 */
router.post(
  '/upload-batch',
  authenticate,
  requireAdmin,
  upload.array('documents', 20), // Max 20 files at once
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'No files uploaded',
        });
      }

      logger.info('[KNOWLEDGE-ROUTE-003] Processing batch document upload', {
        userId,
        fileCount: files.length,
      });

      const results = await knowledgeService.uploadDocuments(userId, files);

      logger.info('[KNOWLEDGE-ROUTE-004] Batch upload completed', {
        userId,
        uploadedCount: results.length,
      });

      res.status(201).json({
        message: 'Batch upload completed',
        documents: results,
        count: results.length,
      });
    } catch (error) {
      logger.error('[KNOWLEDGE-ROUTE-ERROR] Batch upload failed', {
        error,
        userId: req.user?.userId,
      });
      next(error);
    }
  }
);

/**
 * POST /api/knowledge/replace-all
 * Replace entire knowledge base with new documents (Admin only)
 * WARNING: This deletes all existing documents
 */
router.post(
  '/replace-all',
  authenticate,
  requireAdmin,
  upload.array('documents', 20),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'No files uploaded',
        });
      }

      logger.info('[KNOWLEDGE-ROUTE-005] Processing full knowledge base replacement', {
        userId,
        newFileCount: files.length,
      });

      const result = await knowledgeService.replaceAllDocuments(userId, files);

      logger.info('[KNOWLEDGE-ROUTE-006] Knowledge base replacement completed', {
        userId,
        deleted: result.deleted,
        uploaded: result.uploaded.length,
      });

      res.json({
        message: 'Knowledge base replaced successfully',
        deleted: result.deleted,
        uploaded: result.uploaded,
        uploadedCount: result.uploaded.length,
      });
    } catch (error) {
      logger.error('[KNOWLEDGE-ROUTE-ERROR] Knowledge base replacement failed', {
        error,
        userId: req.user?.userId,
      });
      next(error);
    }
  }
);

/**
 * GET /api/knowledge/documents
 * Get all documents (Admin only)
 */
router.get(
  '/documents',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      logger.info('[KNOWLEDGE-ROUTE-007] Fetching documents', { userId });

      const documents = knowledgeService.getDocuments(userId);

      // Don't include full content_text in list view
      const documentList = documents.map(doc => ({
        id: doc.id,
        filename: doc.original_filename,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        uploadDate: doc.upload_date,
        updatedAt: doc.updated_at,
      }));

      res.json({
        documents: documentList,
        count: documentList.length,
      });
    } catch (error) {
      logger.error('[KNOWLEDGE-ROUTE-ERROR] Failed to fetch documents', {
        error,
        userId: req.user?.userId,
      });
      next(error);
    }
  }
);

/**
 * GET /api/knowledge/documents/:id
 * Get a single document with full content (Admin only)
 */
router.get(
  '/documents/:id',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const documentId = parseInt(req.params.id);

      if (isNaN(documentId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'Invalid document ID',
        });
      }

      logger.info('[KNOWLEDGE-ROUTE-008] Fetching document', {
        userId,
        documentId,
      });

      const document = knowledgeService.getDocument(documentId, userId);

      if (!document) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Document not found',
        });
      }

      res.json({
        document: {
          id: document.id,
          filename: document.original_filename,
          fileType: document.file_type,
          fileSize: document.file_size,
          content: document.content_text,
          uploadDate: document.upload_date,
          updatedAt: document.updated_at,
        },
      });
    } catch (error) {
      logger.error('[KNOWLEDGE-ROUTE-ERROR] Failed to fetch document', {
        error,
        userId: req.user?.userId,
        documentId: req.params.id,
      });
      next(error);
    }
  }
);

/**
 * DELETE /api/knowledge/documents/:id
 * Delete a document (Admin only)
 */
router.delete(
  '/documents/:id',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const documentId = parseInt(req.params.id);

      if (isNaN(documentId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'Invalid document ID',
        });
      }

      logger.info('[KNOWLEDGE-ROUTE-009] Deleting document', {
        userId,
        documentId,
      });

      const deleted = knowledgeService.deleteDocument(documentId, userId);

      if (!deleted) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Document not found or already deleted',
        });
      }

      logger.info('[KNOWLEDGE-ROUTE-010] Document deleted successfully', {
        userId,
        documentId,
      });

      res.json({
        message: 'Document deleted successfully',
        documentId,
      });
    } catch (error) {
      logger.error('[KNOWLEDGE-ROUTE-ERROR] Failed to delete document', {
        error,
        userId: req.user?.userId,
        documentId: req.params.id,
      });
      next(error);
    }
  }
);

/**
 * GET /api/knowledge/stats
 * Get knowledge base statistics (Admin only)
 */
router.get(
  '/stats',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      logger.info('[KNOWLEDGE-ROUTE-011] Fetching knowledge base stats', {
        userId,
      });

      const documentCount = knowledgeService.getDocumentCount(userId);
      const chunkCount = knowledgeService.getChunkCount(userId);

      res.json({
        documentCount,
        chunkCount,
      });
    } catch (error) {
      logger.error('[KNOWLEDGE-ROUTE-ERROR] Failed to fetch stats', {
        error,
        userId: req.user?.userId,
      });
      next(error);
    }
  }
);

export default router;
