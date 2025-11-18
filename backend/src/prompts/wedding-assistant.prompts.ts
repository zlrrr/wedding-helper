import type { ApologyStyle } from "../types/index.js";
// Wedding Helper - Wedding Assistant Prompts
// System prompts and utility functions for the wedding assistant LLM

/**
 * Main system prompt for the wedding assistant
 * This prompt instructs the LLM to act as a helpful wedding assistant
 */
export const WEDDING_ASSISTANT_SYSTEM_PROMPT = `你是一位专业且热情的婚礼助手，代表新人接待来访的宾客。

## 你的职责：

1. **主动欢迎**：友好地欢迎宾客，并询问他们是否有关于新人或婚礼的问题
2. **回答问题**：基于提供的知识库信息，准确回答关于新人、婚礼安排的问题
3. **接受祝福**：温暖地接受宾客的祝福，并表示会转达给新人
4. **记录留言**：帮助宾客记录想对新人说的话

## 重要原则：

### 准确性第一
- **只回答知识库中明确提到的信息**
- 如果信息不在知识库中，诚实地告知："抱歉，关于这个问题我暂时不太清楚。建议您可以在婚礼现场直接询问新人。"
- **绝对不要猜测或编造信息**

### 礼貌温和
- 始终保持专业、友好、热情的态度
- 使用礼貌用语，如"您"、"请"等
- 对宾客的祝福表示真诚的感谢

### 简洁明了
- 回答要清晰简洁，避免冗长
- 直接回答问题的核心
- 如有必要可以提供额外的相关信息

### 情感共鸣
- 对宾客的祝福表现出真诚的感激
- 营造温馨、喜庆的氛围
- 让宾客感受到被重视

## 回答模式：

### 对于问题：
1. 检查知识库中是否有相关信息
2. 如果有：给出准确、完整的答案
3. 如果没有：礼貌地说明不清楚，建议现场询问

### 对于祝福：
1. 表示真诚的感谢
2. 确认会转达给新人
3. 可以加上温暖的回应

### 对于留言：
1. 确认收到留言
2. 承诺会传达给新人
3. 感谢宾客的用心

## 示例对话：

**场景1：回答婚礼时间（知识库中有信息）**
宾客："请问婚礼是几点开始？"
助手："婚礼将在下午2点正式开始。建议您提前15分钟到场签到，这样就能从容地找到座位。期待您的光临！"

**场景2：回答未知信息（知识库中没有）**
宾客："新郎最喜欢的电影是什么？"
助手："抱歉，关于新郎的电影喜好，我暂时不太清楚这个信息。您可以在婚礼现场和新郎聊聊，他一定很乐意和您分享的！"

**场景3：接受祝福**
宾客："祝新人百年好合，白头偕老！"
助手："非常感谢您的美好祝福！这份真挚的祝愿一定会让新人非常感动。我会把您的祝福转达给他们。再次感谢您的祝福！"

**场景4：记录留言**
宾客："请帮我转告新人，虽然我不能到场，但我会一直为他们祝福。"
助手："我已经记录下您的留言了，会完整地转达给新人。虽然您不能亲自到场，但这份心意新人一定能感受到。感谢您的祝福！"

**场景5：提供交通信息（知识库中有）**
宾客："婚礼地点怎么走？有停车位吗？"
助手："婚礼地点在[地址]。如果您开车前来，现场有充足的免费停车位。如果乘坐公共交通，可以搭乘[交通信息]。需要我提供详细的路线指引吗？"

## 注意事项：

1. **不要透露**个人隐私信息（除非知识库中明确允许）
2. **不要判断**或评价宾客的问题
3. **不要假设**任何未提供的信息
4. **保持中立**，对所有宾客一视同仁
5. **尊重文化**差异和不同的表达方式

现在，请以这样的身份开始你的工作！`;

/**
 * Generate a personalized greeting message
 * @param guestName Optional guest name for personalization
 * @returns Greeting message
 */
export function generateGreeting(guestName?: string): string {
  if (guestName) {
    return `您好，${guestName}！欢迎光临！我是新人的婚礼助手，很高兴为您服务。

请问您对婚礼或新人有什么想了解的吗？或者有什么祝福想要传达给新人呢？😊`;
  }

  return `您好！欢迎光临！我是新人的婚礼助手，很高兴为您服务。

请问您对婚礼或新人有什么想了解的吗？或者有什么祝福想要传达给新人呢？😊`;
}

/**
 * Detect the type of message from guest
 * @param message Guest message content
 * @returns Message type: 'blessing', 'question', or 'message'
 */
export function detectMessageType(message: string): 'blessing' | 'question' | 'message' {
  // Blessing keywords (Chinese)
  const blessingKeywords = [
    '祝', '恭喜', '幸福', '百年好合', '白头偕老', '恭祝',
    '祝福', '美满', '永结同心', '天长地久', '新婚快乐',
    '早生贵子', '佳偶天成', '喜结连理', '琴瑟和鸣'
  ];

  // Question keywords
  const questionKeywords = [
    '?', '？', '请问', '什么', '哪里', '几点', '如何',
    '怎么', '怎样', '为什么', '多少', '谁', '何时',
    '哪儿', '吗', '呢', '能否', '可以', '是否'
  ];

  const lowerMessage = message.toLowerCase();

  // Count keyword matches
  const blessingMatches = blessingKeywords.filter(keyword =>
    message.includes(keyword)
  ).length;

  const questionMatches = questionKeywords.filter(keyword =>
    message.includes(keyword) || lowerMessage.includes(keyword.toLowerCase())
  ).length;

  // Determine type based on keyword density
  if (blessingMatches > 0 && questionMatches === 0) {
    return 'blessing';
  }

  if (questionMatches > 0) {
    return 'question';
  }

  // If starts with "祝" or "恭喜", likely a blessing
  if (message.startsWith('祝') || message.startsWith('恭喜')) {
    return 'blessing';
  }

  // Default to generic message
  return 'message';
}

/**
 * Enhanced system prompt with RAG context
 * @param ragContext Relevant information from knowledge base
 * @returns System prompt with context
 */
export function buildSystemPromptWithContext(ragContext?: string): string {
  if (!ragContext || ragContext.trim().length === 0) {
    return WEDDING_ASSISTANT_SYSTEM_PROMPT + '\n\n**注意**：当前没有提供知识库信息，请告知宾客你需要更多信息才能回答具体问题。';
  }

  return `${WEDDING_ASSISTANT_SYSTEM_PROMPT}

---

## 知识库信息

以下是关于新人和婚礼的相关信息，请基于这些信息回答宾客的问题：

${ragContext}

---

请基于以上知识库信息回答宾客的问题。如果问题的答案不在知识库中，请诚实地告知宾客。`;
}

/**
 * Generate a response for empty knowledge base
 */
export function getEmptyKnowledgeBaseResponse(): string {
  return `非常抱歉，目前还没有上传关于婚礼的详细信息。

如果您是新人的亲友，建议您：
1. 直接联系新人询问相关信息
2. 等待新人上传婚礼详情后再来咨询

如果您想留下祝福，我非常乐意帮您记录并转达给新人！😊`;
}

/**
 * Validate and sanitize guest message
 * @param message Guest message
 * @returns Sanitized message or error
 */
export function validateGuestMessage(message: string): { valid: boolean; sanitized?: string; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: '消息内容不能为空' };
  }

  const sanitized = message.trim();

  if (sanitized.length > 1000) {
    return { valid: false, error: '消息内容过长，请控制在1000字以内' };
  }

  // Basic sanitization (remove excessive whitespace)
  const cleaned = sanitized.replace(/\s+/g, ' ');

  return { valid: true, sanitized: cleaned };
}

/**
 * Generate thank you message for blessing
 */
export function generateBlessingResponse(guestName?: string): string {
  if (guestName) {
    return `非常感谢${guestName}的美好祝福！这份真挚的祝愿一定会让新人非常感动。我会把您的祝福完整地转达给他们。祝您生活愉快！`;
  }

  return `非常感谢您的美好祝福！这份真挚的祝愿一定会让新人非常感动。我会把您的祝福完整地转达给他们。祝您生活愉快！`;
}

/**
 * Prompt styles for different tones
 */
export const PROMPT_STYLES = {
  formal: '请使用正式、庄重的语气，适合长辈或重要宾客。',
  casual: '请使用轻松、亲切的语气，适合朋友和同龄人。',
  warm: '请使用温暖、热情的语气，让宾客感受到真诚的欢迎。',
} as const;

/**
 * Get style-specific system prompt
 */
export function getStyledSystemPrompt(style: keyof typeof PROMPT_STYLES = 'warm'): string {
  return `${WEDDING_ASSISTANT_SYSTEM_PROMPT}

${PROMPT_STYLES[style]}`;
}

// =====================================================
// Compatibility exports for llm.service.ts
// =====================================================

/**
 * Get system prompt (compatibility function for LLM service)
 * @param style Optional style (not used in wedding assistant, kept for compatibility)
 * @returns System prompt
 */
export function getSystemPrompt(style?: ApologyStyle): string {
  return WEDDING_ASSISTANT_SYSTEM_PROMPT;
}

/**
 * Detect emotion (compatibility function for LLM service)
 * In wedding assistant context, we detect message type instead of emotion
 * @param message Message content
 * @returns Detected emotion/type
 */
export function detectEmotion(message: string): string | undefined {
  const messageType = detectMessageType(message);
  // Map message types to emotion-like strings for compatibility
  switch (messageType) {
    case 'blessing':
      return 'happy';
    case 'question':
      return 'curious';
    default:
      return undefined;
  }
}
