const studentModel = require('../../models/student.model');
const parentModel = require('../../models/parent.model');
const classModel = require('../../models/class.model');
const academic = require('../../models/academic.model');
const userModel = require('../../models/user.model');
const audit = require('../../models/auditLog.model');
const authService = require('../../services/auth.service');
const accounts = require('../../utils/accounts');
const v = require('../../validators/admin.validator');
const { paginate } = require('../../utils/pagination');
const { view, notFound, flash, body } = require('../../utils/view');
const { wrap, toInt, str, qs, randomPassword, isDup, isEmail, todayStr } = require('../../utils/helpers');

const genderOptions = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }];
const statusOptions = v.STUDENT_STATUS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));
const relationshipOptions = v.RELATIONSHIPS.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }));

// Current academic year + its classes (for the class dropdowns).
async function context() {
  const year = await academic.getCurrentYear();
  const classOptions = year ? await classModel.forSelect(year.id) : [];
  return { year, classOptions };
}

const form = (res, status, data) =>
  res.status(status).render('admin/student-form', Object.assign({ layout: 'layouts/dashboard', portal: { name: 'Administration' }, genderOptions, statusOptions }, data));

const classIsValid = (classOptions, id) => classOptions.some((o) => String(o.value) === String(id));

exports.index = wrap(async (req, res) => {
  const { year, classOptions } = await context();
  const filters = { q: str(req.query.q, 80), status: str(req.query.status, 20), class_id: str(req.query.class_id, 10) };
  const f = { q: filters.q, status: filters.status, classId: toInt(filters.class_id) };
  const total = await studentModel.count(f, year && year.id);
  const pager = paginate(total, toInt(req.query.page) || 1, 15);
  const rows = await studentModel.list(f, year && year.id, pager.perPage, pager.offset);
  view(res, 'admin/students', { title: 'Students', rows, filters, pager, qs: qs(filters), year, classOptions, statusOptions });
});

exports.newForm = wrap(async (req, res) => {
  const { year, classOptions } = await context();
  form(res, 200, {
    title: 'Add student', isEdit: false, action: '/admin/students', year, classOptions,
    values: { status: 'active', admitted_on: todayStr() }, errors: {},
  });
});

exports.create = wrap(async (req, res) => {
  const { year, classOptions } = await context();
  const { v: values, e: errors } = v.student(body(req), { isNew: true });

  if (!errors.admission_no && values.admission_no && (await studentModel.admissionExists(values.admission_no))) {
    errors.admission_no = 'This admission number is already used.';
  }
  if (values.class_id && !errors.class_id && !classIsValid(classOptions, values.class_id)) errors.class_id = 'Choose a class from the list.';
  if (values.create_login && !errors.login_email && (await userModel.emailTaken(values.login_email))) {
    errors.login_email = 'This email is already used by another account.';
  }

  const fail = () =>
    form(res, 422, {
      title: 'Add student', isEdit: false, action: '/admin/students', year, classOptions, values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  const password = values.create_login ? randomPassword() : null;
  let created;
  try {
    created = await studentModel.create({
      student: values,
      classId: toInt(values.class_id),
      yearId: year ? year.id : null,
      yearName: year ? year.name : '',
      login: password ? { email: values.login_email, password_hash: await authService.hashPassword(password) } : null,
    });
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.admission_no = 'This admission number or login email is already used.';
    return fail();
  }
  await audit.fromReq(req, 'student_created', { entity: 'students', entityId: created.id });
  let msg = `${values.first_name} ${values.last_name} added (admission no. ${created.admission_no}).`;
  if (password) msg += ` Login: ${values.login_email}, temporary password: ${password}  -  shown only once.`;
  flash(req, 'success', msg);
  return res.redirect(`/admin/students/${created.id}`);
});

async function loadStudent(req, res) {
  const year = await academic.getCurrentYear();
  const id = toInt(req.params.id);
  const student = id ? await studentModel.findById(id, year && year.id) : null;
  if (!student) {
    notFound(res);
    return {};
  }
  return { student, year };
}

exports.show = wrap(async (req, res) => {
  const { student, year } = await loadStudent(req, res);
  if (!student) return;
  const [parents, allParents, enrollments] = await Promise.all([
    studentModel.parents(student.id),
    parentModel.options(),
    studentModel.enrollments(student.id),
  ]);
  const linked = new Set(parents.map((p) => p.parent_id));
  view(res, 'admin/student-show', {
    title: `${student.first_name} ${student.last_name}`, student, year, parents, enrollments,
    parentOptions: allParents.filter((o) => !linked.has(o.value)), relationshipOptions,
    values: {}, errors: {},
  });
});

exports.editForm = wrap(async (req, res) => {
  const { student, year } = await loadStudent(req, res);
  if (!student) return;
  const { classOptions } = await context();
  form(res, 200, {
    title: 'Edit student', isEdit: true, action: `/admin/students/${student.id}`, student, year, classOptions,
    values: { ...student, class_id: student.class_id || '' }, errors: {},
  });
});

exports.update = wrap(async (req, res) => {
  const { student, year } = await loadStudent(req, res);
  if (!student) return;
  const { classOptions } = await context();
  const { v: values, e: errors } = v.student(body(req));

  if (!errors.admission_no && values.admission_no && (await studentModel.admissionExists(values.admission_no, student.id))) {
    errors.admission_no = 'This admission number is already used.';
  }
  if (!values.admission_no) errors.admission_no = 'The admission number is required.';
  if (values.class_id && !errors.class_id && !classIsValid(classOptions, values.class_id)) errors.class_id = 'Choose a class from the list.';

  const fail = () =>
    form(res, 422, {
      title: 'Edit student', isEdit: true, action: `/admin/students/${student.id}`, student, year, classOptions, values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  try {
    await studentModel.update(student.id, values, toInt(values.class_id), year ? year.id : null);
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.admission_no = 'This admission number is already used.';
    return fail();
  }
  await audit.fromReq(req, 'student_updated', { entity: 'students', entityId: student.id });
  flash(req, 'success', 'Student updated.');
  return res.redirect(`/admin/students/${student.id}`);
});

// ---- Parent links ----
exports.linkParent = wrap(async (req, res) => {
  const { student } = await loadStudent(req, res);
  if (!student) return;
  const b = body(req);
  const parentId = toInt(b.parent_id);
  const relationship = str(b.relationship, 20);
  const back = `/admin/students/${student.id}`;

  if (!parentId || !(await parentModel.findById(parentId))) {
    flash(req, 'error', 'Choose a parent from the list.');
    return res.redirect(back);
  }
  if (!v.RELATIONSHIPS.includes(relationship)) {
    flash(req, 'error', 'Choose the relationship.');
    return res.redirect(back);
  }
  await studentModel.linkParent(student.id, parentId, relationship, b.is_primary === '1');
  await audit.fromReq(req, 'student_parent_linked', { entity: 'students', entityId: student.id, details: `parent=${parentId}` });
  flash(req, 'success', 'Parent linked.');
  return res.redirect(back);
});

exports.unlinkParent = wrap(async (req, res) => {
  const { student } = await loadStudent(req, res);
  if (!student) return;
  const parentId = toInt(req.params.parentId);
  if (parentId) {
    await studentModel.unlinkParent(student.id, parentId);
    await audit.fromReq(req, 'student_parent_unlinked', { entity: 'students', entityId: student.id, details: `parent=${parentId}` });
    flash(req, 'success', 'Parent removed from this student.');
  }
  return res.redirect(`/admin/students/${student.id}`);
});

// ---- Login account ----
exports.createLogin = wrap(async (req, res) => {
  const { student } = await loadStudent(req, res);
  if (!student) return;
  const back = `/admin/students/${student.id}`;
  const email = str(body(req).login_email, 190).toLowerCase();

  if (student.user_id) {
    flash(req, 'error', 'This student already has a login account.');
    return res.redirect(back);
  }
  if (!isEmail(email)) {
    flash(req, 'error', 'Enter a valid email address for the login.');
    return res.redirect(back);
  }
  if (await userModel.emailTaken(email)) {
    flash(req, 'error', 'That email is already used by another account.');
    return res.redirect(back);
  }
  const password = randomPassword();
  try {
    await studentModel.createLogin(student.id, {
      first_name: student.first_name,
      last_name: student.last_name,
      email,
      password_hash: await authService.hashPassword(password),
    });
  } catch (err) {
    if (!isDup(err)) throw err;
    flash(req, 'error', 'That email is already used by another account.');
    return res.redirect(back);
  }
  await audit.fromReq(req, 'student_login_created', { entity: 'students', entityId: student.id });
  flash(req, 'success', `Login created: ${email}, temporary password: ${password}  -  shown only once; the student must change it at first sign-in.`);
  return res.redirect(back);
});

exports.resetPassword = wrap(async (req, res) => {
  const { student } = await loadStudent(req, res);
  if (!student) return;
  return accounts.resetPassword(req, res, student.user_id, `/admin/students/${student.id}`);
});

exports.toggleLogin = wrap(async (req, res) => {
  const { student } = await loadStudent(req, res);
  if (!student) return;
  return accounts.toggleStatus(req, res, student.user_id, `/admin/students/${student.id}`);
});
