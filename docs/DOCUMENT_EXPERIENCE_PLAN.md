# Document Experience Plan

## Purpose

Falcon should make Order Detail files easier to understand and manage while preserving the secure
document governance already established for private order documents. The document experience should
improve attachment visibility, support appraisal workflow context, and keep document access,
downloads, archive behavior, and activity history owned by approved backend paths.

This is a planning document. It does not change runtime behavior, backend APIs, RPCs, storage
policies, signed URL behavior, routes, UI, permissions, document mutations, activity writes,
notification fanout, or Supabase state.

Related doctrine:

- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/ORDER_DETAIL_PRINT_PACKET_PLAN.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Completed Foundation

The current Order Documents foundation is already governed and should remain the authority for
future document UX work.

Completed pieces:

- private `order-documents` storage bucket behavior;
- metadata-backed `order_documents` model;
- upload prepare/finalize flow through backend RPCs and Edge-mediated signed private upload;
- signed download through the approved download Edge/RPC path;
- soft archive through `rpc_order_document_archive(...)`;
- backend-owned document activity logging for upload/finalize and archive events;
- drag/drop upload UI;
- compact Files card inside Order Detail;
- document category counts in the read-only Order Detail Print Packet.

The existing foundation intentionally avoids public file URLs, raw storage path exposure, file
content rendering, direct frontend document table writes, hard storage deletes, and document
mutation behavior outside approved backend-owned paths.

## Candidate Improvements

Future document experience work should start with read-only clarity before adding new document
actions or content surfaces.

Candidate improvements:

- document category/type display polish;
- document metadata rows with clearer labels;
- uploaded-by display where safe metadata is already available or can be added through an approved
  read path;
- uploaded-at display using existing metadata timestamps;
- file size display;
- grouped document sections by category/type/status;
- document status chips such as pending, available, archived, or failed if these states are already
  represented by governed metadata;
- safer file preview planning without implementation;
- missing expected document checklist planning;
- packet/report-ready document summaries.

## Files Card Data Shape Audit

Slice 1B audits the existing Order Detail Files card and document loading flow before UI polish.
This is inventory-only and does not change runtime behavior, backend/RPC behavior, signed URL
behavior, storage policy, document preview behavior, or document mutations.

Current flow:

- `OrderDetail` renders the compact Files card inside the order detail page.
- The card loads documents through `listOrderDocuments(orderId)`.
- `listOrderDocuments(...)` calls only `rpc_order_documents_list(p_order_id)`.
- The list RPC returns safe metadata only and explicitly does not return `storage_bucket`,
  `storage_path`, signed URLs, or object keys.
- The card currently keeps the latest five returned rows for display with `files.slice(0, 5)`.
- Download uses `createOrderDocumentDownloadUrl(document.id)`, which invokes the
  `order-document-download-url` Edge Function.
- The Edge Function authorizes through `rpc_order_document_authorize_download(...)`, looks up
  `storage_bucket` / `storage_path` service-side only, creates a short-lived signed URL, and
  returns it for browser open/download.
- Archive uses `archiveOrderDocument(document.id)`, which calls
  `rpc_order_document_archive(p_document_id, p_reason)`, then refreshes the list.
- Upload uses `uploadOrderDocument(...)`, which uses prepare/upload/finalize behind the existing
  upload helper path.

Fields currently returned by `rpc_order_documents_list(...)`:

| Field | Current Use / Display Direction |
|---|---|
| `id` | Safe internal row identifier for actions; do not present as primary user-facing content. |
| `order_id` | Scope metadata; not useful in the Order Detail Files card because the page already provides context. |
| `company_id` | Scope metadata; do not display in normal UI. |
| `uploaded_by_user_id` | Available as raw app user id only; do not display until an approved read path returns a safe display name. |
| `category` | Safe to display as the primary document category/type label. |
| `title` | Safe display name when present. |
| `file_name` | Safe fallback display name. |
| `mime_type` | Safe as technical metadata if product wants it, but not needed for the first polish slice. |
| `file_size` | Safe to display in formatted form. |
| `visibility_scope` | Operational metadata; display only if product explicitly wants internal/audit scope labels. |
| `status` | Safe to display as a document state chip, especially `archived` when already returned. |
| `created_at` | Safe uploaded/created date display. |
| `updated_at` | Safe metadata; useful for archived/updated timing only if the UX labels it clearly. |

Fields currently visible in the Files card:

- display name from `title || file_name || "Document"`;
- category from `category`;
- created date from `created_at`;
- formatted file size from `file_size`;
- archived chip when `status === "archived"`;
- `Open` action for non-archived rows through signed download helper;
- `Archive` action for non-archived rows when the user has document archive permission.

Safe to display now:

- filename or title;
- document category/type from `category`;
- uploaded/created date from `created_at`;
- formatted file size from `file_size`;
- archived state from `status`;
- MIME type only as optional technical metadata;
- uploaded-by only after a future approved read model returns a safe display name rather than raw
  `uploaded_by_user_id`.

Must not be exposed:

- raw `storage_path`;
- `storage_bucket`;
- private object keys;
- signed URL internals or expiration details in normal UI;
- raw service-role metadata;
- private metadata not intended for users;
- file contents or previews;
- direct storage links;
- raw uploader UUIDs as user-facing names.

First safe UI polish target:

- group visible rows by `category` using the already returned list metadata;
- keep each row compact with title/file name, category label, created date, formatted file size, and
  archived chip;
- make download/archive actions clearer without changing their approved helper paths;
- improve empty/loading/unavailable states;
- keep uploader display deferred until a safe display-name read path exists.

## Governance Rules

- Do not expose raw storage paths, bucket names, signed URL internals, or private object keys in
  normal UI.
- Signed downloads must continue to use only the approved document download path.
- Archive remains backend-owned through `rpc_order_document_archive(...)`.
- No public file URLs.
- No automatic AI extraction, classification, OCR, or review panel in the first document experience
  pass.
- No document content preview unless a separate secure preview design explicitly approves scope,
  authorization, supported file types, rendering model, and logging expectations.
- No new document mutation paths without backend RPC ownership.
- No hard storage delete in normal UI.
- No direct frontend writes to document metadata tables.
- Document UX must not broaden order read scope, document read scope, RLS behavior, or current
  company isolation.
- Document activity should stay backend-owned for operationally relevant document lifecycle events.

## First Implementation Recommendation

The first implementation should be read-only metadata display polish in the existing Order Detail
Files card.

Recommended scope:

- improve document category/type labels using already returned document metadata;
- show grouped document sections if category/type/status metadata is already available in the
  current Files card data;
- show uploaded-at and file size where already available;
- keep download and archive actions on their existing approved paths;
- preserve drag/drop upload behavior without changing upload authority;
- add focused tests for safe metadata display, grouping, absence of raw storage paths, and unchanged
  download/archive wrapper usage.

The first implementation should not add preview/PDF/image rendering, file content embedding,
client-safe sharing, checklist enforcement, AI extraction, new backend reads, new RPCs, storage
policy changes, or signed URL changes.

## Files Card Metadata Polish

Slice 1C implements the first read-only metadata polish in the Order Detail Files card without
backend, RPC, storage policy, signed URL, upload flow, preview, or mutation changes.

Implemented scope:

- visible rows are grouped by already returned document category/type metadata;
- group ordering is deterministic by display label, while row ordering inside each group preserves
  the existing list order returned by the document list path;
- rows show only safe display metadata: title/file name, category/type chip, uploaded/created date,
  formatted file size when available, and archived state when already returned;
- the empty state now clearly says no files have been uploaded yet;
- the existing signed download action remains the only non-archived file open/download path;
- the existing archive action remains available only where already permission-supported;
- tests cover grouped rendering, metadata rendering, empty state rendering, unsafe/internal field
  omission, and preserved download/archive controls.

Governance preserved:

- no raw `storage_path`, storage bucket, private object key, signed URL internals, or raw uploader
  UUID is displayed;
- no PDF/image/content preview was added;
- no document content rendering, AI extraction, checklist enforcement, client sharing, or packet
  attachment behavior was added;
- no new document API, RPC, backend schema, RLS, storage, upload, download, archive, activity, or
  notification behavior was introduced.

## Files Card Closeout

Slice 1D closes out the initial Order Detail Files card metadata polish without runtime changes.
The completed foundation is now locked as a governed read-only presentation improvement on top of
the existing document list, signed download, upload, and archive paths.

Completed behavior:

- visible document rows are grouped by category/type where already available;
- display remains limited to safe metadata only;
- rows show display name from title/file name;
- rows show uploaded/created date from existing timestamp metadata;
- rows show formatted file size when available;
- rows show archived state when already returned by document metadata;
- the non-archived signed-download action is labeled `Download`;
- existing archive behavior is preserved and remains permission/RPC governed;
- the empty state now clearly states that no files have been uploaded yet.

Locked guardrails:

- no raw storage paths;
- no bucket names or object keys;
- no signed URL internals;
- no file contents, previews, PDF rendering, image rendering, or embedded document display;
- no backend, API, RPC, RLS, storage policy, or signed URL changes;
- no upload flow changes;
- no mutation expansion beyond the existing signed download and archive affordances.

Deferred future work:

- secure previews;
- document checklist;
- AI extraction/review panel;
- packet export attachments;
- client-safe file sharing;
- document retention rules;
- richer document metadata normalization, including safe uploaded-by display names if product needs
  them.

## Deferred Work

- Secure previews.
- Expected document checklist.
- AI extraction/review panel.
- Packet export attachments.
- Client-safe file sharing.
- Document retention rules.
- Richer document metadata normalization.
- Document status workflow beyond existing metadata states.
- Report-ready or delivery-ready document package summaries.
- Document notification doctrine for upload/archive if product later wants fanout.
- Hard delete or storage cleanup policy, only after explicit retention design.

## Non-Goals

- No runtime changes in Slice 1A.
- No backend/RPC changes.
- No storage policy changes.
- No signed URL changes.
- No document mutation behavior.
- No preview or content rendering.
- No public sharing.
