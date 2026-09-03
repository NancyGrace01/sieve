// Runs `pg_dump` against DATABASE_URL and writes a timestamped, compressed
// backup file to /backups, deleting backups older than KEEP_DAYS. Run
// manually (`npm run backup`) or wire to a scheduled job (cron, Railway Cron,
// a GitHub Action) once deployed — this script itself doesn't schedule
// anything, it just does one backup per run.
//
// Requires the `pg_dump` CLI to be present on the host/container (it ships
// with the `postgresql-client` package on Debian/Ubuntu — the Dockerfile
// installs it). It is a separate system binary, not something the `pg` npm
// package provides.
//
// Note: most managed Postgres providers (Neon, Railway, Supabase, RDS) run
// their own automatic backups/point-in-time recovery already — treat this
// script as a portable, provider-independent safety net (e.g. a manual
// snapshot right before a risky migration), not a replacement for whatever
// backup guarantee the hosting provider itself already gives you. Confirm
// what that is once a provider is chosen.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS) || 14;
const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');

function main() {
  if (!DATABASE_URL) {
    console.error('[backup] DATABASE_URL is not set — nothing to back up.');
    process.exit(1);
  }
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(BACKUP_DIR, `sieve-${stamp}.dump`);

  try {
    // -F c = pg_dump's "custom" format: compressed, and restorable with
    // `pg_restore --dbname=<url> sieve-<stamp>.dump` (schema + data, in one file).
    execFileSync('pg_dump', ['-F', 'c', '-f', dest, DATABASE_URL], { stdio: 'inherit' });
  } catch (err) {
    console.error('[backup] pg_dump failed — is the `postgresql-client` package installed on this host?');
    throw err;
  }
  console.log(`[backup] Wrote ${dest}`);

  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(BACKUP_DIR)) {
    const filePath = path.join(BACKUP_DIR, file);
    if (fs.statSync(filePath).mtimeMs < cutoff) {
      fs.rmSync(filePath);
      console.log(`[backup] Deleted old backup ${file}`);
    }
  }
}

main();
