const { school } = require('../utils/constants');
const { homeFor } = require('../config/roles');
const { fmtDate, fmtDateTime, toInputDateTime, classLabel } = require('../utils/helpers');

// Makes common values available in every EJS template.
module.exports = (req, res, next) => {
  res.locals.school = school;
  // Path without a trailing slash, used to highlight the active menu item
  res.locals.currentPath = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
  res.locals.year = new Date().getFullYear();

  // Signed-in user (or null) and where their portal lives
  const user = req.session && req.session.user ? req.session.user : null;
  res.locals.currentUser = user;
  res.locals.portalHome = user ? homeFor(user.role) : '/auth/login';

  // Formatting helpers for templates
  res.locals.fmtDate = fmtDate;
  res.locals.fmtDateTime = fmtDateTime;
  res.locals.toInputDateTime = toInputDateTime;
  res.locals.classLabel = classLabel;

  // One-time message ("flash") stored by the previous request
  res.locals.flash = null;
  if (req.session && req.session.flash) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  }
  next();
};
