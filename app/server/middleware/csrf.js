// Lightweight CSRF mitigation for a cookie-authenticated JSON API. sameSite:'lax'
// on the session cookie (see auth.js) already blocks the cookie from being sent
// on a cross-site POST, which covers most of the real risk. This adds a second,
// independent layer: reject any state-changing request whose Origin/Referer
// header doesn't match this server's own origin, so a request can't succeed
// even if a browser's cookie-sending behavior ever changes.

function csrfOriginCheck(req, res, next) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  const origin = req.headers.origin || req.headers.referer;
  if (!origin) return next(); // non-browser clients (curl, server-to-server) send neither — allowed

  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return res.status(403).json({ error: 'Invalid request origin.' });
  }

  if (originHost !== req.headers.host) {
    return res.status(403).json({ error: 'Cross-site request blocked.' });
  }
  next();
}

module.exports = csrfOriginCheck;
