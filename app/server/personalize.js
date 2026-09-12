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

// Full, coaching-style paragraphs rather than one-liners — the point is that a
// respondent reads this and feels like a real person looked at their answers,
// not that a form ran a formula on them. Each still ends on a forward-looking
// note (what this means, or what to do about it), matching what makes a
// result feel like genuine help rather than a verdict.
const CATEGORY_BASE = {
  exceptional: [
    l => `${l} is firing on all cylinders — genuinely one of the strongest parts of this whole result. It's clear you've already put real thought into this, and it shows in how consistently your answers pointed the same direction. Whatever you're doing here, it's working — the priority now is protecting it, not fixing it.`,
    l => `There's very little to fault in ${l.toLowerCase()} — this is close to as good as it gets at this stage. It's the kind of foundation that makes everything else easier to build on, so it's worth recognising rather than taking for granted. Keep doing what got you here.`,
    l => `${l} stands out as a real strength, well above where most people land on this. That's not an accident — it usually reflects real preparation and honest self-awareness going in. From here, the smartest move is simply not to let this slip while you focus energy elsewhere.`,
  ],
  strong: [
    l => `${l} is in good shape — solidly ahead of where most people sit at this point. You're clearly not starting from zero here, and that head start matters more than it might feel like right now. A little more focused attention would be enough to push this from good to genuinely excellent.`,
    l => `You're doing well on ${l.toLowerCase()}, with just a little more headroom above you. This is a real strength worth building on rather than a gap that needs urgent fixing. The next honest step is deciding whether to lean further into it or shift your energy toward whatever's holding the rest of the picture back.`,
    l => `${l} is a genuine strength — a small, deliberate push here would put it firmly in the top tier. There's nothing urgent to fix, which is exactly why this is a good place to keep investing a little more. It's already carrying real weight in your overall result.`,
  ],
  solid: [
    l => `${l} is respectable — not a weak point, but not yet a standout either. This is the kind of area that's easy to overlook precisely because nothing about it is alarming, but there's a realistic, achievable path from here to genuinely strong. A bit of deliberate focus would move this meaningfully.`,
    l => `You're right around the middle on ${l.toLowerCase()} — steady, with clear room to push further. Nothing here is holding you back in any dramatic way, but it's also not yet doing the heavy lifting it could be. Worth a closer look next, once anything more urgent is handled.`,
    l => `${l} sits in reasonably good territory, with a realistic path to genuinely strong from here. It's neither the reason you'd hesitate nor the reason you'd feel fully confident — which usually means it just hasn't had focused attention yet. That makes it one of the more straightforward things to improve.`,
  ],
  developing: [
    l => `${l} is still finding its footing — there's real, achievable room to grow here, and that's genuinely good news. Gaps at this stage are almost always about attention, not ability — this isn't a fundamental problem, it's an unfinished one. Naming it clearly, like this result just did, is usually the hardest part.`,
    l => `${l} is a fair way off where it could be, and it's worth some deliberate, honest attention rather than being left to sort itself out. The encouraging part is that this kind of gap tends to close faster than people expect once it's actually being worked on. Right now it's likely quietly weighing on the rest of your picture.`,
    l => `You're behind where you'd want to be on ${l.toLowerCase()}, but it's a fixable gap, not a fundamental one. Most people carry at least one area like this — the difference is what happens next. Closing even part of this gap would change how the whole result feels, not just this one number.`,
  ],
  weak: [
    l => `${l} is genuinely lagging, and this is worth real, focused attention rather than a passing glance. It's one of the clearer weak points in the picture right now, and it's likely shaping how the rest of this feels more than any single answer suggests on its own. The honest read: this deserves to move up your priority list.`,
    l => `There's a real gap in ${l.toLowerCase()} — closing even part of it would change the overall result noticeably. This isn't about anything being wrong with you; it usually just means this area hasn't had the attention the rest has. Naming it plainly is the first useful step toward actually closing it.`,
    l => `${l} is well below where it needs to be — not a small tweak, a real focus area. It's easy to let a gap like this sit quietly in the background, but it's very likely doing more to hold back the overall picture than it seems. Worth treating as a genuine priority, not an afterthought.`,
  ],
  struggling: [
    l => `${l} is the clearest problem area in this whole result — and honestly, the one most worth addressing first. That's not meant as discouraging; it's the opposite; it means you now know exactly where the biggest single improvement is sitting, waiting to be made. Everything else in this result would likely look different once this gets real attention.`,
    l => `There's a real shortfall in ${l.toLowerCase()} that's dragging on the overall picture more than any other single factor here. This is the part of the result that calls for a genuine reset rather than a minor adjustment. The upside of a clear result like this is that there's no guesswork about where to start.`,
    l => `${l} needs the most attention of everything measured here, and it's worth being honest about that rather than smoothing it over. A result like this is uncomfortable to read, but it's also the most useful kind — it points straight at what would move the needle most. This is exactly the kind of thing worth talking through with someone who's helped others close a gap like it.`,
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

const CATEGORY_HEADLINE_BASE = {
  strong: [
    l => `${l} is carrying real weight here — the job now is protecting it, not fixing it.`,
    l => `${l} is a genuine strength. Everything else gets easier once one part of the picture is already solid.`,
    l => `Keep leaning on ${l.toLowerCase()} — it's doing more for the overall result than it might seem.`,
  ],
  developing: [
    l => `${l} is steady, not yet a strength — a realistic, achievable path forward, not a fundamental problem.`,
    l => `There's real room to grow in ${l.toLowerCase()}, and closing even part of that gap changes the whole picture.`,
    l => `${l} is worth deliberate attention next — not urgent, but not something to leave on autopilot either.`,
  ],
  weak: [
    l => `${l} is the clearest place to focus first — closing this gap would move the whole result.`,
    l => `A real shortfall in ${l.toLowerCase()} is worth treating as a genuine priority, not an afterthought.`,
    l => `${l} needs the most attention of anything measured here — and now there's no guesswork about where to start.`,
  ],
};

function categoryHeadline(label, band3, seed) {
  return pick(`${seed}:headline`, CATEGORY_HEADLINE_BASE[band3])(label);
}

const CATEGORY_CHECKLIST_BASE = {
  strong: [
    [
      { label: 'Protect what works', text: 'Write down what you\'re actually doing right here so it survives changes in routine, team, or attention.' },
      { label: 'Raise the bar', text: 'A strength that stops improving quietly becomes average — set a slightly higher target here, not just a maintenance one.' },
      { label: 'Use it as leverage', text: 'Let this be the model for the areas that need more work — whatever\'s making this strong is probably transferable.' },
    ],
    [
      { label: 'Document the "why"', text: 'Knowing exactly why this is working makes it repeatable, not just lucky.' },
      { label: 'Stress-test it', text: 'Check whether this holds up under more pressure or scale, not just in ordinary conditions.' },
      { label: 'Share it', text: 'If this involves other people, make sure whatever\'s working here isn\'t sitting only with one person.' },
    ],
  ],
  developing: [
    [
      { label: 'Get specific', text: 'Write down exactly what "better" would look like here — vague goals rarely close a real gap.' },
      { label: 'Pick one lever', text: 'Choose the single change most likely to move this, rather than trying to fix everything about it at once.' },
      { label: 'Set a check-in point', text: 'Decide now when you\'ll revisit this — progress that isn\'t checked tends to quietly stall.' },
    ],
    [
      { label: 'Find the pattern', text: 'Look for what\'s actually causing this to sit in the middle rather than treating it as one-off bad luck.' },
      { label: 'Borrow what works elsewhere', text: 'Whatever\'s helping your stronger areas is probably at least partly transferable here.' },
      { label: 'Track it, don\'t just note it', text: 'A gap that\'s measured over time is far more likely to actually close.' },
    ],
  ],
  weak: [
    [
      { label: 'Name the real cause', text: 'Be honest about why this is lagging — a vague sense of "needs work" won\'t fix it, a specific cause might.' },
      { label: 'Start smaller than feels necessary', text: 'A weak area rarely gets fixed by one big push — a small, consistent change is more likely to stick.' },
      { label: 'Get outside input', text: 'This is exactly the kind of gap where a second, more experienced perspective tends to help the most.' },
    ],
    [
      { label: 'Make it the priority', text: 'Put this above lower-stakes items on your list — it\'s likely doing more damage to the overall picture than it appears to.' },
      { label: 'Set one concrete next step', text: 'Not a goal — an actual action you can take this week, however small.' },
      { label: 'Revisit soon', text: 'Check back on this specifically and often; gaps like this tend to close faster once they\'re being actively watched.' },
    ],
  ],
};

function categoryChecklist(band3, seed) {
  return pick(`${seed}:checklist`, CATEGORY_CHECKLIST_BASE[band3]);
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

// --- The recommendation block's own headline — addressed to the respondent
// by name, matching the reference behaviour: a plain "Recommended next step"
// label reads like a form footer, a question with their own name in it reads
// like an invitation. Still only ever shown alongside an owner-written
// recommendation (see buildPersonalizedResult) — nothing here invents the
// booking page or WhatsApp number behind it. -----------------------------

const CTA_HEADLINE = [
  n => `Would you like to gain deeper insights on your results, ${n}?`,
  n => `Want to go deeper on what this actually means, ${n}?`,
  n => `Ready to turn this into a real next step, ${n}?`,
  n => `${n}, want a second pair of eyes on what this result actually means for you?`,
];

function ctaHeadline(firstName, seed) {
  const fn = pick(`${seed}:ctaHeadline`, CTA_HEADLINE);
  return fn(firstName);
}

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

    // Built from `categories` (the scorecard's own defined order), not `ranked`
  // (sorted by score) — the donut/legend/tabs on the result page need a fixed
  // order that stays the same for every lead, the way the ScoreApp reference
  // does. `ranked` is still used to decide which category gets the
  // weakest/strongest "role" framing.
  const categoryNarratives = categories.map(cat => {
    const c = ranked.find(r => r.key === cat.key);
    const role = ranked.length > 1 && c.key === weakest.key && weakestIsNotable ? 'weakest'
      : ranked.length > 1 && c.key === strongest.key && strongestIsNotable ? 'strongest'
      : 'middle';
    const band3 = bandFor(c.score) === 'exceptional' || bandFor(c.score) === 'strong' ? 'strong'
      : bandFor(c.score) === 'weak' || bandFor(c.score) === 'struggling' ? 'weak'
      : 'developing';
    const ownerMessage = band3 === 'weak' ? c.lowMessage : band3 === 'strong' ? c.highMessage : null;
    const message = (ownerMessage && ownerMessage.trim()) || categoryMessage(c.label, c.score, role, `${seedBase}:${c.key}`);
    const ownerHeadline = c.headline && c.headline.trim();
    const headline = ownerHeadline || categoryHeadline(c.label, band3, `${seedBase}:${c.key}`);
    const checklist = categoryChecklist(band3, `${seedBase}:${c.key}`);
    return { key: c.key, label: c.label, score: c.score, band: band3, headline, message, checklist };
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
  const recommendationLabel = (tierConfig.recommendationLabel && tierConfig.recommendationLabel.trim()) || 'Book Now';

  return {
    greetingName: firstName,
    scorecardTitle: scorecard.title,
    overall,
    tierLabel,
    tierHeadline: ownerHeadline || tierHeadline(overall, `${seedBase}:tier`),
    tierMessage: ownerMessage || tierMessage(overall, strongest.label, weakest.label, `${seedBase}:tier`),
    recommendation,
    recommendationUrl,
    recommendationLabel,
    // Only meaningful once there's an actual recommendation to sit next to —
    // take.js only renders the CTA block at all when `recommendation` is set.
    ctaHeadline: recommendation ? ctaHeadline(firstName, `${seedBase}:cta`) : '',
    categoryNarratives,
    answerInsights,
  };
}

module.exports = { buildPersonalizedResult, bandFor, BANDS };
