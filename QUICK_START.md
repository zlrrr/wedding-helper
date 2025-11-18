# 🚀 快速部署指南（5分钟）

最精简的部署步骤，适合有一定经验的用户。详细教程请查看 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 前置准备

1. GitHub、Vercel、Render 账号（用 GitHub 登录更方便）
2. Gemini API Key: https://makersuite.google.com/app/apikey

---

## 步骤 1: 推送代码到 GitHub

```bash
# 在 GitHub 创建新仓库: wedding-helper
git remote add origin https://github.com/YOUR_USERNAME/wedding-helper.git
git push -u origin main
```

---

## 步骤 2: 部署前端到 Vercel

1. 访问 https://vercel.com → New Project
2. 导入 `wedding-helper` 仓库
3. **配置：**
   - Root Directory: `frontend`
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **环境变量：**
   ```
   VITE_API_URL=（暂时留空）
   ```
5. 点击 Deploy
6. **记录前端URL**: `https://xxx.vercel.app`

---

## 步骤 3: 部署后端到 Render

1. 访问 https://render.com → New Web Service
2. 连接 `wedding-helper` 仓库
3. **配置：**
   - Name: `wedding-helper-backend`
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

4. **环境变量（重要！）：**
   ```bash
   # 生成密钥
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # 配置变量
   NODE_ENV=production
   BACKEND_PORT=5001
   JWT_SECRET=<生成的密钥1>
   SESSION_SECRET=<生成的密钥2>
   GEMINI_API_KEY=<您的Gemini API Key>
   LLM_PROVIDER=gemini
   LLM_MODEL=gemini-pro
   FRONTEND_URL=<您的Vercel URL>
   CORS_ORIGIN=<您的Vercel URL>
   DEFAULT_ADMIN_USERNAME=admin
   DEFAULT_ADMIN_PASSWORD=admin123
   ```

5. 点击 Create Web Service
6. **记录后端URL**: `https://xxx.onrender.com`

---

## 步骤 4: 连接前后端

1. 回到 Vercel → Settings → Environment Variables
2. 编辑 `VITE_API_URL`，填入后端URL
3. Deployments → Redeploy（重新部署）

---

## 步骤 5: 测试

访问前端URL → 输入姓名 → 发送消息 → 收到回复 ✅

---

## 🔑 关键信息速查

| 项目 | URL | 说明 |
|------|-----|------|
| 前端 | `https://xxx.vercel.app` | 用户访问的聊天界面 |
| 后端 | `https://xxx.onrender.com` | API 服务 |
| Admin | `前端URL/#admin` | 管理界面 |

---

## 📝 默认管理员登录

- 用户名: `admin`
- 密码: `admin123`
- **请立即修改密码！**

---

## ⚠️ 常见问题

**无法连接后端？**
→ 检查 Vercel 的 `VITE_API_URL` 和 Render 的 `CORS_ORIGIN`

**LLM 不回复？**
→ 检查 `GEMINI_API_KEY` 是否有效

**Render 很慢？**
→ 免费套餐会休眠，首次访问需要30-60秒启动

---

## 🔄 更新代码

```bash
git add .
git commit -m "更新说明"
git push origin main
```

Vercel 和 Render 会自动检测并重新部署 ✅

---

**详细教程**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
