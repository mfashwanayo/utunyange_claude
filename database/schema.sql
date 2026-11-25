-- =====================================================================
-- Utunyange School - database schema
-- Works on MySQL 5.7+/8 and MariaDB 10.3+ (XAMPP / WAMP).
-- Safe to run more than once (CREATE TABLE IF NOT EXISTS).
-- Tables are created in dependency order, so foreign keys resolve.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. ROLES, USERS, PASSWORD RESETS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(40)  NOT NULL,            -- machine name: super_admin, teacher ...
  label       VARCHAR(80)  NOT NULL,            -- display name
  description VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id              INT UNSIGNED NOT NULL,
  first_name           VARCHAR(80)  NOT NULL,
  last_name            VARCHAR(80)  NOT NULL,
  email                VARCHAR(190) NOT NULL,
  phone                VARCHAR(30)  NULL,
  password_hash        VARCHAR(255) NOT NULL,
  avatar               VARCHAR(255) NULL,
  status               ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  must_change_password TINYINT(1)   NOT NULL DEFAULT 0,
  failed_attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until         DATETIME     NULL,
  last_login_at        DATETIME     NULL,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role_id),
  KEY idx_users_status (status),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reset tokens are stored hashed (never the raw token).
CREATE TABLE IF NOT EXISTS password_resets (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  token_hash CHAR(64)     NOT NULL,
  expires_at DATETIME     NOT NULL,
  used_at    DATETIME     NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pwreset_token (token_hash),
  KEY idx_pwreset_user (user_id),
  CONSTRAINT fk_pwreset_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. STAFF AND PARENT PROFILES (names/email live in users)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  staff_no      VARCHAR(30)  NOT NULL,
  gender        ENUM('male','female') NULL,
  qualification VARCHAR(190) NULL,
  specialization VARCHAR(190) NULL,
  hire_date     DATE         NULL,
  address       VARCHAR(255) NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teachers_user (user_id),
  UNIQUE KEY uq_teachers_staff_no (staff_no),
  CONSTRAINT fk_teachers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parents (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  occupation  VARCHAR(120) NULL,
  address     VARCHAR(255) NULL,
  alt_phone   VARCHAR(30)  NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_parents_user (user_id),
  CONSTRAINT fk_parents_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. ACADEMIC STRUCTURE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_years (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(20)  NOT NULL,             -- e.g. 2027
  start_date DATE         NOT NULL,
  end_date   DATE         NOT NULL,
  is_current TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_academic_years_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS terms (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  academic_year_id INT UNSIGNED NOT NULL,
  name             VARCHAR(40)  NOT NULL,       -- Term 1, Term 2, Term 3
  start_date       DATE         NOT NULL,
  end_date         DATE         NOT NULL,
  is_current       TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_terms_year_name (academic_year_id, name),
  CONSTRAINT fk_terms_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS levels (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code       VARCHAR(20)  NOT NULL,             -- nursery, primary, secondary
  name       VARCHAR(60)  NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_levels_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classes (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  level_id         INT UNSIGNED NOT NULL,
  academic_year_id INT UNSIGNED NOT NULL,
  name             VARCHAR(60)  NOT NULL,       -- P4, S2, Nursery 3 ...
  section          VARCHAR(20)  NULL,           -- A, B ...
  combination      VARCHAR(60)  NULL,           -- upper secondary combination (e.g. MCB)
  capacity         SMALLINT UNSIGNED NULL,
  class_teacher_id INT UNSIGNED NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_classes_unique (academic_year_id, name, section),
  KEY idx_classes_level (level_id),
  CONSTRAINT fk_classes_level   FOREIGN KEY (level_id)         REFERENCES levels (id),
  CONSTRAINT fk_classes_year    FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
  CONSTRAINT fk_classes_teacher FOREIGN KEY (class_teacher_id) REFERENCES teachers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subjects (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code     VARCHAR(20)  NOT NULL,
  name     VARCHAR(120) NOT NULL,
  level_id INT UNSIGNED NULL,                   -- NULL = taught at every level
  PRIMARY KEY (id),
  UNIQUE KEY uq_subjects_code (code),
  CONSTRAINT fk_subjects_level FOREIGN KEY (level_id) REFERENCES levels (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Which teacher teaches which subject in which class.
CREATE TABLE IF NOT EXISTS class_subjects (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_id   INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_class_subject (class_id, subject_id),
  KEY idx_cs_teacher (teacher_id),
  CONSTRAINT fk_cs_class   FOREIGN KEY (class_id)   REFERENCES classes (id)  ON DELETE CASCADE,
  CONSTRAINT fk_cs_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  CONSTRAINT fk_cs_teacher FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. STUDENTS, FAMILY LINKS, ENROLMENT
-- ---------------------------------------------------------------------
-- user_id is optional: nursery/primary pupils may not have a login.
CREATE TABLE IF NOT EXISTS students (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NULL,
  admission_no  VARCHAR(30)  NOT NULL,
  first_name    VARCHAR(80)  NOT NULL,
  last_name     VARCHAR(80)  NOT NULL,
  gender        ENUM('male','female') NOT NULL,
  date_of_birth DATE         NULL,
  photo         VARCHAR(255) NULL,
  address       VARCHAR(255) NULL,
  medical_notes TEXT         NULL,
  status        ENUM('active','transferred','graduated','withdrawn') NOT NULL DEFAULT 'active',
  admitted_on   DATE         NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_admission (admission_no),
  UNIQUE KEY uq_students_user (user_id),
  KEY idx_students_name (last_name, first_name),
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One parent can have several children and vice versa.
CREATE TABLE IF NOT EXISTS student_parents (
  student_id   INT UNSIGNED NOT NULL,
  parent_id    INT UNSIGNED NOT NULL,
  relationship ENUM('father','mother','guardian','other') NOT NULL DEFAULT 'guardian',
  is_primary   TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, parent_id),
  KEY idx_sp_parent (parent_id),
  CONSTRAINT fk_sp_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_parent  FOREIGN KEY (parent_id)  REFERENCES parents (id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A student's class in a given academic year (history is kept for promotions).
CREATE TABLE IF NOT EXISTS enrollments (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id       INT UNSIGNED NOT NULL,
  class_id         INT UNSIGNED NOT NULL,
  academic_year_id INT UNSIGNED NOT NULL,
  status           ENUM('active','promoted','repeated','transferred','graduated') NOT NULL DEFAULT 'active',
  enrolled_on      DATE NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enroll_student_year (student_id, academic_year_id),
  KEY idx_enroll_class (class_id),
  CONSTRAINT fk_enroll_student FOREIGN KEY (student_id)       REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_enroll_class   FOREIGN KEY (class_id)         REFERENCES classes (id),
  CONSTRAINT fk_enroll_year    FOREIGN KEY (academic_year_id) REFERENCES academic_years (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. TIMETABLE AND ATTENDANCE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timetable_slots (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_subject_id INT UNSIGNED NOT NULL,
  day_of_week      TINYINT UNSIGNED NOT NULL,   -- 1 = Monday ... 7 = Sunday
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  room             VARCHAR(40) NULL,
  PRIMARY KEY (id),
  KEY idx_tt_cs (class_subject_id),
  KEY idx_tt_day (day_of_week, start_time),
  CONSTRAINT fk_tt_cs FOREIGN KEY (class_subject_id) REFERENCES class_subjects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id      INT UNSIGNED NOT NULL,
  class_id        INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status          ENUM('present','absent','late','excused') NOT NULL DEFAULT 'present',
  note            VARCHAR(255) NULL,
  marked_by       INT UNSIGNED NULL,            -- users.id of the teacher
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_day (student_id, attendance_date),
  KEY idx_attendance_class_date (class_id, attendance_date),
  CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_att_class   FOREIGN KEY (class_id)   REFERENCES classes (id),
  CONSTRAINT fk_att_marker  FOREIGN KEY (marked_by)  REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. ASSESSMENTS, GRADES, REPORT CARDS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grading_scales (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  grade     VARCHAR(5)   NOT NULL,
  min_score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL,
  remark    VARCHAR(60)  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_grade (grade)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessments (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_subject_id INT UNSIGNED NOT NULL,
  term_id          INT UNSIGNED NOT NULL,
  title            VARCHAR(150) NOT NULL,
  type             ENUM('assignment','quiz','test','exam') NOT NULL DEFAULT 'test',
  max_score        DECIMAL(6,2) NOT NULL DEFAULT 100,
  weight           DECIMAL(5,2) NOT NULL DEFAULT 100,   -- % contribution to the term mark
  assessed_on      DATE NULL,
  created_by       INT UNSIGNED NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_assess_cs_term (class_subject_id, term_id),
  CONSTRAINT fk_assess_cs   FOREIGN KEY (class_subject_id) REFERENCES class_subjects (id) ON DELETE CASCADE,
  CONSTRAINT fk_assess_term FOREIGN KEY (term_id)          REFERENCES terms (id),
  CONSTRAINT fk_assess_user FOREIGN KEY (created_by)       REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grades (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  assessment_id INT UNSIGNED NOT NULL,
  student_id    INT UNSIGNED NOT NULL,
  score         DECIMAL(6,2) NULL,
  comment       VARCHAR(255) NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_grade_student (assessment_id, student_id),
  KEY idx_grades_student (student_id),
  CONSTRAINT fk_grades_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE,
  CONSTRAINT fk_grades_student    FOREIGN KEY (student_id)    REFERENCES students (id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_comments (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id      INT UNSIGNED NOT NULL,
  term_id         INT UNSIGNED NOT NULL,
  teacher_comment TEXT NULL,
  head_comment    TEXT NULL,
  conduct         VARCHAR(40) NULL,
  published       TINYINT(1) NOT NULL DEFAULT 0,       -- parents see it only when published
  PRIMARY KEY (id),
  UNIQUE KEY uq_report_student_term (student_id, term_id),
  CONSTRAINT fk_rc_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_rc_term    FOREIGN KEY (term_id)    REFERENCES terms (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. ASSIGNMENTS AND SUBMISSIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_subject_id INT UNSIGNED NOT NULL,
  title            VARCHAR(190) NOT NULL,
  description      TEXT NULL,
  file_path        VARCHAR(255) NULL,
  due_at           DATETIME NULL,
  created_by       INT UNSIGNED NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_assignments_cs (class_subject_id),
  CONSTRAINT fk_asg_cs   FOREIGN KEY (class_subject_id) REFERENCES class_subjects (id) ON DELETE CASCADE,
  CONSTRAINT fk_asg_user FOREIGN KEY (created_by)       REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  assignment_id INT UNSIGNED NOT NULL,
  student_id    INT UNSIGNED NOT NULL,
  file_path     VARCHAR(255) NULL,
  answer_text   TEXT NULL,
  submitted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  score         DECIMAL(6,2) NULL,
  feedback      TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_submission (assignment_id, student_id),
  CONSTRAINT fk_sub_assignment FOREIGN KEY (assignment_id) REFERENCES assignments (id) ON DELETE CASCADE,
  CONSTRAINT fk_sub_student    FOREIGN KEY (student_id)    REFERENCES students (id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. FEES, INVOICES, PAYMENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_structures (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  academic_year_id INT UNSIGNED NOT NULL,
  level_id         INT UNSIGNED NULL,           -- NULL = applies to every level
  term_id          INT UNSIGNED NULL,           -- NULL = whole year / one-off
  name             VARCHAR(120) NOT NULL,       -- Tuition, Uniform, Boarding ...
  amount           DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_fee_year (academic_year_id),
  CONSTRAINT fk_fee_year  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
  CONSTRAINT fk_fee_level FOREIGN KEY (level_id)         REFERENCES levels (id) ON DELETE SET NULL,
  CONSTRAINT fk_fee_term  FOREIGN KEY (term_id)          REFERENCES terms (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_no  VARCHAR(30)  NOT NULL,
  student_id  INT UNSIGNED NOT NULL,
  term_id     INT UNSIGNED NULL,
  total       DECIMAL(12,2) NOT NULL DEFAULT 0,
  status      ENUM('unpaid','partial','paid','cancelled') NOT NULL DEFAULT 'unpaid',
  due_date    DATE NULL,
  created_by  INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoice_no (invoice_no),
  KEY idx_invoice_student (student_id),
  KEY idx_invoice_status (status),
  CONSTRAINT fk_inv_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_inv_term    FOREIGN KEY (term_id)    REFERENCES terms (id) ON DELETE SET NULL,
  CONSTRAINT fk_inv_user    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_items (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id       INT UNSIGNED NOT NULL,
  fee_structure_id INT UNSIGNED NULL,
  description      VARCHAR(190) NOT NULL,
  amount           DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_item_invoice (invoice_id),
  CONSTRAINT fk_item_invoice FOREIGN KEY (invoice_id)       REFERENCES invoices (id)       ON DELETE CASCADE,
  CONSTRAINT fk_item_fee     FOREIGN KEY (fee_structure_id) REFERENCES fee_structures (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  receipt_no  VARCHAR(30)  NOT NULL,
  invoice_id  INT UNSIGNED NOT NULL,
  student_id  INT UNSIGNED NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  method      ENUM('cash','bank','mtn_momo','airtel_money','card','other') NOT NULL DEFAULT 'cash',
  reference   VARCHAR(80)  NULL,                -- bank slip / mobile money transaction id
  paid_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_by INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_receipt_no (receipt_no),
  KEY idx_pay_invoice (invoice_id),
  KEY idx_pay_student (student_id),
  CONSTRAINT fk_pay_invoice FOREIGN KEY (invoice_id)  REFERENCES invoices (id),
  CONSTRAINT fk_pay_student FOREIGN KEY (student_id)  REFERENCES students (id),
  CONSTRAINT fk_pay_user    FOREIGN KEY (received_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. WEBSITE CONTENT
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(190) NOT NULL,
  slug         VARCHAR(220) NOT NULL,
  category     VARCHAR(60)  NOT NULL DEFAULT 'General',
  excerpt      VARCHAR(300) NULL,
  body         MEDIUMTEXT   NULL,
  cover_image  VARCHAR(255) NULL,
  status       ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  author_id    INT UNSIGNED NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_news_slug (slug),
  KEY idx_news_status_date (status, published_at),
  CONSTRAINT fk_news_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(190) NOT NULL,
  description  TEXT NULL,
  location     VARCHAR(190) NULL,
  starts_at    DATETIME NOT NULL,
  ends_at      DATETIME NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_by   INT UNSIGNED NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_start (starts_at),
  CONSTRAINT fk_events_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_items (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title      VARCHAR(150) NOT NULL,
  category   VARCHAR(60)  NULL,
  image_path VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_gallery_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(190) NOT NULL,
  body         TEXT NOT NULL,
  audience     ENUM('all','students','parents','teachers','staff') NOT NULL DEFAULT 'all',
  class_id     INT UNSIGNED NULL,               -- optional: only one class
  created_by   INT UNSIGNED NULL,
  published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ann_audience (audience, published_at),
  CONSTRAINT fk_ann_class FOREIGN KEY (class_id)   REFERENCES classes (id) ON DELETE SET NULL,
  CONSTRAINT fk_ann_user  FOREIGN KEY (created_by) REFERENCES users (id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. ADMISSIONS AND ENQUIRIES (from the public website)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admission_applications (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_no    VARCHAR(30)  NOT NULL,
  child_first_name VARCHAR(80) NOT NULL,
  child_last_name  VARCHAR(80) NOT NULL,
  gender          ENUM('male','female') NOT NULL,
  date_of_birth   DATE NULL,
  level_applied   VARCHAR(60) NOT NULL,         -- Nursery / Primary / Secondary
  class_applied   VARCHAR(60) NULL,
  previous_school VARCHAR(190) NULL,
  guardian_name   VARCHAR(160) NOT NULL,
  guardian_phone  VARCHAR(30)  NOT NULL,
  guardian_email  VARCHAR(190) NULL,
  address         VARCHAR(255) NULL,
  documents       TEXT NULL,                    -- comma-separated uploaded file paths
  status          ENUM('pending','under_review','interview','accepted','rejected','enrolled') NOT NULL DEFAULT 'pending',
  admin_notes     TEXT NULL,
  reviewed_by     INT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_application_ref (reference_no),
  KEY idx_application_status (status),
  CONSTRAINT fk_app_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(190) NOT NULL,
  phone      VARCHAR(30)  NULL,
  subject    VARCHAR(120) NULL,
  message    TEXT NOT NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contact_read (is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11. MESSAGING AND NOTIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_id    INT UNSIGNED NOT NULL,
  recipient_id INT UNSIGNED NOT NULL,
  subject      VARCHAR(190) NULL,
  body         TEXT NOT NULL,
  read_at      DATETIME NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_msg_recipient (recipient_id, read_at),
  KEY idx_msg_sender (sender_id),
  CONSTRAINT fk_msg_sender    FOREIGN KEY (sender_id)    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  title      VARCHAR(190) NOT NULL,
  body       VARCHAR(500) NULL,
  link       VARCHAR(255) NULL,
  read_at    DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id, read_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 12. SYSTEM: SETTINGS AND AUDIT LOG
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  setting_key   VARCHAR(100) NOT NULL,
  setting_value TEXT NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NULL,
  action     VARCHAR(60)  NOT NULL,             -- login, create, update, delete ...
  entity     VARCHAR(60)  NULL,                 -- table / module name
  entity_id  VARCHAR(40)  NULL,
  details    TEXT NULL,
  ip_address VARCHAR(45)  NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_user (user_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
