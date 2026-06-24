# AMC Vendor Manager Compatibility Audit

## Purpose

Slice B audits the current Vendor Directory, bid, assignment, Vendor Workspace, and notification
recipient model against the 2026-06 vendor manager doctrine.

Doctrine source: [ADR: Falcon AMC Separate Product Context](../architecture/ADR_AMC_SEPARATE_PRODUCT_CONTEXT.md).

This slice is intentionally additive and compatibility-focused. It does not change schema, RLS,
auth, bootstrap logic, bid behavior, assignment behavior, report submission, revision behavior, or
production/staging data.

## Decision

No schema migration is needed for the vendor manager MVP.

The existing `vendor_contacts.is_primary` field, partial unique index, read RPC ordering, mutation
RPC behavior, and Vendor Workspace bootstrap ordering already support one primary Falcon-facing
vendor manager/contact/signing appraiser per vendor profile.

## Current Schema Support

Current `vendor_contacts` support:

- `is_primary boolean not null default false`;
- a unique partial index `vendor_contacts_one_primary_per_profile` on `vendor_profile_id` where
  `is_primary`;
- optional `user_id` linkage to `public.users`;
- `receives_assignment_notifications` as a future preference hint only.

Current mutation RPC support:

- `rpc_vendor_contact_create(...)` accepts `is_primary`;
- `rpc_vendor_contact_update(...)` accepts `is_primary`;
- both RPCs clear prior primary contacts for the profile when a new primary contact is marked.

Current read support:

- `rpc_vendor_directory_list(...)` returns primary contact summary fields from the primary contact;
- `rpc_vendor_profile_contacts(...)` orders primary contacts first;
- candidate read payloads include primary contact summary only.

## Current Auth And Vendor Workspace Compatibility

Authenticated Vendor Workspace bootstrap currently matches the signed-in email against active
`vendor_contacts`, prefers `is_primary`, then creates or activates the vendor-company membership
and assigns the existing `Vendor Admin` role template.

The `Vendor Admin` role name remains a compatibility implementation label. Product copy should not
use it to imply that Falcon AMC manages a multi-user vendor team. The MVP product actor is the
primary vendor manager/contact/signing appraiser for the vendor company.

Do not rewrite bootstrap in this slice. Changing bootstrap could break current Vendor Workspace
login, report upload, invoice submission, profile update request, and staging smoke workflows.

## Current Bid And Email Recipient Compatibility

Bid request and invitation flows remain vendor-company and recipient-row based:

- candidates and bid requests target vendor profiles/companies;
- recipient rows belong to vendor profiles and relationships;
- invitation/email delivery chooses a vendor contact by ordering primary contacts first, then
  assignment-notification preference, then stable contact ordering;
- tokenized bid and assignment-offer workflows remain compatible with current primary-contact
  payloads.

This is compatible with the new doctrine because the primary vendor manager/contact is already the
preferred recipient. No recipient table migration is justified for this slice.

## UI Terminology Updated

Low-risk UI copy now favors:

- `vendor manager`;
- `primary vendor manager / signing appraiser`;
- `vendor company`;
- `vendor contact`.

The underlying fields and RPC payloads remain unchanged:

- `primary_contact`;
- `is_primary`;
- `receives_assignment_notifications`;
- `vendor_contacts`;
- `Vendor Admin` role template.

## Compatibility Risks

- Existing docs and migrations still contain historical labels such as `Vendor Admin`,
  `vendor users`, and `primary contact`. Some are literal role names, migration history, or
  historical implementation notes and should not be mechanically renamed.
- The current bootstrap can still match a non-primary contact if no primary contact matches the
  authenticated email. That preserves current access behavior. Tightening login to primary-only
  should be a later auth/bootstrap slice with explicit staging smoke coverage.
- `receives_assignment_notifications` remains only a future hint in the Vendor Directory schema.
  Notification/email routing is still controlled by existing RPCs and email delivery paths.

## No-Change Areas

- No schema migration.
- No RLS changes.
- No Vendor Workspace bootstrap rewrite.
- No permission or role-template migration.
- No changes to bid request creation, bid response, assignment offer, vendor acceptance, start work,
  submit report, revision request, resubmission, invoice submission, or payment workflows.

## Recommended Next Slice

Slice C should continue with low-risk UI copy and route cleanup around the vendor company/contact
model. It should avoid auth/bootstrap rewrites until a separate Slice D strategy defines the
Internal/AMC product-context auth boundary.
