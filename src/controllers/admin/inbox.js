// Messages sent from the contact form on the public website.
const contactModel = require('../../models/contact.model');
const audit = require('../../models/auditLog.model');
const { paginate } = require('../../utils/pagination');
const { view, flash } = require('../../utils/view');
const { wrap, toInt, qs } = require('../../utils/helpers');

exports.index = wrap(async (req, res) => {
  const unreadOnly = req.query.show === 'unread';
  const filters = { show: unreadOnly ? 'unread' : '' };
  const total = await contactModel.count(unreadOnly);
  const pager = paginate(total, toInt(req.query.page) || 1, 15);
  const rows = await contactModel.list(unreadOnly, pager.perPage, pager.offset);
  const unread = await contactModel.unreadCount();
  view(res, 'admin/inbox', { title: 'Inbox', rows, filters, pager, qs: qs(filters), unread });
});

exports.toggleRead = wrap(async (req, res) => {
  const id = toInt(req.params.id);
  if (id) await contactModel.setRead(id, req.body && req.body.read === '1');
  return res.redirect('/admin/inbox');
});

exports.markAllRead = wrap(async (req, res) => {
  await contactModel.markAllRead();
  flash(req, 'success', 'All messages marked as read.');
  return res.redirect('/admin/inbox');
});

exports.remove = wrap(async (req, res) => {
  const id = toInt(req.params.id);
  if (id) {
    await contactModel.remove(id);
    await audit.fromReq(req, 'contact_message_deleted', { entity: 'contact_messages', entityId: id });
    flash(req, 'success', 'Message deleted.');
  }
  return res.redirect('/admin/inbox');
});
