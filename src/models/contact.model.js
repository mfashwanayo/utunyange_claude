const db = require('../config/db');
const { limitSql } = require('../utils/sql');
const { nz } = require('../utils/helpers');

async function create({ name, email, phone, subject, message, ip }) {
  const r = await db.query(
    'INSERT INTO contact_messages (name, email, phone, subject, message, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, nz(phone), nz(subject), message, nz(ip ? String(ip).slice(0, 45) : null)]
  );
  return r.insertId;
}

const where = (unread) => (unread ? 'WHERE is_read = 0' : '');

const list = (unread, limit, offset) =>
  db.query(
    `SELECT id, name, email, phone, subject, message, is_read, created_at
       FROM contact_messages ${where(unread)}
      ORDER BY created_at DESC, id DESC ${limitSql(limit, offset)}`
  );

const count = async (unread) => (await db.one(`SELECT COUNT(*) AS n FROM contact_messages ${where(unread)}`)).n;
const unreadCount = async () => (await db.one('SELECT COUNT(*) AS n FROM contact_messages WHERE is_read = 0')).n;

const setRead = (id, read) => db.query('UPDATE contact_messages SET is_read = ? WHERE id = ?', [read ? 1 : 0, id]);
const markAllRead = () => db.query('UPDATE contact_messages SET is_read = 1 WHERE is_read = 0');
const remove = (id) => db.query('DELETE FROM contact_messages WHERE id = ?', [id]);

module.exports = { create, list, count, unreadCount, setRead, markAllRead, remove };
