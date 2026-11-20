# Gym Fee Manager — Project Plan

An admin-only web app for a gym owner to:

1. Add members (personal details + photo + plan + fee + due date)
2. Get **automatic WhatsApp reminders** sent when a member's fee is due
3. Record payments, which moves the member's next due date forward
4. See **analytics**: earnings, fees collected vs. expected, outstanding dues, member growth

Later (out of scope for v1): expense tracking → profit/loss.

Constraint: **everything runs on free tiers** (hosting, database, images, scheduler).

---

## Read in this order

| # | Doc | What it answers |
|---|-----|-----------------|
| 01 | [R&D and tech stack](01-rnd-tech-stack.md) | What we use, why, and the honest limits of each free tier |
| 02 | [Architecture](02-architecture.md) | How the pieces connect, request flows |
| 03 | [Database schema](03-database-schema.md) | Tables, relations, SQL, RLS, business rules |
| 04 | [WhatsApp reminders](04-whatsapp-reminders.md) | The hardest part: free vs. paid options, the chosen design |
| 05 | [UI/UX](05-ui-ux.md) | Screens, navigation, components, design rules |
| 06 | [Code structure](06-code-structure.md) | Folder layout, conventions, libraries |
| 07 | [Phases / roadmap](07-phases-roadmap.md) | Build order with checklists and "done" criteria |
| 08 | [Deployment](08-deployment.md) | Accounts to create, env vars, CI, go-live checklist |
| — | [Owner's guide](owner-guide.md) | One-page daily how-to for the gym owner |

---

## The stack at a glance

| Layer | Choice | Cost |
|-------|--------|------|
| Frontend | React + Vite + TypeScript + Tailwind + shadcn/ui | — |
| Hosting | Cloudflare Pages | Free (commercial use allowed) |
| Backend | **No separate server.** Supabase (Postgres + Auth + Edge Functions) | Free plan |
| Images | Cloudinary | Free plan |
| Scheduler | Supabase `pg_cron` (+ GitHub Actions as keep-alive/backup) | Free |
| WhatsApp | Phase 1: one-tap `wa.me` links (free, zero risk). Phase 2: optional full automation (see doc 04) | Free / pennies |

## The one thing to know before starting

**"Fully automatic WhatsApp" is the only part that is not truly free and safe at the same time.**
Official WhatsApp (Meta Cloud API) charges per reminder message (small amounts, but not zero).
Unofficial free libraries work but can get the gym's number banned and need a 24/7 server.
Doc 04 explains this and the plan handles it by building in a way that lets you switch providers with one setting.
