# Tasks

- [x] Task 1: Add cache-control headers to Express static file server
  - Modify `server/index.js` to set `Cache-Control: no-cache` for all static file responses
  - Use Express middleware to intercept static file requests

- [x] Task 2: Change Chinese label font to CJK-friendly family
  - In `drawLeftHUD()`, change all `'bold 12px Arial'` / `'bold 11px Arial'` for labels to use `'"Microsoft YaHei", sans-serif'`
  - In `drawRightInfo()`, change label font to `'"Microsoft YaHei", sans-serif'`
  - Keep numeric/score fonts using `Arial` or `"Courier New"` (they don't need Chinese support)

- [x] Task 3: Restart server and verify labels are visible
  - Restart the Node.js server to apply cache header changes
  - Open the game in browser with DevTools, clear browser cache
  - Log in, start the game, verify all 5 labels are visible
  - Check browser console for any Canvas-related errors

# Task Dependencies

- Task 1 → Task 3
- Task 2 → Task 3