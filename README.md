# Gym Fee Manager

Admin panel for a gym owner: members with photos, fee due dates, WhatsApp reminders, payments and analytics.
Plan and decisions: [docs/](docs/README.md).

## Local development

Requires Node 22, pnpm, Docker and the Supabase CLI.

```bash
supabase start                 # local Postgres + Auth on ports 553xx (runs migrations + seed)
cd apps/web
cp .env.example .env.local     # then fill in the values printed by `supabase start`
pnpm install
pnpm dev                       # http://localhost:5173
```

Local test login (from `supabase/seed.sql`): `admin@gym.test` / `admin12345`.

| Command (in `apps/web`) | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm lint` / `pnpm typecheck` | oxlint / TypeScript |
| `pnpm build` | Production build to `dist/` |
| `pnpm db:types` | Regenerate `src/types/database.ts` after a migration |
| `supabase test db` (repo root) | Database tests for payment rules (pgTAP) |

Database changes: add a new file in `supabase/migrations/`, then `supabase db reset` locally.

## Progress

- [x] Phase 0 — setup, schema, login, layout
- [x] Phase 1 — members + photos (photo upload needs Cloudinary keys, see below)
- [x] Phase 2 — payments + due tracking
- [x] Phase 3 — WhatsApp reminders (manual one-tap sending; queue filled daily at 09:00 PKT by pg_cron)
- [x] Phase 4 — dashboard + analytics
- [x] Phase 5 — polish: installable app (PWA), CSV import/export, error screens, encrypted weekly backups, keep-alive
- [ ] Go live — follow [docs/08-deployment.md](docs/08-deployment.md)

## Cloudinary (member photos)

1. Create a free Cloudinary account, copy **cloud name**, **API key**, **API secret**.
2. Frontend: set `VITE_CLOUDINARY_CLOUD_NAME` in `apps/web/.env.local`.
3. Edge functions (local): copy `supabase/functions/.env.example` to `supabase/functions/.env`, fill all three, run `supabase functions serve`.
4. Production: `supabase secrets set CLOUDINARY_CLOUD_NAME=… CLOUDINARY_API_KEY=… CLOUDINARY_API_SECRET=…` and `supabase functions deploy cloudinary-sign cloudinary-delete`.
