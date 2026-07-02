# Tasks
- [x] Task 1: 修改 AudioManager 实现自动 resume 策略
  - 在 gameLoop 每帧中调用 `audio.tryResume()`（幂等安全调用）
  - 在 canvas 的 mousemove 事件中调用 `audio.tryResume()`
  - 在 canvas 的 touchstart 事件中调用 `audio.tryResume()`
  - 移除 startMenuBGM() 中的 `this.ctx.state !== 'running'` 检查，改为直接调度（声音会在 resume 后播放）
  - 验证：页面加载后 AudioContext 被持续尝试激活
- [x] Task 2: 添加"音频被阻止"提示
  - 在 drawMenu() 中添加浮动提示 "🎵 点击开启音效"，仅当 AudioContext 为 suspended 时显示
  - 在 AudioContext 成功 resume 后，提示消失
  - 提示添加脉动动画效果
  - 验证：浏览器阻止时显示提示，resume 后消失
- [x] Task 3: 在 mousemove 和 touchstart 事件中调用 resume
  - 在 canvas 的 mousemove 事件处理函数中添加 `audio.tryResume()`
  - 在 canvas 的 touchstart 事件处理函数中添加 `audio.tryResume()`
  - 验证：移动鼠标或触摸屏幕即可触发 BGM

# Task Dependencies
- [Task 1] 无依赖
- [Task 2] 需要 [Task 1] 中的 AudioContext 状态判断
- [Task 3] 无依赖，可与 Task 1 并行