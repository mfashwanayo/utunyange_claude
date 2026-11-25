const db = require('../config/db');
const { Where, like, limitSql } = require('../utils/sql');
const { nz } = require('../utils/helpers');

const SELECT_USER = `
  SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.status,
         u.must_change_password, u.failed_attempts, u.locked_until, u.last_login_at,
         r.name AS role_name, r.label AS role_label
  FROM users u
  JOIN roles r ON r.id = u.role_id`;

const findByEmail = (email) => db.one(`${SELECT_USER} WHERE u.email = ? LIMIT 1`, [email]);
const findById = (id) => db.one(`${SELECT_USER} WHERE u.id = ? LIMIT 1`, [id]);

// After a wrong password: count it, and lock the account when the limit is reached.
// (locked_until is evaluated before failed_attempts, so both use the old counter.)
const registerFailedLogin = (id, maxAttempts, lockMinutes) =>
  db.query(
    `UPDATE users
        SET locked_until    = IF(failed_attempts + 1 >= ?, ?, locked_until),
            failed_attempts = IF(failed_attempts + 1 >= ?, 0, failed_attempts + 1)
      WHERE id = ?`,
    [maxAttempts, new Date(Date.now() + lockMinutes * 60 * 1000), maxAttempts, id]
  );

const registerSuccessfulLogin = (id) =>
  db.query('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?', [new Date(), id]);

const setPassword = (id, hash) =>
  db.query(
    'UPDATE users SET password_hash = ?, must_change_password = 0, failed_attempts = 0, locked_until = NULL WHERE id = ?',
    [hash, id]
  );

// ---- Password reset tokens (only the SHA-256 hash is stored) ----
const invalidateResets = (userId) =>
  db.query('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL', [new Date(), userId]);

const createReset = (userId, tokenHash, expiresAt) =>
  db.query('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, tokenHash, expiresAt]);

const findValidReset = (tokenHash) =>
  db.one(
    `SELECT pr.id, pr.user_id, u.email, u.status
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
      WHERE pr.token_hash = ? AND pr.used_at IS NULL AND pr.expires_at > ?
      LIMIT 1`,
    [tokenHash, new Date()]
  );

const markResetUsed = (id) => db.query('UPDATE password_resets SET used_at = ? WHERE id = ?', [new Date(), id]);

// ================= Admin management =================
function filter({ q, role, status } = {}) {
  const w = new Where();
  if (q) {
    const l = like(q);
    w.add("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)", l, l, l, l);
  }
  if (role) w.add('r.name = ?', role);
  if (status) w.add('u.status = ?', status);
  return w;
}

const adminList = (f, limit, offset) => {
  const w = filter(f);
  return db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.status, u.last_login_at,
            r.name AS role_name, r.label AS role_label
       FROM users u JOIN roles r ON r.id = u.role_id
       ${w.sql}
      ORDER BY u.created_at DESC, u.id DESC
      ${limitSql(limit, offset)}`,
    w.params
  );
};

const adminCount = async (f) => {
  const w = filter(f);
  const r = await db.one(`SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id = u.role_id ${w.sql}`, w.params);
  return r.n;
};

// One account for the admin screens (no password hash).
const findForAdmin = (id) =>
  db.one(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.status, u.last_login_at,
            r.name AS role_name, r.label AS role_label
       FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = ? LIMIT 1`,
    [id]
  );

async function listRoles() {
  const rows = await db.query('SELECT id, name, label FROM roles ORDER BY id');
  return rows;
}

const emailTaken = async (email, exceptId = 0) =>
  !!(await db.one('SELECT id FROM users WHERE email = ? AND id <> ?', [email, exceptId]));

// Insert inside an open transaction; returns the new user id. Starts with a temporary
// password, so the person must choose their own at first sign-in.
async function insertUser(conn, d) {
  const [r] = await conn.execute(
    `INSERT INTO users (role_id, first_name, last_name, email, phone, password_hash, status, must_change_password)
     VALUES ((SELECT id FROM roles WHERE name = ?), ?, ?, ?, ?, ?, 'active', 1)`,
    [d.role, d.first_name, d.last_name, d.email, nz(d.phone), d.password_hash]
  );
  return r.insertId;
}

const createUser = (d) => db.transaction((conn) => insertUser(conn, d));

const updateAdmin = (id, d) =>
  db.query(
    `UPDATE users
        SET first_name = ?, last_name = ?, email = ?, phone = ?,
            role_id = (SELECT id FROM roles WHERE name = ?), status = ?
      WHERE id = ?`,
    [d.first_name, d.last_name, d.email, nz(d.phone), d.role, d.status, id]
  );

// Same, inside an open transaction, without touching role or status.
const updateBasicTx = (conn, id, d) =>
  conn.execute('UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?', [
    d.first_name, d.last_name, d.email, nz(d.phone), id,
  ]);

const setStatus = (id, status) => db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);

const setTempPassword = (id, hash) =>
  db.query(
    'UPDATE users SET password_hash = ?, must_change_password = 1, failed_attempts = 0, locked_until = NULL WHERE id = ?',
    [hash, id]
  );

module.exports = {
  findByEmail, findById, registerFailedLogin, registerSuccessfulLogin, setPassword,
  invalidateResets, createReset, findValidReset, markResetUsed,
  adminList, adminCount, findForAdmin, listRoles, emailTaken, insertUser, createUser,
  updateAdmin, updateBasicTx, setStatus, setTempPassword,
};
