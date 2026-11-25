const data = require('../utils/constants');
const newsModel = require('../models/news.model');
const eventModel = require('../models/event.model');
const contactModel = require('../models/contact.model');
const { paginate } = require('../utils/pagination');
const { toInt } = require('../utils/helpers');

const ICONS = { Achievement: 'award', Admissions: 'calendar', Campus: 'monitor', Sports: 'trophy', Academics: 'book', Events: 'calendar', Announcement: 'bell', General: 'star' };

const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: true });
const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: '2-digit' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short' });

const snippet = (n) => {
  if (n.excerpt) return n.excerpt;
  const t = String(n.body || '').replace(/\s+/g, ' ').trim();
  return t.length > 140 ? t.slice(0, 137) + '...' : t;
};

const mapNews = (n) => ({
  category: n.category,
  date: dateFmt.format(new Date(n.published_at)),
  title: n.title,
  text: snippet(n),
  icon: ICONS[n.category] || 'star',
  image: n.cover_image || '',
  href: `/news/${n.slug}`,
});

const mapEvent = (e) => {
  const s = new Date(e.starts_at);
  return { day: dayFmt.format(s), month: monthFmt.format(s), title: e.title, time: timeFmt.format(s).toUpperCase(), place: e.location || 'School campus' };
};

// GET /  - news and events come from the database; the sample content in constants.js is the fallback.
exports.home = async (req, res) => {
  let news = data.news.map((n) => Object.assign({ href: '#news', image: '' }, n));
  let events = data.events;
  let newsFromDb = false;

  try {
    const rows = await newsModel.publicLatest(3);
    if (rows.length) { news = rows.map(mapNews); newsFromDb = true; }
  } catch (err) {
    console.error('Homepage news failed:', err.message);
  }
  try {
    const rows = await eventModel.publicUpcoming(4);
    // Once the school uses the system, show its real calendar even when empty of events.
    if (rows.length || newsFromDb) events = rows.map(mapEvent);
  } catch (err) {
    console.error('Homepage events failed:', err.message);
  }

  res.render('public/home', {
    title: `${data.school.fullName} | ${data.school.tagline}`,
    stats: data.stats,
    programs: data.programs,
    features: data.features,
    portals: data.portals,
    news,
    newsFromDb,
    events,
    gallery: data.gallery,
    testimonials: data.testimonials,
    steps: data.admissionSteps,
  });
};

// GET /news
exports.newsList = async (req, res, next) => {
  try {
    const total = await newsModel.publicCount();
    const pager = paginate(total, toInt(req.query.page) || 1, 9);
    const rows = await newsModel.publicPage(pager.perPage, pager.offset);
    res.render('public/news', {
      title: 'News',
      items: rows.map((n) => Object.assign(mapNews(n), { icon: ICONS[n.category] || 'star' })),
      pager,
    });
  } catch (err) {
    next(err);
  }
};

// GET /news/:slug
exports.newsShow = async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').slice(0, 200);
    const article = await newsModel.findPublishedBySlug(slug);
    if (!article) return res.status(404).render('errors/404', { title: 'Page not found' });
    return res.render('public/news-single', {
      title: article.title,
      article: Object.assign({}, article, { date: dateFmt.format(new Date(article.published_at)) }),
      description: snippet(article),
    });
  } catch (err) {
    return next(err);
  }
};

// POST /contact  (JSON) - saved to the database, shown in Admin > Inbox
exports.contact = async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ success: true, message: 'Thank you!' }); // honeypot

  const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const name = clean(b.name, 120);
  const email = clean(b.email, 190);
  const message = clean(b.message, 5000);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (name.length < 2 || !emailOk || message.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Please enter your name, a valid email and a message of at least 10 characters.',
    });
  }

  try {
    await contactModel.create({ name, email, phone: clean(b.phone, 30), subject: clean(b.subject, 190), message, ip: req.ip });
  } catch (err) {
    console.error('Contact message not saved:', err.message);
    return res.status(500).json({ success: false, message: 'Sorry, we could not send your message. Please call the school office.' });
  }
  return res.json({ success: true, message: 'Thank you! Your message has been received. We will reply within 1-2 working days.' });
};
