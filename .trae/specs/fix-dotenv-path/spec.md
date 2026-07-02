# 修复 dotenv 加载路径问题

## 为什么

邮箱 `.env` 配置文件（`server/.env`）已存在并包含正确的 QQ 邮箱 SMTP 配置（MAIL_HOST、MAIL_USER、MAIL_PASS），但 `server/index.js` 中 `require('dotenv').config()` 未指定路径，默认从 `process.cwd()`（当前工作目录）查找 `.env` 文件。当服务器启动目录与 `server/` 不一致时，环境变量加载失败，导致 `email.js` 的 `getTransporter()` 返回 null，最终发送验证码时提示"邮箱服务未配置"。

## 变更内容

- 将 `server/index.js` 中 `require('dotenv').config()` 改为 `require('dotenv').config({ path: __dirname + '/.env' })`
- 确保无论从哪个目录启动服务器，dotenv 都能正确加载 `server/.env` 中的环境变量

## 影响范围

- 影响的代码：`server/index.js`
- 不影响其他文件

## 新增需求

### 需求：dotenv 加载固定路径

系统应始终从 `server/` 目录加载 `.env` 文件，而非当前工作目录。

#### 场景：服务器启动
- **当** 服务器从任何目录启动时
- **则** dotenv 应从 `server/.env` 加载环境变量
- **则** MAIL_HOST、MAIL_USER、MAIL_PASS、MAIL_FROM、JWT_SECRET 等变量可用