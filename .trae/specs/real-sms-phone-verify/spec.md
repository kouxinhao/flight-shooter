# 真实手机号验证与短信服务 Spec

## Why
当前手机号登录存在两个问题：
1. 手机号校验宽松，任何 1 开头的 11 位数字都能通过，未校验号段合法性
2. 验证码在开发模式下直接返回给前端，用户要求接入真实短信服务

## What Changes
1. **手机号校验加强**: 后端手机号正则从 `/^1\d{10}$/` 改为 `/^1[3-9]\d{9}$/`，仅允许合法中国移动号段（13x-19x）
2. **SMS 短信服务**: 新增 `server/sms.js` 模块，对接腾讯云短信 API（HTTP 直连，无需重型 SDK）。通过 `.env` 配置密钥，未配置时返回明确错误提示
3. **后端 auth.js**: `send-code` 端点移除 dev 模式直接返回验证码的逻辑，改为调用真实 SMS 发送，验证码仅存数据库
4. **前端 auth-ui.js**: 移除 `res.code` 自动填充验证码的逻辑，显示真实提示文字
5. **新增依赖**: `axios`（用于向腾讯云短信 API 发请求）
6. **环境变量**: `.env` 新增腾讯云短信配置项

## Impact
- Affected specs: add-user-authentication
- Affected code: `server/routes/auth.js`, `server/sms.js` (new), `server/.env`, `server/package.json`, `auth-ui.js`

## ADDED Requirements
### Requirement: 手机号号段校验
- **WHEN** 用户输入手机号
- **THEN** 系统只接受 `1[3-9]` 开头的 11 位号码
- **AND** 非法号段返回 "请输入有效的手机号" 错误

### Requirement: 真实短信发送
- **WHEN** 用户点击获取验证码
- **THEN** 系统通过腾讯云短信 API 发送 6 位验证码到用户手机
- **AND** 不将验证码返回给前端
- **AND** 前端显示 "验证码已发送" 提示
- **WHEN** 腾讯云短信未配置
- **THEN** 返回错误提示 "短信服务未配置，请在 .env 中设置腾讯云短信参数"

## MODIFIED Requirements
### Requirement: 验证码流程
- 移除 dev 模式直接返回验证码的逻辑
- 移除前端自动填充验证码的逻辑

## REMOVED Requirements
(None)