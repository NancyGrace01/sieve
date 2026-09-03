const { readSession } = require('../auth');
const { get } = require('../db');

async function requireAuth(req, res, next) {
  try {
    const session = readSession(req);
    if (!session) return res.status(401).json({ error: 'Not signed in.' });

    const account = await get('SELECT id, business_name, email, plan, created_at FROM users WHERE id = ?', [session.sub]);
    if (!account) return res.status(401).json({ error: 'Not signed in.' });

    req.user = account; // the account being acted on — unchanged shape for every existing route
    req.isOwner = !session.memberId;

    if (session.memberId) {
      const member = await get('SELECT id, email, active FROM team_members WHERE id = ? AND account_id = ?', [session.memberId, account.id]);
      if (!member || !member.active) return res.status(401).json({ error: 'Not signed in.' });
      req.member = member;
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
