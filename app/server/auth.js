const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — copy .env.example to .env and fill it in before starting the server.');
}

const COOKIE_NAME = 'sieve_session';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// `sub` is always the ACCOUNT id (the owning row in `users`), for both the
// owner's own login and any team member's login — every existing route that
// resolves req.user from session.sub keeps working unchanged either way.
// `memberId` is null for the owner, or the team_members.id for a teammate.
function signSession(accountId, memberId = null) {
  return jwt.sign({ sub: accountId, memberId }, JWT_SECRET, { expiresIn: '30d' });
}

function setSessionCookie(res, accountId, memberId = null) {
  const token = signSession(accountId, memberId);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function readSession(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { signSession, setSessionCookie, clearSessionCookie, readSession };
