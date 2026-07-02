# 任务列表

- [x] 任务 1：在 index.html 中添加 HUD 覆盖层 HTML 结构
  - 在 `#gameContainer` 内添加 `<div id="hudOverlay">`，绝对定位覆盖 Canvas
  - 添加左侧面板容器（生命值、得分、武器能源），包含标签 + 值 + 进度条元素
  - 添加右侧面板容器（难度等级、当前关卡），包含标签 + 值元素
  - 所有元素默认隐藏（`display: none`）

- [x] 任务 2：在 style.css 中添加 HUD 覆盖层 CSS 样式
  - 样式化面板以匹配当前 Canvas 设计（暗色玻璃背景、彩色辉光边框、圆角）
  - 通过 CSS 实现表头分割条、渐变填充条、脉冲动画
  - 中文标签使用 `"Microsoft YaHei", sans-serif` 字体
  - 使用一致的尺寸（左侧 180px，右侧 120px，相同垂直间距）

- [x] 任务 3：在 script.js 中实现 DOM HUD 更新逻辑
  - 创建 `initHUDOverlay()` — 创建/引用 DOM 元素，页面加载时调用一次
  - 创建 `updateHUDOverlay()` — 每帧更新 DOM 元素的 `.textContent` 和 `.style.width`（进度条）
  - 修改 `drawLeftHUD()` — 将 Canvas 绘制替换为调用 `updateHUDOverlay()`
  - 修改 `drawRightInfo()` — 将 Canvas 绘制替换为调用 `updateHUDOverlay()`
  - 确保 HUD 覆盖层可见性随游戏状态切换（playing/paused/over 时可见，menu 时隐藏）
  - 通过 `style.display` 显示/隐藏覆盖层容器元素

- [x] 任务 4：验证游戏运行中 HUD 标签是否可见
  - 重启服务器（清除浏览器缓存）
  - 登录，开始游戏
  - 验证所有 5 个标签正确显示："❤ 生命值"、"★ 得分"、"⚡ 武器能源"、"难度等级"、"当前关卡"
  - 验证生命值条、能量条、得分、连击、难度等级、关卡数字正确更新
  - 检查浏览器控制台无错误

# 任务依赖关系

- 任务 1 → 任务 3
- 任务 2 → 任务 3
- 任务 3 → 任务 4