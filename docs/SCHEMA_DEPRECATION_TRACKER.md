# Schema Deprecation Tracker

## Purpose

This tracker records current legacy tables, columns, views, functions, triggers, and RLS policies that must be kept, migrated, rebuilt, archived, or dropped as Falcon moves toward the canonical schema.

Allowed dispositions:

- Keep canonical
- Keep temporarily
- Migrate/rebuild
- Archive/drop later

Primary rule:

No destructive deletes until canonical replacements are created, tested, backfilled, and app code no longer reads legacy fields.

Roadmap phases refer to `docs/IMPLEMENTATION_ROADMAP.md`.

## Baseline Replay Status - 2026-05-17

Disposition: Keep active baseline chain canonical for future local bootstrap.

Current purpose:

The active Supabase migration chain now represents Falcon's replay-safe baseline plus additive multi-company foundation through Phase 8C3, with frontend assignment foundation, owner offer UX, RPC-only Relationship Management UI, owner-side OrderDetail Company Assignments panel, assignment-scoped packet activity timeline, and assignment-native dashboard surfaces completed through Phase 8C4. Phase 8C4 is frontend-only and adds no backend migration.

Progress:

- Historical replay-unsafe active migrations were archived under `supabase/migrations_archive/pre_baseline_replay_unsafe_20260517/active`.
- Active migrations begin with curated baseline schema, RLS/policies/triggers/grants, and static seed data.
- Multi-company foundation migrations through Phase 8C3 remain active after the baseline, with Phase 8B4H through 8B4K, Phase 8C1B/8C1C, Phase 8C2B/8C2C, Phase 8C3 frontend/docs work, and Phase 8C4 frontend-only dashboard work layered on top.
- Local `supabase db reset` passed against the active migration chain, including the Slice 6C wrapper migration, Slice 7A active-company contract migration, Slice 7B order read isolation migration, Slice 7C order-derived read safety migration, Slice 7D client read isolation migration, Slice 7E1 client table write authorization migration, Slice 7E2 client mutation RPC hardening migration, Slice 7E3A order intake attachment authorization migration, Slice 7E3B legacy order RPC/import quarantine migration, Slice 7F1 order write policy cleanup migration, Slice 7F2 canonical workflow transition RPC hardening migration, Slice 7F3 legacy workflow/status RPC quarantine migration, Slice 7F4A assignment/date mutation guardrail migration, Slice 7G1 activity log policy/RPC hardening migration, Slice 7G2A notification policy/RPC hardening migration, Slice 7H1 legacy view/grant quarantine migration, Slice 7H2A explicit authenticated grants migration, Phase 8B1/8B2 company relationship foundation migration, and Phase 8B3 relationship lifecycle RPC foundation migration.
- Generated Supabase TypeScript types were refreshed from the replayed local database.
- The Supabase Storage startup issue seen during validation was local temp-state/tooling and did not require Falcon SQL changes.

Migration action:

- Keep archived historical migrations out of the active replay path.
- Make future schema changes as forward migrations after the baseline chain.
- Treat Slice 7H2A as complete for explicit authenticated grants and app-role broad-grant cleanup. Treat Phase 8B1/8B2 as complete for static company type, relationship type, and company relationship foundation. Treat Phase 8B3 as complete for RPC-only relationship lifecycle operations. Treat Phase 8B4 as complete for assignment-backed cross-company work records, lifecycle RPCs, packet RPCs, assignment activity/notifications, assignment-native frontend surfaces, and owner-side Offer Assignment UX. Treat Phase 8C1 as complete for safe target-company discovery plus RPC-only Relationship Management UI. Treat Phase 8C2 as complete for the order-scoped owner assignment list RPC and owner-only OrderDetail Company Assignments panel. Treat Phase 8C3 as complete for assignment-scoped packet activity timeline reads through `rpc_order_company_assignment_activity(uuid)` without `activity_log`, `rpc_get_activity_feed`, or canonical order activity exposure. Treat Phase 8C4 as complete for assignment-native dashboard surfaces that call assignment list RPC wrappers only, avoid order dashboard/list/KPI/calendar/activity reuse, link only to `/assignments/:assignmentId`, and route assignment-only users through `DashboardGate` without order/client visibility expansion. Relationship records and lifecycle status alone grant no operational visibility; assignment packet access is not canonical order access. Onboarding UI, users/team isolation, calendar table policy tightening, notification preference company semantics, productized manual/system notifications, `current_reviewer_id` model cleanup, review-route redesign, importer rewrite, client duplicate/canonicalization strategy, broader RLS cleanup, service-role grant reduction, `supabase_admin` platform default-ACL cleanup, and frontend org switching must be separate migrations.

Drop/archive condition:

Do not delete the archived historical migrations during the current recovery phase; they remain audit/reference material.

## 1. User / Profile Identity Tables And Columns

### `public.companies`

Disposition: Keep canonical.

Current purpose:

Canonical company identity table for the future multi-company architecture.

Current risk:

The table exists, but it is not yet an authorization boundary. The membership foundation exists additively, but there is no organization switching, company settings UI, company-aware permission enforcement, or company-aware RLS enforcement yet.

Progress:

- Multi-Company Foundation Slice 1 created `public.companies`.
- The `falcon_default` company is seeded for existing single-company data.
- `orders`, `clients`, `notifications`, and `activity_log` now have nullable `company_id` columns with `NOT VALID` foreign keys to `public.companies`.
- Existing rows are backfilled to `falcon_default`, with notification and activity company derived from related orders where possible.
- Multi-Company Foundation Slice 2 added `public.default_company_id()` for current default-company compatibility.
- Order inserts default missing `company_id` to `falcon_default`, and order updates preserve existing company ownership.
- Order projections now expose `company_id`, and order-generated activity/assignment notifications inherit order company context.
- Multi-Company Foundation Slice 3 made client company scope backend-owned for current default-company compatibility.
- Client inserts now resolve `company_id` server-side through `current_company_id()`, frontend-sent `company_id` is ignored, and client updates preserve existing company ownership.
- Client metric projections now expose `company_id`, client duplicate checks are scoped to the default company, and client merge rejects cross-company clients while updating only same-company linked records.
- Multi-Company Foundation Slice 4 hardens notification and activity write RPCs so new rows derive company context server-side from the source order when available, with `falcon_default` fallback during default-company mode.
- Multi-Company Foundation Slice 5 adds additive company scope to stored calendar projection events when `public.calendar_events` exists. Calendar event company context is derived from linked orders, with `falcon_default` fallback during default-company mode.
- Multi-Company Foundation Slice 6A creates `public.company_memberships`, seeds existing users into active primary `falcon_default` membership, and adds membership helper functions for future company-aware authorization.
- Multi-Company Foundation Slice 6B creates `public.user_role_assignments`, backfills resolvable legacy text roles into `falcon_default` company role assignments, and adds company-aware permission resolver successor functions.
- Multi-Company Foundation Slice 6C wraps the four active permission helpers through `current_company_id()` after parity verification.
- Multi-Company Foundation Slice 7A upgrades `current_company_id()` into a membership-validated active-company context contract with default-company fallback and adds diagnostic context RPCs.
- Multi-Company Foundation Slice 7B makes orders the first backend-enforced company read-isolated operational root.
- Multi-Company Foundation Slice 7C patches order-derived calendar, activity, and notification read bypasses so they require readable source orders.
- Multi-Company Foundation Slice 7D makes clients company-owned operational records for read isolation.
- Multi-Company Foundation Slice 7E1 makes client table writes company-authorized while preserving direct frontend write compatibility for authorized users.
- Multi-Company Foundation Slice 7E2 hardens `merge_clients` and legacy client mutation RPCs through the current-company authorization boundary.
- Multi-Company Foundation Slice 7E3A enforces backend order intake company/client/AMC attachment authorization.
- Multi-Company Foundation Slice 7E3B quarantines legacy uuid-based order RPCs and makes `import_orders_from_json(jsonb)` service-role-only.
- Multi-Company Foundation Slice 7F1 replaces legacy order table write policies with company-aware insert/update/delete policies.
- Multi-Company Foundation Slice 7F2 makes the canonical workflow transition RPC company-aware while preserving transition semantics.
- Multi-Company Foundation Slice 7F3 quarantines legacy arbitrary workflow/status RPCs while preserving their signatures.
- Multi-Company Foundation Slice 7F4A adds assignment/date mutation guardrails, assignment target helpers, trigger-level assignment validation for `appraiser_id`, `assigned_to`, `reviewer_id`, and `current_reviewer_id`, guarded assignment/date RPCs, and stale assignment/date RPC quarantine.
- Multi-Company Foundation Slice 7G1 hardens `activity_log` table reads/inserts and both active `rpc_log_event` overloads through readable/updateable current-company source order checks.
- Multi-Company Foundation Slice 7G2A hardens notification table policies, active notification create/read-state RPCs, and quarantines legacy manual/debug notification RPCs.
- Multi-Company Foundation Slice 7H1 revokes app-role SELECT from 17 unsafe legacy exposed views, preserves canonical hardened view access, and patches activity compatibility views to hide `order_id is null` rows.
- Multi-Company Foundation Slice 7H2A removes broad `PUBLIC`, `anon`, and `authenticated` object grants, leaves `anon` with no table/view/sequence/function access, and makes `authenticated` access explicit allowlist only while preserving canonical hardened surfaces.
- Multi-Company Phase 8B1/8B2 adds the company type foundation, relationship type foundation, and `company_relationships` directional relationship foundation. New relationship tables are service-role-only, and relationship records alone grant no visibility.
- Multi-Company Phase 8B3 adds relationship lifecycle permissions, helper predicates, status guards, and RPC-only lifecycle operations while keeping direct relationship table access blocked for app roles.
- Baseline replay recovery moved historical replay-unsafe migrations out of the active chain while preserving the multi-company foundation through Phase 8B4G after the curated baseline.
- Slice 7H2A and Phase 8B did not move, rename, or remove legacy objects and did not change frontend behavior, Smart Actions, queue/calendar projections, `current_reviewer_id` model semantics, review-route design, `calendar_events` table policies, notification preference semantics, uniqueness or indexes, contacts/AMC/lender hierarchy behavior, user/team policies, order-numbering uniqueness, onboarding, company settings behavior, `current_is_admin()`, or `current_is_appraiser()` behavior.

Canonical replacement:

None. This is the canonical company identity table.

Migration action:

- Keep the default-company foundation additive.
- Use `company_memberships` for user/company participation instead of treating `users.company_id` as the long-term membership model.
- Continue active-company context, company-aware permissions, and membership-backed RLS in later slices after the initial order read boundary.

Drop/archive condition:

Never drop as part of the current plan.

Roadmap phase:

Phase 5.

### `public.company_types`

Disposition: Keep canonical.

Current purpose:

Static lookup/config table for company operating modes. It is intentionally not a PostgreSQL enum so future operating modes can be added safely.

Current risk:

Low. Company type drives future presets, labels, and setup defaults only. It must not become a direct RLS, workflow, or operational visibility switch.

Progress:

- Phase 8B1/8B2 created `public.company_types`.
- Seed rows exist for `staff_shop`, `amc`, `vendor`, `hybrid`, `review_firm`, and `enterprise`.
- Existing companies are backfilled/defaulted to `staff_shop` through `companies.company_type`.
- `companies.company_type` has a `NOT VALID` FK to `company_types.key`.
- RLS is enabled on `company_types`.
- No `anon` or `authenticated` table grants exist; `service_role` access is preserved for operator/setup paths.

Canonical replacement:

None. This is the canonical company operating-mode lookup.

Migration action:

- Keep company type behavior static/config-only.
- Do not bind workflow, RLS, or operational visibility directly to `company_type`.
- Future onboarding/settings UI may read these rows through explicit productized RPCs or views.

Drop/archive condition:

Never drop as part of the current plan.

Roadmap phase:

Phase 5, Phase 8.

### `public.company_relationship_types`

Disposition: Keep canonical.

Current purpose:

Static lookup/config table for directional inter-company relationship vocabulary.

Current risk:

Low. Relationship types are descriptive and advisory in Phase 8B; they do not grant operational visibility.

Progress:

- Phase 8B1/8B2 created `public.company_relationship_types`.
- Seed rows exist for `amc_vendor`, `staff_overflow_vendor`, `review_provider`, `enterprise_child`, `billing_managed`, and `support_managed`.
- Allowed source/target company type arrays exist for future onboarding and validation flows.
- RLS is enabled.
- No `anon` or `authenticated` table grants exist; `service_role` access is preserved for operator/setup paths.

Canonical replacement:

None. This is the canonical relationship type lookup.

Migration action:

- Keep relationship type rows as product vocabulary and future validation input.
- Do not use relationship type alone as an authorization grant.

Drop/archive condition:

Never drop as part of the current plan.

Roadmap phase:

Phase 5, Phase 8.

### `public.company_relationships`

Disposition: Keep canonical foundation.

Current purpose:

Directional relationship records between companies using `source_company_id` and `target_company_id`. Relationships model approved operational context for future vendor/review/enterprise/billing/support participation.

Current risk:

Low in the current implementation because direct app-role table access remains blocked and relationship lifecycle access is RPC-only. Relationship records and lifecycle status do not affect order, client, workflow, activity, notification, calendar, queue, or team visibility. Future risk is authorization drift if relationship existence is treated as visibility without explicit assignment.

Progress:

- Phase 8B1/8B2 created `public.company_relationships`.
- Directional source/target company semantics are documented.
- Lifecycle status supports `invited`, `active`, `suspended`, `archived`, `declined`, and `expired`.
- Compliance and settings JSON fields exist for future trust/compliance metadata and relationship-specific defaults.
- Audit user columns and timestamp columns exist.
- Partial uniqueness and lookup indexes exist for current invited/active/suspended relationships.
- RLS is enabled.
- No `anon` or `authenticated` table grants exist; `service_role` access is preserved for operator/setup paths.
- Phase 8B3 seeded relationship lifecycle permissions: `relationships.read`, `relationships.invite`, `relationships.approve`, `relationships.suspend`, `relationships.archive`, `relationships.manage_compliance`, and `relationships.assign_work`.
- Phase 8B3 added helper predicates for relationship read, invite, approve, suspend, archive, and compliance authority.
- Phase 8B3 added RPC-only lifecycle operations for list, detail, invite, accept, decline, suspend, reactivate, and archive.
- Phase 8B3 made relationship source company, target company, and relationship type immutable after creation.
- Phase 8B3 enforces relationship status transition rules by trigger, with archived relationships terminal.
- Phase 8C1A added `rpc_company_relationship_target_search(text, text, integer)` as the canonical safe target-company discovery surface for relationship invite UX.
- Phase 8C1B/8C1C added and hardened RPC-only frontend relationship management routes without direct relationship/company table reads.
- Relationship records and lifecycle state still grant no operational visibility.

Canonical replacement:

None yet. This is the relationship foundation; future order-company assignment records should become the visibility grant.

Migration action:

- Keep direct relationship table access blocked for app roles; use guarded RPCs for lifecycle operations.
- Use `rpc_company_relationship_target_search` for relationship invite target discovery; do not expose `companies` directly to frontend discovery.
- Do not let relationship existence alone grant operational visibility.
- Add assignment-backed visibility in a later phase before cross-company order participation is enabled.

Drop/archive condition:

Never drop as part of the current plan.

### `public.order_company_assignments`

Disposition: Keep canonical assignment-backed cross-company work grant.

Current purpose:

Assignment records grant scoped work packet access between an owner company and an assigned company. They are the explicit boundary for vendor/review/enterprise/billing/support work participation and are separate from canonical order visibility.

Current risk:

Medium. Assignment packets intentionally expose operational work context across companies, so packet RPCs and frontend rendering must stay allowlist-based. The current implementation avoids direct assigned-company access to canonical order views, clients, fees, splits, internal notes, and owner-company activity history.

Progress:

- Phase 8B4A created `public.order_company_assignments` as the explicit owner-company to assigned-company assignment record.
- Phase 8B4B added lifecycle RPCs for offer, accept, decline, start, submit, complete, cancel, and revoke behavior.
- Phase 8B4D added assigned-company work packet RPCs.
- Phase 8B4E added assignment-scoped activity and notifications.
- Phase 8B4G added the assigned offer packet RPC.
- Phase 8B4H added assignment-native frontend routes, inbox, owner management, packet resolver, offer/work/owner packet pages, lifecycle actions, timeline-lite, and permission-gated nav/command-palette entries.
- Phase 8B4I hardened notification routing, command palette gating, payload allowlists, packet states, lifecycle confirmation UX, and resolver diagnostics.
- Phase 8B4J added owner-side Offer Assignment UX from canonical `OrderDetail` only.
- Phase 8B4K hardened offer modal accessibility, safe error copy, responsive owner action layout, success feedback, relationship picker copy, and curated handoff rendering.
- Phase 8C2A added `rpc_order_company_assignment_list_for_order(uuid)` as the narrow owner-scoped, order-scoped assignment summary RPC for `OrderDetail`.
- Phase 8C2B added the owner-only `Company Assignments` panel in canonical `OrderDetail`, using only the order-scoped list RPC and linking rows to assignment packets.
- Phase 8C2C hardened panel copy/accessibility and documented Phase 8C2 closeout.
- Phase 8C3 added `rpc_order_company_assignment_activity(uuid)` as the assignment-scoped timeline read RPC over `order_company_assignment_activity`.
- Phase 8C3 replaced timestamp-lite packet timelines with `AssignmentActivityTimeline`, which calls only the assignment activity RPC and does not use `activity_log`, `rpc_get_activity_feed`, direct assignment activity table reads, or canonical order activity.
- Phase 8C4 added assignment-native dashboard surfaces for assigned-company work and owner sent-assignment attention.
- Phase 8C4 dashboard widgets call only assignment list RPC wrappers, render safe assignment summary fields, and link only to `/assignments/:assignmentId`.
- Phase 8C4 hardened `/dashboard` through `DashboardGate`: order-capable and mixed users keep the existing order dashboard, assignment-only users receive the assignment dashboard, and authenticated users without dashboard capability receive a stable unavailable state.
- Assignment notifications use `/assignments/:assignmentId` links and keep `notifications.order_id = null` for assignment events.
- Assigned-company UI remains packet-only and does not use canonical order UI surfaces.
- Vendors are never written into owner-company `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, or `orders.current_reviewer_id` by assignment offer UX.

Canonical replacement:

None. This is the canonical cross-company work assignment foundation.

Migration action:

- Keep assignment packet access separate from canonical order access.
- Keep relationship existence as context only; relationship records alone must not grant order/client visibility.
- Keep assigned-company frontend surfaces using assignment RPCs only.
- Keep payload rendering positive-allowlist based and avoid client/AMC/fee/split/internal-note exposure.
- Keep `OrderDetail` assignment summaries owner-only, order-scoped, and backed by `rpc_order_company_assignment_list_for_order(uuid)` rather than broad owner-list frontend filtering.
- Keep assignment panel navigation pointed at `/assignments/:assignmentId`, not canonical order routes, and keep lifecycle actions out of the panel until a separate permission/action design is approved.
- Keep assignment activity timelines backed by `rpc_order_company_assignment_activity(uuid)` and `order_company_assignment_activity`; do not reuse canonical order activity for assigned-company packet history.
- Keep assignment dashboard surfaces assignment-native: no order dashboard widgets, `UnifiedOrdersTable`, order dashboard summary/KPI hooks, order list RPCs, activity feed RPCs, direct order/client/assignment table reads, assigned-company `/orders` links, or client/AMC/fee/split/internal-note fields.
- Add future order-picker or owner management creation flows only after a safe owner-side order selection plan exists.

Drop/archive condition:

Never drop as part of the current multi-company plan.

Roadmap phase:

Phase 5, Phase 8.

### `public.company_memberships`

Disposition: Keep canonical.

Current purpose:

Canonical link between app users and companies for future multi-company membership, active-company context, and company-aware authorization.

Current risk:

The table now validates the active-company context used by `current_company_id()`, but it is not yet a tenant-isolation boundary. Current RLS, route guards, security-definer RPCs, and role assignment RPCs still need separate enforcement work.

Progress:

- Multi-Company Foundation Slice 6A created `public.company_memberships`.
- Existing `public.users` rows are seeded into active primary `falcon_default` memberships.
- Membership FKs to `public.companies` and `public.users` are additive `NOT VALID` constraints.
- Slice 7A upgrades `current_company_id()` to accept a JWT/app metadata active-company claim only when the current app user has active membership in that company.
- Missing, invalid, or non-member active-company claims fall back to `falcon_default` during compatibility mode.
- `current_app_user_company_ids()` and `current_app_user_has_company(company_id)` expose membership context for future authorization.
- `current_app_user_has_current_company()` exposes whether the resolved current company is an active membership for the current app user.
- `rpc_current_company_context()` exposes auth identity, app identity, active-company claim, resolved company, membership state, permission count, and current-company role assignments for diagnostics.

Canonical replacement:

None. This is the canonical membership table.

Migration action:

- Keep membership validation as an observable context contract until tenant enforcement work begins.
- Later use memberships to scope team directory RPCs, assignment selectors, company-aware RLS, and active-company organization switching.
- Clean up permissive RLS policies and add explicit active-company filters inside security-definer RPCs before treating tenant isolation as enforced.
- Do not overload legacy `user_roles` as the membership table.

Drop/archive condition:

Never drop as part of the current plan.

Roadmap phase:

Phase 5, Phase 6.

### `public.user_role_assignments`

Disposition: Keep canonical.

Current purpose:

Canonical company-scoped role assignment table that maps `public.users.id` to role bundles within a company context.

Current risk:

The table now feeds the active permission helper wrappers through `current_company_id()`, but current RLS, current frontend permission hooks, `profiles.role`, legacy role RPCs, `current_is_admin()`, and `current_is_appraiser()` still preserve compatibility behavior.

Progress:

- Multi-Company Foundation Slice 6B created `public.user_role_assignments`.
- Existing legacy `public.user_roles` rows are backfilled into `falcon_default` assignments where the legacy user ID resolves through either `public.users.id` or `public.users.auth_id`.
- Legacy text roles are mapped to template roles where `roles.company_id is null`.
- Additive `NOT VALID` FKs link assignments to `public.companies`, `public.users`, and `public.roles`.
- Company-aware permission resolver successors now exist:
  - `current_app_user_permission_keys_for_company(company_id)`
  - `current_app_user_has_permission_for_company(company_id, permission_key)`
  - `current_app_user_has_any_permission_for_company(company_id, permission_keys)`
  - `current_app_user_has_all_permissions_for_company(company_id, permission_keys)`
- Permission parity passed before Slice 6C edits.
- Slice 6C added `20260518010000_company_permission_helper_wrappers.sql`.
- The four active permission helpers now resolve through `current_company_id()` and the company-aware successor helpers:
  - `current_app_user_permission_keys()`
  - `current_app_user_has_permission(text)`
  - `current_app_user_has_any_permission(text[])`
  - `current_app_user_has_all_permissions(text[])`
- `current_is_admin()` and `current_is_appraiser()` remain legacy compatibility helpers.
- Slice 6C made no RLS, frontend, organization-switching, or workflow changes.
- Local `supabase db reset` passed after the wrapper migration and generated Supabase TypeScript types were refreshed.

Canonical replacement:

None. This is the canonical company-scoped role assignment table.

Migration action:

- Keep current permission helper wrappers on `current_company_id()` and the Slice 7A compatibility fallback until enforcement slices migrate RLS/RPC behavior.
- Later update role-management RPCs and admin UI to write this table instead of legacy text roles.
- Later use this table with company memberships for RLS and workflow authorization.
- Keep `public.user_roles` until RLS, route guards, profile role display, and admin/user management no longer depend on it.

Slice 6C parity verification used before wrapper migration:

```sql
with legacy as (
  select permission_key
  from public.current_app_user_permission_keys() as permission_key
),
company as (
  select permission_key
  from public.current_app_user_permission_keys_for_company(public.current_company_id()) as permission_key
)
select 'legacy_minus_company' as diff_type, permission_key from legacy
except
select 'legacy_minus_company', permission_key from company
union all
select 'company_minus_legacy' as diff_type, permission_key from company
except
select 'company_minus_legacy', permission_key from legacy
order by diff_type, permission_key;
```

```sql
select ur.*
from public.user_roles ur
left join public.users u_by_id on u_by_id.id = ur.user_id
left join public.users u_by_auth on u_by_auth.auth_id = ur.user_id
left join public.roles r
  on r.company_id is null
 and lower(r.name) = lower(ur.role)
where coalesce(u_by_id.id, u_by_auth.id) is null
   or r.id is null;
```

```sql
select
  ur.user_id as legacy_user_id,
  ur.role,
  coalesce(u_by_id.id, u_by_auth.id) as resolved_app_user_id,
  r.id as template_role_id,
  ura.id as assignment_id
from public.user_roles ur
left join public.users u_by_id on u_by_id.id = ur.user_id
left join public.users u_by_auth on u_by_auth.auth_id = ur.user_id
left join public.roles r
  on r.company_id is null
 and lower(r.name) = lower(ur.role)
left join public.user_role_assignments ura
  on ura.company_id = public.default_company_id()
 and ura.user_id = coalesce(u_by_id.id, u_by_auth.id)
 and ura.role_id = r.id
where ur.role is not null
order by ur.role, ur.user_id;
```

Drop/archive condition:

Never drop as part of the current plan.

Roadmap phase:

Phase 5, Phase 6.

### `public.company_member_invitations`

Disposition: Keep canonical.

Current purpose:

Service-role-only invitation ledger for company member invites. It coordinates authenticated invite prepare, Supabase Auth Admin invite/finalize, authenticated invite acceptance, and RPC/Edge-mediated invitation management without exposing invitation, membership, or role-assignment tables directly to the frontend.

Current risk:

The table must remain non-authoritative for operational visibility. `prepared`, `sent`, and `invited` states must not grant company access or permissions until authenticated acceptance activates the membership and invitation-scoped role assignments.

Progress:

- Phase 8C5E3 created `public.company_member_invitations` with statuses `prepared`, `sent`, `accepted`, `cancelled`, `expired`, and `auth_failed`.
- RLS is enabled and table grants are service-role-only.
- `rpc_company_member_invite_prepare(...)` validates current-company access, company status, invite/role permissions, role preset safety, Owner grant authority, duplicate pending invites, and active/inactive member conflicts.
- `rpc_company_member_invite_finalize(...)` is service-role-only, validates Auth Admin invite results, creates or links the invited app user, creates an invited membership, stages requested role assignments as inactive, and writes audit.
- `rpc_company_member_invite_accept(uuid, text)` authenticates the invitee, rejects invalid/non-sent/expired/wrong-user/stale-role states, activates the invited membership, activates only invitation-scoped role assignments, writes `company.member_invite_accepted`, and returns a session refresh contract.
- The frontend `/accept-invite/:invitationId` route calls only the acceptance RPC after auth and uses `set-active-company` only after successful acceptance when the active-company context is not already valid.
- Phase 8C5F1 added `rpc_company_member_invitations_list(text, integer)` and `rpc_company_member_invitation_cancel(uuid, text, text)` for safe current-company invitation list/cancel management.
- Phase 8C5F2 added resend prepare/finalize RPCs and the `resend-company-member-invite` Edge Function. Resend creates a new invitation row, preserves prior invitation history, and never returns provider invite URLs or tokens.
- Phase 8C5F3 added Team Access invitation UI that uses only invitation RPCs and invite/resend Edge Functions. It does not read or write invitation, membership, role assignment, role, or role permission tables directly.

Canonical replacement:

None. This is the canonical member invitation table.

Migration action:

- Keep direct app-role table access blocked.
- Keep Auth Admin invite/create behavior in Edge/service-role code only.
- Keep invitation acceptance separate from active-company switching; use `set-active-company` after acceptance when needed.
- Do not activate memberships or role assignments before acceptance.
- Do not mutate `public.user_roles` or use `public.users.role` as member/role authority.
- Keep invite management on narrow RPCs/Edge Functions; do not add direct frontend table reads.
- Keep resend append-only from a product-history perspective: create a new invitation row and preserve the prior row instead of mutating accepted invitation history.

Drop/archive condition:

Never drop as part of the current multi-company plan.

Roadmap phase:

Phase 5, Phase 8C5.

### `public.users`

Disposition: Keep canonical.

Current purpose:

Canonical app user table linked to Supabase auth through `auth_id`.

Current risk:

Some current code, migrations, and policies still use `auth.uid()` or `user_profiles.user_id` as if it were the app user ID.

Progress:

- Phase 1 Batch 1 added `public.current_app_user_id()` and aligned notification/preference identity.
- Phase 1 Batch 2 Step 1 aligned key RLS read/check paths and lifecycle order visibility.
- Phase 8C5G4A1-A3A moved assignment-facing appraiser/reviewer picker reads to `rpc_company_assignable_users`, removed the old `listAssignableUsers` path, removed direct assignment-picker `profiles`/`user_roles` split fallback reads, and deleted the dead singular `userService.listAppraisers` compatibility path.
- Phase 8C5G4B1-C4 moved active order filter and order-form client intake paths to narrow RPCs: `rpc_order_filter_clients`, `rpc_order_form_client_options`, `rpc_order_form_client_name_search`, and `rpc_order_form_client_create`. OrdersFilters, ClientFields, and OrderForm no longer directly read `clients` or use broad client creation/search for order intake. Dormant `ClientSelect.jsx` was deleted after import scans confirmed it was unused.
- Phase 8C5H1-H2E moved active broad client management reads and create/update mutations to guarded RPC wrappers: `rpc_client_management_list`, `rpc_client_management_detail`, `rpc_client_management_amc_options`, `rpc_client_management_create`, `rpc_client_management_update`, and `rpc_client_management_archive`. Active client management no longer directly reads or writes `clients`; dormant legacy client drawer/detail/sidebar/form components and `useClients` were deleted; `clientsService` now contains only `listClientOrders` and `isClientNameAvailable`.
- Phase 8C5I moved Settings profile color load/save to `rpc_current_user_settings_get()` and `rpc_current_user_settings_update(jsonb)`, then deleted dormant `usersService` and `useUsers`.
- Phase 8C5J1-J5 added `rpc_current_user_app_context()` and frontend context wrappers, converted route guards from legacy role props to permission props, removed `useRole` fallback navigation from `TopNav`, removed role fallback authorization from `ProtectedRoute`, migrated remaining active display/lens/action consumers to permission hooks plus `useCurrentUserAppContext`, and deleted the dormant `useRole` / `rolesService` legacy role-string files.
- Phase 8C5J6A revoked app-role execute access from frontend-dead legacy role RPCs and marked them deprecated.
- Phase 8C5K1 revoked direct app-role `SELECT` on `public.user_roles`; `service_role` compatibility remains.
- Phase 8C5K2A moved order read/activity policy surfaces off legacy role-string helpers for `current_app_user_can_read_order_row(...)` and `order_activity`.
- Phase 8C5K2B replaced the `review_flow` admin read policy with `can_read_order(order_id)`.
- 8C5K-PAUSE intentionally defers deeper legacy SQL retirement until product direction and final implementation path are locked.
- Activity actor write paths still need cleanup.

Canonical replacement:

None. This is the canonical user table.

Migration action:

- Confirm all required profile fields exist or can be added.
- Keep `public.users` as canonical app identity and use `company_memberships` for user/company participation.
- Add `status` and `settings` when identity/profile cleanup requires them.
- Ensure app-domain records reference `public.users.id`.
- Continue removing direct `auth.uid()` comparisons from app-domain logic by routing through `public.current_app_user_id()`.
- Keep remaining picker and filter migrations narrow: assignable users now use `rpc_company_assignable_users`; the Orders client filter still needs its own safe client filter-options replacement before direct client filter reads are removed.
- Do not drop old compatibility role tables/columns during the pause. Remaining cleanup must revisit users RLS, backend helper bodies that still read `public.user_roles` / `public.users.role`, `public.profiles.role`, default-company fallback removal, and final `public.user_roles` / `public.users.role` retirement.

Drop/archive condition:

Never drop as part of current plan.

Roadmap phase:

Phase 1, Phase 5.

### `public.users.auth_id`

Disposition: Keep canonical.

Current purpose:

Maps Falcon app users to `auth.users.id`.

Current risk:

Logic can accidentally compare `auth.uid()` directly to app-domain foreign keys instead of mapping through this column.

Progress:

- `public.current_app_user_id()` is now the required helper for auth-to-app-user mapping.
- Notification identity paths are resolved.
- RLS/read-check identity paths are partially resolved.
- Canonical activity actor writes are in place for current `rpc_log_event` activity logging through `activity_log.actor_user_id`.
- Legacy `created_by` and `actor_id` still intentionally store auth/profile-compatible identity for compatibility until activity readers fully migrate.
- Remaining work is generic helper/RPC audit plus profile/display-name hydration cleanup, not a wholesale missing actor-field path.

Canonical replacement:

None.

Migration action:

- Use `public.current_app_user_id()` for all app-domain comparisons.
- Continue audit of RPCs, triggers, and RLS policies.
- Keep writing canonical activity actors to `activity_log.actor_user_id` while legacy fields remain compatibility-only.

Drop/archive condition:

Never drop while Supabase Auth is used.

Roadmap phase:

Phase 1.

### `public.users.role`

Disposition: Keep temporarily.

Current purpose:

Legacy/global role display or behavior fallback.

Current risk:

Hardcodes behavior around one role per user and conflicts with configurable permission bundles.

Canonical replacement:

Normalized `roles`, `permissions`, `role_permissions`, and `user_roles`.

Migration action:

- Keep for compatibility.
- Map legacy role strings to permissions in app compatibility layer.
- Backfill into normalized roles.

Drop/archive condition:

Safe only after app, RPCs, views, and policies no longer read `users.role`.

Roadmap phase:

Phase 2, Phase 6.

### `public.user_profiles`

Disposition: Archive/drop later.

Current purpose:

Auth-based profile table with display name, color, phone, avatar, activity status, and split fields.

Current risk:

Duplicates `public.users`, uses `user_id references auth.users(id)`, and reinforces auth ID/app user ID confusion.

Canonical replacement:

Profile fields on `public.users` or a compatibility view over `public.users`.

Migration action:

- Keep temporarily.
- Backfill needed profile fields into `public.users`.
- Update views/RPCs to read canonical user records.
- Current Team Directory color/profile writes must use `public.users.auth_id`, then `public.users.uid`, before falling back to `public.users.id` for legacy shapes.
- If no auth/profile identity exists, profile-color saves should fail gracefully instead of inserting/updating `user_profiles.user_id` with a non-auth public user ID.

Drop/archive condition:

Safe after `public.profiles`, activity actor hydration/display-name resolution, admin user management, and calendar views no longer depend on it.

Roadmap phase:

Phase 1, Phase 6.

### `public.profiles` view

Disposition: Keep temporarily.

Current purpose:

Facade over `auth.users`, `user_profiles`, and `user_roles` for frontend/admin user views.

Current risk:

Uses auth IDs as primary visible IDs, selects only one role, and hides the planned multi-role model.

Canonical replacement:

Canonical user/profile view over `public.users` plus normalized role summaries.

Migration action:

- Keep as compatibility view.
- Create a new canonical user view later if useful.
- Move app code to `public.users`/permission helpers.

Drop/archive condition:

Safe when no app/RPC/view code references `profiles`.

Roadmap phase:

Phase 1, Phase 2, Phase 6.

## 2. Roles / `user_roles`

### `public.permissions`

Disposition: Keep canonical.

Current purpose:

System permission catalog for capability checks.

Current risk:

Selected frontend behavior is now wired to permissions through the compatibility layer. Backend/RLS and responsibility-sensitive paths still use legacy role/helper paths until later phases.

Progress:

- Phase 2 Step 2 added read-only compatibility resolver functions that can return current app user permission keys.
- Phase 2 Step 3 added frontend permission constants and hooks that can consume resolver output.
- Phase 2 Step 4 wired initial navigation, route guard, New Order button, and user edit/view permission plumbing: `TopNav` now uses `CLIENTS_READ_ALL` for clients route selection and `USERS_READ` for Users nav visibility with legacy fallback, `ProtectedRoute` accepts optional permission gate props, `/users` uses `USERS_READ`, `/settings` uses `SETTINGS_VIEW`, `/settings/notifications` uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`, CommandPalette filters commands by permission, NewOrderButton uses `ORDERS_CREATE`, and UserDetail/UserCard edit behavior uses `USERS_UPDATE`.
- Phase 2 Step 4 frontend permission plumbing is MVP-complete; Phase 3 responsibility resolver work has started and is MVP-complete for the current single-company workflow scope.
- TopNav avatar Settings link and mobile Settings nav item now use `SETTINGS_VIEW`, with existing visibility preserved during permission loading/errors.
- Chris, Pam, and Abby validated access successfully.
- Chris/appraiser validated no New Order button; Abby/admin validated New Order button visible.
- Users directory access model is finalized: `USERS_READ` grants read-only directory access, `USERS_UPDATE` grants edit actions, and `USERS_CREATE` grants user creation.
- Users route guard migration now includes `/users/:userId` with `USERS_UPDATE`, `/users/new` with `USERS_CREATE`, and `/users/view/:userId` with `USERS_READ`.
- `USERS_READ` is granted to Appraiser, Reviewer, and Billing template roles.
- `USERS_CREATE` is granted to the Admin template role.
- UsersIndex edit/create UI is fully permission-driven.
- Chris/appraiser validated read-only Users access; Abby/admin validated full Users access.
- Chris/appraiser validated user view access and blocked edit/new user routes; Abby/admin validated user view/edit/new user routes.
- Desktop validation passed for the TopNav Settings permission patch where applicable.
- Client create/edit UI and routes now use `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions are gated by `CLIENTS_UPDATE_ALL` / `CLIENTS_DELETE`.
- Client drawer direct save/update path is gated by `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Client query/KPI/scoped visibility logic remains legacy and responsibility-dependent.
- `/clients` and `/clients/cards` visibility behavior was not changed.
- Chris/appraiser validated scoped read-only client access, no client Edit/Delete actions, and `Click to see orders` card text.
- Abby/admin validated client edit access and admin edit capability.
- Main table workflow actions are now permission-gated with legacy fallback during permission loading/errors.
- Reviewer template role no longer receives `workflow.status.ready_for_client`; reviewers keep `workflow.status.approve_review` for clear-review behavior.
- Remaining order routes/nav/sidebar/direct workflow shortcuts, client scoped route/nav behavior, calendar route/nav gating, backend/RLS enforcement, and permission service contracts are explicitly deferred to later responsibility, scoped visibility, calendar permission, normalization, or Phase 2/Phase 6 support work.
- SQL editor has no app auth context, so validation must run through an authenticated app context or manual user-id joins.

Canonical replacement:

None. This is the canonical permission catalog.

Migration action:

- Phase 2 Step 1 created and seeded this table with system permissions.
- Phase 2 Step 2 added a compatibility permission resolver.
- Phase 2 Step 3 added `PERMISSIONS`, `ALL_PERMISSION_KEYS`, `useEffectivePermissions()`, `useCan()`, and `useCanAny()`.
- Phase 2 Step 4 wired permission helpers into initial navigation, CommandPalette, selected route guard, New Order button, user edit/view plumbing, Settings navigation, and client create/edit surfaces; this is MVP-complete for moving to Phase 3.
- Later wire RLS, RPCs, navigation, and order action gates to permission checks.

Drop/archive condition:

Never drop as part of the current plan.

Roadmap phase:

Phase 2, Phase 6.

### `public.roles`

Disposition: Keep canonical.

Current purpose:

Template and future company-scoped role bundles.

Current risk:

Template roles exist, and resolvable legacy role rows have been backfilled into `public.user_role_assignments` for `falcon_default`. Existing `public.user_roles` text roles still drive active fallback behavior.
Some remaining top-level navigation visibility and workflow/action visibility still use legacy frontend paths by design where permissions alone would blur lifecycle, responsibility, scoped visibility, calendar, or dashboard behavior. Phase 2 Step 4 completed low-risk CommandPalette filtering, safe route guard migration, Users directory access, Settings navigation, the New Order button, UserDetail/UserCard/UsersIndex behavior, and client create/edit UI/routes.

Progress:

- Compatibility resolver maps legacy `public.user_roles.role` values to matching seeded template role names.
- Multi-Company Foundation Slice 6B backfilled resolvable legacy text roles into `public.user_role_assignments` without changing active authorization behavior.

Canonical replacement:

None. This is the canonical role table.

Migration action:

- Phase 2 Step 1 created this table.
- Template roles seeded: Owner, Admin, Appraiser, Reviewer, Billing.
- Phase 2 Step 2 reads these roles through a compatibility resolver without changing behavior.
- Phase 2 Step 3 exposes frontend hooks but does not change UI behavior.
- Phase 2 Step 4 wires MVP frontend navigation and selected route guard plumbing without changing order action behavior.
- `/users` now uses `USERS_READ`; `/settings` now uses `SETTINGS_VIEW`.
- `/users/:userId` now uses `USERS_UPDATE`; `/users/new` now uses `USERS_CREATE`; `/users/view/:userId` now uses `USERS_READ`.
- `/settings/notifications` now uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- TopNav avatar Settings link and mobile Settings nav item use `SETTINGS_VIEW`; permission loading/errors preserve existing visibility.
- CommandPalette gates Orders, Clients, Users, Settings, and Notification Settings commands by permission.
- CommandPalette preserves legacy command visibility during permission loading/errors.
- NewOrderButton uses `ORDERS_CREATE` and preserves legacy admin fallback during permission loading/errors.
- UserDetail edit action uses `USERS_UPDATE` and preserves legacy admin-ish fallback during permission loading/errors.
- UserCard edit/view behavior uses `USERS_UPDATE` and preserves legacy admin fallback during permission loading/errors.
- Users nav visibility uses `USERS_READ` and preserves legacy admin fallback during permission loading/errors.
- Existing self-profile/view behavior remains unchanged.
- `USERS_READ` is granted to Appraiser, Reviewer, and Billing.
- `USERS_CREATE` is granted to Admin.
- UsersIndex edit/create UI is fully permission-driven.
- Chris/appraiser has read-only Users access.
- Abby/admin has full Users access.
- Chris/appraiser can access user view routes and is blocked from edit/new user routes.
- Abby/admin can access user view, edit, and new user routes.
- Desktop validation passed for the TopNav Settings permission patch where applicable.
- Client create/edit UI and routes use `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions use `CLIENTS_UPDATE_ALL` / `CLIENTS_DELETE`.
- Client drawer direct save/update path uses `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Client query/KPI/scoped visibility logic remains legacy and responsibility-dependent.
- `/clients` and `/clients/cards` visibility behavior was not changed.
- Chris/appraiser can view scoped clients without client Edit/Delete actions.
- Abby/admin can edit clients and sees admin edit capability.
- Order routes/nav/workflow/action buttons are deferred to responsibility/lifecycle work.
- Client scoped route/nav behavior is deferred to responsibility/scoped visibility work.
- Calendar route/nav gating is deferred until a calendar permission model exists.
- Dashboard route/query behavior is deferred because it is role/responsibility scoped.
- Backend/RLS permission enforcement is deferred to later permission/normalization phases.
- `getEffectivePermissions(userId, companyId)` and `canUserPerform(userId, permissionKey, context)` service contracts are deferred to later Phase 2/Phase 6 support work.
- User edit form and role management remain otherwise untouched.
- Mobile login currently shows a blank screen; mobile-specific investigation is deferred unless it affects desktop or core live app flows.
- Legacy role arrays remain fallback only when the permission resolver errors on migrated routes.
- Later backfill legacy text roles into normalized assignments.
- Company-aware resolver successors read `public.user_role_assignments`, but current frontend/RLS helpers are not migrated yet.

Drop/archive condition:

Never drop as part of the current plan.

Roadmap phase:

Phase 2, Phase 6.

### `public.role_permissions`

Disposition: Keep canonical.

Current purpose:

Maps role bundles to permission keys.

Current risk:

Seeded permissions are not yet consumed by RLS or RPC logic.
Frontend helper plumbing exists, `TopNav` clients route selection now consumes `CLIENTS_READ_ALL` with legacy fallback, TopNav Users visibility consumes `USERS_READ`, TopNav avatar/mobile Settings visibility consumes `SETTINGS_VIEW`, `/users` and `/users/view/:userId` consume `USERS_READ`, `/users/:userId` consumes `USERS_UPDATE`, `/users/new` consumes `USERS_CREATE`, `/settings` consumes `SETTINGS_VIEW`, `/settings/notifications` consumes `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`, CommandPalette consumes navigation/settings/notification permissions, NewOrderButton consumes `ORDERS_CREATE`, UserDetail/UserCard/UsersIndex edit behavior consumes `USERS_UPDATE`, UsersIndex creation consumes `USERS_CREATE`, and client create/edit UI/routes consume `CLIENTS_CREATE`/`CLIENTS_UPDATE_ALL`. Remaining risky route config and workflow/action behavior are deferred to later responsibility, scoped visibility, calendar permission, dashboard, backend/RLS, or normalization work.

Progress:

- Phase 2 Step 2 resolver reads this table to expose effective permission keys for the current app user.
- Owner role effectively receives all seeded permissions.
- Phase 2 Step 4 consumes these permissions in `TopNav`, CommandPalette, selected route guards, NewOrderButton, UserDetail edit action, UserCard edit/view behavior, UsersIndex edit/create UI, Settings navigation, and client create/edit UI/routes, and adds optional permission gates to `ProtectedRoute`. This is MVP-complete enough to move to Phase 3.
- Main table workflow actions now consume workflow permissions while preserving legacy fallback during permission loading/errors.
- Reviewer template role no longer receives `workflow.status.ready_for_client`; Admin/Owner retain client-release permissions.

Canonical replacement:

None. This is the canonical role-permission join table.

Migration action:

- Phase 2 Step 1 created and seeded this table.
- Owner template role has all seeded permissions.
- Admin/Appraiser/Reviewer/Billing template roles have scoped default permissions.
- Phase 2 Step 2 added read-only compatibility resolution.
- Phase 2 Step 3 added frontend helper plumbing.
- Phase 2 Step 4 migrated the safe MVP navigation and route guard plumbing from legacy role paths to permission helpers.
- `/users` now uses `USERS_READ`; `/settings` now uses `SETTINGS_VIEW`.
- `/users/:userId` now uses `USERS_UPDATE`; `/users/new` now uses `USERS_CREATE`; `/users/view/:userId` now uses `USERS_READ`.
- `/settings/notifications` now uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- TopNav avatar Settings link and mobile Settings nav item use `SETTINGS_VIEW`, with permission loading/errors preserving existing visibility.
- CommandPalette gates Orders, Clients, Users, Settings, and Notification Settings commands by permission and preserves legacy behavior during permission loading/errors.
- NewOrderButton uses `ORDERS_CREATE`; Chris/appraiser validated no button, and Abby/admin validated button visible.
- UserDetail edit action uses `USERS_UPDATE`; existing self-profile/view behavior remains unchanged.
- UserCard edit/view behavior uses `USERS_UPDATE`.
- `USERS_READ` is granted to Appraiser, Reviewer, and Billing template roles.
- `USERS_CREATE` is granted to Admin.
- Users nav visibility uses `USERS_READ`.
- UsersIndex edit/create UI is fully permission-driven.
- Chris/appraiser validated read-only Users access; Abby/admin validated full Users access.
- Chris/appraiser validated user view access and blocked edit/new user routes; Abby/admin validated user view/edit/new user routes.
- Desktop validation passed for the TopNav Settings permission patch where applicable.
- Client create/edit UI and routes use `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions are gated by `CLIENTS_UPDATE_ALL` / `CLIENTS_DELETE`.
- Client drawer direct save/update path is gated by `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Client query/KPI/scoped visibility logic remains legacy and responsibility-dependent.
- `/clients` and `/clients/cards` visibility behavior was not changed.
- Chris/appraiser validated scoped read-only client access, no client Edit/Delete actions, and read-only card text.
- Abby/admin validated client edit access and admin edit capability.
- Legacy admin fallback remains only during permission loading/errors.
- Order routes/nav/workflow/action buttons, client scoped route/nav behavior, calendar route/nav gating, dashboard route/query behavior, backend/RLS permission enforcement, and permission service contracts are deferred to later phases.
- User edit form and role management remain otherwise untouched.

Drop/archive condition:

Never drop as part of the current plan.

Roadmap phase:

Phase 2, Phase 6.

### `public.user_roles` with text `role`

Disposition: Migrate/rebuild.

Current purpose:

Maps auth users to text roles like `admin`, `appraiser`, `reviewer`, `owner`.

Current risk:

References auth users in original migration, uses literal role strings, lacks `company_id`, lacks `role_id`, and cannot represent editable permission bundles cleanly.

Canonical replacement:

Normalized `roles`, `permissions`, `role_permissions`, and `user_role_assignments(user_id, role_id, company_id)`.

Migration action:

- Keep current table temporarily.
- Compatibility permission resolver now maps text roles to seeded template roles.
- Normalized permission foundation tables now exist: `public.permissions`, `public.roles`, and `public.role_permissions`.
- Frontend permission hooks now exist.
- `TopNav` navigation visibility no longer uses legacy role fallback; Clients, Users, Settings, Assignments, and Relationships navigation now gates through permission hooks.
- `ProtectedRoute` no longer imports `useRole` or performs legacy role fallback authorization.
- Route config no longer passes `roles`, `allowedRoles`, `requireAdmin`, or `requireReviewer`; route authority is expressed through `requiredPermission` and `requiredAnyPermissions`.
- `/orders`, `/calendar`, `/activity`, `/clients`, `/users`, `/settings`, and `/settings/notifications` now use explicit permission gates.
- CommandPalette gates Orders, Clients, Users, Settings, and Notification Settings by permission.
- NewOrderButton gates visibility through `ORDERS_CREATE`.
- Legacy `useRole` and `rolesService` frontend compatibility files were deleted after active call sites moved to permission hooks and `useCurrentUserAppContext`.
- UserDetail edit action gates visibility through `USERS_UPDATE`.
- UserCard edit/view behavior gates through `USERS_UPDATE`.
- Users nav visibility gates through `USERS_READ`.
- UsersIndex edit/create UI gates through `USERS_UPDATE` and `USERS_CREATE`.
- Client create/edit UI and routes gate through `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions gate through `CLIENTS_UPDATE_ALL` / `CLIENTS_DELETE`.
- Client drawer direct save/update path gates through `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Historical note: migrated route declarations previously kept legacy role arrays only as permission resolver error fallback. Phase 8C5J2 superseded this; active route authority is now permission-only.
- Multi-Company Foundation Slice 6A adds `company_memberships` as the membership layer, separate from legacy role assignment.
- Multi-Company Foundation Slice 6B adds `user_role_assignments` as the company-scoped role assignment layer.
- Resolvable legacy text roles are backfilled into `falcon_default` assignments.
- Prefer a new normalized company-scoped role assignment join instead of overloading membership or legacy text roles.
- Slice 6C verified permission parity and wrapped active permission helpers through `current_company_id()` while leaving RLS, frontend hooks, org switching, workflow behavior, `current_is_admin()`, and `current_is_appraiser()` unchanged.
- Phase 8C5J removed frontend `useRole` / `rolesService` authority and moved route/nav/action/lens behavior to permission hooks and `rpc_current_user_app_context()`.
- Phase 8C5J6A and 8C5K1 revoked app-role access to legacy role RPCs and direct `public.user_roles` reads.
- Phase 8C5K2A/8C5K2B removed legacy role-string dependencies from `order_activity` and `review_flow` policies.

Pause decision:

- Further SQL retirement is paused. Keep this table and its text `role` column until users RLS, remaining helper functions, `public.profiles.role`, default-company fallbacks, and any operator/backfill paths are deliberately replaced.

Drop/archive condition:

Safe to remove `role` text only after permission loading, admin checks, RLS policies, and user management use normalized roles.

Roadmap phase:

Phase 2, Phase 6.

### `rpc_set_user_role` / `rpc_admin_set_user_role`

Disposition: Migrate/rebuild.

Current purpose:

Admin-managed role assignment using text role strings.

Current risk:

Tied to text roles and auth IDs; does not support multi-role permission bundles or company context.

Canonical replacement:

Role assignment RPCs that write normalized `user_role_assignments`.

Migration action:

- Keep temporarily.
- Add new RPCs for normalized role assignment.
- Update admin UI.
- Do not switch active role/admin writes to `user_role_assignments` until role-management RPCs and admin UI are migrated intentionally after Slice 6C.

Drop/archive condition:

Safe after admin UI and policies no longer call text-role RPCs.

Roadmap phase:

Phase 6.

### `current_is_admin()`

Disposition: Keep temporarily.

Current purpose:

Checks whether current auth user has owner/admin text role.

Current risk:

Uses text roles and is a temporary compatibility helper.

Progress:

- Phase 1 Batch 2 Step 1 updated this helper to resolve the signed-in user through `public.current_app_user_id()`.

Canonical replacement:

Permission check helper, such as `current_app_user_has_permission(permission_key)`.

Migration action:

- Keep until admin semantics are migrated intentionally.
- Active permission helper wrappers now resolve through company-aware permission successors, but this helper remains legacy.
- Preserve as fallback while navigation and route guards are migrated incrementally.
- Do not broaden reviewer/admin role behavior into order lifecycle visibility.
- Slice 6C left this helper legacy. Do not wrap this helper through company-aware permissions until RLS and responsibility semantics are migrated intentionally.

Drop/archive condition:

Safe after admin checks use permission helpers.

Roadmap phase:

Phase 1, Phase 2, Phase 6.

### `current_is_appraiser()`

Disposition: Keep temporarily.

Current purpose:

Checks whether the current app user has explicit appraiser capability for legacy appraiser-scoped policies.

Current risk:

If this helper treats reviewer/admin overlap as appraiser access, assigned reviewer users can pass appraiser policies and see orders outside the review lifecycle.

Progress:

- Phase 1 lifecycle visibility patch changed the helper to require an explicit `public.user_roles.role = 'appraiser'` row for `public.current_app_user_id()`.

Canonical replacement:

Permission check helper, such as `current_app_user_has_permission(permission_key)`, combined with order participant responsibility.

Migration action:

- Keep as compatibility helper.
- Do not let global reviewer/admin role imply appraiser capability.
- Replace with permission/responsibility helper after normalized permissions and order participants exist.
- Slice 6C left this helper legacy. This helper protects appraiser-scoped RLS and must not become a broad permission-bundle check.

Drop/archive condition:

Safe after appraiser-scoped policies use permission and responsibility helpers.

Roadmap phase:

Phase 1, Phase 2, Phase 7.

## 3. Orders And Duplicate / Legacy Order Fields

### `public.orders`

Disposition: Keep canonical.

Current purpose:

Core order record.

Current risk:

Contains legacy/duplicate fields, lacks company scoping, and assignment FKs have historically pointed toward auth/profile identity.

Progress:

- Calendar + Appointment System MVP is complete for `site_visit_at`: the order row Dates column shows site visit, review due, and final due; missing site visits can be set inline through `SiteVisitPicker`; saves use local wall-clock time rather than UTC conversion; dashboard/table selects `site_visit_at` before the date-only fallback; and the dashboard calendar refreshes after inline appointment updates.
- Calendar remains the detailed scheduling surface for appointment time, while order rows stay compact/date-only. Existing incorrect stored appointment timestamps require manual re-save; company-level timezone support and richer calendar editing remain deferred.
- Multi-Company Foundation Slice 1 added nullable `orders.company_id`, a `NOT VALID` FK to `public.companies`, an index on `company_id`, and a default-company backfill. Orders are structurally company-aware, but RLS, views, RPCs, workflow transitions, queue behavior, and order-number uniqueness are not yet company-enforced.
- Multi-Company Foundation Slice 2 made order company scope backend-owned: inserts default to `falcon_default` when missing, updates preserve existing company ownership, and order read projections expose `company_id`.
- Multi-Company Foundation Slice 7B made orders the first backend-enforced company read-isolated operational root. Order SELECT now requires current-company membership, order company match, and existing lifecycle/responsibility visibility through `current_app_user_can_read_order_row(...)`.
- Multi-Company Foundation Slice 7C routes order-derived calendar, activity, and notification read paths through readable source orders.

Canonical replacement:

None. The table remains canonical but should be cleaned additively.

Migration action:

- Additive `company_id` foundation is present.
- Order read projections expose `company_id`.
- Order-generated activity and assignment notifications carry `company_id`.
- Order read isolation is enforced for SELECT policies, active order read views, `rpc_get_activity_feed(uuid)`, and `rpc_list_orders(...)`.
- Order-derived calendar, activity, and notification read bypasses now require `current_app_user_can_read_order(...)` where a source order exists.
- Next carry company enforcement through write/workflow RPCs, client reads, user/team reads, realtime, table policies, and numbering before full tenant isolation.
- Ensure `appraiser_id` and `reviewer_id` reference `public.users.id`.
- Keep convenience assignment fields.
- Introduce `order_participants` later.

Drop/archive condition:

Never drop.

Roadmap phase:

Phase 1, Phase 5, Phase 7.

### `orders.order_number`

Disposition: Keep canonical.

Current purpose:

Company-facing order identifier.

Current risk:

Uniqueness is currently global; SaaS target may require uniqueness by company.

Canonical replacement:

Same field, eventually unique by `(company_id, order_number)`.

Migration action:

- Ensure all order-related notifications include it.
- `emitNotification` now centrally resolves a valid user-facing `order_number`, fetches from `public.orders` when missing, and does not persist UUID/short-id fallbacks in `payload.order_number`.
- Keep current unique index until company scoping is ready.
- Backfill demo/test orders with null `order_number`, including `ea359d71-4f6f-4a4a-9b26-4035ea3a7947`, so order-facing notifications have visible labels instead of UUID/short ID fallback.

Drop/archive condition:

Never drop.

Roadmap phase:

Phase 4, Phase 5.

### `orders.appraiser_id` / `orders.reviewer_id`

Disposition: Keep canonical as denormalized convenience fields.

Current purpose:

Current assignment and notification routing.

Current risk:

May be auth/profile IDs in some legacy data or constraints; can conflict with future participant history.

Progress:

- Phase 3 first resolver slice added `src/lib/orders/resolveOrderParticipants.js`.
- Phase 3 resolver MVP is complete for current scope; no app-code requirement remains before moving to the next phase.
- `ActivityNoteForm` now uses the resolver for note notification routing only.
- Appraiser notes route to the reviewer; reviewer notes route to the appraiser; admin/other notes route to the appraiser.
- `resolveOrderParticipants` now has explicit `workflow.sent_to_review` behavior returning `reviewer_id`.
- `sendOrderToReview` now uses the resolver for reviewer recipient assembly with the existing reviewer fallback.
- `sendOrderBackToAppraiser` now uses the resolver for appraiser recipient assembly with the existing appraiser fallback.
- `completeOrder` now uses the resolver for appraiser recipient assembly with the existing appraiser fallback.
- `markReadyForClient` is intentionally not migrated to the resolver yet because default Falcon workflow should separate reviewer clearance from admin/owner client release.
- `review_cleared` is introduced and validated: reviewer actions transition `in_review` to `review_cleared`, `clearReview()` updates status correctly, reviewer UI says "Clear Review", direct reviewer status paths use `REVIEW_CLEARED`, DB constraints accept the status, reviewers retain visibility, admins/owners can proceed with client release, activity logs "In Review -> Review Cleared", notification copy indicates review cleared/admin release handoff, and build passed.
- Admin recipients remain appended through `fetchAdminRecipients()`.
- Chris/appraiser send-to-review was validated: Pam/reviewer received notification, Abby/admin received notification, and status behavior remained normal.
- Complete order workflow still works and sends notifications.
- Send-to-review workflow now emits a single notification with optional note snippet, and duplicate note notification is suppressed.
- Send-to-review/resubmission workflow now suppresses self-notifications.
- Resubmission stays on `order.sent_to_review` with an `is_resubmission` payload flag and distinct title/body copy.
- Send-back-to-appraiser workflow emits a single notification with revision note snippet.
- `clearReview` emits `order.review_cleared` to admin/owner recipients.
- Notification policy is seeded for `order.review_cleared`.
- Workflow notifications are MVP-consistent: one actionable notification per action.
- Activity log remains the source of full communication history; notifications are summaries.
- Notification payload/UI behavior is otherwise unchanged outside these workflow summary updates.
- No DB/RLS, order visibility, status lifecycle, routing, notification service, or workflow button behavior changed.
- Revision notes are still preserved in activity history through `logNote`.
- `/orders/:id` now shows Activity / Communication History with `ActivityLog`, so notification clicks land where communication history is visible.
- Appraiser dashboard active queue includes only `new`, `in_progress`, and `needs_revisions`; `in_review`, `review_cleared`, `pending_final_approval`, `ready_for_client`, and `completed` remain available in Orders/history but not the active dashboard queue.
- Row action dropdown/popover UX remains deferred; future work should replace it with a unified Smart Actions button/panel.
- `npm run build` passed.
- Admin/Abby note notifications can still show a generic actor label such as "User added a note" because logged-in admin profile/identity hydrates as Demo User instead of Abby Rossi; defer this to actor display-name/profile hydration cleanup.
- Activity / Communication History presentation needs future polish, but is functional and visible.
- Some test/demo orders have null `order_number`, causing notifications to fall back to UUID/short ID labels. Example: order `ea359d71-4f6f-4a4a-9b26-4035ea3a7947` has `order_number` null. This is demo/test data cleanup, not a resolver failure.

Canonical replacement:

`order_participants` as source of responsibility, with these fields kept as convenience projections.

Migration action:

- Verify/backfill to `public.users.id`.
- Backfill `order_participants`.
- Keep in sync with assignment changes.

Drop/archive condition:

Do not drop for MVP. Revisit only after participant model and views are stable.

Roadmap phase:

Phase 1, Phase 3, Phase 7.

### `orders.assigned_to`

Disposition: Keep temporarily.

Current purpose:

Legacy assignment field used in RLS/activity checks as fallback.

Current risk:

Ambiguous responsibility; may duplicate appraiser assignment.

Canonical replacement:

`orders.appraiser_id`, `orders.reviewer_id`, and `order_participants`.

Migration action:

- Stop adding new dependencies.
- Update RLS/RPCs to use canonical assignment/resolver logic.

Drop/archive condition:

Safe after no policies, functions, or views reference it.

Roadmap phase:

Phase 1, Phase 7.

### Duplicate due/date/address/client/AMC fields

Disposition: Keep temporarily.

Current purpose:

Legacy imports, UI compatibility, and older views.

Current risk:

Data drift and unclear source of truth.

Canonical replacement:

Canonical `orders` columns plus one canonical order read view/RPC.

Migration action:

- Define canonical view fields.
- Backfill or map duplicates.
- Migrate frontend reads.

Drop/archive condition:

Safe after canonical order view/RPC is used everywhere and data is reconciled.

Roadmap phase:

Phase 5, Phase 10 cleanup.

## 4. Order Views / RPCs

### `v_orders_frontend_v4`

Disposition: Keep temporarily.

Current purpose:

Current frontend order read projection.

Current risk:

Another overlapping order view; can drift from canonical model.

Progress:

- Slice 7B recreated this view with `security_invoker = true` and an explicit `current_app_user_can_read_order_row(...)` predicate.
- The view preserves frontend-compatible order output while enforcing current-company membership, order company match, and existing lifecycle/responsibility visibility.

Canonical replacement:

Single canonical order view/RPC with company scope, user names, assignment fields, and last activity.

Migration action:

- Keep while app reads it.
- Preserve the explicit order read predicate while this compatibility view remains active.
- Create canonical replacement later.
- Switch app reads incrementally.

Drop/archive condition:

Safe after no frontend or RPC references remain.

Roadmap phase:

Phase 5, Phase 7.

### Other `v_orders*` views

Disposition: Archive/drop later.

Current purpose:

List/detail/projection compatibility.

Current risk:

View drift and inconsistent joins/RLS behavior.

Progress:

- Slice 7B recreated `v_orders_active_frontend_v4`, `v_orders_list`, and `v_orders_list_with_last_activity` with `security_invoker = true`.
- These views now apply explicit order read predicates rather than relying on frontend filtering.

Canonical replacement:

One canonical order read view/RPC.

Migration action:

- Inventory usage with `rg`.
- Preserve explicit order read predicates on active compatibility views.
- Replace with canonical view.

Drop/archive condition:

Safe after dependency checks show unused.

Roadmap phase:

Phase 5, Phase 10 cleanup.

### Order status/assignment RPCs

Disposition: Migrate/rebuild.

Current purpose:

Update status, assign order, and write activity.

Current risk:

May write legacy activity shape and compare assignments to auth IDs.

Progress:

- Phase 1 Batch 2 Step 1 patched authorization comparison logic where scoped.
- Activity actor values and payload shape were intentionally not changed yet.
- Phase 3 send-to-review notification recipient assembly now uses `resolveOrderParticipants` for the reviewer recipient, keeps the existing fallback, and appends admins through `fetchAdminRecipients()`.
- Phase 3 send-back-to-appraiser notification recipient assembly now uses `resolveOrderParticipants` for the appraiser recipient, keeps the existing fallback, and appends admins through `fetchAdminRecipients()`.
- Phase 3 complete-order notification recipient assembly now uses `resolveOrderParticipants` for the appraiser recipient, keeps the existing fallback, and appends admins through `fetchAdminRecipients()`.
- `markReadyForClient` resolver migration is deferred until reviewer clearance and client release are modeled separately. Reviewer actions are technical review actions, while admin/owner controls client release by default.
- Phase 5 reviewer-clearance handoff is validated: `clearReview()` and reviewer-facing actions now persist `review_cleared`, reviewers retain visibility, admins/owners see the handoff state, activity logs the `In Review -> Review Cleared` transition, notification copy indicates the admin release handoff, and build passed.
- This `markReadyForClient` deferral does not block moving to the next phase.
- Future workflow model may include `review_cleared`, `pending_final_approval`, and configurable owner/final approval rules before `ready_for_client`.
- Phase 4 send-to-review workflow notification now includes note text in the notification body when present, and duplicate note notification is suppressed.
- Phase 4 send-back-to-appraiser workflow notification now includes revision note text in the notification body when present.
- Note text is passed through workflow service calls and included in the `emitNotification` payload as `note_text`.
- Phase 4 `clearReview` emits `order.review_cleared` to admin/owner recipients, with notification policy seeded for that event.
- Workflow notifications now produce one actionable notification per action for the MVP scope.
- `buildNotificationBody("order.sent_back_to_appraiser")` now prefers `payload.note_text`.
- `buildNotificationBody("order.sent_to_review")` now prefers `payload.note_text`.
- Activity log remains the source of full communication history; notifications are summaries.
- Routing, resolver behavior, recipients, DB/RLS, and status logic are unchanged.

Canonical replacement:

Workflow transition service/RPC using `current_app_user_id()`, permissions, and resolver.

Migration action:

- Patch identity first.
- Later centralize transition authorization and activity payload creation.
- Next target: update activity actor writes to store `public.users.id` consistently.

Drop/archive condition:

Safe after new workflow RPC/service covers all app calls.

Roadmap phase:

Phase 1, Phase 3, Phase 4.

## 5. Activity Log Fields / RPCs

### `public.activity_log`

Disposition: Keep canonical, migrate shape.

Current purpose:

Order activity/audit feed.

Current risk:

Mixed schema contract: `detail`, `message`, `actor_id`, `created_by`, `created_by_name`, `created_by_email`; actor identity may be auth/profile based.

Progress:

- Phase 1 Batch 2 Step 1 patched activity access checks/RLS where safe.
- Phase 1 cleanup added `activity_log.actor_user_id` as the canonical `public.users.id` actor field.
- Legacy `created_by` and `actor_id` remain auth/profile compatible for existing activity display.
- Both `rpc_log_event` overloads now write `actor_user_id = public.current_app_user_id()` while `created_by` and `actor_id` remain `auth.uid()`.
- Reviewer/Pam can post activity notes without `activity_log_created_by_fkey` errors.
- Send-back-to-appraiser revision notes remain in activity history through `logNote` while the duplicate workflow note bell notification is suppressed.
- `/orders/:id` now renders Activity / Communication History using `ActivityLog`; presentation polish is deferred.
- Multi-Company Foundation Slice 1 added nullable `activity_log.company_id`, a `NOT VALID` FK to `public.companies`, an index on `(company_id, order_id, created_at desc)`, and a default-company backfill. Where `order_id` is present, activity company is derived from the related order before falling back to `falcon_default`.
- Multi-Company Foundation Slice 2 updates order audit triggers so order-generated activity rows inherit `orders.company_id`.
- Multi-Company Foundation Slice 4 backfills remaining null `activity_log.company_id` values and updates both active `rpc_log_event` overloads so RPC-written activity derives company context from `p_order_id -> orders.company_id`.
- Multi-Company Foundation Slice 7G1 removes broad `USING true` / `WITH CHECK true` activity policies, makes authenticated `activity_log` reads/inserts company/order-aware, blocks authenticated access to `order_id is null` activity by default, leaves update/delete blocked for authenticated users, and hardens both active `rpc_log_event` overloads through current-company membership plus readable/updateable source order checks.
- Slice 7G1 preserves activity side effects and frontend activity feed shapes while validating clean reset, activity policy catalog state, same-company/cross-company/no-role visibility, direct insert and RPC positive/negative behavior, assignment/date side-effect activity, regenerated Supabase types, lint, build, `git diff --check`, and final clean `supabase db reset`.
- Phase 8C3 assignment packet timelines intentionally do not reuse `activity_log` or `rpc_get_activity_feed`; assignment packet history is read from `order_company_assignment_activity` through `rpc_order_company_assignment_activity(uuid)`.

Canonical replacement:

Same table with canonical fields:

- `company_id`
- `actor_user_id`
- `event_type`
- `category`
- `title`
- `body`
- `visibility`
- `importance`
- `payload`

Migration action:

- Additive `company_id` foundation is present.
- Add remaining canonical nullable fields.
- Backfill from existing fields.
- Update RPCs to write canonical payload while keeping legacy fields populated.
- Keep writing canonical actors to `actor_user_id`; keep legacy `created_by`/`actor_id` populated for compatibility until activity display no longer depends on them.
- Preserve the Slice 7G1 table/RPC authorization boundary until a participant-backed activity model or realtime-specific subscription strategy replaces it.

Drop/archive condition:

Legacy columns can be dropped only after feed UI/RPCs no longer depend on them.

Roadmap phase:

Phase 1, Phase 4, Phase 9.

### `activity_log.detail`

Disposition: Keep temporarily.

Current purpose:

Flexible event JSON payload.

Current risk:

Semantics overlap with planned `payload`.

Canonical replacement:

`activity_log.payload`.

Migration action:

- Treat `detail` as compatibility alias.
- Backfill `payload = detail` where needed.

Drop/archive condition:

Safe after all event writes/readers use `payload`.

Roadmap phase:

Phase 4.

### `activity_log.actor_id` / `created_by`

Disposition: Keep temporarily.

Current purpose:

Actor tracking, likely auth/profile identity.

Current risk:

Identity mismatch with canonical `public.users.id`.

Progress:

- Activity read/check paths were patched.
- `activity_log.actor_user_id` now captures the canonical `public.users.id` actor for note logging.
- Legacy `created_by` and `actor_id` remain auth/profile identity for compatibility with the existing FK and activity display.
- Reviewer/Pam note logging has been validated without `activity_log_created_by_fkey` errors.
- Activity timeline UI now resolves actor identity from the richest available activity row/detail fields before falling back to generic `User`.
- New frontend note creation includes best-effort actor metadata in `detail.actor`.
- Some backend/profile hydration cases can still produce generic or incorrect actor display names and remain a separate cleanup item.

Canonical replacement:

`activity_log.actor_user_id references public.users(id)`.

Migration action:

- Keep `actor_user_id`.
- Backfill through `users.auth_id`.
- Keep `rpc_log_event` writing `actor_user_id = public.current_app_user_id()` and legacy `created_by`/`actor_id = auth.uid()`.
- Audit `rpc_log_note`, `rpc_update_order_status`, `rpc_assign_order`, and triggers that write `actor_id` or `created_by`.

Drop/archive condition:

Safe after no RPC/view/UI reads old actor fields.

Roadmap phase:

Phase 1, Phase 4.

### `rpc_log_event` / `rpc_log_note`

Disposition: Migrate/rebuild.

Current purpose:

RPC-only activity writes.

Current risk:

Authorization compares against auth IDs/legacy roles and writes legacy event shape.

Progress:

- Phase 1 Batch 2 Step 1 patched authorization comparison logic to use app identity where scoped.
- Phase 1 cleanup updated both `rpc_log_event` overloads so canonical actor identity is written to `actor_user_id`.
- `created_by` and `actor_id` remain `auth.uid()` to preserve legacy activity display and the existing `activity_log_created_by_fkey`.
- Reviewer/Pam can post activity notes successfully.
- Frontend note logging now sends best-effort actor name, email, role, and user ID in `detail.actor` for immediate render stability.
- Multi-Company Foundation Slice 4 updates both active `rpc_log_event` overloads to insert `activity_log.company_id` from the source order. `rpc_log_note` inherits this through its existing delegation path.

Canonical replacement:

Canonical logging RPC that uses `current_app_user_id()`, permissions/responsibility, and writes canonical fields/payload.

Migration action:

- Patch identity and authorization.
- Then enrich payload contract.
- Keep actor writes split between canonical `actor_user_id` and legacy `created_by`/`actor_id` until activity display is migrated.
- Keep deriving company context server-side from the source order; do not accept trusted frontend `company_id`.
- Audit remaining generic status/activity helper paths before restricting or removing legacy RPCs.

Drop/archive condition:

Replace only after all callers are migrated.

Roadmap phase:

Phase 1, Phase 4.

## 6. Notifications Fields / RPCs

### `public.notifications`

Disposition: Keep canonical, migrate shape.

Current purpose:

Bell notification delivery records.

Current risk:

`user_id` semantics drifted between auth ID and `public.users.id`; read-state fields overlap; payload may be incomplete.

Progress:

- Notification identity issue resolved in Phase 1 Batch 1.
- `notifications.user_id` is treated as `public.users.id`.
- Notification read/mark-read RPCs and creation fallback now use `public.current_app_user_id()`.
- Phase 4 first payload slice centralized `payload.order_number` normalization in `emitNotification`.
- UUID and short-id fallbacks are no longer persisted in `payload.order_number`.
- Missing `order_number` is fetched from `public.orders` when possible.
- Routing fields `order_id` and `link_path` are unchanged.
- Notifications now consistently display user-facing order numbers when available.
- Phase 4 notification payload contract is MVP-complete for current workflow notifications.
- Send-to-review and send-back-to-appraiser workflow notifications include note snippets when present and suppress duplicate note notifications.
- Send-to-review/resubmission self-notifications are suppressed.
- Resubmission notifications use `order.sent_to_review` plus an `is_resubmission` payload flag and distinct title/body copy.
- `clearReview` emits `order.review_cleared` to admin/owner recipients.
- Notification policy is seeded for `order.review_cleared`.
- Workflow notifications now produce one actionable summary notification per action.
- Activity log remains the source of full communication history.
- Send-back-to-appraiser workflow notification body now uses `payload.note_text` when present, while duplicate note notification remains suppressed.
- Notification Center quick-view polish is MVP-complete: unread/new, seen/read, and dismissed states are distinct.
- Unread, non-dismissed notifications count toward the badge.
- Seen notifications remain visible as reminders until dismissed.
- `notifications.dismissed_at` removes notifications from quick view while preserving history.
- `rpc_dismiss_notification` and `rpc_dismiss_seen_notifications` support individual dismiss and bulk `Dismiss seen`.
- Click-outside close behavior and notification type color hints are in place.
- `/activity` page MVP uses existing user-scoped `rpc_get_notifications` to show unread, seen, and dismissed notification history, including dismissed quick-view items.
- Activity page search covers title/body/order number/payload, includes state and type/category filters, shows badges/order number/date/open action, opens through `link_path` or `/orders/:order_id`, and does not auto-mark seen or dismiss items.
- Raw `activity_log` aggregation, pagination, restore dismissed, and team-wide activity are deferred.
- `npm run build` passed.
- Multi-Company Foundation Slice 1 added nullable `notifications.company_id`, a `NOT VALID` FK to `public.companies`, an index on `(company_id, user_id, created_at desc)`, and a default-company backfill. Where `order_id` is present, notification company is derived from the related order before falling back to `falcon_default`.
- Multi-Company Foundation Slice 2 updates order assignment notification triggers so order-generated notifications inherit `orders.company_id`.
- Multi-Company Foundation Slice 4 backfills remaining null `notifications.company_id` values and updates `rpc_notification_create` so RPC-created notifications derive company context from `patch.order_id -> orders.company_id`, falling back to `falcon_default`.
- Multi-Company Foundation Slice 7C updates notification read RPCs so order-tied notifications are hidden and excluded from unread counts when the source order is unreadable.
- Multi-Company Foundation Slice 7G2A hardens notification table policies and active notification create/read-state RPCs: table SELECT uses `current_app_user_id()` plus readable source order where applicable, direct authenticated INSERT/UPDATE/DELETE is blocked, order-tied authenticated creates require readable/updateable current-company source orders, recipients must be active members of the source company, authenticated non-order creates are blocked, service-role non-order creates are preserved, and legacy manual/debug notification RPCs are quarantined.

Canonical replacement:

Same table with canonical semantics:

- `user_id references public.users(id)`
- `company_id`
- `activity_event_id`
- `read_at`
- `dismissed_at`
- strict `payload`

Migration action:

- Confirm/repair any legacy stored `user_id` rows to public user IDs if production data requires it.
- Additive `company_id` foundation is present.
- Add nullable `activity_event_id`.
- Order-generated assignment notifications carry company context.
- Keep notification creation deriving company context server-side from source orders.
- Preserve Slice 7C behavior: order-tied notification reads and unread counts require readable source orders.
- Preserve Slice 7G2A behavior: authenticated app roles cannot directly insert/update/delete notification rows, active mutation RPCs only affect current-user readable notifications, authenticated non-order notification creation stays blocked, and service-role non-order notification creation remains an operator/system path until a productized manual/system path exists.
- Keep `type` and `category`.
- Prefer `read_at`.
- Use `dismissed_at` for quick-view removal only; do not delete notification history.

Drop/archive condition:

Do not drop table. Drop legacy fields only after compatibility period.

Roadmap phase:

Phase 1, Phase 4, Phase 5.

### `notifications.type` / `notifications.category`

Disposition: Keep canonical for now.

Current purpose:

Event type and category.

Current risk:

Earlier RPC inserted only category/type inconsistently.

Canonical replacement:

Keep both unless a later schema decision consolidates. Treat `type` as event key and `category` as broad grouping.

Migration action:

- Ensure `type = event_key`.
- Ensure `category = communication/workflow/order/etc`.

Drop/archive condition:

Do not drop during MVP.

Roadmap phase:

Phase 4.

### `notifications.read` / `notifications.is_read`

Disposition: Archive/drop later.

Current purpose:

Legacy read-state flags.

Current risk:

Conflicts with `read_at`.

Canonical replacement:

`read_at is not null`.

Migration action:

- Keep populated for compatibility if needed.
- Move all reads to `read_at`.

Drop/archive condition:

Safe after all RPCs/UI use `read_at`.

Roadmap phase:

Phase 4 cleanup.

### `rpc_notification_create`

Disposition: Migrate/rebuild.

Current purpose:

Creates notification from JSON patch.

Current risk:

No strict payload validation yet.

Progress:

- Phase 1 Batch 1 changed fallback identity to `public.current_app_user_id()`.
- Phase 4 first payload slice ensures `emitNotification` sends `payload.order_number` as a valid user-facing value or `null`, not a UUID/short-id fallback.
- Multi-Company Foundation Slice 4 updates `rpc_notification_create` to derive `notifications.company_id` server-side from the source order and ignore any frontend-provided company context.
- Multi-Company Foundation Slice 7G2A requires current-company membership, readable/updateable source orders, and active recipient membership for authenticated order-tied notification creation. It blocks authenticated non-order creation and preserves service-role non-order creation for operator/system paths.

Canonical replacement:

RPC that expects public user ID and validates required order-related payload fields.

Migration action:

- Keep fallback on `current_app_user_id()`.
- Keep patch API for compatibility.
- Keep company context derived server-side from `order_id`; do not require or trust frontend `company_id`.
- Keep Slice 7G2A order-tied create authorization, recipient membership validation, actor suppression, authenticated non-order block, and service-role non-order path.
- Add validation later for `payload.order_number`.

Drop/archive condition:

Replace only after all callers use canonical payload.

Roadmap phase:

Phase 1, Phase 4.

### `rpc_get_notifications` and mark-read RPCs

Disposition: Migrate/rebuild.

Current purpose:

Read and update current user's notifications.

Current risk:

Partially resolved. Phase 1 Batch 1 aligned identity; Slice 7C added order-read safety; Slice 7G2A hardens table policies and read-state mutation RPCs.

Progress:

- These RPCs now filter/update by `n.user_id = public.current_app_user_id()`.
- Multi-Company Foundation Slice 4 intentionally left notification read and mutation filters user-scoped until active-company membership exists.
- Multi-Company Foundation Slice 7C keeps notification UX personal/user-scoped while filtering order-tied notifications through `current_app_user_can_read_order(n.order_id)`.
- Multi-Company Foundation Slice 7G2A adds `current_app_user_can_access_notification_row(uuid, uuid)` and routes notification SELECT, mark-read, mark-all-read, dismiss, dismiss-seen, and legacy mark-read wrappers through current-user plus readable-source-order checks.
- Slice 7G2A blocks direct authenticated notification INSERT/UPDATE/DELETE, while preserving RPC-based delivery-state updates for current-user readable notifications.
- Slice 7G2A tightens active notification create/mutation RPC grants to `authenticated` and `service_role` and removes broad `PUBLIC`/`anon` execution.

Canonical replacement:

Filter by `n.user_id = current_app_user_id()` and, when `order_id` is present, require `current_app_user_can_read_order(order_id)`. Delivery-state mutation should continue through RPCs rather than direct table UPDATE.

Migration action:

- Keep patched Phase 1, Slice 7C, and Slice 7G2A behavior.
- Preserve personal non-order notifications for service/system paths, but keep authenticated non-order notification creation blocked until a productized manual/system path exists.
- Later align payload/read-state cleanup in Phase 4.

Drop/archive condition:

Do not drop; update in place.

Roadmap phase:

Phase 1.

## 7. Notification Preferences / Email Outbox

### `public.notification_preferences`

Disposition: Keep canonical, migrate semantics.

Current purpose:

Per-user email notification preferences.

Current risk:

Resolved for Phase 1 Batch 1.

Progress:

- RLS and preference RPC now compare `user_id` to `public.current_app_user_id()`.

Canonical replacement:

Same table with `user_id = public.users.id` and RLS via `current_app_user_id()`.

Migration action:

- Keep RLS/RPCs on `public.current_app_user_id()`.
- Add `company_id` later if needed.
- Later expand per-event/channel preferences.

Drop/archive condition:

Do not drop.

Roadmap phase:

Phase 1, Phase 5.

### `public.email_outbox`

Disposition: Keep canonical.

Current purpose:

Queued email delivery records.

Current risk:

Email queue contract is still settling, so queue insertion is intentionally non-blocking.

Progress:

- Phase 1 Batch 1 wired notification email lookup to treat `notifications.user_id` as `public.users.id`.
- Trigger catches queue failures so notification creation is not blocked while the live email queue contract stabilizes.

Canonical replacement:

Same table, with `to_user_id references public.users(id)`.

Migration action:

- Keep email trigger treating notification recipient as public user ID.
- Revisit strict failure behavior once the live `public.email_queue` contract is finalized.
- Add company scope later if useful.

Drop/archive condition:

Do not drop.

Roadmap phase:

Phase 1.

### `notification_policies`

Disposition: Keep temporarily / migrate to company settings.

Current purpose:

Event policy registry with roles and email modes.

Current risk:

Role-based rules use literal roles and are global, not company-scoped permission/preferences model.

Canonical replacement:

`company_notification_settings` plus system event defaults.

Migration action:

- Keep as global default registry.
- Later seed company settings from policies.

Drop/archive condition:

Safe only after company-scoped notification settings are live.

Roadmap phase:

Phase 4, Phase 5.

## 8. Calendar / Scheduling Tables And Views

### `public.calendar_events`

Disposition: Keep temporarily / migrate.

Current purpose:

Stored calendar projection events for site visits, review due dates, client due dates, and legacy/admin calendar surfaces.

Current risk:

The current primary calendar workspace derives schedule events from order fields such as `site_visit_at`, `review_due_at`, and `final_due_at`. Stored `calendar_events` remains a projection/compatibility path, and its table definition/RPC history is only partially represented in migrations. Calendar tenant filtering is not active yet.

Canonical replacement:

Order-derived scheduling remains canonical for current workflow dates. Stored calendar events may remain as a company-aware projection layer or later be rebuilt as a canonical scheduling-event table if standalone company calendar events become a product requirement.

Migration action:

- Multi-Company Foundation Slice 5 adds nullable `calendar_events.company_id` when the table exists.
- Slice 5 adds a `NOT VALID` company FK, company/start indexes, and a default-company backfill derived from linked `orders.company_id` before falling back to `falcon_default`.
- `v_admin_calendar` and `v_admin_calendar_enriched` now expose `company_id` while preserving frontend-compatible columns.
- `rpc_create_calendar_event` now derives company context server-side from `p_order_id -> orders.company_id`.
- Multi-Company Foundation Slice 7C recreates `v_admin_calendar` and `v_admin_calendar_enriched` with explicit readable-order predicates.
- Slice 7C patches `get_calendar_events(timestamptz, timestamptz)`, `get_calendar_events()`, and `get_admin_calendar_events(...)` so order-derived calendar reads require readable source orders.
- `calendar_events` table policy tightening remains deferred; do not treat stored calendar events as fully tenant-enforced outside these read surfaces yet.

Drop/archive condition:

Do not drop while legacy calendar adapters or admin calendar views still read it.

Roadmap phase:

Phase 5, Phase 8.

## 9. Order Numbering Tables / Functions

### `order_numbering_rules`

Disposition: Keep temporarily.

Current purpose:

Defines order number format by `company_key`.

Current risk:

Not linked to `companies`; only supports narrow format constraints.

Canonical replacement:

`company_order_numbering`.

Migration action:

- Add company-scoped table or `company_id`.
- Backfill from `falcon_default`.
- Keep `company_key` compatibility during transition.

Drop/archive condition:

Safe after numbering RPC and settings UI use company ID.

Roadmap phase:

Phase 5, Phase 8.

### `order_number_counters`

Disposition: Keep temporarily / migrate.

Current purpose:

Tracks sequence counters by numbering rule/year.

Current risk:

Coupled to old `order_numbering_rules`.

Canonical replacement:

Company-scoped counter under `company_order_numbering`, or adjusted counter with company FK.

Migration action:

- Preserve current counters.
- Add company relation.
- Avoid resetting live order numbering.

Drop/archive condition:

Safe after new counter system has generated numbers in staging without collisions.

Roadmap phase:

Phase 5, Phase 10.

### `rpc_get_next_order_number`

Disposition: Migrate/rebuild.

Current purpose:

Generates next order number using `company_key`.

Current risk:

Not company-id scoped; current format is limited.

Canonical replacement:

Company-scoped numbering RPC.

Migration action:

- Add `company_id` input with `company_key` fallback.
- Preserve current output format.

Drop/archive condition:

Replace only after order creation uses company ID.

Roadmap phase:

Phase 5, Phase 8.

## 10. Clients

### `public.clients`

Disposition: Keep canonical, migrate shape.

Current purpose:

Client/party records.

Current risk:

May have legacy fields; AMCs may still exist separately. Company scope exists additively, but it is not yet an RLS or tenant-enforcement boundary.

Canonical replacement:

Same table with `company_id`, `client_type`, `status`, metadata, and normalized contacts/billing profile.

Current MVP lock:

- Client forms use existing primary contact fields such as `contact_name_1`, `contact_email_1`, and `contact_phone_1`.
- New Order can preview the selected client's saved primary contact fields for intake context.
- Manual client creation from New Order can create a minimal client record by explicit opt-in after duplicate-name checking.
- No contact table writes occur during order creation.

Migration action:

- Additive `company_id` foundation is present with a default-company backfill, `NOT VALID` FK, and company index.
- Multi-Company Foundation Slice 3 added a backend preservation trigger for default-company compatibility. Slice 7E1 tightened it so inserts resolve `company_id` through `current_company_id()`, updates preserve existing company ownership, and frontend-sent `company_id` is ignored.
- `v_client_kpis` and `v_client_metrics` now expose `company_id`, aggregate by company and client, and filter through readable-client/readable-order predicates while preserving frontend-compatible column names.
- `v_client_kpis_appraiser` remains a compatibility projection and now uses readable-client predicates.
- `client_name_taken` now scopes duplicate checks to `current_company_id()` and readable-client logic.
- `merge_clients` now requires current-company membership, readable source and target clients, `clients.update.all`, and `clients.archive`; it blocks cross-company drift and already-merged source/target clients.
- `get_clients_for_user()` now returns an explicit compatibility shape from readable clients.
- Broad client SELECT/read bypasses were removed; legacy client `ALL` policies were converted into command-specific write policies so writes no longer imply SELECT bypass.
- Client table writes now require company-aware backend authorization through `current_app_user_can_create_client()`, `current_app_user_can_update_client_row(uuid, bigint)`, and `current_app_user_can_delete_client_row(uuid, bigint)`.
- Broad/global client write policies were removed and replaced with `clients_insert_company_authorized`, `clients_update_company_authorized`, and `clients_delete_company_authorized`.
- Legacy client mutation RPCs preserve their signatures as compatibility wrappers and now enforce the Slice 7E1 helper predicates.
- `PUBLIC` and `anon` execute privileges are revoked for `merge_clients`, `rpc_client_create`, `rpc_client_update`, `rpc_client_delete`, `rpc_create_client`, `rpc_update_client`, and `rpc_delete_client`; `authenticated` and `service_role` grants remain.
- Direct frontend writes and inline New Order client creation remain compatible for authorized users.
- Hard delete remains current behavior but now requires `clients.delete`.
- Caveat: `clients.name` still has global uniqueness, so company-scoped duplicate/canonicalization strategy remains deferred.
- Order intake now enforces linked client/AMC attachment safety through backend helpers and triggers:
  - order inserts resolve `company_id` from `current_company_id()`
  - order updates preserve `OLD.company_id`
  - frontend-sent `company_id` is ignored
  - linked `client_id` must be readable, same-company, and non-merged
  - linked `managing_amc_id` must be readable, same-company, non-merged, and `category = 'amc'`
  - manual-only orders remain allowed
  - `rpc_create_order(jsonb)`, `rpc_update_order(uuid, jsonb)`, and `rpc_order_update(uuid, jsonb)` are patched for the same attachment contract
- Legacy uuid order RPCs are quarantined:
  - `rpc_order_create(jsonb)` preserves its signature but raises a deprecated/quarantined exception
  - `rpc_order_update(text, jsonb)` preserves its signature but raises a deprecated/quarantined exception
- `import_orders_from_json(jsonb)` is service-role-only and marked deprecated/unsafe for multi-company imports.
- `PUBLIC`, `anon`, and `authenticated` execute privileges are revoked from `rpc_order_create(jsonb)`, `rpc_order_update(text, jsonb)`, and `import_orders_from_json(jsonb)`.
- Active bigint-compatible order RPCs remain callable and validated: `rpc_create_order(jsonb)`, `rpc_update_order(uuid, jsonb)`, and `rpc_order_update(uuid, jsonb)`.
- The migration reports mismatch counts for order `client_id`, `amc_id`, and `managing_amc_id` references.
- Defer the same-company order/client guard until mismatch results are reviewed in the target database.
- Add `client_type` if missing.
- Merge AMC concepts into clients later.

Drop/archive condition:

Do not drop.

Roadmap phase:

Phase 5, Phase 8.

### `contacts` / future `client_contacts`

Disposition: Keep or migrate/rebuild.

Current purpose:

Structured client contacts.

Current risk:

May not be company-scoped or aligned with future portal users.

Canonical replacement:

`client_contacts`.

Current MVP lock:

- The existing contacts table remains dormant.
- Save-to-client-profile contact behavior is deferred.
- Property entry/site access contact remains order-specific and separate from client primary contact.
- Order-specific client POC/contact fields are deferred until schema-backed columns exist:
  - `orders.client_contact_name`
  - `orders.client_contact_email`
  - `orders.client_contact_phone`
- Those future fields should represent the loan officer, processor, AMC coordinator, or client POC for a specific order, not the property/site access contact.

Migration action:

- Keep current contacts if usable.
- Add company scope and needed fields.
- Rename/rebuild only if current shape blocks portal/client UX.

Drop/archive condition:

Safe only after client UI uses canonical contact model.

Roadmap phase:

Phase 5, Phase 8.

### `amcs`

Disposition: Archive/drop later.

Current purpose:

Legacy separate AMC party table, if present.

Current risk:

Duplicates client model.

Canonical replacement:

`clients` with `client_type = 'amc'`.

Migration action:

- Migrate AMC rows into clients.
- Keep compatibility view if code still expects `amcs`.

Drop/archive condition:

Safe after orders and UI no longer reference `amcs` or `orders.amc_id`.

Roadmap phase:

Phase 5 cleanup.

## 11. Functions / Triggers / RLS Policies

### Assignment notification triggers

Disposition: Migrate/rebuild.

Current purpose:

Create assignment notifications when appraiser assignment changes.

Current risk:

Some versions convert public user ID to auth ID before inserting `notifications.user_id`, conflicting with canonical model.

Progress:

- Phase 1 Batch 1 aligned assignment notification recipients to `public.users.id`.

Canonical replacement:

Trigger/service that writes recipient `public.users.id` and canonical payload.

Migration action:

- Keep identity behavior patched to `public.users.id`.
- Enrich payload in Phase 4.
- Later route through responsibility resolver.

Drop/archive condition:

Replace only after equivalent assignment notification path is verified.

Roadmap phase:

Phase 1, Phase 4, Phase 7.

### Notification email trigger

Disposition: Migrate/rebuild.

Current purpose:

Queue email from inserted notification.

Current risk:

Queue contract is temporarily non-blocking while live email queue fields stabilize.

Progress:

- Phase 1 Batch 1 treats notification user ID as `public.users.id` and resolves email target from canonical app user identity.

Canonical replacement:

Trigger that treats `notifications.user_id` as `public.users.id`.

Migration action:

- Keep identity lookup patched.
- Use user preferences keyed by public user ID.
- Revisit non-blocking exception handling after the live queue contract is stable.

Drop/archive condition:

Do not drop unless email delivery is replaced by a service.

Roadmap phase:

Phase 1.

### Activity RLS policies

Disposition: Migrate/rebuild.

Current purpose:

Allow admins/reviewers or assigned appraisers to view/write activity.

Current risk:

Partially resolved. Earlier policies used JWT role claims and compared order assignment to `auth.uid()`.

Progress:

- Phase 1 Batch 2 Step 1 patched read/check paths to use `public.current_app_user_id()` where safe.
- Canonical activity actor writes are in place for current activity RPC logging through `activity_log.actor_user_id`.
- Remaining work is to audit generic status/activity helper paths, policy edges, and profile/display-name hydration before legacy actor fields can be retired.

Canonical replacement:

Policies using `current_app_user_id()`, permissions, and eventually `order_participants`.

Migration action:

- Keep patched read/check paths.
- Keep canonical actor writes on `activity_log.actor_user_id` and audit remaining generic helper/policy edges before restriction.
- Later use permission/responsibility helpers.

Drop/archive condition:

Replace in place; do not drop without replacement.

Roadmap phase:

Phase 1, Phase 3, Phase 7.

### Orders RLS policies

Disposition: Migrate/rebuild.

Current purpose:

Gate order read/write by role and assignment.

Current risk:

Partially resolved. Older role-based policies let reviewer role or helper leakage grant too much order visibility.

Progress:

- Phase 1 Batch 2 Step 1 replaced app-user comparisons with `public.current_app_user_id()`.
- Lifecycle visibility migration dropped broad reviewer/all-order policies.
- Assigned reviewers now see only `in_review`, `needs_revisions`, and `completed` orders.
- `current_is_appraiser()` now requires explicit appraiser role assignment so reviewer/admin overlap does not pass appraiser policies.
- Multi-Company Slice 7B removed the old order SELECT policies and the global admin `orders_owner_admin_full_access` ALL read bypass.
- Slice 7B added `orders_select_company_lifecycle_visibility`, which delegates to `current_app_user_can_read_order_row(...)`.
- `can_read_order(uuid)` now delegates to `current_app_user_can_read_order(uuid)` for compatibility.
- `rpc_get_activity_feed(uuid)` and `rpc_list_orders(...)` now enforce order-derived read safety.
- Multi-Company Slice 7C patches order-derived calendar, activity, and notification read bypasses:
  - `v_admin_calendar` and `v_admin_calendar_enriched`
  - `get_calendar_events(timestamptz, timestamptz)`, `get_calendar_events()`, and `get_admin_calendar_events(...)`
  - `get_order_activity_flexible(uuid)` and `get_order_activity_flexible_v3(uuid)`
  - `v_order_activity_feed` and `v_order_activity_compat`
  - `rpc_get_notifications`, `rpc_get_unread_count`, `rpc_notifications_list`, and `rpc_notifications_unread_count`
- Order-tied notifications are hidden and excluded from unread counts when the source order is unreadable.
- Validation passed with clean reset, policy/view catalog checks, default-company parity checks, cross-company negative tests, notification unread-count checks, calendar and activity visibility checks, regenerated Supabase types, lint, build, and `git diff --check`.
- Multi-Company Slice 7D adds client read isolation:
  - `current_app_user_can_read_client_row(uuid, bigint)`
  - `clients_select_company_visibility`
  - `v_client_kpis`, `v_client_metrics`, and `v_client_kpis_appraiser` with `security_invoker = true`
  - `get_clients_for_user()` and `client_name_taken(text, bigint)` patched for readable-client/current-company behavior
- Slice 7D validation passed with clean reset, catalog checks, default-company parity, assigned-client appraiser visibility checks, cross-company negative tests, client search/autocomplete visibility coverage, duplicate checks, explicit RPC shape checks, regenerated Supabase types, lint, build, and `git diff --check`.
- Multi-Company Slice 7E1 adds client table write authorization:
  - `current_app_user_can_create_client()`
  - `current_app_user_can_update_client_row(uuid, bigint)`
  - `current_app_user_can_delete_client_row(uuid, bigint)`
  - `clients_insert_company_authorized`
  - `clients_update_company_authorized`
  - `clients_delete_company_authorized`
  - `tg_clients_preserve_company_id()` resolves inserts to `current_company_id()` and preserves existing `company_id` on updates
- Slice 7E1 validation passed with clean reset, catalog checks, admin/appraiser/no-role write tests, cross-company mutation tests, spoofed `company_id` tests, direct write and inline intake compatibility checks, regenerated Supabase types, lint, build, and `git diff --check`.
- Multi-Company Slice 7E2 adds client mutation RPC and merge hardening:
  - `merge_clients(bigint, bigint, jsonb)` is current-company and permission hardened
  - legacy client mutation RPC signatures are preserved as compatibility wrappers
  - create/update/delete wrappers enforce the 7E1 helper predicates
  - `PUBLIC` and `anon` execute privileges are revoked for the seven client mutation RPCs
  - `authenticated` and `service_role` execute grants remain
  - merge reassigns only current-company linked orders and child clients
  - merge blocks cross-company drift and already-merged source or target clients
- Slice 7E2 validation passed with clean reset, catalog checks for definitions/grants/comments, anon/no-role/appraiser negative checks, owner/admin-style mutation checks, spoofed company checks, cross-company update/delete/merge negatives, merge drift and already-merged guards, direct frontend write compatibility, inline New Order client creation compatibility, regenerated Supabase types, lint, build, and `git diff --check`.
- Multi-Company Slice 7E3A adds backend order intake attachment authorization:
  - `current_app_user_can_create_order()`
  - `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)`
  - `current_app_user_can_attach_order_client(bigint)`
  - `current_app_user_can_attach_order_amc(bigint)`
  - `tg_orders_preserve_company_id()` resolves inserts to `current_company_id()` and preserves `OLD.company_id` on updates
  - `tg_orders_validate_company_client_attachments()` enforces linked client and managing AMC attachment safety
  - `rpc_create_order(jsonb)`, `rpc_update_order(uuid, jsonb)`, and `rpc_order_update(uuid, jsonb)` enforce the same attachment contract
- Slice 7E3A validation passed with clean reset, same-company attach success, cross-company attach failure, spoofed `company_id` protection, manual-only order success, merged-client rejection, same-company AMC attach success, cross-company/non-AMC attach failure, inline order creation compatibility, patched RPC same-company/cross-company tests, role validation, regenerated Supabase types, lint, build, and `git diff --check`.
- Multi-Company Slice 7E3B adds legacy order RPC/import quarantine:
  - `rpc_order_create(jsonb)` and `rpc_order_update(text, jsonb)` are preserved by signature but raise explicit deprecated/quarantined exceptions
  - `import_orders_from_json(jsonb)` is service-role-only and marked deprecated/unsafe for multi-company imports
  - `PUBLIC`, `anon`, and `authenticated` execute privileges are revoked from all three legacy paths
  - active bigint-compatible order RPCs and direct order create/update remain working
- Slice 7E3B validation passed with clean reset, catalog grant/comment checks, anon/authenticated execution denial, service-role importer compatibility, deprecated exception checks, active bigint-compatible RPC checks, direct order create/update checks, lint, build, and `git diff --check`.
- Multi-Company Slice 7F1 adds order table write policy cleanup:
  - legacy order insert/update/delete policies were removed
  - `orders_insert_company_authorized`, `orders_update_company_authorized`, and `orders_delete_company_authorized` are active
  - inserts use `current_app_user_can_create_order()`
  - updates use `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)`
  - trigger-owned order `company_id` behavior is preserved
  - direct frontend order writes remain compatible for authorized users
  - workflow/status/date/assignment RPCs, Smart Actions, lifecycle semantics, notification behavior, and activity behavior were intentionally unchanged
- Slice 7F1 validation passed with clean reset, policy catalog checks, same-company admin/owner direct write checks, cross-company mutation blocking, appraiser/reviewer update compatibility checks, no-role negative checks, spoofed `company_id` checks, direct order update/archive/delete parity checks, regenerated Supabase types, lint, build, and `git diff --check`.
- Multi-Company Slice 7F2 adds canonical workflow transition RPC hardening:
  - `rpc_transition_order_status(uuid, text, text)` requires current-company membership
  - target order company must match `current_company_id()`
  - target order must be readable through `current_app_user_can_read_order(uuid)`
  - target order must be updateable through `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)`
  - Smart Actions semantics, transition validation, required workflow permissions, and trigger-driven status activity behavior are preserved
  - legacy workflow/status/date/assignment RPCs remain unchanged and deferred
- Slice 7F2 validation passed with clean reset, same-company appraiser/reviewer/admin transition checks, cross-company transition rejection, stale company claim rejection, no-role rejection, status activity side-effect checks, regenerated Supabase types, lint, build, and `git diff --check`.
- Multi-Company Slice 7F3 adds legacy arbitrary workflow/status RPC quarantine:
  - `rpc_update_order_status(uuid, text)`, `rpc_update_order_status_with_note(uuid, text, text)`, `rpc_order_set_status(text, text)`, `rpc_order_set_status(uuid, text, text)`, `rpc_order_mark_complete(text, text)`, `rpc_order_ready_to_send(text)`, `rpc_order_send_to_client(text, jsonb)`, `rpc_review_approve(text, text)`, `rpc_review_request_revisions(text, text)`, `rpc_review_start(text)`, `rpc_update_order_v1(uuid, text, uuid, timestamptz, timestamptz, timestamptz, jsonb)`, and `set_order_status(uuid, text)` preserve signatures but raise explicit deprecated/quarantined exceptions
  - `PUBLIC`, `anon`, and `authenticated` execute privileges are revoked from the quarantined RPCs
  - `service_role` remains granted but still receives deprecated exceptions
  - `rpc_transition_order_status(uuid, text, text)` remains the only lifecycle authority
  - assignment/date RPCs, frontend code, Smart Actions, canonical transition semantics, notification generation, and activity generation were unchanged
- Slice 7F3 validation passed with clean reset, catalog grant/comment checks, anon/authenticated execution denial, service-role deprecated exception checks, canonical same-company transition success, cross-company/no-role transition rejection, canonical status/activity side-effect checks, regenerated Supabase types, lint, build, and `git diff --check`.
- Multi-Company Slice 7F4A adds assignment/date mutation guardrails:
  - `app_user_has_company_role(uuid, uuid, text[])` and `current_app_user_can_assign_order_target(uuid, uuid, text)` were added
  - trigger-level assignment validation now protects `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, and `orders.current_reviewer_id`
  - assignment target users must belong to the current company and have the appropriate appraiser/reviewer role capability where practical
  - guarded assignment/date RPCs were patched: `rpc_assign_order(uuid, uuid, text)`, `rpc_update_due_dates(uuid, date, date)`, and `rpc_update_order_dates(uuid, timestamptz, timestamptz, timestamptz)`
  - stale assignment/date RPCs were quarantined: `rpc_assign_order(uuid, uuid)`, `rpc_assign_reviewer(uuid, uuid)`, `rpc_assign_next_reviewer(uuid)`, both `rpc_order_set_dates(...)` overloads, `rpc_order_update_dates(text, ...)`, and `set_order_appointment(uuid, timestamptz, text)`
  - date mutations require readable/updateable current-company orders
  - direct table update compatibility, Smart Actions, queue/calendar projections, frontend behavior, and existing assignment/date activity side effects were preserved
  - `current_reviewer_id` model cleanup, review-route redesign, and `calendar_events` table policy cleanup remain deferred
- Slice 7F4A validation passed with clean reset, catalog grant/comment checks, same-company assignment success, cross-company and wrong-role assignment rejection, same-company date update success, unreadable-order mutation rejection, quarantined RPC exception checks, calendar/order projection date parity, assignment/date activity side-effect parity, regenerated Supabase types, lint, build, and `git diff --check`.
- Multi-Company Slice 7G1 hardens activity table/RPC access:
  - `activity_log` table reads require readable source orders for authenticated app access
  - `activity_log` table inserts require non-null source orders plus readable/updateable current-company authorization
  - broad `USING true` and `WITH CHECK true` activity policies were removed
  - authenticated access to `order_id is null` activity is blocked by default
  - `activity_log` update/delete remain blocked for authenticated users
  - both active `rpc_log_event` overloads require current-company membership, readable source order, updateable source order, and order company matching `current_company_id()`
  - activity side effects and frontend feed shapes were preserved
- Slice 7G1 validation passed with clean reset, activity policy catalog checks, same-company/cross-company/no-role activity visibility checks, direct insert and RPC positive/negative checks, assignment/date side-effect checks, regenerated Supabase types, lint, build, `git diff --check`, and final clean `supabase db reset`.
- Multi-Company Slice 7G2A hardens notification table/RPC access:
  - notification table policies use `current_app_user_id()` as the canonical identity
  - direct authenticated notification INSERT/UPDATE/DELETE is blocked
  - `rpc_notification_create(jsonb)` requires current-company membership plus readable/updateable current-company source orders for authenticated order-tied notifications
  - notification company context is derived from the source order and frontend-sent `company_id` is ignored
  - recipients must be active members of the source order company
  - authenticated non-order notification creation is blocked
  - service-role non-order notification creation is preserved for operator/system paths
  - read/mark/dismiss RPCs only affect current-user readable notifications
  - legacy manual/debug notification RPCs are quarantined
  - notification bell/read-count compatibility was preserved
- Slice 7G2A validation passed with clean reset, notification policy catalog checks, same-company order-tied create success, cross-company/unreadable order rejection, outside-company recipient rejection, actor suppression checks, authenticated non-order create rejection, service-role non-order create preservation, read/unread/dismiss parity, notification bell smoke checks, regenerated Supabase types, lint, build, `git diff --check`, and final clean `supabase db reset`.
- Multi-Company Slice 7H1 quarantines unsafe legacy exposed views and preserves canonical hardened view access:
  - `anon` and `authenticated` SELECT was revoked from 17 unsafe legacy views: `v_orders_unified`, `v_orders_frontend`, `v_orders_list_v2`, `v_orders_list_with_last_activity_v2`, `v_orders_unified_list`, `v_orders_dashboard_active`, `v_admin_dashboard_counts`, `v_calendar_events`, `v_calendar_unified`, `v_admin_calendar_v2`, `v_calendar_events_admin`, `v_calendar_events_appraiser`, `v_amcs`, `profiles`, `v_email_queue`, `v_staging_raw_orders_2025_ord`, and `v_user_notification_prefs`
  - canonical hardened views remain selectable by app roles: `v_orders_frontend_v4`, `v_orders_active_frontend_v4`, `v_orders_list`, `v_orders_list_with_last_activity`, `v_admin_calendar`, `v_admin_calendar_enriched`, `v_client_kpis`, `v_client_metrics`, and `v_client_kpis_appraiser`
  - `v_order_activity_feed` and `v_order_activity_compat` now hide `order_id is null` rows and require `current_app_user_can_read_order(order_id)`
  - quarantine/future explicit-grants cleanup comments were added
  - no objects were moved, renamed, or removed
- Slice 7H1 validation passed with clean reset, catalog checks for quarantined/canonical view access, active frontend smoke checks for orders, dashboard, calendar, clients, notifications/activity, order-id-null activity visibility checks, regenerated Supabase types, lint, build, and `git diff --check`.
- Multi-Company Slice 7H2A replaces broad app-role grants with explicit authenticated access:
  - broad `PUBLIC`, `anon`, and `authenticated` table/view, sequence, and function privileges were revoked
  - `anon` has no table, view, sequence, or function access in `public`
  - `authenticated` access is explicit allowlist only
  - canonical hardened views, current direct table compatibility surfaces, and active hardened RPC/helper functions remain granted
  - quarantined workflow/status RPCs, legacy uuid order RPCs, importers, debug/manual notification helpers, and email queue worker paths remain inaccessible to app roles
  - `service_role` broad access remains intentionally preserved for operator/backfill compatibility
  - `supabase_admin` future-object default ACL cleanup remains a manual/platform-role follow-up
- Slice 7H2A validation passed with clean reset, catalog grant/default-ACL checks, canonical surface accessibility checks, quarantined/import/debug path denial checks, regenerated Supabase types, lint, build, and `git diff --check`.

Why lifecycle overrides role:

Global role says what a user can do in the system; order lifecycle says whether they are currently responsible for a specific order. Reviewer role alone must not expose `new` or `in_progress` orders, even when `reviewer_id` is pre-assigned.

Canonical replacement:

Policies using app user ID, permissions, company scope, and order participants.

Migration action:

- Keep company-aware lifecycle/responsibility SELECT policy as authoritative for order read visibility.
- Do not reintroduce global admin ALL read bypass policies.
- Preserve `current_app_user_can_read_order_row(...)` as the order read predicate until participant-backed authorization replaces it.
- Add participant checks after `order_participants`.

Drop/archive condition:

Replace in place.

Roadmap phase:

Phase 1, Phase 5, Phase 7.

### Notification RLS policies

Disposition: Migrate/rebuild.

Current purpose:

Allow users to read their own notifications.

Current risk:

Resolved for Phase 1 Batch 1.

Progress:

- Notification RLS now compares `user_id` to `public.current_app_user_id()`.

Canonical replacement:

`user_id = current_app_user_id()`.

Migration action:

- Keep patched Phase 1 behavior.

Drop/archive condition:

Replace in place.

Roadmap phase:

Phase 1.

## Tracker Review Rules

Before changing any tracked item:

1. Identify roadmap phase.
2. Confirm canonical replacement.
3. Confirm whether change is additive.
4. Check app usage with `rg`.
5. Check DB dependencies.
6. Define rollback path.
7. Validate in local/staging.

Before dropping any tracked item:

1. App code no longer reads/writes it.
2. RPCs/functions no longer reference it.
3. Views no longer depend on it.
4. RLS policies no longer depend on it.
5. Data is backed up or migrated.
6. Staging has run without errors.
7. Drop is its own explicit cleanup change.
