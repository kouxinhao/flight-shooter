# 验证清单

## HTML 结构（HP 面板）
- [ ] `#hudHpModule` 高度 64px
- [ ] 旧 `.hp-segment` 结构已移除
- [ ] 新增 5 个 `.hp-orb` 圆形宝珠（每个 16×16px）
- [ ] 新增左侧 `.hp-icon` 标签（❤ + HP）
- [ ] 新增右侧 `.hp-number` 大数字
- [ ] 新增 `.hp-shield-ring` 护盾光环层

## HTML 结构（能源面板）
- [ ] `#hudEnergyModule` 高度 48px
- [ ] 保留 header + weaponLv 徽章
- [ ] 旧 `#hudEnergyBar` 已替换为 `.energy-bar-thick`
- [ ] 新增能量 % 数字容器

## CSS 样式（HP 宝珠）
- [ ] `.hp-orb` 基础圆形（16px, 暗红背景）
- [ ] `.hp-orb.filled` 红橙径向渐变 + 高光点 + 脉动
- [ ] `.hp-orb.empty` 暗红半透明
- [ ] `.hp-orb.damage-burst` 300ms 白色爆发缩放动画
- [ ] `.hp-shield-ring` 蓝色旋转环动画
- [ ] 低血量宝珠脉动 `.hp-orb-pulse`
- [ ] `.hp-number` 28px 发光数字样式

## CSS 样式（能量槽）
- [ ] `.energy-bar-thick` 18px 高, 青色渐变, 流动光泽动画
- [ ] `.energy-bar-thick.full` 满能量脉冲
- [ ] `.energy-bar-thick.low` 低能量红色警告
- [ ] 武器等级徽章发光边框 + 升级闪烁

## JS 更新逻辑
- [ ] hp → 遍历 5 个 `.hp-orb` 设置 filled/empty
- [ ] hp 减少 → 对应宝珠 damage-burst 类 300ms 移除
- [ ] shield → `.hp-shield-ring` 显示/隐藏
- [ ] 低血量 → 宝珠 pulse + 面板边框闪烁
- [ ] energyRatio → `.energy-fill` 宽度更新
- [ ] 满能量 → `.energy-bar-thick` 加 full 类
- [ ] 低能量 → 加 low 类
- [ ] weaponLevel 变化 → Lv 徽章闪烁

## 运行验证
- [x] 游戏启动后 5 颗宝珠全部发光
- [x] 受伤一次后对应宝珠爆发动画并变暗
- [x] 护盾激活时旋转蓝环显示
- [x] HP < 30% 宝珠脉动 + 面板警告
- [x] 能量槽随射击消耗正确减少
- [x] 能量满时脉冲发光
- [x] 武器等级升级时徽章闪烁
- [x] 控制台无报错