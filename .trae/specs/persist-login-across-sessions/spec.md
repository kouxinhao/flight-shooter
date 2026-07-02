# 登录持久化（30天免登录）Spec

## Why

当前用户关闭浏览器后重新打开游戏页面，登录状态虽然理论上保留在 localStorage 中，但缺乏显式的 token 过期校验和 401 响应处理，可能导致 token 过期后界面仍显示已登录但 API 调用失败。需要确保用户信息在浏览器关闭后不丢失，且每 30 天才需重新登录。

## What Changes

- 确保 token 和用户信息使用 localStorage 持久化存储（已实现，验证即可）
- 确保服务端 JWT 签发有效期为 30 天（已实现 `expiresIn: '30d'`，验证即可）
- 页面加载时校验 token 是否过期，过期则自动清除登录状态并提示用户重新登录
- 处理 API 401 响应：当服务端返回 401 时自动清除登录状态并跳转到登录界面
- 显示用户信息 badge 在页面加载后立即展示（无需等待首次 API 调用）

## Impact

- 影响文件：`script.js`、`api-client.js`
- 不影响服务端路由、数据库、静态文件服务

## ADDED Requirements

### Requirement: 页面加载 token 过期校验

**WHEN** 用户打开游戏页面且 localStorage 中存在 token
**THEN** 系统应解码 JWT 检查是否过期
**IF** token 已过期
**THEN** 自动清除 token 和用户信息，显示登录界面，提示"登录已过期，请重新登录"
**ELSE** 正常恢复登录状态，显示用户 badge

### Requirement: API 401 自动登出

**WHEN** 任何 API 请求返回 401 状态码
**THEN** 自动清除 token 和用户信息，跳转到登录界面

## VERIFIED Requirements（确认已实现）

### Requirement: localStorage 持久化存储

已验证：token 和用户信息通过 `localStorage.setItem/getItem` 存储，关闭浏览器后数据保留。

### Requirement: 30天 JWT 有效期

已验证：服务端 `auth.js` 中所有 JWT 签发均使用 `{ expiresIn: '30d' }`，有效期 30 天。

### Requirement: 页面加载状态恢复

已验证：`restoreLoginState()` 在页面加载时从 localStorage 读取 token 和用户信息，恢复登录状态并显示用户 badge。