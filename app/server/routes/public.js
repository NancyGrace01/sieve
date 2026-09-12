const express = require('express');
const crypto = require('node:crypto');
const { run, get } = require('../db');
const { computeScore } = require('../scoring');
const { buildPersonalizedResult } = require('../personalize');
const { buildReportPdf } = require('../pdf');
const rateLimit = require('../middleware/rateLimit');
const { newLeadEmail, leadResultsEmail, appUrl } = require('../mailer');
const { AGE_RANGES, GENDERS, SOCIAL_CLASSES, LOCATIONS, parseProfileCapture } = require('../demographics');
const { chargeCplLead } = require('./billing');

const router = express.Router();

// Looser than the auth limiter — this endpoint takes real visitor traffic,
// but still needs a ceiling against a scripted submission flood.
const submitLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 60, message: 'Too many submissions from this connection — try again shortly.' });
const startLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 120, message: 'Too many requests from this connection — try again shortly.' });

// A scorecard's own brand_name (set in the builder — the agency/white-label
// case) wins; otherwise it falls back to the account owner's business name.
async function resolveBrandName(scorecardRow) {
  if (scorecardRow.brand_name && scorecardRow.brand_name.trim()) return scorecardRow.brand_name.trim();
  const owner = await get('SELECT business_name FROM users WHERE id = ?', [scorecardRow.user_id]);
  return (owner && owner.business_name) || 'Sieve';
}

// Usage-based billing check, run only when a NEW visitor loads a scorecard —
// never mid-quiz. Subscription mode has no per-response gate at all (that's
// the whole point of a flat monthly fee). Credits mode blocks once the
// balance has run out; CPL mode blocks if no card is on file to charge.
// Returns null when the scorecard is available, or a user-facing reason.
const FREE_PLAN_RESPONSE_LIMIT = 10;

async function billingGate(scorecardRow) {
  const owner = await get(
    'SELECT plan, billing_mode, credit_balance, paystack_authorization_code FROM users WHERE id = ?',
    [scorecardRow.user_id]
  );
  if (!owner) return null;

  // Same "genuinely never paid" definition used for the scorecard-count cap in
  // routes/scorecards.js — a Credits top-up or an activated Pay-per-lead card
  // means this account is past the free tier's 10-response ceiling too, even
  // though `plan` itself only changes on a subscription upgrade.
  const stillOnFreePlan = owner.plan === 'free'
    && owner.billing_mode === 'subscription'
    && Number(owner.credit_balance) <= 0
    && !owner.paystack_authorization_code;

  if (stillOnFreePlan) {
    const { count } = await get('SELECT COUNT(*) as count FROM leads WHERE scorecard_id = ?', [scorecardRow.id]);
    if (Number(count) >= FREE_PLAN_RESPONSE_LIMIT) {
      return `This scorecard has reached its free-plan limit of ${FREE_PLAN_RESPONSE_LIMIT} responses — the owner needs to upgrade to keep collecting leads.`;
    }
  }

  if (owner.billing_mode === 'subscription') return null;
  if (owner.billing_mode === 'credits' && owner.credit_balance <= 0) {
    return 'This scorecard is temporarily unavailable — the owner is out of response credits.';
  }
  if (owner.billing_mode === 'cpl' && !owner.paystack_authorization_code) {
    return 'This scorecard is temporarily unavailable — the owner has not set up billing yet.';
  }
  return null;
}

// Shapes the profile-capture config for the public gate — the option lists a
// visitor picks from live here (never invented client-side), so aggregation
// in the report always lines up cleanly against a fixed vocabulary.
function publicProfileCapture(row) {
  const pc = parseProfileCapture(row.profile_capture);
  if (!pc.enabled) return { enabled: false };
  return {
    enabled: true,
    captureAge: pc.captureAge, ageRanges: pc.captureAge ? AGE_RANGES : [],
    captureGender: pc.captureGender, genders: pc.captureGender ? GENDERS : [],
    captureLocation: pc.captureLocation, locations: pc.captureLocation ? LOCATIONS : [],
    captureSocialClass: pc.captureSocialClass, socialClasses: pc.captureSocialClass ? SOCIAL_CLASSES : [],
    interestQuestion: pc.interestQuestion || '',
    interestOptions: pc.interestOptions || [],
  };
}

// Validates a submitted profile against the scorecard's own enabled fields —
// required whenever the owner turned a field on, same as name/email are
// required today, so the report is built from real, complete answers.
function validateProfile(pc, profile) {
  if (!pc.enabled) return { ok: true, clean: null };
  const p = profile && typeof profile === 'object' ? profile : {};
  const clean = {};

  if (pc.captureAge) {
    if (!AGE_RANGES.includes(p.ageRange)) return { ok: false, error: 'Please select an age range.' };
    clean.ageRange = p.ageRange;
  }
  if (pc.captureGender) {
    if (!GENDERS.includes(p.gender)) return { ok: false, error: 'Please select a gender option.' };
    clean.gender = p.gender;
  }
  if (pc.captureLocation) {
    if (!LOCATIONS.includes(p.location)) return { ok: false, error: 'Please select a location.' };
    clean.location = p.location;
  }
  if (pc.captureSocialClass) {
    if (!SOCIAL_CLASSES.includes(p.socialClass)) return { ok: false, error: 'Please select an income bracket.' };
    clean.socialClass = p.socialClass;
  }
  if (pc.interestOptions && pc.interestOptions.length) {
    if (!pc.interestOptions.includes(p.interest)) return { ok: false, error: 'Please select an interest.' };
    clean.interest = p.interest;
  }
  return { ok: true, clean };
}

// What an anonymous visitor is allowed to see before taking a scorecard —
// question text and option labels only. Scoring weights and insight copy
// never reach the browser before it's their own result.
router.get('/scorecards/:slug', async (req, res, next) => {
  try {
    const row = await get('SELECT * FROM scorecards WHERE slug = ? AND published = 1', [req.params.slug]);
    if (!row) return res.status(404).json({ error: 'This scorecard is not available.' });
    const gateReason = await billingGate(row);
    if (gateReason) return res.status(503).json({ error: gateReason });

    const questions = JSON.parse(row.questions).map(q => ({
      text: q.text,
      options: q.options.map(o => ({ label: o.label })),
    }));

    res.json({
      slug: row.slug,
      title: row.title,
      intro: row.intro,
      brandName: await resolveBrandName(row),
      coverImage: row.cover_image || '',
      engagementMode: !!row.engagement_mode,
      shareTemplate: row.share_template || '',
      profileCapture: publicProfileCapture(row),
      questions,
    });
  } catch (err) {
    next(err);
  }
});

// Fired once when a visitor gets past the gate — powers the completion-rate
// figure in the aggregate report (Signal Desk). No lead identity here, just a
// count; the person may still never finish.
router.post('/scorecards/:slug/start', startLimiter, async (req, res, next) => {
  try {
    const row = await get('SELECT id FROM scorecards WHERE slug = ? AND published = 1', [req.params.slug]);
    if (!row) return res.status(404).json({ error: 'This scorecard is not available.' });
    await run('INSERT INTO scorecard_starts (id, scorecard_id) VALUES (?, ?)', [crypto.randomUUID(), row.id]);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/scorecards/:slug/submit', submitLimiter, async (req, res, next) => {
  try {
    const row = await get('SELECT * FROM scorecards WHERE slug = ? AND published = 1', [req.params.slug]);
    if (!row) return res.status(404).json({ error: 'This scorecard is not available.' });

    const { firstName, lastName, phone, email, answers, profile, timeToCompleteSeconds } = req.body || {};
    const questions = JSON.parse(row.questions);

    if (!Array.isArray(answers) || answers.length !== questions.length) {
      return res.status(400).json({ error: 'Answers do not match this scorecard.' });
    }
    if (!firstName?.trim() || !lastName?.trim() || !phone?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Name, phone number, and email are required.' });
    }
    for (let i = 0; i < questions.length; i += 1) {
      const idx = answers[i];
      if (!Number.isInteger(idx) || idx < 0 || idx >= questions[i].options.length) {
        return res.status(400).json({ error: `Invalid answer for question ${i + 1}.` });
      }
    }

    const pc = parseProfileCapture(row.profile_capture);
    const profileCheck = validateProfile(pc, profile);
    if (!profileCheck.ok) return res.status(400).json({ error: profileCheck.error });

    const timeSeconds = Number.isFinite(timeToCompleteSeconds) && timeToCompleteSeconds >= 0
      ? Math.round(timeToCompleteSeconds)
      : null;

    const { categoryScores, overall, tier } = computeScore(row, answers);
    const lead = { firstName, lastName, phone, email };
    const id = crypto.randomUUID();
    const personalization = buildPersonalizedResult({ scorecard: row, lead, answers, categoryScores, overall, tierLabel: tier, leadId: id });
    const brandName = await resolveBrandName(row);

    await run(
      `INSERT INTO leads (id, scorecard_id, first_name, last_name, phone, email, answers, category_scores, overall_score, tier, personalization, profile, time_to_complete_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, row.id, firstName || null, lastName || null, phone || null, email || null,
        JSON.stringify(answers), JSON.stringify(categoryScores), overall, tier, JSON.stringify(personalization),
        profileCheck.clean ? JSON.stringify(profileCheck.clean) : null, timeSeconds]
    );

    const owner = await get(
      'SELECT id, email, billing_mode, credit_balance, cpl_rate_kobo, paystack_authorization_code FROM users WHERE id = ?',
      [row.user_id]
    );
    const reportUrl = `${appUrl()}/api/public/leads/${id}/report.pdf`;

    // Usage-based billing settles right here, on a successful submission — this
    // is the one moment a respondent is confirmed "qualified," which is what
    // both the credit and pay-per-lead models actually charge for. Never
    // blocks the response the visitor already gave; only affects future ones.
    if (owner && owner.billing_mode === 'credits') {
      run('UPDATE users SET credit_balance = credit_balance - 1 WHERE id = ?', [owner.id])
        .catch(err => console.error('[public] credit deduction failed:', err));
    } else if (owner && owner.billing_mode === 'cpl' && owner.paystack_authorization_code) {
      chargeCplLead({ owner, leadId: id }).catch(err => console.error('[public] CPL charge failed:', err));
    }

    // Fire-and-forget — the browser gets its personalized result immediately
    // below; the PDF and emails happen in the background and never block it.
    (async () => {
      let pdfBuffer;
      try {
        pdfBuffer = await buildReportPdf(personalization, brandName);
      } catch (err) {
        console.error('[public] PDF generation failed:', err);
      }
      if (email) {
        leadResultsEmail({ to: email, businessName: brandName, personalization, reportUrl, pdfBuffer })
          .catch(err => console.error('[public] lead results email failed:', err));
      }
      if (owner) {
        newLeadEmail(owner.email, row.title, { firstName, lastName, phone, email, overall, tier })
          .catch(err => console.error('[public] new-lead email failed:', err));
      }
    })();

    res.status(201).json({
      leadId: id,
      reportUrl,
      brandName,
      personalization,
      engagementMode: !!row.engagement_mode,
      shareTemplate: row.share_template || '',
      timeToCompleteSeconds: timeSeconds,
    });
  } catch (err) {
    next(err);
  }
});

// Lets a lead (re)download their own PDF from the results page or the emailed
// link. Gated only by knowing the lead's own unguessable id — same model as
// the password-reset/invite tokens elsewhere in this app; no login required
// since leads never get an account.
router.get('/leads/:leadId/report.pdf', async (req, res) => {
  try {
    const lead = await get('SELECT * FROM leads WHERE id = ?', [req.params.leadId]);
    if (!lead || !lead.personalization) return res.status(404).json({ error: 'Report not found.' });

    const scorecard = await get('SELECT * FROM scorecards WHERE id = ?', [lead.scorecard_id]);

    const personalization = JSON.parse(lead.personalization);
    const brandName = scorecard ? await resolveBrandName(scorecard) : 'Sieve';
    const pdfBuffer = await buildReportPdf(personalization, brandName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="your-results.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[public] report.pdf generation failed:', err);
    res.status(500).json({ error: 'Could not generate the report right now.' });
  }
});

module.exports = router;
