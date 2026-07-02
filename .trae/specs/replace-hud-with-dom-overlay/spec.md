# 用 DOM 覆盖层替换 Canvas HUD

## 为什么

基于 Canvas 的 HUD 渲染（`drawLeftHUD()`、`drawRightInfo()`）经过两轮修复（save/restore 平衡、缓存头、字体更换）后仍无法正确显示中文标签。根本原因是 Canvas 2D 文本渲染在不同浏览器/系统环境下对中日韩文字不可靠。改用 HTML+CSS 覆盖层元素可以彻底消除 Canvas 文本渲染问题，同时保留相同的视觉风格。

## 变更内容

- 在 `#gameContainer` 内添加绝对定位的 HUD 覆盖层 HTML 元素，覆盖在 Canvas 之上
- 添加匹配当前暗色玻璃面板设计的 CSS 样式（渐变背景、辉光边框、脉冲动画、圆角）
- 将 `drawLeftHUD()` 和 `drawRightInfo()` 的 Canvas 调用替换为 DOM 元素可见性/值更新
- 创建 `initHUDOverlay()` 在页面加载时初始化 DOM 元素
- 创建 `updateHUDOverlay()` 每帧更新 DOM 元素的值（玩家生命值、得分、连击、能量、难度、关卡）
- 移除 `drawLeftHUD()` 和 `drawRightInfo()` 的函数体（保留调用 DOM 更新的桩函数）
- 保持其他基于 Canvas 的 UI 不变（右上角控制按钮、升级通知、关卡过渡、连击显示、终极技闪烁）

## 影响范围

- 影响的规格：`fix-hud-label-not-showing`、`fix-hud-labels-still-not-showing`
- 影响的代码：`index.html`、`style.css`、`script.js`

## 视觉设计（与当前一致）

### 左侧面板（3 个模块纵向堆叠，180px 宽，左对齐）
每个模块：暗色玻璃面板（`rgba(8,8,28,0.82)`），带彩色边框辉光，表头分割条，标签 + 值，动画条

- **生命值模块**（y~10）：红色主题 — "❤ 生命值" 标签，生命值数字，红橙渐变生命值条
- **得分模块**（y~52）：蓝色主题 — "★ 得分" 标签，大号得分数字，连击指示
- **武器能源模块**（y~90）：青色主题 — "⚡ 武器能源" 标签，Lv.N 徽章，青绿渐变能量条 + 百分比

### 右侧面板（2 个模块纵向堆叠，120px 宽，右对齐）
- **难度等级模块**（y~42）：紫色主题 — "难度等级" 标签，Lv.N 值
- **当前关卡模块**（y~78）：粉色主题 — "当前关卡" 标签，"第 N 关" 值

## 新增需求

### 需求：DOM HUD 覆盖层元素

系统应在 Canvas 上方创建绝对定位的 HTML 元素来显示 HUD 信息。

#### 场景：HUD 初始化
- **当** 页面加载时
- **则** HUD 覆盖层 HTML 元素应在 `#gameContainer` 内以 `position: absolute` 创建
- **则** 元素默认应隐藏

#### 场景：游戏进行中的 HUD 更新
- **当** `gameState === 'playing'` 或 `'paused'` 或 `'over'`
- **则** HUD 元素应可见，并且值每帧更新

### 需求：视觉风格匹配

DOM HUD 应在视觉上匹配当前的 Canvas HUD 设计：暗色玻璃面板、彩色辉光边框、表头分割条、带辉光的渐变条、脉冲动画。

#### 场景：风格一致性
- **当** HUD 覆盖层渲染时
- **则** 应使用与当前 Canvas HUD 相同的颜色、尺寸、辉光效果和布局

### 需求：性能

DOM HUD 更新应最小化 DOM 回流。只有文本内容每帧变化；元素位置和样式在初始化时一次性设置。

#### 场景：高效更新
- **当** 游戏循环运行（60fps）
- **则** HUD 值应仅通过 `.textContent` 赋值更新，不改变样式/类

## 已移除的需求

### 需求：Canvas HUD 绘制
**原因**：Canvas 文本渲染对中文字符不可靠
**迁移方案**：由 DOM 覆盖层替代；`drawLeftHUD()` 和 `drawRightInfo()` 变为调用 `updateHUDOverlay()` 的桩函数