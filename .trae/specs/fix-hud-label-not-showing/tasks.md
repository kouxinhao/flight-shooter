# Tasks

- [x] Task 1: 修复 drawRightInfo() 缺失的 ctx.restore()
  - 在难度等级模块末尾（第 2508 行后）增加 `ctx.restore()`
  - 确认当前关卡模块的 save/restore 保持不变
- [x] Task 2: 验证所有 HUD 函数的 save/restore 平衡
  - 检查 drawLeftHUD() 三个模块的 save/restore 配对
  - 检查 drawRightInfo() 两个模块的 save/restore 配对
  - 检查 drawTopRightControls() 的 save/restore 配对
- [x] Task 3: 验证修复后标签正确渲染
  - 进入游戏后确认所有中文标签可见
  - 检查控制台无 Canvas 相关错误

# Task Dependencies

- Task 1 → Task 3
- Task 2 → Task 3