# Falcon V1 RC1 Release Lock

## Release Identity

- RC tag: `falcon-v1-rc1`
- Production URL: `https://continentalres.com`
- Lock date: 2026-05-27
- Scope: Falcon V1 Staff Appraisal release candidate for office testing.

## Validation Lock

RC1 is locked with the following validation passed:

- Full test suite passed.
- Lint passed.
- Production build passed.
- `git diff --check` passed.
- No tracked secrets remain in the repository; only `.env.example` is tracked among env-like files.

## Hosted Notification And Email Lock

The V1 notification and email pipeline is confirmed end-to-end for RC1:

- In-app notifications remain the primary notification surface.
- Notifications enqueue email through canonical `public.email_queue`.
- Effective V1 email preferences and locks are respected before email queueing.
- `email-worker` consumes `public.email_queue` through the canonical claim/mark RPCs.
- Resend delivery is confirmed.
- Resend sending domain is verified.
- Vercel Cron invokes `/api/cron/email-worker` every minute.
- The cron endpoint remains protected by `Authorization: Bearer $CRON_SECRET`.
- Failed email rows remain auditable in `public.email_queue`.

## Scope Lock

V2 work is paused until office testing feedback is collected and triaged.

Only V1 blockers, security issues, hosted deployment issues, notification/email failures, and small tester-reported user-facing fixes should be considered during RC1.

## V1.1 Backlog Only

The explicit V1.1 backlog is limited to:

- Bid tracker.
- `@mentions`.
- Polish and fixes from office testers.

No new architecture, broad UX redesign, hidden enterprise surface expansion, or V2 feature work is included in RC1.
