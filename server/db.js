const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'game.db');

let db = null;
let SQL = null;

// 初始化数据库（异步，启动时调用）
async function initDatabase() {
  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 启用 WAL 模式（sql.js 中仅作标记，实际内存模式不支持 WAL）
  db.run('PRAGMA journal_mode=WAL');

  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      wechat_openid TEXT UNIQUE,
      qq_openid TEXT UNIQUE,
      nickname TEXT DEFAULT '玩家',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 游戏数据表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_game_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      high_score INTEGER DEFAULT 0,
      stats TEXT DEFAULT '{}',
      settings TEXT DEFAULT '{}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 验证码表（临时存储）
  db.run(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT,
      email TEXT,
      code TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDatabase();
  return db;
}

// 将内存数据库持久化到文件
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/**
 * 封装 SQL 查询方法，保持与 better-sqlite3 相似的调用风格
 */

// 执行无返回值的 SQL（INSERT/UPDATE/DELETE）
function run(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

// 查询单行
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

// 查询所有行
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// 执行多条 SQL（用于初始化）
function exec(sql) {
  db.exec(sql);
  saveDatabase();
}

// 获取最后插入的 ID
function getLastInsertRowid() {
  const result = get('SELECT last_insert_rowid() as id');
  return result ? result.id : null;
}

// prepare + run（用于单条插入后获取 lastInsertRowid）
function prepareAndRun(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
  return {
    lastInsertRowid: getLastInsertRowid()
  };
}

module.exports = {
  initDatabase,
  saveDatabase,
  run,
  get,
  all,
  exec,
  prepareAndRun
};