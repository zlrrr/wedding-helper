// Wedding Helper - Document Parser Service
// Parse various document formats for knowledge base

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import logger from '../utils/logger.js';

/**
 * Document Parser Service
 * Extracts text content from various document formats
 */
export class DocumentParserService {
  /**
   * Parse document based on file type
   * @param filePath Path to the document file
   * @param fileType File extension/type
   * @returns Extracted text content
   */
  async parseDocument(filePath: string, fileType: string): Promise<string> {
    try {
      logger.info('[DOC-PARSER-001] Starting document parsing', {
        filePath,
        fileType,
      });

      let text: string;

      switch (fileType.toLowerCase()) {
        case 'pdf':
          text = await this.parsePDF(filePath);
          break;
        case 'docx':
        case 'doc':
          text = await this.parseDOCX(filePath);
          break;
        case 'txt':
        case 'md':
        case 'markdown':
          text = await this.parsePlainText(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Clean up the text
      text = this.cleanText(text);

      logger.info('[DOC-PARSER-002] Document parsing completed', {
        filePath,
        fileType,
        textLength: text.length,
        wordCount: text.split(/\s+/).length,
      });

      return text;
    } catch (error) {
      logger.error('[DOC-PARSER-ERROR] Document parsing failed', {
        error,
        filePath,
        fileType,
      });
      throw error;
    }
  }

  /**
   * Parse PDF document
   */
  private async parsePDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);

      logger.info('[DOC-PARSER-003] PDF parsed successfully', {
        pages: data.numpages,
        textLength: data.text.length,
      });

      return data.text;
    } catch (error) {
      logger.error('[DOC-PARSER-ERROR] PDF parsing failed', { error, filePath });
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse DOCX/DOC document
   */
  private async parseDOCX(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });

      if (result.messages.length > 0) {
        logger.warn('[DOC-PARSER-WARN] DOCX parsing had warnings', {
          warnings: result.messages,
        });
      }

      logger.info('[DOC-PARSER-004] DOCX parsed successfully', {
        textLength: result.value.length,
      });

      return result.value;
    } catch (error) {
      logger.error('[DOC-PARSER-ERROR] DOCX parsing failed', { error, filePath });
      throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse plain text file
   */
  private async parsePlainText(filePath: string): Promise<string> {
    try {
      const text = fs.readFileSync(filePath, 'utf-8');

      logger.info('[DOC-PARSER-005] Plain text parsed successfully', {
        textLength: text.length,
      });

      return text;
    } catch (error) {
      logger.error('[DOC-PARSER-ERROR] Plain text parsing failed', { error, filePath });
      throw new Error(`Failed to parse text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ');

    // Remove excessive newlines (more than 2 consecutive)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Trim
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Chunk text into smaller pieces for RAG
   * Uses sliding window approach with overlap to maintain context
   *
   * @param text Full text to chunk
   * @param chunkSize Target size of each chunk (in characters)
   * @param overlap Number of overlapping characters between chunks
   * @returns Array of text chunks
   */
  chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      // Extract chunk
      let endIndex = startIndex + chunkSize;

      // If not at the end, try to find a natural break point (sentence end)
      if (endIndex < text.length) {
        // Look for sentence boundaries: . ! ? followed by space or newline
        const sentenceEnd = text.substring(startIndex, endIndex).search(/[。！？.!?][\s\n]/g);
        if (sentenceEnd !== -1) {
          endIndex = startIndex + sentenceEnd + 2; // Include the punctuation and space
        }
      } else {
        endIndex = text.length;
      }

      // Extract the chunk
      const chunk = text.substring(startIndex, endIndex).trim();

      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Move to next chunk with overlap
      startIndex = endIndex - overlap;

      // Prevent infinite loop
      if (startIndex >= text.length - overlap) {
        break;
      }
    }

    logger.info('[DOC-PARSER-006] Text chunked successfully', {
      totalLength: text.length,
      chunkSize,
      overlap,
      chunksCount: chunks.length,
      avgChunkLength: chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length,
    });

    return chunks;
  }

  /**
   * Validate file before processing
   */
  validateFile(filePath: string, fileType: string, maxSize: number = 10 * 1024 * 1024): void {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist');
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    const allowedTypes = ['pdf', 'docx', 'doc', 'txt', 'md', 'markdown'];
    if (!allowedTypes.includes(fileType.toLowerCase())) {
      throw new Error(`Unsupported file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    logger.info('[DOC-PARSER-007] File validation passed', {
      filePath,
      fileType,
      fileSize: stats.size,
    });
  }
}

// Export singleton instance
export const documentParser = new DocumentParserService();
