# Auto-Play BGM on Page Load Spec

## Why
目前菜单 BGM 需要用户点击后才能播放（浏览器 autoplay 策略限制），但用户希望一进入页面就有背景音乐，无需任何交互。

## What Changes
- 修改 AudioManager 的 resume 策略：页面加载后立即尝试激活 AudioContext
- 在 gameLoop 每一帧中持续尝试 resume AudioContext
- 在 mousemove / touchstart 等低门槛事件中也尝试 resume
- 如果浏览器仍然阻止自动播放，显示一个小型提示引导用户

## Constraints
现代浏览器（Chrome/Firefox/Safari）的 autoplay 政策限制 AudioContext 在无用户手势时无法播放音频。本方案采取以下策略最大化「免点击播放」的成功率：
- 策略 1：页面加载后立即创建并 resume AudioContext（部分浏览器允许）
- 策略 2：每帧尝试 resume（浏览器可能在后续帧中批准）
- 策略 3：mousemove（鼠标移动）触发 resume（某些浏览器视其为用户激活）
- 策略 4：touchstart（任何触摸）触发 resume
- 如果以上均失败，显示浮动提示 "🎵 点击开启音效"

## Impact
- Affected specs: 菜单 BGM、音效系统
- Affected code: `script.js`（AudioManager、gameLoop、事件处理器）

## ADDED Requirements
### Requirement: 自动启动 BGM
系统 SHALL 在页面加载后**立即**尝试启动菜单 BGM，无需用户点击。

#### Scenario: 浏览器允许自动播放
- **WHEN** 用户打开游戏页面
- **THEN** 页面加载完毕时菜单 BGM 自动响起
- **AND** BGM 循环播放

#### Scenario: 浏览器阻止自动播放
- **WHEN** 用户打开游戏页面，浏览器阻止 AudioContext 自动播放
- **THEN** 系统每帧尝试 resume AudioContext
- **AND** 在 mousemove/touchstart 事件中尝试 resume
- **AND** 显示浮动提示 "🎵 点击开启音效"
- **WHEN** 用户移动鼠标或触摸屏幕
- **THEN** AudioContext resume，BGM 开始播放
- **AND** 浮动提示消失

## MODIFIED Requirements
### Requirement: AudioManager.resume 策略
将 `resume()` 改为幂等且可安全重复调用，从 gameLoop 和事件处理器中频繁调用。

## REMOVED Requirements
无