# Wedding Helper - Implementation Plan (TDD/SDD)
## 基于参考项目的完整实施计划

---

## 项目概述

**项目名称**: Wedding Helper
**参考项目**: https://github.com/zlrrr/apologize-is-all-you-need.git
**核心功能**:
1. 基于 LLM 的婚礼助手，代替新人接待宾客
2. 通过知识库（RAG）回答关于新人的问题
3. 接受宾客祝福和传话
4. Admin 用户管理知识库文档

**技术栈**:
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS (部署到 Vercel)
- Backend: Express.js + TypeScript + SQLite (部署到 Render)
- LLM: Gemini (默认)，支持多 provider
- RAG: 文档解析 + 向量化 + 相似度搜索

---

## 实施原则

1. **TDD/SDD**: 每个阶段都有明确的测试用例和验收标准
2. **增量开发**: 每完成一个阶段就 commit，确保可以快速恢复
3. **代码复用**: 最大化复用参考项目的代码
4. **数据隔离**: 多用户环境下的数据安全
5. **可测试性**: 每个功能都可以独立测试

---

## Phase 1: 项目初始化和基础架构 (Checkpoint 1)

### 目标
搭建项目基础结构，复用参考项目的核心架构代码

### 任务清单

#### 1.1 创建项目目录结构
- [ ] 创建 `backend/` 和 `frontend/` 目录
- [ ] 创建完整的子目录结构（routes, services, middleware, components 等）

#### 1.2 复制配置文件（直接复用）
- [ ] `backend/tsconfig.json`
- [ ] `backend/vitest.config.ts`
- [ ] `frontend/tsconfig.json`
- [ ] `frontend/tsconfig.node.json`
- [ ] `frontend/vite.config.ts`
- [ ] `frontend/tailwind.config.js`
- [ ] `frontend/postcss.config.js`

#### 1.3 创建 package.json 文件
- [ ] `backend/package.json` - 复制依赖，更新项目名称为 "wedding-helper-backend"
- [ ] `frontend/package.json` - 复制依赖，更新项目名称为 "wedding-helper-frontend"
- [ ] 添加 RAG 相关依赖：
  - `pdf-parse` - PDF 解析
  - `mammoth` - Word 文档解析
  - `marked` - Markdown 解析
  - 可选：`@langchain/community` 或自定义向量化实现

#### 1.4 创建环境变量模板
- [ ] `.env.example`
- [ ] `backend/.env.example`
- [ ] `frontend/.env.example`

#### 1.5 安装依赖
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 验收标准
- [ ] 目录结构完整创建
- [ ] 所有配置文件就位
- [ ] `npm install` 成功无错误
- [ ] TypeScript 配置正确（`tsc --noEmit` 通过）

### 测试用例
```bash
# 测试配置文件有效性
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

### Commit 信息
```
feat: 初始化项目结构和配置文件

- 创建 backend 和 frontend 目录结构
- 复制参考项目的配置文件
- 添加 package.json 和依赖项
- 创建环境变量模板
```

---

## Phase 2: 数据库和认证系统 (Checkpoint 2)

### 目标
建立用户认证系统和数据库基础，支持 Admin 角色

### 任务清单

#### 2.1 复制数据库服务（直接复用）
- [ ] 复制 `backend/src/database/database.service.ts`
- [ ] 复制 `backend/src/utils/logger.ts`

#### 2.2 创建数据库 Schema
创建 `backend/src/database/schema.sql`，包含：

```sql
-- Users 表（从参考项目复制）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

-- Knowledge Base Documents 表（新增）
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,  -- 'pdf', 'docx', 'txt', 'md'
  file_size INTEGER NOT NULL,
  content_text TEXT NOT NULL,  -- 解析后的文本内容
  upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Knowledge Chunks 表（用于 RAG）
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,  -- 在文档中的位置
  embedding_vector TEXT,  -- JSON 格式存储向量（或使用专门的向量数据库）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat Sessions 表（会话管理）
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,  -- UUID
  user_id INTEGER NOT NULL,
  guest_name TEXT,  -- 宾客名称（可选）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat Messages 表
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Guest Messages 表（宾客留言/祝福）
CREATE TABLE IF NOT EXISTS guest_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,  -- 新人的 user_id
  guest_name TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK(message_type IN ('blessing', 'question', 'message')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_user_id ON knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user_id ON knowledge_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_messages_user_id ON guest_messages(user_id);
```

#### 2.3 复制认证相关代码（直接复用）
- [ ] `backend/src/middleware/auth.middleware.ts`
- [ ] `backend/src/middleware/error.middleware.ts`
- [ ] `backend/src/middleware/validation.middleware.ts`
- [ ] `backend/src/services/user.service.ts`
- [ ] `backend/src/routes/auth.routes.ts`
- [ ] `backend/src/types/index.ts`（创建并添加类型定义）

#### 2.4 配置环境变量
`backend/.env` 示例：
```env
BACKEND_PORT=5001
NODE_ENV=development
JWT_SECRET=your-jwt-secret-change-in-production
SESSION_SECRET=your-session-secret-change-in-production
FRONTEND_URL=http://localhost:3000

# Default Admin
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123

# LLM Configuration (Gemini default)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-flash
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000
```

#### 2.5 创建基础服务器
创建 `backend/src/server.ts`（从参考项目改编）

### 验收标准
- [ ] 数据库初始化成功
- [ ] 默认 admin 用户创建成功
- [ ] 用户注册 API 可用
- [ ] 用户登录 API 可用并返回 JWT
- [ ] JWT 验证中间件工作正常

### 测试用例
创建 `backend/tests/auth.test.ts`：
```typescript
describe('Authentication', () => {
  test('Admin user is created on startup', async () => {
    // 验证 admin 用户存在
  });

  test('User can register', async () => {
    // POST /api/auth/register
  });

  test('User can login and receive JWT', async () => {
    // POST /api/auth/login
  });

  test('Protected route requires valid JWT', async () => {
    // GET /api/auth/me
  });

  test('Admin role is enforced', async () => {
    // 测试 requireAdmin 中间件
  });
});
```

运行测试：
```bash
cd backend && npm run test
```

### Commit 信息
```
feat: 实现数据库和认证系统

- 创建数据库 schema（users, knowledge_documents, chat_sessions 等）
- 复制并配置认证中间件
- 实现用户注册和登录功能
- 添加 JWT 验证
- 创建认证测试用例
```

---

## Phase 3: LLM 服务和 Prompt 系统 (Checkpoint 3)

### 目标
配置 LLM 服务（Gemini），创建婚礼助手的 System Prompt

### 任务清单

#### 3.1 复制 LLM 服务
- [ ] 复制 `backend/src/services/llm.service.ts`（支持多 provider）
- [ ] 确保支持 Gemini 作为默认 provider

#### 3.2 创建婚礼助手 Prompt
创建 `backend/src/prompts/wedding-assistant.prompts.ts`：

```typescript
export const WEDDING_ASSISTANT_SYSTEM_PROMPT = `你是一位专业且热情的婚礼助手，代表新人接待宾客。

## 你的职责：

1. **主动询问**：友好地询问宾客是否有关于新人的问题
2. **回答问题**：基于知识库中的信息，准确回答关于新人、婚礼安排的问题
3. **接受祝福**：温暖地接受宾客的祝福，并表示会转达给新人
4. **传递留言**：记录宾客想对新人说的话

## 重要原则：

- **准确性第一**：只回答知识库中明确提到的信息
- **避免猜测**：如果信息不在知识库中，诚实地告知宾客你不确定，并建议他们直接联系新人
- **礼貌温和**：始终保持专业和友好的态度
- **简洁明了**：回答要清晰简洁，避免冗长

## 回答格式：

- 对于问题：先从知识库检索相关信息，然后给出准确答案
- 对于祝福：表示感谢，并确认会转达给新人
- 对于留言：确认收到，并告知会传达

## 示例对话：

宾客："请问婚礼是几点开始？"
助手："根据婚礼安排，婚礼将在[从知识库获取的时间]开始。请提前15分钟到场签到哦！"

宾客："祝新人百年好合！"
助手："非常感谢您的祝福！我会把这份美好的祝愿转达给新人。他们一定会很开心的！"

宾客："新郎的爱好是什么？"
助手（如果知识库中没有）："抱歉，这个信息我暂时不太清楚。建议您可以在婚礼现场直接和新郎交流，他会很乐意分享的！"

现在，请开始你的工作，主动欢迎宾客并询问他们是否有任何问题。`;

// 问候语生成
export function generateGreeting(guestName?: string): string {
  const name = guestName ? guestName : '您';
  return `欢迎${name}！我是新人的婚礼助手，很高兴为您服务。请问您对婚礼或新人有什么想了解的吗？或者有什么祝福想要传达给新人呢？😊`;
}

// 检测消息类型
export function detectMessageType(message: string): 'blessing' | 'question' | 'message' {
  const blessingKeywords = ['祝', '恭喜', '幸福', '百年好合', '白头偕老', '恭祝'];
  const questionKeywords = ['?', '？', '请问', '什么', '哪里', '几点', '如何', '怎么'];

  const hasBlessing = blessingKeywords.some(keyword => message.includes(keyword));
  const hasQuestion = questionKeywords.some(keyword => message.includes(keyword));

  if (hasBlessing && !hasQuestion) return 'blessing';
  if (hasQuestion) return 'question';
  return 'message';
}
```

#### 3.3 创建 Session 服务
创建 `backend/src/services/session.service.ts`（改编自参考项目）：
- 管理聊天会话
- 存储消息历史
- 集成知识库检索（RAG）

### 验收标准
- [ ] LLM 服务可以成功调用 Gemini API
- [ ] System prompt 正确配置
- [ ] 会话创建和消息存储正常
- [ ] 助手会主动发送欢迎消息

### 测试用例
创建 `backend/tests/llm.test.ts`：
```typescript
describe('LLM Service', () => {
  test('Can connect to Gemini API', async () => {
    // 测试 API 连接
  });

  test('Wedding assistant prompt is used', async () => {
    // 验证 system prompt
  });

  test('Session is created with greeting', async () => {
    // 验证新会话自动发送问候语
  });
});
```

### Commit 信息
```
feat: 实现 LLM 服务和婚礼助手 Prompt

- 配置 Gemini LLM 服务
- 创建婚礼助手 system prompt
- 实现会话管理服务
- 添加消息类型检测（祝福/问题/留言）
- 添加 LLM 服务测试
```

---

## Phase 4: 知识库文档管理（Admin 功能）(Checkpoint 4)

### 目标
实现 Admin 用户上传、管理知识库文档的功能

### 任务清单

#### 4.1 添加文件上传依赖
```bash
cd backend
npm install multer @types/multer
npm install pdf-parse mammoth
```

#### 4.2 创建文档解析服务
创建 `backend/src/services/document-parser.service.ts`：

```typescript
export class DocumentParserService {
  /**
   * 解析文档并提取文本
   */
  async parseDocument(
    filePath: string,
    fileType: string
  ): Promise<string> {
    // 根据文件类型解析
    switch (fileType) {
      case 'pdf':
        return await this.parsePDF(filePath);
      case 'docx':
        return await this.parseDOCX(filePath);
      case 'txt':
      case 'md':
        return await this.parsePlainText(filePath);
      default:
        throw new Error('Unsupported file type');
    }
  }

  /**
   * 将文本分块（chunking）
   */
  chunkText(
    text: string,
    chunkSize: number = 500,
    overlap: number = 50
  ): string[] {
    // 实现文本分块逻辑
    // 按句子或段落分割，保持语义完整性
  }

  private async parsePDF(filePath: string): Promise<string> {
    // 使用 pdf-parse
  }

  private async parseDOCX(filePath: string): Promise<string> {
    // 使用 mammoth
  }

  private async parsePlainText(filePath: string): Promise<string> {
    // 使用 fs.readFile
  }
}
```

#### 4.3 创建知识库服务
创建 `backend/src/services/knowledge.service.ts`：

```typescript
export class KnowledgeService {
  constructor(private db: DatabaseService) {}

  /**
   * 上传并处理文档（Admin only）
   */
  async uploadDocument(
    userId: number,
    file: Express.Multer.File
  ): Promise<{ documentId: number; chunksCount: number }> {
    // 1. 解析文档
    const text = await documentParser.parseDocument(file.path, file.mimetype);

    // 2. 保存文档记录
    const documentId = await this.saveDocument(userId, file, text);

    // 3. 文本分块
    const chunks = documentParser.chunkText(text);

    // 4. 保存 chunks（可选：生成 embeddings）
    await this.saveChunks(documentId, userId, chunks);

    return { documentId, chunksCount: chunks.length };
  }

  /**
   * 删除文档（Admin only）
   */
  async deleteDocument(documentId: number, userId: number): Promise<void> {
    // 删除文档和相关 chunks（CASCADE）
  }

  /**
   * 获取所有文档列表（Admin only）
   */
  async listDocuments(userId: number): Promise<KnowledgeDocument[]> {
    // 返回用户的所有文档
  }

  /**
   * 全量覆盖上传（删除旧文档，上传新文档）
   */
  async replaceAllDocuments(
    userId: number,
    files: Express.Multer.File[]
  ): Promise<{ documentsCount: number; chunksCount: number }> {
    // 1. 删除该用户的所有文档
    await this.deleteAllDocuments(userId);

    // 2. 上传所有新文档
    let totalChunks = 0;
    for (const file of files) {
      const result = await this.uploadDocument(userId, file);
      totalChunks += result.chunksCount;
    }

    return { documentsCount: files.length, chunksCount: totalChunks };
  }

  /**
   * RAG 检索：根据问题检索相关知识片段
   */
  async retrieveRelevantChunks(
    userId: number,
    query: string,
    topK: number = 3
  ): Promise<string[]> {
    // 简单实现：关键词匹配
    // TODO: 升级为向量相似度搜索

    const allChunks = await this.db.query(
      'SELECT chunk_text FROM knowledge_chunks WHERE user_id = ?',
      [userId]
    );

    // 简单的 TF-IDF 或关键词匹配
    const scoredChunks = allChunks.map(chunk => ({
      text: chunk.chunk_text,
      score: this.calculateRelevanceScore(query, chunk.chunk_text)
    }));

    // 排序并返回 top K
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(c => c.text);
  }

  private calculateRelevanceScore(query: string, text: string): number {
    // 简单的关键词匹配评分
    const queryWords = query.toLowerCase().split(/\s+/);
    const textLower = text.toLowerCase();

    let score = 0;
    queryWords.forEach(word => {
      if (textLower.includes(word)) {
        score += 1;
      }
    });

    return score;
  }
}
```

#### 4.4 创建知识库路由
创建 `backend/src/routes/knowledge.routes.ts`：

```typescript
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Admin only routes
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  upload.single('document'),
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;
      const result = await knowledgeService.uploadDocument(userId, req.file!);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/upload-batch',
  authenticate,
  requireAdmin,
  upload.array('documents', 10),
  async (req, res, next) => {
    // 批量上传
  }
);

router.post(
  '/replace-all',
  authenticate,
  requireAdmin,
  upload.array('documents', 10),
  async (req, res, next) => {
    // 全量替换
  }
);

router.get(
  '/documents',
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    // 获取文档列表
  }
);

router.delete(
  '/documents/:documentId',
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    // 删除文档
  }
);

export default router;
```

### 验收标准
- [ ] Admin 用户可以上传 PDF/DOCX/TXT/MD 文件
- [ ] 文件被正确解析为文本
- [ ] 文本被分块并存储到数据库
- [ ] Admin 可以查看文档列表
- [ ] Admin 可以删除文档
- [ ] 全量替换功能正常工作
- [ ] 非 Admin 用户无法访问这些接口

### 测试用例
创建 `backend/tests/knowledge.test.ts`：
```typescript
describe('Knowledge Management', () => {
  test('Admin can upload document', async () => {
    // POST /api/knowledge/upload
  });

  test('Document is parsed correctly', async () => {
    // 验证文本提取
  });

  test('Text is chunked into database', async () => {
    // 验证 chunks 表
  });

  test('Admin can delete document', async () => {
    // DELETE /api/knowledge/documents/:id
  });

  test('Non-admin cannot access knowledge routes', async () => {
    // 验证权限
  });

  test('Replace all documents works', async () => {
    // POST /api/knowledge/replace-all
  });
});
```

### Commit 信息
```
feat: 实现知识库文档管理功能

- 添加文档解析服务（PDF/DOCX/TXT/MD）
- 实现文本分块（chunking）
- 创建知识库服务和路由
- 支持上传、删除、全量替换
- Admin 权限保护
- 添加知识库管理测试
```

---

## Phase 5: RAG 集成到聊天流程 (Checkpoint 5)

### 目标
将知识库检索（RAG）集成到 LLM 聊天流程中

### 任务清单

#### 5.1 更新 Chat 服务
修改 `backend/src/services/session.service.ts`，集成 RAG：

```typescript
export class SessionService {
  async processMessage(
    userId: number,
    sessionId: string | null,
    userMessage: string
  ): Promise<{ response: string; sessionId: string }> {
    // 1. 创建或获取会话
    if (!sessionId) {
      sessionId = await this.createSession(userId);
      // 发送欢迎消息
      const greeting = generateGreeting();
      await this.saveMessage(sessionId, userId, 'assistant', greeting);
      return { response: greeting, sessionId };
    }

    // 2. 保存用户消息
    await this.saveMessage(sessionId, userId, 'user', userMessage);

    // 3. 检测消息类型
    const messageType = detectMessageType(userMessage);

    // 4. 如果是祝福，保存到 guest_messages 表
    if (messageType === 'blessing') {
      await this.saveGuestMessage(sessionId, userId, 'blessing', userMessage);
    }

    // 5. RAG 检索相关知识（针对问题）
    let context = '';
    if (messageType === 'question') {
      const relevantChunks = await knowledgeService.retrieveRelevantChunks(
        userId,
        userMessage,
        3  // top 3
      );

      if (relevantChunks.length > 0) {
        context = `\n\n以下是关于新人的相关信息：\n${relevantChunks.join('\n\n')}`;
      }
    }

    // 6. 构建 LLM prompt
    const systemPrompt = WEDDING_ASSISTANT_SYSTEM_PROMPT + context;

    // 7. 获取对话历史（最近 10 条）
    const history = await this.getRecentMessages(sessionId, 10);

    // 8. 调用 LLM
    const response = await llmService.chat(systemPrompt, [
      ...history,
      { role: 'user', content: userMessage }
    ]);

    // 9. 保存助手回复
    await this.saveMessage(sessionId, userId, 'assistant', response.content);

    return { response: response.content, sessionId };
  }
}
```

#### 5.2 创建聊天路由
创建 `backend/src/routes/chat.routes.ts`：

```typescript
router.post('/message', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { sessionId, message } = req.body;

    const result = await sessionService.processMessage(userId, sessionId, message);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const sessions = await sessionService.getUserSessions(userId);
    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

router.get('/history', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.query;
    const messages = await sessionService.getSessionMessages(sessionId as string, userId);
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

router.get('/blessings', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const blessings = await sessionService.getGuestMessages(userId, 'blessing');
    res.json(blessings);
  } catch (error) {
    next(error);
  }
});
```

### 验收标准
- [ ] 用户发送消息时，会触发 RAG 检索
- [ ] 相关知识片段被添加到 LLM 的 context 中
- [ ] LLM 的回答基于检索到的知识
- [ ] 祝福消息被正确分类和保存
- [ ] Admin 可以查看所有宾客祝福

### 测试用例
创建 `backend/tests/rag-chat.test.ts`：
```typescript
describe('RAG Chat Integration', () => {
  beforeAll(async () => {
    // 创建测试用户和上传测试文档
  });

  test('Question triggers RAG retrieval', async () => {
    // 发送问题，验证检索发生
  });

  test('LLM receives context from knowledge base', async () => {
    // 验证 system prompt 包含检索到的信息
  });

  test('LLM answers based on knowledge', async () => {
    // 验证答案准确性
  });

  test('Blessing is saved to guest_messages', async () => {
    // 验证祝福保存
  });

  test('Admin can view all blessings', async () => {
    // GET /api/chat/blessings
  });
});
```

### Commit 信息
```
feat: 集成 RAG 到聊天流程

- 更新会话服务，集成知识库检索
- 实现基于关键词的相关性搜索
- 创建聊天 API 路由
- 自动分类消息类型（问题/祝福/留言）
- Admin 可查看宾客祝福
- 添加 RAG 集成测试
```

---

## Phase 6: 前端基础架构 (Checkpoint 6)

### 目标
搭建前端基础，复用参考项目的认证和 API 客户端

### 任务清单

#### 6.1 复制前端基础文件
- [ ] `frontend/src/utils/logger.ts`
- [ ] `frontend/src/utils/storage.ts`
- [ ] `frontend/src/contexts/AuthContext.tsx`
- [ ] `frontend/src/main.tsx`
- [ ] `frontend/src/App.tsx`（需要改编）
- [ ] `frontend/index.html`

#### 6.2 创建 API 客户端
创建 `frontend/src/services/api.ts`（改编自参考项目）：

```typescript
// 认证 API
export const authApi = {
  register: (username: string, password: string) =>
    api.post('/auth/register', { username, password }),
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
};

// 聊天 API
export const chatApi = {
  sendMessage: (sessionId: string | null, message: string) =>
    api.post('/chat/message', { sessionId, message }),
  getSessions: () => api.get('/chat/sessions'),
  getHistory: (sessionId: string) =>
    api.get(`/chat/history?sessionId=${sessionId}`),
  getBlessings: () => api.get('/chat/blessings'),  // Admin only
};

// 知识库 API（Admin only）
export const knowledgeApi = {
  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    return api.post('/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  uploadBatch: (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));
    return api.post('/knowledge/upload-batch', formData);
  },

  replaceAll: (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));
    return api.post('/knowledge/replace-all', formData);
  },

  getDocuments: () => api.get('/knowledge/documents'),

  deleteDocument: (documentId: number) =>
    api.delete(`/knowledge/documents/${documentId}`),
};
```

#### 6.3 复制登录页面
- [ ] 复制 `frontend/src/components/AuthPage.tsx`（可能需要调整样式）

### 验收标准
- [ ] 前端项目可以启动（`npm run dev`）
- [ ] 登录页面正常显示
- [ ] 可以注册新用户
- [ ] 可以登录并获取 token
- [ ] Token 自动添加到 API 请求头
- [ ] 认证状态在 localStorage 中持久化

### 测试
```bash
cd frontend
npm run dev
# 访问 http://localhost:3000
# 测试登录和注册
```

### Commit 信息
```
feat: 搭建前端基础架构

- 复制前端配置和工具文件
- 创建 API 客户端（认证、聊天、知识库）
- 实现 AuthContext 状态管理
- 添加登录/注册页面
- 配置 Vite 开发代理
```

---

## Phase 7: 前端聊天界面 (Checkpoint 7)

### 目标
创建宾客聊天界面，展示婚礼助手的对话

### 任务清单

#### 7.1 创建聊天组件
创建 `frontend/src/components/ChatInterface.tsx`：

```typescript
export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // 初始化：创建会话并获取欢迎消息
  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      const response = await chatApi.sendMessage(null, '');
      setSessionId(response.sessionId);
      setMessages([{
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to initialize chat', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    // 添加用户消息到界面
    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatApi.sendMessage(sessionId, input);

      // 添加助手回复
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to send message', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <MessageBubble key={index} message={msg} />
        ))}
        {loading && <LoadingIndicator />}
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="请输入您的问题或祝福..."
        />
        <button onClick={sendMessage}>发送</button>
      </div>
    </div>
  );
}
```

#### 7.2 创建消息气泡组件
创建 `frontend/src/components/MessageBubble.tsx`

#### 7.3 创建会话列表（可选）
创建 `frontend/src/components/SessionList.tsx`

### 验收标准
- [ ] 聊天界面正常显示
- [ ] 进入页面自动显示欢迎消息
- [ ] 可以发送消息并收到回复
- [ ] 消息气泡样式正确（用户/助手区分）
- [ ] 滚动到最新消息

### 测试
- 手动测试聊天流程
- 测试不同类型的消息（问题、祝福、留言）

### Commit 信息
```
feat: 实现前端聊天界面

- 创建 ChatInterface 组件
- 实现消息发送和接收
- 添加消息气泡组件
- 自动显示欢迎消息
- 添加加载状态指示器
```

---

## Phase 8: Admin 知识库管理界面 (Checkpoint 8)

### 目标
创建 Admin 专用的知识库管理界面

### 任务清单

#### 8.1 创建知识库管理组件
创建 `frontend/src/components/KnowledgeManager.tsx`：

```typescript
export function KnowledgeManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const docs = await knowledgeApi.getDocuments();
    setDocuments(docs);
  };

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      await knowledgeApi.uploadBatch(Array.from(files));
      await loadDocuments();
      alert('上传成功！');
    } catch (error) {
      alert('上传失败：' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleReplaceAll = async (files: FileList) => {
    if (!confirm('确定要替换所有文档吗？这将删除现有的所有文档。')) {
      return;
    }

    setUploading(true);
    try {
      await knowledgeApi.replaceAll(Array.from(files));
      await loadDocuments();
      alert('替换成功！');
    } catch (error) {
      alert('替换失败：' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm('确定要删除这个文档吗？')) return;

    try {
      await knowledgeApi.deleteDocument(docId);
      await loadDocuments();
    } catch (error) {
      alert('删除失败：' + error.message);
    }
  };

  return (
    <div className="knowledge-manager">
      <h2>知识库管理</h2>

      <div className="upload-section">
        <label>
          上传文档（支持 PDF, DOCX, TXT, MD）
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
            disabled={uploading}
          />
        </label>

        <label>
          全量替换（删除现有文档）
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => e.target.files && handleReplaceAll(e.target.files)}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="documents-list">
        <h3>已上传文档</h3>
        {documents.length === 0 && <p>暂无文档</p>}
        {documents.map(doc => (
          <div key={doc.id} className="document-item">
            <span>{doc.original_filename}</span>
            <span>{doc.file_type}</span>
            <span>{(doc.file_size / 1024).toFixed(2)} KB</span>
            <button onClick={() => handleDelete(doc.id)}>删除</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 8.2 创建宾客祝福查看组件
创建 `frontend/src/components/BlessingsViewer.tsx`：

```typescript
export function BlessingsViewer() {
  const [blessings, setBlessings] = useState<GuestMessage[]>([]);

  useEffect(() => {
    loadBlessings();
  }, []);

  const loadBlessings = async () => {
    const data = await chatApi.getBlessings();
    setBlessings(data);
  };

  return (
    <div className="blessings-viewer">
      <h2>宾客祝福</h2>
      {blessings.length === 0 && <p>暂无祝福</p>}
      {blessings.map(blessing => (
        <div key={blessing.id} className="blessing-card">
          <div className="guest-name">{blessing.guest_name || '匿名宾客'}</div>
          <div className="content">{blessing.content}</div>
          <div className="timestamp">
            {new Date(blessing.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### 8.3 创建 Admin Dashboard
创建 `frontend/src/components/AdminDashboard.tsx`：

```typescript
export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'blessings'>('knowledge');

  return (
    <div className="admin-dashboard">
      <nav>
        <button onClick={() => setActiveTab('knowledge')}>知识库管理</button>
        <button onClick={() => setActiveTab('blessings')}>宾客祝福</button>
      </nav>

      <div className="content">
        {activeTab === 'knowledge' && <KnowledgeManager />}
        {activeTab === 'blessings' && <BlessingsViewer />}
      </div>
    </div>
  );
}
```

#### 8.4 更新 App.tsx 路由
```typescript
function App() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  return <ChatInterface />;
}
```

### 验收标准
- [ ] Admin 用户登录后看到 Admin Dashboard
- [ ] 可以上传文档（单个或多个）
- [ ] 可以查看已上传文档列表
- [ ] 可以删除文档
- [ ] 可以全量替换文档
- [ ] 可以查看所有宾客祝福
- [ ] 普通用户只看到聊天界面

### 测试
- 使用 admin 账户测试所有功能
- 验证文件上传和删除
- 验证祝福查看

### Commit 信息
```
feat: 实现 Admin 知识库管理界面

- 创建知识库管理组件
- 支持文档上传（单个/批量）
- 支持文档删除
- 支持全量替换
- 创建宾客祝福查看器
- 实现 Admin Dashboard
- 更新路由逻辑
```

---

## Phase 9: 部署配置 (Checkpoint 9)

### 目标
配置 Vercel 和 Render 部署

### 任务清单

#### 9.1 配置 Vercel（前端）
创建 `vercel.json`：

```json
{
  "version": 2,
  "name": "wedding-helper-frontend",
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite",
  "devCommand": "cd frontend && npm run dev",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### 9.2 配置 Render（后端）
创建 `backend/Dockerfile`（可选）或使用 Render 的 Node.js 环境

在 Render Dashboard 配置环境变量：
- `NODE_ENV=production`
- `JWT_SECRET=<strong-secret>`
- `SESSION_SECRET=<strong-secret>`
- `FRONTEND_URL=https://your-wedding-helper.vercel.app`
- `DEFAULT_ADMIN_USERNAME=admin`
- `DEFAULT_ADMIN_PASSWORD=<secure-password>`
- `LLM_PROVIDER=gemini`
- `GEMINI_API_KEY=<your-key>`

#### 9.3 更新 CORS 配置
确保 `backend/src/server.ts` 中的 CORS 配置支持生产环境：

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

#### 9.4 创建部署文档
创建 `DEPLOYMENT.md` 文档说明部署步骤

### 验收标准
- [ ] Vercel 配置文件正确
- [ ] 可以成功部署前端到 Vercel
- [ ] 可以成功部署后端到 Render
- [ ] 生产环境的前后端可以通信
- [ ] CORS 配置正确
- [ ] HTTPS 正常工作

### 测试
- 部署到 staging 环境测试
- 验证所有功能在生产环境正常工作

### Commit 信息
```
feat: 配置生产环境部署

- 添加 Vercel 配置文件
- 配置 CORS for production
- 添加安全 headers
- 创建部署文档
- 配置环境变量模板
```

---

## Phase 10: 优化和完善 (Checkpoint 10)

### 目标
优化性能、用户体验和代码质量

### 任务清单

#### 10.1 RAG 优化（可选升级）
- [ ] 考虑使用向量数据库（如 ChromaDB、Pinecone）
- [ ] 实现向量 embeddings（使用 OpenAI Embeddings API 或本地模型）
- [ ] 改进相似度搜索算法

创建 `backend/src/services/embedding.service.ts`（可选）：
```typescript
export class EmbeddingService {
  /**
   * 生成文本的向量表示
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // 调用 OpenAI Embeddings API 或使用本地模型
    // 返回向量
  }

  /**
   * 计算向量相似度（余弦相似度）
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    // 计算余弦相似度
  }
}
```

#### 10.2 添加日志和监控
- [ ] 确保所有关键操作都有日志
- [ ] 添加性能监控
- [ ] 添加错误追踪

#### 10.3 国际化（可选）
- [ ] 复制 i18n 配置
- [ ] 添加中英文翻译

#### 10.4 UI/UX 优化
- [ ] 添加加载动画
- [ ] 优化移动端适配
- [ ] 添加错误提示
- [ ] 改进样式

#### 10.5 文档完善
- [ ] 完善 README.md
- [ ] 添加 API 文档
- [ ] 添加用户手册

### 验收标准
- [ ] 代码质量良好（无 lint 错误）
- [ ] 所有测试通过
- [ ] 文档完善
- [ ] 性能优化完成

### Commit 信息
```
feat: 优化和完善

- 优化 RAG 检索性能
- 添加日志和监控
- 改进 UI/UX
- 完善文档
- 代码质量优化
```

---

## 测试策略总结

### 单元测试
- [ ] 认证服务测试
- [ ] 知识库服务测试
- [ ] 文档解析测试
- [ ] RAG 检索测试
- [ ] 会话管理测试

### 集成测试
- [ ] 完整的聊天流程测试
- [ ] Admin 功能测试
- [ ] 多用户数据隔离测试

### E2E 测试（可选）
- [ ] 用户注册登录流程
- [ ] 宾客聊天流程
- [ ] Admin 管理流程

### 运行所有测试
```bash
# Backend tests
cd backend && npm run test

# Frontend tests (if any)
cd frontend && npm run test

# Integration tests
npm run test:integration
```

---

## 最终检查清单

### 功能完整性
- [ ] ✅ 用户认证（注册、登录、JWT）
- [ ] ✅ Admin 角色管理
- [ ] ✅ 知识库文档上传（PDF/DOCX/TXT/MD）
- [ ] ✅ 文档解析和分块
- [ ] ✅ RAG 检索
- [ ] ✅ LLM 聊天（Gemini）
- [ ] ✅ 婚礼助手 Prompt
- [ ] ✅ 消息类型检测（问题/祝福/留言）
- [ ] ✅ 宾客祝福记录和查看
- [ ] ✅ 全量替换文档
- [ ] ✅ 前端聊天界面
- [ ] ✅ Admin 管理界面
- [ ] ✅ 部署到 Vercel 和 Render

### 安全性
- [ ] ✅ JWT 认证
- [ ] ✅ 密码加密（bcrypt）
- [ ] ✅ Admin 权限保护
- [ ] ✅ 数据隔离
- [ ] ✅ CORS 配置
- [ ] ✅ 安全 headers
- [ ] ✅ 环境变量保护

### 性能
- [ ] ✅ 数据库索引
- [ ] ✅ 分页（如需要）
- [ ] ✅ 缓存（如需要）
- [ ] ✅ 前端优化

### 代码质量
- [ ] ✅ TypeScript 类型完整
- [ ] ✅ 错误处理完善
- [ ] ✅ 日志记录完整
- [ ] ✅ 代码注释充分
- [ ] ✅ 测试覆盖率 >80%

### 文档
- [ ] ✅ README.md
- [ ] ✅ API 文档
- [ ] ✅ 部署文档
- [ ] ✅ 用户手册

---

## 时间估算

| Phase | 任务 | 预估时间 |
|-------|------|---------|
| 1 | 项目初始化 | 1-2 小时 |
| 2 | 数据库和认证 | 2-3 小时 |
| 3 | LLM 和 Prompt | 1-2 小时 |
| 4 | 知识库管理 | 3-4 小时 |
| 5 | RAG 集成 | 2-3 小时 |
| 6 | 前端基础 | 1-2 小时 |
| 7 | 聊天界面 | 2-3 小时 |
| 8 | Admin 界面 | 2-3 小时 |
| 9 | 部署配置 | 1-2 小时 |
| 10 | 优化完善 | 2-3 小时 |
| **总计** | | **17-27 小时** |

---

## 成功标准

项目成功的标志：
1. ✅ 宾客可以通过聊天界面与婚礼助手对话
2. ✅ 助手基于知识库准确回答关于新人的问题
3. ✅ 助手不会对知识库外的信息进行胡乱回答
4. ✅ 宾客的祝福被正确记录
5. ✅ Admin 可以上传、管理知识库文档
6. ✅ 系统支持多用户，数据安全隔离
7. ✅ 成功部署到 Vercel 和 Render
8. ✅ 所有核心功能测试通过

---

## 附录

### 技术债务追踪
- [ ] 考虑使用专业的向量数据库（当前使用简单的关键词匹配）
- [ ] 考虑添加缓存层（Redis）
- [ ] 考虑添加速率限制
- [ ] 考虑添加更详细的分析统计

### 未来扩展
- [ ] 支持更多文档格式（Excel, PPT 等）
- [ ] 支持图片识别（OCR）
- [ ] 支持语音输入/输出
- [ ] 支持多语言切换
- [ ] 支持主题定制
- [ ] 支持婚礼倒计时
- [ ] 支持 RSVP 管理

---

## 开始开发

准备好了吗？让我们开始 Phase 1！

```bash
# 确保你在项目根目录
cd /home/user/wedding-helper

# 开始 Phase 1
git checkout -b claude/wedding-helper-llm-01Dx5g2K7eC8AqKh4KW1XLox
```
