# 08 — Deployment & Go-Live (all free)

This is the **as-built** guide: follow it top to bottom to put the app online.
Time needed: about 45–60 minutes the first time.

## 0. What goes where

| Piece | Service (free plan) | What you deploy |
|---|---|---|
| Database, login, daily reminder job | **Supabase** | `supabase/migrations/*` |
| Photo upload/delete functions | **Supabase Edge Functions** | `supabase/functions/cloudinary-*` |
| Member photos | **Cloudinary** | nothing to deploy, just keys |
| The website (admin panel) | **Cloudflare Pages** | `apps/web` (built automatically from GitHub) |
| Code, tests, keep-alive, backups | **GitHub** (private repo) | `.github/workflows/*` |

> Create the accounts with an email **the gym owner controls** (or transfer them later). The owner should own their data.

## 1. GitHub (5 min)
1. Create a **private** repository (private matters: backups and CI logs live there).
2. Push this project:
   ```bash
   git remote add origin git@github.com:<you>/<repo>.git
   git push -u origin main
   ```

## 2. Supabase (15 min)
1. supabase.com → New project. Region close to the gym (e.g. **Mumbai** or **Singapore** for Pakistan). Save the **database password**.
2. Link and push the database (from the repo root):
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push            # runs all migrations: tables, security rules, functions, daily 9 AM job
   ```
   Do **not** run `seed.sql` on production (it contains test data and a test login).
3. **Authentication → Sign In / Providers**: keep Email on, turn **off "Allow new users to sign up"**.
   **Authentication → URL Configuration**: Site URL = your Cloudflare URL (step 4), so password-reset links work.
4. Create the owner's login: **Authentication → Users → Add user** (email + strong password, "Auto confirm" on). Copy the user's **UID**, then in **SQL Editor**:
   ```sql
   insert into public.admins (user_id, full_name) values ('<UID>', 'Owner name');
   update public.settings set gym_name = 'Your Gym Name', gym_phone = '+92…' where id = 1;
   ```
   Then add your plans in the app (Settings → Plans).
5. Edge functions + Cloudinary secrets (after step 3 below):
   ```bash
   supabase secrets set CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
   supabase functions deploy cloudinary-sign cloudinary-delete
   ```
   (`verify_jwt = false` in `supabase/config.toml` is intentional: the functions check the admin themselves.)
6. Check the reminder job exists: SQL Editor → `select jobname, schedule from cron.job;` → `daily-fee-reminders | 0 4 * * *` (04:00 UTC = 09:00 PKT).
   *Gym not in Pakistan?* `select cron.alter_job((select jobid from cron.job where jobname='daily-fee-reminders'), schedule := '0 X * * *');` with X = 9 AM local in UTC. Also set the timezone in Settings → Gym profile.
7. **Project Settings → API**: copy the **Project URL** and the **publishable (anon) key**.

## 3. Cloudinary (5 min)
1. cloudinary.com → free account. Dashboard shows **Cloud name**, **API key**, **API secret**.
2. Nothing else to configure: uploads are signed by our edge function into folder `gym/members`.

## 4. Cloudflare Pages (10 min)
1. dash.cloudflare.com → Workers & Pages → Create → Pages → **Connect to Git** → choose the repo.
2. Build settings:
   - Framework preset: *None*
   - Root directory: `apps/web`
   - Build command: `pnpm install --frozen-lockfile && pnpm build`
   - Build output: `dist`
   - Environment variable `NODE_VERSION` = `22`
3. Environment variables (Production):
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   VITE_CLOUDINARY_CLOUD_NAME=<cloud name>
   ```
   These are public by design (security comes from login + database rules). **Never** put the Cloudinary API secret or the database password here.
4. Deploy. Every push to `main` redeploys; other branches get preview URLs.
5. Optional: Custom domains → `admin.yourgym.com` (free HTTPS).
6. Put the final URL into Supabase → Authentication → URL Configuration → Site URL.

**As deployed:** Cloudflare now offers the *Workers* flow first. That is used here (also free): `apps/web/wrangler.jsonc` serves `dist/` as static assets with single-page-app routing.
In the Workers setup screen: Build command `pnpm install --frozen-lockfile && pnpm build`, Deploy command `npx wrangler deploy`, Advanced settings → Path `apps/web`, and add the variables above (plus `NODE_VERSION=22`) as **build variables**.

`apps/web/public/_headers` (security + caching) is picked up automatically.

## 5. GitHub Actions: keep-alive and backups (5 min)
Repo → Settings → Secrets and variables → Actions.

**Variables** (not secret):
| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | publishable key |

**Secrets**:
| Name | Value |
|---|---|
| `SUPABASE_DB_URL` | Supabase → Connect → *Session pooler* connection string, with the password filled in |
| `BACKUP_PASSPHRASE` | a long random passphrase. **Store it in the owner's password manager**: without it backups can't be opened |

Then Actions → run **keep-alive** and **weekly-backup** once by hand (*Run workflow*) and check both are green.
The workflows skip themselves until `SUPABASE_URL` is set, so CI stays green before go-live.

### Restoring a backup
```bash
# download db-backup artifact from the Actions run, then:
gpg --decrypt backup_2026-11-22.sql.gz.gpg | gunzip > backup.sql
psql "<connection string of a NEW, empty Supabase project>" -f backup.sql
```
Restore into a fresh project, check it, then point Cloudflare's env vars at it.

## 6. Go-live checklist
- [ ] Sign-ups disabled; only the owner (and staff) in `public.admins`
- [ ] Supabase → Advisors → Security: no "RLS disabled" warnings
- [ ] Logged in on the live URL from a phone, installed it (Share → *Add to Home Screen* on iPhone, menu → *Install app* on Android)
- [ ] Plans created; a test member added with a photo, photo shows; test member deleted (photo removed in Cloudinary Media Library)
- [ ] Existing members imported (Settings → Your data → Import) and due dates checked with the owner
- [ ] Next morning after 9 AM: reminders appear in **Dues → To send**
- [ ] One real reminder sent to the owner's own number via the WhatsApp button
- [ ] keep-alive and weekly-backup workflows ran green once; passphrase saved
- [ ] Owner has read `docs/owner-guide.md`

## 7. Monthly cost
| Item | Cost |
|---|---|
| Cloudflare Pages, Supabase Free, Cloudinary Free, GitHub Free | 0 |
| WhatsApp (manual one-tap sending) | 0 |
| Custom domain (optional) | ~$10/year |
| WhatsApp Cloud API (optional, later) | Meta's per-message fee |

## 8. Free-plan limits to keep an eye on
- **Supabase**: 500 MB database (years of data for one gym), pauses after ~7 days idle (prevented by the daily job + keep-alive). No automatic backups on free, which is why the weekly-backup workflow exists.
- **Cloudinary**: monthly credits; photos are compressed to ~100 KB, so hundreds of members use a tiny fraction.
- **Cloudflare Pages**: 500 builds/month; unlimited visits.
