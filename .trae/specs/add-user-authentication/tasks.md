# Tasks

- [x] Task 1: 搭建后端服务框架 — 创建 `server/` 目录，初始化 Node.js 项目，配置 Express 服务器、SQLite 数据库、JWT 认证中间件、CORS
  - [x] 创建 `server/package.json` 和 `server/.env` 配置文件
  - [x] 创建 `server/index.js` — Express 主入口，监听端口 3001
  - [x] 创建 `server/db.js` — SQLite 初始化（用户表 + 游戏数据表）
  - [x] 创建 `server/middleware/auth.js` — JWT 鉴权中间件
  - [x] 创建 `server/routes/auth.js` — 认证路由（手机号验证码、微信、QQ）
  - [x] 创建 `server/routes/data.js` — 游戏数据路由（读写高分、统计、设置）
  - [x] 验证：服务端启动后所有 API 端点可正常响应

- [x] Task 2: 实现手机号验证码登录 — 服务端生成/校验 6 位验证码，开发阶段直接返回验证码
  - [x] 实现 `POST /api/auth/send-code` — 生成验证码并返回
  - [x] 实现 `POST /api/auth/verify-code` — 校验验证码，返回 JWT token
  - [x] 验证：使用 REST 客户端测试完整流程

- [x] Task 3: 实现微信/QQ OAuth 登录接口 — 微信和 QQ 的登录接口支持（回调处理、code 换 token、openid 注册）
  - [x] 实现 `POST /api/auth/wechat` — 接收微信 code，换取 openid，注册/登录
  - [x] 实现 `POST /api/auth/qq` — 接收 QQ code，换取 openid，注册/登录
  - [x] 验证：API 返回格式正确

- [x] Task 4: 实现游戏数据 API — 用户高分、统计、设置的读写
  - [x] 实现 `GET /api/user/data` — 返回当前用户数据
  - [x] 实现 `POST /api/user/data` — 保存/合并当前用户数据
  - [x] 验证：多次读写数据一致性

- [x] Task 5: 前端登录 UI — 在游戏菜单中添加登录面板（HTML 浮层）
  - [x] 创建 `auth-ui.js` — 登录面板的 DOM 创建、事件绑定、样式
  - [x] 修改 `index.html` — 引入 `auth-ui.js`、登录面板容器
  - [x] 在菜单界面添加"登录"按钮，点击弹出登录面板
  - [x] 登录面板含三个入口：手机号登录、微信登录、QQ 登录
  - [x] 已登录状态在菜单右上角显示用户昵称

- [x] Task 6: 前端登录逻辑 — 对接后端 API，管理 JWT token
  - [x] 创建 `api-client.js` — 封装 fetch 请求，自动携带 token
  - [x] 手机号验证码登录完整交互流程
  - [x] 微信/QQ 登录的跳转与回调处理
  - [x] Token 存储到 localStorage，刷新页面后恢复登录状态

- [x] Task 7: 游戏数据同步 — 已登录用户的高分/统计/设置自动同步到服务端
  - [x] 游戏结束时（game over），如有登录则同步数据到服务端
  - [x] 进入菜单时，如有登录则从服务端拉取最新数据
  - [x] 设置变更时，同步到服务端
  - [x] 未登录时继续使用 localStorage 回退方案

# Task Dependencies
- [Task 1] 无依赖，优先完成
- [Task 2] 依赖 [Task 1]
- [Task 3] 依赖 [Task 1]
- [Task 4] 依赖 [Task 1]
- [Task 5] 依赖 [Task 2], [Task 3]
- [Task 6] 依赖 [Task 2], [Task 3], [Task 5]
- [Task 7] 依赖 [Task 4], [Task 6]