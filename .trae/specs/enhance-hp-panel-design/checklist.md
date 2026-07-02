# 验证清单

## HTML 结构
- [x] `#hudHpModule` 高度改为 56px
- [x] 保留 header（❤ 生命值）和 HP 数值区域
- [x] 新增 `#hudHpSegments` 容器包含 5 个 `.hp-segment`
- [x] 新增 `#hudHpHeart` 心形装饰图标
- [x] 新增 `#hudShieldOverlay` 护盾叠加层

## CSS 样式
- [x] `.hp-segment` 基础样式正确（尺寸、圆角、深色背景）
- [x] `.hp-segment.filled` 红色渐变填充+光泽效果
- [x] `.hp-segment.empty` 半透明边框
- [x] `.hp-segment.damage-flash` 200ms 白色闪烁动画
- [x] 低血量时 `.hp-segment.empty` 红色脉动边框
- [x] `#hudShieldOverlay` 半透明蓝色叠加层
- [x] 低血量时心形图标跳动动画
- [x] 低血量时数值闪烁红色

## JS 更新逻辑
- [x] 根据 `player.hp` 动态更新分段格 filled/empty 状态
- [x] 受伤时对应分段格触发白色闪烁
- [x] 护盾状态控制 shield overlay 显示/隐藏
- [x] 低血量时触发脉动/闪烁视觉效果

## 运行验证
- [ ] 游戏启动后 HP 面板显示正常，5 个分段格全部填充
- [ ] 受伤一个 HP 后，对应分段格变空并闪白
- [ ] HP < 30% 时空格脉动边框 + 心形心跳 + 数字闪烁
- [ ] 拾取护盾道具后蓝色护盾层显示
- [ ] 护盾消失后蓝色层隐藏
- [ ] 控制台无报错