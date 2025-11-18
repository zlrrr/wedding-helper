# Wedding Helper 部署指南

完整的部署教程，从零开始将项目部署到 Vercel（前端）和 Render（后端）。

## 📋 部署前准备清单

### 1. 必需账号
- [ ] GitHub 账号（用于代码托管）
- [ ] Vercel 账号（用于前端部署）- https://vercel.com
- [ ] Render 账号（用于后端部署）- https://render.com
- [ ] Google AI Studio 账号（用于获取 Gemini API Key）- https://makersuite.google.com/app/apikey

### 2. 本地工具
- [ ] Git 已安装
- [ ] Node.js 18+ 已安装
- [ ] 代码编辑器（如 VS Code）

---

## 🚀 第一步：准备代码仓库

### 1.1 推送代码到 GitHub（手动操作）

如果还没有推送到 GitHub：

```bash
# 1. 在 GitHub 上创建新仓库
#    访问 https://github.com/new
#    仓库名：wedding-helper
#    设置为 Public（公开）或 Private（私有，需要付费计划）

# 2. 在本地项目目录执行
cd /path/to/wedding-helper

# 3. 添加远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/wedding-helper.git

# 4. 推送代码
git branch -M main
git push -u origin main
```

**自动完成的部分：**
- Git 会自动追踪文件变化
- GitHub 会自动接收并存储代码

**需要手动操作：**
- 在 GitHub 创建仓库
- 执行 git 命令
- 输入 GitHub 用户名和密码（或 token）

---

## 📱 第二步：部署前端到 Vercel

### 2.1 注册/登录 Vercel（手动操作）

1. 访问 https://vercel.com
2. 点击 "Sign Up" 或 "Log In"
3. **推荐：使用 GitHub 账号登录**（这样可以自动关联仓库）
4. 授权 Vercel 访问您的 GitHub

### 2.2 导入项目（手动操作）

1. 登录后，点击 "Add New..." → "Project"
2. 在 "Import Git Repository" 页面：
   - 找到您的 `wedding-helper` 仓库
   - 点击 "Import"

### 2.3 配置项目（手动操作）

在配置页面，按以下设置：

```
Project Name: wedding-helper-frontend
Framework Preset: Vite
Root Directory: ./frontend          ← 重要！选择 frontend 目录
Build Command: npm run build         ← 自动检测到
Output Directory: dist               ← 自动检测到
Install Command: npm install         ← 自动检测到
```

**关键步骤：设置 Root Directory**
- 点击 "Root Directory" 旁边的 "Edit"
- 选择 `frontend` 文件夹
- 点击 "Continue"

### 2.4 配置环境变量（手动操作）

在 "Environment Variables" 部分，添加：

```
Name: VITE_API_URL
Value: 暂时留空（等后端部署完成后再填写）
```

**注意：** 暂时先不填写这个值，等 Render 后端部署完成后会得到后端 URL。

### 2.5 开始部署（自动完成）

1. 点击 "Deploy" 按钮
2. **Vercel 会自动完成以下操作：**
   - ✅ 克隆 GitHub 仓库
   - ✅ 进入 frontend 目录
   - ✅ 运行 `npm install`
   - ✅ 运行 `npm run build`
   - ✅ 部署生成的文件
   - ✅ 分配域名

3. 等待 2-3 分钟，部署完成后会显示：
   ```
   ✅ Production: Ready
   ```

4. **记录前端 URL**（非常重要！）
   - 格式类似：`https://wedding-helper-frontend-xxx.vercel.app`
   - 复制这个 URL，后面配置后端时需要用到

---

## 🖥️ 第三步：部署后端到 Render

### 3.1 注册/登录 Render（手动操作）

1. 访问 https://render.com
2. 点击 "Get Started" 或 "Sign In"
3. **推荐：使用 GitHub 账号登录**
4. 授权 Render 访问您的 GitHub

### 3.2 创建新 Web Service（手动操作）

1. 在 Render Dashboard，点击 "New +" → "Web Service"
2. 选择 "Build and deploy from a Git repository"
3. 点击 "Next"

### 3.3 连接 GitHub 仓库（手动操作）

1. 如果是第一次使用，点击 "Configure account" 授权 Render 访问 GitHub
2. 找到您的 `wedding-helper` 仓库
3. 点击 "Connect"

### 3.4 配置 Web Service（手动操作）

**基本配置：**

```
Name: wedding-helper-backend
Region: Singapore（选择离用户最近的区域）
Branch: main
Root Directory: backend              ← 重要！
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```

**选择计划：**
```
Instance Type: Free                  ← 免费套餐足够测试使用
```

### 3.5 配置环境变量（手动操作 - 最重要的部分！）

向下滚动到 "Environment Variables" 部分，点击 "Add Environment Variable"，逐个添加以下变量：

#### 必需的环境变量（一定要配置）：

1. **NODE_ENV**
   ```
   Key: NODE_ENV
   Value: production
   ```

2. **BACKEND_PORT**
   ```
   Key: BACKEND_PORT
   Value: 5001
   ```

3. **JWT_SECRET**（需要生成一个随机字符串）
   ```
   Key: JWT_SECRET
   Value: 使用下面的方法生成一个
   ```

   **生成方法（在本地终端执行）：**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   复制输出的字符串，粘贴到 Value 中

4. **SESSION_SECRET**（同样需要生成）
   ```
   Key: SESSION_SECRET
   Value: 使用上面的方法再生成一个不同的字符串
   ```

5. **GEMINI_API_KEY**（需要从 Google AI Studio 获取）
   ```
   Key: GEMINI_API_KEY
   Value: 您的 Gemini API Key
   ```

   **获取 Gemini API Key：**
   - 访问 https://makersuite.google.com/app/apikey
   - 登录 Google 账号
   - 点击 "Create API Key"
   - 复制生成的 API Key

6. **LLM_PROVIDER**
   ```
   Key: LLM_PROVIDER
   Value: gemini
   ```

7. **LLM_MODEL**
   ```
   Key: LLM_MODEL
   Value: gemini-pro
   ```

8. **FRONTEND_URL**（使用第二步记录的 Vercel URL）
   ```
   Key: FRONTEND_URL
   Value: https://wedding-helper-frontend-xxx.vercel.app
   ```
   **注意：** 替换为您的实际 Vercel URL（从第二步获得）

9. **CORS_ORIGIN**（与 FRONTEND_URL 相同）
   ```
   Key: CORS_ORIGIN
   Value: https://wedding-helper-frontend-xxx.vercel.app
   ```

#### 可选的环境变量：

10. **DEFAULT_ADMIN_USERNAME**（可选，方便初次登录）
    ```
    Key: DEFAULT_ADMIN_USERNAME
    Value: admin
    ```

11. **DEFAULT_ADMIN_PASSWORD**（可选）
    ```
    Key: DEFAULT_ADMIN_PASSWORD
    Value: admin123
    ```
    **注意：** 部署后请立即修改密码！

### 3.6 开始部署（自动完成）

1. 点击 "Create Web Service" 按钮
2. **Render 会自动完成以下操作：**
   - ✅ 克隆 GitHub 仓库
   - ✅ 进入 backend 目录
   - ✅ 运行 `npm install`
   - ✅ 运行 `npm run build`
   - ✅ 启动服务
   - ✅ 分配域名

3. 查看部署日志：
   - 在 "Logs" 标签页可以看到实时日志
   - 等待看到类似这样的信息：
     ```
     Server started on port 5001
     Database initialized successfully
     ```

4. **记录后端 URL**（非常重要！）
   - 在页面顶部会显示 URL
   - 格式类似：`https://wedding-helper-backend-xxx.onrender.com`
   - 复制这个 URL

---

## 🔗 第四步：连接前后端

### 4.1 更新 Vercel 环境变量（手动操作）

1. 回到 Vercel Dashboard
2. 进入 `wedding-helper-frontend` 项目
3. 点击 "Settings" 标签
4. 点击左侧 "Environment Variables"
5. 找到之前创建的 `VITE_API_URL`
6. 点击 "Edit"，填入后端 URL：
   ```
   Value: https://wedding-helper-backend-xxx.onrender.com
   ```
   **注意：** 替换为您的实际 Render URL（从第三步获得）
7. 点击 "Save"

### 4.2 重新部署前端（手动触发）

1. 在 Vercel 项目页面，点击 "Deployments" 标签
2. 找到最新的部署
3. 点击右侧的 "..." → "Redeploy"
4. 点击 "Redeploy" 确认

**Vercel 会自动：**
- ✅ 使用新的环境变量重新构建
- ✅ 部署新版本
- ✅ 更新域名

等待 1-2 分钟，部署完成。

---

## ✅ 第五步：测试部署

### 5.1 测试前端（手动操作）

1. 访问您的 Vercel URL：`https://wedding-helper-frontend-xxx.vercel.app`
2. 应该能看到欢迎页面
3. 输入一个测试姓名（如："测试用户"）
4. 点击"开始对话"

### 5.2 测试后端连接（手动操作）

1. 在聊天界面发送一条消息（如："你好"）
2. **如果成功：**
   - 会看到助手的回复（可能需要等待几秒）
   - 说明前后端连接成功 ✅

3. **如果失败：**
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签页的错误信息
   - 常见问题见下方"故障排查"部分

### 5.3 测试管理员功能（手动操作）

如果配置了 `DEFAULT_ADMIN_USERNAME` 和 `DEFAULT_ADMIN_PASSWORD`：

1. 访问 `https://your-vercel-url.vercel.app/#admin`
2. 应该会看到管理界面（如果配置了默认管理员）
3. 尝试上传一个测试文档（如创建一个 test.txt 文件）

---

## 🔄 第六步：后续更新

### 6.1 代码更新流程（半自动）

当您修改代码后：

**手动操作：**
```bash
cd /path/to/wedding-helper
git add .
git commit -m "描述您的更改"
git push origin main
```

**自动完成：**
- ✅ Vercel 检测到 GitHub 推送
- ✅ 自动重新构建前端
- ✅ 自动部署新版本

- ✅ Render 检测到 GitHub 推送
- ✅ 自动重新构建后端
- ✅ 自动部署新版本

**注意：** Render 免费套餐的自动部署可能有延迟，可以手动触发：
1. 进入 Render Dashboard
2. 进入 `wedding-helper-backend` 项目
3. 点击 "Manual Deploy" → "Deploy latest commit"

### 6.2 环境变量更新（手动操作）

**Vercel 环境变量更新：**
1. Settings → Environment Variables
2. 找到要修改的变量
3. 点击 "Edit" 或 "Delete"
4. **重要：** 修改后需要重新部署

**Render 环境变量更新：**
1. Environment → Environment Variables
2. 找到要修改的变量
3. 点击编辑图标
4. **自动：** Render 会自动重启服务应用新变量

---

## 🔧 故障排查

### 问题 1：前端无法连接后端

**症状：** 发送消息后一直转圈，或显示网络错误

**解决方案：**
1. 检查 Vercel 的 `VITE_API_URL` 是否正确
2. 检查 Render 的 `CORS_ORIGIN` 和 `FRONTEND_URL` 是否正确
3. 在浏览器打开后端 URL（应该显示 JSON 格式的响应）
4. 检查 Render 日志是否有错误

### 问题 2：Gemini API 调用失败

**症状：** 消息发送后显示 LLM 错误

**解决方案：**
1. 检查 `GEMINI_API_KEY` 是否正确
2. 验证 API Key 是否有效：
   ```bash
   curl -H 'Content-Type: application/json' \
        -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY"
   ```
3. 检查 Google AI Studio 的使用配额

### 问题 3：Render 部署失败

**症状：** 部署过程中出错

**常见原因：**
1. `Root Directory` 设置错误 → 应该是 `backend`
2. 环境变量缺失 → 检查必需的环境变量
3. Node.js 版本不兼容 → 在 Render 设置中指定 Node 18+

### 问题 4：数据库错误

**症状：** 后端日志显示数据库相关错误

**解决方案：**
1. Render 会自动创建并管理 SQLite 数据库
2. 检查 backend/data 目录权限
3. 如果持续出错，可以在 Render Dashboard 重启服务

---

## 📊 部署成本

### Vercel（前端）
- **Free Plan**：
  - ✅ 100 GB 带宽/月
  - ✅ 无限部署
  - ✅ 自动 HTTPS
  - ✅ 全球 CDN
  - **足够个人项目使用**

### Render（后端）
- **Free Plan**：
  - ✅ 750 小时/月（足够一个服务）
  - ⚠️ 非活跃时自动休眠（15分钟无请求）
  - ⚠️ 冷启动可能需要 30-60 秒
  - ✅ 自动 HTTPS
  - **足够测试和小规模使用**

**升级建议：**
- 如果需要 24/7 在线：升级到 Render 的 Starter 计划（$7/月）
- 如果流量很大：考虑 Vercel Pro 计划

---

## 🎯 完整流程总结

### 需要手动操作的步骤（一次性）：

1. ✋ 在 GitHub 创建仓库并推送代码
2. ✋ 在 Vercel 导入项目并配置
3. ✋ 在 Render 创建 Web Service
4. ✋ 在 Render 配置环境变量（特别是 API Keys）
5. ✋ 在 Google AI Studio 获取 Gemini API Key
6. ✋ 更新 Vercel 的 VITE_API_URL
7. ✋ 重新部署 Vercel 前端
8. ✋ 测试部署是否成功

### 自动完成的部分：

- ✅ 代码推送后自动部署
- ✅ 依赖安装和构建
- ✅ HTTPS 证书配置
- ✅ 域名分配
- ✅ 健康检查
- ✅ 日志记录

---

## 📞 需要帮助？

如果遇到问题：

1. **查看日志：**
   - Vercel: Deployments → 选择部署 → Building / Runtime Logs
   - Render: 项目页面 → Logs 标签

2. **常用命令：**
   ```bash
   # 本地测试前端
   cd frontend && npm run dev

   # 本地测试后端
   cd backend && npm run dev

   # 查看构建输出
   npm run build
   ```

3. **社区资源：**
   - Vercel 文档：https://vercel.com/docs
   - Render 文档：https://render.com/docs
   - Gemini API 文档：https://ai.google.dev/docs

---

## ✅ 部署检查清单

完成部署后，用这个清单验证：

- [ ] ✅ GitHub 仓库已创建并推送代码
- [ ] ✅ Vercel 前端部署成功
- [ ] ✅ Render 后端部署成功
- [ ] ✅ 获得了 Gemini API Key
- [ ] ✅ 配置了所有必需的环境变量
- [ ] ✅ 前后端 URL 已互相配置
- [ ] ✅ 可以访问前端页面
- [ ] ✅ 可以发送消息并收到回复
- [ ] ✅ 管理员可以访问管理页面
- [ ] ✅ 可以上传文档到知识库

**恭喜！如果所有项目都打勾，您的部署就成功了！** 🎉
