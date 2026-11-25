const crypto = require('crypto');

// Forwards errors from async route handlers to the Express error handler.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Positive integer or null (used for ids from the URL / forms).
const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Trimmed string, cut to `max` characters ('' when not a string).
const str = (v, max = 255) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Empty string / undefined -> null (for optional database columns).
const nz = (v) => (v === undefined || v === null || v === '' ? null : v);

const isEmail = (v) => typeof v === 'string' && v.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// 'YYYY-MM-DD' that is a real calendar date.
const isDate = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

// 'YYYY-MM-DDTHH:mm' (value of <input type="datetime-local">) -> Date, or null.
const parseDateTime = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Date -> value for <input type="datetime-local"> (server-local time).
const toInputDateTime = (d) => {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

const fmtDate = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '' : x.toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? ''
    : x.toLocaleString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';

// Query string from an object, skipping empty values.
const qs = (obj) =>
  new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();

// Easy-to-read temporary password that always passes the password rules.
function randomPassword(len = 10) {
  const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const L = 'abcdefghijkmnpqrstuvwxyz';
  const D = '23456789';
  const pick = (set) => set[crypto.randomInt(set.length)];
  const chars = [pick(U), pick(L), pick(D)];
  const all = U + L + D;
  while (chars.length < len) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const isDup = (err) => !!err && err.code === 'ER_DUP_ENTRY';
const isFk = (err) => !!err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED');

const classLabel = (name, section) => (section ? `${name} ${section}` : name);

module.exports = {
  wrap, toInt, str, nz, isEmail, isDate, parseDateTime, todayStr, toInputDateTime,
  fmtDate, fmtDateTime, slugify, qs, randomPassword, isDup, isFk, classLabel,
};
