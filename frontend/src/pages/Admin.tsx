// Wedding Helper - Admin Knowledge Management Page
// Admin interface for uploading and managing knowledge base documents

import React, { useState, useEffect } from 'react';
import { knowledgeApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { KnowledgeDocument } from '../types';
import { logger } from '../utils/logger';

interface AdminPageState {
  documents: KnowledgeDocument[];
  isLoading: boolean;
  selectedFiles: File[];
  uploadProgress: boolean;
  stats: { documentCount: number; chunkCount: number };
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AdminPageState>({
    documents: [],
    isLoading: true,
    selectedFiles: [],
    uploadProgress: false,
    stats: { documentCount: 0, chunkCount: 0 },
  });

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  /**
   * Load documents
   */
  const loadDocuments = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const docs = await knowledgeApi.getDocuments();
      setState((prev) => ({ ...prev, documents: docs, isLoading: false }));
      logger.info('[Admin] Documents loaded', { count: docs.length });
    } catch (error) {
      logger.error('[Admin] Failed to load documents', error);
      setState((prev) => ({ ...prev, isLoading: false }));
      alert('加载文档失败');
    }
  };

  /**
   * Load statistics
   */
  const loadStats = async () => {
    try {
      const stats = await knowledgeApi.getStats();
      setState((prev) => ({ ...prev, stats }));
    } catch (error) {
      logger.error('[Admin] Failed to load stats', error);
    }
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setState((prev) => ({ ...prev, selectedFiles: files }));
      logger.info('[Admin] Files selected', { count: files.length });
    }
  };

  /**
   * Upload selected files
   */
  const handleUpload = async () => {
    if (state.selectedFiles.length === 0) {
      alert('请先选择文件');
      return;
    }

    try {
      setState((prev) => ({ ...prev, uploadProgress: true }));

      if (state.selectedFiles.length === 1) {
        await knowledgeApi.uploadDocument(state.selectedFiles[0]);
      } else {
        await knowledgeApi.uploadDocuments(state.selectedFiles);
      }

      alert(`成功上传 ${state.selectedFiles.length} 个文档`);
      setState((prev) => ({ ...prev, selectedFiles: [], uploadProgress: false }));

      // Reload documents and stats
      await loadDocuments();
      await loadStats();
    } catch (error) {
      logger.error('[Admin] Upload failed', error);
      setState((prev) => ({ ...prev, uploadProgress: false }));
      alert('上传失败，请重试');
    }
  };

  /**
   * Delete a document
   */
  const handleDelete = async (documentId: number) => {
    if (!confirm('确定要删除这个文档吗？')) {
      return;
    }

    try {
      await knowledgeApi.deleteDocument(documentId);
      alert('文档已删除');
      await loadDocuments();
      await loadStats();
    } catch (error) {
      logger.error('[Admin] Delete failed', error);
      alert('删除失败');
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800 font-medium">访问被拒绝</p>
          <p className="text-red-600 text-sm mt-2">只有管理员可以访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">知识库管理</h1>
          <p className="text-gray-600">上传和管理婚礼信息文档</p>

          {/* Stats */}
          <div className="mt-4 flex space-x-6">
            <div className="bg-blue-50 rounded-lg px-4 py-2">
              <p className="text-sm text-gray-600">文档数量</p>
              <p className="text-2xl font-bold text-blue-600">{state.stats.documentCount}</p>
            </div>
            <div className="bg-purple-50 rounded-lg px-4 py-2">
              <p className="text-sm text-gray-600">文本块数</p>
              <p className="text-2xl font-bold text-purple-600">{state.stats.chunkCount}</p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">上传文档</h2>

          <div className="space-y-4">
            <div>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <p className="text-sm text-gray-500 mt-2">
                支持的格式: PDF, DOCX, TXT, MD (最大 10MB)
              </p>
            </div>

            {state.selectedFiles.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  已选择 {state.selectedFiles.length} 个文件:
                </p>
                <ul className="space-y-1">
                  {state.selectedFiles.map((file, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {file.name} ({formatFileSize(file.size)})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={state.uploadProgress || state.selectedFiles.length === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {state.uploadProgress ? '上传中...' : '上传文档'}
            </button>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">已上传文档</h2>

          {state.isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : state.documents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">还没有上传任何文档</p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{doc.filename}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(doc.fileSize)} • {new Date(doc.uploadDate).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
