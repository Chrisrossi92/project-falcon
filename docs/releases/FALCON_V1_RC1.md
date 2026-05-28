# Falcon V1 RC1

## Release

- Release: Falcon V1 RC1
- Release date: 2026-05-27
- Production URL: https://continentalres.com
- Git tag: `falcon-v1-rc1`
- Audience: internal office pilot
- Status: release candidate for controlled pilot use

## Core Completed Systems

- Auth/session: authenticated staff app sessions, protected routes, current app user/company context, and session-aware navigation.
- Permissions/worldviews: role and permission gated operational shell, owner/admin/reviewer/appraiser/client-facing worldviews, and V1 surface suppression where modules are not pilot-ready.
- Orders workflow: create, edit, detail, list, status, due dates, property/report metadata, appraiser/reviewer assignment fields, fee fields, and order-safe links.
- Reviewer workflow: reviewer assignment display, reviewer dashboard/detail surfaces, review due/final due visibility, and reviewer-safe operational views.
- Notifications: canonical in-app notification rows, recipient resolution, role-aware policies, user preference overrides, policy locks, and order-safe notification links.
- Email pipeline: notification fanout to `email_queue`, effective email preference checks, assignment email payload enrichment, formatted dates, plain-text fallback, and HTML assignment layout.
- Cron processing: Vercel Cron invokes the protected email-worker endpoint every minute using `CRON_SECRET`.
- Print packet: V1 order packet with supported order, property, client, appraiser, reviewer, dates, notes, and document readiness fields.
- Activity/notes: order activity feed, operational notes, assignment/status activity events, and readable audit trail surfaces.
- Assignment flows: appraiser assignment/reassignment notifications, reviewer mapping, assignment display consistency, and duplicate assignment notification guardrails.
- Hosted deployment: production app and Supabase Edge Function deployment path validated for RC1.

## Key Architectural Decisions

- Keep V1 hardcoded where the office workflow is stable enough for pilot use, including property/report type options.
- Preserve owner-configurable taxonomy, editable notification templates, second appraiser workflow, and deeper automation for V1.1/V2.
- Treat `public.users.id` as the app identity for preferences, memberships, notification recipient resolution, and company-scoped operational behavior.
- Keep notification recipient resolution independent from channel delivery preferences.
- Keep in-app notifications as the primary durable notification surface; email is a channel layered on top through `email_queue`.
- Do not send email for generic order edits in V1; email remains reserved for high-signal assignment/reassignment, notes, review workflow transitions, true date/site-visit changes, and explicitly intentional workflow events.
- Use order-safe links and enriched payloads for all order notification/email flows.
- Keep email rendering in the Supabase `email-worker` function with plain-text fallback and no image dependency for RC1.
- Keep print packet fields aligned to the V1 order form and avoid exposing unsupported legacy fields.
- Preserve schema and migrations; use manual SQL scripts only for temporary pilot operations such as data cleanup or email muting.

## Known Accepted V1 Limitations

- Assignment-on-create email/activity behavior is not the pilot-critical notification path; reassignment/change notifications are the relied-on path.
- Property/report type lists are hardcoded for V1.
- No owner-managed dropdown administration in RC1.
- No second appraiser assignment or split-fee workflow in RC1.
- No reply-to-email activity logging in RC1.
- No editable email templates in RC1.
- No logo/image dependency inside transactional emails for RC1.
- Uploaded document storage-object cleanup remains a separate reviewed operation from document metadata cleanup.
- Manual pilot SQL is available for controlled cleanup/mute operations and is not part of the migration chain.

## Deferred V1.1/V2 Items

- Bid tracker.
- `@mentions`.
- Tester-reported polish and fixes from the internal office pilot.
- Owner-configurable property/report/status taxonomies.
- Editable email templates and richer branded email assets.
- Reply-to-email ingestion and activity logging.
- Second appraiser workflow and expanded fee handling.
- Client/vendor portal expansion beyond V1 suppressed surfaces.
- Broader automation and communication workflows after pilot feedback.

## Internal Pilot Users

- Abby
- Chris
- Kady

## Pilot Goals

- Validate that real office users can create, edit, assign, review, print, and complete appraisal orders without operational blockers.
- Confirm that permissions and role-specific worldviews expose the right work while suppressing unfinished V2 surfaces.
- Confirm order detail, drawer, print packet, and email summaries agree on the same V1-supported fields.
- Confirm notifications and email delivery work for reassignment and key workflow events without duplicate noise.
- Confirm cron-driven email processing remains reliable in production.
- Identify only V1 blocker defects and small usability fixes before broadening scope.

## RC Stabilization Notes

- Assignment email date formatting was normalized: site visits include weekday/date/time; review/final due dates omit time.
- Assignment email layout was cleaned up with Falcon header, order summary, safe details, Open Order button, and footer.
- Assignment email property contact and phone now render as one `Property contact` value when available.
- Property type and report/product type options were expanded for realistic appraisal-office use while preserving legacy selected values.
- Reviewer display mapping was stabilized across detail, drawer, and print packet where applicable.
- Print packet removed unsupported V1 fields such as Borrower and Assigned To.
- Property/contact phone display/input normalization was added where appropriate without destroying extensions or non-US fallback values.
- Duplicate assignment notification handling was tightened so one logical assignment change produces one assignment event/email.
- Date/site-visit notification guards were tightened so fee-only saves, no-op saves, and raw timestamp normalization do not create false date-change notifications or emails.
- Users page member cards prefer `full_name`, then `name`, then `display_name`, then email.
- Manual scripts were prepared for RC1 blank-slate test data cleanup and temporary internal pilot email muting.

## Validation Summary

- Tests: focused RC1 test files passed, and full test suite passed during RC stabilization.
- Lint: `npm run lint` passed with existing warnings only.
- Build: `npm run build` passed with existing Vite/Tailwind warnings only.
- Diff hygiene: `git diff --check` passed.
- Deploy: hosted frontend deployment path validated; Supabase `email-worker` requires deployment after worker changes.
- Email: Resend delivery, sending domain, `email_queue`, formatted assignment email, HTML layout, and plain-text fallback validated.
- Cron: Vercel Cron invokes the protected `/api/cron/email-worker` endpoint every minute with bearer secret protection.

## Release Recommendation

Falcon V1 RC1 is ready for internal pilot after:

- production frontend is deployed from the RC1 build,
- `supabase functions deploy email-worker` has been run for email-worker changes,
- optional blank-slate cleanup dry-run has been reviewed before any delete,
- optional internal pilot email mute dry-run has been reviewed before apply,
- tag `falcon-v1-rc1` is created from the final RC commit.
