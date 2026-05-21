# Order Attachments Workflow Design

## Purpose

Falcon needs order-level attachments as workflow assets, not as a detached file utility. Commercial
appraisal work depends on source documents, engagement context, property records, revision files,
photos, final reports, and internal workfile support. The first implementation should make files
available in the order workflow while preserving Falcon's current order visibility, permission,
RLS, RPC, and company-scope boundaries.

This is a design document only. It does not implement storage, migrations, RPCs, UI, routes, or
permission changes.

## Competitive Research Basis

The competitive research points to a clear product direction:

- Jaro validates contextual attachments as part of the order workflow.
- MountainSeed validates dense operational visibility, including upload actions and document-heavy
  order context.
- Dart shows the risk of fragmented utilities and detached document handling.
- Falcon should combine modern operational hierarchy with rich order context.

Falcon's attachment model should keep files close to the order, activity, and workfile context while
avoiding file-management clutter in dashboard, profile, or admin setup surfaces.

## Why Order Files Must Not Reuse `user_documents`

The existing `public.user_documents` table is user-oriented:

- It is keyed to `user_id`.
- It has broad self/admin RLS semantics.
- It does not model `company_id`, `order_id`, order visibility, assignment visibility, client
  visibility, vendor packet visibility, document category, publish state, or audit workflow.
- It is not connected to the current company/order read projection strategy.

Order attachments must not reuse `user_documents`. Reusing it would blur profile/account documents
with operational workfile documents and would create avoidable authorization ambiguity.

## Recommended Metadata Model

Create a new order-specific metadata table, tentatively `public.order_documents`.

Recommended columns:

| Column | Purpose |
|---|---|
| `id uuid primary key` | Stable document identity |
| `company_id uuid not null` | Tenant boundary and storage path scope |
| `order_id uuid not null` | Source order/workfile boundary |
| `uploaded_by_user_id uuid not null` | Canonical `public.users.id` uploader attribution |
| `category text not null` | Operational document category |
| `title text` | User-facing display title |
| `file_name text not null` | Original or sanitized filename |
| `mime_type text` | Content type |
| `file_size bigint` | File size for display and policy checks |
| `storage_bucket text not null` | Expected private bucket name |
| `storage_path text not null` | Storage object path, not an authorization token |
| `visibility_scope text not null` | Internal/assigned/client/vendor/audit visibility model |
| `status text not null default 'active'` | Active/archived/deleted lifecycle |
| `created_at timestamptz not null default now()` | Upload metadata timestamp |
| `updated_at timestamptz not null default now()` | Metadata update timestamp |

Optional later columns:

- `published_at`
- `published_by_user_id`
- `deleted_at`
- `deleted_by_user_id`
- `checksum`
- `version_group_id`
- `description`
- `source`

The metadata table is the authorization authority. Storage paths alone must never authorize access.

## Private Storage Bucket And Path Strategy

Use a private bucket, tentatively `order-documents`.

Hard rule: do not use a public bucket.

Recommended storage path shape:

```text
company/{company_id}/orders/{order_id}/documents/{document_id}/{sanitized_file_name}
```

Rationale:

- `company_id` keeps storage organized by tenant.
- `order_id` keeps operational workfile material grouped.
- `document_id` prevents filename collisions.
- The original/sanitized filename remains useful for download UX.

The path shape supports operations and cleanup, but it is not itself authorization. Authorization
must come from `order_documents` plus guarded RPC/Edge checks.

## Document Categories

Initial categories should be operational and simple:

- `engagement`: engagement letters, order instructions, lender guidelines.
- `source_documents`: rent rolls, leases, financials, prior reports, property records.
- `property_media`: photos, inspection photos, site imagery.
- `review_revisions`: revision requests, marked-up reports, review support files.
- `final_report`: final appraisal/report deliverables.
- `internal_workfile`: internal support records, admin notes, invoice support files.

Avoid over-modeling at first. Categories should help users scan order context, not create a rigid
document-management system.

## Visibility Scopes

Initial scopes should be explicit:

- `internal`: owner/admin/internal staff with order document read permissions.
- `assigned`: assigned appraiser/reviewer users with readable order access and assigned document
  permissions.
- `client`: future client-safe published documents only.
- `vendor`: future assignment-packet/vendor-safe documents only.
- `audit`: internal audit/workfile records; not client/vendor visible by default.

Client/vendor visibility must wait until explicit scopes, routes, and permission rules are defined.
Do not infer external visibility from relationship records, assignment records, or file category
alone.

## Permission Model

Use the existing document permission constants as the product permission vocabulary:

- `documents.upload.assigned`
- `documents.upload.all`
- `documents.read.assigned`
- `documents.read.all`
- `documents.delete`
- `documents.publish_to_client`

Recommended interpretation:

- `documents.read.assigned`: read documents for orders the current user can read through assigned
  order visibility.
- `documents.read.all`: read company order documents for orders visible through company/admin order
  scope.
- `documents.upload.assigned`: upload documents to assigned/readable orders.
- `documents.upload.all`: upload documents to any company-readable order.
- `documents.delete`: archive/delete order document metadata and storage objects through a guarded
  path.
- `documents.publish_to_client`: mark a document as client-visible only after client visibility is
  explicitly implemented.

Permissions alone should not grant visibility. A user must also have company context and readable
order scope.

## Recommended RPC / Edge Flows

Prefer RPC/Edge-mediated flows over direct browser table/storage writes.

Recommended read flow:

1. `rpc_order_documents_list(p_order_id uuid)`
2. Validate active company context.
3. Validate readable order scope.
4. Validate `documents.read.assigned` or `documents.read.all`.
5. Return safe metadata only.

Recommended upload flow:

1. `rpc_order_document_prepare_upload(p_order_id, category, file_name, mime_type, file_size, visibility_scope)`
2. Validate current company, readable/updateable order scope, and upload permission.
3. Insert or reserve `order_documents` metadata with pending/active status.
4. Return private bucket/path and short-lived upload instructions, or route to an Edge Function.
5. Client uploads to the private path.
6. `rpc_order_document_finalize_upload(p_document_id, upload_result)` confirms metadata.

Upload UX requirements after the backend contract exists:

- Support drag-and-drop upload.
- Support traditional file picker upload.
- Keep upload controls permission-gated.
- Show clear upload progress, success, and error states.
- After successful upload/finalize, refresh the `Files` card immediately and show the new document
  without requiring a page refresh.

Recommended download flow:

1. `rpc_order_document_create_download_url(p_document_id)`
2. Validate metadata row, active company, readable order, document permission, and visibility scope.
3. Return a short-lived signed URL.

Recommended delete/archive flow:

1. `rpc_order_document_archive(p_document_id)`
2. Validate `documents.delete`, active company, readable order, and document ownership/scope rules.
3. Soft-delete/archive metadata first.
4. Delete storage object only through a controlled backend path when safe.

Recommended publish flow:

1. `rpc_order_document_publish_to_client(p_document_id)`
2. Validate `documents.publish_to_client`.
3. Validate client portal visibility model exists.
4. Set `visibility_scope = 'client'` or a dedicated published flag.

Publishing should remain deferred until Client Portal document visibility exists.

Recommended activity logging:

- Upload/finalize and archive/delete must create backend-side activity events.
- Publish events should create backend-side activity events when client publishing exists.
- Download/sign-url events may create activity entries if Falcon later decides file access auditing
  is operationally useful.
- Activity examples:
  - `Uploaded Rent Roll`
  - `Archived Engagement Letter`
  - `Published Final Report to client`
- Activity entries should include actor, category, document title or file name, and timestamp.
- Do not log sensitive signed URL details or raw storage paths.
- Activity creation should happen as part of guarded RPC/Edge flows, not frontend-only.

## Order Creation Integration

Attachments should not be limited to existing orders forever. Order creation should eventually
support documents as part of the order intake flow.

Because an order ID may not exist until creation succeeds, this must be designed as a staged intake
flow rather than direct order-document creation before an order exists.

Recommended options:

1. Temporary upload session or draft token.
   Files upload into a guarded temporary intake session and are finalized into `order_documents`
   only after `rpc_create_order(...)` succeeds and returns an order ID.

2. Create order first, then attach files in a post-create document step.
   This keeps the first implementation simpler and avoids orphaned draft files, but creates a
   two-step intake experience.

Do not implement order-creation attachment intake until the backend upload/finalize contract is
designed. Any temporary upload model must include cleanup rules, company scope, actor attribution,
and failure handling.

## Lifecycle

Documents can be uploaded at any point in the order lifecycle by permitted users. Files are order
workflow assets, not one-time intake-only data.

Examples:

- engagement letters during intake;
- rent rolls, leases, financials, and property records during analysis;
- photos after inspection;
- marked-up files during review;
- final reports near delivery;
- internal support files during invoicing or later audit review.

Upload permissions, visibility scopes, and category rules should remain consistent across the
lifecycle.

## Order Detail UI Placement

Order Detail should be the first product surface for order attachments.

Recommended placement:

- Keep `Operational Overview` as the top context.
- Keep `Property / Map` and `Activity` as the main lower layout.
- Add a compact `Files` card in the left column near `Property / Map` and `Notes`.
- Show category groups, file count, latest files, and safe action buttons based on permissions.
- Keep upload controls hidden until backend upload/list/download contracts exist.
- When upload is implemented, place the upload/drop zone in the `Files` card only for permitted
  users.
- Refresh the card after upload/finalize so the new document appears immediately.

The `Files` card should support scanability, not become a full document management workspace.

## Drawer Future Preview Behavior

The order drawer should eventually show a compact file preview:

- file count by category,
- newest or most relevant files,
- link to full order detail,
- no heavy upload workflow initially.

The drawer should not duplicate the full file management surface. It is a preview and quick-context
surface.

## Relationship To Print Packets

Order Summary print packet:

- Operational overview only.
- No activity log.
- No automatic binary attachments.
- Later optional attachment index if operationally useful.

Order Audit print packet:

- Operational overview plus activity log.
- Later optional attachment index and document audit metadata.
- Do not automatically bundle file binaries until retention, permissions, storage, and export
  policy are designed.

Attachments and print packets should share the same visibility model. Print/export must not bypass
document or activity permissions.

## First Backend Implementation Slice

Recommended first backend slice:

1. Add private storage bucket design/migration for `order-documents`.
2. Add `order_documents` metadata table.
3. Add RLS policies that depend on readable order scope and document permissions.
4. Add list RPC returning safe metadata.
5. Add download signed-url RPC.
6. Add SQL smoke tests for owner/admin, assigned appraiser/reviewer, and denied cross-company user.
7. Confirm direct authenticated `orders` writes remain blocked.

Do not build upload UI in this slice.

## First UI Implementation Slice

Recommended first UI slice after backend list/download is proven:

1. Add a read-only `Files` card to `OrderDetail`.
2. Use the list RPC only.
3. Display category, title/file name, uploaded date, and count.
4. Add download/open action only through the signed-url RPC.
5. Keep upload hidden until prepare/finalize upload is implemented and tested.
6. After upload contract validation, add permission-gated drag-and-drop and file picker upload.
7. Refresh the `Files` card immediately after successful finalize.
8. Add targeted `OrderDetail` tests.

## Guardrails / Anti-Patterns

Hard rules:

- No public bucket.
- Metadata table is the authorization authority.
- Storage path alone must not authorize access.
- Do not broaden orders RLS.
- Do not reuse `user_documents`.
- Upload UI waits until the backend contract exists.
- Client/vendor visibility waits until explicit scopes are defined.
- Do not log signed URL details or raw storage paths in activity.
- Activity logging for upload/finalize and archive/delete must be backend-side.

Anti-patterns:

- detached global file utilities before order-context files;
- direct browser writes to metadata tables;
- direct browser storage object reads based on guessed path;
- frontend-only activity logging for document lifecycle events;
- upload controls visible without upload permissions;
- client/vendor publish switches before portal visibility exists;
- dashboard file widgets before Order Detail workflow is stable;
- mixing profile/admin documents with operational order workfiles;
- fake file categories that do not map to real appraisal workflow.
