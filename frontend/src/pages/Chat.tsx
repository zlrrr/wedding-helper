// Wedding Helper - Chat Page
// Main chat interface for guests to interact with wedding assistant

import React, { useState, useEffect, useRef } from 'react';
import { chatApi } from '../services/api';
import type { ChatMessage, SendMessageResponse } from '../types';
import { logger } from '../utils/logger';

interface ChatPageState {
  messages: ChatMessage[];
  sessionId: string | null;
  isLoading: boolean;
  inputMessage: string;
  guestName: string;
  hasStarted: boolean;
}

const Chat: React.FC = () => {
  const [state, setState] = useState<ChatPageState>({
    messages: [],
    sessionId: null,
    isLoading: false,
    inputMessage: '',
    guestName: '',
    hasStarted: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  /**
   * Start chat session
   */
  const handleStartChat = () => {
    if (!state.guestName.trim()) {
      alert('请输入您的姓名');
      return;
    }
    setState((prev) => ({ ...prev, hasStarted: true }));
    logger.info('[Chat] Chat started', { guestName: state.guestName });
  };

  /**
   * Send message
   */
  const handleSendMessage = async () => {
    if (!state.inputMessage.trim() || state.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      sessionId: state.sessionId || 'new',
      role: 'user',
      content: state.inputMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    // Add user message to UI
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      inputMessage: '',
      isLoading: true,
    }));

    try {
      const response: SendMessageResponse = await chatApi.sendMessage(
        state.sessionId,
        userMessage.content,
        state.guestName
      );

      const assistantMessage: ChatMessage = {
        sessionId: response.sessionId,
        role: 'assistant',
        content: response.response,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        sessionId: response.sessionId,
        isLoading: false,
      }));

      logger.info('[Chat] Message sent successfully', {
        sessionId: response.sessionId,
      });
    } catch (error) {
      logger.error('[Chat] Failed to send message', error);
      setState((prev) => ({ ...prev, isLoading: false }));
      alert('发送消息失败，请重试');
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Welcome screen
  if (!state.hasStarted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-pink-100 animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full mb-4">
              <span className="text-4xl">💐</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">婚礼助手</h1>
            <p className="text-gray-600">欢迎您的光临！</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-2">
                请输入您的姓名
              </label>
              <input
                id="guestName"
                type="text"
                value={state.guestName}
                onChange={(e) => setState((prev) => ({ ...prev, guestName: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleStartChat()}
                placeholder="您的姓名"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
                autoFocus
              />
            </div>

            <button
              onClick={handleStartChat}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
            >
              开始对话
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>我可以帮您了解婚礼信息、回答问题</p>
            <p className="mt-1">或接收您的祝福留言</p>
          </div>
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full">
              <span className="text-2xl">💐</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">婚礼助手</h2>
              <p className="text-sm text-gray-500">很高兴为您服务，{state.guestName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {state.messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </div>
          ))}

          {state.isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white text-gray-800 px-4 py-3 rounded-2xl shadow-md border border-gray-200">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-pink-100 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex space-x-3">
            <textarea
              value={state.inputMessage}
              onChange={(e) => setState((prev) => ({ ...prev, inputMessage: e.target.value }))}
              onKeyPress={handleKeyPress}
              placeholder="输入消息... (按 Enter 发送)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none transition"
              rows={1}
              disabled={state.isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={state.isLoading || !state.inputMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
