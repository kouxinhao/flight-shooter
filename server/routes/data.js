const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// 所有数据路由都需要认证
router.use(authMiddleware);

// 获取用户游戏数据
router.get('/', (req, res) => {
  const data = db.get('SELECT * FROM user_game_data WHERE user_id = ?', [req.user.userId]);
  if (!data) {
    return res.status(404).json({ error: '数据不存在' });
  }

  res.json({
    success: true,
    data: {
      highScore: data.high_score,
      stats: JSON.parse(data.stats || '{}'),
      settings: JSON.parse(data.settings || '{}')
    }
  });
});

// 保存用户游戏数据
router.post('/', (req, res) => {
  const { highScore, stats, settings } = req.body;

  const existing = db.get('SELECT * FROM user_game_data WHERE user_id = ?', [req.user.userId]);
  
  if (existing) {
    // 合并数据：只更新提供的字段
    const newHighScore = highScore !== undefined ? Math.max(existing.high_score, highScore) : existing.high_score;
    const newStats = stats ? JSON.stringify(stats) : existing.stats;
    const newSettings = settings ? JSON.stringify(settings) : existing.settings;

    db.run(
      `UPDATE user_game_data 
       SET high_score = ?, stats = ?, settings = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [newHighScore, newStats, newSettings, req.user.userId]
    );
  } else {
    db.run(
      `INSERT INTO user_game_data (user_id, high_score, stats, settings)
       VALUES (?, ?, ?, ?)`,
      [req.user.userId, highScore || 0, JSON.stringify(stats || {}), JSON.stringify(settings || {})]
    );
  }

  res.json({ success: true, message: '数据已保存' });
});

module.exports = router;