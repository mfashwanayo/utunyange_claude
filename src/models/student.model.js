const db = require('../config/db');
const userModel = require('./user.model');
const { Where, like, limitSql } = require('../utils/sql');
const { nz } = require('../utils/helpers');

// The class a student is in during the current academic year (if any).
const FROM = `FROM students s
  LEFT JOIN enrollments e ON e.student_id = s.id AND e.academic_year_id = ?
  LEFT JOIN classes c ON c.id = e.class_id`;

function filter({ q, status, classId } = {}) {
  const w = new Where();
  if (q) {
    const l = like(q);
    w.add("(s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_no LIKE ? OR CONCAT(s.first_name, ' ', s.last_name) LIKE ?)", l, l, l, l);
  }
  if (status) w.add('s.status = ?', status);
  if (classId) w.add('e.class_id = ?', classId);
  return w;
}

const list = (f, yearId, limit, offset) => {
  const w = filter(f);
  return db.query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.gender, s.status,
            c.name AS class_name, c.section AS class_section
       ${FROM}
       ${w.sql}
      ORDER BY s.last_name, s.first_name
      ${limitSql(limit, offset)}`,
    [yearId || 0, ...w.params]
  );
};

const count = async (f, yearId) => {
  const w = filter(f);
  const r = await db.one(`SELECT COUNT(*) AS n ${FROM} ${w.sql}`, [yearId || 0, ...w.params]);
  return r.n;
};

const findById = (id, yearId) =>
  db.one(
    `SELECT s.id, s.user_id, s.admission_no, s.first_name, s.last_name, s.gender, s.address, s.medical_notes, s.status,
            DATE_FORMAT(s.date_of_birth, '%Y-%m-%d') AS date_of_birth,
            DATE_FORMAT(s.admitted_on, '%Y-%m-%d') AS admitted_on,
            e.class_id, c.name AS class_name, c.section AS class_section,
            u.email AS login_email, u.status AS login_status
       FROM students s
       LEFT JOIN enrollments e ON e.student_id = s.id AND e.academic_year_id = ?
       LEFT JOIN classes c ON c.id = e.class_id
       LEFT JOIN users u ON u.id = s.user_id
      WHERE s.id = ?`,
    [yearId || 0, id]
  );

const admissionExists = async (no, exceptId = 0) =>
  !!(await db.one('SELECT id FROM students WHERE admission_no = ? AND id <> ?', [no, exceptId]));

async function nextAdmissionNo(conn, prefix) {
  const [rows] = await conn.execute('SELECT admission_no FROM students WHERE admission_no LIKE ? ORDER BY admission_no DESC LIMIT 1', [`${prefix}%`]);
  let n = 1;
  if (rows.length) {
    const tail = parseInt(rows[0].admission_no.slice(prefix.length), 10);
    n = Number.isNaN(tail) ? 1 : tail + 1;
  }
  return `${prefix}${String(n).padStart(4, '0')}`;
}

// student: validated form values; login: { email, password_hash } or null.
const create = ({ student, classId, yearId, yearName, login }) =>
  db.transaction(async (conn) => {
    let userId = null;
    if (login) {
      userId = await userModel.insertUser(conn, {
        role: 'student',
        first_name: student.first_name,
        last_name: student.last_name,
        email: login.email,
        phone: null,
        password_hash: login.password_hash,
      });
    }
    const prefix = `UTY${/^\d{4}$/.test(yearName || '') ? yearName : new Date().getFullYear()}`;
    const admissionNo = student.admission_no || (await nextAdmissionNo(conn, prefix));
    const [r] = await conn.execute(
      `INSERT INTO students (user_id, admission_no, first_name, last_name, gender, date_of_birth, address, medical_notes, status, admitted_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, admissionNo, student.first_name, student.last_name, student.gender, nz(student.date_of_birth),
        nz(student.address), nz(student.medical_notes), student.status, nz(student.admitted_on)]
    );
    if (classId && yearId) {
      await conn.execute(
        "INSERT INTO enrollments (student_id, class_id, academic_year_id, status, enrolled_on) VALUES (?, ?, ?, 'active', CURDATE())",
        [r.insertId, classId, yearId]
      );
    }
    return { id: r.insertId, admission_no: admissionNo };
  });

const update = (id, d, classId, yearId) =>
  db.transaction(async (conn) => {
    await conn.execute(
      `UPDATE students SET admission_no = ?, first_name = ?, last_name = ?, gender = ?, date_of_birth = ?,
              address = ?, medical_notes = ?, status = ?, admitted_on = ? WHERE id = ?`,
      [d.admission_no, d.first_name, d.last_name, d.gender, nz(d.date_of_birth), nz(d.address),
        nz(d.medical_notes), d.status, nz(d.admitted_on), id]
    );
    if (yearId) {
      if (classId) {
        await conn.execute(
          `INSERT INTO enrollments (student_id, class_id, academic_year_id, status, enrolled_on)
           VALUES (?, ?, ?, 'active', CURDATE())
           ON DUPLICATE KEY UPDATE class_id = VALUES(class_id)`,
          [id, classId, yearId]
        );
      } else {
        await conn.execute('DELETE FROM enrollments WHERE student_id = ? AND academic_year_id = ?', [id, yearId]);
      }
    }
  });

// Gives an existing student a login account.
const createLogin = (studentId, { first_name, last_name, email, password_hash }) =>
  db.transaction(async (conn) => {
    const userId = await userModel.insertUser(conn, { role: 'student', first_name, last_name, email, phone: null, password_hash });
    await conn.execute('UPDATE students SET user_id = ? WHERE id = ?', [userId, studentId]);
    return userId;
  });

const parents = (studentId) =>
  db.query(
    `SELECT p.id AS parent_id, u.first_name, u.last_name, u.email, u.phone, sp.relationship, sp.is_primary
       FROM student_parents sp
       JOIN parents p ON p.id = sp.parent_id
       JOIN users u ON u.id = p.user_id
      WHERE sp.student_id = ?
      ORDER BY sp.is_primary DESC, u.first_name`,
    [studentId]
  );

const linkParent = (studentId, parentId, relationship, isPrimary) =>
  db.query(
    `INSERT INTO student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE relationship = VALUES(relationship), is_primary = VALUES(is_primary)`,
    [studentId, parentId, relationship, isPrimary ? 1 : 0]
  );

const unlinkParent = (studentId, parentId) =>
  db.query('DELETE FROM student_parents WHERE student_id = ? AND parent_id = ?', [studentId, parentId]);

const enrollments = (studentId) =>
  db.query(
    `SELECT e.id, e.status, ay.name AS year_name, c.name AS class_name, c.section AS class_section
       FROM enrollments e
       JOIN classes c ON c.id = e.class_id
       JOIN academic_years ay ON ay.id = e.academic_year_id
      WHERE e.student_id = ?
      ORDER BY ay.start_date DESC`,
    [studentId]
  );

module.exports = {
  list, count, findById, admissionExists, create, update, createLogin,
  parents, linkParent, unlinkParent, enrollments,
};
