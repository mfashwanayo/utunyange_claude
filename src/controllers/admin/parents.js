const parentModel = require('../../models/parent.model');
const userModel = require('../../models/user.model');
const audit = require('../../models/auditLog.model');
const authService = require('../../services/auth.service');
const accounts = require('../../utils/accounts');
const v = require('../../validators/admin.validator');
const { paginate } = require('../../utils/pagination');
const { view, notFound, flash, body } = require('../../utils/view');
const { wrap, toInt, str, qs, randomPassword, isDup } = require('../../utils/helpers');

const form = (res, status, data) =>
  res.status(status).render('admin/parent-form', Object.assign({ layout: 'layouts/dashboard', portal: { name: 'Administration' } }, data));

exports.index = wrap(async (req, res) => {
  const filters = { q: str(req.query.q, 80), status: str(req.query.status, 20) };
  const total = await parentModel.count(filters);
  const pager = paginate(total, toInt(req.query.page) || 1, 15);
  const rows = await parentModel.list(filters, pager.perPage, pager.offset);
  view(res, 'admin/parents', { title: 'Parents & guardians', rows, filters, pager, qs: qs(filters) });
});

exports.newForm = wrap(async (req, res) => {
  form(res, 200, { title: 'Add parent / guardian', isEdit: false, action: '/admin/parents', values: {}, errors: {} });
});

exports.create = wrap(async (req, res) => {
  const { v: values, e: errors } = v.parent(body(req));
  if (!errors.email && (await userModel.emailTaken(values.email))) errors.email = 'This email is already used by another account.';

  const fail = () =>
    form(res, 422, {
      title: 'Add parent / guardian', isEdit: false, action: '/admin/parents', values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  const password = randomPassword();
  let created;
  try {
    created = await parentModel.create({ ...values, password_hash: await authService.hashPassword(password) });
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.email = 'This email is already used by another account.';
    return fail();
  }
  await audit.fromReq(req, 'parent_created', { entity: 'parents', entityId: created.id });
  flash(req, 'success', `${values.first_name} ${values.last_name} added. Temporary password: ${password}  -  shown only once; they must change it at first sign-in. Link their children from each student's page.`);
  return res.redirect('/admin/parents');
});

exports.editForm = wrap(async (req, res) => {
  const parent = await parentModel.findById(toInt(req.params.id));
  if (!parent) return notFound(res);
  const children = await parentModel.children(parent.id);
  return form(res, 200, { title: 'Edit parent / guardian', isEdit: true, action: `/admin/parents/${parent.id}`, parent, children, values: parent, errors: {} });
});

exports.update = wrap(async (req, res) => {
  const parent = await parentModel.findById(toInt(req.params.id));
  if (!parent) return notFound(res);
  const { v: values, e: errors } = v.parent(body(req));
  if (!errors.email && (await userModel.emailTaken(values.email, parent.user_id))) errors.email = 'This email is already used by another account.';

  const fail = async () =>
    form(res, 422, {
      title: 'Edit parent / guardian', isEdit: true, action: `/admin/parents/${parent.id}`, parent,
      children: await parentModel.children(parent.id), values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  try {
    await parentModel.update(parent.id, parent.user_id, values);
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.email = 'This email is already used by another account.';
    return fail();
  }
  await audit.fromReq(req, 'parent_updated', { entity: 'parents', entityId: parent.id });
  flash(req, 'success', 'Parent updated.');
  return res.redirect('/admin/parents');
});

async function withParent(req, res, fn) {
  const parent = await parentModel.findById(toInt(req.params.id));
  if (!parent) return notFound(res);
  return fn(parent);
}

exports.resetPassword = wrap((req, res) => withParent(req, res, (p) => accounts.resetPassword(req, res, p.user_id, '/admin/parents')));
exports.toggleStatus = wrap((req, res) => withParent(req, res, (p) => accounts.toggleStatus(req, res, p.user_id, '/admin/parents')));
