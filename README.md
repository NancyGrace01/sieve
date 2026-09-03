# Sieve — Developer Handoff

Sieve is a Nigerian-market lead-qualification SaaS (modeled on ScoreApp): businesses build
an interactive "scorecard" (a short scored quiz), share the link, and every respondent gets
scored and dropped into a leads dashboard with a readiness tier.

See `Sieve_Engine_Integration.docx` in this same folder for how this one codebase houses five
separate business ideas (lead generation, an agency service line, Traffic Desk's qualification
step, Signal Desk, and win-back) without needing separate builds for each.

This folder is the entire codebase. Two parts:

```
/                    ← marketing website (static, no build step)
  index.html, features.html, how-it-works.html, pricing.html,
  use-cases.html, templates.html, demo.html
  styles.css, script.js

/app                 ← the real product
  /server             Node/Express backend + SQLite database
  /public             Logged-in app: signup, login, dashboard, builder, leads, billing, team
  /take               Public page a lead lands on to take a published scorecard
```

## Run it locally

```bash
cd app/server
npm install
node index.js
```

Then open `http://localhost:5500/signup.html` to create the first account, or
`http://localhost:5500/index.html` for the marketing site (same server, same port,
serves both).

## Environment variables

Copy `app/server/.env.example` to `app/server/.env` and fill in:

- `JWT_SECRET` — any long random string (generate with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_SECRET_KEY` — from
  [dashboard.paystack.com](https://dashboard.paystack.com), Settings → API Keys & Webhooks.
  Test keys (`pk_test_…` / `sk_test_…`) work immediately, no business verification needed —
  billing.html degrades gracefully with an on-screen warning if these are left blank.
  Swap for live (`pk_live_…` / `sk_live_…`) keys once the business is verified on Paystack.
- `RESEND_API_KEY` / `EMAIL_FROM` — from [resend.com](https://resend.com), free tier, ~2
  minute signup, no business verification. Powers password reset, team invites, and "you got
  a new lead" emails. **Leave blank and everything still works** — sends are skipped and the
  full email content (including the link) is printed to the server console instead, so you
  can test these flows locally with zero email setup.
- `APP_URL` — set to your real domain once deployed; used to build links inside emails.
- `BACKUP_KEEP_DAYS` — how many days of database backups to retain (see Backups below).

The database is a single SQLite file at `app/server/data/sieve.db`, created automatically
on first run. Nothing else to provision — no external database server.

## What's built and working

- **Accounts** — signup/login/logout, password-hashed, session via JWT cookie
- **Password reset** — request → emailed link (or logged to console if Resend isn't
  configured) → set new password. Tokens are single-use and expire in 1 hour.
- **Team accounts** — the account owner can invite teammates by email (`team.html`).
  Every teammate sees everything the account owns — no per-scorecard split. Seats are capped
  by plan (Starter/free = 1, Business = 3, Pro = 5), enforced server-side, not just in the UI.
- **The scorecard builder** — categories, questions, per-answer scoring weights, all editable
  through the UI, backed by a real API (`app/server/routes/scorecards.js`)
- **60 pre-built, functional templates across 20 industries** (`scorecard-templates.js`,
  `templates.html`) — every template card on the marketing site is wired to a real, working
  scorecard, not just a description. Each template has 3 scoring categories and 8–14 questions
  (genuinely varied by topic — simpler templates run around 8–9, richer ones up to 14),
  matching ScoreApp's own real-world range (their published guidance is "5–15 questions, aim
  for 7–10 to start"; live ScoreApp templates run as high as 18). The questions themselves are
  written diagnostically, not as sales screeners — they ask about the respondent's actual
  frustration, fear, or unmet need (e.g. "What's the thought that actually keeps circling in
  your head about this situation?") rather than asking directly for budget/timeline/etc., so
  the lead opens up and self-qualifies without feeling sold to. The multiple-choice options
  still carry the same numeric scores under the hood, so tiering and routing work identically
  to a plainly-worded question. Clicking "Use this template" on a card creates an actual
  scorecard with real categories, scored questions, and tiers, plus a suggested recommendation
  on the top tier (the template's `ctaLabel`, e.g. "Book a viewing" — the link itself is left
  for the owner to fill in, since no template can invent a real URL), then drops the visitor
  straight into the builder with it already filled in. If they're not signed
  in yet, the choice isn't lost — it's carried through the `?template=` query param to
  `signup.html`, which creates the scorecard from that same template immediately after account
  creation. The template content itself lives in one plain data file
  (`window.SIEVE_TEMPLATES`, no build step), matched to each card by a slug generated from its
  title — see the id-generation approach in git history if templates are ever restructured.
- **Publishing** → a live public link (`/take/index.html?slug=...`)
- **Server-side scoring** (`app/server/scoring.js`) — a lead's score is computed on the server
  from the stored weights, never trusted from the browser
- **Personalized results, PDF, and email — auto-written by default, owner-editable on top**
  (`app/server/personalize.js`, `pdf.js`) — matching ScoreApp's own model exactly: a scorecard
  works fully out of the box the moment it's created, with real result copy already in place,
  and every piece of that copy can be overridden by the owner if they want to. At submit time,
  `personalize.js` generates the tier headline, a tier message, a message for every scoring
  category, and an insight for every question — purely from that respondent's own score
  pattern (which category they're weakest/strongest in, how each answer ranked against the
  other options on that question, how the overall score compares band-to-band) — but if the
  owner has written their own headline, category message, answer insight, or tier
  recommendation, that owner text always wins over the generated version. The one field with
  no generated fallback is the per-tier recommendation link — no algorithm can invent a real
  booking page or WhatsApp number, so a tier simply shows no next-step block unless the owner
  writes one. Generated variety comes from a deterministic hash of the lead's own id, so two
  different respondents landing on the same score very rarely read the same generated
  sentence, while the same lead's own result stays stable if it's ever re-read (e.g.
  regenerating their PDF). This bundle drives three things built from the exact same output:
  the on-screen results page, a real generated PDF (`pdf.js`, via `pdfkit`), and an email sent
  to the lead with the PDF attached (`mailer.js`'s `leadResultsEmail`). It's snapshotted onto
  the lead row at submit time, so editing the
  scorecard later never changes what an already-submitted lead was shown.
- **Leads dashboard** per scorecard, with CSV export, and an email notification to the account
  owner every time a new lead comes in
- **Per-scorecard brand override** — a scorecard can show a different name than the logged-in
  account's own (set once in the builder's "Landing page" section). The results page, PDF, and
  email all resolve to the scorecard's own brand name if set, otherwise fall back to the
  account's. This is what lets one VASNET agency account build scorecards on behalf of
  different clients, each showing that client's own name, never VASNET's.
- **An embeddable widget** — a published scorecard isn't only reachable via its own link. The
  builder generates a ready-to-paste `<iframe>` snippet (`?embed=1` on the public taking page
  strips the full-page centering so it sits naturally inside another page's own layout). Built
  for embedding a scorecard as a qualification step inside a separate product's own flow,
  instead of redirecting a visitor away from it.
- **Brand Campaign Insight Reporting** (`report.html`, `GET /api/scorecards/:id/report`) — a
  colourful, chart-driven aggregate view of a scorecard's results, separate from the per-lead
  detail on the Leads page. Always included: how many people started versus finished (a real
  completion rate, clamped at 100% and tracked via a lightweight start event —
  `POST /api/public/scorecards/:slug/start`), average score, a colour-coded readiness-tier
  donut chart, and category-by-category averages. When the owner turns on audience-profile
  capture (below), it also shows age range and gender as donut charts, location as ranked
  bars, income bracket as a donut, and a psychographic interest breakdown from a question the
  owner writes themselves — each section colour-coded and visually distinct (demographics in
  purple, location in teal, income in gold, interests in pink). When Engagement Campaign Mode
  is on, it adds average completion time and finish rate. No individual name, email, or answer
  ever appears in it — this is the shape of report meant for a sponsor or brand partner.
- **Audience profile capture** (`app/server/demographics.js`) — an optional, per-scorecard
  toggle in the builder. When on, the public gate asks for any combination of age range,
  gender, location (a fixed list of the 36 states + FCT + "Outside Nigeria"), income bracket,
  and one owner-defined "interest" question with owner-defined options — all from fixed option
  lists, never free text, so the report's charts always aggregate cleanly. Every enabled field
  is required to submit, the same way name/email already are, so the report is built from real,
  complete answers rather than sparse guesses. Off by default — a plain lead-gen scorecard
  never shows any of this.
- **Engagement Campaign Mode** — an optional, per-scorecard toggle that makes the taking flow
  itself feel like a real engagement campaign, not just a lead form. When on: the browser times
  how long a respondent actually spends completing it and shows that back to them on the
  results page ("⏱ Completed in 24s"), alongside a "📤 Share your result" button that copies an
  owner-defined share prompt (tokens: `{score} {title} {brand} {tier} {link}`) to the
  clipboard. The owner's report shows the real average completion time and finish rate as
  engagement metrics — this is what makes the Mobile Engagement Agency value proposition show
  up in the product itself, not just in a pitch deck.
- **Three billing modes** (`app/server/paystack.js`, `routes/billing.js`, `public/billing.html`) —
  subscription is no longer the only way to pay, because a flat monthly SaaS fee is a real
  adoption barrier for a lot of Nigerian SMEs. An account picks one active mode at a time:
  - **Credits** — buy a bundle of prepaid response credits once (100/₦12,000, 500/₦50,000
    "Most popular", 2,000/₦160,000 "Best value"), no recurring charge. Every *completed*
    scorecard response spends one credit. A scorecard becomes unavailable to *new* visitors
    the moment the balance hits zero — never mid-quiz, only for the next person who tries to
    start.
  - **Pay-per-lead (CPL)** — no upfront spend at all. Save a card once via Paystack's reusable
    `charge_authorization` (proven with a small ₦100 verification charge), then every qualified
    lead a scorecard produces is billed automatically and in real time, right after that
    person submits (₦150/lead by default). Every attempt — success or failure — is logged to
    `cpl_charges`; a failed charge emails the owner so a dead card gets noticed quickly, and
    never blocks or retroactively un-scores the lead that already came in.
  - **Subscription** — the original flat-monthly-fee model (Starter/Business/Pro), kept as a
    secondary option in `billing.html` for businesses that prefer a predictable bill over
    usage-based pricing.
  A shared `app/server/paystack.js` helper wraps Paystack's verify and charge-authorization
  endpoints, and — matching the mailer's "skip and log" pattern — simulates a successful
  response when `PAYSTACK_SECRET_KEY` isn't set, so all three modes are fully testable and
  demoable without a real Paystack account. `GET /api/billing/wallet` is the one place a
  logged-in owner (or `billing.html`) reads current mode, credit balance, CPL rate, and
  whether a card is on file.
- **WhatsApp sharing (Phase 0 of the WhatsApp roadmap — see below)** — purely additive, nothing
  existing was changed to add this. The builder's Publish section has a "Share on WhatsApp"
  block (a `wa.me` link pre-filled with a message linking to the scorecard, plus a copyable
  broadcast-text box) sitting alongside the existing web link and embed code. The results page
  has a "📱 Send this to WhatsApp" link sitting alongside the existing PDF download link, letting
  a respondent forward their own score. No new dependencies, no schema changes, no server
  changes — both are client-side only, generated from data the pages already had.
- **Security** — rate limiting on auth/invite endpoints, an Origin-check CSRF layer on every
  state-changing request, ownership checks on every scorecard/lead route (verified by test —
  see below)
- **A real test suite** — 48 tests covering the scoring engine, the fully-automatic
  personalization engine (band thresholds, weakest/strongest framing, generated variety across
  different respondents on an identical score, deterministic stability for the same lead,
  the CTA sentence only appearing when a link is set), real PDF generation, and the full API
  (auth, scorecard CRUD, validation, publish/unpublish, public submission, cross-account
  isolation, PDF download by lead id, brand-name resolution, start-tracking, completion-rate
  clamping, profile-capture validation, the full audience/engagement report math, and all
  three billing modes (default state, the cpl-without-a-card guard, a simulated credit-bundle
  purchase, a scorecard gating new visitors once credits run out while never blocking whoever
  already started, and a simulated real-time CPL charge on a qualified lead). Run with
  `npm test` inside `app/server`.
- **Deployment config** — `Dockerfile` at the project root (see Deploying below)
- **Automated backups** — `npm run backup` inside `app/server` copies the database with a
  timestamp and prunes old copies (see Backups below)

Verified end-to-end by hand before handoff, beyond the automated tests: created an account via
a template link (Solar Readiness Assessment), confirmed the builder landed pre-filled with the
template's real categories/questions/tiers and the template's suggested recommendation already
sitting on the top tier with an empty link field → overrode just that tier's headline and
filled in a real link, leaving its message and every category/answer field untouched → publish
→ took it as a visitor with a strong answer pattern → the result correctly showed the *owner's*
overridden headline verbatim, while the tier message, both category messages, and all three
answer insights were still generated fresh (confirming overrides apply per field, not
all-or-nothing) → the recommendation block showed the owner's exact link. Separately, verified
the fully-generated path on a scorecard with zero owner copy: the weakest category correctly
framed as the priority, the strongest correctly framed as the standout (and correctly *not*
over-praised when even the "strongest" category is still weak in absolute terms — a real bug
caught and fixed during this work), and resubmitting with different answers confirmed the
generated commentary genuinely varies between respondents rather than reading like a form
letter → the emailed copy (logged to console, since no Resend key is set locally) matches the
results page exactly, PDF attached → the PDF downloads as a real file (`%PDF` signature
verified) →
password reset via the logged link → team invite → accept-invite → teammate logs in
independently and sees the account's data → seat limit correctly blocks a 4th invite on a
3-seat plan.

Also verified live with a brand-campaign scenario (a "GlowCo" skincare scorecard, all five
profile fields plus Engagement Campaign Mode turned on): the builder's toggles round-trip
correctly, the public gate renders all five profile dropdowns and refuses to proceed until
they're answered, the results page shows a real completion timer and a working share prompt
with every token correctly substituted, and — across five respondents with deliberately varied
demographics — the Brand Campaign Insight Report's donut charts, ranked bars, and engagement
stats all matched the underlying data exactly. One real bug was caught and fixed in the
process: a scorecard created but never opened in the builder had a bare, incomplete
`profile_capture` default that crashed the report endpoint — fixed by normalizing that value
on every read, not just on save (`demographics.js`'s `parseProfileCapture`). A second was
caught by the live check itself: completion rate could read above 100% in edge cases (a
blocked start beacon, a retried submission) — now clamped.

Also verified after the template-depth rewrite (60 templates expanded from 3 questions/2
categories to 8–14 questions/3 categories each, with diagnostic rather than sales-screener
phrasing): a scripted check confirmed all 60 templates have exactly 3 categories, a question
count in the 8–14 range, and a valid score object on every option — then live end-to-end with
Property Buyer Readiness Scorecard (10 questions/3 categories): signed up via the template
link, confirmed the builder landed with the correct category/question count, published, and
submitted a full answer set through the public API — the response correctly scored across all
3 categories with generated commentary and an insight for every question.

## Tests

```bash
cd app/server
npm test
```

Uses Node's built-in test runner (`node --test`) — no test framework dependency. Each run
uses its own throwaway SQLite file, so it never touches `data/sieve.db`.

## Backups

```bash
cd app/server
npm run backup
```

Copies `data/sieve.db` into `data/backups/` with a timestamp, and deletes backups older than
`BACKUP_KEEP_DAYS`. This script does one backup per run — it doesn't schedule anything
itself. Wire it to a scheduled job once deployed (cron, Railway Cron, a GitHub Action running
against the deployed host).

## Deploying

```bash
# from the project root (this file's directory)
docker build -t sieve .
docker run -p 5500:5500 --env-file app/server/.env -v sieve-data:/app/app/server/data sieve
```

The `-v` volume is not optional — without it, every redeploy wipes the database. Any Docker
host works (Railway, Render, Fly.io, a plain VPS). Point your domain at the container's port
5500; the marketing site, the logged-in app, and the API are all served by the same process.

## Personalization degrades gracefully — generated by default, owner-editable on top

This is a deliberate design choice, and it went through two iterations before landing here.
The first version made every result field (per-category message, per-tier headline/message/
recommendation, per-answer insight) purely owner-authored, with a thin generated fallback for
whatever an owner skipped. That was replaced with a fully automatic engine — no owner writing
at all. That, in turn, was replaced with the current model, matching ScoreApp's own approach
exactly: a scorecard works fully out of the box with real, non-repetitive, score-aware copy the
moment it's created — but an owner can override any specific field (a category's message, a
tier's headline, a specific answer's insight, a tier's recommendation) if they want to control
exactly what a respondent sees. Whatever the owner writes always wins over the generated
version for that field; whatever they leave blank is written by `personalize.js` instead,
deterministically varied per lead so it never reads as a templated form-letter. The one field
with no generated fallback at all is the per-tier recommendation link, since nothing here can
invent a real booking page or WhatsApp number — leave it blank and that tier simply shows no
next-step block.

## WhatsApp integration roadmap — Phase 1 & 2 (not built yet)

Phase 0 (WhatsApp sharing, listed above under "What's built and working") is done and required
no new infrastructure. Phases 1 and 2 are a genuinely different scope — they let a lead take
the actual scorecard *inside* a WhatsApp chat, not just get a link to it — and neither has been
started. Both need the same things below before any code gets written.

**Blocking prerequisite for either phase: Sieve needs to be deployed to a real, public domain
first.** Everything in this project has been run and tested on `localhost` so far. WhatsApp's
platform (Meta) delivers incoming messages to your server via a webhook — a real `https://` URL
it can reach — and `localhost` is not reachable from the outside internet. This isn't specific
to which phase or which provider is chosen; it has to happen regardless, via the existing
`Dockerfile` and the Deploying section above, before WhatsApp work can be connected end-to-end.

**Phase 1 — chatbot-style, one question per message (simpler, faster to build):**
- A dedicated phone number that has never had WhatsApp installed on it (a new SIM or VoIP
  number — an existing personal/business WhatsApp number cannot be reused for the API).
- A WhatsApp Business Solution Provider (BSP) account with Cloud API access. Any Cloud-API BSP
  works for Phase 1 — basic interactive button/list messages are near-universal across
  providers, so this is a much shorter vendor search than Phase 2.
- Meta Business Verification for VASNET — needs a CAC certificate, a business website or
  Facebook page, and a business email. Typically 3–10 business days.
- Sieve deployed to a public domain (see above).

**Phase 2 — WhatsApp Flows, the whole quiz as one in-chat form (higher completion rate,
more setup):** everything Phase 1 needs, plus —
- A BSP that specifically supports sending WhatsApp Flow messages, not just standard
  interactive messages. This is not guaranteed across providers and needs to be confirmed
  directly with the BSP's own developer docs or support team before committing — developer-
  first BSPs with raw Cloud API access (360dialog, Gupshup, Infobip, Twilio) are the more
  likely candidates; Termii (Nigerian-founded) is attractive for local ties but its Flow
  support is unconfirmed as of this writing and needs a direct check.
- A separate Flow endpoint on Sieve's own server, using an extra layer of encryption (a
  public/private key pair generated and registered with Meta) — more setup than Phase 1's
  plain webhook.
- A separate Meta review step specific to the Flow itself, beyond standard Business
  Verification, before it can go live with real users.
- Nigeria Data Protection Act (NDPA) 2023 compliance for collecting phone numbers via
  WhatsApp — needs real consent language and data-handling answers, not just infrastructure.

## What's NOT built yet — real gaps, not oversights

- **No production hardening beyond the basics.** Rate limiting and CSRF origin-checks are in
  place, but there's no input sanitization library, no structured logging/monitoring, and the
  rate limiter's state is in-memory (fine for one server; won't share state if this ever runs
  on more than one instance — swap for a Redis-backed limiter at that point).
- **SQLite, not Postgres.** Fine at MVP scale (single server, moderate traffic). If this needs
  to scale past one server or handle concurrent-write-heavy load, migrate `app/server/db.js`
  to Postgres — the rest of the codebase doesn't need to change, since every route goes
  through the `run`/`get`/`all` functions exported from that one file.
- **No CI.** Tests exist and pass, but nothing runs them automatically on push — wire up a
  GitHub Action that runs `npm test` before merge.
- **Resend's sandbox sender** (the default `EMAIL_FROM`) only delivers to the Resend
  account's own verified email until a real sending domain is verified — fine for testing,
  needs a verified domain before real customers receive these emails.

## Suggested first milestones for a developer picking this up

1. Deploy as-is to a staging URL, confirm the flow works outside localhost (cookies, and
   watch for CORS issues if the domain differs from the API's).
2. Get a Resend account, verify a sending domain, confirm password reset / invite / lead
   emails actually arrive (not just log to console).
3. Get live Paystack keys from the business owner and test a real ₦-denominated charge.
4. Add a CI workflow that runs `npm test` on every push.
