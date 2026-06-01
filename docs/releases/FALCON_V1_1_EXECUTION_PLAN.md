# Falcon V1.1 Execution Plan

## 1. Purpose

Falcon V1.1 is a stabilization and operational completion phase following the Falcon V1 RC1 internal pilot.

The purpose of this plan is to lock the repository to a narrow V1.1 execution path: fix pilot-confirmed operational gaps, document workflow doctrine where implementation is not yet approved, and preserve Falcon for controlled internal pilot use.

V1.1 must not start V2 architecture, introduce broad new product surfaces, or redesign backend/schema foundations unless a specific V1.1 item proves impossible without a reviewed and approved backend change.

## 2. RC1 pilot findings

- Due-date timezone rendering was a pilot-critical correctness issue. RC1 included a fix, but V1.1 must confirm date-only rendering across all operational surfaces before treating the issue as closed.
- User name rendering is inconsistent across operational surfaces. Staff-facing names should use one fallback order so activity, assignments, calendar, rows, and details agree.
- The New to In Progress lifecycle needs an explicit workflow doctrine. Pilot use exposed that status transitions must be understandable to staff before adding automation.
- On Hold is an operational workflow need, but it should be documented before implementation because hold/resume semantics can affect status, deadlines, notifications, reporting, and activity history.
- Order number governance needs a clear policy. Pilot use needs predictable order identifiers, but any configurable numbering system must be scoped carefully.
- Calendar density is acceptable for pilot use, but overflow and filtering improvements would make daily operations easier.
- Client card polish remains visible but is not a blocker for internal pilot stability.

## 3. V1.1 required items

- Confirm the due-date timezone rendering fix across:
  - order detail
  - order create/edit forms
  - order rows and tables
  - calendar
  - activity timeline
  - print packet
- Standardize operational user names to prefer:
  - `full_name`
  - `name`
  - `display_name`
  - `email`
- Define the New to In Progress workflow doctrine:
  - what New means
  - what In Progress means
  - who is allowed to move an order between those states
  - whether assignment, site visit scheduling, or manual action should drive the transition
  - what activity/notification behavior is expected
- Document the On Hold workflow need without implementing it unless explicitly approved.
- Document order number governance:
  - who owns the numbering policy
  - whether manual override is allowed in V1.1
  - whether duplicate/conflicting numbers are blocked
  - whether configurable numbering is deferred to V2 if not solved in V1.1

## 4. V1.1 nice-to-have items

- Calendar `+X More` overflow interaction for dense days.
- Calendar filters for appraiser, reviewer, and event type.
- Client card badge/header alignment polish.

Nice-to-have items may be implemented only after required V1.1 items are complete and stable. They must remain small, UI-scoped, and avoid backend/schema changes unless separately approved.

## 5. Future/V2 backlog

- Copy/Duplicate Order.
- Workload heatmap and pressure forecasting.
- Advanced hold/resume workflow.
- Configurable order numbering system if not handled in V1.1.
- AMC strategy and MVP planning, tracked in [FALCON_AMC_MVP_PLAN.md](./FALCON_AMC_MVP_PLAN.md).

These items are not part of required V1.1 stabilization. They should remain in backlog unless explicitly pulled into a later approved phase.

## 6. Explicit non-goals

- No V2 architecture.
- No public launch changes.
- No schema redesign.
- No broad notification rewrite.
- No client portal work.
- No AMC/network expansion work.
- No owner-configurable platform expansion unless a required V1.1 item is explicitly approved to need it.
- No broad refactors unrelated to the required V1.1 stabilization items.

## 7. Workflow Doctrine Decisions

### New to In Progress

Definition: an order moves from New to In Progress when the assigned appraiser has acknowledged or begun meaningful work.

Approved triggers:

- Appraiser clicks Start Work / Acknowledge Assignment.
- Site visit / appointment date is entered.
- Admin/owner manually marks In Progress.

Do not trigger from:

- generic notes
- passive viewing
- fee edits
- client/contact edits
- due date edits

### On Hold

Decision: needed, but not implemented in this slice.

Future behavior:

- On Hold should pause an order without losing prior lifecycle state.
- Store hold reason, hold note, hold started date, and prior status.
- Clearing hold should return order to prior lifecycle status.
- On Hold is not the same as Needs Revisions or In Review.

### Order Number Governance

Decision: needed, but not implemented in this slice unless separately approved.

Future behavior:

- Owner/admin can configure next order number.
- Admin may need controlled override for legacy/current in-house order numbers.
- Auto-generated numbers should remain default.
- Duplicate/copy order should always generate a fresh number.

### Calendar Overflow

Decision: keep existing individual event-chip calendar pattern.

Future improvement:

- Make `+X More` clickable.
- Open day detail popover/drawer grouped by Site / Review / Final.

### Duplicate Order

Decision: useful V1.1/V1.2 backlog, not implemented now.

Future behavior:

- Copied order should reset status, history, files, and notifications.
- Copied order should receive a fresh order number.

## 8. Implementation slices

### Slice 1: Documentation lock

- Create this V1.1 execution plan.
- Keep scope documentation-only.
- Validate diff hygiene with `git diff --check`.

### Slice 2: Date rendering verification

- Audit all due-date and date-only rendering paths across detail, forms, rows, calendar, activity, and print packet.
- Confirm date-only values do not drift across timezone boundaries.
- Add or update focused tests only where coverage is missing.
- Avoid backend/schema changes.

### Slice 3: Operational user name standardization

- Status: implemented in V1.1 Slice 1 as a frontend/display-only stabilization change.
- Identify all operational name displays for staff, assignment, activity, calendar, and notification-adjacent surfaces.
- Apply the `full_name -> name -> display_name -> email` fallback order consistently.
- Keep changes display-only unless a specific mutation path already uses the same canonical helper.
- No database records, auth, roles, permissions, memberships, schema, or backend migrations are changed by this slice.

### Slice 4: Workflow doctrine

- Status: implemented as documentation-only doctrine lock.
- Document the New to In Progress doctrine before implementation.
- Document the On Hold workflow need and implementation risks.
- Document order number governance and decide whether V1.1 needs a small policy fix or only a future configurable system.
- Document calendar overflow and duplicate-order backlog decisions.
- Do not change runtime code, backend behavior, schema, auth, roles, permissions, or memberships in this slice.

### Slice 5: Approved required implementation

- Implement only required V1.1 items that are confirmed by the doctrine and validation work.
- Keep each code change small and separately verifiable.
- Require explicit approval before any backend/schema change.

### Slice 6: Optional UI polish

- Consider nice-to-have V1.1 UI polish only after required items are complete.
- Keep optional work isolated from workflow, notification, and schema foundations.

## 9. Validation checklist

- Documentation-only slice created or updated.
- `git diff --check` passes.
- Due-date timezone rendering confirmed across detail, forms, rows, calendar, activity, and print packet.
- Operational user name fallback order confirmed as `full_name -> name -> display_name -> email`.
- New to In Progress doctrine documented before related implementation.
- On Hold workflow need documented and not implemented without approval.
- Order number governance documented before related implementation.
- Calendar overflow decision documented and not implemented in this slice.
- Duplicate Order decision documented and not implemented in this slice.
- No V2 architecture introduced.
- No public launch changes introduced.
- No schema redesign introduced.
- No broad notification rewrite introduced.
- No client portal work introduced.
- No AMC/network expansion work introduced.
