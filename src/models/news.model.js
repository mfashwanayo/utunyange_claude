const db = require('../config/db');
const { Where, like, limitSql } = require('../utils/sql');
const { nz } = require('../utils/helpers');

function filter({ q, status } = {}) {
  const w = new Where();
  if (q) {
    const l = like(q);
    w.add('(n.title LIKE ? OR n.category LIKE ?)', l, l);
  }
  if (status) w.add('n.status = ?', status);
  return w;
}

const adminList = (f, limit, offset) => {
  const w = filter(f);
  return db.query(
    `SELECT n.id, n.title, n.slug, n.category, n.status, n.cover_image, n.published_at, n.created_at,
            CONCAT(u.first_name, ' ', u.last_name) AS author_name
       FROM news n LEFT JOIN users u ON u.id = n.author_id
       ${w.sql}
      ORDER BY n.created_at DESC, n.id DESC
      ${limitSql(limit, offset)}`,
    w.params
  );
};

const adminCount = async (f) => {
  const w = filter(f);
  const r = await db.one(`SELECT COUNT(*) AS n FROM news n ${w.sql}`, w.params);
  return r.n;
};

const findById = (id) =>
  db.one('SELECT id, title, slug, category, excerpt, body, cover_image, status, published_at FROM news WHERE id = ?', [id]);

// A slug no other article uses ("my-title", "my-title-2", ...).
async function uniqueSlug(base, exceptId = 0) {
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await db.one('SELECT id FROM news WHERE slug = ? AND id <> ?', [slug, exceptId])) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

async function create(d) {
  const r = await db.query(
    `INSERT INTO news (title, slug, category, excerpt, body, cover_image, status, published_at, author_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.title, d.slug, d.category, nz(d.excerpt), nz(d.body), nz(d.cover_image), d.status, nz(d.published_at), nz(d.author_id)]
  );
  return r.insertId;
}

const update = (id, d) =>
  db.query(
    `UPDATE news SET title = ?, category = ?, excerpt = ?, body = ?, cover_image = ?, status = ?, published_at = ? WHERE id = ?`,
    [d.title, d.category, nz(d.excerpt), nz(d.body), nz(d.cover_image), d.status, nz(d.published_at), id]
  );

const remove = (id) => db.query('DELETE FROM news WHERE id = ?', [id]);

const setStatus = (id, status, publishedAt) =>
  db.query('UPDATE news SET status = ?, published_at = COALESCE(published_at, ?) WHERE id = ?', [status, nz(publishedAt), id]);

// ---------- public site ----------
const PUBLIC = "n.status = 'published' AND n.published_at IS NOT NULL AND n.published_at <= NOW()";

const publicLatest = (limit) =>
  db.query(
    `SELECT n.id, n.title, n.slug, n.category, n.excerpt, n.body, n.cover_image, n.published_at
       FROM news n WHERE ${PUBLIC}
      ORDER BY n.published_at DESC, n.id DESC ${limitSql(limit, 0)}`
  );

const publicPage = (limit, offset) =>
  db.query(
    `SELECT n.id, n.title, n.slug, n.category, n.excerpt, n.cover_image, n.published_at
       FROM news n WHERE ${PUBLIC}
      ORDER BY n.published_at DESC, n.id DESC ${limitSql(limit, offset)}`
  );

const publicCount = async () => (await db.one(`SELECT COUNT(*) AS n FROM news n WHERE ${PUBLIC}`)).n;

const findPublishedBySlug = (slug) =>
  db.one(
    `SELECT n.id, n.title, n.slug, n.category, n.excerpt, n.body, n.cover_image, n.published_at
       FROM news n WHERE n.slug = ? AND ${PUBLIC}`,
    [slug]
  );

module.exports = {
  adminList, adminCount, findById, uniqueSlug, create, update, remove, setStatus,
  publicLatest, publicPage, publicCount, findPublishedBySlug,
};
