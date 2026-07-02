# Fix Menu UI Bugs & Add Epic BGM Spec

## Why
玩家在开始界面点击齿轮按钮无反应、喇叭按钮误触发暂停、菜单没有背景音乐缺少沉浸感，影响游戏体验。

## What Changes
- **修复** 齿轮设置按钮点击无响应的 bug：将齿轮点击检测从 settings 面板专属事件处理器移到主 canvas mousedown 处理器
- **修复** 喇叭静音按钮与暂停按钮热区重叠的 bug：分离喇叭图标点击区域，点击喇叭切换静音状态
- **新增** 菜单界面启动时自动播放激昂的背景音乐（BGM），使用 Web Audio API 程序化合成

## Impact
- Affected specs: 菜单 UI 交互、音效系统
- Affected code: `script.js`（drawMenu、事件处理器、AudioManager）

## ADDED Requirements
### Requirement: 菜单 BGM
菜单界面（gameState === 'menu'）加载后自动播放激昂 BGM。BGM 需满足：
- 节奏明快、有力量感
- 使用 Web Audio API 程序化合成（不依赖外部音频文件）
- 进入游戏后切换到游戏 BGM，返回菜单恢复菜单 BGM

#### Scenario: 菜单 BGM 播放
- **WHEN** 玩家打开游戏看到菜单界面
- **THEN** 自动播放激昂的菜单 BGM
- **AND** BGM 循环无缝衔接

### Requirement: 齿轮按钮可点击
齿轮设置按钮在菜单界面的 mousedown/touchstart 事件中能被正确识别并打开设置面板。

#### Scenario: 点击齿轮打开设置
- **WHEN** 玩家在菜单界面点击右上角齿轮图标
- **THEN** 设置面板（drawSettingsPanel）打开

### Requirement: 喇叭按钮切换静音
点击右上角喇叭图标切换静音/非静音状态，不影响游戏暂停状态。

#### Scenario: 点击喇叭切换静音
- **WHEN** 玩家点击喇叭图标
- **THEN** 静音状态切换（audio.toggleMute()）
- **AND** 游戏继续正常进行

## MODIFIED Requirements
### Requirement: 暂停按钮热区
暂停按钮热区缩小，排除喇叭图标所在区域（W-40 到 W-10 区域保留给喇叭）。

## REMOVED Requirements
无