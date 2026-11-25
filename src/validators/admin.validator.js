// Validation for the admin forms. Each function returns { v, e }:
//   v = cleaned values (also used to re-fill the form), e = { field: 'message' }.
const { str, isEmail, isDate, parseDateTime, todayStr, toInt } = require('../utils/helpers');

const GENDERS = ['male', 'female'];
const STUDENT_STATUS = ['active', 'transferred', 'graduated', 'withdrawn'];
const RELATIONSHIPS = ['father', 'mother', 'guardian', 'other'];
const NEWS_CATEGORIES = ['General', 'Achievement', 'Admissions', 'Campus', 'Sports', 'Events', 'Announcement'];

function person(b) {
  const v = {
    first_name: str(b.first_name, 80),
    last_name: str(b.last_name, 80),
    email: str(b.email, 190).toLowerCase(),
    phone: str(b.phone, 30),
  };
  const e = {};
  if (v.first_name.length < 2) e.first_name = 'Enter the first name.';
  if (v.last_name.length < 2) e.last_name = 'Enter the last name.';
  if (!isEmail(v.email)) e.email = 'Enter a valid email address.';
  if (v.phone && !/^[0-9+()\-\s]{6,30}$/.test(v.phone)) e.phone = 'Enter a valid phone number.';
  return { v, e };
}

function teacher(b) {
  const { v, e } = person(b);
  v.gender = str(b.gender, 10);
  v.qualification = str(b.qualification, 190);
  v.specialization = str(b.specialization, 190);
  v.hire_date = str(b.hire_date, 10);
  v.address = str(b.address, 255);
  if (v.gender && !GENDERS.includes(v.gender)) e.gender = 'Choose male or female.';
  if (v.hire_date && !isDate(v.hire_date)) e.hire_date = 'Enter a valid date.';
  return { v, e };
}

function parent(b) {
  const { v, e } = person(b);
  v.occupation = str(b.occupation, 120);
  v.address = str(b.address, 255);
  v.alt_phone = str(b.alt_phone, 30);
  if (v.alt_phone && !/^[0-9+()\-\s]{6,30}$/.test(v.alt_phone)) e.alt_phone = 'Enter a valid phone number.';
  return { v, e };
}

function student(b, { isNew = false } = {}) {
  const v = {
    admission_no: str(b.admission_no, 30),
    first_name: str(b.first_name, 80),
    last_name: str(b.last_name, 80),
    gender: str(b.gender, 10),
    date_of_birth: str(b.date_of_birth, 10),
    address: str(b.address, 255),
    medical_notes: str(b.medical_notes, 2000),
    status: str(b.status, 20) || 'active',
    class_id: str(b.class_id, 10),
    admitted_on: str(b.admitted_on, 10),
  };
  const e = {};
  if (v.admission_no && !/^[A-Za-z0-9][A-Za-z0-9\-/]{1,29}$/.test(v.admission_no)) {
    e.admission_no = 'Use letters, numbers, - or / only (2-30 characters).';
  }
  if (v.first_name.length < 2) e.first_name = 'Enter the first name.';
  if (v.last_name.length < 2) e.last_name = 'Enter the last name.';
  if (!GENDERS.includes(v.gender)) e.gender = 'Choose a gender.';
  if (v.date_of_birth) {
    if (!isDate(v.date_of_birth)) e.date_of_birth = 'Enter a valid date.';
    else if (v.date_of_birth > todayStr()) e.date_of_birth = 'Date of birth cannot be in the future.';
  }
  if (v.admitted_on && !isDate(v.admitted_on)) e.admitted_on = 'Enter a valid date.';
  if (!STUDENT_STATUS.includes(v.status)) e.status = 'Choose a status.';
  if (v.class_id && !toInt(v.class_id)) e.class_id = 'Choose a class.';

  if (isNew) {
    v.create_login = b.create_login === '1' ? '1' : '';
    v.login_email = str(b.login_email, 190).toLowerCase();
    if (v.create_login && !isEmail(v.login_email)) e.login_email = 'Enter the email the student will sign in with.';
  }
  return { v, e };
}

function classForm(b) {
  const v = {
    name: str(b.name, 60),
    section: str(b.section, 20),
    level_id: str(b.level_id, 10),
    academic_year_id: str(b.academic_year_id, 10),
    combination: str(b.combination, 60),
    capacity: str(b.capacity, 5),
    class_teacher_id: str(b.class_teacher_id, 10),
  };
  const e = {};
  if (v.name.length < 1) e.name = 'Enter the class name, for example P4 or S2.';
  if (!toInt(v.level_id)) e.level_id = 'Choose a level.';
  if (!toInt(v.academic_year_id)) e.academic_year_id = 'Choose an academic year.';
  if (v.capacity) {
    const n = toInt(v.capacity);
    if (!n || n > 500) e.capacity = 'Enter a number between 1 and 500.';
  }
  if (v.class_teacher_id && !toInt(v.class_teacher_id)) e.class_teacher_id = 'Choose a teacher.';
  return { v, e };
}

function subject(b) {
  const v = { code: str(b.code, 20).toUpperCase(), name: str(b.name, 120), level_id: str(b.level_id, 10) };
  const e = {};
  if (!/^[A-Z0-9-]{2,20}$/.test(v.code)) e.code = 'Use 2-20 letters, numbers or - (for example MAT).';
  if (v.name.length < 2) e.name = 'Enter the subject name.';
  if (v.level_id && !toInt(v.level_id)) e.level_id = 'Choose a level.';
  return { v, e };
}

// Academic year with its three terms.
function year(b) {
  const v = {
    name: str(b.name, 20),
    start_date: str(b.start_date, 10),
    end_date: str(b.end_date, 10),
    make_current: b.make_current === '1' ? '1' : '',
  };
  const e = {};
  const terms = [1, 2, 3].map((n) => {
    v[`t${n}_start`] = str(b[`t${n}_start`], 10);
    v[`t${n}_end`] = str(b[`t${n}_end`], 10);
    return { name: `Term ${n}`, start_date: v[`t${n}_start`], end_date: v[`t${n}_end`] };
  });

  if (v.name.length < 4) e.name = 'Enter the year, for example 2028.';
  if (!isDate(v.start_date)) e.start_date = 'Enter a valid date.';
  if (!isDate(v.end_date)) e.end_date = 'Enter a valid date.';
  if (!e.start_date && !e.end_date && v.end_date <= v.start_date) e.end_date = 'The end must be after the start.';

  let prevEnd = '';
  terms.forEach((t, i) => {
    const n = i + 1;
    if (!isDate(t.start_date)) { e[`t${n}_start`] = 'Enter a valid date.'; return; }
    if (!isDate(t.end_date)) { e[`t${n}_end`] = 'Enter a valid date.'; return; }
    if (t.end_date <= t.start_date) e[`t${n}_end`] = 'The end must be after the start.';
    else if (!e.start_date && !e.end_date && (t.start_date < v.start_date || t.end_date > v.end_date)) {
      e[`t${n}_start`] = 'Term dates must be inside the academic year.';
    } else if (prevEnd && t.start_date <= prevEnd) e[`t${n}_start`] = 'This term must start after the previous term ends.';
    prevEnd = t.end_date;
  });
  return { v, e, terms };
}

function news(b) {
  const v = {
    title: str(b.title, 190),
    category: str(b.category, 60) || 'General',
    excerpt: str(b.excerpt, 300),
    body: typeof b.body === 'string' ? b.body.trim().slice(0, 50000) : '',
    status: str(b.status, 12) || 'draft',
    remove_cover: b.remove_cover === '1' ? '1' : '',
  };
  const e = {};
  if (v.title.length < 3) e.title = 'Enter a title (at least 3 characters).';
  if (!NEWS_CATEGORIES.includes(v.category)) e.category = 'Choose a category.';
  if (v.body.length < 10) e.body = 'Write the article text (at least 10 characters).';
  if (!['draft', 'published'].includes(v.status)) e.status = 'Choose draft or published.';
  return { v, e };
}

function event(b) {
  const v = {
    title: str(b.title, 190),
    description: typeof b.description === 'string' ? b.description.trim().slice(0, 5000) : '',
    location: str(b.location, 190),
    starts_at: str(b.starts_at, 16),
    ends_at: str(b.ends_at, 16),
    is_published: b.is_published === '1' ? '1' : '',
  };
  const e = {};
  const starts = parseDateTime(v.starts_at);
  const ends = v.ends_at ? parseDateTime(v.ends_at) : null;
  if (v.title.length < 3) e.title = 'Enter a title (at least 3 characters).';
  if (!starts) e.starts_at = 'Choose the start date and time.';
  if (v.ends_at && !ends) e.ends_at = 'Enter a valid end date and time.';
  if (starts && ends && ends < starts) e.ends_at = 'The end cannot be before the start.';
  return { v, e, starts, ends };
}

module.exports = {
  GENDERS, STUDENT_STATUS, RELATIONSHIPS, NEWS_CATEGORIES,
  person, teacher, parent, student, classForm, subject, year, news, event,
};
