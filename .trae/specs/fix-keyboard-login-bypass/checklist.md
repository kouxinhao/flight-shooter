# Checklist

- [x] 未登录状态下，在菜单界面按下键盘任意键，游戏不会启动 — Line 458 已添加 `if (!loggedIn) return;`
- [x] 已登录状态下，在菜单界面按下键盘任意键，游戏正常启动 — `loggedIn` 为 true 时通过守卫，到达 `startGame()`
- [x] 登录面板打开时，键盘输入数字不影响游戏状态 — Line 448-452 已有 `authOverlay.style.display === 'flex'` 检查
- [x] 全项目已排查所有事件处理器，确认无其他相似 Bug — 逐一审查了 11 个事件处理器，仅 keydown 缺少该守卫