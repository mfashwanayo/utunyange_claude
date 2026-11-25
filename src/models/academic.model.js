const db = require('../config/db');

const YEAR_COLS = `id, name, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
                   DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date, is_current`;

const getCurrentYear = () => db.one(`SELECT ${YEAR_COLS} FROM academic_years WHERE is_current = 1 LIMIT 1`);
const getYear = (id) => db.one(`SELECT ${YEAR_COLS} FROM academic_years WHERE id = ?`, [id]);
const yearNameExists = async (name) => !!(await db.one('SELECT id FROM academic_years WHERE name = ?', [name]));

// All years (newest first), each with its terms.
async function listYears() {
  const years = await db.query(`SELECT ${YEAR_COLS} FROM academic_years ORDER BY start_date DESC`);
  const terms = await db.query(
    `SELECT id, academic_year_id, name, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date, is_current
       FROM terms ORDER BY start_date`
  );
  years.forEach((y) => {
    y.terms = terms.filter((t) => t.academic_year_id === y.id);
  });
  return years;
}

// For dropdowns: [{ value, label }]
async function yearOptions() {
  const rows = await db.query('SELECT id, name, is_current FROM academic_years ORDER BY start_date DESC');
  return rows.map((r) => ({ value: r.id, label: r.is_current ? `${r.name} (current)` : r.name }));
}

async function createYear({ name, start_date, end_date, make_current, terms }) {
  return db.transaction(async (conn) => {
    if (make_current) {
      await conn.execute('UPDATE academic_years SET is_current = 0');
      await conn.execute('UPDATE terms SET is_current = 0');
    }
    const [r] = await conn.execute(
      'INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES (?, ?, ?, ?)',
      [name, start_date, end_date, make_current ? 1 : 0]
    );
    for (let i = 0; i < terms.length; i++) {
      await conn.execute(
        'INSERT INTO terms (academic_year_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?)',
        [r.insertId, terms[i].name, terms[i].start_date, terms[i].end_date, make_current && i === 0 ? 1 : 0]
      );
    }
    return r.insertId;
  });
}

// Makes one year current, and its term that contains today (or the first term) current.
async function setCurrentYear(id) {
  return db.transaction(async (conn) => {
    await conn.execute('UPDATE academic_years SET is_current = IF(id = ?, 1, 0)', [id]);
    await conn.execute('UPDATE terms SET is_current = 0');
    const [terms] = await conn.execute(
      `SELECT id, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date, DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date
         FROM terms WHERE academic_year_id = ? ORDER BY start_date`,
      [id]
    );
    if (terms.length) {
      const today = new Date().toISOString().slice(0, 10);
      const pick = terms.find((t) => t.start_date <= today && today <= t.end_date) || terms[0];
      await conn.execute('UPDATE terms SET is_current = 1 WHERE id = ?', [pick.id]);
    }
  });
}

const classCount = async (yearId) => (await db.one('SELECT COUNT(*) AS n FROM classes WHERE academic_year_id = ?', [yearId])).n;

module.exports = { getCurrentYear, getYear, yearNameExists, listYears, yearOptions, createYear, setCurrentYear, classCount };
