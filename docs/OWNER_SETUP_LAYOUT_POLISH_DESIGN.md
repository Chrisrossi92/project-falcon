# Owner Setup Layout Polish Design

## Purpose

Phase 10H1 designs Owner Setup layout, card grouping, status labels, and guidance copy before implementation.

This is documentation-only plus read-only inspection. It does not add runtime code changes, migrations, backend behavior changes, route changes, registry changes, UI changes, tests, setup writes, onboarding authority, readiness authority, or product-mode/module authority.

## Sources Inspected

Docs inspected:

- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`
- `docs/OWNER_SETUP_ACTIONABLE_FOUNDATION_HANDOFF.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Runtime inspected:

- `src/pages/admin/OwnerSetup.jsx`

## Current Owner Setup Layout

Current route and authority:

- `/settings/owner-setup`
- guarded by existing `settings.view`
- uses `useCompanySetupContext()` for guarded live read-only setup context
- feeds live setup context into `resolveCompanyReadiness(...)`
- preserves a static sample fallback when live context is unavailable
- has one actionable card: Company Profile

Current page structure:

- amber guidance hero explaining the page is non-authoritative;
- live setup context status panel;
- main content grid with:
  - actionable `CompanyProfileCard`;
  - flat ordered `SETUP_STEPS` list;
  - right-side authority boundary rail;
- optional live readiness summary;
- static sample readiness summary.

Current card model:

- `CompanyProfileCard` is a full editable form for `name`, `timezone`, and `locale`.
- Other cards are generic `StepCard` entries with a number, title, description, and unnormalized state text.
- Deferred cards use mixed labels such as `Future setup card`, `Deferred storage`, `Unknown`, `Doctrine only`, and `Optional shell`.

Current product issue:

- The page is technically accurate but reads like an implementation checklist.
- All non-profile cards have equal visual weight even though their readiness states differ.
- The distinction between actionable, available guidance, deferred implementation, and diagnostic-only items is not visually systematic.
- Readiness guidance is displayed after the card grid instead of acting as a summary/rail that helps owners orient.

## Recommended Layout Direction

Recommended 10H2 implementation should polish layout and copy only:

- Keep the same route, guard, live setup context hook, profile update behavior, settings link, and dashboard prompt.
- Keep Company Profile as the only actionable write card.
- Replace the flat numbered step list with grouped sections.
- Use consistent status labels and status styling.
- Keep deferred cards visibly non-actionable.
- Keep readiness diagnostic-only.
- Preserve the static sample fallback, but visually separate it from live readiness.

Recommended page hierarchy:

1. Page header
   - Title: `Owner Setup`
   - Short summary: company setup guidance for the current workspace.
   - Small safety line: setup guidance does not grant access or complete onboarding.

2. Live context/readiness band
   - Shows live context state: loaded, unavailable, permission denied, error, or sample fallback.
   - Shows readiness summary as diagnostic only.
   - Avoids implying setup completion is authority.

3. Grouped card sections
   - Core Setup
   - Operations Setup
   - Communication / Branding
   - Readiness

4. Authority boundary rail or footer
   - Keep concise no-go copy.
   - Avoid raw RPC/RLS names in normal card copy; keep technical authority notes in the rail/footer.

5. Static sample fallback
   - Keep available for diagnostics, but visually subordinate to live context.
   - Label clearly as sample fixture.

## Recommended Card Groups

### Core Setup

Cards:

- Company Profile
- Owner Profile
- Basic Settings

Purpose:

- Confirm company identity and first-owner basics.
- Keep the current profile card actionable.
- Keep Owner Profile and Basic Settings as future/deferred cards unless narrow guarded write contracts exist.

Recommended copy:

- Company Profile: `Update the company name, timezone, and locale used by this workspace.`
- Owner Profile: `Review owner identity for attribution and future setup audit context.`
- Basic Settings: `Review workspace defaults that will be configured after narrow settings contracts exist.`

### Operations Setup

Cards:

- Order Numbering
- Workflow Assumptions
- Team / Staff Invitations
- Role Review

Purpose:

- Group operational readiness items that affect day-to-day work but remain governed by backend contracts.
- Keep order numbering read-only/deferred even though the order mutation/RLS safety arc is now complete.
- Link to Team Access later only through existing route/RPC boundaries.

Recommended copy:

- Order Numbering: `Company-safe order numbering is backend-controlled. Configuration remains deferred.`
- Workflow Assumptions: `Review lifecycle assumptions without changing workflow authority.`
- Team / Staff Invitations: `Use Team Access when staff invitation setup is ready.`
- Role Review: `Review role presets and responsibilities without exposing raw permission mechanics.`

### Communication / Branding

Cards:

- Notification Preferences
- Branding

Purpose:

- Keep personal preferences separate from future company notification defaults.
- Keep branding deferred until a storage/upload/security contract exists.

Recommended copy:

- Notification Preferences: `Personal notification preferences are available separately; company defaults remain deferred.`
- Branding: `Branding metadata and logo uploads require a guarded storage design before configuration.`

### Readiness

Cards:

- Readiness Checklist

Purpose:

- Present live readiness as guidance only.
- Summarize blocking, warning, deferred, unknown, and optional items without becoming a gate.

Recommended copy:

- Readiness Checklist: `Review live setup guidance. Permissions and RPC/RLS checks remain the source of truth.`

## Status Labels

Use a small fixed label vocabulary:

| Label | Meaning | Example cards |
|---|---|---|
| `Ready` | The item is satisfied by live read-only context or has no current action. | owner invariant, role presets when resolver reports ready |
| `Needs attention` | Live diagnostics show a warning/blocker that the owner should review. | readiness warnings, missing owner invariant |
| `Available` | The card has a usable current action. | Company Profile |
| `Coming later` | Planned card, no current implementation or contract yet. | Owner Profile, Team / Staff Invitations |
| `Diagnostic only` | Live/readiness information only, not a write path or authority. | Readiness Checklist |
| `Deferred` | Intentionally blocked until backend/storage/security model exists. | Order Numbering, Notification Defaults, Branding |

Avoid mixed ad hoc states such as `Unknown`, `Doctrine only`, `Optional shell`, or `Future setup card` in owner-facing card badges. Those concepts can remain in documentation but should map to the fixed vocabulary above.

## Copy Rules

Actionable card copy should:

- state exactly what can be changed;
- avoid implying setup completion;
- mention guarded save behavior only when necessary;
- show success/error/loading states already present in Company Profile.

Deferred card copy should:

- explain why the card is not actionable;
- name the future boundary at a product level, not raw database mechanics;
- avoid disabled controls that look broken;
- avoid inviting owners to configure data that is not safely modeled yet.

Diagnostic card copy should:

- say `guidance` or `diagnostic`;
- avoid `complete`, `unlock`, `enabled`, or `activated` language unless backed by authority;
- point users to existing safe routes only when those routes exist.

## What Remains Non-Authoritative

Owner Setup remains non-authoritative:

- Readiness does not grant access.
- Readiness does not deny access.
- Owner Setup is not a blocking gate.
- Product-mode/module metadata is not authority.
- Vendor/Client live shells are not activated.
- Setup card status does not replace permissions, route guards, RLS, RPC guards, workflow guards, assignment visibility, or company membership checks.

The Company Profile card remains the only setup write path and only for `name`, `timezone`, and `locale`.

## Recommended 10H2 Implementation

Recommended 10H2 scope:

- Update `OwnerSetup.jsx` visual layout, card grouping, card status labels, and copy only.
- Preserve current Company Profile form behavior and `updateCompanyProfile(...)` API.
- Preserve live setup context and refetch behavior.
- Preserve live readiness resolver usage.
- Preserve static sample fallback.
- Preserve `/settings/owner-setup`, Settings utility link, and Dashboard prompt behavior.
- Preserve existing tests or update only for copy/layout assertions.
- Add no backend writes, migrations, routes, registry entries, permission changes, RLS/RPC changes, or product-mode authority.

Suggested sequence:

1. Introduce grouped card metadata in `OwnerSetup.jsx`.
2. Replace flat numbered `SETUP_STEPS` rendering with grouped sections.
3. Add a normalized status badge component with the fixed label vocabulary.
4. Keep `CompanyProfileCard` mounted in Core Setup as the only actionable card.
5. Move or restyle readiness summaries so live readiness is visually primary and sample fallback is secondary.
6. Keep authority boundary copy concise and visible.
7. Run targeted Owner Setup tests, lint, build, and `git diff --check`.

## No-Go Rules

- No readiness as authority.
- No blocking gate.
- No Vendor/Client activation.
- No order numbering config yet.
- No notification defaults config yet.
- No branding upload/config yet.
- No broad settings writes.
- No bootstrap mutation from browser.
- No durable onboarding completion.
- No product-mode/module authority.
- No route guard or redirect changes.
- No settings/dashboard link behavior changes.

## 10H1 Result

Phase 10H1 is complete as layout/card polish design only.

Next recommended phase: 10H2 Owner Setup layout/card/copy implementation with no new backend writes.

## 10H2 Implementation Result

Phase 10H2 implements the layout/card/copy polish described in this document.

Implemented runtime scope:

- `OwnerSetup.jsx` now groups setup cards into Core Setup, Operations Setup, Communication / Branding, and Readiness.
- Setup cards now use the fixed status labels `Ready`, `Needs attention`, `Available`, `Coming later`, `Diagnostic only`, and `Deferred`.
- The Company Profile card remains mounted in Core Setup and remains the only actionable setup card.
- Deferred cards now explain why configuration remains unavailable.
- Live readiness is visually labeled as diagnostic-only guidance.
- Static sample fallback remains visible and secondary.
- Authority boundary copy remains visible and concise.

Preserved boundaries:

- No backend writes were added beyond the existing Company Profile profile-update path.
- No migrations, route changes, registry changes, permission changes, RLS/RPC changes, or backend behavior changes were added.
- No order numbering, notification defaults, branding, onboarding completion, Vendor/Client activation, bootstrap mutation, broad settings writes, readiness authority, blocking gate, or product-mode/module authority was added.

## 10H3 Readiness Card State Mapping

Phase 10H3 adds live diagnostic status mapping for only the Owner Setup cards that have safe read-only readiness signals.

Implemented mapping:

- Company Profile remains `Available`.
- Readiness Checklist remains `Diagnostic only`.
- Order Numbering, Notification Preferences, Branding, and Basic Settings remain `Deferred`.
- Workflow Assumptions remains `Diagnostic only`.
- Owner Profile maps to `Ready` when owner presence and active owner membership signals pass, `Needs attention` when critical owner diagnostics fail, and `Coming later` when live context is unavailable.
- Role Review maps to `Ready` when role presets and owner role assignment signals pass, `Needs attention` when critical role diagnostics fail, and `Diagnostic only` when live context is unavailable.
- Team / Staff Invitations may map to `Ready` only when invitation and staff readiness summaries both pass; otherwise it remains `Coming later`.

The mapping remains diagnostic-only. It does not make readiness authoritative, does not turn deferred cards into configuration surfaces, does not add setup writes, and does not change route, permission, RLS, RPC, backend, product-mode, Vendor/Client, order-numbering, notification-default, branding, onboarding, or bootstrap behavior.

## 10H4 Deferred Card UX Polish

Phase 10H4 improves the non-actionable deferred card presentation.

Implemented behavior:

- Basic Settings, Order Numbering, Notification Preferences, and Branding now show a consistent `Planned later` explanation.
- Deferred cards explain that work is intentionally waiting on backend, storage, policy, or security contracts.
- Deferred cards do not render disabled buttons, fake links, or configuration controls.
- Company Profile remains the only setup card with an action button.

The deferred-card polish is copy and layout only. It adds no new write path, no backend behavior, no route or registry change, no permission/RLS/RPC change, no readiness authority, no blocking gate, and no configuration surface for order numbering, notification defaults, branding, or broad settings.

## 10H5 Readiness Summary Polish

Phase 10H5 makes the readiness summary more owner-readable while keeping resolver details available as secondary diagnostics.

Implemented behavior:

- Live readiness now leads with simple counts for blockers, warnings, and unknown/deferred items.
- Raw diagnostic status, severity counts, blocker keys, and unknown keys remain visible below the owner-readable summary.
- The live summary remains labeled `Diagnostic only`.
- The static sample fallback remains secondary and uses the same diagnostic summary format.
- Owner-facing copy avoids access, completion, unlock, and activation language.

This polish does not change readiness authority. It adds no new write path, no backend behavior, no route or registry change, no permission/RLS/RPC change, no blocking gate, and no configuration surface for deferred setup cards.

## 10H6 Product Polish Handoff

Phase 10H6 closes the Owner Setup product polish arc in `docs/OWNER_SETUP_PRODUCT_POLISH_HANDOFF.md`.

The handoff records the current grouped Owner Setup UX, card inventory, one actionable Company Profile write path, diagnostic/readiness behavior, deferred-card inventory, safety boundaries, and recommended next phase options. The recommended default next step is route-level browser smoke validation after the Phase 10G direct-write RLS changes and Phase 10H Owner Setup polish.

10H6 is documentation-only and adds no runtime code, migrations, backend behavior, route changes, registry changes, UI changes, tests, setup writes, readiness authority, blocking gate, Vendor/Client activation, order-numbering configuration, notification-default configuration, branding configuration, bootstrap mutation, or broad settings writes.
