// MySQL / MariaDB connection pool (mysql2, prepared statements).
// Usage:
//   const db = require('../config/db');
//   const user = await db.one('SELECT * FROM users WHERE email = ?', [email]);
//   const rows = await db.query('SELECT * FROM students WHERE status = ?', ['active']);
//   await db.transaction(async (conn) => { await conn.execute('INSERT ...', [..]); });
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'utunyange_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z', // store and read DATETIME values as UTC
});

// Every connection works in UTC, matching `timezone: 'Z'` above, so NOW(), TIMESTAMP
// columns and JavaScript dates all agree no matter where the server runs.
pool.pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

// Prepared statement (safe against SQL injection). Always pass values in `params`.
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Same as query() but for statements using LIMIT/OFFSET placeholders, which some
// MySQL versions reject in prepared mode. Values are still escaped by mysql2.
async function queryRaw(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// First row or null.
async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// Run several statements atomically. Commits on success, rolls back on error.
async function transaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, queryRaw, one, transaction, testConnection };
