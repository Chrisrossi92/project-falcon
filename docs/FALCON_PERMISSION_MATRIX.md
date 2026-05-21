# Falcon Permission Matrix

## Purpose

This document defines Falcon's canonical permission/module matrix as planning documentation. It does not create permission seed data, route guards, billing rules, onboarding UI, database migrations, or frontend behavior.

The module registry defines product surface. This matrix defines the permission language that should authorize route access, navigation visibility, workflow actions, administrative actions, and scoped object access inside those module surfaces.

The product-mode composition matrix in `docs/FALCON_PRODUCT_MODE_COMPOSITION.md` defines which modules are enabled, optional, hidden, and lane-separated by product mode.
The navigation/dashboard composition registry in `docs/FALCON_NAVIGATION_COMPOSITION.md` defines how enabled modules and permissions should compose navigation entries, dashboard widgets, command palette entries, empty states, and upgrade prompts.

## Core Doctrine

- Permissions never create visibility alone.
- Visibility still comes from active company membership plus readable order, client, assignment packet, relationship, or portal scope.
- Modules expose surfaces; permissions authorize actions.
- Role presets are templates, not hardcoded authority.
- Route access and button/action access should be separately expressible.
- Navigation, dashboard, and command palette visibility should be derived separately from action authority.
- Relationships describe network topology; they do not grant operational visibility.
- Assignment packets grant assignment-scoped visibility.
- Client/order access grants client/order-scoped visibility.
- Dangerous permissions require explicit naming, careful UI placement, and backend enforcement.
- Owner-sensitive permissions should be treated as escalation capabilities, not broad admin defaults.

## Permission Shape

Recommended naming pattern:

- `<domain>.read.all`
- `<domain>.read.assigned`
- `<domain>.read.own`
- `<domain>.create`
- `<domain>.update.all`
- `<domain>.update.assigned`
- `<domain>.archive`
- `<domain>.delete`
- `<domain>.<action>`

Use `read.*` for route/list/detail access. Use explicit action permissions for workflow transitions, dangerous mutations, billing, integrations, and administration.

## Route/Nav Permissions vs Workflow/Action Permissions

Route/nav permissions answer:

- Can this user see or enter this product surface?
- Should this nav item appear?
- Can the dashboard include this module's widgets?

Workflow/action permissions answer:

- Can this user perform this specific mutation?
- Can this user transition this order?
- Can this user cancel, archive, resend, invite, approve, or configure something?

Examples:

| Surface | Route/Nav Permission | Action Permission |
|---|---|---|
| Orders list | `orders.read.all` or `orders.read.assigned` | None |
| New Order button | `orders.create` | `orders.create` |
| Order status transition | Order detail read permission | `workflow.status.submit_to_review`, `workflow.status.approve_review`, etc. |
| Team Access | `users.read` | `users.invite`, `users.manage_company_access`, `roles.assign` |
| Client list | `clients.read.all` or `clients.read.assigned` | None |
| Client create | `clients.create` | `clients.create` |
| Assignment packet | `assignments.read.owner` or `assignments.read.assigned` | `assignments.accept`, `assignments.submit`, etc. |

## Scoped Visibility Permissions

Own:

- Records directly owned by the current user.
- Typical examples: personal settings, own notification preferences, own vendor profile.
- Example pattern: `<domain>.read.own`, `<domain>.update.own`.

Assigned:

- Records where the user has operational responsibility.
- Typical examples: assigned appraiser/reviewer orders, assigned vendor packets.
- Example pattern: `orders.read.assigned`, `orders.update.assigned`.

Company:

- Records belonging to the active company.
- Requires active company membership plus a company-wide permission.
- Example pattern: `orders.read.all`, `clients.read.all`, `analytics.read.company`.

Relationship/packet:

- Cross-company records exposed through an explicit relationship or assignment packet.
- Relationship alone is not enough; packet/status/read helper must authorize the row.
- Example pattern: `assignments.read.assigned`, `relationships.read`.

Client/order scoped:

- Portal or operational records visible because a user can read a specific client or order.
- Example pattern: `client_portal.orders.read`, `reports.read.assigned`.

## Dangerous Permission Classes

Delete/archive:

- `orders.delete`
- `orders.archive`
- `clients.delete`
- `clients.archive`
- `assignments.cancel`
- `assignments.revoke`
- `relationships.archive`

Billing:

- `billing.read`
- `billing.manage_subscription`
- `billing.manage_payment_methods`
- `billing.view_invoices`
- `billing.adjust_charges`

Role/permission management:

- `roles.assign`
- `roles.manage_presets`
- `users.grant_owner`
- `users.manage_company_access`
- `users.invite`

Tenant administration:

- `tenant_admin.read`
- `tenant_admin.update_company`
- `tenant_admin.manage_modules`
- `tenant_admin.manage_policy`
- `tenant_admin.manage_onboarding`

Integrations:

- `integrations.read`
- `integrations.configure`
- `integrations.rotate_secrets`
- `integrations.disable`

Guardrails:

- Dangerous permissions should not be implied by generic admin labels.
- Owner-sensitive permissions should require explicit grant.
- Backend RPCs and RLS remain final authority.
- UI hiding is convenience, not enforcement.

## Owner-Only Or Owner-Sensitive Permissions

Owner-sensitive permissions should be explicit:

- `users.grant_owner`
- `users.revoke_owner`
- `users.manage_company_access`
- `roles.manage_presets`
- `tenant_admin.manage_modules`
- `tenant_admin.manage_policy`
- `billing.manage_subscription`
- `integrations.rotate_secrets`
- `relationships.archive`
- `assignments.revoke`

Owner-sensitive does not always mean only Owner can hold the permission. It means the permission changes business authority, package access, company posture, money, secrets, or ownership continuity and should not be casually bundled into broad admin presets.

## Permission Domains By Module

| Module | Primary Domains | Route/Nav Permissions | Action Permissions | Visibility Scope |
|---|---|---|---|---|
| `core_workspace` | `core.*` | `core.workspace.view` | `core.company.switch` | Current app user + active company context |
| `dashboard` | `core.dashboard.*` | `core.dashboard.view` | None by default | Derived from enabled modules and readable data |
| `notifications` | `notifications.*` | `notifications.read.own` | `notifications.mark_read`, `notifications.dismiss`, `notifications.preferences.manage_own` | Own notifications plus readable source object |
| `activity` | `activity.*` | `activity.read.all`, `activity.read.assigned` | `activity.create`, `activity.moderate` | Readable source order/assignment/client portal object |
| `settings` | `settings.*` | `settings.view` | `settings.update_own`, `settings.update_company` | Own settings or company settings authority |
| `orders` | `orders.*`, `workflow.status.*` | `orders.read.all`, `orders.read.assigned` | `orders.create`, `orders.update.all`, `orders.update.assigned`, workflow status actions | Company/readable/assigned order |
| `clients` | `clients.*` | `clients.read.all`, `clients.read.assigned` | `clients.create`, `clients.update.all`, `clients.archive`, `clients.delete` | Company/readable client or order-derived client |
| `team_access` | `users.*`, `roles.*` | `users.read` | `users.invite`, `users.manage_company_access`, `users.grant_owner`, `roles.assign` | Current company members/invitations |
| `assignments` | `assignments.*`, `order_company_assignments.*` | `assignments.read.owner`, `assignments.read.assigned` | `assignments.offer`, `assignments.accept`, `assignments.decline`, `assignments.submit`, `assignments.complete`, `assignments.cancel`, `assignments.revoke` | Assignment packet |
| `reviews` | `reviews.*`, `workflow.status.*` | `reviews.read.all`, `reviews.read.assigned` | `reviews.start`, `reviews.request_revisions`, `reviews.approve`, `workflow.status.ready_for_client` | Readable order/review responsibility |
| `calendar` | `calendar.*` | `calendar.read.all`, `calendar.read.assigned` | `calendar.create`, `calendar.update`, `calendar.delete` | Readable source order/assignment |
| `reports` | `reports.*` | `reports.read.all`, `reports.read.assigned` | `reports.upload`, `reports.release`, `reports.archive` | Readable order/client portal report scope |
| `analytics` | `analytics.*` | `analytics.read.company`, `analytics.read.assigned` | `analytics.export` | Aggregates constrained by company/permission scope |
| `ai_workspace` | `ai.*` | `ai.workspace.view` | `ai.generate`, `ai.summarize`, `ai.configure` | Existing source-data visibility only |
| `relationships` | `relationships.*` | `relationships.read` | `relationships.invite`, `relationships.approve`, `relationships.suspend`, `relationships.archive`, `relationships.manage_compliance` | Current company relationship records |
| `amc_operations` | `amc.*`, `vendor.*`, `client_portal.*` | `amc.dashboard.view`, `amc.orders.read`, `amc.panel.read` | `amc.assign_vendor`, `amc.manage_panel`, `amc.manage_client_intake` | AMC company + explicit order/vendor/client scope |
| `vendor_portal` | `vendor.*`, `assignments.*` | `vendor.dashboard.view`, `assignments.read.assigned` | `vendor.profile.update`, `assignments.accept`, `assignments.submit` | Vendor profile + assigned packets |
| `client_portal` | `client_portal.*` | `client_portal.dashboard.view`, `client_portal.orders.read` | `client_portal.orders.create`, `client_portal.messages.create` | Client organization/order scope |
| `billing` | `billing.*` | `billing.read` | `billing.manage_subscription`, `billing.manage_payment_methods`, `billing.adjust_charges` | Company billing account |
| `integrations` | `integrations.*` | `integrations.read` | `integrations.configure`, `integrations.rotate_secrets`, `integrations.disable` | Company integration config |
| `onboarding` | `onboarding.*` | `onboarding.view` | `onboarding.complete_step`, `onboarding.skip_step`, `onboarding.manage_setup` | Company setup state |
| `tenant_admin` | `tenant_admin.*` | `tenant_admin.read` | `tenant_admin.update_company`, `tenant_admin.manage_modules`, `tenant_admin.manage_policy` | Company administration |

## Action Permission Matrix

Read permissions:

- `*.read.own`
- `*.read.assigned`
- `*.read.all`
- `*.read.company`
- Module-specific portal reads such as `client_portal.orders.read`.

Create permissions:

- `orders.create`
- `clients.create`
- `users.invite`
- `assignments.offer`
- `client_portal.orders.create`
- `activity.create`
- `reports.upload`

Update permissions:

- `orders.update.all`
- `orders.update.assigned`
- `clients.update.all`
- `users.manage_company_access`
- `roles.assign`
- `settings.update_own`
- `settings.update_company`
- `tenant_admin.update_company`

Delete/archive permissions:

- Prefer archive/cancel/revoke language over hard delete where possible.
- Hard delete should be rare and explicitly named.
- Archive/delete permissions should never be bundled silently into broad route access.

Workflow/action permissions:

- `workflow.status.submit_to_review`
- `workflow.status.resubmit`
- `workflow.status.request_revisions`
- `workflow.status.approve_review`
- `workflow.status.ready_for_client`
- `workflow.status.complete`
- `assignments.accept`
- `assignments.decline`
- `assignments.submit`
- `assignments.complete`
- `assignments.cancel`
- `assignments.revoke`

Administrative action permissions:

- `tenant_admin.manage_modules`
- `tenant_admin.manage_policy`
- `billing.manage_subscription`
- `integrations.configure`
- `integrations.rotate_secrets`
- `roles.manage_presets`
- `users.grant_owner`

## Product-Mode Default Permission Bundles

These bundles are planning templates only. They should become role presets or package defaults later, but they are not hardcoded authority.

### Staff Appraisal Mode

Staff Owner:

- Full Staff Appraisal module access.
- `orders.read.all`, `orders.create`, `orders.update.all`
- `clients.read.all`, `clients.create`, `clients.update.all`, `clients.archive`
- `users.read`, `users.invite`, `users.manage_company_access`, `users.grant_owner`
- `roles.assign`, `roles.manage_presets`
- `reviews.*`
- `calendar.read.all`
- `analytics.read.company`
- `settings.view`, `settings.update_company`
- Owner-sensitive billing/integration permissions only when those modules are enabled.

Staff Admin:

- Company operations access without automatic owner grant authority.
- `orders.read.all`, `orders.create`, `orders.update.all`
- `clients.read.all`, `clients.create`, `clients.update.all`
- `users.read`, `users.invite`, `users.manage_company_access`
- `roles.assign`
- `reviews.*`
- `calendar.read.all`
- `settings.view`

Staff Appraiser:

- Assigned production access.
- `orders.read.assigned`
- `orders.update.assigned`
- Appraiser-relevant workflow actions.
- `calendar.read.assigned`
- `notifications.read.own`
- `settings.view`

Staff Reviewer:

- Assigned review access.
- `orders.read.assigned`
- Reviewer workflow actions such as `workflow.status.request_revisions`, `workflow.status.approve_review`, where appropriate.
- `reviews.read.assigned`
- `calendar.read.assigned`
- `settings.view`

Staff Billing:

- Billing/accounting surfaces only where enabled.
- `billing.read`
- `billing.view_invoices`
- Optional `billing.adjust_charges`
- No order/client/team authority unless separately granted.

### AMC Operations Mode

AMC Owner:

- AMC-wide operational and company administration access.
- `amc.*`
- `orders.read.all`, `orders.create`, `orders.update.all`
- `assignments.*`
- `vendor.*`
- `client_portal.*`
- `reviews.*`
- `analytics.read.company`
- Owner-sensitive tenant/billing/integration permissions where enabled.

AMC Admin:

- AMC operations management without owner-only package/ownership authority.
- `amc.dashboard.view`
- `amc.orders.read`
- `orders.read.all`, `orders.create`, `orders.update.all`
- `assignments.offer`, `assignments.cancel`
- `vendor.panel.read`, `vendor.panel.update`
- `reviews.*`

AMC Coordinator:

- Intake and assignment coordination.
- `orders.read.all`
- `orders.create`
- `orders.update.all`
- `assignments.offer`
- `assignments.cancel`
- `calendar.read.all`
- Limited vendor/client read permissions.

AMC Reviewer:

- Review/quality-control access.
- `orders.read.assigned` or `orders.read.all` depending package policy.
- `reviews.read.assigned`
- Review workflow actions.
- `calendar.read.assigned`

### Vendor Portal Mode

Vendor Owner:

- Vendor company profile and assigned packet administration.
- `vendor.dashboard.view`
- `vendor.profile.update`
- `assignments.read.assigned`
- Assignment accept/decline/submit actions.
- Limited `team_access` for vendor organization users if enabled.

Vendor User:

- Assigned packet execution.
- `vendor.dashboard.view`
- `assignments.read.assigned`
- `assignments.accept`
- `assignments.submit`
- `calendar.read.assigned`
- `settings.view`

### Client Portal Mode

Client Admin:

- Client organization administration and order submission/status access.
- `client_portal.dashboard.view`
- `client_portal.orders.read`
- `client_portal.orders.create`
- `client_portal.messages.create`
- `reports.read.assigned`
- Limited `team_access` for client organization users if enabled.
- Billing permissions only if client billing is enabled.

Client Requester:

- Submit and track own/client-scoped orders.
- `client_portal.orders.create`
- `client_portal.orders.read`
- `client_portal.messages.create`
- `reports.read.assigned`

Client Viewer:

- View-only order/report status.
- `client_portal.orders.read`
- `reports.read.assigned`
- No create/update/billing/admin authority.

## Route/Nav Permission Guidance

- Route access should use read/view permissions, not mutation permissions.
- Buttons and workflow actions should use specific action permissions.
- A user may enter a route without being able to create/update/delete inside it.
- A user may have a module enabled at company level but no nav item because their personal permissions do not include view/read access.
- Dashboard widgets should require both enabled module and relevant read visibility.

## Matrix Gaps / Open Questions

- Should `users/team.*` become the canonical domain name, or should the existing `users.*` domain remain canonical for Team Access?
- Should `calendar.read.assigned` be derived from `orders.read.assigned` and `assignments.read.assigned`, or seeded independently?
- How granular should `amc.*` become before Continental AMC implementation?
- Should billing package permissions live under `billing.*`, `tenant_admin.*`, or both?
- Which permissions should be operator-only and never assignable inside customer companies?
- How should client portal order visibility distinguish requester-owned, organization-wide, and lender-client account scopes?
- Should `reports.*` include document storage authority or only report lifecycle authority?
- Which archive/delete permissions should remain future-only until archive UX is defined?

## Future Implementation Notes

- Phase 9B should convert this matrix into seed and route/nav/dashboard planning only after product-mode defaults are accepted.
- Permission seed changes should be made in small migrations with catalog checks and no broad role fallback.
- Frontend route/nav/dashboard changes should consume permission hooks and future module entitlement data separately.
- Backend RLS/RPC visibility must continue to enforce row scope independently of permission labels.
