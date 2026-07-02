# Fix HUD Chinese Labels Still Not Showing

## Why

After the previous spec (`fix-hud-label-not-showing`) added the missing `ctx.restore()` in `drawRightInfo()`, the user reports Chinese HUD labels still are not visible during gameplay. The root cause may be server/browser caching of the old code, or there may be other rendering issues that prevent the labels from appearing.

## Investigation Findings

1. **Code on disk is correct** — `script.js` contains all Chinese labels (`'❤ 生命值'`, `'★ 得分'`, `'⚡ 武器能源'`, `'难度等级'`, `'当前关卡'`)
2. **save/restore pairs are balanced** — 28 saves and 28 restores confirmed
3. **No overlap between elements** — Top-right controls (y:6-34) do not overlap with right info panel (y:42+)
4. **Game loop calls drawUI correctly** — `drawUI()` → `drawLeftHUD()` + `drawRightInfo()` when `gameState === 'playing'`
5. **Server IS serving the updated file** — verified via HTTP fetch that Chinese labels exist in served content

## Potential Root Causes

- **Browser caching**: The old `script.js` may be cached in the user's browser. No cache-control headers are set by the Express static server, and no cache-busting mechanism exists in the HTML
- **Font rendering**: `Arial` may not render Chinese glyphs on some systems; using `sans-serif` as fallback is more reliable
- **Text drawing robustness**: Some text properties (textAlign, textBaseline) set in earlier draw calls within the same frame might not be properly restored

## What Changes

- Add `Cache-Control: no-cache` header to the Express static file server to prevent browser caching of game assets
- Change font family from `Arial` to `"Microsoft YaHei", sans-serif` for Chinese text labels to ensure reliable CJK rendering
- Explicitly set `textAlign` and `textBaseline` before each label draw call for robustness (hardening, these are already set correctly)
- Add debug `console.debug` markers in HUD functions and a manual verification step

## Impact

- Affected specs: `fix-hud-label-not-showing`
- Affected code: `server/index.js`, `script.js` (drawLeftHUD, drawRightInfo functions)

## ADDED Requirements

### Requirement: Prevent browser caching of game scripts

The server SHALL set `Cache-Control: no-cache` header for static file responses to force browsers to always request the latest version.

#### Scenario: Static file cache headers
- **WHEN** browser requests any static file from the Express server
- **THEN** response SHALL include `Cache-Control: no-cache` header

### Requirement: Reliable Chinese font rendering

HUD label text SHALL use `"Microsoft YaHei", sans-serif` font family instead of `Arial` to ensure Chinese characters render correctly across all browsers.

#### Scenario: Chinese text rendering
- **WHEN** HUD labels with Chinese characters are drawn on canvas
- **THEN** they SHALL be visible and properly rendered

### Requirement: Manual verification step

After the fix is applied, the server SHALL be restarted and the game SHALL be manually tested to confirm labels appear during gameplay.

#### Scenario: Verification
- **WHEN** user logs in, starts the game, and enters 'playing' state
- **THEN** all five labels SHALL be visible: 生命值, 得分, 武器能源, 难度等级, 当前关卡