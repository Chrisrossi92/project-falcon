# Project Falcon MVP Vision

## Product Definition

Project Falcon is an appraisal operations platform for managing clients, orders, assignments, review workflows, communication, notifications, and audit history.

The MVP should prove Falcon can operate as a repeatable product for appraisal firms, not only as a custom Continental implementation. The platform should be configurable enough that a new appraisal company can be set up, seeded, tested, reset, and eventually onboarded without code changes for company-specific roles, staff, clients, and workflow defaults.

## Core Principles

- Company setup should be configurable.
- Role behavior should be permission-driven, not hardcoded to role names.
- Template roles should accelerate setup, but companies should be able to rename roles and create custom permission bundles.
- Order-specific responsibility should override global role for workflow routing and notifications.
- Visibility, CRUD permissions, order responsibility, and bell notifications are separate concepts.
- `order.id` is an internal database UUID for routing and querying only.
- `order.order_number` is the company-facing order identifier shown in UI and notifications.
- The activity log is the durable audit and communication history.
- Notifications are delivery records for specific recipients.
- Admin and owner visibility does not imply admin and owner bell notifications.
- Direct active participants should receive bell notifications when they have active responsibility.

## MVP Scope

The MVP is complete when a configured company can:

1. Create and manage users.
2. Assign users configurable roles.
3. Create and manage clients.
4. Create orders with company-facing order numbers.
5. Assign appraisers and reviewers.
6. Move orders through the lifecycle.
7. Log notes, workflow actions, status changes, and assignments.
8. Notify active responsible participants correctly.
9. Give admins and owners full communication visibility without noisy mandatory bell alerts.
10. Reset and reseed a test/demo environment reliably.

## End-to-End MVP Workflow

1. **Company setup**
   - Owner creates or selects company configuration.
   - Order numbering format is configured.
   - Default role templates are installed.
   - Default notification preferences are seeded.

2. **User setup**
   - Owner/admin invites or creates users.
   - Users receive one or more permission roles.
   - Staff are marked active/inactive.
   - Default appraiser/reviewer/task capabilities are configured through permissions.

3. **Client setup**
   - Admin creates client records.
   - Contacts, billing notes, delivery preferences, and company-specific metadata are stored.

4. **Order creation**
   - Admin creates an order.
   - Falcon assigns or accepts a company-facing `order_number`.
   - Internal `order.id` remains hidden except in dev/debug contexts.
   - Initial status is usually `new`.

5. **Assignment**
   - Admin assigns appraiser.
   - Admin assigns reviewer or accepts default reviewer.
   - Future: admin assigns inspector/field rep task if needed.

6. **Work lifecycle**
   - Appraiser works order during `new`, `in_progress`, and revision statuses.
   - Reviewer becomes active during review stages.
   - Inspector/field rep becomes active only for assigned task windows.

7. **Communication**
   - Notes and workflow comments are written to activity log.
   - Activity entries include actor, context, order number, event type, and payload metadata.

8. **Notification**
   - Direct active participants receive bell/email notifications based on event and preferences.
   - Admins/owners can view all communication in feeds.
   - Admin/owner bell delivery is preference-controlled.

9. **Completion**
   - Order is marked completed.
   - Normal task notifications stop.
   - History remains available.
   - Post-completion notes may be visible but should not generate routine bells unless explicitly targeted.

## Non-Negotiable UX Rules

- Never show full UUIDs as order identifiers in normal user-facing UI.
- Notifications should name who did what.
- Communication should show actor, recipient/context, order number, event type, and importance.
- Bell notifications should feel actionable, not like a firehose.
- Admin feeds should feel like an operational ledger, not a personal alert stream.

## Future Product Direction

After MVP, Falcon can evolve toward:

- Multi-company tenancy.
- Client portal users.
- External appraiser/vendor collaboration.
- Inspector/field-rep task workflows.
- Billing and invoice workflows.
- Configurable workflow statuses.
- Company-specific notification policies.
- Reporting dashboards across companies, regions, clients, appraisers, and reviewers.

