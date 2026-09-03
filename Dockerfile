# Sieve — one container serves the API, the logged-in app, the public
# scorecard page, and the marketing site. Build from the REPO ROOT
# (this file's own directory), not from app/server:
#
#   docker build -t sieve .
#   docker run -p 5500:5500 --env-file app/server/.env sieve
#
# No local data volume anymore — the database is a real Postgres instance
# reached via DATABASE_URL in your .env (a managed provider, or Postgres
# running in its own container/service). Nothing on this container's own
# filesystem needs to survive a restart, except backup files if you run
# `npm run backup` inside it — mount a volume at /app/app/server/data/backups
# specifically if you rely on that rather than a provider's own backups.

FROM node:22-slim

# postgresql-client provides pg_dump/pg_restore, used by scripts/backup.js.
# Not required for the app itself to run — only for `npm run backup`.
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/app/server
COPY app/server/package.json app/server/package-lock.json ./
RUN npm ci --omit=dev

WORKDIR /app
COPY . .

WORKDIR /app/app/server
EXPOSE 5500
CMD ["node", "index.js"]
