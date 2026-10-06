# Migration Guide: Railway → Vercel + Neon
## schoolkeuze-amsterdam (Next.js 16 + Prisma + PostgreSQL)

**Goal:** Move from Railway (~€5–7/month) to Vercel (free) + Neon (free) at €0/month.  
**Estimated time:** 1–2 hours.  
**Zero downtime strategy:** keep Railway running until Vercel is fully verified.

---

## Overview

Your stack:
- **Next.js 16.1.6** with App Router + `next-intl` (bilingual `/nl` and `/en`)
- **Prisma 6** with `prisma.config.ts` (schema at `prisma/schema.prisma`)
- **PostgreSQL** on Railway
- **GitHub** source: `santik/schoolkeuze-amsterdam`

Migration has three phases:
1. **Database** — export from Railway, import into Neon
2. **App** — deploy to Vercel, wire environment variables
3. **Domain** — point `schoolkeuze.amsterdam` to Vercel

---

## Phase 1: Database Migration (Railway → Neon)

### Step 1.1 — Export your data from Railway

Open your Railway dashboard, go to your PostgreSQL service, and find the connection details (host, port, user, password, database name). Then run a dump locally:

```bash
pg_dump \
  --no-owner \
  --no-acl \
  -h <RAILWAY_HOST> \
  -p <RAILWAY_PORT> \
  -U <RAILWAY_USER> \
  -d <RAILWAY_DB_NAME> \
  -f railway_dump.sql
```

Railway provides a `DATABASE_URL` in your service variables — you can also use that directly:

```bash
pg_dump --no-owner --no-acl "$DATABASE_URL" -f railway_dump.sql
```

Verify the dump is not empty:
```bash
wc -l railway_dump.sql
# Should be at least several hundred lines
```

### Step 1.2 — Create a Neon project

1. Go to [neon.tech](https://neon.tech) and sign up (free, no credit card needed).
2. Click **New Project**.
3. Name it `schoolkeuze-amsterdam`.
4. Choose region **EU West (Frankfurt)** — closest to Amsterdam.
5. Click **Create Project**.

Neon will give you a connection string that looks like:
```
postgresql://alex:<password>@ep-cool-darkness-123456.eu-west-1.aws.neon.tech/neondb?sslmode=require
```

Save this — you'll need it for both the import and Vercel.

### Step 1.3 — Import your dump into Neon

```bash
psql "$NEON_DATABASE_URL" -f railway_dump.sql
```

If you see warnings like `role "railway" does not exist` — that's expected and harmless (they come from `--no-owner` stripping ownership). The data still imports correctly.

### Step 1.4 — Verify the data in Neon

```bash
psql "$NEON_DATABASE_URL" -c "\dt"
# Should list your tables (School, etc.)

psql "$NEON_DATABASE_URL" -c "SELECT COUNT(*) FROM \"School\";"
# Should match your Railway row count (87 schools)
```

### Step 1.5 — Update your local `.env` temporarily

Change your local `DATABASE_URL` to the Neon URL and run:

```bash
npx prisma migrate deploy
```

This applies any pending migrations to Neon. If your Railway DB is already fully migrated, this is a no-op and that's fine.

---

## Phase 2: Deploy to Vercel

### Step 2.1 — Install Vercel CLI (optional but handy)

```bash
npm install -g vercel
vercel login
```

### Step 2.2 — Connect repo to Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Click **Import Git Repository** → select `santik/schoolkeuze-amsterdam`.
3. Vercel will auto-detect it as a Next.js project. **Do not change** the framework preset.

> **Important:** The Hobby plan requires the repo to be on your **personal** GitHub account (not an organisation). Since `santik/schoolkeuze-amsterdam` is a personal repo, you're good.

### Step 2.3 — Configure environment variables

Before clicking **Deploy**, expand the **Environment Variables** section and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string (`postgresql://...?sslmode=require`) |
| `NEXT_PUBLIC_BASE_URL` | `https://www.schoolkeuze.amsterdam` (or your domain) |

Check your current Railway service variables for any others you may have set (look in Railway → your service → Variables tab). Common ones to check for:
- Any API keys
- `NODE_ENV` (Vercel sets this automatically — skip it)
- `PORT` (Vercel manages this — skip it)

### Step 2.4 — Vercel build configuration

Vercel will use `npm run build` automatically. Your `package.json` already has the correct `build` script. No changes needed.

However, Prisma needs its client generated during the build. Add a `postinstall` script to your `package.json`:

```json
"scripts": {
  "postinstall": "prisma generate",
  ...
}
```

This ensures `@prisma/client` is generated in Vercel's build environment. Without this, you'll get a runtime error like `PrismaClient is unable to run in this browser environment`.

### Step 2.5 — Deploy

Click **Deploy**. The first build takes ~2 minutes.

Watch the build logs. Common issues and fixes:

**Issue: `Cannot find module '@prisma/client'`**  
Fix: Make sure `postinstall: prisma generate` is in `package.json` (Step 2.4).

**Issue: `Error: @prisma/client did not initialize yet`**  
Fix: The `DATABASE_URL` env var is missing or malformed. Check it in Vercel → Project → Settings → Environment Variables.

**Issue: build fails on `leaflet` / `react-leaflet`**  
These are client-only libraries. If you see SSR errors, ensure the map component is wrapped in `dynamic(() => import(...), { ssr: false })`. This is a known Next.js/Leaflet issue. Check your existing map components — you likely already have this guard, but if not:
```typescript
// In any file that imports react-leaflet
import dynamic from 'next/dynamic'
const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false })
```

### Step 2.6 — Run migrations on Neon via Vercel (for future deploys)

For future schema changes, you'll run migrations manually (or via a GitHub Action — see Phase 4). To run them now if needed:

```bash
# Locally, with NEON DATABASE_URL in .env
npm run db:deploy
```

### Step 2.7 — Seed data (if needed)

If your dump didn't include data (e.g., you only exported the schema), re-seed:

```bash
DATABASE_URL="<neon_url>" npm run ingest:sample
```

Or run the seed script:
```bash
DATABASE_URL="<neon_url>" npm run db:seed
```

### Step 2.8 — Test the Vercel preview URL

Vercel gives you a URL like `schoolkeuze-amsterdam.vercel.app`. Test it:

- `https://schoolkeuze-amsterdam.vercel.app/nl` — Dutch version
- `https://schoolkeuze-amsterdam.vercel.app/en` — English version
- Check that schools load (means Neon connection works)
- Check the map renders
- Check the compare and favorites features

---

## Phase 3: Custom Domain

### Step 3.1 — Add domain in Vercel

1. Go to your Vercel project → **Settings** → **Domains**.
2. Click **Add Domain**.
3. Enter `schoolkeuze.amsterdam`.
4. Vercel will also prompt you to add `www.schoolkeuze.amsterdam` — add both.

Vercel will show you DNS records to configure.

### Step 3.2 — Update DNS at your registrar

Vercel will give you one of two options:

**Option A — Nameservers (simplest, recommended):**  
Change your domain's nameservers to Vercel's nameservers. This hands DNS management to Vercel entirely.

**Option B — CNAME/A records (if you want to keep your registrar's DNS):**

For the apex domain (`schoolkeuze.amsterdam`):
```
Type: A
Name: @
Value: 76.76.21.21
```

For the www subdomain:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

DNS propagation takes 5–60 minutes typically, up to 24 hours in rare cases.

### Step 3.3 — Verify SSL

Vercel provisions a free Let's Encrypt SSL certificate automatically once DNS resolves. You'll see a green checkmark in the Vercel Domains panel. No action needed.

### Step 3.4 — Test your live domain

Once DNS resolves:
- `https://schoolkeuze.amsterdam` → should redirect to `www.schoolkeuze.amsterdam`
- `https://www.schoolkeuze.amsterdam/nl` → full app in Dutch
- `https://www.schoolkeuze.amsterdam/en` → full app in English

---

## Phase 4: Cleanup & Final Steps

### Step 4.1 — Update NEXT_PUBLIC_BASE_URL

In Vercel → Settings → Environment Variables, ensure:
```
NEXT_PUBLIC_BASE_URL = https://www.schoolkeuze.amsterdam
```

Trigger a redeploy after changing env vars: **Deployments** → click the latest → **Redeploy**.

### Step 4.2 — Update playwright prod tests

Your `package.json` already has:
```json
"test:e2e:prod": "PLAYWRIGHT_TARGET=prod PLAYWRIGHT_BASE_URL=https://www.schoolkeuze.amsterdam playwright test"
```

No change needed — this will work against the new deployment automatically.

### Step 4.3 — Cancel Railway

Once you've confirmed everything works on Vercel + Neon for a few days:

1. Railway → your project → **Settings** → **Delete Project** (or just cancel the subscription).
2. Keep your `railway_dump.sql` file locally as a backup.

### Step 4.4 — Set up a Neon backup (recommended)

Neon free tier includes automatic daily backups retained for 7 days. For extra safety, set up a monthly manual dump reminder:

```bash
# Add to your scripts or run monthly
pg_dump --no-owner --no-acl "$NEON_DATABASE_URL" -f "backup_$(date +%Y%m).sql"
```

---

## Future Workflow: Deploying Schema Changes

After migration, your Prisma migration workflow changes slightly:

| Task | Command | Where to run |
|---|---|---|
| Create new migration | `npm run db:migrate` | Locally (against Neon via `.env`) |
| Apply migrations to production | `npm run db:deploy` | Locally or CI, pointing to Neon |
| Vercel redeploys automatically | — | On every `git push main` |

**Important:** Vercel does NOT run `prisma migrate deploy` automatically on deploy. You must run it yourself before or after pushing code that includes schema changes. A safe order:

1. Run `npm run db:deploy` locally (applies migration to Neon production DB)
2. Push code to GitHub
3. Vercel auto-deploys

---

## Neon Free Tier Limits (for reference)

At 10 visits/day, you are nowhere near any limit:

| Resource | Free limit | Your expected usage |
|---|---|---|
| Storage | 0.5 GB | < 50 MB |
| Compute | 191.9 hours/month | ~5–10 hours/month |
| Data transfer | Unlimited | Negligible |
| Projects | 1 | 1 |
| Branches | 10 | 1 |

Compute auto-suspends after 5 minutes of inactivity, so idle time is not counted.

---

## Vercel Free Tier Limits (for reference)

| Resource | Free limit | Your expected usage |
|---|---|---|
| Bandwidth | 100 GB/month | < 1 GB |
| Serverless function invocations | 100K/month | < 1K |
| Build minutes | 6,000/month | < 60 |
| Deployments/day | 100 | < 5 |
| Custom domains | 50 per project | 1–2 |

---

## Troubleshooting Quick Reference

| Symptom | Likely cause | Fix |
|---|---|---|
| White page / 500 error | `DATABASE_URL` wrong or missing | Check Vercel env vars |
| `PrismaClient not initialized` | Missing `postinstall: prisma generate` | Add to `package.json` |
| Schools don't load | Neon connection SSL issue | Ensure `?sslmode=require` in URL |
| Map doesn't render | `leaflet` SSR issue | Wrap in `dynamic(..., { ssr: false })` |
| `/nl` works but `/en` doesn't | `next-intl` config issue | Check `src/i18n/request.ts` and `next.config.ts` |
| Domain not resolving | DNS not propagated | Wait up to 24h; verify with `dig schoolkeuze.amsterdam` |
| Build times out | Large dependencies | Check if `test-results/` is in `.gitignore` |
