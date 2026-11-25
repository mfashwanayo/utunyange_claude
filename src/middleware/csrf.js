// CSRF protection (synchroniser token kept in the session).
// Every <form method="post"> must contain:
//     <input type="hidden" name="_csrf" value="<%= csrfToken() %>">
// AJAX calls can send the same value in the "X-CSRF-Token" header.
const crypto = require('crypto');

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
// /contact: public endpoint protected by a honeypot + rate limit instead.
// /auth/logout: signing out must still work after the session has expired (low risk).
const EXEMPT_PATHS = ['/contact', '/auth/logout'];

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

module.exports = (req, res, next) => {
  // A function (not a value), so a session is only created when a page actually needs a token.
  res.locals.csrfToken = () => {
    if (!req.session.csrfSecret) req.session.csrfSecret = crypto.randomBytes(32).toString('hex');
    return req.session.csrfSecret;
  };

  if (SAFE_METHODS.includes(req.method) || EXEMPT_PATHS.includes(req.path)) return next();

  // Forms send "_csrf" in the body. Multipart (file upload) forms put it in the URL
  // (?_csrf=...) because the body is not readable before the upload is processed.
  const sent = (req.body && req.body._csrf) || (req.query && req.query._csrf) || req.get('x-csrf-token');
  const expected = req.session && req.session.csrfSecret;

  if (!expected || !sent || !safeEqual(expected, sent)) {
    const message = 'Your session expired or the form was invalid. Please go back, refresh the page and try again.';
    if (req.is('json')) return res.status(403).json({ success: false, message });
    return res.status(403).render('errors/403', { title: 'Request blocked', message });
  }
  next();
};
