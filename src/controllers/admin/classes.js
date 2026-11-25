const classModel = require('../../models/class.model');
const academic = require('../../models/academic.model');
const subjectModel = require('../../models/subject.model');
const teacherModel = require('../../models/teacher.model');
const audit = require('../../models/auditLog.model');
const v = require('../../validators/admin.validator');
const { view, notFound, flash, body } = require('../../utils/view');
const { wrap, toInt, isDup, isFk, classLabel } = require('../../utils/helpers');

async function formLists() {
  const [levelOptions, yearOptions, teacherOptions] = await Promise.all([
    subjectModel.levelOptions(),
    academic.yearOptions(),
    teacherModel.options(),
  ]);
  return { levelOptions, yearOptions, teacherOptions };
}

const form = async (res, status, data) =>
  res.status(status).render('admin/class-form', Object.assign({ layout: 'layouts/dashboard', portal: { name: 'Administration' } }, await formLists(), data));

exports.index = wrap(async (req, res) => {
  const years = await academic.yearOptions();
  const current = await academic.getCurrentYear();
  const requested = toInt(req.query.year_id);
  const yearId = requested || (current ? current.id : null);
  const rows = await classModel.list({ yearId });
  view(res, 'admin/classes', { title: 'Classes', rows, years, yearId, current });
});

exports.newForm = wrap(async (req, res) => {
  const current = await academic.getCurrentYear();
  await form(res, 200, {
    title: 'Add class', isEdit: false, action: '/admin/classes',
    values: { academic_year_id: current ? current.id : '' }, errors: {},
  });
});

async function validate(b, exceptId) {
  const { v: values, e: errors } = v.classForm(b);
  if (!Object.keys(errors).length && (await classModel.exists(toInt(values.academic_year_id), values.name, values.section, exceptId))) {
    errors.name = 'A class with this name and section already exists in that year.';
  }
  return { values, errors };
}

exports.create = wrap(async (req, res) => {
  const { values, errors } = await validate(body(req), 0);
  const fail = () =>
    form(res, 422, {
      title: 'Add class', isEdit: false, action: '/admin/classes', values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  let id;
  try {
    id = await classModel.create(values);
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.name = 'A class with this name and section already exists in that year.';
    return fail();
  }
  await audit.fromReq(req, 'class_created', { entity: 'classes', entityId: id });
  flash(req, 'success', `Class ${classLabel(values.name, values.section)} created. Now add its subjects.`);
  return res.redirect(`/admin/classes/${id}`);
});

exports.show = wrap(async (req, res) => {
  const cls = await classModel.find(toInt(req.params.id));
  if (!cls) return notFound(res);
  const [students, subjects, allSubjects, teacherOptions] = await Promise.all([
    classModel.students(cls.id),
    classModel.subjects(cls.id),
    subjectModel.options(),
    teacherModel.options(),
  ]);
  const used = new Set(subjects.map((s) => s.subject_id));
  view(res, 'admin/class-show', {
    title: classLabel(cls.name, cls.section), cls, students, subjects, teacherOptions,
    subjectOptions: allSubjects.filter((o) => !used.has(o.value)),
  });
});

exports.editForm = wrap(async (req, res) => {
  const cls = await classModel.find(toInt(req.params.id));
  if (!cls) return notFound(res);
  await form(res, 200, { title: 'Edit class', isEdit: true, action: `/admin/classes/${cls.id}`, cls, values: cls, errors: {} });
});

exports.update = wrap(async (req, res) => {
  const cls = await classModel.find(toInt(req.params.id));
  if (!cls) return notFound(res);
  const { values, errors } = await validate(body(req), cls.id);
  const fail = () =>
    form(res, 422, {
      title: 'Edit class', isEdit: true, action: `/admin/classes/${cls.id}`, cls, values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  try {
    await classModel.update(cls.id, values);
  } catch (err) {
    if (!isDup(err)) throw err;
    errors.name = 'A class with this name and section already exists in that year.';
    return fail();
  }
  await audit.fromReq(req, 'class_updated', { entity: 'classes', entityId: cls.id });
  flash(req, 'success', 'Class updated.');
  return res.redirect(`/admin/classes/${cls.id}`);
});

exports.remove = wrap(async (req, res) => {
  const cls = await classModel.find(toInt(req.params.id));
  if (!cls) return notFound(res);
  const use = await classModel.usage(cls.id);
  if (use.enrolled || use.assessments || use.attendance) {
    flash(req, 'error', 'This class has students, attendance or marks recorded, so it cannot be deleted. Move the students first.');
    return res.redirect(`/admin/classes/${cls.id}`);
  }
  try {
    await classModel.remove(cls.id);
  } catch (err) {
    if (!isFk(err)) throw err;
    flash(req, 'error', 'This class is still in use, so it cannot be deleted.');
    return res.redirect(`/admin/classes/${cls.id}`);
  }
  await audit.fromReq(req, 'class_deleted', { entity: 'classes', entityId: cls.id });
  flash(req, 'success', 'Class deleted.');
  return res.redirect('/admin/classes');
});

// ---- Subjects taught in a class ----
exports.addSubject = wrap(async (req, res) => {
  const cls = await classModel.find(toInt(req.params.id));
  if (!cls) return notFound(res);
  const b = body(req);
  const subjectId = toInt(b.subject_id);
  const teacherId = toInt(b.teacher_id);
  const back = `/admin/classes/${cls.id}`;
  if (!subjectId || !(await subjectModel.find(subjectId))) {
    flash(req, 'error', 'Choose a subject.');
    return res.redirect(back);
  }
  try {
    await classModel.addSubject(cls.id, subjectId, teacherId);
  } catch (err) {
    if (!isDup(err)) throw err;
    flash(req, 'error', 'That subject is already in this class.');
    return res.redirect(back);
  }
  await audit.fromReq(req, 'class_subject_added', { entity: 'classes', entityId: cls.id, details: `subject=${subjectId}` });
  flash(req, 'success', 'Subject added.');
  return res.redirect(back);
});

exports.setSubjectTeacher = wrap(async (req, res) => {
  const cls = await classModel.find(toInt(req.params.id));
  const csId = toInt(req.params.csId);
  if (!cls || !csId) return notFound(res);
  await classModel.setSubjectTeacher(csId, cls.id, toInt(body(req).teacher_id));
  await audit.fromReq(req, 'class_subject_teacher_set', { entity: 'classes', entityId: cls.id, details: `class_subject=${csId}` });
  flash(req, 'success', 'Teacher updated.');
  return res.redirect(`/admin/classes/${cls.id}`);
});

exports.removeSubject = wrap(async (req, res) => {
  const cls = await classModel.find(toInt(req.params.id));
  const csId = toInt(req.params.csId);
  if (!cls || !csId) return notFound(res);
  const use = await classModel.subjectUsage(csId);
  if (use && use.assessments) {
    flash(req, 'error', 'Marks have been recorded for this subject, so it cannot be removed from the class.');
    return res.redirect(`/admin/classes/${cls.id}`);
  }
  await classModel.removeSubject(csId, cls.id);
  await audit.fromReq(req, 'class_subject_removed', { entity: 'classes', entityId: cls.id, details: `class_subject=${csId}` });
  flash(req, 'success', 'Subject removed from the class.');
  return res.redirect(`/admin/classes/${cls.id}`);
});
