# 07 — Phases / Roadmap

Small project → **5 short phases**, each ends with something the owner can actually use.
Estimates assume one developer part-time; adjust freely.

```
Phase 0  Setup & foundations        ~2–3 days
Phase 1  Members + photos           ~4–5 days
Phase 2  Payments + due tracking    ~3–4 days   ← MVP usable at the gym after this
Phase 3  WhatsApp reminders         ~3–4 days
Phase 4  Dashboard + analytics      ~3–4 days
Phase 5  Polish, PWA, go-live       ~2–3 days
Later    Expenses, Cloud API, staff roles
```

---

## Phase 0 — Setup & foundations
**Goal:** empty app deployed, login works.

- [ ] Create accounts: GitHub, Supabase, Cloudinary, Cloudflare (see doc 08)
- [ ] Create repo with layout from doc 06; Vite + React + TS + Tailwind + shadcn/ui
- [ ] ESLint, Prettier, husky, Vitest; CI workflow (lint/typecheck/test/build)
- [ ] Supabase CLI: `supabase init`, local dev with `supabase start` (Docker)
- [ ] Migration 001: enums, `admins`, `is_admin()`, `settings`, `plans`, `members`, `payments`, `reminders`, RLS
- [ ] Generate DB types
- [ ] Auth: login page, session hook, protected routes, logout; disable public sign-ups
- [ ] App layout: sidebar (desktop) + bottom nav (mobile), theme, toasts
- [ ] Deploy to Cloudflare Pages; link production Supabase project

**Done when:** owner can log in on the live URL and sees an empty dashboard; a non-admin user gets nothing from the API.

## Phase 1 — Members + photos
**Goal:** owner can register all members with photos.

- [ ] Plans CRUD (Settings → Plans) + seed default plans
- [ ] Edge Function `cloudinary-sign` (admin-only) + `lib/cloudinary.ts`
- [ ] `ImageUpload` component: camera/upload, square crop, compress, progress, replace/remove
- [ ] Member form (create/edit) with Zod validation, phone normalisation, plan → fee prefill, due date default
- [ ] Members list: search, status filters, sort, pagination, desktop table / mobile cards
- [ ] Member profile page (details tab)
- [ ] Status actions: pause, mark as left, delete (+ `cloudinary-delete`)
- [ ] `getDueStatus()` util + `DueBadge` component (+ tests)

**Done when:** 20 real members can be added from a phone in < 1 min each, with photos showing as face-cropped thumbnails.

## Phase 2 — Payments + due tracking (MVP)
**Goal:** the gym can stop using the paper register for fees.

- [ ] SQL: `record_payment()`, `undo_payment()` + pgTAP tests (rolling dates, multi-month, late payment, month-end like 31 Jan → 28 Feb)
- [ ] Record Payment dialog/bottom-sheet with new-due-date preview
- [ ] "Paid now" option in Add Member flow
- [ ] Member profile → Payments timeline, undo latest
- [ ] Payments page: filters, totals, CSV export
- [ ] Members list quick filters: Overdue / Due today / Due soon

**Done when:** recording a payment takes ≤ 3 taps and the member's status/due date updates instantly and correctly.

## Phase 3 — WhatsApp reminders
**Goal:** nobody forgets a due fee.

- [ ] Settings → Reminders (days before, overdue repeat, max) and Messages (templates + live preview)
- [ ] `renderTemplate()` + `toWaLink()` utils (+ tests)
- [ ] Messaging provider interface + `manual` provider
- [ ] Edge Function `send-reminders` (candidate selection, idempotent insert, provider call)
- [ ] `pg_cron` daily schedule + secret in Vault; "Run now" admin button
- [ ] Dues & Reminders page: To send queue, Overdue, This week, History
- [ ] One-tap WhatsApp from member profile/list; "Send receipt" after payment
- [ ] Dashboard card "Reminders to send today (N)"

**Done when:** at 9 AM each day the queue fills automatically, and the owner can clear it in about a minute; running the job twice creates no duplicates.

## Phase 4 — Dashboard + analytics
**Goal:** owner sees how the business is doing.

- [ ] SQL: `dashboard_stats()`, `revenue_by_month()`, method/plan splits, member growth
- [ ] Dashboard KPIs (collected, pending, overdue, active, new) with month picker and vs-last-month delta
- [ ] Charts: revenue by month, method split, plan split, members over time
- [ ] Analytics page with date range + CSV exports
- [ ] Top overdue list

**Done when:** the dashboard numbers match a manual count of the seed data (write a test for this).

## Phase 5 — Polish & go-live
- [ ] PWA (installable, icons, offline shell)
- [ ] Empty states, skeletons, error boundaries, 404
- [ ] Accessibility pass (labels, focus, contrast), test at 375px and desktop
- [ ] GitHub Actions: daily keep-alive + weekly DB backup
- [ ] Settings → Data: export all CSV
- [ ] Custom domain (optional) on Cloudflare
- [ ] Import existing members from Excel/CSV (very useful for onboarding an existing gym)
- [ ] Owner training: 15-min walkthrough + a 1-page "how to" guide
- [ ] Go-live checklist (doc 08)

---

## Later (post-v1 backlog)

| Item | Notes |
|------|-------|
| **Expense tracking** | Tables `expense_categories`, `expenses(amount, category_id, spent_on, note, receipt_public_id)`; analytics: profit = revenue − expenses per month; P&L chart |
| **WhatsApp Cloud API provider** | Switch `whatsapp_provider = 'cloud_api'` once Meta setup + templates are approved (doc 04) |
| Staff accounts & roles | `admins.role` = owner/staff; staff can't delete or see analytics |
| Attendance check-in | QR per member, check-in log |
| Member self-service page | View dues via a private link |
| Online payment links | JazzCash/Easypaisa/Stripe links in reminder message |
| Multi-branch | `branch_id` on members/payments |
| Birthday wishes | Reuse reminder engine with a new `kind` |

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Supabase free project pauses | Daily cron + GitHub keep-alive; owner uses it daily |
| Data loss (no backups on free) | Weekly `pg_dump` via GitHub Actions + CSV export |
| WhatsApp not fully automatic for free | Manual queue (fast) now; Cloud API later; clear expectations with the owner |
| Timezone bugs in due dates | DB timezone = gym timezone; `date` columns; tests around month ends |
| Free-tier limits change | Architecture is portable (plain Postgres + static site) — can move to any host |
| Wrong payment recorded | `undo_payment` for latest payment; payments are never edited silently |
