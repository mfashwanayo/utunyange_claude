const db = require('../config/db');
const userModel = require('./user.model');
const { Where, like, limitSql } = require('../utils/sql');
const { nz } = require('../utils/helpers');

function filter({ q, status } = {}) {
  const w = new Where();
  if (q) {
    const l = like(q);
    w.add("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR t.staff_no LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)", l, l, l, l, l);
  }
  if (status) w.add('u.status = ?', status);
  return w;
}

const list = (f, limit, offset) => {
  const w = filter(f);
  return db.query(
    `SELECT t.id, t.staff_no, t.specialization, u.id AS user_id, u.first_name, u.last_name, u.email, u.phone, u.status,
            (SELECT COUNT(*) FROM class_subjects cs WHERE cs.teacher_id = t.id) AS load_count
       FROM teachers t JOIN users u ON u.id = t.user_id
       ${w.sql}
      ORDER BY u.first_name, u.last_name
      ${limitSql(limit, offset)}`,
    w.params
  );
};

const count = async (f) => {
  const w = filter(f);
  const r = await db.one(`SELECT COUNT(*) AS n FROM teachers t JOIN users u ON u.id = t.user_id ${w.sql}`, w.params);
  return r.n;
};

const findById = (id) =>
  db.one(
    `SELECT t.id, t.user_id, t.staff_no, t.gender, t.qualification, t.specialization, t.address,
            DATE_FORMAT(t.hire_date, '%Y-%m-%d') AS hire_date,
            u.first_name, u.last_name, u.email, u.phone, u.status
       FROM teachers t JOIN users u ON u.id = t.user_id
      WHERE t.id = ?`,
    [id]
  );

// For dropdowns: [{ value, label }] (active teachers only)
async function options() {
  const rows = await db.query(
    `SELECT t.id, u.first_name, u.last_name FROM teachers t JOIN users u ON u.id = t.user_id
      WHERE u.status = 'active' ORDER BY u.first_name, u.last_name`
  );
  return rows.map((r) => ({ value: r.id, label: `${r.first_name} ${r.last_name}` }));
}

async function nextStaffNo(conn) {
  const [rows] = await conn.execute(
    "SELECT staff_no FROM teachers WHERE staff_no REGEXP '^T[0-9]+$' ORDER BY CAST(SUBSTRING(staff_no, 2) AS UNSIGNED) DESC LIMIT 1"
  );
  const n = rows.length ? parseInt(rows[0].staff_no.slice(1), 10) + 1 : 1;
  return `T${String(n).padStart(4, '0')}`;
}

// Creates the login account and the teacher profile together.
const create = (d) =>
  db.transaction(async (conn) => {
    const userId = await userModel.insertUser(conn, { ...d, role: 'teacher' });
    const staffNo = await nextStaffNo(conn);
    const [r] = await conn.execute(
      `INSERT INTO teachers (user_id, staff_no, gender, qualification, specialization, hire_date, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, staffNo, nz(d.gender), nz(d.qualification), nz(d.specialization), nz(d.hire_date), nz(d.address)]
    );
    return { id: r.insertId, staff_no: staffNo };
  });

const update = (id, userId, d) =>
  db.transaction(async (conn) => {
    await userModel.updateBasicTx(conn, userId, d);
    await conn.execute(
      'UPDATE teachers SET gender = ?, qualification = ?, specialization = ?, hire_date = ?, address = ? WHERE id = ?',
      [nz(d.gender), nz(d.qualification), nz(d.specialization), nz(d.hire_date), nz(d.address), id]
    );
  });

module.exports = { list, count, findById, options, create, update };
