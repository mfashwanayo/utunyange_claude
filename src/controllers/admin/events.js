const eventModel = require('../../models/event.model');
const audit = require('../../models/auditLog.model');
const v = require('../../validators/admin.validator');
const { paginate } = require('../../utils/pagination');
const { view, notFound, flash, body } = require('../../utils/view');
const { wrap, toInt, str, qs, toInputDateTime } = require('../../utils/helpers');

const form = (res, status, data) =>
  res.status(status).render('admin/event-form', Object.assign({ layout: 'layouts/dashboard', portal: { name: 'Administration' } }, data));

exports.index = wrap(async (req, res) => {
  const scope = ['upcoming', 'past'].includes(req.query.scope) ? req.query.scope : '';
  const filters = { q: str(req.query.q, 80), scope };
  const total = await eventModel.adminCount(filters);
  const pager = paginate(total, toInt(req.query.page) || 1, 15);
  const rows = await eventModel.adminList(filters, pager.perPage, pager.offset);
  view(res, 'admin/events', { title: 'Events', rows, filters, pager, qs: qs(filters) });
});

exports.newForm = wrap(async (req, res) => {
  form(res, 200, { title: 'Add event', isEdit: false, action: '/admin/events', values: { is_published: '1' }, errors: {} });
});

exports.create = wrap(async (req, res) => {
  const { v: values, e: errors, starts, ends } = v.event(body(req));
  if (Object.keys(errors).length) {
    return form(res, 422, {
      title: 'Add event', isEdit: false, action: '/admin/events', values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  }
  const id = await eventModel.create({
    ...values, starts_at: starts, ends_at: ends, is_published: values.is_published === '1', created_by: req.session.user.id,
  });
  await audit.fromReq(req, 'event_created', { entity: 'events', entityId: id });
  flash(req, 'success', values.is_published === '1' ? 'Event added and shown on the website.' : 'Event saved (hidden from the website).');
  return res.redirect('/admin/events');
});

exports.editForm = wrap(async (req, res) => {
  const event = await eventModel.findById(toInt(req.params.id));
  if (!event) return notFound(res);
  const values = {
    ...event,
    starts_at: toInputDateTime(event.starts_at),
    ends_at: toInputDateTime(event.ends_at),
    is_published: event.is_published ? '1' : '',
  };
  return form(res, 200, { title: 'Edit event', isEdit: true, action: `/admin/events/${event.id}`, event, values, errors: {} });
});

exports.update = wrap(async (req, res) => {
  const event = await eventModel.findById(toInt(req.params.id));
  if (!event) return notFound(res);
  const { v: values, e: errors, starts, ends } = v.event(body(req));
  if (Object.keys(errors).length) {
    return form(res, 422, {
      title: 'Edit event', isEdit: true, action: `/admin/events/${event.id}`, event, values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  }
  await eventModel.update(event.id, { ...values, starts_at: starts, ends_at: ends, is_published: values.is_published === '1' });
  await audit.fromReq(req, 'event_updated', { entity: 'events', entityId: event.id });
  flash(req, 'success', 'Event updated.');
  return res.redirect('/admin/events');
});

exports.togglePublish = wrap(async (req, res) => {
  const event = await eventModel.findById(toInt(req.params.id));
  if (!event) return notFound(res);
  await eventModel.setPublished(event.id, !event.is_published);
  await audit.fromReq(req, event.is_published ? 'event_hidden' : 'event_shown', { entity: 'events', entityId: event.id });
  flash(req, 'success', event.is_published ? 'Event hidden from the website.' : 'Event is now shown on the website.');
  return res.redirect('/admin/events');
});

exports.remove = wrap(async (req, res) => {
  const event = await eventModel.findById(toInt(req.params.id));
  if (!event) return notFound(res);
  await eventModel.remove(event.id);
  await audit.fromReq(req, 'event_deleted', { entity: 'events', entityId: event.id });
  flash(req, 'success', 'Event deleted.');
  return res.redirect('/admin/events');
});
