// Turns a scorecard definition + a lead's chosen answers into category
// percentages, an overall score, and a tier label. Runs server-side only,
// so a lead can never tamper with their own score from the browser.

function computeScore(scorecard, answerIndexes) {
  const categories = JSON.parse(scorecard.categories); // [{key,label}]
  const questions = JSON.parse(scorecard.questions);   // [{text, options:[{label, score:{key:val}}]}]
  const tiers = JSON.parse(scorecard.tiers);            // [{min,label}] sorted desc by min

  const totals = {};
  const maxTotals = {};
  categories.forEach(c => { totals[c.key] = 0; maxTotals[c.key] = 0; });

  questions.forEach((q, i) => {
    const chosenIdx = answerIndexes[i];
    const chosenOption = q.options[chosenIdx];
    const maxForQuestion = {};
    categories.forEach(c => { maxForQuestion[c.key] = 0; });

    q.options.forEach(opt => {
      Object.entries(opt.score || {}).forEach(([key, val]) => {
        if (val > (maxForQuestion[key] || 0)) maxForQuestion[key] = val;
      });
    });
    categories.forEach(c => { maxTotals[c.key] += maxForQuestion[c.key] || 0; });

    if (chosenOption) {
      Object.entries(chosenOption.score || {}).forEach(([key, val]) => {
        totals[key] = (totals[key] || 0) + val;
      });
    }
  });

  const categoryScores = {};
  categories.forEach(c => {
    categoryScores[c.key] = maxTotals[c.key] > 0
      ? Math.round((totals[c.key] / maxTotals[c.key]) * 100)
      : 0;
  });

  const vals = Object.values(categoryScores);
  const overall = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;

  const sortedTiers = [...tiers].sort((a, b) => b.min - a.min);
  const tier = (sortedTiers.find(t => overall >= t.min) || sortedTiers[sortedTiers.length - 1] || { label: 'Result' }).label;

  return { categoryScores, overall, tier };
}

module.exports = { computeScore };
