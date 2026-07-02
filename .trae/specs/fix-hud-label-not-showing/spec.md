# HUD 中文标签不显示修复 Spec

## Why

用户反馈 HUD 面板的中文标签（生命值、得分、武器能源、难度等级、当前关卡）在游戏中没有显示。

## Root Cause

`drawRightInfo()` 函数中第一个模块（难度等级）缺少 `ctx.restore()` 调用：第 2484 行的 `ctx.save()` 没有对应的 `ctx.restore()`，直接在第 2512 行又调用了一次 `ctx.save()`。这导致 Canvas 上下文状态栈每帧堆积一个未恢复的 save，长期运行可能导致渲染异常甚至栈溢出。

此外需排查 `drawLeftHUD()` 中 save/restore 是否完全匹配。

## What Changes

- 在 `drawRightInfo()` 中难度等级模块末尾增加 `ctx.restore()` 调用
- 整体检查所有 HUD 相关函数的 save/restore 平衡
- 确保 Canvas 渲染状态正确，中文标签正常显示

## Impact

- 影响文件：`script.js`
- 不影响游戏逻辑、服务端、其他 UI 元素

## ADDED Requirements

### Requirement: HUD 标签正确显示

**WHEN** 用户进入游戏（playing 或 paused 状态）
**THEN** 左侧三个面板（生命值/得分/武器能源）的中文标签清晰可见
**AND** 右侧两个面板（难度等级/当前关卡）的中文标签清晰可见
**AND** 控制台无 Canvas 相关报错