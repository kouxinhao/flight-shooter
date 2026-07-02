require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 设置缓存控制头，防止浏览器缓存静态资源
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// 静态文件服务（提供游戏前端页面）
app.use(express.static(path.join(__dirname, '..')));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user/data', require('./routes/data'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 初始化数据库后启动服务
db.initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`游戏后端服务已启动，端口: ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/api/health`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});