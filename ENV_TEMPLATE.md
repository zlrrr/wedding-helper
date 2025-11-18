# 环境变量配置模板

复制此文件内容，填写实际值后配置到对应平台。

---

## Render 后端环境变量

在 Render Dashboard → wedding-helper-backend → Environment 中逐个添加：

### 必需变量（必须配置）

```bash
# 1. Node 环境
NODE_ENV=production

# 2. 后端端口
BACKEND_PORT=5001

# 3. JWT 密钥（生成方法见下方）
JWT_SECRET=
# 生成命令：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 示例值：8f7d6e5c4b3a2918f7d6e5c4b3a2918f7d6e5c4b3a2918f7d6e5c4b3a2918

# 4. Session 密钥（再生成一个不同的）
SESSION_SECRET=
# 生成命令：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 示例值：1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b

# 5. Gemini API Key（从 Google AI Studio 获取）
GEMINI_API_KEY=
# 获取地址：https://makersuite.google.com/app/apikey
# 示例值：AIzaSyABC123XYZ789-aBcDeFgHiJkLmNoPqRsTuV

# 6. LLM 提供商
LLM_PROVIDER=gemini

# 7. LLM 模型
LLM_MODEL=gemini-pro

# 8. 前端 URL（从 Vercel 获取）
FRONTEND_URL=
# 示例值：https://wedding-helper-frontend-abc123.vercel.app

# 9. CORS 来源（与 FRONTEND_URL 相同）
CORS_ORIGIN=
# 示例值：https://wedding-helper-frontend-abc123.vercel.app
```

### 可选变量（推荐配置）

```bash
# 10. 默认管理员用户名（首次部署后可登录）
DEFAULT_ADMIN_USERNAME=admin

# 11. 默认管理员密码（请在首次登录后立即修改！）
DEFAULT_ADMIN_PASSWORD=admin123

# 12. LLM 温度（创造性程度，0-1）
LLM_TEMPERATURE=0.7

# 13. LLM 最大 token 数
LLM_MAX_TOKENS=2000
```

---

## Vercel 前端环境变量

在 Vercel Dashboard → wedding-helper-frontend → Settings → Environment Variables 中添加：

```bash
# 后端 API 地址（从 Render 获取）
VITE_API_URL=
# 示例值：https://wedding-helper-backend-xyz789.onrender.com
```

---

## 填写指导

### 1. 生成密钥

**在本地终端执行：**

```bash
# 生成 JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 再执行一次，生成 SESSION_SECRET（确保不同）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**输出示例：**
```
8f7d6e5c4b3a2918f7d6e5c4b3a2918f7d6e5c4b3a2918f7d6e5c4b3a2918
```

复制输出的字符串，分别填入 `JWT_SECRET` 和 `SESSION_SECRET`。

### 2. 获取 Gemini API Key

1. 访问：https://makersuite.google.com/app/apikey
2. 登录 Google 账号
3. 点击 "Create API Key" 或 "Get API Key"
4. 选择项目（或创建新项目）
5. 复制生成的 API Key

**API Key 格式：**
```
AIzaSyABC123XYZ789-aBcDeFgHiJkLmNoPqRsTuV
```

### 3. 获取 URL

**Vercel URL（前端）：**
- 部署完成后，在 Vercel Dashboard 顶部显示
- 格式：`https://项目名-随机字符.vercel.app`
- 示例：`https://wedding-helper-frontend-abc123.vercel.app`

**Render URL（后端）：**
- 部署完成后，在 Render Dashboard 顶部显示
- 格式：`https://项目名-随机字符.onrender.com`
- 示例：`https://wedding-helper-backend-xyz789.onrender.com`

---

## 配置顺序

✅ **推荐配置顺序：**

1. 先部署前端到 Vercel（`VITE_API_URL` 暂时留空）
2. 记录 Vercel URL
3. 部署后端到 Render（使用上面的 Vercel URL）
4. 记录 Render URL
5. 回到 Vercel 更新 `VITE_API_URL`
6. 重新部署 Vercel 前端

---

## 验证配置

### 检查后端

访问：`https://您的后端URL.onrender.com/`

**正常响应（JSON）：**
```json
{
  "status": "ok",
  "service": "wedding-helper-backend",
  "version": "1.0.0",
  "message": "Backend service is running"
}
```

### 检查前端

访问：`https://您的前端URL.vercel.app/`

**正常显示：**
- 看到欢迎页面
- 有"请输入您的姓名"表单
- 页面样式正常

### 检查连接

1. 在前端输入姓名并开始对话
2. 发送一条测息
3. **成功标志：** 收到助手的回复

---

## 常见错误

### 错误 1: 后端无法启动

**日志显示：** `JWT_SECRET is required`

**原因：** 缺少必需的环境变量

**解决：** 检查所有标记为"必需"的变量是否都已配置

---

### 错误 2: 前端无法连接后端

**浏览器 Console 显示：** `CORS error` 或 `Network Error`

**原因：**
- `VITE_API_URL` 配置错误
- `CORS_ORIGIN` 配置错误
- URL 末尾多了斜杠 `/`

**解决：**
1. 确认 `VITE_API_URL` 是完整的后端 URL（不要末尾斜杠）
2. 确认 `CORS_ORIGIN` 是完整的前端 URL（不要末尾斜杠）
3. 重新部署前端（修改环境变量后必须重新部署）

---

### 错误 3: LLM 不响应

**日志显示：** `Gemini API error` 或 `Invalid API key`

**原因：**
- `GEMINI_API_KEY` 错误或过期
- API 配额用完

**解决：**
1. 验证 API Key 是否有效：
   ```bash
   curl -H 'Content-Type: application/json' \
        -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY"
   ```
2. 检查 Google AI Studio 配额
3. 如果需要，生成新的 API Key

---

## 安全建议

⚠️ **重要安全提示：**

1. **不要提交 API Key 到 Git**
   - `.env` 文件已在 `.gitignore` 中
   - 永远不要把 API Key 写在代码里

2. **修改默认密码**
   - 首次登录后立即修改 `admin123`
   - 使用强密码

3. **定期轮换密钥**
   - 建议每 3-6 个月更换 JWT_SECRET
   - 定期更换 API Key

4. **监控使用量**
   - 定期检查 Gemini API 使用量
   - 设置使用限额

5. **备份数据**
   - Render 免费套餐数据库在服务重启时可能丢失
   - 重要数据请定期导出备份

---

## 配置检查清单

完成配置后，使用此清单验证：

**Render 后端：**
- [ ] `NODE_ENV` = production
- [ ] `BACKEND_PORT` = 5001
- [ ] `JWT_SECRET` 已生成（64位十六进制）
- [ ] `SESSION_SECRET` 已生成（与JWT_SECRET不同）
- [ ] `GEMINI_API_KEY` 已填写（来自 Google AI Studio）
- [ ] `LLM_PROVIDER` = gemini
- [ ] `LLM_MODEL` = gemini-pro
- [ ] `FRONTEND_URL` 已填写（Vercel URL）
- [ ] `CORS_ORIGIN` 已填写（与FRONTEND_URL相同）
- [ ] （可选）`DEFAULT_ADMIN_USERNAME` = admin
- [ ] （可选）`DEFAULT_ADMIN_PASSWORD` = admin123

**Vercel 前端：**
- [ ] `VITE_API_URL` 已填写（Render URL）

**验证：**
- [ ] 可以访问前端页面
- [ ] 可以访问后端 API（返回 JSON）
- [ ] 前端可以发送消息并收到回复
- [ ] 可以使用管理员账号登录

✅ **全部打勾后，配置就完成了！**
