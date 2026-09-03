// Turns a raw score into a result that speaks to the specific person who
// answered — matching ScoreApp's own model: every scorecard comes complete
// with real, working copy the moment it's created, and every piece of that
// copy stays fully owner-editable afterward. A scorecard owner never has to
// write a word to get a working result page — but if they want to override
// the tier headline, a category's message, an answer's insight, or the
// outcome recommendation, whatever they write takes precedence. Nothing an
// owner leaves blank ever shows up blank on a respondent's result — this
// file writes it instead.
//
// Variety in the generated fallback comes from a deterministic hash of the
// lead's own id mixed with a field-specific salt, so two different leads —
// even ones who land on the exact same score — very rarely read the same
// generated sentence, while the same lead's own snapshot stays stable if
// it's ever re-read (e.g. regenerating their PDF from the stored
// personalization record). None of that applies to owner-written text, of
// course — that's exactly what the owner typed, verbatim, every time.

function hashSeed(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick(seed, arr) {
  return arr[hashSeed(seed) % arr.length];
}

const BANDS = [
  { key: 'exceptional', min: 90 },
  { key: 'strong', min: 75 },
  { key: 'solid', min: 60 },
  { key: 'developing', min: 40 },
  { key: 'weak', min: 20 },
  { key: 'struggling', min: 0 },
];

function bandFor(score) {
  return (BANDS.find(b => score >= b.min) || BANDS[BANDS.length - 1]).key;
}

// --- Category commentary -----------------------------------------------

const CATEGORY_BASE = {
  exceptional: [
    l => `${l} is firing on all cylinders — genuinely one of the strongest areas here.`,
    l => `There's very little to fault in ${l.toLowerCase()} — this is close to as good as it gets.`,
    l => `${l} stands out as a real strength, well above where most people land.`,
    l => `Whatever's driving ${l.toLowerCase()} right now, it's clearly working — keep doing it.`,
    l => `${l} is in excellent shape — this is the part of the picture that needs the least attention.`,
  ],
  strong: [
    l => `${l} is in good shape — solidly ahead of where most people sit.`,
    l => `You're doing well on ${l.toLowerCase()}, with just a little more headroom above you.`,
    l => `${l} is a genuine strength — a small push here would put it in the top tier.`,
    l => `There's real strength in ${l.toLowerCase()} already — nothing urgent needed here.`,
    l => `${l} is comfortably ahead of the curve.`,
  ],
  solid: [
    l => `${l} is respectable — not a weak point, but not yet a standout either.`,
    l => `You're right around the middle on ${l.toLowerCase()} — steady, with clear room to push further.`,
    l => `${l} sits in reasonably good territory, with a realistic path to genuinely strong.`,
    l => `Nothing alarming about ${l.toLowerCase()} — it's holding its own, and could still improve.`,
    l => `${l} is on solid footing, without yet being a real strength.`,
  ],
  developing: [
    l => `${l} is still finding its footing — there's real, achievable room to grow here.`,
    l => `${l} is a fair way off where it could be — worth some deliberate attention.`,
    l => `You're behind where you'd want to be on ${l.toLowerCase()}, but it's a fixable gap, not a fundamental one.`,
    l => `${l} is currently a soft spot — closing this gap would move the whole picture meaningfully.`,
    l => `There's a noticeable shortfall in ${l.toLowerCase()} right now — the good news is that's usually the easiest kind to close.`,
  ],
  weak: [
    l => `${l} is genuinely lagging — this is worth real, focused attention.`,
    l => `${l} is one of the clearer weak points in the picture right now.`,
    l => `There's a real gap in ${l.toLowerCase()} — closing even part of it would change the overall result noticeably.`,
    l => `${l} is well below where it needs to be — not a small tweak, a real focus area.`,
    l => `${l} stands out as an area that needs deliberate work, not just a passing glance.`,
  ],
  struggling: [
    l => `${l} is the clearest problem area in this result — and the one most worth addressing first.`,
    l => `${l} is significantly behind — this is where the biggest single improvement is available.`,
    l => `There's a real shortfall in ${l.toLowerCase()} that's dragging on the overall picture.`,
    l => `${l} needs the most attention of everything measured here.`,
    l => `${l} is currently the weakest link — and the one place effort would pay off the most.`,
  ],
};

// Every prefix ends as a connector (a colon or a dash) rather than a full
// stop, so joining it with a lowercased continuation always reads as one
// grammatical sentence, never "...it's this. conversion is...".
const WEAKEST_PREFIX = [
  'The place to focus first: ',
  "The clearest opportunity in the whole result: ",
  'Start here: ',
  'Out of everything measured, this is what matters most right now: ',
  'Priority one: ',
];

const STRONGEST_PREFIX = [
  'Your standout: ',
  "What's carrying the result: ",
  'Lean into this — ',
  'The clearest strength in the whole picture: ',
  'Worth noting first: ',
];

function categoryMessage(label, score, role, seed) {
  const band = bandFor(score);
  const base = pick(`${seed}:base`, CATEGORY_BASE[band])(label);
  if (role === 'weakest') return pick(`${seed}:prefix`, WEAKEST_PREFIX) + base.charAt(0).toLowerCase() + base.slice(1);
  if (role === 'strongest') return pick(`${seed}:prefix`, STRONGEST_PREFIX) + base.charAt(0).toLowerCase() + base.slice(1);
  return base;
}

// --- Tier headline & message, driven by the overall score --------------

const TIER_HEADLINE = {
  exceptional: ['You’re exactly where you want to be', 'This is about as strong a result as they come', 'A genuinely excellent result'],
  strong: ['You’re in a strong position', 'This is a result to feel good about', 'You’re well ahead of the curve'],
  solid: ['You’re in solid, workable shape', 'A steady result, with real upside', 'You’re on the right track'],
  developing: ['You’re making progress, with real room to grow', 'There’s a clear path forward from here', 'You’re partway there, with work still to do'],
  weak: ['There’s real work to do here', 'This result points to some real gaps', 'You’re starting from behind, but it’s fixable'],
  struggling: ['This is the starting point, not the destination', 'There’s significant ground to make up', 'A tough result — and a clear place to begin'],
};

const TIER_MESSAGE = {
  exceptional: [
    (s, w) => `An overall score like this doesn't happen by accident. ${s} in particular is doing a lot of the work — the priority now is keeping it that way.`,
    (s, w) => `This is a genuinely strong showing across the board, led by ${s.toLowerCase()}. If there's anywhere left to sharpen, it's ${w.toLowerCase()}.`,
  ],
  strong: [
    (s, w) => `A solid, above-average result, carried mainly by ${s.toLowerCase()}. ${w} is the one area still holding the overall picture back a little.`,
    (s, w) => `You're ahead of where most people land here, with ${s.toLowerCase()} doing most of the heavy lifting. Tightening up ${w.toLowerCase()} is the clearest next move.`,
  ],
  solid: [
    (s, w) => `A workable, middle-of-the-road result. ${s} is the bright spot; ${w.toLowerCase()} is the one dragging the average down the most.`,
    (s, w) => `Nothing here is alarming, but nothing is fully dialled in either. ${s} is furthest along — ${w.toLowerCase()} is where the next real gain sits.`,
  ],
  developing: [
    (s, w) => `There's a real gap between ${s.toLowerCase()}, which is genuinely working, and ${w.toLowerCase()}, which is holding the rest of the picture back.`,
    (s, w) => `This result is uneven rather than uniformly weak — ${s} is in decent shape, while ${w.toLowerCase()} is the clearest thing to fix first.`,
  ],
  weak: [
    (s, w) => `${w} is the main thing pulling this result down — it's a bigger gap than the rest of the picture. ${s} is the one relative bright spot to build from.`,
    (s, w) => `There's real work ahead, concentrated mostly in ${w.toLowerCase()}. ${s} shows it's not uniformly weak — there's something to build on.`,
  ],
  struggling: [
    (s, w) => `${w} is the clearest, most urgent gap here — closing even part of it would move the whole result. ${s} is the one part of the picture already pointing in the right direction.`,
    (s, w) => `This is a result that calls for a real reset, starting with ${w.toLowerCase()}. ${s} is worth holding onto as everything else gets rebuilt.`,
  ],
};

function tierHeadline(overall, seed) {
  const band = bandFor(overall);
  return pick(`${seed}:headline`, TIER_HEADLINE[band]);
}

const TIER_MESSAGE_SINGLE = {
  exceptional: [l => `${l} is doing exactly what it should — this is a genuinely strong result.`, l => `A result like this comes from ${l.toLowerCase()} being firmly in place.`],
  strong: [l => `This is an above-average result, carried by solid performance in ${l.toLowerCase()}.`, l => `${l} is in good shape, and it's showing in the overall result.`],
  solid: [l => `A steady, workable result on ${l.toLowerCase()} — no red flags, with real room still to grow.`, l => `${l} is holding its own here, without yet being a full strength.`],
  developing: [l => `${l} is the whole picture here, and it's still finding its footing — there's real room to grow.`, l => `This result comes down to ${l.toLowerCase()}, which has a clear runway to improve.`],
  weak: [l => `${l} is genuinely lagging, and since it's the whole picture here, it's worth real, focused attention.`, l => `There's a real gap in ${l.toLowerCase()} driving this result — closing it would change everything.`],
  struggling: [l => `${l} is significantly behind — and since it's the whole picture here, it's the clear place to start.`, l => `This result comes down entirely to ${l.toLowerCase()}, which needs the most attention right now.`],
};

function tierMessage(overall, strongestLabel, weakestLabel, seed) {
  const band = bandFor(overall);
  if (strongestLabel === weakestLabel) {
    const fn = pick(`${seed}:message`, TIER_MESSAGE_SINGLE[band]);
    return fn(strongestLabel);
  }
  const fn = pick(`${seed}:message`, TIER_MESSAGE[band]);
  return fn(strongestLabel, weakestLabel);
}

// --- Per-answer insight, driven by how the chosen option ranks among the
// question's own options (not owner-written commentary) -----------------

const ANSWER_INSIGHT = {
  best: [
    (q, a) => `"${a}" was the strongest possible answer here — this is working exactly as it should.`,
    (q, a) => `Choosing "${a}" put this question firmly in your favour.`,
    (q, a) => `"${a}" is the answer that helps the most on this one.`,
  ],
  strong: [
    (q, a) => `"${a}" is a solid answer here — close to the strongest option available.`,
    (q, a) => `"${a}" puts you ahead on this question, just short of the very best option.`,
  ],
  mid: [
    (q, a) => `"${a}" is a middle-of-the-road answer here — not holding you back, not pushing you ahead either.`,
    (q, a) => `"${a}" is a reasonable answer, with a stronger option still available on this one.`,
  ],
  weak: [
    (q, a) => `"${a}" is on the lower end of what's possible here — worth a second look.`,
    (q, a) => `"${a}" is costing you a bit on this question — there was a notably stronger option available.`,
  ],
  worst: [
    (q, a) => `"${a}" was the weakest available answer here — this is one of the clearest places to improve.`,
    (q, a) => `Of everything asked, this is where "${a}" is doing the most damage to the overall score.`,
  ],
};

function answerInsight(questionText, chosenLabel, rankFraction, seed) {
  let position;
  if (rankFraction <= 0.15) position = 'best';
  else if (rankFraction <= 0.4) position = 'strong';
  else if (rankFraction <= 0.6) position = 'mid';
  else if (rankFraction <= 0.85) position = 'weak';
  else position = 'worst';
  const fn = pick(`${seed}:insight`, ANSWER_INSIGHT[position]);
  return fn(questionText, chosenLabel);
}

function buildPersonalizedResult({ scorecard, lead, answers, categoryScores, overall, tierLabel, leadId }) {
  const categories = JSON.parse(scorecard.categories);
  const questions = JSON.parse(scorecard.questions);
  const tiers = JSON.parse(scorecard.tiers);
  const tierConfig = tiers.find(t => t.label === tierLabel) || {};

  const firstName = (lead.firstName || '').trim() || 'there';
  const seedBase = leadId || `${firstName}:${overall}:${tierLabel}`;

  const ranked = categories
    .map(c => ({ key: c.key, label: c.label, score: categoryScores[c.key] || 0, lowMessage: c.lowMessage, highMessage: c.highMessage }))
    .sort((a, b) => a.score - b.score);
  const weakest = ranked[0];
  const strongest = ranked[ranked.length - 1];
  // The "biggest opportunity" / "standout" framing only makes sense when the
  // extreme is actually notable in absolute terms — being merely the best of
  // a uniformly weak set isn't a standout, and being merely the worst of a
  // uniformly strong set isn't an urgent problem. Only applies to the
  // *generated* fallback — an owner's own message always wins regardless.
  const weakestIsNotable = ['developing', 'weak', 'struggling'].includes(bandFor(weakest.score));
  const strongestIsNotable = ['exceptional', 'strong', 'solid'].includes(bandFor(strongest.score));

  const categoryNarratives = ranked.map(c => {
    const role = ranked.length > 1 && c.key === weakest.key && weakestIsNotable ? 'weakest'
      : ranked.length > 1 && c.key === strongest.key && strongestIsNotable ? 'strongest'
      : 'middle';
    const band3 = bandFor(c.score) === 'exceptional' || bandFor(c.score) === 'strong' ? 'strong'
      : bandFor(c.score) === 'weak' || bandFor(c.score) === 'struggling' ? 'weak'
      : 'developing'; // collapsed to the three bands the UI already colours (green/orange/red)
    // The owner can write a low-score message and a high-score message per
    // category (matching ScoreApp's model exactly) — used when it applies,
    // otherwise this category's commentary is generated.
    const ownerMessage = band3 === 'weak' ? c.lowMessage : band3 === 'strong' ? c.highMessage : null;
    const message = (ownerMessage && ownerMessage.trim()) || categoryMessage(c.label, c.score, role, `${seedBase}:${c.key}`);
    return { key: c.key, label: c.label, score: c.score, band: band3, message };
  });

  const answerInsights = questions.map((q, i) => {
    const chosenIdx = answers[i];
    const chosen = q.options[chosenIdx];
    if (!chosen) return null;
    const totals = q.options.map(o => Object.values(o.score || {}).reduce((a, b) => a + b, 0));
    const chosenTotal = totals[chosenIdx];
    const sorted = [...totals].sort((a, b) => b - a); // highest first
    const rank = sorted.indexOf(chosenTotal);
    const rankFraction = q.options.length > 1 ? rank / (q.options.length - 1) : 0;
    const ownerInsight = chosen.insight && chosen.insight.trim();
    return {
      question: q.text,
      answer: chosen.label,
      insight: ownerInsight || answerInsight(q.text, chosen.label, rankFraction, `${seedBase}:q${i}`),
    };
  }).filter(Boolean);

  const ownerHeadline = tierConfig.headline && tierConfig.headline.trim();
  const ownerMessage = tierConfig.message && tierConfig.message.trim();
  // The recommendation is the one place with no generated fallback text —
  // matching the original design reasoning: a made-up "book a call" with no
  // real link behind it isn't useful, so if the owner hasn't written a
  // recommendation for this tier, no recommendation block shows at all.
  const recommendation = (tierConfig.recommendation && tierConfig.recommendation.trim()) || '';
  const recommendationUrl = (tierConfig.recommendationUrl && tierConfig.recommendationUrl.trim()) || '';

  return {
    greetingName: firstName,
    scorecardTitle: scorecard.title,
    overall,
    tierLabel,
    tierHeadline: ownerHeadline || tierHeadline(overall, `${seedBase}:tier`),
    tierMessage: ownerMessage || tierMessage(overall, strongest.label, weakest.label, `${seedBase}:tier`),
    recommendation,
    recommendationUrl,
    categoryNarratives,
    answerInsights,
  };
}

module.exports = { buildPersonalizedResult, bandFor, BANDS };
