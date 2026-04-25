# System Data Model

## Purpose

This document defines Falcon's canonical system data model and responsibility engine. It is the contract that workflow, permissions, notifications, activity history, and UI rendering should rely on.

Falcon should become a configurable appraisal operations platform. That requires stable concepts:

- Companies own configuration and data.
- Users belong to companies.
- Roles are permission bundles.
- Orders are company-scoped work records.
- Order participants define responsibility on a specific order.
- Activity log events are durable history.
- Notifications are delivery records.
- UI should render from explicit payload contracts, not inferred role names or internal UUIDs.

Core identifier rule:

- `order.id` is internal database/routing identity.
- `order.order_number` is the user-facing order identifier.
- `public.users.id` is the application user identity.
- `auth.users.id` is authentication identity and should be mapped through `public.users.auth_id`.

## Core Entities

### Company

Purpose:

The tenant/business account that owns settings, users, clients, orders, roles, permissions, workflow policies, and notification policies.

Required fields:

```txt
id uuid primary key
name text not null
display_name text
slug text unique
timezone text not null
status text not null
settings jsonb default '{}'
created_at timestamptz
updated_at timestamptz
```

Relationships:

- Has many users.
- Has many roles.
- Has many clients.
- Has many orders.
- Has company-scoped settings.

What uses it:

- Tenant isolation.
- Setup wizard.
- Role templates.
- Order numbering.
- Workflow configuration.
- Notification preferences.
- Reporting.

Current schema support:

- Falcon appears to have single-company assumptions today.
- Company-scoped behavior can be introduced gradually through `company_id` and settings.

### User

Purpose:

The Falcon application user record. This is the identity used by assignments, notifications, activity actors, and role membership.

Required fields:

```txt
id uuid primary key
auth_id uuid references auth.users(id)
company_id uuid references companies(id)
name text
email text
status text not null
legacy_role text nullable
settings jsonb default '{}'
created_at timestamptz
updated_at timestamptz
```

Relationships:

- Belongs to company.
- Has one auth identity through `auth_id`.
- Has many user roles.
- Can be order participant.
- Can be activity actor.
- Can receive notifications.

What uses it:

- Authentication mapping.
- Assignment.
- Notification delivery.
- Activity attribution.
- Permission resolution.
- User management.

Current schema support:

- `public.users.id` and `public.users.auth_id` already exist.
- Current code should prefer `public.users.id` for application records.
- `users.role` should become a legacy compatibility field, not long-term source of behavior.

### Role

Purpose:

A company-scoped named permission bundle. Role names are display labels and setup conveniences, not hardcoded behavior.

Required fields:

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

Relationships:

- Belongs to company.
- Has many role permissions.
- Assigned to users through user roles.

What uses it:

- Role editor.
- User invitation.
- Permission resolution.
- Owner/admin delegation.
- Setup wizard.

Current schema support:

- Current `user_roles.role` can be mapped into normalized role records later.
- Template roles are currently documentation-level architecture and seed data target.

### Permission

Purpose:

An atomic capability that can be granted through roles.

Required fields:

```txt
key text primary key
category text not null
label text not null
description text
is_system boolean default true
created_at timestamptz
updated_at timestamptz
```

Relationships:

- Belongs to role through `role_permissions`.

What uses it:

- Navigation gates.
- CRUD checks.
- Workflow transition checks.
- Communication visibility.
- Notification preferences/settings.
- Role editor.

Current schema support:

- Current app likely uses role strings and ad hoc checks.
- A compatibility map can define permission keys in code before DB tables exist.

### UserRole

Purpose:

Associates a user with one or more roles in a company.

Required fields:

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

Relationships:

- Joins users to roles.
- Scoped to company.

What uses it:

- Effective permissions.
- User management.
- Invitations.
- Audit events.

Current schema support:

- Current `user_roles` likely exists with text role values.
- Migration can backfill text roles into normalized roles and preserve compatibility temporarily.

### Order

Purpose:

The central appraisal work record.

Required fields:

```txt
id uuid primary key
company_id uuid references companies(id)
order_number text not null
client_id uuid references clients(id)
status text not null
appraiser_id uuid references users(id) nullable
reviewer_id uuid references users(id) nullable
property_address text
due_date date nullable
fee numeric nullable
metadata jsonb default '{}'
created_at timestamptz
updated_at timestamptz
```

Relationships:

- Belongs to company.
- Belongs to client.
- Has many order participants.
- Has many activity log events.
- Has many notifications.
- Has many order tasks.

What uses it:

- Order list.
- Order drawer/detail.
- Assignment workflow.
- Lifecycle transitions.
- Activity and communication.
- Notifications.
- Reporting.

Current schema support:

- Current orders already appear to have `id`, `order_number`, `appraiser_id`, and `reviewer_id`.
- Those assignment fields can remain as MVP convenience fields while `order_participants` is introduced.

### OrderParticipant

Purpose:

The central responsibility model. It defines who is responsible for an order or order task, when that responsibility is active, what context they represent, and how communication/notifications should route.

Required fields:

```txt
id uuid primary key
order_id uuid references orders(id)
user_id uuid references users(id)
responsibility_type text not null
task_id uuid nullable
active_from_status text nullable
active_until_status text nullable
is_active boolean default true
assigned_by uuid references users(id) nullable
assigned_at timestamptz
ended_at timestamptz nullable
metadata jsonb default '{}'
created_at timestamptz
updated_at timestamptz
```

Responsibility types:

```txt
appraiser
reviewer
inspector
field_rep
billing
client_contact
tagged
watcher
admin_observer
```

Relationships:

- Belongs to order.
- Belongs to user.
- May belong to an order task.

What uses it:

- Active participant resolution.
- Workflow routing.
- Notification recipients.
- Communication visibility.
- Status transition eligibility.
- Admin communication feed.
- Reporting.

Current schema support:

- `orders.appraiser_id` and `orders.reviewer_id` support the first version.
- Full participant history, watchers, tagged participants, inspectors, and billing responsibility need new tables/fields later.

## OrderParticipant Activation Rules

### Appraiser

Active when:

- Assigned to an order.
- Order is `assigned`, `in_progress`, `in_review`, or `needs_revisions`.
- Reopened into appraiser-owned work.

Inactive when:

- Reassigned away.
- Order is `completed` or `canceled`.
- Company policy makes appraiser passive after `ready_for_client`.

### Reviewer

Active when:

- Order enters `in_review`.
- Appraiser resubmits after revisions.
- Reviewer is directly tagged.
- Company policy activates reviewer at assignment.

Inactive/passive when:

- Order enters `needs_revisions`, unless company policy keeps reviewer secondary active.
- Order reaches `ready_for_client` and delivery is not reviewer-owned.
- Reassigned away.
- Order is `completed` or `canceled`.

### Inspector / Field Rep

Active when:

- Assigned to an active field/photo/inspection task.
- Task status is `pending`, `scheduled`, or `in_progress`.

Inactive when:

- Task is completed, canceled, or reassigned.
- Order is terminal unless task closeout remains.

### Billing

Active when:

- Billing task exists.
- Order reaches a billing-triggering status such as `ready_for_client`, `delivered`, `completed`, or `canceled`.

Inactive when:

- Billing task is completed or waived.

### Tagged

Active for:

- The communication thread/event where the user was tagged.
- Optional follow-up window defined by company policy.

Tagged responsibility should grant communication visibility and notification delivery for that context, not broad order workflow authority.

### Watcher

Active for:

- Visibility and optional notification preferences.

Watcher does not imply workflow authority.

## ActivityLogEvent

Purpose:

Durable history of what happened on an order or company object. Activity is the source of truth for audit and communication history.

Required fields:

```txt
id uuid primary key
company_id uuid references companies(id)
order_id uuid references orders(id) nullable
actor_user_id uuid references users(id) nullable
event_type text not null
category text not null
title text
body text
visibility text not null
importance text default 'normal'
payload jsonb default '{}'
created_at timestamptz
```

Event categories:

```txt
lifecycle
communication
assignment
audit
document
billing
system
```

Lifecycle event examples:

- `order.created`
- `order.assigned`
- `workflow.started`
- `workflow.submitted_to_review`
- `workflow.revisions_requested`
- `workflow.resubmitted`
- `workflow.approved`
- `workflow.ready_for_client`
- `workflow.completed`
- `workflow.reopened`

Communication event examples:

- `note.appraiser_added`
- `note.reviewer_added`
- `note.admin_added`
- `comment.tagged_user`
- `client.message_received`

Audit event examples:

- `role.permission_added`
- `role.permission_removed`
- `user.role_assigned`
- `company.setting_changed`
- `order.reassigned`

What uses it:

- Order activity log.
- Admin communication feed.
- Audit trail.
- Notification creation context.
- Reporting.

Contract:

Activity events should preserve historical context even if names, roles, assignments, or statuses change later.

Recommended payload shape:

```json
{
  "order_id": "internal-order-uuid",
  "order_number": "ORD-24008",
  "actor": {
    "user_id": "public-user-id",
    "name": "Chris Rossi",
    "role_on_order": "appraiser"
  },
  "event_key": "note.appraiser_added",
  "from_status": "in_progress",
  "to_status": "in_review",
  "participants": {
    "appraiser_id": "public-user-id",
    "reviewer_id": "public-user-id"
  },
  "communication": {
    "kind": "note",
    "kind_label": "Appraiser note",
    "direction_label": "Chris Rossi → Pam Casper"
  }
}
```

Current schema support:

- Current order activity/event logging exists through `rpc_log_event` and activity components.
- Payload enrichment should continue until a normalized activity schema exists.

## Notification

Purpose:

A delivery record for a specific user. Notifications are not the durable source of communication history; they point back to orders and activity context.

Required fields:

```txt
id uuid primary key
user_id uuid references users(id)
company_id uuid references companies(id) nullable
order_id uuid references orders(id) nullable
type text
category text
title text not null
body text
is_read boolean default false
link_path text
payload jsonb default '{}'
created_at timestamptz
read_at timestamptz nullable
```

Relationships:

- Belongs to recipient user.
- May belong to company.
- May belong to order.
- May reference an activity event in payload or future `activity_event_id`.

What uses it:

- Notification bell.
- Notification preferences.
- Email/outbox dispatch.
- Delivery auditing.

Current schema support:

- Current notifications table supports `user_id`, `type`, `category`, `title`, `body`, `order_id`, `link_path`, `payload`, and read state.
- `user_id` should reference `public.users.id`.
- `payload.order_number` is required for clean UI.

## NotificationPayload Contract

Notification UI and delivery code should depend on this payload contract instead of guessing from order UUIDs or role names.

Always required for order-related notifications:

```json
{
  "order_id": "internal-order-uuid",
  "order_number": "ORD-24008",
  "event_key": "note.appraiser_added",
  "importance": "normal",
  "actor": {
    "user_id": "public-user-id",
    "name": "Chris Rossi",
    "role_on_order": "appraiser"
  },
  "recipient": {
    "user_id": "public-user-id",
    "name": "Pam Casper",
    "role_on_order": "reviewer"
  },
  "communication": {
    "kind": "note",
    "kind_label": "Appraiser note",
    "direction_label": "Chris Rossi → Pam Casper"
  }
}
```

Recommended when available:

```json
{
  "activity_event_id": "activity-event-uuid",
  "note_text": "Any revisions yet?",
  "from_status": "in_progress",
  "to_status": "in_review",
  "order_participants": {
    "appraiser_id": "public-user-id",
    "appraiser_name": "Chris Rossi",
    "reviewer_id": "public-user-id",
    "reviewer_name": "Pam Casper"
  },
  "task": {
    "task_id": "task-uuid",
    "task_type": "field_photos",
    "status": "scheduled"
  }
}
```

UI dependencies:

- Notification title uses explicit `notification.title`.
- Notification body uses explicit `notification.body`.
- Visible order label uses `payload.order_number`.
- Routing uses `notification.order_id` or `payload.order_id`.
- Actor display uses `payload.actor.name`.
- Admin communication feed uses `communication.direction_label`, `communication.kind_label`, `importance`, and timestamp.

Rules:

- Never show full internal UUIDs in normal user-facing notification labels.
- A missing `payload.order_number` is a data quality issue for order-related notifications.
- Payload should snapshot actor/recipient names at event time for stable history.

## OrderTask

Purpose:

Future task model for field work, inspections, document collection, billing tasks, and other order-scoped work that should not make a user a permanent full-order participant.

Required fields:

```txt
id uuid primary key
company_id uuid references companies(id)
order_id uuid references orders(id)
task_type text not null
assigned_to_user_id uuid references users(id) nullable
status text not null
title text
description text
due_at timestamptz nullable
scheduled_at timestamptz nullable
completed_at timestamptz nullable
metadata jsonb default '{}'
created_by_user_id uuid references users(id)
created_at timestamptz
updated_at timestamptz
```

Task types:

```txt
field_photos
site_visit
inspection
document_collection
billing_followup
client_followup
```

Relationships:

- Belongs to order.
- Assigned to user.
- Can create task-scoped order participant responsibility.
- Can generate activity events and notifications.

What uses it:

- Future inspector/field rep flow.
- Task-based notifications.
- Order progress.
- Admin operations queue.

Current schema support:

- Can wait until field/inspector workflow becomes MVP priority.

## Responsibility Engine

### `resolveOrderParticipants(order, eventContext)`

Purpose:

Central function that determines active participants, visibility, bell recipients, and responsibility labels for an order event.

This function should replace scattered role-name checks and ad hoc notification recipient selection.

### Inputs

```ts
type ResolveOrderParticipantsInput = {
  order: {
    id: string;
    order_number: string;
    status: string;
    appraiser_id?: string | null;
    reviewer_id?: string | null;
    company_id?: string | null;
  };
  eventContext: {
    event_key: string;
    category: "lifecycle" | "communication" | "assignment" | "audit" | "document" | "billing" | "system";
    actor_user_id?: string | null;
    target_user_ids?: string[];
    tagged_user_ids?: string[];
    task_id?: string | null;
    from_status?: string | null;
    to_status?: string | null;
    importance?: "low" | "normal" | "high" | "critical";
    explicit_recipient_ids?: string[];
    suppress_self_notification?: boolean;
  };
  options?: {
    includeAdmins?: boolean;
    includeWatchers?: boolean;
    respectUserPreferences?: boolean;
  };
};
```

### Outputs

```ts
type ResolveOrderParticipantsOutput = {
  activeParticipants: Array<{
    user_id: string;
    responsibility_type: string;
    role_on_order: string;
    source: "order_assignment" | "order_participant" | "task" | "tag" | "watcher" | "admin_policy";
  }>;
  visibleUserIds: string[];
  bellRecipientIds: string[];
  passiveParticipantIds: string[];
  actorRoleOnOrder: string | null;
  recipientContexts: Array<{
    user_id: string;
    role_on_order: string;
    reason: string;
    importance: string;
  }>;
};
```

### Resolution Steps

1. Normalize identity to `public.users.id`.
2. Load order participants if available.
3. Fall back to `orders.appraiser_id` and `orders.reviewer_id`.
4. Add active participants based on order status and responsibility rules.
5. Add task assignees if event is task-scoped.
6. Add tagged users for communication events.
7. Add watchers for visibility if enabled.
8. Add admin/owner visibility according to permissions and company policy.
9. Determine actor role on order from assignment/responsibility before global role.
10. Determine direct bell recipients from event type and active responsibility.
11. Apply self-notification suppression.
12. Apply user/company notification preferences unless event is critical.
13. Return explicit recipient contexts for payload creation.

### Visibility Rules

Visible users include:

- Active direct participants.
- Passive historical participants when viewing their own historical activity.
- Tagged users for tagged communication.
- Watchers when enabled.
- Admins/owners with `communications.view.all` or `activity.read.all`.
- Client portal users only for client-visible events.

Visibility does not automatically mean bell delivery.

### Bell Recipient Rules

Bell recipients include:

- Direct active participant expected to act next.
- Tagged users.
- Task assignees for task events.
- Admin/owner only if company/user preferences include the event.
- Billing users only for billing-relevant events.

Bell recipients exclude:

- Actor, if self-notification suppression is enabled.
- Inactive participants unless tagged.
- Admin/owner for routine communication unless opted in.
- Users without visibility.

## How Systems Depend On These Contracts

### Lifecycle

Lifecycle transitions depend on:

- Order status.
- Effective permissions.
- OrderParticipant responsibility.
- ActivityLogEvent creation.
- NotificationPayload generation.

Example:

`submit_to_review` moves order to `in_review`, activates reviewer, writes activity event, and notifies reviewer.

### Permissions

Permission checks depend on:

- UserRole global permissions.
- OrderParticipant order-scoped responsibility.
- Company settings.
- Lifecycle status.

Example:

An assigned appraiser can submit their assigned order to review even without broad admin permissions.

### Notifications

Notification creation depends on:

- Activity event context.
- `resolveOrderParticipants`.
- NotificationPayload contract.
- User/company notification preferences.

Example:

A reviewer note in `in_review` creates an activity event and a notification to the assigned appraiser with actor, recipient, order number, and communication direction.

### UI Rendering

UI depends on:

- Explicit title/body fields.
- `payload.order_number` for visible order labels.
- `payload.actor.name` and `payload.recipient.name`.
- Permission helpers for available actions.
- Responsibility helpers for role-on-order display.

UI should not infer business meaning from:

- Internal UUIDs.
- Global role names alone.
- Missing payload fields.

## Current Support And Gaps

### Supported Already

Current schema and app behavior appear to support:

- `public.users.id` and `public.users.auth_id`.
- `orders.appraiser_id`.
- `orders.reviewer_id`.
- `orders.order_number`.
- Activity logging through `rpc_log_event`.
- Notifications with `user_id`, `type`, `category`, `title`, `body`, `order_id`, `link_path`, and `payload`.
- Note notification payload enrichment.
- Existing assignment notification trigger path.

### Needs Change

Near-term changes needed:

- Make `public.users.id` the consistent app-level user reference.
- Ensure notification read RPC maps auth user to `public.users.id`.
- Ensure every order-related notification includes `payload.order_number`.
- Centralize note and workflow recipient resolution.
- Add permission helper compatibility layer instead of hardcoded role checks.
- Add company settings storage for setup/workflow/notification policies.

Schema changes eventually needed:

- `companies`
- normalized `roles`
- `permissions`
- `role_permissions`
- normalized `user_roles`
- `order_participants`
- `company_settings`
- `company_notification_settings`
- `company_workflow_settings`
- `permission_audit_events`

### Can Wait

Later phases:

- Full SaaS multi-company account switching.
- Inspector/field rep `order_tasks`.
- Client portal users.
- Watchers.
- Tagged participant persistence.
- Explicit deny permissions.
- Advanced admin communication feed filters.
- Email/SMS delivery preference matrix.
- Billing workflow automation.

## Implementation Phases

### Phase 1: Contract Alignment

- Document payload contracts.
- Keep using existing order fields.
- Ensure notifications and activity events include order number, actor, recipient, and event key.
- Stop adding new hardcoded role-name routing.

### Phase 2: Responsibility Resolver In Code

- Implement `resolveOrderParticipants(order, eventContext)` using current `orders.appraiser_id` and `orders.reviewer_id`.
- Use it for note notifications and workflow notifications.
- Add tests for appraiser/admin overlap, reviewer lifecycle, and self-notification suppression.

### Phase 3: Permission Compatibility Layer

- Define permission keys in code.
- Map existing role strings to permissions.
- Add frontend permission hooks.
- Gate new UI by permission helpers.

### Phase 4: Normalized Role Tables

- Add role and permission tables.
- Backfill current users.
- Keep legacy fields temporarily.
- Add owner role guardrails.

### Phase 5: Order Participants

- Add `order_participants`.
- Backfill appraiser and reviewer responsibilities.
- Update resolver to prefer participants over order fields.
- Keep `orders.appraiser_id` and `orders.reviewer_id` as denormalized convenience fields if useful.

### Phase 6: Task And Feed Expansion

- Add `order_tasks`.
- Add inspector/field workflow.
- Build admin communication feed from activity events.
- Add company/user notification preferences.

## Non-Negotiable Contracts

- Do not show full internal UUIDs as user-facing order labels.
- Do not route workflow or notifications from global role alone.
- Do not treat admin visibility as admin bell delivery.
- Do not make notifications the durable communication source of truth.
- Do not write order-related notifications without `payload.order_number`.
- Do not compare `auth.users.id` to `orders.appraiser_id`, `orders.reviewer_id`, or `notifications.user_id` unless the schema explicitly stores auth IDs there.
