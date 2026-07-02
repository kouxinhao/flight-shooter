# 任务列表

- [x] 任务 1：修复 dotenv 加载路径
  - 修改 `server/index.js` 中 `require('dotenv').config()` 为 `require('dotenv').config({ path: __dirname + '/.env' })`，使 dotenv 始终从 `server/` 目录加载 `.env`

- [x] 任务 2：重启服务器并验证
  - 重启服务器
  - 验证登录流程可以正常发送验证码（不再提示"邮箱服务未配置"）

# 任务依赖关系

- 任务 1 → 任务 2