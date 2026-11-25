# Utunyange School - Database

MySQL / MariaDB, InnoDB, utf8mb4. Created by `npm run db:setup`
(`database/schema.sql` + `database/seeds/roles.sql`).

## Groups of tables

| Group | Tables |
|---|---|
| Accounts | `roles`, `users`, `password_resets` |
| People profiles | `teachers`, `parents`, `students`, `student_parents` |
| Academic structure | `academic_years`, `terms`, `levels`, `classes`, `subjects`, `class_subjects`, `enrollments` |
| Daily school life | `timetable_slots`, `attendance`, `assignments`, `assignment_submissions` |
| Results | `assessments`, `grades`, `grading_scales`, `report_comments` |
| Finance | `fee_structures`, `invoices`, `invoice_items`, `payments` |
| Website | `news`, `events`, `gallery_items`, `announcements` |
| Intake | `admission_applications`, `contact_messages` |
| Communication | `messages`, `notifications` |
| System | `settings`, `audit_logs` |

## Key relationships

- `users.role_id` -> `roles.id`. Names, email and password live in `users`; teachers and parents add a profile row (`teachers`, `parents`).
- `students` may have an optional `user_id` (younger pupils need no login).
- `student_parents` links many parents to many students.
- `enrollments` = which class a student is in for each `academic_year` (history kept for promotions).
- `class_subjects` = which teacher teaches which subject in which class. Timetable slots, assessments and assignments hang off it.
- `assessments` -> `grades` (one score per student per assessment). `grading_scales` converts a percentage to A-F.
- `invoices` -> `invoice_items` and `payments`. Invoice `status` moves unpaid -> partial -> paid.

## Using it in code

```js
const db = require('../config/db');

const user = await db.one('SELECT * FROM users WHERE email = ?', [email]);
const students = await db.query('SELECT * FROM students WHERE status = ?', ['active']);

await db.transaction(async (conn) => {
  const [r] = await conn.execute('INSERT INTO invoices (...) VALUES (...)', [...]);
  await conn.execute('INSERT INTO invoice_items (...) VALUES (...)', [...]);
});
```

Always pass values through the `?` placeholders (never build SQL by joining strings).

## Setup / reset

```bash
npm run db:setup          # create database, tables, starter data, first admin
```

To wipe and start over (development only): drop the database in phpMyAdmin, then run `npm run db:setup` again.

Not included yet (added when those modules are built): library books/borrowing, expenses/payroll, staff leave, visitor log.
