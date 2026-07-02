# 任务

- [ ] Task 1: HTML — HP 面板结构调整
  - 步骤:
    1. 将 `#hudHpModule` 高度从 36px 改为 56px
    2. 保留 header "❤ 生命值" 和 HP 数值
    3. 新增 `#hudHpSegments` 容器，用于容纳 5 个分段格
    4. 每个分段格用 `<div class="hp-segment">` 表示
    5. 新增 `#hudHpHeart` 心形装饰图标
    6. 新增 `#hudShieldOverlay` 护盾叠加层

- [ ] Task 2: CSS — 分段式 HP 条样式
  - 依赖: Task 1
  - 步骤:
    1. 定义 `.hp-segment` 基础样式（14px 宽方框，深色背景，圆角边框）
    2. 定义 `.hp-segment.filled` 填充态（红色渐变填充+光泽）
    3. 定义 `.hp-segment.empty` 空态（半透明红色边框+脉动低血量边框）
    4. 定义 `.hp-segment.damage-flash` 受伤闪白动画（@keyframes 200ms）
    5. 定义 `#hudShieldOverlay` 半透明蓝色叠加层样式
    6. 定义 `#hudHpHeart` 心形图标样式（低血量时跳动）

- [x] Task 3: JS — updateHUDOverlay() 适配分段条逻辑
  - 依赖: Task 1, Task 2
  - 步骤:
    1. 读取玩家 hp 和 maxHp，计算每个分段格的 filled/empty 状态
    2. 对每个 `.hp-segment` 添加/移除 `.filled` 类
    3. 受伤时在对应分段格触发 `.damage-flash` 类（200ms 后移除）
    4. 护盾存在时显示 `#hudShieldOverlay`，隐藏时隐藏
    5. 低血量时对空框添加低血量脉动类
    6. 低血量时数字闪烁（CSS 类控制）

- [ ] Task 4: Verify — 功能验证
  - 依赖: Task 3
  - 步骤:
    1. 确认所有分段格在高血量时正确填充
    2. 确认受伤时分段格闪烁动画触发
    3. 确认低血量脉动效果生效
    4. 确认护盾叠加层显示/隐藏正确
    5. Ctrl+F5 全量刷新验证无报错