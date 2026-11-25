const db = require('../config/db');
const { Where, like, limitSql } = require('../utils/sql');
const { nz } = require('../utils/helpers');

// scope: 'upcoming' | 'past' | '' (all)
function filter({ q, scope } = {}) {
  const w = new Where();
  if (q) {
    const l = like(q);
    w.add('(e.title LIKE ? OR e.location LIKE ?)', l, l);
  }
  if (scope === 'upcoming') w.add('COALESCE(e.ends_at, e.starts_at) >= NOW()');
  if (scope === 'past') w.add('COALESCE(e.ends_at, e.starts_at) < NOW()');
  return w;
}

const adminList = (f, limit, offset) => {
  const w = filter(f);
  return db.query(
    `SELECT e.id, e.title, e.location, e.starts_at, e.ends_at, e.is_published
       FROM events e ${w.sql}
      ORDER BY e.starts_at ${f && f.scope === 'upcoming' ? 'ASC' : 'DESC'}, e.id DESC
      ${limitSql(limit, offset)}`,
    w.params
  );
};

const adminCount = async (f) => {
  const w = filter(f);
  const r = await db.one(`SELECT COUNT(*) AS n FROM events e ${w.sql}`, w.params);
  return r.n;
};

const findById = (id) =>
  db.one('SELECT id, title, description, location, starts_at, ends_at, is_published FROM events WHERE id = ?', [id]);

async function create(d) {
  const r = await db.query(
    'INSERT INTO events (title, description, location, starts_at, ends_at, is_published, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [d.title, nz(d.description), nz(d.location), d.starts_at, nz(d.ends_at), d.is_published ? 1 : 0, nz(d.created_by)]
  );
  return r.insertId;
}

const update = (id, d) =>
  db.query(
    'UPDATE events SET title = ?, description = ?, location = ?, starts_at = ?, ends_at = ?, is_published = ? WHERE id = ?',
    [d.title, nz(d.description), nz(d.location), d.starts_at, nz(d.ends_at), d.is_published ? 1 : 0, id]
  );

const remove = (id) => db.query('DELETE FROM events WHERE id = ?', [id]);
const setPublished = (id, on) => db.query('UPDATE events SET is_published = ? WHERE id = ?', [on ? 1 : 0, id]);

// Homepage: published events that have not ended yet, soonest first.
const publicUpcoming = (limit) =>
  db.query(
    `SELECT id, title, location, starts_at, ends_at
       FROM events
      WHERE is_published = 1 AND COALESCE(ends_at, starts_at) >= NOW()
      ORDER BY starts_at ASC
      ${limitSql(limit, 0)}`
  );

module.exports = { adminList, adminCount, findById, create, update, remove, setPublished, publicUpcoming };
