const newsModel = require('../../models/news.model');
const audit = require('../../models/auditLog.model');
const v = require('../../validators/admin.validator');
const { saveImage, removeImage } = require('../../middleware/upload');
const { paginate } = require('../../utils/pagination');
const { view, notFound, flash, body } = require('../../utils/view');
const { wrap, toInt, str, qs, slugify } = require('../../utils/helpers');

const categoryOptions = v.NEWS_CATEGORIES.map((c) => ({ value: c, label: c }));
const statusOptions = [{ value: 'draft', label: 'Draft (not visible on the website)' }, { value: 'published', label: 'Published (visible now)' }];

const form = (res, status, data) =>
  res.status(status).render('admin/news-form', Object.assign({ layout: 'layouts/dashboard', portal: { name: 'Administration' }, categoryOptions, statusOptions }, data));

exports.index = wrap(async (req, res) => {
  const filters = { q: str(req.query.q, 80), status: str(req.query.status, 12) };
  const total = await newsModel.adminCount(filters);
  const pager = paginate(total, toInt(req.query.page) || 1, 15);
  const rows = await newsModel.adminList(filters, pager.perPage, pager.offset);
  view(res, 'admin/news', { title: 'News', rows, filters, pager, qs: qs(filters) });
});

exports.newForm = wrap(async (req, res) => {
  form(res, 200, { title: 'Write news article', isEdit: false, action: '/admin/news', values: { category: 'General', status: 'draft' }, errors: {} });
});

exports.create = wrap(async (req, res) => {
  const { v: values, e: errors } = v.news(body(req));
  if (req.uploadError) errors.cover = req.uploadError;

  const fail = () =>
    form(res, 422, {
      title: 'Write news article', isEdit: false, action: '/admin/news', values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  let cover = null;
  if (req.file) {
    try {
      cover = await saveImage(req.file, 'news');
    } catch (err) {
      errors.cover = err.message;
      return fail();
    }
  }
  const slug = await newsModel.uniqueSlug(slugify(values.title));
  const id = await newsModel.create({
    ...values,
    slug,
    cover_image: cover,
    author_id: req.session.user.id,
    published_at: values.status === 'published' ? new Date() : null,
  });
  await audit.fromReq(req, 'news_created', { entity: 'news', entityId: id, details: values.status });
  flash(req, 'success', values.status === 'published' ? 'Article published on the website.' : 'Article saved as a draft.');
  return res.redirect('/admin/news');
});

exports.editForm = wrap(async (req, res) => {
  const article = await newsModel.findById(toInt(req.params.id));
  if (!article) return notFound(res);
  return form(res, 200, { title: 'Edit article', isEdit: true, action: `/admin/news/${article.id}`, article, values: article, errors: {} });
});

exports.update = wrap(async (req, res) => {
  const article = await newsModel.findById(toInt(req.params.id));
  if (!article) return notFound(res);
  const { v: values, e: errors } = v.news(body(req));
  if (req.uploadError) errors.cover = req.uploadError;

  const fail = () =>
    form(res, 422, {
      title: 'Edit article', isEdit: true, action: `/admin/news/${article.id}`, article, values, errors,
      flash: { type: 'error', message: 'Please fix the highlighted fields.' },
    });
  if (Object.keys(errors).length) return fail();

  let cover = article.cover_image;
  let oldToRemove = null;
  if (req.file) {
    try {
      cover = await saveImage(req.file, 'news');
      oldToRemove = article.cover_image;
    } catch (err) {
      errors.cover = err.message;
      return fail();
    }
  } else if (values.remove_cover) {
    oldToRemove = article.cover_image;
    cover = null;
  }

  // The publish date is set the first time an article goes live and then kept.
  const publishedAt = values.status === 'published' ? article.published_at || new Date() : article.published_at;
  await newsModel.update(article.id, { ...values, cover_image: cover, published_at: publishedAt });
  if (oldToRemove) await removeImage(oldToRemove);
  await audit.fromReq(req, 'news_updated', { entity: 'news', entityId: article.id, details: values.status });
  flash(req, 'success', 'Article updated.');
  return res.redirect('/admin/news');
});

exports.togglePublish = wrap(async (req, res) => {
  const article = await newsModel.findById(toInt(req.params.id));
  if (!article) return notFound(res);
  const next = article.status === 'published' ? 'draft' : 'published';
  await newsModel.setStatus(article.id, next, next === 'published' ? new Date() : null);
  await audit.fromReq(req, `news_${next}`, { entity: 'news', entityId: article.id });
  flash(req, 'success', next === 'published' ? 'Article is now live on the website.' : 'Article moved back to drafts.');
  return res.redirect('/admin/news');
});

exports.remove = wrap(async (req, res) => {
  const article = await newsModel.findById(toInt(req.params.id));
  if (!article) return notFound(res);
  await newsModel.remove(article.id);
  if (article.cover_image) await removeImage(article.cover_image);
  await audit.fromReq(req, 'news_deleted', { entity: 'news', entityId: article.id });
  flash(req, 'success', 'Article deleted.');
  return res.redirect('/admin/news');
});
