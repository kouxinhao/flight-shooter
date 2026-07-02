# Tasks

- [x] Task 1: 关卡与 Boss 战系统 — 将游戏划分为关卡（每 90 秒一关），每关结尾出现关卡 Boss，击败后进入下一关
  - [x] 1.1 新增关卡相关的全局变量：currentStage、stageBossSpawned 等
  - [x] 1.2 在 updateEnemies() 中增加关卡 Boss 生成逻辑（playingFrameCount % 5400 === 0 时触发）
  - [x] 1.3 创建关卡 Boss 类型（STAGE_BOSS），具有更高 HP 和特殊攻击模式
  - [x] 1.4 增加关卡过渡提示 UI 绘制
  - [x] 1.5 关卡递增时重置难度基准但叠加全局难度因子
  - [x] 1.6 击败关卡 Boss 时播放特殊效果和额外得分奖励

- [x] Task 2: 连击奖励系统 — 跟踪连续击杀并应用分数倍率
  - [x] 2.1 新增连击相关全局变量：comboCount、lastKillTime、scoreMultiplier
  - [x] 2.2 在 checkCollisions() 中击杀敌机时更新连击逻辑
  - [x] 2.3 在 update() 中检查连击超时重置
  - [x] 2.4 绘制连击 UI（combo 计数和倍率显示，带视觉特效）
  - [x] 2.5 连击倍率应用到得分计算

- [x] Task 3: 特殊技能/大招系统 — 能量满后可释放全屏大招
  - [x] 3.1 新增大招相关的变量和状态
  - [x] 3.2 添加 E 键监听和触屏按钮处理，触发大招释放
  - [x] 3.3 实现大招效果：消耗全部能量，对屏幕内所有敌机造成伤害
  - [x] 3.4 大招特效（全屏闪光、粒子爆发）和音效
  - [x] 3.5 触屏模式下显示大招按钮

- [x] Task 4: 更多敌机类型 — 新增自爆机、隐形机、分裂机
  - [x] 4.1 在 ENEMY_TYPES 中增加 KAMIKAZE、STEALTH、SPLITTER 三种类型定义
  - [x] 4.2 实现自爆机逻辑：追踪玩家、接触/被毁爆炸
  - [x] 4.3 实现隐形机逻辑：半透明绘制、Z 字形移动
  - [x] 4.4 实现分裂机逻辑：死亡后分裂为 2 个小敌机
  - [x] 4.5 在 chooseEnemyType() 中平衡新敌机的出现概率
  - [x] 4.6 为分裂出的子机增加道具掉落概率（较低）

- [x] Task 5: 新手教程/引导 — 首次游戏时展示操作指引
  - [x] 5.1 新增 tutorialSeen 的 localStorage 标志
  - [x] 5.2 绘制教程遮罩层，包含操作说明和道具/技能介绍
  - [x] 5.3 添加关闭教程的交互逻辑（点击/按键）
  - [x] 5.4 在 menu 状态下检测并显示教程

- [x] Task 6: 背景音乐扩展到菜单界面 — 菜单界面也播放 BGM
  - [x] 6.1 修改 goToMenu() 不停止 BGM，而是保持播放
  - [x] 6.2 在菜单状态下 BGM 音量降低到 0.15，游戏时恢复到 0.25
  - [x] 6.3 BGM 在首次进入菜单时自动启动（audio.init() 后调用 startBGM()）

# Task Dependencies
- [Task 1] depends on understanding existing updateEnemies() and boss spawn logic
- [Task 2] depends on understanding checkCollisions() and scoring logic
- [Task 3] depends on understanding energy system and key input handling
- [Task 4] depends on understanding enemy class and rendering pipeline
- [Task 5] depends on understanding menu state UI
- [Task 6] depends on understanding AudioManager and game state transitions
- Tasks 1-6 are independent and can be implemented in parallel