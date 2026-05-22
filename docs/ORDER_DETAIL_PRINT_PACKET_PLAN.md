# Order Detail Print Packet Plan

## Purpose

Order Detail Print Packets provide a printable/shareable internal order summary from already
authorized Order Detail data. The feature should help admins, owners, reviewers, and operational
staff create a concise workfile, invoicing support packet, internal record, or later audit/dispute
reference without adding new mutation authority.

This began as a planning document for Next Phase Slice 1A. Next Phase Slices 1B through 1G complete
the first governed product expansion: a read-only browser print packet foundation inside Order
Detail without changing backend behavior, permissions, RLS, RPCs, lifecycle/workflow/assignment
behavior, document storage behavior, activity writes, notifications, routes, or database schema.

Related doctrine:

- `docs/NEXT_PHASE_EXECUTION_PLAN.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/GOVERNANCE_RETROSPECTIVE_AND_NEXT_PHASE.md`
- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/ORDER_RETIREMENT_DOCTRINE.md`

## Feature Contract

The first implementation must be:

- read-only;
- internal-facing;
- printable from the browser;
- grounded in currently authorized order readback;
- free of mutation controls;
- free of new backend writes;
- free of lifecycle, workflow, assignment, notification, or document behavior changes.

The print packet is a rendering surface, not a new operational authority.

## Likely Packet Modes

### Order Summary

Purpose: a compact operational packet for invoicing support, internal handoff, or workfile reference.

Include:

- order summary;
- property/subject details;
- client/lender/borrower details where already available to the current user;
- assignment participants;
- key dates/deadlines;
- current status summary;
- documents/files summary;
- notes/disclaimers.

Exclude:

- full activity timeline;
- mutation controls;
- signed document links;
- hidden storage details.

### Order Audit

Purpose: a fuller preserved-history packet for internal audit, dispute review, or operational
retrospective.

Include everything in Order Summary, plus:

- status/history summary;
- activity timeline summary;
- key note excerpts where already visible to the current user;
- lifecycle notices for archived, cancelled, or voided orders.

The audit packet should still avoid mutation controls and should not expose file contents or signed
download URLs.

## Likely Packet Sections

| Section | Content | Notes |
|---|---|---|
| Order summary | Order number, status, priority/type, created/ordered date, client label, current lifecycle notice if archived/cancelled/voided | Use existing display labels and preserved-history notices where possible |
| Property / subject details | Address, city/state/postal code, property type, report type, access notes when already visible | Do not add new data fetch authority |
| Client / lender / borrower details | Client, AMC/lender, borrower/contact fields if already loaded/authorized | Omit unavailable fields rather than adding new backend coverage |
| Assignment participants | Appraiser, reviewer, assigned-to/owner fields as currently visible | Read-only names/roles only |
| Key dates / deadlines | Site visit, review due, final due, completed/delivered dates if present | Avoid changing calendar/lifecycle semantics |
| Status / history summary | Current status, key lifecycle flags, optionally recent status transition summary | Summary-only in first pass; no workflow controls |
| Documents / files summary | Document count/list metadata, category/title/status if already available | No signed URLs, storage paths, buckets, or inline downloads |
| Activity timeline summary | Order Audit mode only; recent/key events and notes already visible | Avoid adding new activity write paths or event transformations |
| Notes / disclaimers | Internal print timestamp, generated-by display if already available, confidentiality/internal-use disclaimer | Generated-by display is not authoritative audit actor identity |

## Guardrails

- No signed document downloads embedded.
- No private file exposure beyond existing user access.
- No storage bucket names, storage object paths, signed URLs, or raw file internals.
- No mutation buttons in print view.
- No archive/cancel/void/restore/reopen/unarchive controls.
- No workflow Smart Actions in print view.
- No assignment accept/decline/start/submit/complete controls.
- No notification fanout.
- No activity writes.
- No new database tables.
- No new RPCs in the first implementation unless an existing authorized read surface cannot support
  the minimum packet.
- No archived/cancelled/voided behavior changes.
- No changes to active-list archived/cancelled/voided exclusion.
- No direct frontend domain writes.

## Implementation Options

### Browser Print Stylesheet

Approach: add a print-optimized rendering state/component inside the existing Order Detail surface
and rely on browser print.

Pros:

- smallest implementation;
- no new route authority;
- can reuse already loaded order/detail/activity data;
- easiest to keep read-only;
- fits the first-slice governance goal.

Cons:

- browser print output varies;
- harder to share a stable URL for the exact packet view;
- may need careful CSS to hide navigation/actions consistently.

### Dedicated Print Route

Approach: add a route such as `/orders/:id/print` or `/orders/:id/print/:mode` that renders only the
packet.

Pros:

- cleaner layout and URL;
- easier to test independently;
- can isolate all mutation controls from the print shell.

Cons:

- introduces routing and permission-guard surface area;
- must be careful not to create a historical/admin readback bypass;
- may require more data-loading decisions.

### Print Modal / Preview Component

Approach: open a preview overlay from Order Detail, with print actions scoped to the preview.

Pros:

- clear user workflow;
- easy to choose `Order Summary` versus `Order Audit`;
- can keep current page context.

Cons:

- modal layout may fight browser print;
- still needs strong CSS isolation to avoid printing hidden app chrome;
- less useful for direct links/bookmarks.

### Future PDF Export

Approach: generate a PDF through browser APIs or backend rendering later.

Pros:

- stable output;
- easier to attach/share outside the app.

Cons:

- not needed for first slice;
- likely introduces storage/export/security questions;
- backend PDF generation could create new operational artifacts requiring retention doctrine.

PDF export should remain deferred until the read-only browser print packet proves useful.

## Recommended First Implementation

Use a **browser print stylesheet with a dedicated print preview component inside Order Detail**.

Recommended shape:

1. Add a read-only `OrderPrintPacket` component that accepts already authorized order/detail data.
2. Add a lightweight preview affordance on Order Detail for `Order Summary` and `Order Audit`.
3. Hide all app chrome, buttons, menus, form controls, Smart Actions, lifecycle controls, and
   assignment action controls in print CSS.
4. Render document/file metadata only, not file contents or download URLs.
5. Reuse currently loaded activity data for Order Audit mode if available; if not available, show a
   clear empty/unavailable state rather than adding a new RPC in the first slice.
6. Add focused tests that assert print packet rendering excludes mutation controls and signed
   download/link content.

This approach keeps the first slice product-facing, useful, and low risk while leaving a dedicated
print route or PDF export for later.

## Slice 1B Implementation Baseline

Next Phase Slice 1B implements the first browser-native print foundation:

- `src/features/orders/print/OrderPrintPacket.jsx` renders a read-only internal packet from already
  loaded Order Detail data.
- Order Detail exposes a controlled `Print Packet` entry point that opens a preview dialog.
- The preview uses `window.print()` for output and print-specific layout classes.
- The packet includes order summary, subject/property details, client/participant summary, key
  dates, status/activity summary, and file count summary only.
- The file summary does not render document downloads, signed URLs, storage paths, buckets, or file
  contents.
- The packet renders no mutation buttons, workflow actions, lifecycle actions, inline editing,
  assignment controls, notification behavior, or activity writes.
- The implementation adds no route, backend API, RPC, database table, PDF generation, or
  archived/history behavior change.

## Slice 1C Layout Polish Baseline

Next Phase Slice 1C improves browser print layout quality without expanding data access:

- the packet has a cleaner print header with status, lifecycle, and file-count summary chips;
- major sections use print-safe dividers, compact summary grids, and tighter printed typography;
- major print sections and the header avoid page breaks inside the section where browser support
  allows it;
- the active print preview uses a dedicated print surface so surrounding app navigation, footer,
  Order Detail actions, lifecycle/workflow buttons, and preview controls are hidden during print;
- the packet still renders only already loaded Order Detail data and file count summary;
- the slice adds no PDF generation, route, backend API/RPC, database table, signed URL behavior,
  lifecycle/workflow/assignment change, activity write, notification fanout, or new document data
  access.

## Slice 1D Data Completeness Review

Next Phase Slice 1D audits packet completeness against the current Order Detail data shape without
runtime changes. The current Order Detail path is:

1. `useOrder(id)` calls `getOrder(id)`.
2. `getOrder(id)` reads `v_orders_frontend_v4` through the existing order detail service.
3. `mapOrderRow(...)` normalizes the result into the frontend `OrderFrontend` shape.
4. `OrderPrintPacket` renders only the loaded order object plus the file count already loaded by
   the Order Detail Files card.

Current loaded fields include order id/number/status/archive flag, client/AMC ids and names,
address, city/state/postal code, property type, report type, site visit, review due, final due,
base/appraiser fee and split, appraiser/reviewer ids and names, property/entry contacts, access
notes, notes, created date, and updated date. The current packet already renders the safe core
subset: order number, status/lifecycle, report/property type, fee, property address/contact,
client/AMC, appraiser/reviewer, site/review/final dates, created/updated dates, notes, simple
derived activity summary, and file count.

### Completeness Categorization

| Candidate Addition | Category | Recommendation |
|---|---|---|
| Order id / internal order UUID | Available now from existing loaded data | Do not add to normal summary by default; it is useful for support/debug but less useful for print packets. Consider a small internal reference line only if operations asks for it. |
| Order number / client reference | Order number available now; distinct client reference is not in current detail shape | Keep order number. Defer separate client reference until an approved existing field or read contract exists. |
| Client id / AMC id | Available now from existing loaded data | Exclude from normal print output unless an internal support mode is explicitly designed; ids are source-traceable but not operationally helpful for most packet readers. |
| Property identifiers such as parcel/APN/legal description | Not in current detail shape | Defer. Requires existing approved readback or future backend/view work before adding. |
| Property type | Available now from existing loaded data | Already included. |
| Report type | Available now from existing loaded data | Already included. |
| Report use / purpose / intended user | Not in current detail shape | Defer. Do not infer from report type or notes. Add only if a future approved field/read projection exists. |
| Lender/client/borrower details | Client/AMC names available now; borrower is referenced defensively in the component but not loaded by current service | Keep client/AMC. Defer borrower/lender expansion until existing authorized fields are added to the detail shape. |
| Property contact / entry contact | Available now from existing loaded data | Already included as a safe read-only contact summary. |
| Site visit / inspection date | Available now through `site_visit_at` normalization from existing aliases | Already included. |
| Review due / final due | Available now from existing loaded data | Already included. |
| Completed/delivered dates | Not selected by current detail service, though the component can render `completed_at` if present | Defer until the detail read contract intentionally includes completion/delivery timestamps. |
| Appraiser/reviewer names | Available now from existing loaded data | Already included. |
| Appraiser/reviewer/company contact info | Not in current detail shape | Defer. Requires existing safe member/company projection or backend/view work; do not add emails/phones casually. |
| Assigned-to display name | The mapper exposes `assigned_to` id only; display name is not loaded | Defer display name until participant assignment readback is unified. Do not print raw ids as participant names. |
| Retired lifecycle notices | Current status/archive flags available now | Safe future enhancement from existing data. Add concise read-only notices for archived/cancelled/voided packets when product wants stronger preserved-history context. |
| Document category counts | File rows are already loaded in Order Detail, but only count is passed to the packet today | Safe existing fetch enhancement if the current Files card passes sanitized document metadata or precomputed category counts. Do not add a new fetch. |
| Document titles/statuses | Existing Files card has authorized rows, but packet currently receives only count | Safe only if passed from existing loaded rows and sanitized to title/category/status/date. Exclude signed URLs, storage paths, buckets, and file contents. |
| Recent activity summary | Full ActivityLog owns its own fetch and the packet currently uses derived order timestamps only | Requires safe existing fetch or ActivityLog data exposure. Defer new backend/API work; a future read-only activity summary should use existing authorized activity read paths and explicit limits. |
| Full activity timeline / notes excerpts | Requires activity data and privacy decisions | Defer. Include only after audit-mode requirements define limits, note visibility, and redaction rules. |
| Generated-by actor | Current packet has generated timestamp but no authoritative user context | Defer. If added, use existing authenticated app-user context as display-only metadata, not audit attribution. |
| Signed file links or embedded documents | Privacy-sensitive | Exclude. This packet must not expose signed URLs, storage internals, or document contents. |
| Raw activity payloads, auth ids, company membership internals, permission keys | Privacy-sensitive | Exclude. These are not packet content. |

### Recommended Safe Follow-up Order

1. Add read-only lifecycle notice copy for archived/cancelled/voided packets using existing
   `is_archived` and `status` fields.
2. Pass precomputed document category counts from the already loaded Files card into the packet.
3. Add sanitized document metadata only if it reuses the existing authorized `listOrderDocuments`
   result and excludes links/storage internals.
4. Revisit activity summary only after deciding whether the packet needs an `Order Summary` mode,
   an `Order Audit` mode, or both.
5. Defer property identifiers, report purpose/use, borrower/lender expansion, participant contact
   info, completion/delivery dates, and generated-by actor display until the existing detail read
   contract intentionally exposes those fields.

No runtime changes were made in Slice 1D because the current component had no obvious unsafe gap
that should be filled before the inventory was reviewed.

## Slice 1E Retired Lifecycle Notices

Next Phase Slice 1E implements the first safe data-completeness follow-up from Slice 1D. The print
packet now renders read-only retired lifecycle notices using only fields already loaded by Order
Detail:

- `is_archived`;
- `status`.

Notice behavior:

- archived packets explain that the order was removed from active operational lists and preserved;
- cancelled packets explain that a legitimate order was stopped before completion and preserved;
- voided packets explain that the order was administratively invalidated and preserved.

The notices are print-safe, read-only, and contain no mutation controls. The slice adds no new data
fetches, backend APIs, RPCs, routes, signed URL behavior, file content exposure, PDF generation,
workflow behavior, assignment behavior, activity writes, notification fanout, or lifecycle
mutation behavior.

## Slice 1F Document Category Counts

Next Phase Slice 1F implements the next safe document summary enhancement from Slice 1D. Order
Detail already loads authorized document rows for the compact Files card through the existing
document list path, so the print packet now receives only a sanitized category count summary derived
from those already loaded rows.

The packet Files Summary now includes:

- total file count;
- counts by existing document `category`, `document_type`, or `type` when present;
- `Uncategorized` count for loaded document rows without category/type data.

This slice deliberately does not pass or render file download links, signed URLs, storage paths,
bucket names, file contents, upload controls, archive controls, or individual document access
actions. It adds no new document fetch, backend API, RPC, database table, route, PDF generation,
workflow behavior, assignment behavior, activity write, notification fanout, signed URL behavior, or
mutation behavior.

## Slice 1G Closeout

Next Phase Slice 1G locks the Order Detail Print Packet foundation as complete for the first
governed product expansion.

Completed foundation:

- read-only internal packet rendered from currently authorized Order Detail data;
- browser-native print through the controlled Order Detail `Print Packet` preview;
- print isolation that hides app navigation, preview controls, workflow/lifecycle/action chrome,
  assignment controls, and surrounding Order Detail UI during print;
- order summary, subject/property details, client/participant summary, key dates, status/activity
  timestamp summary, lifecycle state, and file summary sections;
- archived, cancelled, and voided preserved-history notices using already loaded `is_archived` and
  `status` fields;
- document total and category/type counts derived from already loaded Files card rows, with missing
  category/type data grouped as `Uncategorized`;
- focused tests covering preview visibility, browser print invocation, read-only packet rendering,
  retired lifecycle notices, document category counts, no mutation actions, and no signed download
  behavior.

Locked guardrails:

- no signed URLs, download links, storage paths, bucket names, or file contents in the packet;
- no upload, archive, workflow, lifecycle, assignment, notification, inline-editing, or other
  mutation controls in the packet;
- no new data fetches for the print packet beyond existing Order Detail reads and already loaded
  Files card rows;
- no new backend APIs, RPCs, database tables, routes, PDF generation, activity writes, notification
  fanout, lifecycle/workflow/assignment behavior, archived/history readback behavior, or permission
  changes.

Deferred future enhancements:

- sanitized document metadata rows such as title/category/status/date, only if passed from already
  authorized loaded document rows and still excluding links/storage internals;
- dedicated print route if the preview workflow proves insufficient;
- optional PDF export after retention, storage, sharing, and security implications are designed;
- richer activity summaries or a true `Order Audit` mode using explicit authorized activity
  readback and limits;
- client-safe or external packet variants with separate field, privacy, and authorization doctrine.

## Testing Guidance For Implementation Slice

The future implementation should include focused coverage for:

- order summary packet renders core order fields;
- audit packet renders activity/timeline summary when data is available;
- archived/cancelled/voided notices render as read-only preserved-history context;
- mutation controls are absent from print packet output;
- document summary includes total file count and category/type counts from already loaded rows;
- document summary does not include signed URLs, storage paths, bucket names, links, or file
  contents;
- print CSS hides navigation and action chrome.

## Deferred Decisions

- Whether a dedicated print route is needed after the first browser-print slice.
- Whether PDF export is needed, and if so whether it is client-side only or backend-generated.
- Whether external/client-safe packet variants are ever needed.
- Whether Order Audit mode should include full activity or a summarized activity subset.
- Whether packet generation should ever create its own activity event. Current doctrine says no for
  the first implementation.
