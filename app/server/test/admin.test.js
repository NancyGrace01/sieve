// Covers the one piece of the admin system you're keeping: an is_admin
// account is never gated by the free-plan/billing checks when creating
// scorecards. (The matching bypass in public.js's billingGate follows the
// same is_admin check and isn't separately tested here.)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, cleanupDb, makeClient } = require('./helpers');
const { run } = require('../db');

let server;

before(async () => {
  server = await startServer();
});

after(async () => {
  await server.close();
  await cleanupDb();
});

test('an admin account is never gated from creating scorecards, even with no payment history', async () => {
  const client = makeClient(server.baseUrl);
  const signup = await client.post('/api/auth/signup', { businessName: 'VASNET Testing', email: 'admin-create@test.com', password: 'password123' });
  await run('UPDATE users SET is_admin = true WHERE id = ?', [signup.data.user.id]);

  // The free-trial cap is 1 scorecard for a non-admin, never-paid account —
  // a second one succeeding here is what actually proves the admin bypass,
  // not just that account creation works.
  const first = await client.post('/api/scorecards', { title: 'One' });
  assert.equal(first.status, 201);
  const second = await client.post('/api/scorecards', { title: 'Two' });
  assert.equal(second.status, 201);
});