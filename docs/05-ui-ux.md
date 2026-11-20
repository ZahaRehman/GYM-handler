# 05 — UI / UX

## 1. Who uses it and how
- **Gym owner / front-desk staff**, often on a **phone** at the counter, sometimes a laptop.
- Not very technical → big buttons, few steps, clear colours for money states.
- Most common actions (optimise these to ≤ 3 taps):
  1. **Record a payment** for a member who just paid
  2. **Send today's reminders**
  3. **Add a new member**
  4. **Find a member** (by name, phone or member #)

→ **Mobile-first** design, tested at 375px width, then enhanced for desktop.

## 2. Navigation

| Desktop | Mobile |
|---------|--------|
| Left sidebar (collapsible) | Bottom tab bar (5 items) + floating "+" button |

Items:
1. **Dashboard** (`/`)
2. **Members** (`/members`)
3. **Dues & Reminders** (`/dues`) — badge with count to send
4. **Payments** (`/payments`)
5. **Analytics** (`/analytics`)
6. **Settings** (`/settings`) — in a user menu on mobile

Global: **Search** (⌘K / search icon) → jump to any member. Quick-add "+" → Add member / Record payment.

## 3. Screens

### 3.1 Login
Gym logo + name, email, password, "Show password". No sign-up link. Forgot password via Supabase email.

### 3.2 Dashboard
```
┌───────────────────────────────────────────────┐
│ Good morning 👋   November 2026  [month ▾]     │
├──────────┬──────────┬──────────┬──────────────┤
│Collected │ Pending  │ Overdue  │ Active       │
│Rs 145,000│Rs 36,000 │ 9 members│ 112 members  │
│▲12% vs Oct│ 12 dues │Rs 27,000 │ +8 new       │
├──────────┴──────────┴──────────┴──────────────┤
│ 📲 Reminders to send today (7)   [Open queue] │
├───────────────────────┬───────────────────────┤
│ Revenue – last 6 mo   │ Due today / this week │
│ ▂▃▅▆▅█ (bar chart)    │ (avatar) Ali  Rs3000 [Paid] │
│                       │ (avatar) Sara Rs3000 [Paid] │
├───────────────────────┴───────────────────────┤
│ Recent payments (5)                 [See all] │
└───────────────────────────────────────────────┘
```

### 3.3 Members list
- Search box + filter chips: **All · Paid · Due soon · Due today · Overdue · Paused · Left**; plan filter.
- Desktop: table (photo, #code, name, phone, plan, fee, next due, status badge, actions).
- Mobile: cards (photo, name, status badge, due date, quick "Paid" button).
- Row actions: Record payment, WhatsApp, Edit, View.
- Pagination (25/page) or infinite scroll; sort by due date (default), name, join date.

### 3.4 Add / Edit member (single page, sectioned form)
1. **Photo** — circle drop zone: "Take photo" (mobile camera via `capture="user"`) / "Upload"; crop square before upload; progress indicator.
2. **Personal** — full name*, phone* (country code default), gender, DOB, CNIC, address.
3. **Emergency contact** — name, phone.
4. **Membership** — plan* (select pre-fills fee), fee* (editable, shows "discount Rs 500" if lower than plan), join date*, first due date* (auto = join + plan duration).
5. **First payment** — toggle "Paid now" → amount, method. Admission fee field (optional).
6. Notes.
Sticky footer: [Cancel] [Save member]. Unsaved-changes guard.

### 3.5 Member profile
- Header: big photo, name, #code, status badge, phone (tap to call), WhatsApp button.
- Cards: Plan & fee · Next due date (with countdown "in 3 days" / "5 days overdue" in red) · Member since.
- **Primary button: Record payment**.
- Tabs: **Payments** (timeline) · **Reminders** (sent log) · **Details**.
- Menu: Edit, Pause membership, Mark as left, Delete (type name to confirm).

### 3.6 Record payment (dialog / bottom sheet)
- Member mini-header (photo, name, current due date).
- Amount (default = fee) · Months covered (1, 2, 3, 6, 12 stepper) · Method (segmented: Cash / Bank / JazzCash / Easypaisa / Other) · Date (today) · Note.
- Live preview: **"New due date: 19 Dec 2026"**.
- [Save] → toast "Payment recorded" + optional [Send receipt on WhatsApp].
- Undo available for latest payment.

### 3.7 Dues & Reminders
- Tabs: **To send (7)** · **Overdue** · **Due this week** · **History**.
- "To send": each row → photo, name, amount, due date, message preview, [Send on WhatsApp] [Mark paid] [Skip].
- "Send all" mode on desktop opens them one by one (next row auto-focuses after each click).
- History: filter by date/status, shows provider + error for failed.

### 3.8 Payments
Table of all payments, filters (date range, method, plan), totals row, **Export CSV**.

### 3.9 Analytics
- Date range picker (This month, Last 3/6/12 months, custom).
- Charts:
  - Revenue by month (bar) with "collected vs expected"
  - Payment methods split (donut)
  - Revenue by plan (bar)
  - Active members over time + new joins vs. left (line)
  - Collection rate % (paid on time vs late)
- Tables: Top overdue members, members leaving soon (no payment > 2 cycles).
- Export CSV of each.

### 3.10 Settings
- **Gym profile:** name, logo, phone, currency, timezone.
- **Plans:** CRUD.
- **Reminders:** days before (chips: 7, 3, 1, 0), overdue repeat every N days, max overdue reminders, send time (informational).
- **Messages:** template editor with placeholder chips + live WhatsApp-style preview.
- **WhatsApp provider:** Manual / Cloud API (status: connected ✔) / Unofficial.
- **Users:** (later) invite staff.
- **Data:** Export all (CSV), last backup date.

## 4. Visual design system

| Token | Value |
|-------|-------|
| Font | Inter (UI), tabular numbers for money |
| Radius | 12px cards, 8px inputs |
| Spacing | 4px grid; page padding 16px mobile / 24px desktop |
| Primary | Brand colour (e.g. deep green / orange — gym-like energetic), configurable |
| Status: Paid | Green |
| Status: Due soon | Amber |
| Status: Due today | Orange |
| Status: Overdue | Red |
| Status: Paused / Left | Grey |
| Dark mode | Supported via shadcn theme tokens |

Rules:
- Money always formatted with currency + thousands separators (`Rs 3,000`) via `Intl.NumberFormat`.
- Dates human-friendly (`19 Nov 2026`, "in 3 days", "5 days overdue").
- Status always shown as **badge with text + colour** (not colour alone → accessibility).
- Every list has an **empty state** with a call-to-action ("No members yet — Add your first member").
- **Skeleton loaders**, not spinners, for lists/cards.
- Destructive actions → confirmation dialog; non-destructive → toast with **Undo**.
- Touch targets ≥ 44px. Forms use correct mobile keyboards (`inputmode="tel"`, `numeric`).
- Installable as **PWA** (home-screen icon on owner's phone) — Phase 3.

## 5. UX details that matter
- Member photo everywhere a member appears → staff recognise faces quickly.
- Search matches name, phone (with/without 0/+92) and member code.
- After saving a member, offer "Add another".
- Keyboard shortcuts on desktop: `/` search, `n` new member, `p` record payment (on profile).
- Optimistic UI for "Mark reminder sent".
