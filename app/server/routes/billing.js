const express = require('express');
const crypto = require('node:crypto');
const { run, get } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { verifyTransaction, chargeAuthorization } = require('../paystack');
const { sendEmail, appUrl } = require('../mailer');

const router = express.Router();

// Public config the browser needs to open the Paystack popup — the secret key
// never leaves the server.
router.get('/config', (req, res) => {
  res.json({ paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || null });
});

const PLAN_PRICES_KOBO = {
  starter: 2500000,  // ₦25,000
  business: 6500000, // ₦65,000
  pro: 9500000,      // ₦95,000
};

router.get('/plan-prices', (req, res) => {
  res.json({ plans: Object.entries(PLAN_PRICES_KOBO).map(([key, amountKobo]) => ({ key, amountKobo })) });
});

// Called after Paystack's popup reports success client-side. We re-verify the
// transaction server-side with the secret key before trusting it — never trust
// a "success" callback from the browser alone. (Subscriptions — kept as a
// secondary billing mode alongside credits and pay-per-lead below.)
router.post('/verify', requireAuth, async (req, res) => {
  const { reference, plan } = req.body || {};
  if (!reference || !PLAN_PRICES_KOBO[plan]) {
    return res.status(400).json({ error: 'Missing payment reference or unknown plan.' });
  }
  try {
    const data = await verifyTransaction(reference, { expectedAmountKobo: PLAN_PRICES_KOBO[plan] });
    if (!data.status || data.data.status !== 'success') {
      return res.status(402).json({ error: 'Payment was not successful.' });
    }
    if (data.data.amount !== PLAN_PRICES_KOBO[plan]) {
      return res.status(402).json({ error: 'Amount paid does not match the selected plan.' });
    }
    await run('UPDATE users SET plan = ? WHERE id = ?', [plan, req.user.id]);
    res.json({ ok: true, plan });
  } catch (err) {
    res.status(502).json({ error: 'Could not reach Paystack to verify this payment. Try again.' });
  }
});

// --- Credit bundles (prepaid response credits — Nigerian SMEs who don't want
// a recurring subscription top up in one go, spend it down as leads come in) ---

const CREDIT_BUNDLES = {
  starter100: { credits: 100, amountKobo: 1200000, label: '100 credits — ₦12,000' },
  growth500: { credits: 500, amountKobo: 5000000, label: '500 credits — ₦50,000', badge: 'Most popular' },
  scale2000: { credits: 2000, amountKobo: 16000000, label: '2,000 credits — ₦160,000', badge: 'Best value' },
};

router.get('/credit-bundles', (req, res) => {
  res.json({ bundles: Object.entries(CREDIT_BUNDLES).map(([key, b]) => ({ key, ...b })) });
});

router.post('/credits/verify', requireAuth, async (req, res) => {
  const { reference, bundleKey } = req.body || {};
  const bundle = CREDIT_BUNDLES[bundleKey];
  if (!reference || !bundle) {
    return res.status(400).json({ error: 'Missing payment reference or unknown bundle.' });
  }
  try {
    const data = await verifyTransaction(reference, { expectedAmountKobo: bundle.amountKobo });
    if (!data.status || data.data.status !== 'success') {
      return res.status(402).json({ error: 'Payment was not successful.' });
    }
    if (data.data.amount !== bundle.amountKobo) {
      return res.status(402).json({ error: 'Amount paid does not match the selected bundle.' });
    }
    await run('UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?', [bundle.credits, req.user.id]);
    await run(
      'INSERT INTO credit_purchases (id, user_id, amount_kobo, credits_added, paystack_reference) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), req.user.id, bundle.amountKobo, bundle.credits, reference]
    );
    const updated = await get('SELECT credit_balance FROM users WHERE id = ?', [req.user.id]);
    res.json({ ok: true, creditsAdded: bundle.credits, creditBalance: updated.credit_balance });
  } catch (err) {
    res.status(502).json({ error: 'Could not reach Paystack to verify this payment. Try again.' });
  }
});

// --- Pay-per-qualified-lead (CPL) — no upfront spend at all; a card is saved
// once via a ₦100 verification charge, then each qualified lead is billed
// individually in real time as it comes in. ---

const CPL_DEFAULT_RATE_KOBO = 15000; // ₦150 per qualified lead
const CARD_VERIFY_AMOUNT_KOBO = 10000; // ₦100 — refundable-in-spirit, just proves the card works

router.get('/cpl-rate', (req, res) => {
  res.json({ rateKobo: CPL_DEFAULT_RATE_KOBO });
});

router.post('/cpl/save-card', requireAuth, async (req, res) => {
  const { reference } = req.body || {};
  if (!reference) return res.status(400).json({ error: 'Missing payment reference.' });
  try {
    const data = await verifyTransaction(reference, { expectedAmountKobo: CARD_VERIFY_AMOUNT_KOBO });
    if (!data.status || data.data.status !== 'success') {
      return res.status(402).json({ error: 'Card verification was not successful.' });
    }
    const authCode = data.data.authorization && data.data.authorization.authorization_code;
    if (!authCode) {
      return res.status(502).json({ error: 'Paystack did not return a reusable card authorization. Try a different card.' });
    }
    await run(
      'UPDATE users SET paystack_authorization_code = ?, cpl_rate_kobo = ? WHERE id = ?',
      [authCode, CPL_DEFAULT_RATE_KOBO, req.user.id]
    );
    res.json({ ok: true, rateKobo: CPL_DEFAULT_RATE_KOBO });
  } catch (err) {
    res.status(502).json({ error: 'Could not reach Paystack to verify this card. Try again.' });
  }
});

// Switches which billing mode new charges/deductions use. Subscription is the
// default/secondary fallback; credits and cpl both require their own setup
// step to have already happened (a positive balance, or a saved card).
router.post('/mode', requireAuth, async (req, res) => {
  const { mode } = req.body || {};
  if (!['subscription', 'credits', 'cpl'].includes(mode)) {
    return res.status(400).json({ error: 'Unknown billing mode.' });
  }
  const user = await get('SELECT credit_balance, paystack_authorization_code FROM users WHERE id = ?', [req.user.id]);
  if (mode === 'cpl' && !user.paystack_authorization_code) {
    return res.status(400).json({ error: 'Save a card for pay-per-lead billing before switching to it.' });
  }
  await run('UPDATE users SET billing_mode = ? WHERE id = ?', [mode, req.user.id]);
  res.json({ ok: true, billingMode: mode });
});

router.get('/wallet', requireAuth, async (req, res) => {
  const user = await get(
    'SELECT plan, billing_mode, credit_balance, cpl_rate_kobo, paystack_authorization_code FROM users WHERE id = ?',
    [req.user.id]
  );
  res.json({
    plan: user.plan,
    billingMode: user.billing_mode,
    creditBalance: user.credit_balance,
    cplRateKobo: user.cpl_rate_kobo || CPL_DEFAULT_RATE_KOBO,
    hasCardOnFile: !!user.paystack_authorization_code,
  });
});

module.exports = router;
module.exports.CREDIT_BUNDLES = CREDIT_BUNDLES;
module.exports.CPL_DEFAULT_RATE_KOBO = CPL_DEFAULT_RATE_KOBO;
module.exports.CARD_VERIFY_AMOUNT_KOBO = CARD_VERIFY_AMOUNT_KOBO;

// Shared helper used by public.js right after a CPL-mode submission — fires
// a real-time charge against the owner's saved card for one qualified lead,
// logs the attempt either way, and emails the owner if it fails so they
// notice a dead card quickly instead of silently losing billing coverage.
async function chargeCplLead({ owner, leadId }) {
  const id = crypto.randomUUID();
  try {
    const data = await chargeAuthorization({
      authorizationCode: owner.paystack_authorization_code,
      email: owner.email,
      amountKobo: owner.cpl_rate_kobo || CPL_DEFAULT_RATE_KOBO,
    });
    const success = data.status && data.data && data.data.status === 'success';
    await run(
      'INSERT INTO cpl_charges (id, user_id, lead_id, amount_kobo, status, paystack_reference) VALUES (?, ?, ?, ?, ?, ?)',
      [id, owner.id, leadId, owner.cpl_rate_kobo || CPL_DEFAULT_RATE_KOBO, success ? 'success' : 'failed', (data.data && data.data.reference) || null]
    );
    if (!success) {
      sendEmail({
        to: owner.email,
        subject: 'Sieve — a pay-per-lead charge failed',
        html: `<p>A new qualified lead came in, but charging your card on file for it didn't go through. Update your card at <a href="${appUrl()}/billing.html">${appUrl()}/billing.html</a> so future leads keep billing correctly — this lead is still in your dashboard either way.</p>`,
      }).catch(err => console.error('[billing] CPL failure notice email failed:', err));
    }
    return success;
  } catch (err) {
    await run(
      'INSERT INTO cpl_charges (id, user_id, lead_id, amount_kobo, status) VALUES (?, ?, ?, ?, ?)',
      [id, owner.id, leadId, owner.cpl_rate_kobo || CPL_DEFAULT_RATE_KOBO, 'error']
    );
    console.error('[billing] CPL charge threw:', err);
    return false;
  }
}
module.exports.chargeCplLead = chargeCplLead;
