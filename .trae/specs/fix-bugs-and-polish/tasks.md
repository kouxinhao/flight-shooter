# Tasks

- [x] Task 1: 修复 Bug 1 — 5 级武器无法释放大招
  - [x] 1.1 修改 addEnergy() 函数：当 weaponLevel >= 5 时，不再自动清零 energy，而是让 energy 停留在 maxEnergy
  - [x] 1.2 验证 E 键大招在武器 5 级时正常工作

- [x] Task 2: 修复 Bug 2 和 Bug 3 — 删除未使用变量，更新统计面板
  - [x] 2.1 删除 `ultimateReady` 变量声明（第 771 行附近）
  - [x] 2.2 在 drawGameOver() 的统计面板中添加 KAMIKAZE, STEALTH, SPLITTER, STAGE_BOSS 的击杀数据
  - [x] 2.3 调整统计面板布局，适配更多数据行

- [x] Task 3: 修复 Bug 4 — 教程添加触屏大招说明
  - [x] 3.1 在 drawTutorial() 中，当 isTouchDevice 为 true 时，添加右下角大招按钮的说明

- [x] Task 4: UI/UX 提升 — 快速重开、关卡显示、Boss 预警
  - [x] 4.1 在 drawGameOver() 中添加"再来一局"按钮，点击直接调用 startGame()
  - [x] 4.2 在 drawUI() 的 HUD 中添加当前关卡显示
  - [x] 4.3 在 gameLoop() 中检测关卡 Boss 即将出现（剩余 3 秒），显示预警提示

- [x] Task 5: Boss 攻击模式扩展 — 弹幕模式和旋转激光
  - [x] 5.1 在 updateEnemies() 中为 Boss 和 STAGE_BOSS 增加低血量弹幕模式（hp < maxHp / 2）
  - [x] 5.2 为 STAGE_BOSS 增加旋转激光攻击（持续光束，非子弹，玩家触碰即受伤）
  - [x] 5.3 绘制激光效果（线性渐变光束，旋转动画）

- [x] Task 6: 性能与代码质量 — 粒子上限和对象池
  - [x] 6.1 在 spawnExplosion() 和 spawnBulletTrail() 中添加 particles.length 上限检查（> 200 时跳过生成）
  - [x] 6.2 为子弹和敌人实现简单对象池（复用已移除的对象数组引用）
  - [x] 6.3 减少粒子生命周期随机范围，降低峰值

- [x] Task 7: 手机适配增强 — 屏幕休眠、全屏、触控优化
  - [x] 7.1 添加 WakeLock API 支持：游戏开始时请求，暂停/结束时释放
  - [x] 7.2 在用户首次交互时请求全屏 API（Fullscreen API）
  - [x] 7.3 调整触屏按钮大小和间距，避免误触

# Task Dependencies
- [Task 1] depends on understanding addEnergy() and activateUltimate()
- [Task 2-3] are independent of other tasks
- [Task 4] depends on existing drawGameOver() and drawUI() structure
- [Task 5] depends on existing enemy shooting logic
- [Task 6] independent of other tasks
- [Task 7] independent of other tasks
- Tasks 1-3 (bugs) should be prioritized but can run in parallel with Tasks 4-7