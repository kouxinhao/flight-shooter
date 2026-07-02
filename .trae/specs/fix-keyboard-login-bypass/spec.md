# Fix Keyboard Login Bypass Spec

## Why
在 PC 端，即使未登录，按下键盘任意键（空格、字母等）即可跳过登录直接开始游戏。`keydown` 事件处理器缺失对 `loggedIn` 状态的检查。

## What Changes
1. **`script.js` keydown 处理器**: 在 `gameState === 'menu'` 分支中，添加 `if (!loggedIn) return;` 守卫，与 `click`/`touchstart` 处理器的行为保持一致。
2. **全项目相似 Bug 排查**: 已逐一审查所有事件处理器（keydown、keyup、click、mousedown、mousemove、mouseup、touchstart、touchmove、touchend、touchcancel），确认只有 `keydown` 处理器存在此问题，其余均有正确的 `loggedIn` 检查或无需检查。

## Impact
- Affected specs: add-user-authentication
- Affected code: `script.js` keydown handler (~line 457)

## ADDED Requirements
### Requirement: Keyboard Login Guard
The system SHALL prevent keyboard-triggered game start when user is not logged in.

#### Scenario: Unauthenticated keyboard press in menu
- **WHEN** user is in menu state, not logged in, and no login panel is displayed
- **AND** user presses any keyboard key
- **THEN** the game SHALL NOT start

#### Scenario: Authenticated keyboard press in menu
- **WHEN** user is in menu state and is logged in
- **AND** user presses any keyboard key
- **THEN** the game SHALL start as normal

## MODIFIED Requirements
### Requirement: Login guard consistency
All game-start entry points (keyboard, mouse click, touch) SHALL consistently require `loggedIn === true` before starting the game.

## REMOVED Requirements
(None)