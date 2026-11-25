const academic = require('../../models/academic.model');
const audit = require('../../models/auditLog.model');
const v = require('../../validators/admin.validator');
const { view, notFound, flash, body } = require('../../utils/view');
const { wrap, toInt, isDup } = require('../../utils/helpers');

const form = (res, status, data) =>
  res.status(status).render('admin/year-form', Object.assign({ layout: 'layouts/dashboard', portal: { name: 'Administration' } }, data));

exports.index = wrap(async (req, res) => {
  view(res, 'admin/years', { title: 'Academic years', years: await academic.listYears() });
});

exports.newForm = wrap(async (req, res) => {
  form(res, 200, { title: 'Add academic year', values: { make_current: '' }, errors: {} });
});

exports.create = wrap(async (req, res) => {
  const { v: values, e: errors, terms } = v.year(body(req));
  if (!errors.name && (await academic.yearNameExists(values.name))) errors.name = 'This academic year already exists.';

  const fail = () =>
    form(res, 422, { title: 'Add academic year', values, errors, flash: { type: 'error', message: 'Please fix the highlighted fields.' } });
  if (Object.keys(errors).length) return fail();

  let id;
  try {
    id = await academic.createYear({
      name: values.name, start_date: values.start_date, end_date: values.end_date,
      make_current: values.make_current === '1', terms,
    });
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.name = 'This academic year already exists.';
    return fail();
  }
  await audit.fromReq(req, 'year_created', { entity: 'academic_years', entityId: id });
  flash(req, 'success', `Academic year ${values.name} created with 3 terms.`);
  return res.redirect('/admin/years');
});

exports.makeCurrent = wrap(async (req, res) => {
  const year = await academic.getYear(toInt(req.params.id));
  if (!year) return notFound(res);
  await academic.setCurrentYear(year.id);
  await audit.fromReq(req, 'year_set_current', { entity: 'academic_years', entityId: year.id });
  flash(req, 'success', `${year.name} is now the current academic year.`);
  return res.redirect('/admin/years');
});
