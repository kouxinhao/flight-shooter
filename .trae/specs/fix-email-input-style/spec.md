# 修复邮箱输入框样式 Spec

## Why
邮箱输入框使用 `type="email"`，但 CSS 选择器中未包含该类型，导致邮箱输入框没有样式，与验证码输入框外观不一致。

## What Changes
- 在 CSS 选择器列表中添加 `#authContent input[type="email"]`

## Impact
- Affected code: `auth-ui.js` line 98-99

## ADDED Requirements
### Requirement: 统一输入框样式
- **WHEN** 邮箱输入框显示
- **THEN** 其样式（宽度、内边距、背景色、边框、圆角、文字颜色、字号）与验证码输入框完全一致