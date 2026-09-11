// Shared helpers for every page under /app/public.

async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// Call at the top of any protected page. Redirects to login if not signed in,
// otherwise resolves with the current user and paints their business name in.
async function requireUser() {
  try {
    const { user } = await api('/auth/me');
    document.querySelectorAll('[data-user-business]').forEach(el => { el.textContent = user.business_name; });
    return user;
  } catch {
    window.location.href = '/login.html';
    return null;
  }
}

function showError(el, message) {
  el.textContent = message;
  el.classList.add('show');
}
function hideError(el) {
  el.classList.remove('show');
}

// Turns a templates.html card into a real, owned scorecard: creates it, then
// fills in the template's categories/questions/tiers in one PUT. Used both
// when a logged-in visitor clicks a template directly, and after a fresh
// signup that arrived via a template link (see signup.html).
//
// Each template carries one suggested `ctaLabel` (not per-tier, since these
// are lean starter templates) — it's applied as the recommendation text on
// the top tier only, the one tier a call-to-action like "Book a viewing"
// actually makes sense for. The link itself is deliberately left blank: no
// template can invent a real booking page or WhatsApp number, so the owner
// fills that in themselves (or overrides/adds recommendations on any other
// tier) once they're in the builder.
async function createScorecardFromTemplate(template) {
  const { scorecard } = await api('/scorecards', { method: 'POST', body: { title: template.title } });
  const tiers = (template.tiers || []).map((t, i) => (
    i === 0 && template.ctaLabel ? { ...t, recommendation: template.ctaLabel } : { ...t }
  ));
  await api(`/scorecards/${scorecard.id}`, {
    method: 'PUT',
    body: {
      title: template.title,
      intro: template.intro || '',
      categories: template.categories,
      questions: template.questions,
      tiers,
      coverImage: template.coverImage || '',
    },
  });
  return scorecard.id;
}

async function wireLogout() {
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/auth/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  });
}
document.addEventListener('DOMContentLoaded', wireLogout);
