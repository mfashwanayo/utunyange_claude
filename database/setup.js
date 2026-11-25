// One-command database setup:   npm run db:setup
//  1. creates the database if missing
//  2. creates all tables (database/schema.sql)
//  3. inserts starter data (database/seeds/roles.sql)
//  4. creates the first Super Admin account (if none exists)
// Safe to run again: nothing is overwritten or duplicated.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  bcrypt = require('bcryptjs'); // fallback if native bcrypt is not installed
}

const read = (...p) => fs.readFileSync(path.join(__dirname, ...p), 'utf8');

(async () => {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'utunyange_db';

  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error('DB_NAME may only contain letters, numbers and underscores.');
  }

  console.log(`Connecting to MySQL at ${host}:${port} as "${user}" ...`);
  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });

  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${dbName}\``);
    console.log(`Database "${dbName}" is ready.`);

    await conn.query(read('schema.sql'));
    console.log('Tables created.');

    await conn.query(read('seeds', 'roles.sql'));
    console.log('Starter data inserted (roles, levels, subjects, grading scale, settings).');

    // ---- First super admin ----
    const [roleRows] = await conn.query("SELECT id FROM roles WHERE name = 'super_admin'");
    const roleId = roleRows[0].id;
    const [existing] = await conn.query('SELECT id FROM users WHERE role_id = ? LIMIT 1', [roleId]);

    if (existing.length === 0) {
      const email = (process.env.ADMIN_EMAIL || 'admin@utunyange.rw').toLowerCase();
      const plain = process.env.ADMIN_PASSWORD || 'ChangeMe@2027';
      const hash = await bcrypt.hash(plain, 12);
      await conn.query(
        `INSERT INTO users (role_id, first_name, last_name, email, password_hash, status, must_change_password)
         VALUES (?, 'System', 'Administrator', ?, ?, 'active', 1)`,
        [roleId, email, hash]
      );
      console.log('\nSuper admin created:');
      console.log(`  Email:    ${email}`);
      console.log(`  Password: ${plain}`);
      console.log('  -> Change this password after your first login!');
    } else {
      console.log('Super admin already exists - skipped.');
    }

    const [tables] = await conn.query('SHOW TABLES');
    console.log(`\nDone. ${tables.length} tables in "${dbName}".`);
  } finally {
    await conn.end();
  }
})().catch((err) => {
  console.error('\nDatabase setup failed:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error('MySQL is not running. Open XAMPP Control Panel and click Start next to MySQL, then try again.');
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('Wrong DB_USER / DB_PASSWORD in your .env file.');
  }
  process.exit(1);
});
