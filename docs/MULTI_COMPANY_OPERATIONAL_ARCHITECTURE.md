# Multi-Company Operational Architecture

## Purpose

This document defines Falcon's multi-company operational architecture.

It describes how Falcon should evolve from a coherent single-company operations platform into a scalable SaaS system without losing workflow clarity, notification discipline, activity memory, or deterministic operational intelligence.

This is not an implementation plan. It does not introduce tenant infrastructure, onboarding UI, billing, organization switching, company settings UI, or schema changes.

## 1. Core SaaS Philosophy

Falcon is an operational platform first.

Multi-company support should preserve the product's core operating model:

- Multiple companies can run their own operational workspace.
- Platform doctrine remains shared across companies.
- Company policy can configure local workflow and communication behavior.
- Workflow governance remains deterministic and auditable.
- Operational intelligence remains explainable from known business data.
- Flexibility should not create ambiguous lifecycle behavior or notification noise.

Falcon should distinguish four levels of behavior:

- Platform-level behavior: canonical product doctrine, safety constraints, base workflow vocabulary, deterministic signal semantics, and protected lifecycle governance.
- Company-level policy: workflow choices, notification defaults, queue thresholds, terminology, calendar defaults, numbering rules, and team role bundles.
- User-level preference: personal notification delivery choices, view preferences, and non-authoritative UI settings.
- Order-level operational context: assignment, due dates, workflow status, activity history, schedule data, and current operational signals.

Company configuration should tune Falcon. It should not turn every company into a separate product with incompatible concepts.

## 2. Company Identity Model

Future Falcon companies should have a stable `company_id` that scopes operational data and policy.

Company-scoped concepts should include:

- Company identity and profile.
- Branding.
- Timezone.
- Locale.
- Terminology profile.
- Working days and weekend behavior.
- Order numbering rules.
- Default workflow policy.
- Default notification policy.
- Default queue and scheduling policy.

Current Falcon behavior remains the single-company default until company infrastructure exists.

During the transition, current global defaults should be treated as platform defaults for the existing workspace, not as proof that the system is already multi-company.

Multi-Company Readiness Slice 1 is complete. Falcon now has frontend default platform policy modules for workflow, queue, calendar, and notification behavior:

- `defaultWorkflowPolicy`
- `defaultQueuePolicy`
- `defaultCalendarPolicy`
- `defaultNotificationPolicy`

These modules represent current single-company platform defaults only. They make existing assumptions explicit without adding tenant lookup, backend policy storage, settings UI, `company_id`, permission changes, or runtime policy resolution.

Current constants abstracted into defaults include due-soon at 48 hours, active appraiser statuses, the completed status set, review compression at 2 days, and default weekend calendar visibility. Future company policy should override these through company-aware policy resolution.

## 3. Operational Policy Domains

Company policy should be organized by operational domain. These domains should share platform doctrine but allow restrained company-specific defaults.

### Workflow Policy

Workflow policy defines how a company moves work through the governed lifecycle.

Examples:

- Whether review is required.
- Whether final approval is required.
- Who has release authority.
- Whether reviewer clearance can release directly to client.
- Whether completed orders can be reopened.
- How revision handling works.
- Whether resubmission requires notes or supporting context.

Workflow policy should configure allowed behavior around canonical transitions. It should not permit arbitrary lifecycle status mutation outside governed transition paths.

### Queue Policy

Queue policy defines how operational attention is derived.

Examples:

- Due-soon thresholds.
- Enabled operational queues.
- Active-work definitions by role.
- Which statuses count as appraiser production work.
- Which statuses count as reviewer work.
- Admin/owner attention defaults.
- Workload thresholds in future capacity models.

Queues remain deterministic attention systems. Company configuration can adjust thresholds and enabled lenses later, but queue membership must remain explainable.

### Notification Policy

Notification policy defines when Falcon interrupts a person.

Examples:

- Recipient defaults by event.
- Admin versus owner delivery behavior.
- Actor self-suppression rules.
- Required versus optional delivery.
- Default channel preferences.
- Escalation rules later.

Notifications are personal delivery prompts. They are not the source of truth. Activity remains the durable operational record.

Not every workflow event, queue signal, or scheduling signal should become a notification.

### Calendar / Scheduling Policy

Calendar policy defines how a company interprets operational time.

Examples:

- Company timezone.
- Working days.
- Weekend visibility and scheduling behavior.
- Site visit expectations.
- Review due date expectations.
- Client due date expectations.
- Review/final compression thresholds.
- Calendar event source rules.

Calendar intelligence should remain contextual and restrained. Calendar grids should not become dense alert surfaces.

### Terminology Policy

Terminology policy defines company-facing language without changing platform semantics.

Examples:

- Appraiser naming.
- Reviewer naming.
- Assignment naming.
- Ready-for-client wording.
- Client delivery wording.
- AMC/client naming.
- Report/order naming.

Terminology can make Falcon feel native to a company, but it should not obscure canonical workflow meaning.

## 4. Role + Permission Evolution

Current Falcon still contains legacy role strings such as:

- `owner`
- `admin`
- `appraiser`
- `reviewer`
- `billing`

These roles remain useful as template roles and compatibility labels, but they should not be the long-term behavior engine.

The future model should use:

- Company-scoped role assignments.
- Role bundles backed by permission keys.
- Effective permissions resolved in company context.
- Responsibility checks based on order assignment and lifecycle state.
- Owner/admin distinction where delivery, policy, and escalation behavior require it.
- A membership/invitation model that separates auth identity from company participation.

Permission-driven behavior should answer what a user can do. Operational responsibility should answer whether the user should act on a specific order now.

Global role alone should not imply ownership of every order in that role's domain.

## 5. Company Data Scoping

Future company-scoped entities should include:

- Users and company memberships.
- Role assignments.
- Orders.
- Clients and AMCs.
- Notifications.
- Activity.
- Queue assessments.
- Calendar/scheduling events.
- Order numbering.
- Company settings and policy records.

Current frontend behavior relies heavily on RLS, views, and single-company assumptions. That is acceptable for the current MVP, but it is not the final SaaS architecture.

Company scoping should be introduced gradually and additively. Existing single-company behavior should continue to work while canonical company-aware views, RPCs, and policies are introduced.

## 6. Workflow Governance

Canonical workflow transitions remain platform-governed.

Company policy may configure workflow behavior, but it should not bypass operational integrity.

Falcon should preserve:

- Stable transition keys.
- Canonical workflow vocabulary.
- Permission checks.
- Assignment-aware responsibility.
- Activity logging.
- Notification discipline.
- Protected status-write paths.

Company policy should answer questions such as "Is final approval required?" or "Who can release to client?" It should not reintroduce direct lifecycle status editing from generic forms, tables, or legacy helpers.

## 7. Operational Intelligence + SaaS

Operational intelligence must remain deterministic across companies.

Signals should remain:

- Derived from known data.
- Explainable in plain language.
- Source-attributed.
- Role-aware.
- Quiet by default.

Queues should remain explainable attention systems, not hidden workflow states.

Notifications should remain restrained delivery prompts, not a mirror of every operational signal.

Calendar intelligence should remain contextual, especially in dense grid views.

Company configuration can later tune thresholds, enabled queues, and terminology without breaking the underlying doctrine.

## 8. Migration Philosophy

Multi-company migration must be additive.

Falcon should avoid destructive schema rewrites before canonical replacements exist and are proven.

Migration principles:

- Add company-aware fields and tables before removing legacy paths.
- Preserve compatibility layers during transition.
- Migrate semantics before infrastructure where possible.
- Keep current single-company defaults stable while introducing company policy.
- Prefer canonical views/RPCs over scattered frontend filtering.
- Introduce `company_id` gradually.
- Backfill data before enforcing constraints.
- Do not drop legacy columns, views, functions, or policies until app usage and database dependencies are verified gone.
- Backend canonicalization should follow clear product semantics, not patch around UI-specific behavior.

The goal is to move from single-company defaults to company-scoped policy without disrupting operational coherence.

## 9. Deferred Systems

The following systems are intentionally deferred:

- Billing.
- Organization switching UI.
- Company onboarding UI.
- Company settings UI.
- AI operational automation.
- Predictive scoring.
- Capacity modeling.
- Advanced tenant analytics.
- External client portals.
- Multi-region complexity.
- Tenant-specific workflow scripting.
- Broad custom lifecycle builders.

These systems should build on stable company identity, permission, workflow, notification, activity, queue, and calendar foundations.

## 10. SaaS Readiness Principles

Falcon should become multi-company without becoming operationally vague.

Principles:

- Platform doctrine should stay clear and shared.
- Company policy should tune behavior, not erase meaning.
- Workflow flexibility must not permit arbitrary status drift.
- Notification flexibility must not create inbox fatigue.
- Queue flexibility must not hide why work needs attention.
- Calendar flexibility must not overload scheduling surfaces.
- Role flexibility must be permission-backed and company-scoped.
- Activity remains durable memory across all companies.
- Operational intelligence remains deterministic before predictive.

Multi-company support is successful when each company feels configured for its operations while Falcon still feels like one coherent operational system.
