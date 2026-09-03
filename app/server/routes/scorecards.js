const express = require('express');
const crypto = require('node:crypto');
const { run, get, all } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { AGE_RANGES, GENDERS, SOCIAL_CLASSES, LOCATIONS, sanitizeProfileCapture, parseProfileCapture } = require('../demographics');

const router = express.Router();
router.use(requireAuth);

function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'scorecard';
}

async function uniqueSlug(base) {
  let slug = base;
  let n = 1;
  while (await get('SELECT id FROM scorecards WHERE slug = ?', [slug])) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

function serialize(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    intro: row.intro,
    categories: JSON.parse(row.categories),
    questions: JSON.parse(row.questions),
    tiers: JSON.parse(row.tiers),
    brandName: row.brand_name || '',
    profileCapture: parseProfileCapture(row.profile_capture),
    engagementMode: !!row.engagement_mode,
    shareTemplate: row.share_template || '',
    published: !!row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// List the signed-in business's scorecards, with a live lead count each.
router.get('/', async (req, res, next) => {
  try {
    const rows = await all('SELECT * FROM scorecards WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    const withCounts = await Promise.all(rows.map(async row => {
      const { count } = await get('SELECT COUNT(*) as count FROM leads WHERE scorecard_id = ?', [row.id]);
      return { ...serialize(row), leadCount: Number(count) };
    }));
    res.json({ scorecards: withCounts });
  } catch (err) {
    next(err);
  }
});

// The fixed option lists the builder and the public gate both need — one
// source of truth so aggregation in the report always lines up cleanly.
router.get('/meta/demographics', (req, res) => {
  res.json({ ageRanges: AGE_RANGES, genders: GENDERS, socialClasses: SOCIAL_CLASSES, locations: LOCATIONS });
});

// Create a new, empty scorecard.
router.post('/', async (req, res, next) => {
  try {
    const title = (req.body && req.body.title) || 'Untitled scorecard';
    const id = crypto.randomUUID();
    const slug = await uniqueSlug(slugify(title));
    const defaultCategories = JSON.stringify([{ key: 'fit', label: 'Fit' }]);
    await run(
      'INSERT INTO scorecards (id, user_id, slug, title, categories) VALUES (?, ?, ?, ?, ?)',
      [id, req.user.id, slug, title, defaultCategories]
    );
    const row = await get('SELECT * FROM scorecards WHERE id = ?', [id]);
    res.status(201).json({ scorecard: serialize(row) });
  } catch (err) {
    next(err);
  }
});

async function ownedScorecardOr404(req, res) {
  const row = await get('SELECT * FROM scorecards WHERE id = ?', [req.params.id]);
  if (!row || row.user_id !== req.user.id) {
    res.status(404).json({ error: 'Scorecard not found.' });
    return null;
  }
  return row;
}

router.get('/:id', async (req, res, next) => {
  try {
    const row = await ownedScorecardOr404(req, res);
    if (!row) return;
    res.json({ scorecard: serialize(row) });
  } catch (err) {
    next(err);
  }
});

// Full update — title, intro, categories, questions, tiers all replaced at once.
// The builder UI sends the whole edited scorecard on every Save.
router.put('/:id', async (req, res, next) => {
  try {
    const row = await ownedScorecardOr404(req, res);
    if (!row) return;

    const { title, intro, categories, questions, tiers, brandName, profileCapture, engagementMode, shareTemplate } = req.body || {};
    if (!Array.isArray(categories) || !categories.length) {
      return res.status(400).json({ error: 'A scorecard needs at least one scoring category.' });
    }
    if (!Array.isArray(questions) || !questions.length) {
      return res.status(400).json({ error: 'A scorecard needs at least one question.' });
    }
    for (const q of questions) {
      if (!q.text || !Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ error: 'Every question needs text and at least two options.' });
      }
    }

    await run(
      `UPDATE scorecards SET title = ?, intro = ?, categories = ?, questions = ?, tiers = ?, brand_name = ?,
       profile_capture = ?, engagement_mode = ?, share_template = ?, updated_at = now()::text WHERE id = ?`,
      [
        title || row.title,
        intro ?? row.intro,
        JSON.stringify(categories),
        JSON.stringify(questions),
        JSON.stringify(tiers && tiers.length ? tiers : JSON.parse(row.tiers)),
        (brandName && brandName.trim()) || null,
        JSON.stringify(sanitizeProfileCapture(profileCapture)),
        engagementMode ? 1 : 0,
        (shareTemplate && shareTemplate.trim()) || null,
        row.id,
      ]
    );
    const updated = await get('SELECT * FROM scorecards WHERE id = ?', [row.id]);
    res.json({ scorecard: serialize(updated) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/publish', async (req, res, next) => {
  try {
    const row = await ownedScorecardOr404(req, res);
    if (!row) return;
    const publish = req.body && typeof req.body.published === 'boolean' ? req.body.published : !row.published;
    await run(`UPDATE scorecards SET published = ?, updated_at = now()::text WHERE id = ?`, [publish ? 1 : 0, row.id]);
    const updated = await get('SELECT * FROM scorecards WHERE id = ?', [row.id]);
    res.json({ scorecard: serialize(updated) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const row = await ownedScorecardOr404(req, res);
    if (!row) return;
    await run('DELETE FROM leads WHERE scorecard_id = ?', [row.id]);
    await run('DELETE FROM scorecard_starts WHERE scorecard_id = ?', [row.id]);
    await run('DELETE FROM scorecards WHERE id = ?', [row.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/leads', async (req, res, next) => {
  try {
    const row = await ownedScorecardOr404(req, res);
    if (!row) return;
    const leads = await all('SELECT * FROM leads WHERE scorecard_id = ? ORDER BY created_at DESC', [row.id]);
    res.json({
      leads: leads.map(l => ({
        id: l.id,
        firstName: l.first_name,
        lastName: l.last_name,
        businessName: l.business_name,
        email: l.email,
        categoryScores: JSON.parse(l.category_scores),
        overallScore: l.overall_score,
        tier: l.tier,
        profile: l.profile ? JSON.parse(l.profile) : null,
        timeToCompleteSeconds: l.time_to_complete_seconds,
        createdAt: l.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Aggregate insight across everyone who has taken this scorecard — "Brand
// Campaign Insight Reporting" (Signal Desk's value proposition, made real).
// This is the shape a sponsor/brand cares about: readiness, demographics,
// psychographics (interest), and engagement — never an individual answer,
// name, or contact detail. Per-lead detail stays on the Leads page.
router.get('/:id/report', async (req, res, next) => {
  try {
    const row = await ownedScorecardOr404(req, res);
    if (!row) return;

    const categories = JSON.parse(row.categories);
    const tiers = JSON.parse(row.tiers);
    const profileCapture = parseProfileCapture(row.profile_capture);
    const leads = await all('SELECT * FROM leads WHERE scorecard_id = ?', [row.id]);
    const { count: startedRaw } = await get('SELECT COUNT(*) as count FROM scorecard_starts WHERE scorecard_id = ?', [row.id]);
    const started = Number(startedRaw);
    const completed = leads.length;

    const averageOverall = completed ? Math.round(leads.reduce((sum, l) => sum + l.overall_score, 0) / completed) : 0;

    const tierCounts = {};
    tiers.forEach(t => { tierCounts[t.label] = 0; });
    leads.forEach(l => { tierCounts[l.tier] = (tierCounts[l.tier] || 0) + 1; });
    const tierBreakdown = tiers.map(t => ({
      label: t.label,
      count: tierCounts[t.label] || 0,
      pct: completed ? Math.round(((tierCounts[t.label] || 0) / completed) * 100) : 0,
    }));

    const categoryTotals = {};
    categories.forEach(c => { categoryTotals[c.key] = 0; });
    leads.forEach(l => {
      const scores = JSON.parse(l.category_scores);
      categories.forEach(c => { categoryTotals[c.key] += scores[c.key] || 0; });
    });
    const categoryAverages = categories.map(c => ({
      key: c.key,
      label: c.label,
      avgScore: completed ? Math.round(categoryTotals[c.key] / completed) : 0,
    }));

    const days = [];
    for (let i = 13; i >= 0; i -= 1) {
      days.push(new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    }
    const dayCounts = {};
    days.forEach(d => { dayCounts[d] = 0; });
    leads.forEach(l => {
      const day = (l.created_at || '').slice(0, 10);
      if (day in dayCounts) dayCounts[day] += 1;
    });

    // Engagement — Mobile Engagement Agency's own metric, made real: how long
    // people actually spent completing this, not just whether they did.
    const timedLeads = leads.filter(l => Number.isFinite(l.time_to_complete_seconds));
    const averageTimeToCompleteSeconds = timedLeads.length
      ? Math.round(timedLeads.reduce((sum, l) => sum + l.time_to_complete_seconds, 0) / timedLeads.length)
      : null;

    // Demographics / psychographics — only computed when the scorecard actually
    // asked for them, and only from whichever leads answered each field.
    function tally(getValue) {
      const counts = {};
      let answered = 0;
      leads.forEach(l => {
        if (!l.profile) return;
        const profile = JSON.parse(l.profile);
        const value = getValue(profile);
        if (!value) return;
        counts[value] = (counts[value] || 0) + 1;
        answered += 1;
      });
      return Object.entries(counts)
        .map(([label, count]) => ({ label, count, pct: answered ? Math.round((count / answered) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);
    }

    const audience = {
      enabled: profileCapture.enabled,
      ageBreakdown: profileCapture.captureAge ? tally(p => p.ageRange) : [],
      genderBreakdown: profileCapture.captureGender ? tally(p => p.gender) : [],
      locationBreakdown: profileCapture.captureLocation ? tally(p => p.location) : [],
      socialClassBreakdown: profileCapture.captureSocialClass ? tally(p => p.socialClass) : [],
      interestBreakdown: profileCapture.interestOptions.length ? tally(p => p.interest) : [],
      interestQuestion: profileCapture.interestQuestion,
    };

    res.json({
      started,
      completed,
      // Clamped to 100 — completed can technically exceed started in edge cases
      // (a blocked /start beacon, a retried submission, multiple tabs), and a
      // rate above 100% would never be a meaningful thing to show a brand.
      completionRate: started ? Math.min(100, Math.round((completed / started) * 100)) : null,
      averageOverall,
      tierBreakdown,
      categoryAverages,
      trend: days.map(d => ({ date: d, count: dayCounts[d] })),
      engagementMode: !!row.engagement_mode,
      averageTimeToCompleteSeconds,
      audience,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/leads.csv', async (req, res, next) => {
  try {
    const row = await ownedScorecardOr404(req, res);
    if (!row) return;
    const leads = await all('SELECT * FROM leads WHERE scorecard_id = ? ORDER BY created_at DESC', [row.id]);
    const header = 'First name,Last name,Business,Email,Overall score,Tier,Age range,Gender,Location,Social class,Interest,Time to complete (s),Date\n';
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = leads.map(l => {
      const p = l.profile ? JSON.parse(l.profile) : {};
      return [
        l.first_name, l.last_name, l.business_name, l.email, l.overall_score, l.tier,
        p.ageRange, p.gender, p.location, p.socialClass, p.interest,
        l.time_to_complete_seconds, l.created_at,
      ].map(esc).join(',');
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${row.slug}-leads.csv"`);
    res.send(header + lines.join('\n'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
