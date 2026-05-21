# Route-Level Browser Smoke Closeout

## Purpose

Phase 10I closes route-level browser smoke validation for the recent Falcon architecture
changes after the direct authenticated `orders` write restriction and Owner Setup product
polish. The closeout is documentation-only and records the final state after repairs and
focused reruns.

## Smoke Phases Completed

| Phase | Scope | Result |
| --- | --- | --- |
| 10I1 | Created the route-level browser smoke plan. | Complete |
| 10I2 | Executed initial route smoke. | Found blockers in assignable users and order read projections |
| 10I3 | Repaired assignable user loading and authorized order read projections. | Complete |
| 10I4 | Reran smoke from Order Create onward. | Found activity-log blockers in workflow and override |
| 10I5 | Repaired activity-log identity/FK behavior. | Complete |
| 10I6 | Reran focused failed flows after activity-log repair. | Passed |
| 10I7 | Closed the browser smoke validation phase. | Complete |

## Blockers Found And Repaired

| Blocker | Repair Phase | Repair Type | Final Status |
| --- | --- | --- | --- |
| `rpc_company_assignable_users` failed with `column u.split_pct does not exist`. | 10I3 | RPC projection fix to use canonical existing split fields. | Repaired |
| `/orders/:id/edit` failed with `permission denied for table amcs`. | 10I3 | Safe order read projection repair without broad `amcs` browser access. | Repaired |
| `/orders/:id` failed to load the smoke order. | 10I3 | Authorized order detail/read projection repair. | Repaired |
| `/orders` did not expose the smoke order consistently enough for site visit/status validation. | 10I3 | Authorized list projection repair. | Repaired |
| Smart Action `Send to Review` failed on `activity_log_created_by_fkey`. | 10I5 | Activity-log identity/FK repair using canonical app-user actor identity. | Repaired |
| Order Number Override failed during save, likely activity logging. | 10I5 | Override activity logging repair using FK-safe identity handling. | Repaired |

## Final Passing Flows

| Flow | Final Status | Notes |
| --- | --- | --- |
| Owner Setup | Pass | Page loads, live setup context or safe fallback appears, Company Profile save works, deferred cards remain non-actionable. |
| Order Create | Pass | Assignment selectors load, order number remains generated-on-save, save uses `rpc_create_order`, returned number is visible. |
| Order Detail | Pass | Created order loads at `/orders/:id` and content matches the created order. |
| Order Edit | Pass | Edit route loads, normal save uses `rpc_update_order`, order number remains display-only during normal edit. |
| Site Visit table path | Pass | Order is visible/actionable from the table path and site visit update succeeds through the RPC-backed path. |
| Site Visit detail path | Pass | Site visit update succeeds from the detail page path. |
| Smart Action / Status Workflow | Pass | `Send to Review` succeeds through canonical status workflow RPCs and writes activity without FK failure. |
| Order Number Override | Pass | Explicit change-order-number dialog succeeds and activity logging does not fail. |
| Final list/detail/edit readback | Pass | List, detail, and edit consistently show the created/updated order. |

## Validated Architecture

- Order mutations use RPC/canonical paths for active create, edit, site visit, status workflow, and order-number override flows.
- Direct authenticated `orders` writes remain blocked by the 10G RLS restriction; the smoke repairs did not re-enable direct browser writes.
- Authorized order read projections work for list, detail, and edit paths without requiring broad direct browser access to `amcs`.
- Owner Setup product polish did not break setup profile save, live setup context handling, sample fallback, or deferred non-actionable cards.
- Activity logging works for workflow and override paths with canonical `actor_user_id = current_app_user_id()` behavior and FK-safe legacy `created_by` handling.

## Remaining Nonblocking Observations

- Owner profile lookup returns HTTP 403 in the browser session observed during smoke. This did not affect the smoke criteria, route readback, order mutation RPCs, or Owner Setup Company Profile save path.

## Recommended Next Phase Options

- Team/Staff setup bridge from Owner Setup to Team Access.
- Owner Profile diagnostic/identity polish.
- Company onboarding persistence design.
- Notification/defaults model design.
- Branding/storage design.
- Owner profile 403 investigation if desired.

## Recommended Default Next Step

Recommend the Team/Staff setup bridge if product momentum is preferred. Add a safe link or
guided bridge from the Owner Setup Team / Staff Invitations card to the existing Team Access
route, with no new backend writes and with existing permissions and route guards kept intact.

## Closeout Decision

Phase 10I is complete through 10I7. Route-level browser smoke passed after the 10I3 and
10I5 repairs, with only the owner profile lookup 403 remaining as a nonblocking observation.
