# 任务列表

- [x] 任务 1：在 email.js 中添加验证码控制台输出
  - 在 `sendEmailCode()` 的 catch 之前添加 `console.log('[验证码] 邮箱: ' + to + ', 验证码: ' + code);`
  - 邮件发送成功后添加 `console.log('[邮件] 已发送至 ' + to);`

- [x] 任务 2：创建 .env.example 配置模板
  - 在 `server/` 目录下创建 `.env.example`，包含所有环境变量及注释说明
  - 包含：PORT、JWT_SECRET、MAIL_HOST、MAIL_PORT、MAIL_USER、MAIL_PASS、MAIL_FROM

- [x] 任务 3：重启服务器并测试验证码控制台输出
  - 重启服务器
  - 请求发送验证码接口，检查控制台是否输出验证码

# 任务依赖关系

- 任务 1 → 任务 3
- 任务 2 → 任务 3
- 任务 1 和 任务 2 可并行执行