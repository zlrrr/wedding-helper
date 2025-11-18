import type { LLMMessage } from "../types/index.js";
import axios, { AxiosInstance } from 'axios';
import {
  ChatMessage,
  ApologyRequest,
  ApologyResponse,
  LLMConfig,
  LLMError,
  OpenAIChatRequest,
  OpenAIChatResponse,
  ApologyStyle,
  LLMProvider,
} from '../types/index.js';
import { getSystemPrompt, detectEmotion } from '../prompts/wedding-assistant.prompts.js';

export class LLMService {
  private client: AxiosInstance;
  private config: Required<LLMConfig>;
  private provider: LLMProvider;

  constructor(config?: Partial<LLMConfig>) {
    // Detect provider from environment or config
    this.provider = (config?.provider || process.env.LLM_PROVIDER || 'lm-studio') as LLMProvider;

    // Get provider-specific configuration
    const providerConfig = this.getProviderConfig(this.provider);

    // Default configuration
    this.config = {
      provider: this.provider,
      baseURL: config?.baseURL || providerConfig.baseURL || '',
      apiKey: config?.apiKey || providerConfig.apiKey || '',
      model: config?.model || providerConfig.model || 'default-model',
      temperature: config?.temperature || parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      maxTokens: config?.maxTokens || parseInt(process.env.LLM_MAX_TOKENS || '2000'),
      timeout: config?.timeout || 30000,
      apiUrl: config?.apiUrl || config?.baseURL || providerConfig.baseURL || "",
    };

    // Create axios instance with provider-specific headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key to headers based on provider
    if (this.config.apiKey) {
      if (this.provider === 'anthropic') {
        headers['x-api-key'] = this.config.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else if (this.provider === 'openai' || this.provider === 'custom') {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      // Note: Gemini uses API key as query parameter, not in headers
    }

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers,
    });
  }

  /**
   * Get provider-specific configuration from environment variables
   */
  private getProviderConfig(provider: LLMProvider): Partial<LLMConfig> {
    switch (provider) {
      case 'openai':
        return {
          baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        };
      case 'anthropic':
        return {
          baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        };
      case 'gemini':
        return {
          baseURL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
          apiKey: process.env.GEMINI_API_KEY,
          model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        };
      case 'custom':
        return {
          baseURL: process.env.CUSTOM_BASE_URL,
          apiKey: process.env.CUSTOM_API_KEY,
          model: process.env.CUSTOM_MODEL || 'custom-model',
        };
      case 'lm-studio':
      default:
        return {
          baseURL: process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234',
          model: process.env.LLM_MODEL_NAME || 'local-model',
        };
    }
  }

  /**
   * Generate an apology response based on user message
   */
  async generateApology(params: ApologyRequest): Promise<ApologyResponse> {
    const startTime = Date.now();
    const logger = (await import('../utils/logger.js')).default;

    try {
      const { message, style = 'gentle', history = [] } = params;

      logger.info('[LLM-001] Starting apology generation', {
        messageLength: message.length,
        style,
        historyLength: history.length,
        provider: this.provider,
        model: this.config.model,
      });

      // Detect emotion from user message
      const detectedEmotion = params.emotion || detectEmotion(message);

      logger.info('[LLM-002] Emotion detected', {
        emotion: detectedEmotion,
        messagePreview: message.substring(0, 50),
      });

      // Build messages array
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: getSystemPrompt(style),
        },
        ...history,
        {
          role: 'user',
          content: message,
        },
      ];

      logger.info('[LLM-003] Calling LLM API', {
        provider: this.provider,
        model: this.config.model,
        baseURL: this.config.baseURL,
        messagesCount: messages.length,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      // Call LLM API
      const response = await this.chatCompletion({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const duration = Date.now() - startTime;

      logger.info('[LLM-004] LLM API call successful', {
        provider: this.provider,
        model: this.config.model,
        duration: `${duration}ms`,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        thoughtsTokens: (response.usage as any).thoughts_tokens || 0,  // Gemini 2.5+ internal reasoning
        replyLength: response.choices[0].message.content.length,
      });

      // Log successful LLM call
      const { logLLMCall } = await import('../utils/logger.js');
      logLLMCall({
        provider: this.provider,
        model: this.config.model,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        duration,
      });

      return {
        apology: response.choices[0].message.content,
        emotion: detectedEmotion,
        tokensUsed: response.usage.total_tokens,
        model: this.config.model,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('[LLM-ERROR] Apology generation failed', {
        provider: this.provider,
        model: this.config.model,
        baseURL: this.config.baseURL,
        duration: `${duration}ms`,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: (error as any).code,
        errorStatus: (error as any).response?.status,
      });

      // Log failed LLM call
      const { logLLMCall } = await import('../utils/logger.js');
      logLLMCall({
        provider: this.provider,
        model: this.config.model,
        duration,
        error,
      });

      throw this.handleError(error);
    }
  }

  /**
   * Send a chat completion request to the LLM provider
   */
  async chatCompletion(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    try {
      if (this.provider === 'anthropic') {
        return await this.anthropicChatCompletion(request);
      } else if (this.provider === 'gemini') {
        return await this.geminiChatCompletion(request);
      } else {
        // OpenAI-compatible API (OpenAI, LM Studio, Custom)
        return await this.openAIChatCompletion(request);
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * OpenAI-compatible chat completion (OpenAI, LM Studio, Custom providers)
   */
  private async openAIChatCompletion(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    const response = await this.client.post<OpenAIChatResponse>(
      '/v1/chat/completions',
      request
    );

    return response.data;
  }

  /**
   * Anthropic-specific chat completion
   */
  private async anthropicChatCompletion(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    // Extract system message from messages
    const systemMessage = request.messages.find(m => m.role === 'system');
    const conversationMessages = request.messages.filter(m => m.role !== 'system');

    // Convert to Anthropic format
    const anthropicRequest = {
      model: this.config.model,
      max_tokens: request.max_tokens || this.config.maxTokens,
      temperature: request.temperature,
      system: systemMessage?.content,
      messages: conversationMessages,
    };

    const response = await this.client.post('/messages', anthropicRequest);

    // Convert Anthropic response to OpenAI format
    const anthropicData = response.data;
    return {
      id: anthropicData.id,
      object: 'chat.completion',
      created: Date.now(),
      model: anthropicData.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: anthropicData.content[0].text,
          },
          finish_reason: anthropicData.stop_reason || 'stop',
        },
      ],
      usage: {
        prompt_tokens: anthropicData.usage.input_tokens,
        completion_tokens: anthropicData.usage.output_tokens,
        total_tokens: anthropicData.usage.input_tokens + anthropicData.usage.output_tokens,
      },
    };
  }

  /**
   * Google Gemini-specific chat completion
   */
  private async geminiChatCompletion(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    // Combine all messages into a single conversation history for Gemini
    const systemMessage = request.messages.find(m => m.role === 'system');
    const conversationMessages = request.messages.filter(m => m.role !== 'system');

    // Convert to Gemini format
    const contents = conversationMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Prepend system message to first user message if exists
    if (systemMessage && contents.length > 0 && contents[0].role === 'user') {
      contents[0].parts[0].text = `${systemMessage.content}\n\n${contents[0].parts[0].text}`;
    }

    const geminiRequest = {
      contents,
      generationConfig: {
        temperature: request.temperature || this.config.temperature,
        maxOutputTokens: request.max_tokens || this.config.maxTokens,
      },
    };

    // Gemini uses API key as query parameter
    const url = `/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    const response = await this.client.post(url, geminiRequest);

    // Convert Gemini response to OpenAI format
    const geminiData = response.data;

    // Log raw Gemini response for debugging
    const logger = (await import('../utils/logger.js')).default;
    logger.info('[LLM-GEMINI-RAW] Raw Gemini API response', {
      hasCandidates: !!geminiData.candidates,
      candidatesCount: geminiData.candidates?.length || 0,
      firstCandidate: geminiData.candidates?.[0] ? {
        finishReason: geminiData.candidates[0].finishReason,
        hasSafetyRatings: !!geminiData.candidates[0].safetyRatings,
        safetyRatings: geminiData.candidates[0].safetyRatings,
        hasContent: !!geminiData.candidates[0].content,
        partsCount: geminiData.candidates[0].content?.parts?.length || 0,
        textPreview: geminiData.candidates[0].content?.parts?.[0]?.text?.substring(0, 100) || 'NO_TEXT',
      } : null,
      usageMetadata: {
        promptTokenCount: geminiData.usageMetadata?.promptTokenCount || 0,
        candidatesTokenCount: geminiData.usageMetadata?.candidatesTokenCount || 0,
        totalTokenCount: geminiData.usageMetadata?.totalTokenCount || 0,
        thoughtsTokenCount: geminiData.usageMetadata?.thoughtsTokenCount || 0,  // Key metric for Gemini 2.5
      },
      promptFeedback: geminiData.promptFeedback,
    });

    const candidate = geminiData.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';

    // Check for safety blocks or other issues
    if (!text && candidate) {
      const thoughtsTokenCount = geminiData.usageMetadata?.thoughtsTokenCount || 0;
      const maxTokens = request.max_tokens || this.config.maxTokens;

      logger.warn('[LLM-GEMINI-EMPTY] Gemini returned empty content', {
        finishReason: candidate.finishReason,
        safetyRatings: candidate.safetyRatings,
        promptFeedback: geminiData.promptFeedback,
        thoughtsTokenCount,
        maxTokens,
        issue: candidate.finishReason === 'MAX_TOKENS' && thoughtsTokenCount > maxTokens * 0.8
          ? `Thoughts consumed ${thoughtsTokenCount} tokens out of ${maxTokens} maxTokens, leaving no room for output. Increase maxTokens.`
          : 'Unknown issue',
      });
    }

    return {
      id: `gemini-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now(),
      model: this.config.model || 'gemini-1.5-flash',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text,
          },
          finish_reason: candidate?.finishReason?.toLowerCase() || 'stop',
        },
      ],
      usage: {
        prompt_tokens: geminiData.usageMetadata?.promptTokenCount || 0,
        completion_tokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: geminiData.usageMetadata?.totalTokenCount || 0,
        // Gemini 2.5+ specific: internal reasoning tokens
        thoughts_tokens: geminiData.usageMetadata?.thoughtsTokenCount || 0,
      } as any,
    };
  }

  /**
   * Check if LLM provider is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (this.provider === 'anthropic') {
        // For Anthropic, try a minimal request
        const response = await this.client.post('/messages', {
          model: this.config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        });
        return response.status === 200;
      } else {
        // For OpenAI-compatible APIs
        const response = await this.client.get('/v1/models', {
          timeout: 5000,
        });
        return response.status === 200;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available models from provider
   */
  async getModels(): Promise<any> {
    try {
      if (this.provider === 'anthropic') {
        // Anthropic doesn't have a models endpoint, return configured model
        return {
          data: [
            {
              id: this.config.model,
              object: 'model',
              created: Date.now(),
              owned_by: 'anthropic',
            },
          ],
        };
      } else {
        // OpenAI-compatible APIs
        const response = await this.client.get('/v1/models');
        return response.data;
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: unknown): LLMError {
    // If error is already an LLMError, return it directly
    if (error instanceof LLMError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      // Check for connection refused errors
      if (error.code === 'ECONNREFUSED' ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('connect') && error.message?.includes('refused')) {
        return new LLMError(
          'CONNECTION_REFUSED',
          'Cannot connect to LM Studio. Please ensure LM Studio is running.',
          error
        );
      }

      // Check for response errors
      if (error.response) {
        return new LLMError(
          'API_ERROR',
          `LM Studio API error: ${error.response.statusText}`,
          error,
          error.response.status
        );
      }

      // Check for timeout errors
      if (error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNABORTED' ||
          error.message?.includes('timeout')) {
        return new LLMError(
          'TIMEOUT',
          'Request to LM Studio timed out',
          error
        );
      }

      // Other network errors
      return new LLMError(
        'NETWORK_ERROR',
        `Network error: ${error.message}`,
        error
      );
    }

    if (error instanceof Error) {
      return new LLMError(
        'UNKNOWN_ERROR',
        error.message,
        error
      );
    }

    return new LLMError(
      'UNKNOWN_ERROR',
      'An unknown error occurred'
    );
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };

    // Update provider if changed
    if (config.provider) {
      this.provider = config.provider;
    }

    // Recreate axios instance if baseURL, apiKey, or provider changed
    if (config.baseURL || config.apiKey || config.provider) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key to headers based on provider
      if (this.config.apiKey) {
        if (this.provider === 'anthropic') {
          headers['x-api-key'] = this.config.apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else if (this.provider === 'openai' || this.provider === 'custom') {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
      }

      this.client = axios.create({
        baseURL: this.config.baseURL,
        timeout: this.config.timeout,
        headers,
      });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<LLMConfig> {
    return { ...this.config };
  }
}

// Export a singleton instance
export const llmService = new LLMService();
