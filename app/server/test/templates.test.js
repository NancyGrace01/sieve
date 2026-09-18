const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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

test('the public list only returns published templates, with the lightweight card fields', async () => {
  await run(
    'INSERT INTO templates (id, slug, title, filter_category, published) VALUES (?, ?, ?, ?, ?)',
    [crypto.randomUUID(), 'draft-only', 'Draft Only', 'legal', 0]
  );
  await run(
    'INSERT INTO templates (id, slug, title, description, filter_category, published) VALUES (?, ?, ?, ?, ?, ?)',
    [crypto.randomUUID(), 'published-card', 'Published Card', 'desc', 'legal', 1]
  );

  const anon = makeClient(server.baseUrl);
  const res = await anon.get('/api/templates');
  assert.equal(res.status, 200);
  const slugs = res.data.templates.map(t => t.slug);
  assert.ok(slugs.includes('published-card'));
  assert.ok(!slugs.includes('draft-only'));
  // Card payload is the lightweight shape only — no questions/tiers.
  const card = res.data.templates.find(t => t.slug === 'published-card');
  assert.equal(card.questions, undefined);
});

test('the public detail route returns the full content for "use this template", and 404s for a draft', async () => {
  await run(
    'INSERT INTO templates (id, slug, title, intro, categories, questions, tiers, cta_label, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      crypto.randomUUID(), 'full-detail-template', 'Full Detail Template', 'Intro text',
      JSON.stringify([{ key: 'fit', label: 'Fit' }]),
      JSON.stringify([{ text: 'Q1', options: [{ label: 'A', score: { fit: 10 } }] }]),
      JSON.stringify([{ min: 0, label: 'Result' }]),
      'Book now', 1,
    ]
  );
  const anon = makeClient(server.baseUrl);
  const res = await anon.get('/api/templates/full-detail-template');
  assert.equal(res.status, 200);
  assert.equal(res.data.template.ctaLabel, 'Book now');
  assert.equal(res.data.template.questions.length, 1);

  await run(
    'INSERT INTO templates (id, slug, title, published) VALUES (?, ?, ?, ?)',
    [crypto.randomUUID(), 'hidden-draft', 'Hidden Draft', 0]
  );
  const draftRes = await anon.get('/api/templates/hidden-draft');
  assert.equal(draftRes.status, 404);
});