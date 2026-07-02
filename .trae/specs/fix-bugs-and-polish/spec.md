# Fix Bugs and Polish Spec

## Why
游戏现有多个 Bug 影响正常体验（5 级武器无法释放大招、统计面板不完整等），同时在 UI/UX、Boss 战、性能、手机适配方面有优化空间。

## What Changes
- **Bug 修复**: 修复 4 个 Bug（能量/大招冲突、未使用变量、统计缺失、教程遗漏）
- **UI/UX 提升**: 快速重开按钮、HUD 显示关卡、Boss 预警提示
- **Boss 攻击模式扩展**: 增加弹幕、旋转激光等新攻击模式
- **性能与代码质量**: 粒子上限控制、子弹/敌人对象池
- **手机端适配增强**: 防止屏幕休眠、全屏沉浸模式、触控优化

## Impact
- Affected code: script.js (涉及 addEnergy、activateUltimate、drawGameOver、drawTutorial、Enemy 类、gameLoop 等)
- No breaking changes

## ADDED Requirements

### Requirement: 修复 Bug 1 — 5 级武器无法释放大招
#### Scenario: 武器满级后大招正常
- **WHEN** player.weaponLevel >= 5 且 player.energy >= player.maxEnergy
- **THEN** addEnergy() SHALL NOT auto-reset energy to 0
- **AND** energy SHALL cap at maxEnergy (remain at 100)
- **AND** E 键大招 SHALL still work correctly

### Requirement: 修复 Bug 2 — 删除未使用的 ultimateReady 变量
- **WHEN** code runs
- **THEN** `let ultimateReady = false;` SHALL be removed

### Requirement: 修复 Bug 3 — 统计面板缺少新敌机类型
#### Scenario: Game over 统计面板
- **WHEN** game over screen is shown
- **THEN** 统计面板 SHALL 包含 KAMIKAZE, STEALTH, SPLITTER, STAGE_BOSS 的击杀数据
- **AND** 面板布局 SHALL 适配更多数据行

### Requirement: 修复 Bug 4 — 教程缺少触屏大招说明
#### Scenario: Tutorial 显示
- **WHEN** 触屏设备上显示教程
- **THEN** 教程内容 SHALL 包含右下角大招按钮的说明
- **AND** 仅在触屏设备上显示此项

### Requirement: UI/UX 提升
#### Scenario: 快速重开按钮
- **WHEN** gameState === 'over'
- **THEN** 除了"返回菜单"外，SHALL 显示"再来一局"按钮
- **AND** 点击后直接重新开始游戏

#### Scenario: HUD 显示关卡
- **WHEN** gameState === 'playing'
- **THEN** HUD 左上角或右上角 SHALL 显示当前关卡(currentStage)

#### Scenario: Boss 预警提示
- **WHEN** 关卡 Boss 即将出现前 3 秒（playingFrameCount 接近 STAGE_DURATION 倍数时）
- **THEN** 屏幕中央 SHALL 显示"警告！Boss 即将来袭！"的闪烁文字

### Requirement: Boss 攻击模式扩展
#### Scenario: 弹幕攻击
- **WHEN** Boss/STAGE_BOSS 生命值低于 50%
- **THEN** BOSS SHALL 切换攻击模式，发射更多更密集的弹幕
- **AND** 弹幕角度随机性更大

#### Scenario: 旋转激光
- **WHEN** STAGE_BOSS 存在
- **THEN** 关卡 Boss SHALL 偶尔发射旋转激光（持续性的光束，非子弹）
- **AND** 玩家需持续移动躲避

### Requirement: 性能与代码质量
#### Scenario: 粒子上限
- **WHEN** particles.length > 200
- **THEN** 不再生成新粒子（或移除最早的粒子）

#### Scenario: 子弹/对象池
- **WHEN** 生成子弹或敌人
- **THEN** 复用已移除的对象引用而不是创建新对象（简化版对象池）

### Requirement: 手机适配增强
#### Scenario: 防止屏幕休眠
- **WHEN** 游戏开始（gameState === 'playing'）
- **THEN** 请求 WakeLock API 防止屏幕自动关闭
- **AND** 游戏暂停/结束时释放 WakeLock

#### Scenario: 全屏沉浸
- **WHEN** 用户点击/触摸屏幕
- **THEN** 尝试请求全屏 API

#### Scenario: 触控优化
- **WHEN** 触屏设备上
- **THEN** 调整暂停按钮和大招按钮大小和位置，避免误触

## MODIFIED Requirements
None.

## REMOVED Requirements
None.