const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildReportPdf } = require('../pdf');

test('produces a real, non-trivial PDF buffer', async () => {
  const personalization = {
    greetingName: 'Ada',
    scorecardTitle: 'The Test Score',
    overall: 82,
    tierLabel: 'Sales-ready',
    tierHeadline: 'You are ready to buy',
    tierMessage: 'Great position overall.',
    recommendation: 'Book a call with us.',
    recommendationUrl: 'https://example.com/book',
    categoryNarratives: [
      { key: 'fit', label: 'Fit', score: 90, band: 'strong', message: 'Strong fit.' },
      { key: 'timing', label: 'Timing', score: 40, band: 'weak', message: 'Timing needs work.' },
    ],
    answerInsights: [
      { question: 'Ready now?', answer: 'Yes', insight: 'Great — that shortens your timeline a lot.' },
    ],
  };

  const buffer = await buildReportPdf(personalization, 'Test Realty');
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 1000, 'PDF should be a real, non-empty document');
  assert.equal(buffer.slice(0, 4).toString(), '%PDF'); // real PDF file signature
});
