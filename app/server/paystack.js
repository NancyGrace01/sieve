// Thin wrapper around Paystack's REST API using the built-in fetch — no SDK
// dependency. If PAYSTACK_SECRET_KEY isn't set, calls are simulated (logged,
// and echoing back whatever the caller claims) so the rest of the app —
// subscriptions, credit bundles, pay-per-lead — keeps working end-to-end in
// local dev and in the test suite without a real Paystack account. In
// production, a real secret key means every result here is a genuine,
// verified response from Paystack's own servers — the simulation path never
// runs once a real key is set.

async function verifyTransaction(reference, { expectedAmountKobo } = {}) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.log(`[paystack] PAYSTACK_SECRET_KEY not set — simulating a successful verify for reference "${reference}".`);
    return {
      status: true,
      simulated: true,
      data: {
        status: 'success',
        reference,
        amount: expectedAmountKobo ?? null,
        authorization: { authorization_code: `AUTH_sim_${reference}` },
      },
    };
  }
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  return res.json();
}

async function chargeAuthorization({ authorizationCode, email, amountKobo }) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    const ref = `sim_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    console.log(`[paystack] PAYSTACK_SECRET_KEY not set — simulating a successful charge of ${amountKobo} kobo against ${authorizationCode}.`);
    return { status: true, simulated: true, data: { status: 'success', reference: ref, amount: amountKobo } };
  }
  const res = await fetch('https://api.paystack.co/transaction/charge_authorization', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorization_code: authorizationCode, email, amount: amountKobo }),
  });
  return res.json();
}

module.exports = { verifyTransaction, chargeAuthorization };
