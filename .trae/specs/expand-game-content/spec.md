# Expand Game Content Spec

## Why
游戏核心玩法已较为完善，但在内容深度、操作爽感和新手体验上仍有提升空间。引入关卡系统、连击奖励、特殊技能、新敌机类型、新手引导以及菜单 BGM，可以让游戏更具阶段感、策略性和完整度。

## What Changes
- **关卡与 Boss 战系统**: 引入明确的关卡概念（每 90 秒为一大关），每关结尾出现强力的关卡 Boss，击败后进入下一关
- **连击(Combo)奖励系统**: 短时间内连续击杀敌机触发连击倍率，倍率越高得分加成越高
- **特殊技能/大招系统**: 能量满后可通过按键（E 键/触屏按钮）消耗全部能量释放强力技能
- **更多敌机类型**: 新增自爆机、隐形机、分裂机三种敌机类型
- **新手教程/引导**: 首次进入游戏时展示操作指引和道具说明
- **背景音乐扩展到菜单界面**: 在菜单界面也播放背景音乐，进入游戏后继续播放

## Impact
- Affected game systems: 敌人生成、能量系统、得分系统、游戏状态管理、UI 绘制
- Affected code: script.js (主要在游戏状态管理、更新函数、绘制函数中添加新逻辑)
- No breaking changes

## ADDED Requirements

### Requirement: 关卡与 Boss 战系统
The system SHALL divide gameplay into stages, each culminating in a unique boss encounter.

#### Scenario: Stage progression
- **WHEN** playingFrameCount reaches multiples of 5400 (90 seconds at 60fps)
- **THEN** a stage transition notification SHALL appear, and a stage boss SHALL spawn
- **AND** difficulty SHALL reset at stage boundaries but compound across stages

#### Scenario: Stage boss
- **WHEN** a stage boss spawns
- **THEN** it SHALL have unique properties (higher HP, special attack patterns) distinct from regular bosses
- **AND** defeating it SHALL award bonus score

### Requirement: 连击奖励系统
The system SHALL track consecutive enemy kills within a time window and apply score multipliers.

#### Scenario: Combo tracking
- **WHEN** player kills an enemy
- **THEN** if the kill occurs within 1.5 seconds of the previous kill, combo counter SHALL increment
- **AND** score multiplier SHALL increase (×2 at 5 kills, ×3 at 10 kills, ×5 at 20 kills, ×10 at 50 kills)
- **AND** combo SHALL reset if no kill occurs within 1.5 seconds

#### Scenario: Combo display
- **WHEN** combo is active (>= 2 kills)
- **THEN** a combo counter and multiplier SHALL display on screen with visual emphasis

### Requirement: 特殊技能/大招系统
The system SHALL allow the player to consume all energy to unleash a special skill.

#### Scenario: Activate special skill
- **WHEN** player has 100 energy and presses E key (or touch button)
- **THEN** all energy SHALL be consumed
- **AND** a screen-clearing blast SHALL damage all enemies on screen
- **AND** special visual and audio effects SHALL play

### Requirement: 更多敌机类型
Three new enemy types SHALL be added to the enemy pool.

#### Scenario: 自爆机 (Kamikaze)
- **WHEN** spawned, it SHALL move quickly toward the player's current position
- **AND** upon reaching the player or being destroyed, it SHALL explode in a small area
- **AND** it SHALL not shoot bullets

#### Scenario: 隐形机 (Stealth)
- **WHEN** on screen, it SHALL be semi-transparent (low opacity)
- **AND** it SHALL move in an unpredictable zigzag pattern
- **AND** it SHALL be able to shoot

#### Scenario: 分裂机 (Splitter)
- **WHEN** destroyed, it SHALL split into 2 smaller enemies
- **AND** the smaller enemies SHALL have reduced HP and speed

### Requirement: 新手教程/引导
The system SHALL provide a tutorial for first-time players.

#### Scenario: First-time tutorial
- **WHEN** player enters the game for the first time (no saved high score and no tutorial flag)
- **THEN** a tutorial overlay SHALL display on the menu
- **AND** it SHALL explain: movement controls, shooting, power-ups, pause, special skill
- **AND** player can dismiss it by clicking/tapping

#### Scenario: Tutorial persistence
- **WHEN** player dismisses the tutorial
- **THEN** a localStorage flag SHALL be set to prevent showing it again

### Requirement: 背景音乐扩展到菜单界面
BGM SHALL play on the menu screen and continue during gameplay.

#### Scenario: Menu BGM
- **WHEN** gameState is 'menu'
- **THEN** background music SHALL play
- **AND** volume SHALL be slightly lower than gameplay volume

#### Scenario: Seamless transition
- **WHEN** player transitions from menu to playing
- **THEN** BGM SHALL continue without interruption
- **AND** volume SHALL smoothly transition to gameplay level

## MODIFIED Requirements
None.

## REMOVED Requirements
None.