# Tasks

- [x] Task 1: 后端 — 创建 `server/email.js` 邮件发送模块，使用 nodemailer + QQ 邮箱 SMTP
  - [x] 安装 `nodemailer` 依赖
  - [x] 封装 `sendEmailCode(to, code)` 函数，支持通过环境变量配置 SMTP
  - [x] 未配置时返回明确错误提示

- [x] Task 2: 后端 — 修改 `server/db.js`，`verification_codes` 表增加 `email` 列
  - [x] CREATE TABLE 语句增加 `email` 列（与 `phone` 并列，可空）
  - [x] 用户表 `users` 增加 `email` 列

- [x] Task 3: 后端 — 修改 `server/routes/auth.js` 基于邮箱的验证码流程
  - [x] `send-code` 端点改为接收 `email` 参数，调用 `sendEmailCode()`
  - [x] `verify-code` 端点改为接收 `email` + `code` 参数
  - [x] 移除 `sendSms` 引用

- [x] Task 4: 后端 — 更新配置
  - [x] `.env` 移除腾讯云短信配置，新增 QQ 邮箱 SMTP 配置（含注释说明）

- [x] Task 5: 前端 — 修改 `auth-ui.js` 登录面板
  - [x] 手机号输入框改为邮箱输入框（type="email", placeholder="请输入邮箱地址"）
  - [x] 前端邮箱格式校验（含 @ 和域名）
  - [x] 提示文字改为"验证码已发送，请查收邮件"

- [x] Task 6: 前端 — 修改 `api-client.js`
  - [x] `sendCode(phone)` → `sendCode(email)`
  - [x] `verifyCode(phone, code)` → `verifyCode(email, code)`

- [x] Task 7: 清理 — 删除不再使用的 `server/sms.js`

# Task Dependencies
- [Task 1] 无依赖
- [Task 2] 无依赖（可并行）
- [Task 4] 无依赖（可并行）
- [Task 5] 依赖 [Task 6]（API 函数名一致即可，可并行）
- [Task 6] 无依赖（可并行）
- [Task 3] 依赖 [Task 1], [Task 2]
- [Task 7] 依赖 [Task 3]（确认无引用后删除）