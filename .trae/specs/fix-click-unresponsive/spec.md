# 修复点击无反应 Bug Spec

## Why
游戏进入菜单界面后，点击页面没有任何反应。原因是齿轮图标的悬停检测使用了未定义的变量 `mouseX` 和 `mouseY`，导致 `drawMenu()` 中抛出 `ReferenceError`，游戏主循环崩溃，所有交互失效。

## What Changes
- 添加全局变量 `mouseX` 和 `mouseY` 用于追踪鼠标位置
- 在 `mousemove` 事件处理器中持续更新鼠标位置（不限于拖拽音量滑块时）
- 确保齿轮图标悬停高亮功能正常工作

## Impact
- 修改文件：`script.js`
- 修复 2 处代码

## Bug Root Cause
在 `polish-game-quality` 迭代中，右上角齿轮图标（`move-settings-btn`）添加了悬停高亮效果，使用了 `mouseX` 和 `mouseY` 变量来判断鼠标是否悬停在图标上。但这两个变量从未在任何地方声明或赋值，导致 `drawMenu()` 函数调用时抛出 `ReferenceError: mouseX is not defined`。

由于错误发生在 `requestAnimationFrame` 回调中且未被捕获，游戏主循环在第 1 帧后即终止运行。此后即使 click 事件仍可触发，但游戏状态已经混乱（无帧更新），交互不再正常响应。

## ADDED Requirements

### Requirement: 鼠标位置追踪
系统 SHALL 追踪鼠标在 Canvas 上的位置：
- 声明全局变量 `mouseX` 和 `mouseY`，初始值为 -1
- `mousemove` 事件处理器中更新这两个变量（移除仅拖拽时才更新的限制）

## MODIFIED Requirements

### Requirement: mousemove 事件（修改）
- 移除 `mousemove` 中 `if (!isDraggingVolume) return;` 的限制
- 始终更新 `mouseX` 和 `mouseY` 为当前鼠标在 Canvas 坐标系中的位置