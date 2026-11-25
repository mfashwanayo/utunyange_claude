const subjectModel = require('../../models/subject.model');
const audit = require('../../models/auditLog.model');
const v = require('../../validators/admin.validator');
const { view, notFound, flash, body } = require('../../utils/view');
const { wrap, toInt, isDup, isFk } = require('../../utils/helpers');

const form = async (res, status, data) =>
  res.status(status).render(
    'admin/subject-form',
    Object.assign({ layout: 'layouts/dashboard', portal: { name: 'Administration' }, levelOptions: await subjectModel.levelOptions() }, data)
  );

exports.index = wrap(async (req, res) => {
  view(res, 'admin/subjects', { title: 'Subjects', rows: await subjectModel.list() });
});

exports.newForm = wrap(async (req, res) => {
  await form(res, 200, { title: 'Add subject', isEdit: false, action: '/admin/subjects', values: {}, errors: {} });
});

exports.create = wrap(async (req, res) => {
  const { v: values, e: errors } = v.subject(body(req));
  if (!errors.code && (await subjectModel.codeExists(values.code))) errors.code = 'This code is already used by another subject.';
  const fail = () =>
    form(res, 422, {
      title: 'Add subject', isEdit: false, action: '/admin/subjects', values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  let id;
  try {
    id = await subjectModel.create(values);
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.code = 'This code is already used by another subject.';
    return fail();
  }
  await audit.fromReq(req, 'subject_created', { entity: 'subjects', entityId: id });
  flash(req, 'success', `Subject ${values.name} added.`);
  return res.redirect('/admin/subjects');
});

exports.editForm = wrap(async (req, res) => {
  const subject = await subjectModel.find(toInt(req.params.id));
  if (!subject) return notFound(res);
  await form(res, 200, { title: 'Edit subject', isEdit: true, action: `/admin/subjects/${subject.id}`, subject, values: subject, errors: {} });
});

exports.update = wrap(async (req, res) => {
  const subject = await subjectModel.find(toInt(req.params.id));
  if (!subject) return notFound(res);
  const { v: values, e: errors } = v.subject(body(req));
  if (!errors.code && (await subjectModel.codeExists(values.code, subject.id))) errors.code = 'This code is already used by another subject.';
  const fail = () =>
    form(res, 422, {
      title: 'Edit subject', isEdit: true, action: `/admin/subjects/${subject.id}`, subject, values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  try {
    await subjectModel.update(subject.id, values);
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.code = 'This code is already used by another subject.';
    return fail();
  }
  await audit.fromReq(req, 'subject_updated', { entity: 'subjects', entityId: subject.id });
  flash(req, 'success', 'Subject updated.');
  return res.redirect('/admin/subjects');
});

exports.remove = wrap(async (req, res) => {
  const subject = await subjectModel.find(toInt(req.params.id));
  if (!subject) return notFound(res);
  const rows = await subjectModel.list();
  const row = rows.find((r) => r.id === subject.id);
  if (row && row.class_count > 0) {
    flash(req, 'error', `${subject.name} is taught in ${row.class_count} class(es). Remove it from those classes first.`);
    return res.redirect('/admin/subjects');
  }
  try {
    await subjectModel.remove(subject.id);
  } catch (err) {
    if (!isFk(err)) throw err;
    flash(req, 'error', 'This subject is still in use, so it cannot be deleted.');
    return res.redirect('/admin/subjects');
  }
  await audit.fromReq(req, 'subject_deleted', { entity: 'subjects', entityId: subject.id });
  flash(req, 'success', 'Subject deleted.');
  return res.redirect('/admin/subjects');
});
