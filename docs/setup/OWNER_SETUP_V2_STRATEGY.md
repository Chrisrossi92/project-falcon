# Owner Setup V2 Strategy

Status: V2A strategy foundation. This document is planning-only and does not add product code,
database changes, route changes, permission changes, setup automation, onboarding persistence, or
production data mutation.

## Purpose

Owner Setup V2 should answer one owner-facing question:

> What does the owner need to do before Falcon is operational?

It should not primarily answer:

> What diagnostic keys are missing internally?

The current Owner Setup foundation contains useful readiness signals, but V2 should turn the
owner-facing experience into company onboarding while preserving diagnostics as a separate support
surface.

## Current-State Assessment

The current Owner Setup page is safe, but it reads more like a diagnostic/readiness page than real
company onboarding.

Current strengths:

- It is owner/admin-oriented and permission-gated.
- It keeps runtime authority outside setup. Permissions, RLS policies, and guarded RPCs remain the
  operational source of truth.
- Company Profile has a narrow guarded save path for company name, timezone, and locale.
- Team Access is linked through the existing guarded team-management surface.
- Readiness data comes from existing current-company context and pure resolver logic.
- Deferred areas such as workflow settings, company notification settings, branding, and order
  numbering avoid pretending that unsafe configuration exists.

Current gaps:

- The first page emphasis is diagnostic: `Live operational setup context`, diagnostic status,
  severity counts, blocker keys, unknown keys, and static fallback diagnostics dominate the mental
  model.
- Owner-facing copy exposes engineering-oriented states such as `Diagnostic only`, `Deferred`,
  `not_ready`, bootstrap audit readiness, setup blockers, and raw readiness keys.
- The dashboard prompt currently frames setup as `Owner Setup Guidance` and `Review operational
  setup readiness`, with explicit diagnostic-only language.
- There is no persisted owner-facing setup completion model. `setup_complete` exists as read
  context, but the UI does not yet give owners a clear path to mark the company operational.
- Tutorial needs are mixed into setup planning. Learning how to use Falcon is different from
  configuring a company so Falcon can operate.

External SaaS onboarding patterns reinforce this split. Pendo defines user onboarding as helping
users become proficient, notes that some products require configuration before the user can start,
and recommends differentiating new users from new accounts in B2B products:
https://www.pendo.io/glossary/user-onboarding/

## Product Principles

- Activation over audit: Owner Setup exists to make a company operational, not to display every
  internal health check.
- Setup is company-level: It should describe the company's operational readiness, not one user's
  learning progress.
- Tutorial is user-level: Tours and walkthroughs help a person understand Falcon, but they should
  not block company readiness.
- Diagnostics are support-level: Raw readiness keys, bootstrap events, and blocker codes should
  remain available when useful, but not dominate first-run onboarding.
- Minimum readiness is not exhaustive completion: Optional settings should not block launch when
  safe defaults exist.
- Setup state is advisory: It must never grant permissions, bypass RLS, authorize routes, activate
  modules, or replace backend-owned workflow rules.
- Product mode matters: Setup should only ask for information relevant to enabled company modes and
  workspaces.
- Owner language wins: Use plain labels such as `Ready`, `Needs details`, `Optional`, and
  `Complete` instead of raw diagnostic statuses.

## Setup, Tutorial, And Diagnostics Separation

| Surface | Primary question | State owner | Examples | Must not do |
| --- | --- | --- | --- | --- |
| Company Setup | What must this company configure before Falcon is operational? | Company | Company Profile, Team Access, Workflow Defaults, Product Modes | Teach every feature, expose raw diagnostics, grant authority |
| Tutorial / Guided Learning | What does this user need to understand to use this workspace? | User plus company context | Internal dashboard tour, AMC dashboard tour, Order Detail tour, Client Portal basics, Vendor Workspace basics | Block company launch, replace setup completion, change permissions |
| Internal Diagnostics | What evidence helps an owner/admin/developer understand readiness or support issues? | Read model / support data | Raw readiness keys, bootstrap audit event, setup blockers, resolver output | Become the first-run onboarding surface, require optional setup, expose unsafe internals |

## Proposed Company Setup Sections

### Company Profile

Purpose: Establish the company identity owners recognize across Falcon.

Initial fields can remain narrow: company display name, timezone, and locale. Later fields may
include legal name, business address, phone, website, and primary operational contact.

Completion should require only the minimum profile fields Falcon needs to display and operate
predictably.

### Owner Profile

Purpose: Confirm the first owner's identity for attribution, communication, and audit readability.

Initial readiness can use existing authenticated user and owner membership context. Later fields
may include display name, phone, signature preferences, and notification contact expectations.

### Team Access

Purpose: Ensure the owner understands who can access the company workspace.

Minimum readiness should require an active owner/admin path. A solo owner can acknowledge that no
additional team members are needed yet. Inviting every intended staff member should be optional.

### Workflow Defaults

Purpose: Capture company-level operational defaults only where Falcon has safe backend contracts.

Examples include default due windows, review expectations, packet/document expectations, and
assignment defaults. Until contracts exist, this section should be read-only, optional, or deferred.

### Notification Defaults

Purpose: Define company-level notification defaults separately from personal notification
preferences.

This should not block launch while Falcon has safe defaults. Individual users can still manage
personal preferences separately.

### Order Numbering

Purpose: Explain or configure order numbering only after backend numbering contracts are stable.

Near-term setup may show read-only current numbering mode, prefix, last generated number, and
availability status. Owner Setup must not seed numbering rules or become numbering authority.

### Branding

Purpose: Configure owner-facing, client-facing, or vendor-facing identity where enabled.

Branding should remain optional unless a company enables external-facing portals that require it.
Logo uploads and storage-backed assets need guarded storage design before launch.

### Product Modes / Modules

Purpose: Confirm which Falcon operating modes are active for the company.

Examples include Internal Operations, AMC Operations, Client Portal, and Vendor Workspace. Product
mode setup can guide visible configuration, but module state must not become security authority.

## Minimum Readiness Criteria

Owner Setup V2 should allow the company to be marked operational when these minimum conditions are
true:

- Current company context is valid for the owner/admin.
- The company has an active status and a recognizable display name.
- At least one active owner/admin membership exists.
- The current owner profile has usable identity data from authenticated user or app context.
- Team Access has been reviewed, or the owner has acknowledged a solo-owner launch.
- At least one operational product mode is confirmed for the company.
- Required defaults for enabled modes either have explicit values or safe system fallbacks.
- No critical backend blocker prevents ordinary owner/admin access to the configured workspace.

The following should not be required for minimum readiness:

- Every optional notification, branding, workflow, or numbering setting.
- Completion of tutorials or tours.
- All diagnostics reporting green.
- Vendor, client, or AMC configuration for disabled modules.
- Sample data.
- Inviting every future team member.

## Dashboard Banner Hiding Rules

The dashboard setup banner should hide when minimum readiness is achieved and the owner/admin
explicitly completes setup, or when a future setup completion record says the active setup version
is complete.

Recommended behavior:

- Hide after required setup sections are complete and the owner/admin confirms launch readiness.
- Do not re-show for optional incomplete sections.
- Do not re-show because a tutorial was skipped or unacknowledged.
- Re-show only when a critical setup regression appears or a new required setup version applies to
  an enabled product mode.
- Keep diagnostics warnings out of the setup banner unless they map to a specific owner-actionable
  required setup section.
- Use a lighter settings badge or diagnostics notice for optional or support-only items.

## Tutorial Acknowledgement Model

Tutorials should be separate from setup completion.

Recommended acknowledgement shape:

- Key acknowledgements by company, user, workspace or surface, role/profile, tutorial key, and
  tutorial version.
- Support actions such as `Got it`, `Do not show again`, and admin/user reset.
- Track `acknowledged_at`, `dismissed_at`, `version`, and optional `last_seen_at`.
- Keep acknowledgements advisory. They must not grant permissions, hide required setup, or mark the
  company operational.

Candidate tutorial surfaces:

- Internal dashboard tour.
- AMC dashboard tour.
- Order Detail tour.
- Client Portal basics.
- Vendor Workspace basics.
- Team Access basics for owners/admins.

## Persistence And Data Model Recommendations

Short term:

- Continue using existing guarded setup context RPCs as read input.
- Add an owner-facing mapper that translates readiness data into setup sections and plain-language
  states.
- Keep raw readiness output available only in a diagnostics section, tab, or admin/support route.

Future setup state:

- Add backend-owned company setup persistence through guarded RPCs.
- Track setup by company and version, not only by user.
- Store required section status separately from optional section status.
- Record completion metadata: `completed_at`, `completed_by`, `setup_version`, and `source`.
- Store section metadata such as `section_key`, `required`, `status`, `completed_at`,
  `completed_by`, `skipped_at`, `skipped_by`, and `skip_reason`.
- Version setup requirements so a future product mode can add a required step intentionally without
  surprising existing companies.
- Keep diagnostics separate from setup completion. Diagnostic tables or RPC projections can expose
  raw resolver evidence for admins/support without becoming owner-facing setup language.
- Use RPC-first writes. Do not introduce direct frontend writes for setup completion, tutorial
  acknowledgements, roles, permissions, company status, modules, workflow defaults, notifications,
  numbering, storage, or assignments.

## Future Governance Rule

Whenever Falcon adds a major feature, the implementation plan must classify its onboarding impact:

1. Owner setup step: The company must configure, confirm, or choose something before the feature is
   operational.
2. User tutorial step: Users need role/workspace-specific guidance, but no company configuration is
   required.
3. Neither: The feature is self-evident, uses existing defaults, or belongs only in a detail page.
4. Diagnostics only: The signal helps support/admins understand state but is not an owner action.

For every owner setup step, define:

- The owner-facing question it answers.
- Required or optional status.
- Enabled product modes and roles.
- Safe default or fallback.
- Completion event.
- Setup version impact.
- Diagnostics mapping, if any.
- The guarded RPC or backend authority that owns any write.

For every tutorial step, define:

- The user role/workspace/surface it applies to.
- The acknowledgement key and version.
- Whether it can be dismissed.
- Where the user can restart it.

## Suggested Implementation Slices

### V2B: Owner-Facing Setup Taxonomy

Create the section taxonomy and plain-language readiness mapper. Translate existing setup context
into owner-facing section states without adding new persistence or workflow behavior.

V2B implementation decision: add a pure owner-facing mapper that consumes the existing guarded
company setup context and returns setup sections plus summary state. The mapper treats Company
Profile, Owner Profile, and Team Access as the initial minimum-readiness sections. Workflow
Defaults, Notification Defaults, Order Numbering, Branding, and Product Modes / Modules are
optional or deferred and do not block minimum readiness. The mapper deliberately avoids raw
diagnostic keys and does not hide dashboard banners, write persistence, alter permissions, or
change runtime authority.

### V2C: Owner Setup Page Restructure

Make Company Setup the primary page experience. Move raw readiness metrics and key lists behind a
diagnostics section, detail drawer, or separate admin/support area.

V2C implementation decision: wire the V2B mapper into the Owner Setup page as the primary first
screen. The page now leads with owner-facing setup progress, minimum-readiness status, required
section counts, next recommended action, and mapper-backed setup sections. Internal diagnostics
remain available lower on the page and are explicitly labeled diagnostic-only. V2C does not add
tables, persistence, banner hiding, tutorial acknowledgements, permission changes, route changes,
product-mode authority, workflow authority, or new setup modals.

### V2D: Completion State And Banner Rules

Add backend-owned setup completion persistence and guarded RPCs. Implement dashboard banner hiding
based on minimum readiness plus explicit owner/admin completion.

V2D contract decision: persistence requires a dedicated company-scoped setup-state model before any
writes are implemented. Existing company profile fields and `rpc_company_setup_context()` are useful
inputs, but neither should store owner-facing setup completion or banner hiding. The contract lives
in `docs/setup/OWNER_SETUP_V2_PERSISTENCE_CONTRACT.md` and recommends a small
`company_setup_states` table, guarded setup-state RPCs, setup-specific write permission, audit
events, and separate future tutorial acknowledgement storage.

V2E SQL foundation decision: add only the storage and guarded read foundation. The V2E migration
creates `company_setup_states`, seeds `company.setup.manage`, locks direct table access to
service-role, enables RLS, and adds `rpc_owner_setup_state_get()` returning either the stored state
or a default not-started state without writing on read. It does not add setup completion writes,
dashboard banner hiding, modal UI, tutorial UI, route changes, product-mode authority, workflow
authority, or company profile behavior changes.

V2F section-completion decision: add the first guarded setup write RPC only. The RPC writes
allowlisted owner-facing section completion into `company_setup_states.completed_sections`, removes
a section key when completion is set false, and returns the safe setup-state read shape. It remains
unwired from UI and does not hide dashboard banners, write tutorials, alter company profile
behavior, or change runtime authority.

V2G readiness decision: add `rpc_owner_setup_readiness()` as the centralized read-only minimum
readiness evaluator before any setup-complete or banner-hiding writes. It reads completed setup
sections, evaluates only Company Profile, Owner Profile, and Team Access, ignores optional/deferred
sections, returns readiness summary fields for future consumers, and performs no mutations.

V2H setup-complete decision: add `rpc_owner_setup_mark_complete()` as a guarded backend completion
action only. It requires `company.setup.manage`, depends on `rpc_owner_setup_readiness()` returning
`minimum_ready=true`, idempotently records `minimum_ready_at` and `setup_banner_dismissed_at`, and
returns safe setup/readiness state for future UI consumers. V2H does not wire dashboard banner
hiding, add modal/tutorial UI, write tutorial acknowledgements, change company profile behavior,
or make setup completion an authorization source.

### V2E: Tutorial Acknowledgement Foundation

Add user-level tutorial acknowledgement persistence and a small guided-learning framework separate
from company setup.

### V2F: Diagnostics Separation

Create the owner/admin diagnostics view for raw readiness evidence, bootstrap audit status,
blocker keys, unknown/deferred keys, and support-oriented troubleshooting.

### V2G: Team Access Setup Integration

Connect Team Access review, solo-owner acknowledgement, and invitation guidance to setup sections
without changing existing Team Access mutation authority.

### V2H: Module-Aware Setup

Make setup sections conditional on enabled product modes such as AMC Operations, Client Portal, and
Vendor Workspace. Keep module state advisory unless a separate backend authority says otherwise.

### V2I: Smoke And Governance Coverage

Add focused tests and smoke coverage for setup completion, banner hiding, tutorial
acknowledgements, diagnostics separation, and RPC-only write boundaries.
