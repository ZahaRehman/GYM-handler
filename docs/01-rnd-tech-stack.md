# 01 — R&D and Tech Stack

> Free-tier limits change. Everything below was correct as far as we know in late 2026 — re-check each provider's pricing page on the day you create the accounts.

## 1. Requirements recap

| Requirement | Notes |
|-------------|-------|
| Admin login | Only the owner (maybe 1–2 staff later). No member-facing app. |
| Member CRUD | Name, phone (WhatsApp), photo, gender, DOB, address, emergency contact, join date, plan, fee, due date, notes |
| Photo upload | Cloudinary (requested) |
| Due-date reminders | Automatically send WhatsApp on/before due date |
| Record payment | Owner marks fee paid → due date rolls forward |
| Analytics | Revenue per month, collected vs. pending, defaulters, active/inactive members, new joins |
| Cost | ₹0 / Rs 0 / $0 for hosting, DB, images |
| Scale | Small: ~50–500 members |

---

## 2. Database — Supabase free plan

**Is it "free for life"?** Yes, the Free plan has no time limit, **but** with conditions:

| Limit | Free plan | Is it enough for us? |
|-------|-----------|----------------------|
| Database size | 500 MB | Yes. 500 members × years of payments ≈ a few MB. Photos are NOT stored here (Cloudinary). |
| File storage | 1 GB | Not used (Cloudinary instead) |
| Auth users | 50,000 MAU | Yes (1–3 admins) |
| Edge Function invocations | ~500k / month | Yes (we need ~30/month for cron + a few hundred for image signing) |
| Egress | ~5 GB / month | Yes |
| Free projects | 2 active per account | Fine |
| **Pausing** | **Project pauses after ~7 days with no activity** | ⚠️ Must handle — see below |
| Backups | No automatic downloadable backups on free | ⚠️ Must handle — see below |

**Mitigations**
- **Pausing:** A daily scheduled job hits the database every day anyway (the reminder job). We also add a free **GitHub Actions** daily workflow that pings the API — belt and braces. A gym owner will open the panel most days too.
- **Backups:** A weekly GitHub Actions workflow runs `pg_dump` (via `supabase db dump`) and stores the file as a private artifact / in a private repo. Also a "Export to CSV" button in the app.

**Why Supabase over alternatives**
- Postgres = real SQL for analytics (GROUP BY month, SUM etc.) — much easier than Firebase.
- Built-in Auth, Row Level Security, Edge Functions and `pg_cron` → **we don't need a separate backend server at all**, which removes the hardest "free hosting" problem (free Node servers like Render sleep after 15 min).

## 3. Backend — do we need one?

**No separate backend.** The whole "backend" is:

| Need | Where it runs |
|------|---------------|
| CRUD for members/payments | Supabase client directly from the browser, protected by **RLS** (only logged-in admins can read/write) |
| Business logic that must be atomic (record payment + roll due date) | **Postgres function** (`rpc('record_payment')`) |
| Analytics queries | **Postgres views / functions** |
| Cloudinary signed uploads (needs a secret) | **Supabase Edge Function** `cloudinary-sign` |
| Daily reminder job | **`pg_cron`** → calls Edge Function `send-reminders` |
| WhatsApp sending | Inside `send-reminders` Edge Function |

This is simpler, free, and has nothing that "sleeps".

## 4. Frontend

| Choice | Why |
|--------|-----|
| **React 18 + Vite + TypeScript** | Admin panel = no SEO needed → a plain SPA is simplest and hosts free anywhere as static files. |
| **Tailwind CSS + shadcn/ui** | Fast, clean, consistent admin UI; components are copied into the repo (no lock-in). |
| **TanStack Query** | Caching, loading/error states, refetch after mutations. |
| **React Router** | Routing. |
| **React Hook Form + Zod** | Forms + validation; Zod schemas shared with types. |
| **Recharts** | Charts for analytics. |
| **TanStack Table** | Members / payments tables with sort, filter, pagination. |
| **date-fns** | Date math (due dates, months). |
| **sonner** | Toasts. |

**Why not Next.js?** It works too, but brings server concepts we don't need. If you prefer Next.js, host on Vercel — note Vercel's free **Hobby plan is for non-commercial use only**; a gym's business tool is commercial, so Cloudflare Pages (commercial allowed on free) is the safer choice.

## 5. Hosting — Cloudflare Pages

- Free, unlimited bandwidth for static sites, commercial use OK, custom domain + HTTPS free.
- Auto-deploys from GitHub on every push; preview URL per branch.
- Alternative: Netlify free (also fine).

## 6. Images — Cloudinary free plan

- Free plan gives a monthly "credits" allowance (~25 credits, where 1 credit ≈ 1 GB storage or 1 GB bandwidth or 1,000 transformations). Hundreds of member photos at ~100 KB each is a tiny fraction.
- **Compress before upload** in the browser (max 800px, WebP/JPEG ~80%) → each photo ≈ 50–150 KB.
- Display with transformation URLs (`c_fill,w_96,h_96,g_face,f_auto,q_auto`) for thumbnails — face-crop for free.
- **Signed uploads** via Edge Function (API secret never in the browser). Uploads go to folder `gym/members/`.
- Store in DB: `photo_public_id` (+ optional `photo_url`). Delete via Edge Function when a member is deleted/photo replaced.

## 7. WhatsApp — the critical R&D item

Summary (full detail in [04-whatsapp-reminders.md](04-whatsapp-reminders.md)):

| Option | Free? | Fully automatic? | Risk | Verdict |
|--------|-------|------------------|------|---------|
| **A. `wa.me` click-to-chat links** | ✅ 100% | ❌ One tap per member (owner taps "Send", WhatsApp opens with message pre-filled) | None | **Phase 1** |
| **B. Meta WhatsApp Cloud API (official)** | ❌ Pay per business-initiated template message (cheap — fractions of a cent to a few cents depending on country) | ✅ | None (official) | **Phase 2 recommended** if owner accepts a small monthly cost |
| **C. Unofficial (Baileys / whatsapp-web.js)** | ✅ software is free | ✅ | ⚠️ Against WhatsApp ToS → number can be banned; needs an always-on server (free hosts sleep) | Possible, not recommended for a business number |
| **D. Third-party gateways (Twilio, WATI, etc.)** | ❌ Meta fee + markup | ✅ | None | More expensive than B |

**Decision:** Build a `MessagingProvider` interface. Ship with **Option A** (free, works day 1, plus an in-app "Due today" queue). Add **Option B** as a drop-in provider when the owner is ready. Option C can be plugged in the same way if the owner explicitly accepts the risk.

## 8. Scheduler (cron)

| Option | Free | Notes |
|--------|------|-------|
| **Supabase `pg_cron` + `pg_net`** | ✅ | Runs inside the DB, calls our Edge Function daily. **Primary.** |
| GitHub Actions `schedule` | ✅ | Can be delayed a few minutes; good as keep-alive + backup trigger. |
| Vercel Cron (Hobby) | ✅ (1/day) | Only if on Vercel. |
| cron-job.org | ✅ | External fallback. |

The job must be **idempotent** (running twice must not send twice) — enforced with a unique constraint in the `reminders` table.

## 9. Final stack

```
Frontend:   React + Vite + TS + Tailwind + shadcn/ui + TanStack Query/Table + RHF + Zod + Recharts
Hosting:    Cloudflare Pages (free)
Backend:    Supabase — Postgres, Auth, RLS, RPC functions, Edge Functions (Deno), pg_cron
Images:     Cloudinary (signed uploads, auto face-crop thumbnails)
WhatsApp:   Phase 1 wa.me links → Phase 2 Meta Cloud API (pluggable)
CI/CD:      GitHub + GitHub Actions (lint, typecheck, test, keep-alive, weekly backup)
```
