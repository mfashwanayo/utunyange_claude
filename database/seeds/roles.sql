-- =====================================================================
-- Utunyange School - starter data (safe to run more than once)
-- Edit the academic year dates and settings to match your school.
-- =====================================================================

SET NAMES utf8mb4;

-- Roles
INSERT IGNORE INTO roles (name, label, description) VALUES
  ('super_admin',  'Super Administrator', 'Full access to everything, including system settings'),
  ('admin',        'Administrator',       'Manages students, staff, classes, content and reports'),
  ('teacher',      'Teacher',             'Marks attendance, enters grades, posts assignments'),
  ('student',      'Student',             'Views own timetable, results, assignments and fees'),
  ('parent',       'Parent / Guardian',   'Views linked children, results, attendance and fees'),
  ('accountant',   'Accountant',          'Manages fees, invoices, payments and expenses'),
  ('librarian',    'Librarian',           'Manages the library catalogue and borrowing'),
  ('receptionist', 'Receptionist',        'Handles enquiries, visitors and admission applications');

-- School levels
INSERT IGNORE INTO levels (code, name, sort_order) VALUES
  ('nursery',   'Nursery',          1),
  ('primary',   'Primary School',   2),
  ('secondary', 'Secondary School', 3);

-- Subjects (level NULL = taught at every level; adjust freely)
INSERT IGNORE INTO subjects (code, name, level_id) VALUES
  ('KIN', 'Kinyarwanda',     NULL),
  ('ENG', 'English',         NULL),
  ('FRE', 'French',          NULL),
  ('MAT', 'Mathematics',     NULL),
  ('SST', 'Social Studies',  (SELECT id FROM levels WHERE code = 'primary')),
  ('SET', 'Science and Elementary Technology', (SELECT id FROM levels WHERE code = 'primary')),
  ('PHY', 'Physics',         (SELECT id FROM levels WHERE code = 'secondary')),
  ('CHE', 'Chemistry',       (SELECT id FROM levels WHERE code = 'secondary')),
  ('BIO', 'Biology',         (SELECT id FROM levels WHERE code = 'secondary')),
  ('GEO', 'Geography',       (SELECT id FROM levels WHERE code = 'secondary')),
  ('HIS', 'History',         (SELECT id FROM levels WHERE code = 'secondary')),
  ('ICT', 'ICT',             NULL),
  ('ENT', 'Entrepreneurship',(SELECT id FROM levels WHERE code = 'secondary')),
  ('ART', 'Art and Craft',   NULL),
  ('PE',  'Physical Education', NULL),
  ('REL', 'Religion and Ethics', NULL);

-- Grading scale (percentage -> grade). Change to match your school's policy.
INSERT IGNORE INTO grading_scales (grade, min_score, max_score, remark) VALUES
  ('A', 80.00, 100.00, 'Excellent'),
  ('B', 70.00,  79.99, 'Very good'),
  ('C', 60.00,  69.99, 'Good'),
  ('D', 50.00,  59.99, 'Satisfactory'),
  ('E', 40.00,  49.99, 'Pass'),
  ('F',  0.00,  39.99, 'Fail');

-- Sample academic year and terms (EDIT these dates to your real calendar)
INSERT IGNORE INTO academic_years (name, start_date, end_date, is_current) VALUES
  ('2027', '2027-01-18', '2027-11-26', 1);

INSERT IGNORE INTO terms (academic_year_id, name, start_date, end_date, is_current)
SELECT ay.id, t.name, t.start_date, t.end_date, t.is_current
FROM academic_years ay
JOIN (
  SELECT 'Term 1' AS name, '2027-01-18' AS start_date, '2027-04-09' AS end_date, 1 AS is_current
  UNION ALL SELECT 'Term 2', '2027-05-03', '2027-08-06', 0
  UNION ALL SELECT 'Term 3', '2027-08-30', '2027-11-26', 0
) t
WHERE ay.name = '2027';

-- School settings
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
  ('school_name',     'Utunyange School'),
  ('school_motto',    'Excellence • Integrity • Service'),
  ('school_email',    'info@utunyange.rw'),
  ('school_phone',    '+250 788 000 000'),
  ('school_address',  'Your street address, City, Rwanda'),
  ('currency',        'RWF'),
  ('admission_open',  '1'),
  ('default_language','en');
