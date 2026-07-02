# Tasks

- [x] Task 1: 页面加载时校验 JWT token 是否过期
  - 在 `restoreLoginState()` 中解码 JWT（base64 解码 payload），检查 `exp` 字段
  - 如果 token 已过期，调用 `clearToken()`、`clearUser()`、`updateUserInfo(null)`
  - 弹出提示"登录已过期，请重新登录"后显示登录面板
- [x] Task 2: API 401 响应自动登出
  - 在 `api-client.js` 的 `apiPost` 和 `apiGet` 中检查响应状态码
  - 如果返回 401，自动清除登录状态并跳转到登录界面
- [x] Task 3: 验证已有的持久化机制
  - 确认 localStorage 存储正确
  - 确认 JWT 签发 30 天有效期
  - 确认页面加载后用户 badge 正常显示

# Task Dependencies

- 无依赖关系，三个任务可并行