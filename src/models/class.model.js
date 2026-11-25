const db = require('../config/db');
const { Where } = require('../utils/sql');
const { nz, classLabel } = require('../utils/helpers');

const BASE = `FROM classes c
  JOIN levels l ON l.id = c.level_id
  JOIN academic_years ay ON ay.id = c.academic_year_id
  LEFT JOIN teachers t ON t.id = c.class_teacher_id
  LEFT JOIN users tu ON tu.id = t.user_id`;

const COLS = `c.id, c.name, c.section, c.combination, c.capacity, c.level_id, c.academic_year_id, c.class_teacher_id,
  l.name AS level_name, ay.name AS year_name,
  CONCAT(tu.first_name, ' ', tu.last_name) AS teacher_name,
  (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id AND e.status = 'active') AS student_count`;

function list({ yearId, levelId } = {}) {
  const w = new Where();
  if (yearId) w.add('c.academic_year_id = ?', yearId);
  if (levelId) w.add('c.level_id = ?', levelId);
  return db.query(`SELECT ${COLS} ${BASE} ${w.sql} ORDER BY ay.start_date DESC, l.sort_order, c.name, c.section`, w.params);
}

const find = (id) => db.one(`SELECT ${COLS} ${BASE} WHERE c.id = ?`, [id]);

// For dropdowns: [{ value, label }]
async function forSelect(yearId) {
  const rows = await db.query('SELECT id, name, section FROM classes WHERE academic_year_id = ? ORDER BY name, section', [yearId]);
  return rows.map((r) => ({ value: r.id, label: classLabel(r.name, r.section) }));
}

// Same class name + section already exists in that year? (<=> treats NULL as a value)
const exists = async (yearId, name, section, exceptId = 0) =>
  !!(await db.one('SELECT id FROM classes WHERE academic_year_id = ? AND name = ? AND section <=> ? AND id <> ?', [
    yearId, name, nz(section), exceptId,
  ]));

async function create(d) {
  const r = await db.query(
    `INSERT INTO classes (level_id, academic_year_id, name, section, combination, capacity, class_teacher_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [d.level_id, d.academic_year_id, d.name, nz(d.section), nz(d.combination), nz(d.capacity), nz(d.class_teacher_id)]
  );
  return r.insertId;
}

const update = (id, d) =>
  db.query(
    `UPDATE classes SET level_id = ?, academic_year_id = ?, name = ?, section = ?, combination = ?,
            capacity = ?, class_teacher_id = ? WHERE id = ?`,
    [d.level_id, d.academic_year_id, d.name, nz(d.section), nz(d.combination), nz(d.capacity), nz(d.class_teacher_id), id]
  );

// Records that would be lost if the class were deleted.
const usage = (id) =>
  db.one(
    `SELECT (SELECT COUNT(*) FROM enrollments WHERE class_id = ?) AS enrolled,
            (SELECT COUNT(*) FROM assessments a JOIN class_subjects cs ON cs.id = a.class_subject_id WHERE cs.class_id = ?) AS assessments,
            (SELECT COUNT(*) FROM attendance WHERE class_id = ?) AS attendance`,
    [id, id, id]
  );

const remove = (id) => db.query('DELETE FROM classes WHERE id = ?', [id]);

const students = (classId) =>
  db.query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.gender
       FROM enrollments e JOIN students s ON s.id = e.student_id
      WHERE e.class_id = ? AND e.status = 'active'
      ORDER BY s.last_name, s.first_name`,
    [classId]
  );

const subjects = (classId) =>
  db.query(
    `SELECT cs.id, cs.subject_id, s.code, s.name, cs.teacher_id,
            CONCAT(u.first_name, ' ', u.last_name) AS teacher_name
       FROM class_subjects cs
       JOIN subjects s ON s.id = cs.subject_id
       LEFT JOIN teachers t ON t.id = cs.teacher_id
       LEFT JOIN users u ON u.id = t.user_id
      WHERE cs.class_id = ?
      ORDER BY s.name`,
    [classId]
  );

const addSubject = (classId, subjectId, teacherId) =>
  db.query('INSERT INTO class_subjects (class_id, subject_id, teacher_id) VALUES (?, ?, ?)', [classId, subjectId, nz(teacherId)]);

const setSubjectTeacher = (csId, classId, teacherId) =>
  db.query('UPDATE class_subjects SET teacher_id = ? WHERE id = ? AND class_id = ?', [nz(teacherId), csId, classId]);

const subjectUsage = (csId) =>
  db.one('SELECT (SELECT COUNT(*) FROM assessments WHERE class_subject_id = ?) AS assessments', [csId]);

const removeSubject = (csId, classId) => db.query('DELETE FROM class_subjects WHERE id = ? AND class_id = ?', [csId, classId]);

module.exports = {
  list, find, forSelect, exists, create, update, usage, remove,
  students, subjects, addSubject, setSubjectTeacher, subjectUsage, removeSubject,
};
