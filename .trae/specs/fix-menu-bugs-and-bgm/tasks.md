# Tasks
- [x] Task 1: 修复齿轮按钮不可点击问题
  - 将齿轮点击检测（gearX/gearY）从第二个 mousedown 处理器的 settings 面板逻辑中移到主 canvas mousedown 处理器
  - 同时在主 touchstart 处理器中添加对应的齿轮点击检测
  - 验证：点击齿轮打开设置面板、点击关闭按钮或 Esc 关闭
- [x] Task 2: 修复喇叭按钮误触发暂停问题
  - 在 click/mousedown/touchstart 处理器中为喇叭图标（W-25, 22）添加独立的点击检测
  - 缩小暂停按钮热区：左边界从 W-50 改为 W-42，排除喇叭区域
  - 点击喇叭调用 audio.toggleMute()
  - 验证：点击喇叭切换静音状态，不触发暂停或游戏开始
- [x] Task 3: 添加激昂的菜单背景音乐
  - 在 AudioManager 中添加 `startMenuBGM()` 方法，使用 Web Audio API 合成激昂的 BGM
  - BGM 特点：快节奏（135BPM）、强力和弦、带有打击乐感的噪音层
  - 在 gameLoop 中 menu 状态下自动调用 startMenuBGM()
  - 进入 playing 状态时切换到游戏 BGM（startBGM），返回菜单恢复菜单 BGM
  - 静音状态下不播放
  - 验证：菜单界面播放激昂 BGM，进入游戏切换，返回菜单恢复

# Task Dependencies
- [Task 1] 和 [Task 2] 无依赖，可并行
- [Task 3] 无依赖