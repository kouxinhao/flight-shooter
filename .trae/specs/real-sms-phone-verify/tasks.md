# Tasks

- [x] Task 1: 后端 — 创建 `server/sms.js` 短信发送模块，对接腾讯云短信 API
  - [x] 创建 `server/sms.js`，封装 `sendSms(phone, code)` 函数
  - [x] 支持通过环境变量 `SMS_SECRET_ID`, `SMS_SECRET_KEY`, `SMS_SDK_APP_ID`, `SMS_SIGN_NAME`, `SMS_TEMPLATE_ID` 配置
  - [x] 未配置时返回明确的错误信息

- [x] Task 2: 后端 — 修改 `server/routes/auth.js` 移除 dev 模式直接返回验证码
  - [x] 手机号校验正则更新为 `/^1[3-9]\d{9}$/`
  - [x] `send-code` 端点调用真实 `sendSms()`，不再返回 `code` 字段
  - [x] 保留数据库存储验证码和校验逻辑

- [x] Task 3: 后端 — 更新配置
  - [x] `.env` 新增腾讯云短信配置项（注释说明）
  - [x] `server/package.json` 添加 `axios` 依赖

- [x] Task 4: 前端 — 修改 `auth-ui.js` 移除 dev 模式自动填充验证码
  - [x] 删除 `if (res.code) { document.getElementById('authCode').value = res.code; }` 逻辑
  - [x] 验证码发送成功后显示 "验证码已发送" 而不是自动填入

# Task Dependencies
- [Task 1] 无依赖
- [Task 2] 依赖 [Task 1]
- [Task 3] 无依赖（可并行于 [Task 1]）
- [Task 4] 无依赖（可并行于 [Task 1]）