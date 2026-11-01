# Automated Cheque Email Reminder System

Sends an automatic email reminder before a cheque payment clears. Reminders are
only available when **Payment Mode = Cheque**, are scheduled in **IST
(Asia/Kolkata)**, and are delivered to the authenticated administrator's
registered email address via **Resend**.

## How it works

```
Invoice saved (cheque)
      │
      ▼
cheque_reminders row  ──►  pg_cron (every minute)
                                 │  pg_net http_post (x-cron-secret)
                                 ▼
                    Edge Function: process-cheque-reminders
                                 │  1. claim due rows atomically
                                 │  2. verify invoice is still payable
                                 │  3. send email via Resend
                                 ▼
                          status: SENT / FAILED (with retries)
```

## Files

Created:
- `supabase/migrations/20261101000000_cheque_reminders.sql` — table, RLS, `claim_due_cheque_reminders`.
- `supabase/migrations/20261101000001_cheque_reminders_cron.sql` — `pg_cron` + `pg_net` schedule.
- `supabase/functions/process-cheque-reminders/index.ts` — the processor.
- `supabase/functions/process-cheque-reminders/emailTemplate.ts` — responsive HTML email.
- `supabase/config.toml` — disables JWT verification for the processor only.
- `src/services/chequeReminderService.ts` — frontend schedule / reschedule / cancel.
- `src/features/purchases/ChequeReminderSection.tsx` — the reminder UI.

Modified:
- `src/types/index.ts`, `src/services/invoiceService.ts`,
  `src/features/purchases/BillUploadWorkflow.tsx`, `.env.example`.

## Security model

- RLS is **enabled** on `cheque_reminders` (never disabled). Authenticated users
  can read, insert, reschedule (status back to `PENDING`) and cancel
  (`CANCELLED`) their reminders. Progress fields (`PROCESSING`, `SENT`,
  `FAILED`, `attempts`, `sent_at`, `last_error`) can only be written by the
  service role.
- `claim_due_cheque_reminders` is `SECURITY DEFINER` and executable by
  `service_role` only.
- The Edge Function requires the `x-cron-secret` header; requests without it get
  `401 Unauthorized`, so it cannot be invoked publicly.
- `RESEND_API_KEY`, `CHEQUE_CRON_SECRET` and the service-role key live only as
  Supabase secrets / Vault values. No secret is ever prefixed with `VITE_` or
  shipped to the browser.
- Exactly one reminder per invoice is enforced by `UNIQUE (invoice_id)`, and
  `FOR UPDATE SKIP LOCKED` prevents two runs from claiming the same row.

## One-time setup

### 1. Apply the migrations
Run both migration files in the Supabase SQL editor, or:
```bash
supabase db push
```

### 2. Create the Vault secrets (used by pg_cron)
```sql
select vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1/process-cheque-reminders',
  'cheque_function_url',
  'process-cheque-reminders Edge Function URL'
);

select vault.create_secret(
  '<long-random-shared-secret>',
  'cheque_cron_secret',
  'Shared secret for the x-cron-secret header'
);
```

### 3. Set the Edge Function secrets
```bash
supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxx \
  FROM_EMAIL=onboarding@resend.dev \
  RESEND_TEST_RECIPIENT=<the-email-registered-with-your-resend-account> \
  CHEQUE_CRON_SECRET=<same long-random-shared-secret>
```
> **Testing without a custom domain**
> - `FROM_EMAIL` defaults to `onboarding@resend.dev`, Resend's permitted testing
>   sender. Never set an unverified domain here.
> - While `RESEND_TEST_RECIPIENT` is set, **every** email is delivered to that
>   address only — so no test mail can reach any other recipient.
>
> **Going live later** (once you own a domain verified in Resend):
> set `FROM_EMAIL` to an address on your verified domain and unset
> `RESEND_TEST_RECIPIENT`:
> ```bash
> supabase secrets unset RESEND_TEST_RECIPIENT
> supabase secrets set FROM_EMAIL=reminders@yourdomain.com
> ```
> No code change is required — the sender and recipient are read from
> server-side environment variables on every invocation.

### 4. Deploy the function
```bash
supabase functions deploy process-cheque-reminders
```

## Testing

### Verified locally (no Supabase project required)
- `npx tsc --noEmit` — passes, 0 type errors.
- `npm run build` — passes (`tsc && vite build`, exit 0).

### Manual verification checklist (run against your Supabase project)
These steps require your live project and Resend account — record the actual
observed result for each:

1. **Migration applied**
   ```sql
   select column_name, data_type from information_schema.columns
   where table_name = 'cheque_reminders';
   select rowsecurity from pg_tables where tablename = 'cheque_reminders'; -- expect true
   ```
2. **RLS enforced**
   ```sql
   select policyname, cmd from pg_policies where tablename = 'cheque_reminders';
   ```
3. **Cron scheduled**
   ```sql
   select jobname, schedule, active from cron.job
   where jobname = 'process-cheque-reminders-every-minute';
   ```
4. **Function rejects unauthenticated calls**
   ```bash
   curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/process-cheque-reminders"
   # expect: HTTP 401 {"error":"Unauthorized"}
   ```
5. **End-to-end send**
   - Create a cheque invoice, enable the reminder, set the date/time to ~2
     minutes ahead (IST), save.
   - Confirm the row exists with `status = 'PENDING'`.
   - After the reminder time passes, confirm `status = 'SENT'` and `sent_at` is
     populated, and that the email arrived in the admin inbox.
6. **Duplicate protection**
   - Re-save the same invoice — the same reminder row is updated (never a second
     row). Confirm `select count(*) from cheque_reminders where invoice_id = '<id>';` returns `1`.
7. **No-send when paid**
   - Mark the invoice `payment_status = 'PAID'` before the reminder time and
     confirm the reminder becomes `CANCELLED` and no email is sent.
8. **Retry / failure path**
   - Temporarily set an invalid `RESEND_API_KEY` or use a bad recipient and
     confirm `status` returns to `PENDING` with `attempts` increasing and
     `last_error` populated; after 5 attempts it becomes `FAILED`.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `401 Unauthorized` on every cron run | `cheque_cron_secret` (Vault) ≠ `CHEQUE_CRON_SECRET` (function secret) |
| Nothing happens after the reminder time | `pg_cron`/`pg_net` not enabled, or the cron job is inactive |
| `Email provider not configured` | `RESEND_API_KEY` not set on the function |
| Resend `403`/`422` | `FROM_EMAIL` uses an unverified domain, or (test sender) the recipient is not the Resend account owner — set `RESEND_TEST_RECIPIENT` to that address |
| Reminder row never created | Invoice upsert failed (check `purchase_invoices`), the FK on `invoice_id` needs the invoice to exist remotely |
