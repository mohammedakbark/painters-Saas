# ADR 0009: Free-tier test hosting with deploy on merge to main

- **Status:** Accepted (product owner, 2026-11-07, D-052)
- **Date:** 2026-11-07
- **Decision owners:** Product owner (cost), Engineering (setup)

## Context

The product owner needs a public environment to show SevenPalette to prospective shops before there is any revenue, so it must cost nothing (D-028). Mobile apps are shared as APKs; only the API and the web portal (home page, Shop Admin, Platform Admin) need hosting. Every merge to `main` must update the environment automatically. The proposed stack already names Supabase, Render and Vercel (ADR 0003, TECHNICAL_ARCHITECTURE §1–3) on paid plans.

Checked 2026-11-07: Render free web services sleep after 15 minutes idle (30–60 s cold start, 750 h/month); Supabase Free pauses a project after a week without database activity and has no backups; Vercel Hobby is limited to non-commercial use; Netlify Free allows commercial use and supports Next.js 16; Koyeb's free instance sleeps after an hour and wakes in seconds; Fly.io and Railway have no lasting free tier.

## Decision

1. A **test environment** on the free plans of the proposed providers, all in Singapore: Supabase Free (Postgres, Auth, Storage), Render Free (API, `render.yaml`), Vercel Hobby (web, `apps/admin_web/vercel.json`, region `sin1`).
2. **Deploy on `main`:** Render deploys after CI passes on the commit (`autoDeployTrigger: checksPass`); Vercel builds pushes to `main` only. `main` receives fast-forward merges from `dev`, whose commits already passed CI.
3. **Migrations** run at API start (`prisma migrate deploy && node dist/main.js`), because the free Render plan has no pre-deploy step. Production should use a separate migration step.
4. **Keep-alive:** a scheduled GitHub workflow calls `/health/ready` every 10 minutes during IST daytime, keeping the API warm and the database active.
5. **Sign-in:** Supabase test phone numbers with fixed codes until an SMS vendor is chosen (question 46); email confirmations on (question 51).
6. Setup and variables: `docs/guides/DEPLOYMENT.md`. No secret is stored in the repository.

## Consequences

- **Benefits:** zero cost; the same providers as the proposed production stack, so moving to paid plans is a plan change, not a migration.
- **Costs and risks:** cold starts outside keep-alive hours; no database backups; Vercel Hobby must be replaced (Pro or another host) before commercial use; migrations at start mean a failing migration stops the new deploy (the previous one keeps serving); OSM community tiles are for light use only.

## Alternatives considered

- **Netlify Free for the web:** commercial use allowed, but less proven with Cache Components/partial prerendering. Kept as the fallback if Vercel Hobby terms become a problem.
- **Koyeb Free for the API:** faster wake-up, but one instance and fewer regions; fallback if Render cold starts hurt testing.
- **Oracle Cloud Always Free VM:** more capacity, but we would run and secure the server ourselves. Rejected for now.
