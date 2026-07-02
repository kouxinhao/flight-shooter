const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendEmailCode } = require('../email');

// 发送验证码 — 通过邮箱发送
router.post('/send-code', async (req, res) => {
  const { email } = req.body;
  // 邮箱格式校验
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: '请输入有效的邮箱地址' });
  }

  // 生成 6 位验证码
  const code = String(Math.floor(100000 + Math.random() * 900000));

  // 调用邮件服务发送
  const result = await sendEmailCode(email, code);
  if (!result.success) {
    return res.status(500).json({ error: result.message });
  }

  // 存入数据库（10 分钟有效）
  db.run('INSERT INTO verification_codes (email, code) VALUES (?, ?)', [email, code]);

  res.json({ success: true, message: '验证码已发送' });
});

// 校验验证码并登录/注册
router.post('/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: '请提供邮箱和验证码' });
  }

  // 查找最新的验证码
  const row = db.get(
    'SELECT code FROM verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1',
    [email]
  );

  if (!row || row.code !== code) {
    return res.status(400).json({ error: '验证码错误' });
  }

  // 查找或创建用户
  let user = db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    db.run('INSERT INTO users (email, nickname) VALUES (?, ?)', [email, email.split('@')[0] + '号玩家']);
    user = db.get('SELECT * FROM users WHERE email = ?', [email]);
    const userId = user ? user.id : null;
    
    // 同时创建游戏数据记录
    if (userId) {
      db.run('INSERT INTO user_game_data (user_id) VALUES (?)', [userId]);
    }
  }

  // 清理已使用的验证码
  db.run('DELETE FROM verification_codes WHERE email = ?', [email]);

  // 生成 JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email, nickname: user.nickname },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname
    }
  });
});

// 微信登录
router.post('/wechat', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: '请提供微信授权码' });
  }

  // 模拟微信 code 换 openid（生产环境需调用微信 API）
  const mockOpenid = 'wx_' + code.slice(0, 28);

  // 查找或创建用户
  let user = db.get('SELECT * FROM users WHERE wechat_openid = ?', [mockOpenid]);
  if (!user) {
    db.run('INSERT INTO users (wechat_openid, nickname) VALUES (?, ?)', [mockOpenid, '微信玩家_' + mockOpenid.slice(-4)]);
    user = db.get('SELECT * FROM users WHERE wechat_openid = ?', [mockOpenid]);
    const userId = user ? user.id : null;
    if (userId) {
      db.run('INSERT INTO user_game_data (user_id) VALUES (?)', [userId]);
    }
  }

  const token = jwt.sign(
    { userId: user.id, wechat_openid: user.wechat_openid, nickname: user.nickname },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      wechat_openid: user.wechat_openid,
      nickname: user.nickname
    }
  });
});

// QQ 登录
router.post('/qq', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: '请提供 QQ 授权码' });
  }

  // 模拟 QQ code 换 openid（生产环境需调用 QQ API）
  const mockOpenid = 'qq_' + code.slice(0, 28);

  let user = db.get('SELECT * FROM users WHERE qq_openid = ?', [mockOpenid]);
  if (!user) {
    db.run('INSERT INTO users (qq_openid, nickname) VALUES (?, ?)', [mockOpenid, 'QQ玩家_' + mockOpenid.slice(-4)]);
    user = db.get('SELECT * FROM users WHERE qq_openid = ?', [mockOpenid]);
    const userId = user ? user.id : null;
    if (userId) {
      db.run('INSERT INTO user_game_data (user_id) VALUES (?)', [userId]);
    }
  }

  const token = jwt.sign(
    { userId: user.id, qq_openid: user.qq_openid, nickname: user.nickname },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      qq_openid: user.qq_openid,
      nickname: user.nickname
    }
  });
});

module.exports = router;