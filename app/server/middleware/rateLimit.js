// Minimal in-memory sliding-window rate limiter — no dependency, fine for a
// single-server MVP. Swap for a Redis-backed limiter if this ever runs on
// more than one instance, since this state doesn't share across processes.

function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // key -> [timestamps]

  // Periodically drop stale entries so this doesn't grow forever.
  setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, times] of hits) {
      const kept = times.filter(t => t > cutoff);
      if (kept.length) hits.set(key, kept);
      else hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const cutoff = now - windowMs;
    const times = (hits.get(key) || []).filter(t => t > cutoff);
    times.push(now);
    hits.set(key, times);

    if (times.length > max) {
      return res.status(429).json({ error: message || 'Too many requests — try again shortly.' });
    }
    next();
  };
}

module.exports = rateLimit;
