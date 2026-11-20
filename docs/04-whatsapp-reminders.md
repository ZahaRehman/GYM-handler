# 04 — WhatsApp Reminders (R&D + Design)

## 1. The honest reality

WhatsApp does **not** offer a free, official, fully automatic way for a business to message customers.
You have to pick two of: **free · fully automatic · zero ban risk**.

| | Free | Automatic | Safe |
|---|:---:|:---:|:---:|
| A. `wa.me` click-to-chat | ✅ | ⚠️ one tap each | ✅ |
| B. Meta WhatsApp Cloud API | ⚠️ small per-message fee | ✅ | ✅ |
| C. Unofficial (Baileys / whatsapp-web.js) | ✅ | ✅ | ❌ |

## 2. Option A — `wa.me` links (Phase 1, ships first)

**How it works:**
`https://wa.me/923001234567?text=<url-encoded message>` opens WhatsApp (app on phone, WhatsApp Web on laptop) with the chat and message pre-filled. The owner just taps **Send**.

**What the app automates:**
- The daily job still runs and builds the reminder list + the personalised message.
- Dashboard shows a **"Reminders to send today (7)"** card.
- **Reminder queue screen:** each row = photo, name, amount, due date, [Send on WhatsApp] button. Tap → WhatsApp opens → come back → row auto-marked "sent" (marked on click, with "undo").
- Takes ~3–5 seconds per member. For 10 reminders a day ≈ 1 minute.
- Optional: browser push / daily email to owner "You have 7 reminders to send" (Supabase can email via free SMTP like Resend free tier — Phase 3 nice-to-have).

**Pros:** Free forever, zero risk, messages come from the owner's real number (members trust it), works on day 1.
**Cons:** Not hands-free.

## 3. Option B — Meta WhatsApp Cloud API (Phase 2, recommended upgrade)

**How it works:** Official API hosted by Meta. Our `send-reminders` Edge Function POSTs to
`https://graph.facebook.com/v{N}/{PHONE_NUMBER_ID}/messages` with a pre-approved **template**.

**Setup steps (owner does with your help):**
1. Create a Meta Business account (business.facebook.com) and a Meta Developer app → add "WhatsApp".
2. Add a phone number. ⚠️ This number **can't be used in the normal WhatsApp app at the same time** — use a new SIM, or the WhatsApp Business **app coexistence** feature if available in the country.
3. Business verification (may be needed for higher limits; small gyms often start unverified with limited daily conversations).
4. Create **utility** templates, e.g. `fee_reminder`:
   `Hi {{1}}, your {{2}} fee of {{3}} is due on {{4}}. Thank you!` → submit → approved usually within minutes–hours.
5. Generate a **permanent System User access token**. Store as Supabase secret `WHATSAPP_TOKEN`, plus `WHATSAPP_PHONE_NUMBER_ID`.
6. Add a payment method in Meta Business (required for paid template messages).

**Cost:** Meta charges per delivered **template** message, priced by the recipient's country and category. **Utility** (fee reminders) is the cheapest paid category — typically fractions of a cent to a few cents per message. Example: 200 members × ~2 reminders/month = ~400 messages/month → usually a few US dollars/month. Check the current rate card for your country before going live.
Replies from the member open a 24h service window where free-form messages are free.

**Pros:** Fully automatic, official, delivery/read status via webhook, scales.
**Cons:** Not free, setup paperwork, needs a dedicated number, template approval.

## 4. Option C — Unofficial libraries (only if owner insists, at own risk)

- **Baileys** (Node, WebSocket) or **whatsapp-web.js** (Puppeteer) log in as a normal WhatsApp account via QR code.
- **Against WhatsApp Terms** → the number can be **banned** (higher risk with bulk/repetitive messages to people who haven't saved the number).
- Needs a **24/7 process** holding the session. Free hosts that sleep (Render free) break it. Options: Oracle Cloud Always-Free VM, an old Android phone / laptop at the gym running it.
- Would expose a small HTTP endpoint `POST /send` protected by a secret, called by `send-reminders`.

**Recommendation:** don't use the owner's main personal/business number with this.

## 5. Design: pluggable provider

```ts
// supabase/functions/_shared/messaging/types.ts
export interface MessagingProvider {
  name: 'manual' | 'cloud_api' | 'unofficial';
  send(input: {
    to: string;              // E.164
    text: string;            // rendered message (manual/unofficial)
    template?: { name: string; params: string[] };  // cloud_api
  }): Promise<{ status: 'pending' | 'sent' | 'failed'; providerMessageId?: string; error?: string }>;
}
```

- `manual` → returns `pending` (owner sends from the queue).
- `cloud_api` → calls Graph API, returns `sent`/`failed`.
- `unofficial` → calls the self-hosted bridge.

`settings.whatsapp_provider` decides which one runs. **Switching = change one setting.** Everything else (queue, logs, history, analytics) stays the same.


> **As built (Phase 3):** candidate selection lives in the SQL function `public.generate_reminders()`
> (migration `20261119000003_reminders.sql`, tests in `supabase/tests/database/reminders.test.sql`).
> `pg_cron` calls it directly every day at 04:00 UTC (09:00 PKT), so the manual provider needs **no edge function
> and no secret**. Overdue reminders are "self-healing": if a daily run is missed, the next run catches up.
> A `send-reminders` edge function is only needed when a sending provider (Cloud API) is added; it would pick up
> `pending` rows. The cron hour is fixed in UTC: change it in the migration if the gym is not in Pakistan.

## 6. `send-reminders` Edge Function — logic (future, for automatic providers)

```
1. Verify header x-cron-secret === CRON_SECRET (reject otherwise)
2. today = now in settings.timezone
3. candidates =
     active members where next_due_date - today ∈ settings.reminder_days_before   → kind before_due / on_due
   ∪ active members where today > next_due_date
         and (today - next_due_date) % overdue_repeat_days == 0
         and sequence < overdue_max_reminders                                    → kind overdue
4. for each candidate:
     message = render(template, {name, gym, amount, currency, due_date})
     insert into reminders (...) on conflict do nothing returning id
     if not inserted → continue          // already handled → idempotent
     result = provider.send(...)
     update reminders set status, provider_message_id, error, sent_at
5. return { created, sent, failed }
```

- Rate-limit Cloud API sends (e.g. 10/sec) and retry `failed` ones once on the next run.
- Also expose a **"Run now"** button for admins (calls the same function with the admin JWT) — useful for testing.

## 7. Scheduling

```sql
-- 04:00 UTC = 09:00 Asia/Karachi
select cron.schedule(
  'daily-fee-reminders',
  '0 4 * * *',
  $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body    := '{}'::jsonb
  );
  $$
);
```

Store `cron_secret` in **Supabase Vault**, not hard-coded.

## 8. Message templates

Editable in **Settings → Messages** with live preview. Placeholders: `{name}`, `{gym}`, `{amount}`, `{currency}`, `{due_date}`, `{paid_on}`, `{member_code}`.
Support English + Roman Urdu/Urdu text (WhatsApp handles Unicode fine).
For Cloud API, the template text lives in Meta; the app maps placeholders to `{{1}}..{{n}}` params.

## 9. Phone number handling
- Input with country selector defaulting to the gym's country (e.g. +92); normalise `03001234567` → `+923001234567` on save.
- Library: `libphonenumber-js` (small "min" build).
- `wa.me` needs digits only without `+` → `923001234567`.
