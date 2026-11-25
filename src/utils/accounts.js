// Account actions shared by the Users, Teachers, Parents and Students screens:
// reset a password (temporary one is shown once) and activate / deactivate a login.
const userModel = require('../models/user.model');
const authService = require('../services/auth.service');
const audit = require('../models/auditLog.model');
const { randomPassword } = require('./helpers');
const { flash } = require('./view');

// Admins cannot touch other admins or super admins; super admins can manage everyone.
function canManageUser(actor, target) {
  if (actor.id === target.id) return true;
  if (actor.role === 'super_admin') return true;
  return !['super_admin', 'admin'].includes(target.role_name);
}

async function load(req, res, userId, redirect) {
  const target = userId ? await userModel.findForAdmin(userId) : null;
  if (!target) {
    flash(req, 'error', 'That account was not found.');
    res.redirect(redirect);
    return null;
  }
  if (target.id === req.session.user.id) {
    flash(req, 'error', 'You cannot do this to your own account.');
    res.redirect(redirect);
    return null;
  }
  if (!canManageUser(req.session.user, target)) {
    flash(req, 'error', 'You are not allowed to manage that account.');
    res.redirect(redirect);
    return null;
  }
  return target;
}

async function resetPassword(req, res, userId, redirect) {
  const target = await load(req, res, userId, redirect);
  if (!target) return;
  const password = randomPassword();
  await userModel.setTempPassword(target.id, await authService.hashPassword(password));
  await audit.fromReq(req, 'password_reset_by_admin', { entity: 'users', entityId: target.id });
  flash(
    req,
    'success',
    `New temporary password for ${target.first_name} ${target.last_name}: ${password}  -  shown only once. They must change it at their next sign-in.`
  );
  res.redirect(redirect);
}

async function toggleStatus(req, res, userId, redirect) {
  const target = await load(req, res, userId, redirect);
  if (!target) return;
  const next = target.status === 'active' ? 'inactive' : 'active';
  await userModel.setStatus(target.id, next);
  await audit.fromReq(req, `user_${next === 'active' ? 'activated' : 'deactivated'}`, { entity: 'users', entityId: target.id });
  flash(req, 'success', `${target.first_name} ${target.last_name} is now ${next}.`);
  res.redirect(redirect);
}

module.exports = { canManageUser, resetPassword, toggleStatus };
