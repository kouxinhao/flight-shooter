# Tasks
- [x] Task 1: 修复未定义变量导致的游戏循环崩溃
  - [ ] 1.1 在全局作用域声明 `let mouseX = -1, mouseY = -1;`
  - [ ] 1.2 修改 `mousemove` 事件处理器，移除 `if (!isDraggingVolume) return;` 限制，始终更新 mouseX/mouseY
  - [ ] 1.3 确保 mousemove 中坐标转换正确（使用 canvas getBoundingClientRect 和 scale）
- [x] Task 2: 验证修复生效
  - [ ] 2.1 打开页面，菜单正常显示
  - [ ] 2.2 齿轮图标有悬停高亮效果
  - [ ] 2.3 点击页面可正常开始游戏
  - [ ] 2.4 设置面板交互正常（音量滑块、震动开关）

# Task Dependencies
- Task 2 依赖 Task 1