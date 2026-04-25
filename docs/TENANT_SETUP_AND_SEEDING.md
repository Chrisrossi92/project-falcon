# Tenant Setup And Seeding

## Purpose

Falcon should feel like a configurable appraisal operations platform from the first login. A new appraisal firm owner should be able to set up the company, choose sensible defaults, invite staff, understand what each role can do, and optionally load sample data without developer help.

This document defines the ideal first-run company setup and onboarding UX first, then the technical model needed to support it.

Core principles:

- Company behavior should be configured, not hardcoded.
- Template roles should make setup fast.
- Custom role and permission editing should be understandable to non-technical owners.
- Order numbering, workflow, notifications, and seeded demo data should be company-scoped.
- The same setup flow should work for a single internal deployment now and multi-company SaaS later.

## Ideal First-Run Experience

### Entry Point

The first owner signs in and sees a setup wizard instead of the normal dashboard.

The setup wizard should communicate:

- Falcon needs a few company defaults before orders can be created.
- The owner can accept recommended appraisal-firm defaults.
- Every choice can be changed later from settings, except destructive setup decisions.

The wizard should avoid exposing raw database concepts. It should use business language:

- "Order numbers"
- "Workflow"
- "Staff roles"
- "Invite your team"
- "Clients"
- "Sample data"

## Setup Wizard Steps

Recommended wizard sequence:

1. Company profile
2. Order numbering
3. Workflow defaults
4. Role templates
5. Role permissions
6. Invite users
7. Add clients
8. Sample data
9. Review and launch

The owner should be able to save progress and return later. Required steps for MVP launch should be clearly marked.

## Step 1: Company Profile

### Owner Experience

The owner enters basic company identity:

- Company name
- Short display name
- Time zone
- Business email
- Phone
- Website
- Primary office address
- Logo or brand mark, optional for MVP

The owner should see a preview of how the company name appears in the app.

### Recommended Defaults

- Time zone defaults from browser/system if reliable.
- Display name defaults from company name.
- Slug is generated from company name but editable before launch.

### Technical Implications

Recommended tables/settings:

```txt
companies
- id
- name
- display_name
- slug
- timezone
- status
- primary_email
- phone
- website
- address
- created_at
- updated_at

company_settings
- company_id
- branding jsonb
- locale jsonb
- setup_progress jsonb
```

MVP can store many values in `company_settings.settings` JSON until normalization is needed.

## Step 2: Order Numbering Setup

### Owner Experience

The owner chooses how Falcon generates user-facing order numbers.

The UI should show simple presets:

- `ORD-24001`
- `2026-0001`
- `CR-2026-0001`
- Custom prefix + sequence

The owner should see:

- Next generated number preview.
- Whether numbers reset yearly.
- Whether manual entry is allowed.
- A warning that order numbers are customer-facing and should not be changed casually.

### Required Concepts

- `order.id` is internal and never shown as the normal order label.
- `order.order_number` is the visible company-facing identifier.
- Every created order should have an `order_number`.

### Technical Implications

Recommended settings:

```txt
company_order_numbering
- company_id
- prefix
- pattern
- sequence_scope: global | yearly | monthly
- next_sequence
- allow_manual_override
- require_unique_order_number
- created_at
- updated_at
```

MVP alternative:

```txt
company_settings.order_numbering jsonb
```

Recommended generated examples:

```json
{
  "prefix": "ORD",
  "pattern": "{prefix}-{yy}{sequence:000}",
  "sequence_scope": "yearly",
  "next_sequence": 1,
  "preview": "ORD-26001"
}
```

## Step 3: Default Workflow And Status Setup

### Owner Experience

The owner chooses a workflow template.

Recommended templates:

- Standard appraisal review workflow
- Appraiser-only workflow
- Review-heavy workflow
- Field inspection workflow, optional/future

The UI should explain each workflow in plain language.

Example:

```txt
Standard appraisal review
New → In Progress → In Review → Needs Revisions or Ready For Client → Completed
```

The owner should be able to configure:

- Whether reviewers are assigned at order creation or only when submitted.
- Whether reviewer assignment sends immediate notifications.
- Whether a separate delivered status is used before completed.
- Whether field inspection tasks are used.
- Whether billing must be completed before order completion.

### Technical Implications

Recommended settings:

```txt
company_workflow_settings
- company_id
- workflow_template_key
- statuses jsonb
- transitions jsonb
- reviewer_policy jsonb
- delivery_policy jsonb
- billing_policy jsonb
- field_task_policy jsonb
- created_at
- updated_at
```

MVP can use fixed status constants in code while storing company preferences for notification and reviewer behavior.

## Step 4: Template Role Selection

### Owner Experience

The owner chooses which template roles to create.

Default selected:

- Owner
- Admin
- Appraiser
- Reviewer

Optional:

- Trainee
- Inspector / Field Rep
- Billing
- Client Portal User

The UI should show each role as a business-friendly card:

```txt
Appraiser
Works assigned orders, adds notes, submits to review, responds to revisions.
```

Each card should have:

- Plain-language summary
- Key capabilities
- Recommended for
- Checkbox to include

### Technical Implications

Seed selected template roles into the company:

```txt
roles
role_permissions
```

Template roles should be copied into company-scoped editable roles, not shared as mutable global rows.

## Step 5: Custom Role / Permission Editor UX

### Owner Experience

After template selection, the owner can review and customize roles.

The permission editor should feel like a checklist, not a developer console.

Recommended UX:

- Left panel: roles
- Main panel: grouped permissions
- Search/filter permissions
- Plain-language permission labels
- Expandable advanced permissions
- "Recommended" badges for template defaults
- "Owner-only" locks for protected permissions
- Preview: "People with this role can..."

Example groups:

- Dashboard and navigation
- Orders
- Clients
- Assignments
- Workflow actions
- Activity and communication
- Notifications
- Users and roles
- Billing
- Reports
- Company settings

Example copy:

```txt
Can assign appraisers
Allows this role to assign or change the appraiser responsible for an order.
```

### Guardrails

- At least one owner must exist.
- Owner-only permissions cannot be delegated accidentally.
- Deleting a role with assigned users should require reassignment.
- Removing critical permissions should warn about affected workflows.
- Advanced permissions should be hidden by default.

### Technical Implications

Required later:

```txt
permissions
roles
role_permissions
user_roles
permission_audit_events
```

Frontend helpers should load effective permissions and avoid checking literal role names.

## Step 6: User Invitation Flow

### Owner Experience

The owner invites staff by email and assigns one or more roles.

Required fields:

- Name
- Email
- Role(s)

Optional fields:

- Phone
- License/certification
- Default reviewer/appraiser queue
- Office/location
- Invite message

The owner should see role summaries while assigning:

```txt
Reviewer
Can view assigned review orders, request revisions, and approve review.
```

The invite screen should support:

- Add one user
- Add several users quickly
- CSV import later
- Resend invite
- Cancel invite

### Invitation States

Recommended states:

```txt
draft
sent
accepted
expired
canceled
```

### Technical Implications

Recommended tables:

```txt
company_invitations
- id
- company_id
- email
- name
- invited_by_user_id
- status
- role_ids jsonb or invitation_roles join table
- token_hash
- expires_at
- accepted_at
- created_at
- updated_at

invitation_roles
- invitation_id
- role_id
```

On acceptance:

- Create or link auth user.
- Create `public.users`.
- Assign selected roles.
- Write audit event.

## Step 7: Initial Client Setup

### Owner Experience

The owner can add first clients during setup or skip and add later.

Recommended options:

- Add a client manually.
- Import clients from CSV later.
- Use sample clients if loading demo data.

Manual client fields:

- Client/company name
- Contact name
- Email
- Phone
- Client type: lender, AMC, attorney, private, other
- Billing address
- Default contacts

The setup flow should not force a full CRM build before the owner can launch Falcon.

### Technical Implications

Recommended tables:

```txt
clients
client_contacts
client_billing_profiles
```

MVP can keep client setup minimal as long as orders can be created cleanly.

## Step 8: Initial Demo / Sample Data Option

### Owner Experience

The owner chooses whether to load sample data.

Options:

- Start with an empty workspace.
- Load demo data.

The UI should explain:

```txt
Demo data creates sample users, clients, orders, activity, and notifications so your team can explore Falcon. You can remove it later.
```

The sample data should be clearly labeled and never confused with real work.

### Demo Data Should Include

- Sample company profile.
- Template roles.
- Demo users covering owner, admin, appraiser, reviewer, trainee, inspector, billing.
- Sample clients.
- Orders across lifecycle statuses.
- Activity history.
- A few realistic notifications.

### Technical Implications

Seeded records should have deterministic markers:

```txt
metadata.is_demo = true
metadata.seed_key = "demo-order-in-review-001"
```

This allows safe cleanup:

```txt
delete demo records where metadata->>'is_demo' = 'true'
```

For tables without metadata, use deterministic emails, external keys, or a `seed_runs` table.

## Step 9: Review And Launch

### Owner Experience

The final step summarizes:

- Company profile
- Order numbering preview
- Workflow template
- Roles selected
- Users invited
- Clients added
- Demo data choice

The owner clicks:

```txt
Launch Falcon
```

After launch:

- Owner lands on dashboard.
- Setup checklist remains available.
- Missing optional setup items appear as next steps.

## How Owners Understand Roles

The role system should explain permissions in outcomes, not raw keys.

Recommended UX patterns:

- Role summary cards.
- "Can do" / "Cannot do" preview.
- Permission groups with plain-language labels.
- A compare roles view.
- Warnings for high-risk permissions.
- "Show technical permission keys" behind an advanced toggle.

Example role preview:

```txt
Appraiser can:
- View assigned orders
- Add notes to assigned orders
- Upload documents to assigned orders
- Submit assigned orders to review
- Respond to revision requests

Appraiser cannot:
- View all orders
- Assign reviewers
- Manage users
- Change company settings
```

## SaaS And Multi-Company Mapping

The setup flow should eventually work for multiple companies on the same platform.

Required SaaS concepts:

- Each company has isolated settings.
- Each company has its own copied template roles.
- A user may belong to more than one company.
- A user may have different roles in each company.
- Order numbers are unique per company, not globally.
- Demo data is company-scoped.
- Billing/subscription belongs to company.
- Owner permissions are company-scoped.

Recommended tenancy rules:

- Every business record should have `company_id`.
- Queries should scope by active company.
- Permission checks should include company context.
- Support/platform admins should be separate from company owners.

## Required Tables And Settings

### Near-Term MVP

Can be implemented with:

```txt
companies
company_settings
users
user_roles
clients
orders
order_events/activity
notifications
```

### Long-Term Target

Recommended additions:

```txt
roles
permissions
role_permissions
user_roles normalized by role_id
company_invitations
invitation_roles
company_order_numbering
company_workflow_settings
company_notification_settings
order_participants
order_tasks
seed_runs
permission_audit_events
```

### Example `company_settings`

```json
{
  "setup": {
    "completed": true,
    "completed_at": "2026-04-25T12:00:00Z",
    "steps": {
      "company_profile": "complete",
      "order_numbering": "complete",
      "workflow": "complete",
      "roles": "complete",
      "users": "skipped",
      "clients": "skipped",
      "sample_data": "complete"
    }
  },
  "order_numbering": {
    "prefix": "ORD",
    "pattern": "{prefix}-{yy}{sequence:000}",
    "sequence_scope": "yearly",
    "next_sequence": 1
  },
  "workflow": {
    "template": "standard_review",
    "reviewer_assignment": "at_order_creation",
    "reviewer_assignment_notification": false,
    "use_delivered_status": false
  },
  "notifications": {
    "admin_bell_policy": "important_only",
    "direct_participant_bell_policy": "active_responsibility"
  }
}
```

## Reset And Seeding Strategy

Falcon should support repeatable local and demo environments.

Recommended scripts:

```txt
scripts/db/reset-demo.mjs
scripts/db/seed-demo-company.mjs
scripts/db/seed-template-roles.mjs
scripts/db/seed-users.mjs
scripts/db/seed-clients.mjs
scripts/db/seed-orders.mjs
scripts/db/seed-activity.mjs
```

Seed scripts should:

- Be idempotent where possible.
- Use deterministic seed keys.
- Print summary counts.
- Refuse to run against production unless explicitly allowed.
- Mark demo records.
- Avoid random visible order numbers.

Safe reset order:

1. Notifications.
2. Email/outbox records.
3. Activity logs.
4. Order tasks and participants.
5. Orders.
6. Clients and contacts.
7. Invitations.
8. User role assignments.
9. Non-owner demo users.
10. Company settings/demo company, only if explicitly requested.

## MVP Implementation Phases

### Phase 1: Static First-Run Checklist

- Add a company setup checklist page.
- Store setup progress in company settings.
- Keep existing role model.
- Let owner confirm company profile, order number format, and workflow defaults.

### Phase 2: Seeded Template Setup

- Add template role seed definitions.
- Add deterministic demo data seed.
- Add sample data cleanup.
- Ensure all demo orders use company-facing order numbers.

### Phase 3: Invitations And Role Assignment

- Build invitation flow.
- Assign existing roles during invite.
- Show role summaries.
- Add invitation status tracking.

### Phase 4: Permission-Based Role Editor

- Add normalized roles and permissions.
- Build role editor with grouped permissions.
- Add owner-only guardrails.
- Add audit events for permission changes.

### Phase 5: Company Workflow Configuration

- Store workflow template settings.
- Add reviewer notification policy.
- Add delivered/completed preference.
- Add field task toggle.

### Phase 6: SaaS-Ready Multi-Company Support

- Ensure every business table has `company_id`.
- Add active company context.
- Support one user belonging to multiple companies.
- Add company-level subscription/billing.
- Add platform/support admin separation.

## What To Avoid

- Do not require manual Supabase dashboard edits for normal company setup.
- Do not put company-specific defaults in React components.
- Do not make role names the source of workflow behavior.
- Do not use internal UUIDs as visible order numbers.
- Do not seed demo data that looks like real production data.
- Do not mix production seed logic with demo reset scripts.
- Do not make setup so detailed that a new owner cannot launch quickly.
- Do not build SaaS billing before core operational setup is stable.
