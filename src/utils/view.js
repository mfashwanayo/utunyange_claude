// Rendering helpers shared by the admin controllers.

// Render inside the dashboard layout (sidebar + top bar).
const view = (res, template, data = {}) =>
  res.render(template, Object.assign({ layout: 'layouts/dashboard', portal: { name: 'Administration' } }, data));

const notFound = (res) =>
  res.status(404).render('errors/404', {
    layout: 'layouts/dashboard',
    portal: { name: 'Administration' },
    title: 'Not found',
  });

// One-time message shown on the next page.
const flash = (req, type, message) => {
  req.session.flash = { type, message };
};

// Request body that is always an object (Express 5 leaves it undefined when empty).
const body = (req) => req.body || {};

module.exports = { view, notFound, flash, body };
