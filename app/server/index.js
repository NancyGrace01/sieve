const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cookieParser = require('cookie-parser');
const csrfOriginCheck = require('./middleware/csrf');

const { migrate } = require('./db'); // ensures Postgres tables/columns exist

const app = express();

// Behind a reverse proxy (Railway, Render, nginx) req.ip would otherwise be the
// proxy's address for every request, making the rate limiters below useless.
// Trusts only the first hop — adjust if deploying behind more than one proxy layer.
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use(csrfOriginCheck);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/scorecards', require('./routes/scorecards'));
app.use('/api/public', require('./routes/public'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/team', require('./routes/team'));

// Builder / dashboard app — protected in the browser by checking /api/auth/me,
// not by the static file server (a real deploy could add server-side gating too).
app.use(express.static(path.join(__dirname, '..', 'public')));

// Public scorecard-taking page — shared by every published scorecard,
// the slug is read from the URL query string on the client.
app.use('/take', express.static(path.join(__dirname, '..', 'take')));

// The original marketing site lives one level up from /app.
app.use(express.static(path.join(__dirname, '..', '..')));

const PORT = process.env.PORT || 5500;
if (require.main === module) {
  migrate()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Sieve server running at http://localhost:${PORT}`);
        console.log(`  Marketing site:      http://localhost:${PORT}/index.html`);
        console.log(`  Sign up / dashboard: http://localhost:${PORT}/signup.html`);
      });
    })
    .catch((err) => {
      console.error('[startup] Failed to migrate the database:', err);
      process.exit(1);
    });
}

// The test suite imports `app` directly (via supertest-style request()) and
// needs the schema to exist before making requests — it awaits this itself.
module.exports = app;
module.exports.migrate = migrate;
