# 任务

- [x] Task 1: HTML — HP 面板和能源面板结构改造
  - 步骤:
    1. HP 面板：加高到 64px，移除旧 `.hp-segment` 结构
    2. HP 面板：新增 5 个 `.hp-orb` 圆形宝珠容器
    3. HP 面板：新增左侧 ❤ 标签、右侧大数字
    4. HP 面板：新增 `.hp-shield-ring` 护盾光环层
    5. 能源面板：加高到 48px，保留 header 和 weaponLv
    6. 能源面板：替换旧 `#hudEnergyBar` 为 `.energy-bar-thick` 厚槽
    7. 能源面板：新增能量%数字容器

- [ ] Task 2: CSS — HP 圆形宝珠 + 能源厚槽全套样式
  - 依赖: Task 1
  - 步骤:
    1. `.hp-orb` 基础样式（16×16px 圆形, 暗色背景）
    2. `.hp-orb.filled` 填充态（红橙径向渐变 + 白色高光点 + 脉动）
    3. `.hp-orb.empty` 空态（暗红半透明）
    4. `.hp-orb.damage-burst` 受伤爆发动画（@keyframes orbDamageBurst）
    5. `.hp-shield-ring` 护盾半透明蓝色旋转环（@keyframes shieldSpin）
    6. 左侧标签 `.hp-icon`（发光 ❤ + HP 文字）
    7. 右侧数字 `.hp-number`（28px, 发光）
    8. `.energy-bar-thick` 厚槽（18px 高, 青色渐变, 流动光泽 @keyframes energyFlow）
    9. `.energy-bar-thick.full` 满能量脉冲
    10. `.energy-bar-thick.low` 低能量红色
    11. 武器等级徽章强化（发光边框 + 升级闪烁动画）
    12. 低血量动效（宝珠脉动、面板边框闪烁）
    13. 护盾激活时 `#hudShieldRing` 显示动画

- [x] Task 3: JS — updateHUDOverlay() 适配宝珠和厚槽
  - 依赖: Task 1, Task 2
  - 步骤:
    1. 读取 player.hp，遍历 5 个 `.hp-orb` 添加/移除 filled/empty
    2. 检测 hp 减少，在对应宝珠触发 damage-burst 类（300ms 后移除）
    3. 控制护盾环 `.hp-shield-ring` 的显示
    4. 低血量时宝珠加 `hp-orb-pulse` 类
    5. 更新厚能量条宽度（将旧 `#hudEnergyBar` 改为 `.energy-bar-thick .energy-fill` 的宽度）
    6. 更新能量%数字
    7. 检测 weaponLevel 变化触发升级闪烁（Lv badge 加 flash 类）
    8. 满能量时加 `full` 类，低能量时加 `low` 类

- [x] Task 4: Verify — 功能验证
  - 依赖: Task 3
  - 步骤:
    1. 确认宝珠在满血量时全部填充发光
    2. 确认受伤时对应宝珠爆发动画然后变暗
    3. 确认护盾激活时蓝色旋转环显示
    4. 确认低血量时宝珠脉动
    5. 确认厚能量槽随能量变化正确
    6. 确认能量满时脉冲发光
    7. 确认武器等级变化显示正确
    8. Ctrl+F5 刷新无报错