# 用户登录与账号系统 Spec

## Why

游戏目前使用浏览器 localStorage 保存最高分和设置，所有玩家共用同一份数据。增加用户登录系统后，每个玩家拥有独立账号，分数、统计和设置可跨设备同步，同时为后续在线排行榜等功能奠定基础。

## What Changes

- **新增后端服务**（Node.js + Express）：处理用户注册、登录、数据持久化
- **新增数据库**（SQLite）：存储用户账号和游戏数据
- **新增登录 UI**：在游戏菜单页面增加登录/注册界面，嵌入 Canvas 渲染或 HTML 浮层
- **游戏数据与用户绑定**：高分、统计、设置存储到服务端，按用户隔离
- **三种认证方式**：手机号验证码、微信扫码、QQ 扫码
- **新增配置文件**：`.env` 管理服务端配置（端口、密钥、第三方 App ID 等）

## Impact

- 影响范围：游戏架构从纯前端变为前后端分离
- 影响文件：
  - 新建 `server/` 目录，包含服务端代码
  - 修改 `index.html`：引入新脚本、添加登录浮层 DOM
  - 修改 `script.js`：新增登录状态管理、网络请求、数据同步逻辑
  - 新增 `package.json`（服务端依赖）
- 游戏核心逻辑不受影响，仅在菜单和游戏结束流程中增加登录/同步入口

## 认证方式说明

### 手机号 + 验证码
- 用户输入手机号，点击"获取验证码"
- 服务端生成 6 位验证码，开发阶段直接返回验证码（模拟短信），生产环境对接短信服务商
- 用户输入验证码完成登录/注册

### 微信登录
- **前置条件**：需在微信开放平台注册开发者账号并创建网站应用，获取 AppID 和 AppSecret
- 用户点击"微信登录"，跳转微信 OAuth 授权页
- 授权后回调获取 code，服务端换取 access_token 和用户 openid
- 首次登录自动创建账号

### QQ 登录
- **前置条件**：需在 QQ 互联平台注册开发者账号并创建网站应用，获取 AppID 和 AppSecret
- 流程同微信登录，使用 QQ OAuth 2.0 接口

## ADDED Requirements

### Requirement: 后端认证服务
系统应提供基于 Node.js + Express 的 RESTful API 服务。

#### Scenario: 手机号注册/登录
- **WHEN** 用户输入手机号并请求验证码
- **THEN** 服务端生成验证码，返回成功状态
- **WHEN** 用户输入手机号 + 验证码提交
- **THEN** 服务端验证码校验通过后，返回 JWT token 和用户信息

#### Scenario: 微信登录
- **WHEN** 用户点击"微信登录"
- **THEN** 前端跳转至微信 OAuth 授权 URL
- **WHEN** 用户授权后回调至游戏页面
- **THEN** 服务端通过 code 换取 access_token 和 openid，返回 JWT token 和用户信息

#### Scenario: QQ 登录
- **WHEN** 用户点击"QQ 登录"
- **THEN** 前端跳转至 QQ OAuth 授权 URL
- **WHEN** 用户授权后回调至游戏页面
- **THEN** 服务端通过 code 换取 access_token 和 openid，返回 JWT token 和用户信息

### Requirement: 用户数据隔离
系统应确保每个用户只能访问自己的游戏数据。

#### Scenario: 数据读写
- **WHEN** 已登录用户玩游戏并产生新分数
- **THEN** 游戏结束后自动将高分、统计、设置同步至服务端
- **WHEN** 已登录用户进入菜单
- **THEN** 从服务端拉取该用户的最新高分和统计

#### Scenario: 未登录状态
- **WHEN** 未登录用户玩游戏
- **THEN** 数据仍存储在 localStorage，不进行服务端同步

### Requirement: 登录 UI
游戏菜单页面应提供登录入口和交互界面。

#### Scenario: 登录界面
- **WHEN** 用户处于菜单界面且未登录
- **THEN** 显示登录按钮，点击后打开登录面板（可选方式：HTML 浮层覆盖在 Canvas 上方）
- **THEN** 登录面板包含：手机号登录、微信登录、QQ 登录三个入口
- **THEN** 登录面板可关闭，未登录玩家仍可继续游戏

#### Scenario: 已登录状态
- **WHEN** 用户已登录
- **THEN** 菜单界面右上角显示用户头像/昵称
- **THEN** 游戏结束后高分自动同步

### Requirement: 游戏数据 API
服务端应提供游戏数据的读写接口。

#### Scenario: API 端点
- **WHEN** 客户端请求同步数据
- **THEN** `GET /api/user/data` 返回用户的高分、统计、设置
- **THEN** `POST /api/user/data` 保存用户的高分、统计、设置
- **THEN** 所有请求需携带 JWT token 在 Authorization header 中

## MODIFIED Requirements

### Requirement: localStorage 数据回退
- 修改：当用户未登录时，仍使用 localStorage 作为数据存储
- 修改：用户登录后，优先使用服务端数据，localStorage 作为缓存