# 06 — Code Structure & Conventions

## 1. Repository layout (single repo)

```
gym-fee-manager/
├── apps/
│   └── web/                          # React SPA (Vite)
│       ├── public/                   # favicon, PWA icons, manifest
│       ├── src/
│       │   ├── app/
│       │   │   ├── router.tsx        # routes + auth guard
│       │   │   ├── providers.tsx     # QueryClient, Theme, Toaster
│       │   │   └── layouts/
│       │   │       ├── AppLayout.tsx # sidebar / bottom nav
│       │   │       └── AuthLayout.tsx
│       │   ├── features/             # ⭐ feature-first folders
│       │   │   ├── auth/
│       │   │   │   ├── api.ts
│       │   │   │   ├── hooks.ts      # useSession, useSignIn
│       │   │   │   └── pages/LoginPage.tsx
│       │   │   ├── members/
│       │   │   │   ├── api.ts        # supabase calls only
│       │   │   │   ├── hooks.ts      # useMembers, useMember, useCreateMember…
│       │   │   │   ├── schema.ts     # Zod schemas + inferred types
│       │   │   │   ├── utils.ts      # getDueStatus(), formatPhone()
│       │   │   │   ├── components/   # MemberForm, MemberCard, MemberTable, DueBadge
│       │   │   │   └── pages/        # MembersPage, MemberDetailPage, MemberFormPage
│       │   │   ├── payments/         # RecordPaymentDialog, PaymentsPage…
│       │   │   ├── reminders/        # ReminderQueue, waLink(), renderTemplate()
│       │   │   ├── dashboard/
│       │   │   ├── analytics/
│       │   │   ├── plans/
│       │   │   └── settings/
│       │   ├── components/
│       │   │   ├── ui/               # shadcn/ui generated components
│       │   │   └── shared/           # PageHeader, EmptyState, Money, DateText, ImageUpload, ConfirmDialog
│       │   ├── lib/
│       │   │   ├── supabase.ts       # createClient<Database>()
│       │   │   ├── cloudinary.ts     # upload(), imageUrl(publicId, preset)
│       │   │   ├── queryKeys.ts      # central query key factory
│       │   │   ├── format.ts         # money, date, phone formatters
│       │   │   └── env.ts            # Zod-validated import.meta.env
│       │   ├── types/
│       │   │   └── database.ts       # generated: supabase gen types
│       │   ├── styles/globals.css
│       │   └── main.tsx
│       ├── tests/                    # vitest + testing-library
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── package.json
├── supabase/
│   ├── config.toml
│   ├── migrations/                   # timestamped SQL (schema, RLS, functions, cron)
│   ├── seed.sql                      # dev seed data
│   ├── tests/                        # pgTAP tests for record_payment, stats
│   └── functions/
│       ├── _shared/
│       │   ├── supabaseAdmin.ts
│       │   ├── cors.ts
│       │   ├── auth.ts               # requireAdmin(req) / requireCronSecret(req)
│       │   ├── template.ts           # renderTemplate()
│       │   └── messaging/
│       │       ├── types.ts          # MessagingProvider interface
│       │       ├── manual.ts
│       │       ├── cloudApi.ts
│       │       └── index.ts          # getProvider(settings)
│       ├── cloudinary-sign/index.ts
│       ├── cloudinary-delete/index.ts
│       └── send-reminders/index.ts
├── .github/workflows/
│   ├── ci.yml                        # lint, typecheck, test, build
│   ├── keep-alive.yml                # daily ping Supabase
│   └── backup.yml                    # weekly pg_dump
├── docs/                             # ← these planning docs
├── .env.example
├── .editorconfig
├── .prettierrc
└── README.md
```

> A monorepo tool (Turborepo/pnpm workspaces) is **optional**. With one app it's enough to use `pnpm` at the root of `apps/web`. Keep the `apps/` folder so a future member-facing app or landing page can be added without restructuring.

## 2. Layering rule (inside each feature)

```
pages  →  components  →  hooks (TanStack Query)  →  api.ts (supabase calls)  →  Supabase
                           ↑
                        schema.ts (Zod types used everywhere)
```

- **Components never call Supabase directly.** Only `api.ts` does.
- **Hooks** own query keys, caching and invalidation.
- **Business rules** that must be correct (payments, due dates) live in **Postgres functions**; the frontend only previews them (e.g. "new due date") using the same logic in `utils.ts`.

Example:

```ts
// features/payments/api.ts
export async function recordPayment(input: RecordPaymentInput) {
  const { data, error } = await supabase.rpc('record_payment', {
    p_member_id: input.memberId,
    p_amount: input.amount,
    p_months: input.months,
    p_method: input.method,
    p_paid_on: input.paidOn,
    p_note: input.note ?? null,
  });
  if (error) throw error;
  return data;
}

// features/payments/hooks.ts
export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recordPayment,
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.members.detail(v.memberId) });
      qc.invalidateQueries({ queryKey: queryKeys.members.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Payment recorded');
    },
  });
}
```

## 3. Conventions

| Topic | Rule |
|-------|------|
| Language | TypeScript `strict: true`, no `any` |
| Package manager | pnpm |
| Lint / format | ESLint (typescript-eslint, react-hooks) + Prettier; `lint-staged` + `husky` pre-commit |
| Naming | Components `PascalCase.tsx`; hooks `useX`; files otherwise `camelCase.ts`; DB `snake_case` |
| Types | DB types generated: `supabase gen types typescript --local > src/types/database.ts`. Never hand-write table types. |
| Forms | React Hook Form + `zodResolver`; one Zod schema per form in `schema.ts` |
| Dates | Store `date` (no time) for due/paid dates; use `date-fns` in UI; never `new Date('2026-11-19')` without timezone care — use `parseISO` |
| Money | `numeric` in DB → `number` in TS; format only at display time with `<Money />` |
| Env | Validate `import.meta.env` with Zod at startup (`lib/env.ts`) |
| Errors | Throw in `api.ts`; show via toast in mutation `onError`; route-level error boundary |
| Commits | Conventional commits: `feat(members): add photo upload` |
| Branches | `main` (production) ← `dev` ← `feat/*` ; Cloudflare gives preview URL per branch |

## 4. Testing strategy (lightweight, small project)

| Layer | Tool | What |
|-------|------|------|
| DB logic | **pgTAP** (`supabase test db`) | `record_payment` rolls due date correctly, RLS blocks non-admins, stats numbers |
| Pure utils | **Vitest** | `getDueStatus`, `renderTemplate`, `toWaLink`, phone normalisation |
| Components | Vitest + Testing Library | MemberForm validation, RecordPaymentDialog preview |
| E2E (optional, Phase 3) | Playwright | Login → add member → record payment |
| Edge functions | Deno test | Reminder candidate selection + idempotency |

## 5. Key libraries (apps/web)

```
react, react-dom, react-router-dom
@supabase/supabase-js
@tanstack/react-query, @tanstack/react-table
react-hook-form, zod, @hookform/resolvers
tailwindcss, shadcn/ui (radix), lucide-react, sonner, clsx, tailwind-merge
recharts
date-fns
libphonenumber-js
browser-image-compression        # client-side photo compression
vite-plugin-pwa                  # Phase 3
dev: vitest, @testing-library/react, eslint, prettier, husky, lint-staged
```
