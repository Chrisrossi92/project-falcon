# Canonical Schema Plan

## Purpose

Falcon's current Supabase schema contains useful core tables, legacy profile/auth paths, overlapping order views, mixed activity contracts, and notification identity inconsistencies. This document defines the ideal long-term canonical schema while preserving a safe migration path from the current messy schema.

Primary rule:

No destructive deletes until the canonical schema is created, tested, backfilled, and app code no longer reads legacy fields.

Recommended posture:

- Prefer additive migrations.
- Keep legacy schema as reference during migration.
- Build compatibility views/functions where needed.
- Move app code gradually to canonical tables/contracts.
- Drop old columns/tables only after usage is verified gone.

## Canonical Table List

Long-term canonical tables:

```txt
companies
company_settings
company_notification_settings
company_workflow_settings
company_order_numbering

users
roles
permissions
role_permissions
user_roles
company_invitations
invitation_roles
permission_audit_events

clients
client_contacts
client_billing_profiles

orders
order_participants
order_tasks
activity_log
notifications
notification_preferences
email_outbox

seed_runs
```

Optional future tables:

```txt
documents
order_documents
client_portal_users
client_messages
billing_invoices
billing_payments
calendar_events
```

## Tables To Create Fresh

These should be created fresh because they are missing or the current schema does not match the product model.

### `companies`

Tenant/business account.

```txt
id uuid primary key
name text not null
display_name text
slug text unique
timezone text not null
status text not null default 'active'
settings jsonb default '{}'
created_at timestamptz default now()
updated_at timestamptz default now()
```

### `company_settings`

General setup and app configuration.

```txt
company_id uuid primary key references companies(id)
setup jsonb default '{}'
branding jsonb default '{}'
locale jsonb default '{}'
preferences jsonb default '{}'
created_at timestamptz default now()
updated_at timestamptz default now()
```

### `company_notification_settings`

Company-level notification defaults and admin bell policy.

```txt
company_id uuid references companies(id)
event_key text not null
channel text not null
default_enabled boolean not null default true
required boolean not null default false
rules jsonb default '{}'
created_at timestamptz default now()
updated_at timestamptz default now()
primary key (company_id, event_key, channel)
```

### `company_workflow_settings`

Company-specific lifecycle preferences.

```txt
company_id uuid primary key references companies(id)
workflow_template_key text not null
statuses jsonb default '[]'
transitions jsonb default '[]'
reviewer_policy jsonb default '{}'
delivery_policy jsonb default '{}'
billing_policy jsonb default '{}'
field_task_policy jsonb default '{}'
created_at timestamptz default now()
updated_at timestamptz default now()
```

### `company_order_numbering`

Company-scoped user-facing order number generation.

```txt
company_id uuid primary key references companies(id)
prefix text
pattern text not null
sequence_scope text not null
next_sequence integer not null default 1
current_period text
allow_manual_override boolean not null default true
require_unique_order_number boolean not null default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

### `roles`

Company-scoped named permission bundles.

```txt
id uuid primary key
company_id uuid references companies(id)
name text not null
description text
is_template boolean default false
is_system boolean default false
is_owner_role boolean default false
created_at timestamptz default now()
updated_at timestamptz default now()
unique (company_id, name)
```

### `permissions`

System permission catalog.

```txt
key text primary key
category text not null
label text not null
description text
is_system boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

### `role_permissions`

Permission grants for roles.

```txt
role_id uuid references roles(id) on delete cascade
permission_key text references permissions(key)
created_at timestamptz default now()
primary key (role_id, permission_key)
```

### Normalized `user_roles`

Long-term user-to-role join.

```txt
user_id uuid references users(id) on delete cascade
role_id uuid references roles(id) on delete cascade
company_id uuid references companies(id)
assigned_by uuid references users(id)
assigned_at timestamptz default now()
expires_at timestamptz
is_active boolean default true
primary key (user_id, role_id, company_id)
```

This may be created as a new table or evolved from the existing `user_roles` table, depending on migration risk.

### `company_invitations`

First-run and admin invitation flow.

```txt
id uuid primary key
company_id uuid references companies(id)
email text not null
name text
invited_by_user_id uuid references users(id)
status text not null
token_hash text
expires_at timestamptz
accepted_at timestamptz
created_at timestamptz default now()
updated_at timestamptz default now()
```

### `invitation_roles`

Roles to assign when an invite is accepted.

```txt
invitation_id uuid references company_invitations(id) on delete cascade
role_id uuid references roles(id)
primary key (invitation_id, role_id)
```

### `order_participants`

Canonical order responsibility model.

```txt
id uuid primary key
order_id uuid references orders(id) on delete cascade
user_id uuid references users(id)
responsibility_type text not null
task_id uuid
active_from_status text
active_until_status text
is_active boolean default true
assigned_by uuid references users(id)
assigned_at timestamptz default now()
ended_at timestamptz
metadata jsonb default '{}'
created_at timestamptz default now()
updated_at timestamptz default now()
```

### `order_tasks`

Future task model for field reps, inspectors, document collection, billing follow-up, and client follow-up.

```txt
id uuid primary key
company_id uuid references companies(id)
order_id uuid references orders(id) on delete cascade
task_type text not null
assigned_to_user_id uuid references users(id)
status text not null
title text
description text
due_at timestamptz
scheduled_at timestamptz
completed_at timestamptz
metadata jsonb default '{}'
created_by_user_id uuid references users(id)
created_at timestamptz default now()
updated_at timestamptz default now()
```

### `permission_audit_events`

Audit trail for role/permission/user access changes.

```txt
id uuid primary key
company_id uuid references companies(id)
actor_user_id uuid references users(id)
target_user_id uuid references users(id)
target_role_id uuid references roles(id)
event_type text not null
before jsonb
after jsonb
created_at timestamptz default now()
```

### `seed_runs`

Tracks demo/test data creation.

```txt
id uuid primary key
company_id uuid references companies(id)
seed_key text not null
environment text
status text not null
summary jsonb default '{}'
created_at timestamptz default now()
completed_at timestamptz
unique (company_id, seed_key)
```

## Legacy Tables / Columns To Keep Temporarily

Keep these until canonical replacements are populated and app reads are migrated.

### User/Profile Identity

Keep temporarily:

- `public.user_profiles`
- `public.profiles` view
- `public.user_roles.role`
- any auth-based `user_profiles.user_id`

Reason:

Some current RPCs, views, and UI paths still use profiles and auth-based role strings.

### Orders

Keep temporarily:

- `orders.appraiser_id`
- `orders.reviewer_id`
- `orders.assigned_to`
- duplicate due/date fields
- legacy client/AMC fields
- existing order views such as `v_orders_frontend_v4`

Reason:

These are active compatibility fields and app read paths.

### Activity

Keep temporarily:

- `activity_log.detail`
- `activity_log.message`
- `activity_log.created_by`
- `activity_log.created_by_name`
- `activity_log.created_by_email`
- older `actor_id`

Reason:

Activity feed RPCs and UI depend on these transitional columns.

### Notifications

Keep temporarily:

- `notifications.type`
- `notifications.category`
- `notifications.is_read`
- `notifications.read`
- `notifications.read_at`
- current `payload`

Reason:

Read/write paths have already had type/category and read-state drift. Keep compatibility while converging on `read_at` plus explicit event fields.

### Numbering

Keep temporarily:

- `order_numbering_rules.company_key`
- `order_number_counters`

Reason:

Current order number RPC uses `company_key = falcon_default`.

## Legacy Tables / Columns Likely To Archive Or Drop Later

Drop only after app code and RPCs are migrated and usage is verified gone.

Likely later removals:

- `user_profiles`, if `public.users` fully owns profile fields.
- `profiles` view, or replace with compatibility view over `users`.
- `user_roles.role`, after normalized `role_id` is adopted.
- `orders.assigned_to`, if appraiser/reviewer/participants replace it.
- duplicate order due/date/address fields after canonical order view stabilizes.
- legacy `order_activity`, if present and fully replaced by `activity_log`.
- old order list/frontend views after app reads one canonical view/RPC.
- `notifications.read` and `notifications.is_read`, after `read_at` is universal.
- `order_numbering_rules.company_key`, after company-scoped numbering is live.
- staging/import tables after final ETL sign-off.

## Identity Model

Canonical identity:

```txt
auth.users.id      = authentication identity
public.users.id    = Falcon app user identity
public.users.auth_id = mapping to auth.users.id
```

Rules:

- Domain records reference `public.users.id`.
- RPCs that start from `auth.uid()` must map to `public.users.id`.
- RLS policies on domain records should use `current_app_user_id()`.
- Notification recipients are `public.users.id`.
- Order assignments are `public.users.id`.
- Activity actors should be `public.users.id`.
- Email/outbox recipient IDs are `public.users.id`.

Required helper:

```sql
public.current_app_user_id()
```

Optional compatibility helper:

```sql
public.current_app_user_role_names()
```

## Company / Tenant Model

Canonical tenancy:

- Every business record belongs to a company.
- A user can belong to multiple companies long term.
- Roles are company-scoped.
- Order numbering is company-scoped.
- Settings are company-scoped.
- Demo data is company-scoped.

Core company-scoped tables:

- `users`
- `roles`
- `user_roles`
- `clients`
- `orders`
- `activity_log`
- `notifications`
- `notification_preferences`
- `order_participants`
- `order_tasks`

MVP can begin with one default company and nullable `company_id`, then later enforce `not null`.

## Roles / Permissions Model

Canonical model:

- `roles` are named company-scoped permission bundles.
- `permissions` are system-defined capability keys.
- `role_permissions` grants permissions to roles.
- `user_roles` assigns one or more roles to users.
- Owner is protected, but admin capabilities can be delegated.

Role names should not drive behavior directly. App checks should ask:

```txt
Does this user have permission X in company/order context?
```

MVP migration:

1. Keep current role strings.
2. Add permission compatibility map in app.
3. Add normalized tables.
4. Backfill text roles into normalized roles.
5. Switch permission loading to normalized model.
6. Retire text roles later.

## Orders / Participants / Tasks Model

### Orders

Canonical `orders` should keep core work data:

```txt
id
company_id
order_number
client_id
status
property fields
fee fields
due fields
appraiser_id
reviewer_id
metadata
created_at
updated_at
```

Keep `appraiser_id` and `reviewer_id` as denormalized convenience fields even after `order_participants` exists if they simplify common reads.

### Order Participants

`order_participants` is the long-term responsibility source.

Responsibility types:

- `appraiser`
- `reviewer`
- `inspector`
- `field_rep`
- `billing`
- `client_contact`
- `tagged`
- `watcher`
- `admin_observer`

Resolver should prefer participants, then fall back to `orders.appraiser_id` and `orders.reviewer_id`.

### Order Tasks

`order_tasks` supports scoped work that should not create permanent full-order responsibility:

- field photos
- site visit
- inspection
- document collection
- billing follow-up
- client follow-up

Tasks can create task-scoped participant records.

## Activity / Notification Model

### Activity

Canonical `activity_log` should be the durable source of order/company history.

Recommended columns:

```txt
id
company_id
order_id
actor_user_id
event_type
category
title
body
visibility
importance
payload
created_at
```

It should cover:

- lifecycle events
- communication events
- assignment events
- audit events
- document events
- billing events
- system events

### Notifications

Canonical `notifications` should be delivery records.

Recommended columns:

```txt
id
company_id
user_id
order_id
activity_event_id
type
category
title
body
read_at
link_path
payload
created_at
```

Rules:

- `user_id` references `public.users.id`.
- `payload.order_number` is required for order-related notifications.
- UI displays `title`, `body`, and `payload.order_number`.
- Notifications should not be used as the source of communication history.

## Client Model

Canonical client model:

```txt
clients
- id
- company_id
- name
- client_type
- status
- billing_profile_id
- metadata
- created_at
- updated_at

client_contacts
- id
- company_id
- client_id
- name
- email
- phone
- role
- is_primary
- metadata
- created_at
- updated_at

client_billing_profiles
- id
- company_id
- client_id
- billing_address
- invoice_terms
- delivery_preferences
- metadata
- created_at
- updated_at
```

AMCs should be modeled as clients with `client_type = 'amc'`, not a separate long-term party table.

## Settings Model

Settings should be company-scoped first, then user-scoped where appropriate.

Company settings:

- setup progress
- branding
- order numbering
- workflow defaults
- notification policies
- admin bell policy
- billing policy
- field task policy

User settings:

- personal notification preferences
- quiet hours
- dashboard preferences
- display preferences

Recommended tables:

- `company_settings`
- `company_notification_settings`
- `company_workflow_settings`
- `notification_preferences`
- optional `user_settings`

## Seed / Reset / Demo Strategy

Goal:

Falcon should be resettable and seedable for local development, staging demos, and sales demos.

Recommended tables/markers:

- `seed_runs`
- `metadata.is_demo`
- `metadata.seed_key`

Seed data should include:

- demo company
- template roles
- demo users
- clients
- orders across statuses
- activity history
- sparse notifications

Reset rules:

- Refuse destructive reset in production by default.
- Delete demo records by `company_id` and demo markers.
- Delete child records before parent records.
- Never rely on visible UUIDs or random order numbers in demo data.

## Migration Strategy From Current Schema

### Step 1: Contract And Identity Alignment

- Add `current_app_user_id()`.
- Update RPCs/RLS/triggers to use app user IDs.
- Fix notifications, preferences, email trigger, activity authorization.

### Step 2: Add Company Foundation

- Create `companies`.
- Create `company_settings`.
- Add nullable `company_id` to core tables.
- Backfill a default company.

### Step 3: Create Normalized Role Tables

- Add `roles`, `permissions`, `role_permissions`.
- Extend or replace `user_roles`.
- Backfill current role strings.
- Keep legacy role text during transition.

### Step 4: Enrich Activity And Notifications

- Add canonical nullable fields.
- Backfill from existing `detail`, `message`, `created_by`.
- Keep compatibility views/RPCs.

### Step 5: Add Order Participants

- Create `order_participants`.
- Backfill appraiser/reviewer rows.
- Update resolver to prefer participant table.
- Keep order convenience fields.

### Step 6: Company-Scoped Numbering

- Add company-scoped numbering table/settings.
- Backfill from `falcon_default`.
- Update numbering RPC to use company ID with compatibility fallback.

### Step 7: Setup UX And Seed Packaging

- Build setup wizard.
- Add invitation tables if needed.
- Add seed/demo reset scripts.

### Step 8: Cleanup After Verification

- Remove unused legacy paths only after app and RPC usage are verified gone.

## When It Is Safe To Drop Old Columns / Tables

A legacy column/table is safe to drop only when all are true:

1. Canonical replacement exists.
2. Data is backfilled and verified.
3. App code no longer reads or writes it.
4. RPCs/triggers no longer read or write it.
5. Views no longer depend on it.
6. Tests/build pass without it.
7. Staging has run without errors for a meaningful validation window.
8. A rollback plan exists.

Before dropping:

- Search code with `rg`.
- Check view dependencies.
- Check function definitions.
- Check RLS policies.
- Export/backup data if historical.

## Risks Of Rebuild Versus Incremental Migration

### Clean Rebuild Risks

- Faster conceptual clarity but higher operational risk.
- Easy to miss legacy behavior still used by app code.
- Auth/user mapping bugs can lock users out.
- Notification/history continuity can break.
- Requires coordinated app rewrite and data migration.
- Harder to validate incrementally.

### Incremental Migration Risks

- Legacy complexity remains longer.
- Compatibility layers can become permanent if not tracked.
- Duplicate fields/views can drift.
- Requires discipline and stop conditions.

### Rebuild Advantages

- Cleaner schema.
- Less legacy baggage.
- Better long-term mental model.

### Incremental Advantages

- Lower production risk.
- Easier to validate one path at a time.
- Existing app stays usable.
- Data migration can be staged.

## Recommended Approach For Falcon Right Now

Use incremental migration with a canonical target.

Do not do a big-bang schema rebuild right now.

Recommended next move:

1. Keep the current app working.
2. Complete Phase 1 identity alignment from `docs/IMPLEMENTATION_ROADMAP.md`.
3. Add company foundation additively.
4. Add normalized roles/permissions beside legacy roles.
5. Add `order_participants` beside current assignment fields.
6. Migrate app code to canonical helpers/views/RPCs gradually.
7. Archive/drop legacy only after usage is proven gone.

Why:

- Falcon has active notification/workflow fixes that depend on subtle user ID behavior.
- Current schema already has useful core data.
- Incremental migration reduces the risk of breaking order work, notifications, and activity history.
- A canonical target still prevents endless patching.

## Non-Destructive Migration Rules

- No destructive deletes before canonical tables are created.
- No destructive deletes before data is backfilled and verified.
- No destructive deletes before app code is migrated.
- Prefer additive columns, tables, views, functions, and indexes.
- Keep legacy schema as reference until final cleanup.
- Use compatibility views when replacing table shapes.
- Add `not null` constraints only after backfill.
- Add strict FKs only after orphan data is handled.
- Treat cleanup as a separate phase, not part of feature implementation.
