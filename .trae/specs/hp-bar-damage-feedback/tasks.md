# 任务列表

- [ ] 任务 1：在 style.css 中添加受伤闪白和低血量脉冲 CSS 动画
  - 定义 `@keyframes damageFlash`：HP 条闪白动画
  - 定义 `@keyframes hpPulse`：模块边框呼吸脉冲动画
  - 定义 `.hp-damage` 类：HP 条背景变为亮白，200ms
  - 定义 `.hp-low` 类：模块 `box-shadow` 脉冲增强红光

- [ ] 任务 2：在 script.js 的 updateHUDOverlay() 中添加 HP 变化检测和低血量判断
  - 添加 `_prevHp` 闭包变量跟踪上一次 HP 值
  - 检测到 HP 减少时给 `#hudHpBar` 添加 `hp-damage` 类，200ms 后移除
  - 检测 HP 比例低于 30% 时给 `#hudHpModule` 添加 `hp-low` 类
  - 检测 HP 比例恢复到 30% 以上时移除 `hp-low` 类

- [ ] 任务 3：重启服务器并验证
  - 重启服务器
  - 进入游戏，测试受伤时 HP 条是否闪白
  - 测试低血量时边框是否脉冲红光

# 任务依赖关系

- 任务 1 → 任务 3
- 任务 2 → 任务 3
- 任务 1 和 任务 2 可并行执行