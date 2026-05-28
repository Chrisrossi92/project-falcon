# Email Queue (Notifications To Email)

## Overview
- Notifications enqueue email rows in canonical `public.email_queue` through `trg_notifications_queue_email`.
- Email enqueue uses the recipient's effective V1 email preference: `notification_policies` defaults/locks plus `user_notification_prefs` overrides keyed by `public.users.id`.
- Locked-on email preferences always queue email. Optional user-disabled email preferences skip email queueing while preserving the in-app notification row.
- `supabase/functions/email-worker` claims queued rows with `rpc_claim_email_batch_v1`, sends through Resend, then marks rows sent or failed.
- The legacy `email_outbox` path is deprecated and must not be used by active V1 workers.
- `supabase/functions/email-sender` is retired; it must not mark rows sent without real provider delivery.

## Database Pieces
- Table: `public.email_queue`
  - Fields include `to_email`, `subject`, `template`, `payload`, `status`, `attempts`, `claimed_at`, `locked_by`, `sent_at`, and `error`.
- Trigger: `trg_notifications_queue_email` on `public.notifications`.
- Canonical RPCs:
  - `rpc_claim_email_batch_v1(p_limit int, p_worker text default 'edge')`
  - `rpc_mark_email_sent_v1(p_id uuid)`
  - `rpc_mark_email_failed_v1(p_id uuid, p_error text)`

## Edge Function
- Location: `supabase/functions/email-worker/index.ts`
- Provider: Resend
- Required env vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY` or `RESEND_KEY`
  - `EMAIL_FROM`
- Optional env vars:
  - `APP_BASE_URL` for absolute order-safe links
  - `EMAIL_BATCH_SIZE`, default `25`

## Hosted Invocation
- Vercel Cron calls `GET /api/cron/email-worker` every minute.
- The cron endpoint requires `Authorization: Bearer $CRON_SECRET`.
- The cron endpoint invokes the Supabase Edge Function at
  `$SUPABASE_URL/functions/v1/email-worker` with `SUPABASE_SERVICE_ROLE_KEY`.
- The same endpoint can be used as a manual admin trigger when called with the
  same bearer secret.
- Required Vercel env vars:
  - `CRON_SECRET`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Concurrency safety remains in the queue claim RPC; duplicate invocations should
  not send the same claimed row twice.
- Minute-level automated processing requires the hosted Vercel project to remain
  on a plan that supports one-minute cron cadence.

## Manual Test Flow
1. Confirm hosted function env vars are set.
2. Create a notification through the normal app flow for an event whose policy allows email.
3. Confirm a queued row appears in `public.email_queue`.
4. Invoke `/api/cron/email-worker` with `Authorization: Bearer $CRON_SECRET`, or wait for the scheduled Vercel Cron run.
5. Confirm successful sends move to `status = 'sent'` with `sent_at`.
6. Confirm provider failures move to `status = 'failed'` with `error`.
7. Verify delivery in Resend.

## V1 Notes
- Email failure must not block in-app notification creation.
- In-app notification rows are created regardless of email preference state.
- Failed rows remain auditable in `public.email_queue`.
- Retry UI is deferred; V1 only preserves failed rows and provider error text.

## RC1 Lock
- `falcon-v1-rc1` confirms the hosted notification/email pipeline end-to-end.
- Vercel Cron is confirmed at one-minute cadence.
- Resend domain verification and delivery are confirmed for RC1.
