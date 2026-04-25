# Role And Permission Model

## Purpose

Falcon should not hardcode application behavior around fixed global roles like `admin`, `appraiser`, or `reviewer`. Those labels are useful defaults, but they should not be the long-term source of truth for what a user can see, edit, route, approve, or receive as a bell notification.

The long-term model is:

- Roles are named permission bundles.
- Companies can create custom roles.
- Template roles make setup fast.
- Users can have multiple roles.
- Permissions control capabilities.
- Order-specific responsibility controls workflow participation for a specific order.
- Visibility, CRUD access, workflow authority, communication access, and bell notifications are separate concepts.

This model lets Falcon become a configurable appraisal operations platform that can be reset, seeded, and sold to other appraisal companies without rewriting application logic for each firm.

## Product Goals

1. Let each company configure its own staff structure without developer involvement.
2. Provide sensible template roles for common appraisal operations.
3. Allow owners to delegate admin capabilities without granting full ownership.
4. Support multiple roles per user, such as `Reviewer` plus `Billing`.
5. Keep order-specific responsibility separate from global company authority.
6. Route workflow actions and notifications based on active responsibility in the order lifecycle.
7. Keep owner/admin visibility broad while making bell notifications preference-controlled.
8. Make permissions understandable enough for a non-technical company owner to manage.
9. Preserve a secure deny-by-default model for sensitive data and workflow actions.
10. Make future client portal, inspector, trainee, and billing workflows fit the same model.

## Core Definitions

### User Identity

Falcon must be explicit about user identifiers:

- `auth.users.id`: Supabase auth identity.
- `public.users.id`: Falcon application user identity.
- `public.users.auth_id`: mapping from Falcon user to Supabase auth user.

Application records should generally reference `public.users.id`. Database functions that check `auth.uid()` should map that value through `public.users.auth_id` before comparing against application ownership or assignment fields.

### Role

A role is a company-scoped named bundle of permissions.

Example:

```txt
Role: Senior Review Lead
Description: Can review assigned orders and manage reviewer queues.
Permissions:
- navigation.orders.view
- orders.read.assigned
- orders.review.assigned
- orders.status.request_revisions
- orders.status.approve_review
- communications.view.assigned
- activity.create.note.assigned
- reports.view.review_queue
```

Role names are display labels and setup conveniences. Permission checks should not depend on the literal role name except for protected system roles such as owner.

### Permission

A permission is an atomic capability. It should answer:

```txt
Can this user perform this action on this object in this context?
```

Examples:

- `orders.read.assigned`
- `orders.update.all`
- `orders.status.submit_to_review`
- `roles.create`
- `notifications.preferences.manage_company`

### Responsibility

Responsibility is a user's relationship to a specific order or task.

Examples:

- Assigned appraiser on order `ORD-24008`.
- Assigned reviewer during review.
- Assigned inspector for field photos.
- Tagged participant on a note thread.

Responsibility can grant temporary, order-scoped capabilities even when a user's global role is broader, narrower, or unrelated.

Example:

- Chris has a global `Admin` role.
- Chris is the assigned appraiser on `ORD-24008`.
- When Chris adds a note on that order, notification routing should treat him as the order appraiser, not as a generic admin.

## Default Template Roles

Template roles should be created when a new company is seeded. Owners can copy, rename, disable, or modify them, subject to owner-only protections.

### Owner

Highest authority inside a company.

Default intent:

- Full company control.
- Manage owners.
- Manage roles and permissions.
- Manage users and invitations.
- Manage billing/subscription.
- Manage security settings.
- View all orders and communication.
- Delegate admin capabilities.

Owner should be a protected system-level role. At least one active owner must exist per company.

### Admin

Operational manager.

Default intent:

- Manage clients.
- Create and update orders.
- Assign appraisers, reviewers, inspectors, and billing participants.
- View all orders.
- View all communication.
- Manage workflow queues.
- Change order statuses in admin-controlled stages.
- Configure non-sensitive workflow settings when delegated.

Admin should not automatically receive every bell notification. Admin visibility and admin alert delivery must be separate.

### Appraiser

Primary order producer.

Default intent:

- View assigned orders.
- Edit assigned appraisal work fields.
- Add notes and attachments on assigned orders.
- Submit work to review.
- Respond to revisions.
- View communication on assigned orders.

Appraisers remain active through most of the core order lifecycle.

### Reviewer

Quality control participant.

Default intent:

- View assigned review orders.
- Add review notes.
- Request revisions.
- Approve or mark ready for client if company policy allows.
- View communication for assigned review orders.

Reviewers are active during review-related statuses unless directly tagged or explicitly assigned longer.

### Trainee

Limited production or review support user.

Default intent:

- View training-assigned orders.
- Draft notes or updates.
- Upload supporting files if allowed.
- Cannot submit, approve, complete, or send externally unless supervised.

Trainee permissions should be conservative by default.

### Inspector / Field Rep

Task-specific field participant.

Default intent:

- View assigned field/photo tasks.
- See limited order details needed to complete the task.
- Upload photos, measurements, comments, and field status updates.
- No full internal communication access unless granted.

Inspectors are active only during their assigned task window.

### Billing

Financial workflow participant.

Default intent:

- View billing-relevant clients/orders.
- Update invoice and payment statuses.
- Export billing reports.
- No appraisal production authority by default.

### Client Portal User

External or limited-access client user.

Default intent:

- View only permitted client/order records.
- Upload documents or submit requests if enabled.
- View client-facing statuses.
- No internal notes, review notes, or staff communication by default.

## Permission Categories

Permission keys should be grouped by product area. Recommended namespaces:

```txt
company.*
users.*
roles.*
clients.*
orders.*
assignments.*
workflow.*
activity.*
communications.*
notifications.*
documents.*
billing.*
reports.*
settings.*
navigation.*
```

### Company

Company-level identity and platform setup:

- `company.read`
- `company.update_profile`
- `company.manage_branding`
- `company.manage_locations`
- `company.manage_integrations`
- `company.manage_security`
- `company.transfer_ownership`

### Users

User lifecycle:

- `users.read`
- `users.invite`
- `users.create`
- `users.update`
- `users.deactivate`
- `users.reset_mfa`
- `users.impersonate_support`
- `users.manage_company_access`

### Roles

Role and permission management:

- `roles.read`
- `roles.create`
- `roles.update`
- `roles.delete`
- `roles.assign`
- `roles.manage_permissions`
- `roles.manage_owner_role`

### Clients

Client records:

- `clients.create`
- `clients.read.assigned`
- `clients.read.all`
- `clients.update.assigned`
- `clients.update.all`
- `clients.delete`
- `clients.archive`

### Orders

Order records:

- `orders.create`
- `orders.read.assigned`
- `orders.read.all`
- `orders.update.assigned`
- `orders.update.all`
- `orders.delete`
- `orders.archive`
- `orders.export`

### Assignments

Order assignment:

- `assignments.read`
- `assignments.assign_appraiser`
- `assignments.assign_reviewer`
- `assignments.assign_inspector`
- `assignments.assign_billing`
- `assignments.reassign`
- `assignments.clear`

### Workflow

Status and lifecycle transitions:

- `workflow.status.submit_to_review`
- `workflow.status.request_revisions`
- `workflow.status.resubmit`
- `workflow.status.approve_review`
- `workflow.status.ready_for_client`
- `workflow.status.deliver_to_client`
- `workflow.status.complete`
- `workflow.status.reopen`
- `workflow.override_status`

### Activity And Communication

Durable history and internal notes:

- `activity.read.assigned`
- `activity.read.all`
- `activity.create.note.assigned`
- `activity.create.note.all`
- `activity.create.system_event`
- `activity.edit_own_note`
- `activity.delete_own_note`
- `activity.moderate`
- `communications.view.assigned`
- `communications.view.all`
- `communications.reply.assigned`
- `communications.reply.all`
- `communications.tag_users`
- `communications.mark_important`

### Notifications

Notification delivery and preferences:

- `notifications.read_own`
- `notifications.mark_read_own`
- `notifications.preferences.manage_own`
- `notifications.preferences.manage_company`
- `notifications.send_manual`
- `notifications.audit_delivery`

### Documents

Files and report artifacts:

- `documents.upload.assigned`
- `documents.upload.all`
- `documents.read.assigned`
- `documents.read.all`
- `documents.delete`
- `documents.publish_to_client`

### Billing

Financial records:

- `billing.read`
- `billing.update`
- `billing.invoice.create`
- `billing.invoice.send`
- `billing.payment.record`
- `billing.export`
- `billing.manage_rates`

### Reports

Operational and financial reporting:

- `reports.view_operations`
- `reports.view_review_queue`
- `reports.view_appraiser_performance`
- `reports.view_billing`
- `reports.export`

### Settings And Navigation

Configuration and UI visibility:

- `settings.view`
- `settings.manage_workflow`
- `settings.manage_notifications`
- `settings.manage_templates`
- `navigation.dashboard.view`
- `navigation.orders.view`
- `navigation.clients.view`
- `navigation.users.view`
- `navigation.reports.view`
- `navigation.billing.view`
- `navigation.settings.view`

## Detailed Permission Matrix

This matrix describes recommended default template permissions. It is a product baseline, not a hardcoded rule. Companies can adjust roles after setup, except for owner-only protections.

| Permission Area | Owner | Admin | Appraiser | Reviewer | Trainee | Inspector / Field Rep | Billing | Client Portal User |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Company profile | Manage | View / delegated edit | No | No | No | No | No | No |
| Security settings | Manage | Delegated only | No | No | No | No | No | No |
| Billing/subscription | Manage | Delegated only | No | No | No | No | View/update invoices | No |
| Users | Manage | Invite/update delegated | No | No | No | No | No | No |
| Roles/permissions | Manage | Delegated role assignment | No | No | No | No | No | No |
| Clients | Full CRUD | Full CRUD | Read assigned | Read assigned | Read assigned if assigned | Limited task context | Read/update billing fields | Read own client scope |
| Orders | Full CRUD | Full CRUD | Read/update assigned | Read assigned review orders | Read assigned training orders | Read task orders | Read billing-relevant orders | Read permitted client orders |
| Assignments | All | Assign/reassign delegated | No | No | No | No | No | No |
| Appraisal work | Full | Delegated override | Edit assigned | Read/review assigned | Draft assigned if permitted | No | No | No |
| Review work | Full | Delegated override | Respond to revisions | Review assigned | Draft if permitted | No | No | No |
| Field tasks | Full | Assign/manage | Read results if assigned | Read results if reviewing | No | Complete assigned tasks | No | No |
| Internal activity | View all / moderate | View all / moderate delegated | View/create assigned | View/create assigned review | Limited assigned | Task notes only | Billing notes only | No internal notes |
| Client-facing communication | Manage | Manage delegated | No unless delegated | No unless delegated | No | No | Billing-specific if delegated | Own communication |
| Notifications | Manage own/company | Manage own/company delegated | Manage own | Manage own | Manage own | Manage own | Manage own | Manage own |
| Reports | All | Operations/review delegated | Own performance if enabled | Review queue if enabled | No | No | Billing reports | No |
| Settings | All | Delegated sections | No | No | No | No | Billing settings delegated | No |

## Owner-Only Permissions

Some permissions should remain owner-only in MVP because they control business authority, security, or billing risk.

Recommended owner-only permissions:

- `company.transfer_ownership`
- `company.manage_security`
- `billing.manage_subscription`
- `roles.manage_owner_role`
- `roles.delete_system_role`
- `users.grant_owner`
- `users.revoke_owner`
- `settings.manage_authentication`
- `settings.manage_data_retention`
- `settings.manage_integrations.secrets`
- `company.delete_or_deactivate`

Guardrails:

- A company must always have at least one active owner.
- A user should not be able to remove their own last owner permission.
- Owner role changes should write high-priority audit events.
- Owner role assignment should require explicit confirmation.

## Admin-Delegated Permissions

Owners should be able to delegate operational authority without creating another owner.

Useful delegated admin bundles:

- User administration:
  - `users.invite`
  - `users.update`
  - `users.deactivate`
  - `roles.assign`
- Workflow administration:
  - `assignments.assign_appraiser`
  - `assignments.assign_reviewer`
  - `assignments.reassign`
  - `workflow.override_status`
- Company setup:
  - `clients.create`
  - `clients.update.all`
  - `settings.manage_templates`
  - `settings.manage_workflow`
- Notifications:
  - `notifications.preferences.manage_company`
  - `settings.manage_notifications`
- Reporting:
  - `reports.view_operations`
  - `reports.export`

Admin delegation should be visible in the UI as explicit capabilities, not implied by the word `Admin`.

## Multiple-Role Conflict And Merge Rules

Users can have multiple roles. Effective permissions should be computed from all active roles in the user's current company context.

Recommended merge rules:

1. Permissions are additive by default.
2. Deny by absence: if no role or responsibility grants a capability, the user cannot perform it.
3. MVP should avoid explicit deny rules unless absolutely needed.
4. If explicit denies are added later, they should override grants and be clearly marked as advanced company policy.
5. Owner grants override standard role restrictions except protected system constraints.
6. Order-scoped responsibility can grant capabilities only for that order or task.
7. Order-scoped responsibility cannot grant company-level permissions such as role management or billing subscription management.
8. Suspended, deactivated, or expired role assignments grant no permissions.
9. Client portal users should remain isolated by client/company scope even if they have multiple portal roles.

Example:

```txt
User roles:
- Reviewer
- Billing

Effective global permissions:
- Can review assigned orders.
- Can view/update billing fields.
- Cannot assign appraisers unless another role grants it.
```

## Order-Scoped Responsibility Rules

Global permissions answer what a user can generally do. Order responsibility answers what they can do for a specific order right now.

Recommended order responsibility types:

- `appraiser`
- `reviewer`
- `trainee`
- `inspector`
- `field_rep`
- `billing`
- `client_contact`
- `tagged_participant`
- `watcher`

Each responsibility should define:

- `order_id`
- `user_id`
- `responsibility_type`
- `active_from_status`
- `active_until_status`
- `is_active`
- optional `task_id`
- optional `assigned_by`
- optional `assigned_at`

Rules:

1. Appraiser responsibility is active through most of the order lifecycle.
2. Reviewer responsibility is active during review-related statuses.
3. Inspector/field rep responsibility is active during inspection/photo/task statuses.
4. Billing responsibility is active during invoice/payment stages or when assigned.
5. Tagged participants can receive communication visibility and notification delivery for the tagged thread/event.
6. Watchers can have visibility without workflow authority.
7. Assignment-based routing should use order responsibility before global role.
8. Self-notification suppression should compare against `public.users.id`.

Example note routing:

```txt
If actor is assigned appraiser:
  event = note.appraiser_added
  recipient = assigned reviewer if active or relevant

If actor is assigned reviewer:
  event = note.reviewer_added
  recipient = assigned appraiser

If actor is admin with no order responsibility:
  event = note.admin_added
  recipient = participants based on target/context
```

## Navigation Visibility Rules

Navigation should be driven by permissions, not role names.

Examples:

- Show Orders nav if user has `navigation.orders.view` plus at least one order read permission.
- Show Clients nav if user has `navigation.clients.view` plus at least one client read permission.
- Show Users nav if user has `navigation.users.view` and `users.read`.
- Show Reports nav if user has `navigation.reports.view` and at least one `reports.view_*` permission.
- Show Billing nav if user has `navigation.billing.view` and `billing.read`.
- Show Settings nav if user has `navigation.settings.view` and `settings.view`.

Navigation visibility does not equal data access. Backend queries and RPCs must still enforce permission and company scope.

## CRUD Permissions By Object Type

### Companies

- Create: platform/system only for MVP, or owner during tenant setup.
- Read: active company members.
- Update: owner or delegated `company.update_profile`.
- Delete/deactivate: owner-only, likely support-assisted in MVP.

### Users

- Create/invite: `users.invite` or `users.create`.
- Read: `users.read`.
- Update: `users.update`.
- Deactivate: `users.deactivate`.
- Assign roles: `roles.assign`.
- Grant/revoke owner: owner-only.

### Roles

- Create: `roles.create`.
- Read: `roles.read`.
- Update: `roles.update` plus `roles.manage_permissions` for permission changes.
- Delete: `roles.delete`, excluding protected system roles.
- Assign: `roles.assign`.

### Clients

- Create: `clients.create`.
- Read: `clients.read.all`, `clients.read.assigned`, or client portal scope.
- Update: `clients.update.all` or `clients.update.assigned`.
- Delete/archive: `clients.delete` or `clients.archive`.

### Orders

- Create: `orders.create`.
- Read: `orders.read.all`, `orders.read.assigned`, client portal scope, or active responsibility.
- Update: `orders.update.all`, `orders.update.assigned`, or responsibility-specific update permission.
- Delete/archive: `orders.delete` or `orders.archive`.
- Export: `orders.export`.

### Activity And Communication

- Read all: `activity.read.all` or `communications.view.all`.
- Read assigned: `activity.read.assigned` or `communications.view.assigned`.
- Create assigned note: `activity.create.note.assigned`.
- Create any-order note: `activity.create.note.all`.
- Moderate: `activity.moderate`.

### Documents

- Upload assigned: `documents.upload.assigned`.
- Upload all: `documents.upload.all`.
- Read assigned: `documents.read.assigned`.
- Read all: `documents.read.all`.
- Delete: `documents.delete`.
- Publish externally: `documents.publish_to_client`.

### Billing

- Read: `billing.read`.
- Update: `billing.update`.
- Invoice creation/sending: `billing.invoice.create`, `billing.invoice.send`.
- Payments: `billing.payment.record`.
- Export: `billing.export`.

## Notification And Communication Permission Implications

Communication and notification handling should separate four questions:

1. Can the user see the communication?
2. Can the user participate in the communication?
3. Should the user receive a bell notification?
4. Should the user receive external delivery, such as email?

Recommended rules:

- Activity log is durable history.
- Notifications are delivery records.
- Admins/owners may have visibility into all communication without receiving every bell item.
- Direct participants should receive bell notifications when the event requires their attention.
- Bell notification preferences should apply after responsibility routing, except for critical system/security events.
- Notification payloads should include actor, recipient, order, event type, responsibility context, and importance.
- `order.id` is routing/querying only.
- `order.order_number` is the visible identifier.

Recommended notification payload shape:

```json
{
  "order_id": "internal-uuid",
  "order_number": "ORD-24008",
  "event_key": "note.appraiser_added",
  "importance": "normal",
  "actor": {
    "user_id": "public-users-id",
    "name": "Chris Rossi",
    "role_on_order": "appraiser"
  },
  "recipient": {
    "user_id": "public-users-id",
    "name": "Pam Casper",
    "role_on_order": "reviewer"
  },
  "order_participants": {
    "appraiser_id": "public-users-id",
    "appraiser_name": "Chris Rossi",
    "reviewer_id": "public-users-id",
    "reviewer_name": "Pam Casper"
  },
  "communication": {
    "kind": "note",
    "kind_label": "Appraiser note",
    "direction_label": "Chris Rossi → Pam Casper"
  }
}
```

## Suggested Database Tables

MVP should use existing tables where possible, then migrate toward this normalized model.

### `companies`

```txt
id uuid primary key
name text not null
slug text unique
timezone text
settings jsonb default '{}'
created_at timestamptz
updated_at timestamptz
```

### `users`

Existing `public.users` should remain the application user table.

Recommended fields:

```txt
id uuid primary key
auth_id uuid references auth.users(id)
company_id uuid references companies(id)
name text
email text
status text
legacy_role text nullable
settings jsonb default '{}'
created_at timestamptz
updated_at timestamptz
```

Long term, `users.role` should be treated as legacy/display fallback only.

### `roles`

```txt
id uuid primary key
company_id uuid references companies(id)
name text not null
description text
is_template boolean default false
is_system boolean default false
is_owner_role boolean default false
created_at timestamptz
updated_at timestamptz
```

### `permissions`

```txt
key text primary key
category text not null
label text not null
description text
is_system boolean default true
```

### `role_permissions`

```txt
role_id uuid references roles(id)
permission_key text references permissions(key)
created_at timestamptz
primary key (role_id, permission_key)
```

### `user_roles`

```txt
user_id uuid references users(id)
role_id uuid references roles(id)
company_id uuid references companies(id)
assigned_by uuid references users(id)
assigned_at timestamptz
expires_at timestamptz nullable
is_active boolean default true
primary key (user_id, role_id, company_id)
```

Existing `user_roles.role` text can be migrated to `roles.name` or retained temporarily as a compatibility view.

### `order_participants`

```txt
id uuid primary key
order_id uuid references orders(id)
user_id uuid references users(id)
responsibility_type text not null
task_id uuid nullable
active_from_status text nullable
active_until_status text nullable
is_active boolean default true
assigned_by uuid references users(id)
assigned_at timestamptz
ended_at timestamptz nullable
metadata jsonb default '{}'
```

MVP can continue using:

- `orders.appraiser_id`
- `orders.reviewer_id`

Then introduce `order_participants` when inspector, trainee, watcher, and tagged participant behavior becomes more complex.

### `permission_audit_events`

```txt
id uuid primary key
company_id uuid references companies(id)
actor_user_id uuid references users(id)
target_user_id uuid references users(id) nullable
target_role_id uuid references roles(id) nullable
event_type text not null
before jsonb
after jsonb
created_at timestamptz
```

Use for owner changes, role permission changes, user role assignments, and security-sensitive settings.

## Suggested Frontend Permission Helpers And Hooks

Frontend components should ask capability questions instead of checking role strings.

Recommended helpers:

```ts
hasPermission(permissionKey: string): boolean
hasAnyPermission(permissionKeys: string[]): boolean
hasAllPermissions(permissionKeys: string[]): boolean
canReadOrder(order): boolean
canUpdateOrder(order): boolean
canTransitionOrder(order, targetStatus): boolean
canAddActivityNote(order): boolean
canViewCommunication(order): boolean
getOrderResponsibility(order, userId): OrderResponsibility | null
getActorRoleOnOrder(order, userId): string | null
```

Recommended hooks:

```ts
useCurrentUser()
useCompanyContext()
useEffectivePermissions()
useCan(permissionKey)
useOrderAccess(order)
useOrderResponsibility(order)
useNavigationPermissions()
```

Recommended frontend pattern:

```tsx
const { canAddNote, canRequestRevisions } = useOrderAccess(order);

if (canAddNote) {
  return <ActivityNoteForm order={order} />;
}
```

Avoid:

```tsx
if (role === "admin" || role === "reviewer") {
  // hardcoded behavior
}
```

Temporary compatibility can map legacy roles into permissions until the normalized tables exist.

## Permission Evaluation Order

Use a consistent evaluation order:

1. Confirm user is authenticated and active.
2. Confirm user belongs to the current company.
3. Load effective global permissions from active role assignments.
4. Load order-scoped responsibility if an order/task context exists.
5. Apply lifecycle/status constraints.
6. Apply company policy/preferences.
7. Apply explicit protected owner/system constraints.
8. Deny by default.

Example:

```txt
Can Chris request revisions on ORD-24008?

1. Chris is active in company.
2. Chris has global role Admin.
3. Chris is assigned appraiser on this order.
4. Current status is in review.
5. Appraiser responsibility does not grant request revisions.
6. Admin role may grant workflow override only if delegated.
7. If no override permission, deny.
```

## Migration Path From Current Setup

Current state appears to use a mix of:

- `public.users.role`
- `public.user_roles.role`
- `orders.appraiser_id`
- `orders.reviewer_id`
- frontend role checks through hooks such as `useRole`

Recommended migration path:

### Phase 1: Compatibility Layer

- Define a canonical permission catalog in code.
- Map existing role strings to permission arrays.
- Add a frontend `useEffectivePermissions` hook.
- Replace new feature checks with permission helpers.
- Leave existing DB schema unchanged.

### Phase 2: Template Role Tables

- Add `roles`, `permissions`, `role_permissions`.
- Seed template roles per company.
- Backfill existing `users.role` / `user_roles.role` into role assignments.
- Keep legacy fields for read compatibility.

### Phase 3: Multi-Role Support

- Add normalized `user_roles` using `role_id`.
- Update permission loading to use normalized assignments.
- Add owner/admin UI for role assignment.
- Audit role changes.

### Phase 4: Order Participants

- Add `order_participants`.
- Backfill from `orders.appraiser_id` and `orders.reviewer_id`.
- Update notification and workflow routing to use order participants first.
- Keep `orders.appraiser_id` and `orders.reviewer_id` as denormalized convenience fields if useful.

### Phase 5: Owner Role Editor

- Build role management UI.
- Allow owners to create custom roles.
- Lock protected owner-only permissions.
- Add validation for at least one active owner.

## Edge Cases

- A user has `Admin` globally but is assigned as appraiser on a specific order.
- A user has both `Reviewer` and `Billing`.
- A reviewer is removed from an order after review but should still see historical notes they authored.
- A field rep needs only the inspection task, not the whole order file.
- A trainee drafts work but a supervising appraiser must submit.
- A company renames `Appraiser` to `Valuation Specialist`.
- A user belongs to multiple companies with different roles in each.
- An owner accidentally tries to remove their own owner access.
- A deactivated user remains referenced in historical activity logs.
- A notification targets a user whose role changed after the event.
- A client portal user should never see internal notes.
- A direct tag should notify someone who is not otherwise active on the order.
- An admin wants all communication visible in a feed but only high-priority items in the bell.
- A permission is removed from a role while users are currently logged in.
- An order changes status and reviewer responsibility becomes active or inactive.

## MVP Implementation Phases

### Phase 0: Stabilize Current Behavior

- Stop introducing new hardcoded role checks.
- Ensure notification routing uses order assignment before global role.
- Ensure visible order identifiers use `order.order_number`, not UUIDs.
- Keep source changes small while architecture docs are finalized.

### Phase 1: Permission Catalog In Code

- Create a central permission key list.
- Create legacy role-to-permission mapping.
- Add `useEffectivePermissions`.
- Add `useCan` and `useOrderAccess`.
- Use helpers in new or touched UI.

### Phase 2: Navigation And CRUD Gates

- Move navigation visibility to permission helpers.
- Gate client/order/user/settings pages with permissions.
- Keep backend/RPC checks aligned with frontend checks.

### Phase 3: Role Tables And Seeds

- Add normalized role and permission tables.
- Seed template roles per company.
- Backfill current users.
- Keep compatibility with existing `users.role` temporarily.

### Phase 4: Owner Role Management UI

- Build role list, editor, and assignment screens.
- Support custom roles.
- Protect owner-only permissions.
- Add permission audit events.

### Phase 5: Order Participant Model

- Add `order_participants`.
- Backfill appraiser/reviewer assignments.
- Add inspector, field rep, trainee, watcher, and tagged participant support.
- Route workflow and notification decisions through active order responsibility.

### Phase 6: Policy And Preference Refinement

- Add company notification preferences.
- Add role-specific bell defaults.
- Add admin communication feed preferences.
- Add reporting around role permissions and communication visibility.

## What To Avoid

- Do not build new behavior around literal role names.
- Do not assume a user has only one role.
- Do not use global role alone for order workflow routing.
- Do not conflate visibility with bell notification delivery.
- Do not show internal UUIDs as user-facing order identifiers.
- Do not make admin a hidden superuser equivalent to owner.
- Do not let order-scoped responsibility grant company-level authority.
- Do not skip backend permission enforcement because frontend navigation hides a page.
