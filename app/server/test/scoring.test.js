const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeScore } = require('../scoring');

function fakeScorecard() {
  return {
    categories: JSON.stringify([{ key: 'fit', label: 'Fit' }, { key: 'timing', label: 'Timing' }]),
    questions: JSON.stringify([
      { text: 'Q1', options: [{ label: 'A', score: { fit: 10, timing: 0 } }, { label: 'B', score: { fit: 0, timing: 0 } }] },
      { text: 'Q2', options: [{ label: 'A', score: { fit: 0, timing: 10 } }, { label: 'B', score: { fit: 0, timing: 0 } }] },
    ]),
    tiers: JSON.stringify([{ min: 75, label: 'Sales-ready' }, { min: 50, label: 'Getting there' }, { min: 0, label: 'Building the basics' }]),
  };
}

test('best answer to every question scores 100% in every category', () => {
  const result = computeScore(fakeScorecard(), [0, 0]);
  assert.equal(result.categoryScores.fit, 100);
  assert.equal(result.categoryScores.timing, 100);
  assert.equal(result.overall, 100);
  assert.equal(result.tier, 'Sales-ready');
});

test('worst answer to every question scores 0% in every category', () => {
  const result = computeScore(fakeScorecard(), [1, 1]);
  assert.equal(result.categoryScores.fit, 0);
  assert.equal(result.categoryScores.timing, 0);
  assert.equal(result.overall, 0);
  assert.equal(result.tier, 'Building the basics');
});

test('mixed answers land in the middle tier', () => {
  const result = computeScore(fakeScorecard(), [0, 1]);
  assert.equal(result.categoryScores.fit, 100);
  assert.equal(result.categoryScores.timing, 0);
  assert.equal(result.overall, 50);
  assert.equal(result.tier, 'Getting there');
});
