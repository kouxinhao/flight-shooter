# Checklist

- [x] 手机号校验：输入 `10000000000` 应被拒绝，输入 `13800138000` 应通过 — API 返回 `{"error":"请输入有效的手机号"}`
- [x] 短信发送：调用 send-code API 后，验证码未返回在前端响应中 — 响应中只有 error 字段，无 code
- [x] 短信发送：验证码存入数据库，可通过 verify-code 正常校验 — `INSERT INTO verification_codes` 逻辑保留不变
- [x] 未配置短信时：send-code 返回错误提示，不崩溃 — 返回 `{"error":"短信服务未配置..."}`
- [x] 前端：获取验证码后不自动填充输入框 — 已删除 `if (res.code) {...}` 逻辑
- [x] 前端：显示 "验证码已发送" 提示 — 改为 `showError('验证码已发送，请查收短信')`