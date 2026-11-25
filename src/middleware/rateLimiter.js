// Tiny in-memory rate limiter (no extra dependency).
function createLimiter({ windowMs, max, message }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    let h = hits.get(key);
    if (!h || h.reset <= now) h = { count: 0, reset: now + windowMs };
    h.count += 1;
    hits.set(key, h);
    if (h.count > max)
      return res
        .status(429)
        .send(message || "Too many requests. Please try again later.");
    next();
  };
}

module.exports = {
  contactLimiter: createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many messages sent. Please try again later.",
  }),
  loginLimiter: createLimiter({ windowMs: 15 * 60 * 1000, max: 20 }),
};
