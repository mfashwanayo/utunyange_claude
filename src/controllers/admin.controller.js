// Admin dashboard: live numbers from the database.
const db = require('../config/db');
const academic = require('../models/academic.model');
const { view } = require('../utils/view');
const { wrap } = require('../utils/helpers');

exports.dashboard = wrap(async (req, res) => {
  const year = await academic.getCurrentYear();

  const stats = await db.one(
    `SELECT
       (SELECT COUNT(*) FROM students WHERE status = 'active') AS students,
       (SELECT COUNT(*) FROM teachers t JOIN users u ON u.id = t.user_id WHERE u.status = 'active') AS teachers,
       (SELECT COUNT(*) FROM parents) AS parents,
       (SELECT COUNT(*) FROM classes WHERE academic_year_id = ?) AS classes,
       (SELECT COUNT(*) FROM news WHERE status = 'published') AS news,
       (SELECT COUNT(*) FROM events WHERE is_published = 1 AND COALESCE(ends_at, starts_at) >= NOW()) AS events,
       (SELECT COUNT(*) FROM contact_messages WHERE is_read = 0) AS unread,
       (SELECT COUNT(*) FROM admission_applications WHERE status = 'pending') AS applications`,
    [year ? year.id : 0]
  );

  const recent = await db.query(
    `SELECT a.action, a.entity, a.created_at, CONCAT(u.first_name, ' ', u.last_name) AS user_name
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.id DESC LIMIT 8`
  );

  view(res, 'admin/dashboard', { title: 'Admin dashboard', stats, year, recent });
});
