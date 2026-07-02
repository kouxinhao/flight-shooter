# 手机号登录改为邮箱验证码登录 Spec

## Why
短信服务需要付费且需要企业认证，个人开发者使用门槛高。改为邮箱验证码登录可完全免费，通过 QQ 邮箱 SMTP 发送验证码。

## What Changes
1. **新增 `server/email.js`** — 使用 nodemailer + QQ邮箱 SMTP 发送验证码邮件
2. **修改 `server/routes/auth.js`** — 验证码发送/校验改为基于邮箱而非手机号
3. **修改 `server/db.js`** — `verification_codes` 表增加 `email` 列，支持邮箱校验
4. **修改前端 `auth-ui.js`** — 登录面板输入框从手机号改为邮箱
5. **修改 `api-client.js`** — API 函数参数从 phone 改为 email
6. **更新 `.env`** — 新增 QQ 邮箱 SMTP 配置项，移除腾讯云短信配置
7. **移除 `server/sms.js`** — 不再需要短信模块

## Impact
- Affected specs: add-user-authentication, real-sms-phone-verify
- Affected code: `server/email.js` (new), `server/routes/auth.js`, `server/db.js`, `server/.env`, `server/package.json`, `auth-ui.js`, `api-client.js`

## ADDED Requirements
### Requirement: 邮箱验证码登录
- **WHEN** 用户输入有效邮箱并点击获取验证码
- **THEN** 系统通过 QQ 邮箱 SMTP 发送 6 位验证码到该邮箱
- **AND** 前端提示"验证码已发送，请查收邮件"
- **AND** 校验通过后登录/注册流程与原来一致

#### Scenario: 邮箱格式校验
- **WHEN** 用户输入非法邮箱（如 `abc`、`123@`）
- **THEN** 前端和后端均返回"请输入有效的邮箱地址"错误

## MODIFIED Requirements
### Requirement: 验证码数据库存储
- `verification_codes` 表添加 `email` 列，校验时按邮箱查找

### Requirement: .env 配置
- 移除 `SMS_SECRET_ID`, `SMS_SECRET_KEY`, `SMS_SDK_APP_ID`, `SMS_SIGN_NAME`, `SMS_TEMPLATE_ID`
- 新增 `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`

## REMOVED Requirements
### Requirement: 手机号登录
**Reason**: 改为邮箱验证码登录
**Migration**: 原有 `phone` 列保留，但不再使用。已有手机号用户不受影响。

### Requirement: 短信发送模块
**Reason**: 不再需要短信服务
**Migration**: 删除 `server/sms.js` 文件