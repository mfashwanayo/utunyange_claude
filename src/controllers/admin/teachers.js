const teacherModel = require('../../models/teacher.model');
const userModel = require('../../models/user.model');
const audit = require('../../models/auditLog.model');
const authService = require('../../services/auth.service');
const accounts = require('../../utils/accounts');
const v = require('../../validators/admin.validator');
const { paginate } = require('../../utils/pagination');
const { view, notFound, flash, body } = require('../../utils/view');
const { wrap, toInt, str, qs, randomPassword, isDup } = require('../../utils/helpers');

const genderOptions = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }];

const form = (res, status, data) =>
  res.status(status).render('admin/teacher-form', Object.assign({ layout: 'layouts/dashboard', portal: { name: 'Administration' }, genderOptions }, data));

exports.index = wrap(async (req, res) => {
  const filters = { q: str(req.query.q, 80), status: str(req.query.status, 20) };
  const total = await teacherModel.count(filters);
  const pager = paginate(total, toInt(req.query.page) || 1, 15);
  const rows = await teacherModel.list(filters, pager.perPage, pager.offset);
  view(res, 'admin/teachers', { title: 'Teachers', rows, filters, pager, qs: qs(filters) });
});

exports.newForm = wrap(async (req, res) => {
  form(res, 200, { title: 'Add teacher', isEdit: false, action: '/admin/teachers', values: {}, errors: {} });
});

exports.create = wrap(async (req, res) => {
  const { v: values, e: errors } = v.teacher(body(req));
  if (!errors.email && (await userModel.emailTaken(values.email))) errors.email = 'This email is already used by another account.';

  const fail = () =>
    form(res, 422, {
      title: 'Add teacher', isEdit: false, action: '/admin/teachers', values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  const password = randomPassword();
  let created;
  try {
    created = await teacherModel.create({ ...values, password_hash: await authService.hashPassword(password) });
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.email = 'This email is already used by another account.';
    return fail();
  }
  await audit.fromReq(req, 'teacher_created', { entity: 'teachers', entityId: created.id });
  flash(req, 'success', `Teacher ${values.first_name} ${values.last_name} added (staff no. ${created.staff_no}). Temporary password: ${password}  -  shown only once; they must change it at first sign-in.`);
  return res.redirect('/admin/teachers');
});

exports.editForm = wrap(async (req, res) => {
  const teacher = await teacherModel.findById(toInt(req.params.id));
  if (!teacher) return notFound(res);
  return form(res, 200, { title: 'Edit teacher', isEdit: true, action: `/admin/teachers/${teacher.id}`, teacher, values: teacher, errors: {} });
});

exports.update = wrap(async (req, res) => {
  const teacher = await teacherModel.findById(toInt(req.params.id));
  if (!teacher) return notFound(res);
  const { v: values, e: errors } = v.teacher(body(req));
  if (!errors.email && (await userModel.emailTaken(values.email, teacher.user_id))) errors.email = 'This email is already used by another account.';

  const fail = () =>
    form(res, 422, {
      title: 'Edit teacher', isEdit: true, action: `/admin/teachers/${teacher.id}`, teacher, values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  try {
    await teacherModel.update(teacher.id, teacher.user_id, values);
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.email = 'This email is already used by another account.';
    return fail();
  }
  await audit.fromReq(req, 'teacher_updated', { entity: 'teachers', entityId: teacher.id });
  flash(req, 'success', 'Teacher updated.');
  return res.redirect('/admin/teachers');
});

async function withTeacher(req, res, fn) {
  const teacher = await teacherModel.findById(toInt(req.params.id));
  if (!teacher) return notFound(res);
  return fn(teacher);
}

exports.resetPassword = wrap((req, res) => withTeacher(req, res, (t) => accounts.resetPassword(req, res, t.user_id, '/admin/teachers')));
exports.toggleStatus = wrap((req, res) => withTeacher(req, res, (t) => accounts.toggleStatus(req, res, t.user_id, '/admin/teachers')));
