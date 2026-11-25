// Small helpers for building safe SQL (values always travel as `?` parameters).

// '%text%' for LIKE searches, with % _ and \ escaped.
const like = (s) => `%${String(s).replace(/[\\%_]/g, '\\$&')}%`;

// Whole numbers only - used for LIMIT / OFFSET, which are written into the SQL text.
const whole = (n, min, max, def) => {
  const x = Math.trunc(Number(n));
  if (!Number.isFinite(x)) return def;
  return Math.min(max, Math.max(min, x));
};
const limitSql = (limit, offset) => `LIMIT ${whole(limit, 1, 100, 15)} OFFSET ${whole(offset, 0, 1000000, 0)}`;

// Collects WHERE conditions and their parameters.
class Where {
  constructor() {
    this.conds = [];
    this.params = [];
  }

  add(sql, ...params) {
    this.conds.push(sql);
    this.params.push(...params);
    return this;
  }

  get sql() {
    return this.conds.length ? `WHERE ${this.conds.join(' AND ')}` : '';
  }
}

module.exports = { like, limitSql, Where };
