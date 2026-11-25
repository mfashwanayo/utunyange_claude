// Staff and user accounts. Teachers, parents and students are created on their own
// screens (they need a profile too); this screen manages every account's basics.
const userModel = require('../../models/user.model');
const audit = require('../../models/auditLog.model');
const authService = require('../../services/auth.service');
const accounts = require('../../utils/accounts');
const v = require('../../validators/admin.validator');
const { paginate } = require('../../utils/pagination');
const { view, notFound, flash, body } = require('../../utils/view');
const { wrap, toInt, str, qs, randomPassword, isDup } = require('../../utils/helpers');

const STAFF_ROLES = ['super_admin', 'admin', 'accountant', 'librarian', 'receptionist'];
const ROLE_LABELS = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
  accountant: 'Accountant',
  librarian: 'Librarian',
  receptionist: 'Receptionist',
};
const STATUSES = ['active', 'inactive', 'suspended'];

// Which staff roles the signed-in person may hand out.
const assignable = (actorRole) =>
  actorRole === 'super_admin' ? STAFF_ROLES : ['accountant', 'librarian', 'receptionist'];

const roleOptions = (actorRole) => assignable(actorRole).map((r) => ({ value: r, label: ROLE_LABELS[r] }));
const statusOptions = STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));

const renderForm = (res, status, data) =>
  res.status(status).render('admin/user-form', Object.assign({ layout: 'layouts/dashboard', portal: { name: 'Administration' } }, data));

exports.index = wrap(async (req, res) => {
  const actor = req.session.user;
  const filters = { q: str(req.query.q, 80), role: str(req.query.role, 30), status: str(req.query.status, 20) };
  const total = await userModel.adminCount(filters);
  const pager = paginate(total, toInt(req.query.page) || 1, 15);
  const rows = (await userModel.adminList(filters, pager.perPage, pager.offset)).map((r) => ({
    ...r,
    isSelf: r.id === actor.id,
    manageable: accounts.canManageUser(actor, r),
  }));
  const roles = await userModel.listRoles();
  view(res, 'admin/users', { title: 'User accounts', rows, filters, pager, qs: qs(filters), roles });
});

exports.newForm = wrap(async (req, res) => {
  renderForm(res, 200, {
    title: 'Add staff account',
    isEdit: false,
    action: '/admin/users',
    values: { role: 'accountant' },
    errors: {},
    roleOptions: roleOptions(req.session.user.role),
    statusOptions,
    canChangeRole: true,
    canChangeStatus: false,
  });
});

exports.create = wrap(async (req, res) => {
  const actor = req.session.user;
  const b = body(req);
  const { v: values, e: errors } = v.person(b);
  values.role = str(b.role, 30);
  if (!assignable(actor.role).includes(values.role)) errors.role = 'Choose a role.';
  if (!errors.email && (await userModel.emailTaken(values.email))) errors.email = 'This email is already used by another account.';

  const fail = () =>
    renderForm(res, 422, {
      title: 'Add staff account', isEdit: false, action: '/admin/users', values, errors,
      roleOptions: roleOptions(actor.role), statusOptions, canChangeRole: true, canChangeStatus: false,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  const password = randomPassword();
  let id;
  try {
    id = await userModel.createUser({ ...values, password_hash: await authService.hashPassword(password) });
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.email = 'This email is already used by another account.';
    return fail();
  }
  await audit.fromReq(req, 'user_created', { entity: 'users', entityId: id, details: `role=${values.role}` });
  flash(req, 'success', `Account created for ${values.first_name} ${values.last_name}. Temporary password: ${password}  -  shown only once; they must change it at first sign-in.`);
  return res.redirect('/admin/users');
});

async function loadTarget(req, res) {
  const id = toInt(req.params.id);
  const target = id ? await userModel.findForAdmin(id) : null;
  if (!target) {
    notFound(res);
    return null;
  }
  if (!accounts.canManageUser(req.session.user, target)) {
    res.status(403).render('errors/403', { title: 'Access denied', message: 'You are not allowed to manage that account.' });
    return null;
  }
  return target;
}

function editState(actor, target) {
  const isSelf = actor.id === target.id;
  const isStaff = STAFF_ROLES.includes(target.role_name);
  return {
    isSelf,
    canChangeRole: isStaff && !isSelf,
    canChangeStatus: !isSelf,
    roleOptions: roleOptions(actor.role),
  };
}

exports.editForm = wrap(async (req, res) => {
  const target = await loadTarget(req, res);
  if (!target) return;
  renderForm(res, 200, {
    title: 'Edit account', isEdit: true, action: `/admin/users/${target.id}`, target,
    values: { ...target, role: target.role_name }, errors: {}, statusOptions,
    ...editState(req.session.user, target),
  });
});

exports.update = wrap(async (req, res) => {
  const actor = req.session.user;
  const target = await loadTarget(req, res);
  if (!target) return;
  const state = editState(actor, target);
  const b = body(req);
  const { v: values, e: errors } = v.person(b);

  let role = target.role_name;
  let status = target.status;
  if (state.canChangeRole) {
    role = str(b.role, 30);
    if (!assignable(actor.role).includes(role)) errors.role = 'Choose a role.';
  }
  if (state.canChangeStatus) {
    status = str(b.status, 20);
    if (!STATUSES.includes(status)) errors.status = 'Choose a status.';
  }
  if (!errors.email && (await userModel.emailTaken(values.email, target.id))) errors.email = 'This email is already used by another account.';

  const fail = () =>
    renderForm(res, 422, {
      title: 'Edit account', isEdit: true, action: `/admin/users/${target.id}`, target,
      values: { ...values, role, status }, errors, statusOptions, ...state,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  try {
    await userModel.updateAdmin(target.id, { ...values, role, status });
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.email = 'This email is already used by another account.';
    return fail();
  }
  if (state.isSelf) {
    req.session.user.firstName = values.first_name;
    req.session.user.name = `${values.first_name} ${values.last_name}`;
    req.session.user.email = values.email;
  }
  await audit.fromReq(req, 'user_updated', { entity: 'users', entityId: target.id });
  flash(req, 'success', 'Account updated.');
  return res.redirect('/admin/users');
});

exports.resetPassword = wrap((req, res) => accounts.resetPassword(req, res, toInt(req.params.id), '/admin/users'));
exports.toggleStatus = wrap((req, res) => accounts.toggleStatus(req, res, toInt(req.params.id), '/admin/users'));
