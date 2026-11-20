# 02 — Architecture

## 1. Big picture

```
                    ┌──────────────────────────────┐
  Owner (phone /    │   Cloudflare Pages (static)  │
  laptop browser) ─▶│   React SPA — Admin Panel    │
                    └───────┬───────────────┬──────┘
                            │               │ signed upload (direct from browser)
             supabase-js    │               ▼
        (JWT, RLS-protected)│        ┌──────────────┐
                            │        │  Cloudinary  │  photos: gym/members/*
                            ▼        └──────▲───────┘
   ┌──────────────────────────────────────┐ │ signature
   │              SUPABASE                │ │
   │  Auth ─ owner login (email+password) │ │
   │  Postgres                            │ │
   │   ├ tables: members, plans,          │ │
   │   │  payments, reminders, settings   │ │
   │   ├ RLS: only admins                 │ │
   │   ├ RPC: record_payment(), stats()   │ │
   │   └ pg_cron (daily 09:00 local) ─┐   │ │
   │  Edge Functions (Deno)           │   │ │
   │   ├ cloudinary-sign ─────────────┼───┼─┘
   │   ├ cloudinary-delete            │   │
   │   └ send-reminders ◀─────────────┘   │
   └──────────────────┬───────────────────┘
                      │ (Phase 2 only)
                      ▼
            WhatsApp Cloud API (Meta)  ──▶  Member's WhatsApp

   GitHub Actions: CI (lint/test) · daily keep-alive ping · weekly DB backup
```

## 2. Key flows

### 2.1 Add a new member
1. Owner opens **Members → Add member**.
2. Picks/takes photo → browser compresses (≤800px) → requests signature from `cloudinary-sign` → uploads directly to Cloudinary → gets `public_id`.
3. Fills form (Zod-validated). Selecting a **plan** pre-fills fee and duration; owner can override fee (discounts).
4. Chooses **join date** and **first due date** (defaults: today and today + plan duration, or "paid now").
5. Optional checkbox **"Collect first payment now"** → saves member and calls `record_payment` in one go (admission fee can be added as a separate line).
6. Save → `members` row inserted → list refreshes.

### 2.2 Daily reminder job
1. `pg_cron` fires at 09:00 gym-local time → `pg_net` POSTs to `send-reminders` with a secret header.
2. Function loads `settings` (days-before list, templates, provider).
3. Selects **active** members where:
   - `next_due_date = today + N` for each N in `reminder_days_before` (e.g. 3 days before, on the day), or
   - overdue and `today - next_due_date` is a multiple of `overdue_repeat_days` (e.g. every 3 days, max X times).
4. For each, **insert into `reminders`** with unique `(member_id, due_date, kind)` — if insert conflicts, skip (idempotent).
5. Provider:
   - **Manual (`wa.me`, Phase 1):** row stays `pending` → appears in the app's **"Reminders to send"** queue; owner taps → WhatsApp opens pre-filled → app marks `sent`.
   - **Cloud API (Phase 2):** function sends template message → marks `sent` / `failed` with error.
6. Optional: a daily summary to the owner ("5 dues today, 3 overdue").

### 2.3 Record a payment
1. From member profile or the dues list: **Record payment**.
2. Amount defaults to member fee; method (Cash / Bank / JazzCash / Easypaisa / Other); date defaults to today; covers N months (default 1).
3. Calls RPC `record_payment(member_id, amount, months, method, paid_on, note)` — one transaction:
   - inserts `payments` row with `period_start = old next_due_date`, `period_end = old + months × plan duration`
   - updates `members.next_due_date = period_end`
   - marks any `pending` reminders for the old due date as `skipped`
4. Optional: "Send receipt on WhatsApp" button (wa.me link with receipt text).

### 2.4 Analytics
- Pure SQL (views / RPC functions) → returned as JSON → charts in Recharts.
- No data warehouse needed at this scale.

## 3. Security model
- **Auth:** Supabase email + password. Public sign-ups **disabled** in Supabase dashboard; owner account created manually.
- **Authorization:** table `admins(user_id)`; every RLS policy checks `is_admin()`. Even if someone gets the public anon key, they can read nothing.
- **Secrets** (Cloudinary API secret, WhatsApp token, cron secret) only in Supabase Edge Function secrets — never in the frontend.
- The frontend only has `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_CLOUDINARY_CLOUD_NAME` (all public-safe).
- Member data is personal data (phones, photos) → private by default, Cloudinary folder not listed publicly, "delete member" also deletes photo.

## 4. Why this shape
- **Zero servers to babysit**, nothing sleeps, all free.
- **Business rules in Postgres** (record_payment, stats) → consistent no matter which UI calls them, testable with SQL.
- **Provider abstraction** for WhatsApp → can start free and upgrade without rewrites.
