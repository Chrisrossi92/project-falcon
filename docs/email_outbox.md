# Email Outbox (Notifications → Email)

## Overview
- Notifications automatically enqueue rows in `public.email_outbox` via trigger `trg_notifications_queue_email`.
- A Supabase Edge Function (`supabase/functions/email-worker`) claims queued rows via RPCs and sends them through Resend.
- Status/locking fields prevent double‑send.

## Database pieces
- Table: `public.email_outbox` — queued/sending/sent/failed/suppressed; includes `locked_at`, `locked_by`, `attempts`, `error`.
- Table: `public.notification_preferences` — per-user email opt-in + optional override address.
- Trigger: `trg_notifications_queue_email` on `public.notifications`.
- RPCs (service/admin only):
  - `rpc_claim_email_outbox(p_limit int default 25)` → claims queued rows, sets `status='sending'`, `locked_at`, `locked_by`.
  - `rpc_mark_email_outbox_sent(p_id uuid)` → marks sent + clears lock.
  - `rpc_mark_email_outbox_failed(p_id uuid, p_error text)` → marks failed, increments `attempts`, clears lock.

## Edge Function (email-worker)
- Location: `supabase/functions/email-worker/index.ts`
- Uses Resend API by default.
- Env vars:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY` (or `RESEND_KEY`)
  - `EMAIL_FROM` (default: `Falcon <no-reply@yourdomain>`)
  - `APP_BASE_URL` (optional; used for links)
  - `EMAIL_BATCH_SIZE` (optional; default 25)

## Manual test flow
1) Apply migrations (including `2025-09-12_email_outbox.sql` and `2025-09-13_email_outbox_worker.sql`).
2) Set env vars above in your Supabase function environment.
3) Create a notification row (normal app flow or direct insert) for a user with `notification_preferences.email_enabled = true`.
4) Invoke the Edge Function (e.g., `supabase functions serve` locally or call deployed function).
5) Check `email_outbox`:
   - Claimed rows move to `status='sending'`, then `sent` or `failed`.
   - Errors appear in `error` column if provider rejects.
6) Verify email delivery in your provider’s dashboard (Resend).

## Notes
- Only admins/service role can claim/mark outbox rows.
- Preferences: RPC `rpc_set_notification_preferences(email_enabled boolean, email_address text)` lets users opt out/override email.
- Actual email templates are minimal; customize `renderTemplate` in `email-worker` as needed.
