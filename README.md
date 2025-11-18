# Wedding Helper - 婚礼助手

基于 LLM 和 RAG 技术的智能婚礼助手，帮助新人自动接待宾客、回答问题、接收祝福。

## 功能特性

### 核心功能
- 🤖 **智能对话**: 使用 LLM（默认 Gemini）自动回答宾客问题
- 📚 **知识库 RAG**: 基于上传的文档精准回答婚礼相关问题
- 💝 **祝福收集**: 自动识别并保存宾客的祝福留言
- 👤 **访客追踪**: 记录宾客姓名和对话历史
- 🔐 **用户认证**: JWT 认证，支持普通用户和管理员角色

### 管理功能（Admin）
- 📄 **文档管理**: 上传、删除知识库文档（支持 PDF, DOCX, TXT, MD）
- 📊 **数据统计**: 查看文档数量、文本块数量
- 💬 **留言查看**: 查看和管理宾客留言

## 技术栈

### 后端
- **语言**: TypeScript
- **框架**: Express.js
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT + bcrypt
- **LLM**: 支持 Gemini, OpenAI, Anthropic, LM Studio
- **文档解析**: pdf-parse, mammoth
- **日志**: Winston

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **HTTP客户端**: Axios
- **状态管理**: React Context

## 快速开始

### 前置要求
- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 配置环境变量

**后端** (`backend/.env`):
```env
# 服务器配置
BACKEND_PORT=5001
NODE_ENV=development

# LLM 配置（默认使用 Gemini）
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-pro
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000

# JWT 密钥
JWT_SECRET=your_jwt_secret_here_at_least_32_characters
SESSION_SECRET=your_session_secret_here

# CORS 配置
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# 可选：默认管理员账号
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
```

**前端** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5001
```

### 启动开发服务器

```bash
# 启动后端（终端 1）
cd backend
npm run dev

# 启动前端（终端 2）
cd frontend
npm run dev
```

前端默认运行在 `http://localhost:5173`
后端默认运行在 `http://localhost:5001`

### 创建管理员账号

如果没有设置 `DEFAULT_ADMIN_USERNAME` 和 `DEFAULT_ADMIN_PASSWORD`，可以手动创建：

```bash
# 使用 API 注册
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

然后在数据库中将用户角色改为 `admin`。

## 使用指南

### 宾客使用流程
1. 访问首页
2. 输入姓名
3. 开始对话
4. 提问或发送祝福

### 管理员使用流程
1. 登录管理员账号
2. 切换到"管理"页面
3. 上传知识库文档（婚礼信息、新人故事等）
4. 查看文档和统计信息

## 部署

### Vercel (前端)

1. 连接 GitHub 仓库到 Vercel
2. 设置构建配置：
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/dist`
3. 添加环境变量：`VITE_API_URL`

或使用 Vercel CLI:
```bash
cd frontend
vercel --prod
```

### Render (后端)

1. 连接 GitHub 仓库到 Render
2. 使用 `render.yaml` 自动配置
3. 添加必需的环境变量：
   - `GEMINI_API_KEY`
   - `JWT_SECRET`
   - `SESSION_SECRET`
   - `FRONTEND_URL` (Vercel URL)

## API 文档

### 认证接口
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/status` - 获取当前用户信息

### 聊天接口
- `POST /api/chat/message` - 发送消息
- `GET /api/chat/sessions` - 获取会话列表
- `GET /api/chat/sessions/:id/messages` - 获取会话历史
- `DELETE /api/chat/sessions/:id` - 删除会话

### 知识库接口（Admin）
- `POST /api/knowledge/upload` - 上传单个文档
- `POST /api/knowledge/upload-batch` - 批量上传
- `POST /api/knowledge/replace-all` - 全量替换
- `GET /api/knowledge/documents` - 获取文档列表
- `GET /api/knowledge/documents/:id` - 获取文档详情
- `DELETE /api/knowledge/documents/:id` - 删除文档
- `GET /api/knowledge/stats` - 获取统计信息

## 项目结构

```
wedding-helper/
├── backend/                 # 后端代码
│   ├── src/
│   │   ├── database/       # 数据库 schema 和服务
│   │   ├── middleware/     # Express 中间件
│   │   ├── prompts/        # LLM prompt 模板
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 业务逻辑服务
│   │   ├── types/          # TypeScript 类型
│   │   └── utils/          # 工具函数
│   ├── data/              # SQLite 数据库和上传文件
│   └── package.json
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── contexts/      # React Context
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API 客户端
│   │   ├── types/         # TypeScript 类型
│   │   └── utils/         # 工具函数
│   └── package.json
├── vercel.json            # Vercel 配置
├── render.yaml            # Render 配置
└── README.md
```

## 开发指南

### 后端开发
```bash
cd backend
npm run dev          # 启动开发服务器（带热重载）
npm run build        # 构建生产版本
npm run test         # 运行测试
```

### 前端开发
```bash
cd frontend
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 支持

如有问题，请提交 Issue 或联系项目维护者。
