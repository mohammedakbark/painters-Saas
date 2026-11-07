# Test environment hosting (free tier)

**Status:** set up 2026-11-07 (ADR 0009, D-052). This is the **test/demo environment** for trying SevenPalette with prospective shops. It is not production: no backups, cold starts, and the limits below.

| Piece | Service, free plan | URL (fill in) |
|---|---|---|
| Postgres, Auth, Storage | Supabase Free, region **Southeast Asia (Singapore)** | `https://<ref>.supabase.co` |
| API (`apps/api`) | Render Free web service, region Singapore, from `render.yaml` | `https://sevenpalette-api.onrender.com` |
| Web portal (`apps/admin_web`): home page, Shop Admin, Platform Admin | Vercel Hobby, region `sin1`, from `apps/admin_web/vercel.json` | `https://<project>.vercel.app` |
| Mobile | APK built locally against the test API | — |

Keep all three in the same region: each API request makes several database queries.

## How a release reaches the test site

```
feature branch ──CI──▶ dev ──(fast-forward)──▶ main ──▶ Render (after CI passes on main)
                                                   └──▶ Vercel (builds every push to main)
```

- Day-to-day work still goes to `dev` (D-035). To release: `git checkout main && git merge --ff-only dev && git push origin main`.
- **Render** deploys only after the `CI` workflow passes on that commit (`autoDeployTrigger: checksPass`) and only when API files changed (`buildFilter`). Pending Prisma migrations run when the new API starts (`prisma migrate deploy`).
- **Vercel** builds every push to `main`; other branches are skipped (`ignoreCommand`). Because `main` only receives commits that already passed CI on `dev`, this is safe.
- **Order:** the web can go live a minute before the API. Ship API changes that the web depends on in an earlier release, or accept a short window where a new page errors.
- **Rollback:** Render → service → Events → "Rollback" to a previous deploy; Vercel → Deployments → previous → "Promote to Production". A migration is not rolled back by either; fix forward with a new migration.

## One-time setup

### 1. Supabase (database, sign-in, images)

1. New project, name `sevenpalette-test`, region **Southeast Asia (Singapore)**, a strong database password (keep it in a password manager).
2. **JWT keys** (Project Settings → JWT Keys): the API verifies tokens with the JWKS and accepts **asymmetric keys only**. The current key must be **ECC (P-256)** or RSA. If it shows "Legacy HS256", create a standby asymmetric key and rotate to it.
3. **Authentication → Sign In / Providers:**
   - **Email:** enabled (platform admins sign in with email + password). Turn **Confirm email** on: public email sign-up cannot be switched off separately (question 51), and such accounts get no access anyway.
   - **Phone:** enabled. Supabase requires an SMS provider: choose Twilio and enter placeholder values (no real SMS is sent in the test environment).
   - **Test phone numbers** (Phone provider → "Test Phone Numbers and OTPs"): add the numbers testers use with a fixed code, e.g. `919999900001=123456`. Only these numbers can sign in until a real SMS vendor is chosen (question 46). Share the codes only with testers.
   - **URL configuration:** Site URL = the Vercel URL.
4. **Storage:** create bucket `shop-media`, **Public**, file size limit 5 MB, allowed MIME type `image/webp` (same as `infra/supabase/config.toml`).
5. **Storage → S3 configuration:** create an access key. Note the endpoint and region shown.
6. **Database → Connect:** copy the **Session pooler** URI (port 5432). Render has no IPv6, so the direct connection URL does not work there.

### 2. Render (API)

1. Dashboard → **New → Blueprint** → pick this GitHub repo, branch `main`. Render reads `render.yaml`.
2. Fill the variables it asks for:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Session pooler URI from step 1.6 (with the password filled in) |
| `AUTH_ISSUER` | `https://<ref>.supabase.co/auth/v1` |
| `AUTH_JWKS_URL` | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → **Secret** key (`sb_secret_…`). Server-only. |
| `STORAGE_S3_ENDPOINT` | `https://<ref>.storage.supabase.co/storage/v1/s3` |
| `STORAGE_S3_REGION` | the region shown in step 1.5, e.g. `ap-southeast-1` |
| `STORAGE_S3_ACCESS_KEY_ID` / `STORAGE_S3_SECRET_ACCESS_KEY` | from step 1.5 |
| `STORAGE_PUBLIC_BASE_URL` | `https://<ref>.supabase.co/storage/v1/object/public/shop-media` |

`NODE_ENV=production` and `STORAGE_BUCKET=shop-media` come from the blueprint. Production mode requires `https://` for the auth, Supabase and storage URLs and turns the Swagger docs off.

3. Wait for the first deploy, then open `https://<service>.onrender.com/health/ready` → `{"status":"ok","checks":{"database":"up"}}`. The first start applies all migrations.

### 3. Vercel (web portal)

1. **Add New → Project** → import the GitHub repo. **Root Directory: `apps/admin_web`**. Framework: Next.js. Leave build and install commands alone (they come from `vercel.json`).
2. Environment variables (Production):

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → **Publishable** key (`sb_publishable_…`) |
| `API_BASE_URL` | the Render URL, no trailing slash |

3. Project Settings → Git → **Production Branch: `main`**. Deploy.
4. Copy the Vercel URL into Supabase → Authentication → URL configuration → Site URL.

### 4. GitHub (keep-alive)

Repo → Settings → Secrets and variables → Actions → **Variables** → `API_BASE_URL` = the Render URL. The `Keep test environment awake` workflow then calls `/health/ready` every 10 minutes from about 06:30 to 22:30 IST, which keeps the API warm and the Supabase project from pausing. Run it once by hand (Actions → the workflow → Run workflow) to check.

### 5. First platform admin

Run the operator script from your computer against the hosted services (Render's shell is a paid feature). Variables set in the shell override `apps/api/.env`, so your local setup is untouched. In PowerShell:

```powershell
cd apps/api
# Same values as in Render (step 2). They live only in this terminal window.
$env:NODE_ENV = "production"
$env:DATABASE_URL = "<session pooler URI>"
$env:AUTH_ISSUER = "https://<ref>.supabase.co/auth/v1"
$env:AUTH_JWKS_URL = "https://<ref>.supabase.co/auth/v1/.well-known/jwks.json"
$env:SUPABASE_URL = "https://<ref>.supabase.co"
$env:SUPABASE_SECRET_KEY = "<secret key>"
$env:STORAGE_S3_ENDPOINT = "https://<ref>.storage.supabase.co/storage/v1/s3"
$env:STORAGE_S3_REGION = "ap-southeast-1"
$env:STORAGE_S3_ACCESS_KEY_ID = "<s3 access key id>"
$env:STORAGE_S3_SECRET_ACCESS_KEY = "<s3 secret>"
$env:STORAGE_PUBLIC_BASE_URL = "https://<ref>.supabase.co/storage/v1/object/public/shop-media"
pnpm platform-admin:create --email you@example.com   # asks for the password, hidden
```

Close the terminal afterwards. Optional sample brands: `pnpm catalogue:seed-sample` in the same window.

### 6. Mobile APK against the test API

```bash
cd apps/shop_app
cp config/local.example.json config/staging.json   # gitignored
# set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and API_BASE_URL to the hosted values
fvm flutter build apk --release --dart-define-from-file=config/staging.json
```

The APK is in `build/app/outputs/flutter-apk/app-release.apk`. Same for `apps/customer_app` once it has a config.

## Limits to know

- **Cold start:** the API sleeps after 15 minutes without requests; the first request then takes 30–60 s. The keep-alive covers daytime IST only.
- **Supabase Free:** 500 MB database, 1 GB images, about 5 GB egress a month, 50,000 monthly users; pauses after a week without database activity (restore from the dashboard). **No backups**: treat test data as disposable and do not invite real customers' private data. Export with `pg_dump` against the session pooler URL when needed.
- **Render Free:** 512 MB RAM, 750 instance hours a month per workspace.
- **Vercel Hobby:** for personal, non-commercial use. Fine for internal testing; before it is used to sell to or serve paying shops, move to Vercel Pro (US$20/month) or another host (D-052).
- **Maps:** OpenStreetMap community tiles are for light use only; move to a hosted tile provider before real traffic (`docs/guides/MAPS.md`).
- **OTP:** only the Supabase test numbers can sign in until a real SMS vendor is set up (question 46).

Prices and limits checked 2026-11-07 (re-check before relying on them): Render free web services and spin-down (render.com/docs/free), Supabase free-project pausing (supabase.com/kb/faqs/platform/free-project-pausing), Vercel fair use (vercel.com/docs/limits/fair-use-guidelines).
