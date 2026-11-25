const db = require('../config/db');
const { nz } = require('../utils/helpers');

const list = () =>
  db.query(
    `SELECT s.id, s.code, s.name, s.level_id, l.name AS level_name,
            (SELECT COUNT(*) FROM class_subjects cs WHERE cs.subject_id = s.id) AS class_count
       FROM subjects s
       LEFT JOIN levels l ON l.id = s.level_id
      ORDER BY s.name`
  );

// For dropdowns: [{ value, label }]
async function options() {
  const rows = await db.query('SELECT id, code, name FROM subjects ORDER BY name');
  return rows.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }));
}

const find = (id) => db.one('SELECT id, code, name, level_id FROM subjects WHERE id = ?', [id]);
const codeExists = async (code, exceptId = 0) =>
  !!(await db.one('SELECT id FROM subjects WHERE code = ? AND id <> ?', [code, exceptId]));

async function levelOptions() {
  const rows = await db.query('SELECT id, name FROM levels ORDER BY sort_order');
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

async function create(d) {
  const r = await db.query('INSERT INTO subjects (code, name, level_id) VALUES (?, ?, ?)', [d.code, d.name, nz(d.level_id)]);
  return r.insertId;
}

const update = (id, d) =>
  db.query('UPDATE subjects SET code = ?, name = ?, level_id = ? WHERE id = ?', [d.code, d.name, nz(d.level_id), id]);

const remove = (id) => db.query('DELETE FROM subjects WHERE id = ?', [id]);

module.exports = { list, options, find, codeExists, levelOptions, create, update, remove };
