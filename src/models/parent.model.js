const db = require('../config/db');
const userModel = require('./user.model');
const { Where, like, limitSql } = require('../utils/sql');
const { nz } = require('../utils/helpers');

function filter({ q, status } = {}) {
  const w = new Where();
  if (q) {
    const l = like(q);
    w.add("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)", l, l, l, l, l);
  }
  if (status) w.add('u.status = ?', status);
  return w;
}

const list = (f, limit, offset) => {
  const w = filter(f);
  return db.query(
    `SELECT p.id, p.occupation, u.id AS user_id, u.first_name, u.last_name, u.email, u.phone, u.status,
            (SELECT GROUP_CONCAT(CONCAT(s.first_name, ' ', s.last_name) ORDER BY s.first_name SEPARATOR ', ')
               FROM student_parents sp JOIN students s ON s.id = sp.student_id
              WHERE sp.parent_id = p.id) AS children
       FROM parents p JOIN users u ON u.id = p.user_id
       ${w.sql}
      ORDER BY u.first_name, u.last_name
      ${limitSql(limit, offset)}`,
    w.params
  );
};

const count = async (f) => {
  const w = filter(f);
  const r = await db.one(`SELECT COUNT(*) AS n FROM parents p JOIN users u ON u.id = p.user_id ${w.sql}`, w.params);
  return r.n;
};

const findById = (id) =>
  db.one(
    `SELECT p.id, p.user_id, p.occupation, p.address, p.alt_phone,
            u.first_name, u.last_name, u.email, u.phone, u.status
       FROM parents p JOIN users u ON u.id = p.user_id
      WHERE p.id = ?`,
    [id]
  );

// For dropdowns: [{ value, label }]
async function options() {
  const rows = await db.query(
    `SELECT p.id, u.first_name, u.last_name, u.phone FROM parents p JOIN users u ON u.id = p.user_id
      ORDER BY u.first_name, u.last_name`
  );
  return rows.map((r) => ({ value: r.id, label: `${r.first_name} ${r.last_name}${r.phone ? ` (${r.phone})` : ''}` }));
}

const children = (parentId) =>
  db.query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, sp.relationship
       FROM student_parents sp JOIN students s ON s.id = sp.student_id
      WHERE sp.parent_id = ?
      ORDER BY s.first_name`,
    [parentId]
  );

const create = (d) =>
  db.transaction(async (conn) => {
    const userId = await userModel.insertUser(conn, { ...d, role: 'parent' });
    const [r] = await conn.execute('INSERT INTO parents (user_id, occupation, address, alt_phone) VALUES (?, ?, ?, ?)', [
      userId, nz(d.occupation), nz(d.address), nz(d.alt_phone),
    ]);
    return { id: r.insertId };
  });

const update = (id, userId, d) =>
  db.transaction(async (conn) => {
    await userModel.updateBasicTx(conn, userId, d);
    await conn.execute('UPDATE parents SET occupation = ?, address = ?, alt_phone = ? WHERE id = ?', [
      nz(d.occupation), nz(d.address), nz(d.alt_phone), id,
    ]);
  });

module.exports = { list, count, findById, options, children, create, update };
