// Public scorecard-taking engine — fetches a published scorecard by slug,
// walks the visitor through it, and submits answers to the server, which
// computes and returns the real score (scoring weights never reach the browser).

(async function initTake() {
  const root = document.getElementById('demo-root');
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug');

  if (!slug) {
    root.innerHTML = `<div class="demo-body"><p class="text-center">No scorecard specified.</p></div>`;
    return;
  }

  if (params.get('embed') === '1') document.body.classList.add('is-embed');

  let scorecard;
  try {
    const res = await fetch(`/api/public/scorecards/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Not found');
    scorecard = await res.json();
  } catch (err) {
    root.innerHTML = `<div class="demo-body"><p class="text-center">This scorecard isn't available. ${err.message ? '(' + err.message + ')' : ''}</p></div>`;
    return;
  }

  const brandName = scorecard.brandName || 'Sieve';
  document.title = `${scorecard.title} — ${brandName}`;
  const brandEl = document.getElementById('brand-name');
  if (brandEl) brandEl.textContent = brandName;

  let step = -1;
  const answers = [];
  let lead = {};
  let profile = {};
  let startTime = null;
  const pc = scorecard.profileCapture || { enabled: false };

  function render() {
    if (step === -1) return renderGate();
    if (step >= scorecard.questions.length) return renderResult();
    renderQuestion();
  }

  function profileFieldsHtml() {
    if (!pc.enabled) return '';
    const rows = [];
    if (pc.captureAge) rows.push(selectField('p-age', 'Age range', pc.ageRanges));
    if (pc.captureGender) rows.push(selectField('p-gender', 'Gender', pc.genders));
    if (pc.captureLocation) rows.push(selectField('p-location', 'Location', pc.locations));
    if (pc.captureSocialClass) rows.push(selectField('p-social', 'Income bracket', pc.socialClasses));
    if (pc.interestOptions && pc.interestOptions.length) {
      rows.push(selectField('p-interest', pc.interestQuestion || 'Which best describes your interest?', pc.interestOptions));
    }
    if (!rows.length) return '';
    return `<div class="demo-profile-fields">${rows.join('')}</div>`;
  }

  function selectField(id, label, options) {
    return `
      <select id="${id}" class="demo-select" required>
        <option value="" disabled selected>${escapeHtml(label)}</option>
        ${options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
      </select>
    `;
  }

  function renderGate() {
    // A cover image — the template's own default, or the owner's replacement —
    // is shown behind the title, intro, and the gate form itself, so a visitor
    // sees one continuous branded moment before they start (not a plain form
    // dropped in after a photo). No cover set: falls back to the plain card
    // that already worked, nothing here ever looks broken or half-built.
    const cover = scorecard.coverImage && scorecard.coverImage.trim();
    const gateInner = `
        <div class="demo-q" style="margin-bottom:10px;">${escapeHtml(scorecard.title)}</div>
        <p style="text-align:center;color:var(--ink-soft);font-size:14.5px;margin-bottom:26px;">${escapeHtml(scorecard.intro || '')}</p>
        <div class="demo-gate">
          <div class="demo-gate-row">
            <input type="text" id="g-first" placeholder="First name" />
            <input type="text" id="g-last" placeholder="Last name" />
          </div>
          <input type="tel" id="g-phone" placeholder="Phone number" />
          <input type="email" id="g-email" placeholder="Email" />
          ${profileFieldsHtml()}
          <button class="btn btn-accent btn-block" id="g-start">Start →</button>
          <p id="g-error" class="demo-gate-error" style="display:none;"></p>
        </div>
    `;
    root.innerHTML = cover
      ? `<div class="demo-cover" style="background-image:url('${escapeHtml(cover)}');">
           <div class="demo-cover-overlay"><div class="demo-body demo-cover-body">${gateInner}</div></div>
         </div>`
      : `<div class="demo-body">${gateInner}</div>`;
    document.getElementById('g-start').addEventListener('click', () => {
      const errorEl = document.getElementById('g-error');
      errorEl.style.display = 'none';

      // Name, phone, and email are the whole point of the gate — mandatory on
      // every scorecard, not conditional on anything.
      const coreMissing = ['g-first', 'g-last', 'g-phone', 'g-email']
        .some(id => !document.getElementById(id).value.trim());
      if (coreMissing) {
        errorEl.textContent = 'Please fill in your name, phone number, and email before starting.';
        errorEl.style.display = 'block';
        return;
      }

      if (pc.enabled) {
        const requiredIds = [
          pc.captureAge && 'p-age', pc.captureGender && 'p-gender',
          pc.captureLocation && 'p-location', pc.captureSocialClass && 'p-social',
          (pc.interestOptions && pc.interestOptions.length) && 'p-interest',
        ].filter(Boolean);
        const missing = requiredIds.some(id => !document.getElementById(id).value);
        if (missing) {
          errorEl.textContent = 'Please answer every field above before starting.';
          errorEl.style.display = 'block';
          return;
        }
        profile = {
          ...(pc.captureAge ? { ageRange: document.getElementById('p-age').value } : {}),
          ...(pc.captureGender ? { gender: document.getElementById('p-gender').value } : {}),
          ...(pc.captureLocation ? { location: document.getElementById('p-location').value } : {}),
          ...(pc.captureSocialClass ? { socialClass: document.getElementById('p-social').value } : {}),
          ...((pc.interestOptions && pc.interestOptions.length) ? { interest: document.getElementById('p-interest').value } : {}),
        };
      }

      lead = {
        firstName: document.getElementById('g-first').value.trim(),
        lastName: document.getElementById('g-last').value.trim(),
        phone: document.getElementById('g-phone').value.trim(),
        email: document.getElementById('g-email').value.trim(),
      };
      startTime = Date.now();
      // Fire-and-forget — powers the completion-rate figure in the owner's
      // aggregate report; never blocks the visitor moving to question 1.
      fetch(`/api/public/scorecards/${encodeURIComponent(slug)}/start`, { method: 'POST' }).catch(() => {});
      step = 0;
      render();
    });
  }

  function renderProgress() {
    let bar = document.querySelector('.demo-progress-wrap');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'demo-progress-wrap';
      bar.innerHTML = `<div class="demo-progress-bar"><div class="demo-progress-fill"></div></div><div class="demo-progress-label"></div>`;
      root.parentElement.insertBefore(bar, root.nextSibling);
    }
    const pct = step < 0 ? 0 : Math.round((step / scorecard.questions.length) * 100);
    bar.querySelector('.demo-progress-fill').style.width = pct + '%';
    bar.querySelector('.demo-progress-label').textContent = pct + '% complete';
    bar.style.display = step >= scorecard.questions.length ? 'none' : 'flex';
  }

  function renderQuestion() {
    const q = scorecard.questions[step];
    renderProgress();
    root.innerHTML = `
      <div class="demo-body">
        ${step > 0 ? `<div class="demo-back" id="d-back">← Back</div>` : ''}
        <div class="demo-q">${escapeHtml(q.text)}</div>
        <div class="demo-answers">
          ${q.options.map((opt, i) => `<button class="demo-opt" data-i="${i}">${escapeHtml(opt.label)}</button>`).join('')}
        </div>
      </div>
    `;
    if (step > 0) {
      document.getElementById('d-back').addEventListener('click', () => { step -= 1; answers.pop(); render(); });
    }
    root.querySelectorAll('.demo-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        answers[step] = parseInt(btn.dataset.i, 10);
        step += 1;
        render();
      });
    });
  }

  const BAND_COLOR = { strong: '#16825D', developing: '#B3720C', weak: '#B3261E' };

  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  function buildShareText(template, ctx) {
    const fallback = `I scored ${ctx.score}% on "${ctx.title}"! Check yours: ${ctx.link}`;
    if (!template) return fallback;
    return template
      .replace(/\{score\}/g, ctx.score)
      .replace(/\{title\}/g, ctx.title)
      .replace(/\{brand\}/g, ctx.brand)
      .replace(/\{tier\}/g, ctx.tier)
      .replace(/\{link\}/g, ctx.link);
  }

  async function renderResult() {
    renderProgress();
    root.innerHTML = `<div class="demo-body"><p class="text-center" style="color:var(--ink-faint);">Scoring your answers…</p></div>`;

    const timeToCompleteSeconds = startTime ? Math.round((Date.now() - startTime) / 1000) : null;

    let result;
    try {
      const res = await fetch(`/api/public/scorecards/${encodeURIComponent(slug)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, answers, profile, timeToCompleteSeconds }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not submit.');
      result = await res.json();
    } catch (err) {
      root.innerHTML = `<div class="demo-body"><p class="text-center">Something went wrong submitting your answers. ${escapeHtml(err.message)}</p></div>`;
      return;
    }

    const p = result.personalization;

    const categoryRows = p.categoryNarratives.map(c => `
      <div class="result-cat-row">
        <div class="result-cat-name">${escapeHtml(c.label)}</div>
        <div class="result-cat-bar"><div class="result-cat-fill" style="width:${c.score}%;background:${BAND_COLOR[c.band] || 'var(--blue)'};"></div></div>
        <div class="result-cat-pct">${c.score}%</div>
      </div>
      <p class="result-cat-message">${escapeHtml(c.message)}</p>
    `).join('');

    const insightsBlock = p.answerInsights.length ? `
      <div class="result-insights">
        <h3>What we noticed in your answers</h3>
        ${p.answerInsights.map(a => `
          <div class="result-insight">
            <p class="result-insight-q">${escapeHtml(a.question)}</p>
            <p class="result-insight-a">Your answer: ${escapeHtml(a.answer)}</p>
            <p class="result-insight-text">${escapeHtml(a.insight)}</p>
          </div>
        `).join('')}
      </div>
    ` : '';

    const ctaBlock = p.recommendation ? `
      <div class="result-cta">
        <div class="result-cta-icon">👋</div>
        <div class="result-cta-headline">${escapeHtml(p.ctaHeadline || 'Want to go deeper on your results?')}</div>
        <p>${escapeHtml(p.recommendation)}</p>
        ${p.recommendationUrl ? `<a href="${escapeHtml(p.recommendationUrl)}" class="btn btn-accent btn-sm" target="_blank" rel="noopener">${escapeHtml(p.recommendationLabel || 'Book Now')} →</a>` : ''}
      </div>
    ` : '';

    // Mobile Engagement Agency's value proposition, made visible: a real
    // completion time and a shareable result — the marks of an engagement
    // campaign, not just a lead form.
    const engagementBlock = result.engagementMode ? `
      <div class="result-engagement">
        ${result.timeToCompleteSeconds != null ? `<span class="result-time-badge">⏱ Completed in ${formatDuration(result.timeToCompleteSeconds)}</span>` : ''}
        <button class="btn btn-ghost btn-sm" id="share-btn" type="button">Share your result</button>
      </div>
    ` : '';

    const shareLink = `${location.origin}/take/index.html?slug=${slug}`;
    const shareText = buildShareText(result.shareTemplate, {
      score: p.overall, title: scorecard.title, brand: brandName, tier: p.tierLabel, link: shareLink,
    });
    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    root.innerHTML = `
      <div class="demo-body demo-result">
        <p class="result-greeting">Hi ${escapeHtml(p.greetingName)}, here's your result</p>
        <div class="result-tier">${escapeHtml(p.tierHeadline)}</div>
        <div class="score-ring" style="--pct:${p.overall}">
          <div class="score-ring-inner">
            <div class="score-ring-num">${p.overall}%</div>
            <div class="score-ring-label">OVERALL SCORE</div>
          </div>
        </div>
        ${p.tierMessage ? `<p class="result-tier-message">${escapeHtml(p.tierMessage)}</p>` : ''}
        ${engagementBlock}
        <div class="result-cats">${categoryRows}</div>
        ${insightsBlock}
        ${ctaBlock}
        <p style="color:var(--ink-soft);font-size:13.5px;margin-top:18px;">
          ${lead.email ? `Your full personalised report has also been emailed to ${escapeHtml(lead.email)}.` : 'Thanks — your results have been recorded.'}
        </p>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
          <a class="btn btn-ghost btn-sm" href="${result.reportUrl}" target="_blank" rel="noopener">Download your PDF report ↓</a>
          <a class="btn btn-accent btn-sm" href="${whatsappHref}" target="_blank" rel="noopener">Send this to WhatsApp</a>
        </div>
      </div>
    `;
    const bar = document.querySelector('.demo-progress-wrap');
    if (bar) bar.style.display = 'none';

    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const shareLink = `${location.origin}/take/index.html?slug=${slug}`;
        const text = buildShareText(result.shareTemplate, {
          score: p.overall, title: scorecard.title, brand: brandName, tier: p.tierLabel, link: shareLink,
        });
        try {
          await navigator.clipboard.writeText(text);
          shareBtn.textContent = '✓ Copied — paste it anywhere';
        } catch {
          shareBtn.textContent = text;
        }
      });
    }
  }

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  render();
})();
