# AMC Vendor Directory

## Purpose

The AMC Vendor Directory defines the vendor data model and management doctrine for AMC MVP planning.

The directory should support vendor companies first while leaving room for individual appraiser contacts and future vendor portal functionality.

Coverage doctrine is maintained separately in [AMC Vendor Coverage Doctrine](./AMC_VENDOR_COVERAGE_DOCTRINE.md). Vendor Directory coverage must support both commercial and residential workflows, keep geography independent from product type, and remain informational until assignment matching is explicitly implemented.

## Vendor Company First Model

Vendor Company is the primary AMC assignment unit for MVP.

Individual vendor appraisers can be layered in later. Falcon should not design AMC around individual appraisers only.

Vendors should be modeled primarily as companies. Vendor users are members or contacts of vendor companies, not the primary assignment object.

Falcon already has company, company relationship, and order-company assignment foundations. AMC-2 should audit and reuse those foundations before adding new vendor-specific tables.

Vendor Directory work must not fork Falcon into separate AMC routes or screens. Vendor surfaces should extend the shared Falcon shell, navigation, permissions, notifications, activity, and assignment packet infrastructure.

## AMC-2J Implementation Status

AMC-2J adds the first read-only Vendor Directory UI at `/vendors`.

This route is hidden and not exposed through sidebar, top navigation, mobile navigation, or command palette surfaces. It uses the AMC-2I read API wrappers and remains display-only: no vendor forms, mutation actions, assignment candidate UI, assignment workflow, vendor portal behavior, permission seeds, vendor roles, order behavior changes, or `/amc/*` routes are introduced.

## AMC-2K Implementation Status

AMC-2K adds the first read-only Vendor Profile detail UI at `/vendors/:vendorProfileId`.

The detail route remains hidden and is only reachable from the hidden Vendor Directory row links or by direct URL when the existing hidden-surface and permission gates allow access. It displays profile metadata, relationship context, contacts, and service areas through the AMC-2I read API wrappers. It does not add edit/create/archive/delete buttons, assignment actions, mutation RPCs, vendor portal behavior, navigation exposure, permission seeds, vendor roles, order behavior changes, or `/amc/*` routes.

## AMC-2L Closeout Status

AMC-2L closes out the read-only Vendor Directory foundation. The hidden `/vendors` and `/vendors/:vendorProfileId` surfaces remain read-only, route-guarded, and absent from sidebar, top navigation, mobile navigation, and command palette surfaces.

No mutation UI, mutation RPCs, assignment candidate RPCs, assignment behavior, vendor permissions, vendor roles, order behavior changes, raw relationship/assignment UX exposure, or `/amc/*` routes are introduced.

The next AMC-2 slice should decide whether to seed explicit vendor permissions and expose AMC-mode navigation, or first add read-only vendor data seeding/dev fixtures for validation.

## AMC-2N Implementation Status

AMC-2N exposes `Vendors` in AMC Operations navigation only.

The surface still uses the shared `/vendors` and `/vendors/:vendorProfileId` routes and remains read-only. Visibility is gated by AMC Operations mode plus the existing temporary `relationships.read` permission until explicit vendor permissions are approved. Internal Operations navigation does not show Vendors, and Users, raw Relationships, Assignments, vendor mutations, vendor roles, assignment behavior, and `/amc/*` routes remain deferred.

## AMC-2P Demo Seed Data

AMC-2P adds local/demo seed data in `supabase/manual/20260601_amc_vendor_demo_seed.sql` for visual validation of the read-only Vendor Directory and Vendor Profile pages.

The script uses the existing `falcon_default` owner company and creates five demo vendor companies with `amc_vendor` relationships, vendor profiles, primary contacts, service areas, product eligibility, and tags:

- ABC Valuation
- Columbus Valuation Group
- Midwest Commercial Appraisal
- Buckeye Valuation Partners
- Cleveland Review Services

Load it only in local/dev/demo databases after migrations have been applied:

```sh
psql -v ON_ERROR_STOP=1 "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/manual/20260601_amc_vendor_demo_seed.sql
```

The script is not a production migration and does not create vendor mutations, vendor permissions, vendor roles, assignments, order changes, or `/amc/*` routes.

## AMC-2S Vendor Permission Seeds

AMC-2S adds the MVP vendor permission constants and permission catalog seed rows:

- `vendors.read`
- `vendors.create`
- `vendors.update`
- `vendors.contacts.manage`
- `vendors.service_areas.manage`

Owner and Admin template roles receive these MVP vendor permissions by default. Reviewer, Appraiser, Billing, and future vendor-user roles do not receive vendor directory permissions in this slice.

Vendor Directory route, navigation, and read RPC gates still temporarily use `relationships.read` until AMC-2T switches those gates to `vendors.read`. AMC-2S does not add vendor mutation RPCs, mutation UI, vendor roles, assignment candidate behavior, assignment behavior, order behavior, schema/RLS changes beyond permission seed records, or `/amc/*` routes.

## AMC-2T Vendor Read Gate

AMC-2T retires the temporary `relationships.read` bridge for Vendor Directory reads.

The shared `/vendors` and `/vendors/:vendorProfileId` routes, AMC Operations Vendors navigation item, and read-only Vendor Directory RPCs now require `vendors.read`. `relationships.read` remains the framework/network relationship permission and no longer grants Vendor Directory read access by itself.

AMC-2T does not add vendor mutation RPCs, mutation UI, vendor roles, assignment candidate behavior, assignment behavior, order behavior, schema/RLS table changes, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-2V Vendor Mutation RPCs

AMC-2V implements the first Vendor Directory mutation RPC layer:

- `rpc_vendor_profile_create`
- `rpc_vendor_profile_update`
- `rpc_vendor_contact_create`
- `rpc_vendor_contact_update`
- `rpc_vendor_service_area_create`
- `rpc_vendor_service_area_update`

The mutation RPCs use active current-company membership plus vendor-specific permissions: `vendors.create`, `vendors.update`, `vendors.contacts.manage`, and `vendors.service_areas.manage`. They keep Vendor Directory mutations RPC-owned and table access remains blocked for app roles.

AMC-2V does not add frontend mutation wrappers, mutation UI, vendor roles, assignment candidate RPCs, assignment behavior, order behavior, route/navigation changes, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-2W Frontend Mutation API Wrappers

AMC-2W adds frontend API wrappers for the AMC-2V mutation RPCs:

- `createVendorProfile`
- `updateVendorProfile`
- `createVendorContact`
- `updateVendorContact`
- `createVendorServiceArea`
- `updateVendorServiceArea`

These wrappers call the approved Vendor Directory mutation RPCs and surface RPC errors consistently with the existing read API layer.

AMC-2W does not add mutation UI, optimistic updates, assignment candidate calls, delete/archive wrappers, route/navigation changes, vendor roles, assignment behavior, order behavior, schema/RLS changes, permission changes, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-2X Add Vendor UI

AMC-2X adds the first owner-side create workflow to the shared `/vendors` surface.

Users with `vendors.create` can open an Add Vendor modal, enter vendor company details, optional primary contact details, optional coverage, tags, default assignment instructions, and internal notes. The workflow calls `createVendorProfile` with `create_relationship: true` by default, refreshes the Vendor Directory after success, and navigates to the created Vendor Profile when the RPC returns a profile id.

Users with only `vendors.read` keep the read-only Vendor Directory experience and do not see Add Vendor controls.

AMC-2X does not add edit/archive/delete workflows, assignment actions, assignment candidate UI/RPCs, vendor portal behavior, route/navigation changes, vendor roles, order behavior, schema/RLS changes, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-2Y Add Vendor Workflow Hardening

AMC-2Y hardens the first Add Vendor workflow before edit/archive/assignment work begins.

The modal now prevents duplicate submits while saving, sends a compact create payload that omits empty optional sections, preserves entered data after create errors, resets cleanly after close/success, refreshes the Vendor Directory after successful create, and safely skips navigation when a create response does not include a Vendor Profile id.

AMC-2Y does not add edit/archive/delete workflows, assignment actions, assignment candidate UI/RPCs, vendor portal behavior, route/navigation changes, vendor roles, order behavior, schema/RLS changes, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-2Z Vendor Profile Metadata Editing

AMC-2Z adds the first Vendor Profile edit workflow on `/vendors/:vendorProfileId`.

Users with `vendors.update` can edit vendor profile metadata: status, website, public phone, address, default assignment instructions, capabilities, product eligibility, tags, and internal notes. The workflow calls `updateVendorProfile`, refreshes the profile after success, and preserves form values after update errors.

Users without `vendors.update` keep the read-only Vendor Profile experience.

AMC-2Z does not add contact editing, service-area editing, archive/delete workflows, assignment actions, assignment candidate UI/RPCs, vendor portal behavior, route/navigation changes, vendor roles, order behavior, schema/RLS changes, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-3A Vendor Contact Management

AMC-3A adds create/update UI for vendor contacts on `/vendors/:vendorProfileId`.

Users with `vendors.contacts.manage` can add contacts and edit existing contacts, including name, email, phone, role label, primary-contact flag, informational future assignment-notification flag, and notes. The workflow calls `createVendorContact` and `updateVendorContact`, refreshes the Vendor Profile after success, and preserves form values after save errors.

Users without `vendors.contacts.manage` keep the read-only contacts experience.

AMC-3A does not add contact delete/archive workflows, vendor portal invitations, user-linking UI, assignment notification routing, assignment behavior, route/navigation changes, vendor roles, order behavior, schema/RLS changes, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-3B Vendor Service Area Management

AMC-3B adds create/update UI for vendor service areas on `/vendors/:vendorProfileId`.

Users with `vendors.service_areas.manage` can add service areas and edit existing service areas, including state, county, ZIP, market, radius miles, product type, and active/inactive status. The workflow calls `createVendorServiceArea` and `updateVendorServiceArea`, requires at least one coverage or product field, refreshes the Vendor Profile after success, and preserves form values after save errors.

Users without `vendors.service_areas.manage` keep the read-only service-area experience.

AMC-3B does not add service-area delete/hard-delete workflows, assignment candidate logic, automatic coverage matching, mapping/geocoding, assignment behavior, route/navigation changes, vendor roles, order behavior, schema/RLS changes, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-3D Vendor Product Taxonomy Constants

AMC-3D replaces free-text product type inputs with controlled frontend product options.

Add Vendor coverage and Vendor Profile service-area create/update now use stable product slugs with display labels. Known product values render with owner-friendly labels, while older unknown text values remain readable as fallbacks.

The database remains text-backed for MVP. AMC-3D does not add the county coverage builder, normalized coverage-region tables, backend RPC behavior changes, schema/RLS changes, permission changes, route/navigation changes, assignment behavior, order behavior, vendor roles, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-3E.1 Static State/County Coverage Constants

AMC-3E.1 adds frontend static coverage geography constants for Ohio, Michigan, and Indiana.

The constants provide state codes, state labels, and county lists for the first Coverage Builder phase. Backend reference tables and authoritative ZIP datasets remain deferred, and the Coverage Builder is not integrated into Add Vendor or Vendor Profile service-area UI yet.

AMC-3E.1 does not change Vendor Directory UI, backend RPC behavior, schema/RLS, permissions, route/navigation exposure, assignment behavior, order behavior, vendor roles, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-3E.2 Reusable CoverageBuilder

AMC-3E.2 adds a reusable frontend CoverageBuilder component and pure row-generation utilities in isolation.

The builder can configure entire-state, selected-county, selected-ZIP, and market/radius coverage blocks, combine them with controlled product-type slugs, and preview the `vendor_service_areas` rows that would be created later. It does not call backend APIs and is not imported by Add Vendor or Vendor Profile yet.

AMC-3E.2 does not change Add Vendor, Vendor Profile service-area management, backend RPC behavior, schema/RLS, permissions, route/navigation exposure, assignment behavior, order behavior, vendor roles, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-3E.3 Add Vendor CoverageBuilder Integration

AMC-3E.3 replaces the simple single-row Add Vendor coverage fields with the reusable CoverageBuilder.

Add Vendor can now collect one or more coverage blocks and submit generated `service_areas` rows through the existing `createVendorProfile` payload. Each generated row is submitted as active coverage using the current `vendor_service_areas` row shape: state, county, ZIP, market, radius miles, product type, and status. Add Vendor remains valid without coverage.

Vendor Profile bulk Add Coverage and service-area edit replacement remain deferred.

AMC-3E.3 does not change backend RPC behavior, frontend API wrappers, schema/RLS, permissions, route/navigation exposure, assignment behavior, order behavior, vendor roles, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-3E.4 Vendor Profile Bulk Add Coverage

AMC-3E.4 adds a bulk Add Coverage workflow to `/vendors/:vendorProfileId`.

Users with `vendors.service_areas.manage` can open Add Coverage from the Coverage section, build one or more coverage selections with CoverageBuilder, and create generated service-area rows through the existing `createVendorServiceArea` API wrapper. Successful bulk create refreshes the Vendor Profile and closes the modal. Failed creates keep the builder state and show mapped vendor errors.

The existing single-row add/edit workflow remains in place as secondary coverage-row cleanup and correction.

AMC-3E.4 does not add bulk edit, delete/hard-delete, mapping/geocoding, assignment candidate logic, assignment behavior, backend RPC/API changes, schema/RLS changes, permission changes, route/navigation changes, order behavior changes, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-3E.5 Coverage Preview Compression and Save Diagnostics

AMC-3E.5 compresses CoverageBuilder previews so coverage-heavy selections do not render every generated county/product or ZIP/product row inline.

CoverageBuilder now shows summarized coverage selections by default, such as statewide coverage with product counts or selected-county counts with product counts. Generated rows remain available through an optional View generated rows detail area, and the generated payload rows are unchanged.

Add Vendor now keeps owner-facing error copy stable while logging development/test diagnostics with the RPC code, message, details, hint, service-area count, and a small service-area sample. Production users should not see raw SQL or backend diagnostic text.

AMC-3E.5 does not change backend RPC/API behavior, generated row semantics, schema/RLS, permissions, route/navigation exposure, assignment behavior, order behavior, vendor roles, archive/delete behavior, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-3E.6 Vendor Profile Coverage Display Compression

AMC-3E.6 compresses the Vendor Profile Coverage section so generated coverage rows do not create a giant always-visible table.

Vendor Profile coverage now groups rows by geography type, state, and product summary. Examples include statewide coverage, county coverage, ZIP coverage, and market/radius coverage summaries such as `MI · Statewide · 5 products` or `OH · ZIP coverage · 12 ZIPs · 2 products`.

Expanded row detail remains available through View rows, and the existing single-row Edit coverage row workflow is preserved inside the expanded details for cleanup and correction.

AMC-3E.6 does not change backend RPC/API behavior, generated payload semantics, schema/RLS, permissions, route/navigation exposure, assignment matching, assignment behavior, order behavior, vendor roles, archive/delete behavior, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-3F.1 Vendor Copy and Terminology Polish

AMC-3F.1 polishes owner-facing Vendor Directory terminology without changing behavior or data flow.

CoverageBuilder now uses owner-facing labels: Coverage to add, Added coverage, and Add coverage. Vendor Profile shows network status without raw relationship type keys, the primary service-area surface is labeled Coverage, the secondary single-row workflow is labeled as coverage-row cleanup, and Assignment Readiness is renamed Operational Notes until assignment matching exists.

AMC-3F.1 does not change backend RPC/API behavior, schema/RLS, permissions, route/navigation exposure, assignment behavior, order behavior, vendor roles, archive/delete behavior, raw relationship/assignment UX exposure, or `/amc/*` routes.

## AMC-3G Vendor Error Message Hardening

AMC-3G centralizes Vendor Directory error mapping for owner-facing messages.

Add Vendor, Vendor Profile edit, contact management, service-area management, and vendor load failures now map stable backend error codes to clear user-facing copy. Duplicate vendor, self-vendor, missing vendor company, invalid payload, permission, and not-found/not-authorized failures should not surface raw SQL or vague fallback text to normal users.

AMC-3G does not change backend RPC behavior, schema/RLS, permissions, route/navigation exposure, assignment behavior, order behavior, vendor roles, coverage builder behavior, product taxonomy, raw relationship/assignment UX exposure, or `/amc/*` routes.

## Framework Reuse Doctrine

Vendor Directory records should build on the existing company framework wherever possible:

- Vendor companies should map to company records or company-backed vendor profile records.
- Vendor contacts and users should attach to vendor companies.
- Vendor relationship status should reuse or align with company relationship lifecycle records.
- Vendor assignment eligibility should be derived from vendor profile, relationship, coverage, compliance, and assignment state.
- Assignment packet access remains the scoped visibility mechanism for vendor work.

Do not create a second vendor-only company system unless the existing company framework is proven insufficient.

## Minimum Fields

Minimum vendor-company fields may include:

- vendor company name
- status
- primary contact name
- primary contact email
- primary contact phone
- address
- coverage area
- notes
- eligible products
- default fee expectations

## Optional Individual Appraiser Contacts

A vendor company may include optional individual appraiser contacts.

Example:

```text
ABC Valuation
  |-- John Smith
  |-- Sarah Jones
  `-- Mike Davis
```

MVP should not require individual appraiser assignment to make vendor-company assignment useful.

Authenticated vendor users should be treated as vendor-company members. Lightweight contacts may exist before portal access, but contacts alone should not replace the vendor company model.

## Coverage Areas

Coverage should support future assignment matching.

Coverage may include:

- state
- county
- market
- zip
- radius
- product-specific coverage

AMC-3D.5 locks the long-term coverage doctrine before deeper coverage UI work. Current `vendor_service_areas` rows can support MVP coverage by storing positive coverage rows, including full-state rows, selected counties, selected ZIPs, selected markets, and radius-based coverage. Do not introduce normalized coverage-region tables yet.

Product type must remain conceptually independent from geography. A vendor may cover different geographies for different products. Long-term product values should use controlled stable slugs and display labels rather than free text.

Coverage rows are informational until assignment matching is explicitly implemented. Future matching must evaluate vendor status, relationship status, geography, product type, and coverage specificity before presenting any assignment candidate behavior.

## Vendor Statuses

Potential vendor statuses:

- active
- inactive
- pending
- preferred
- do not use
- probation

MVP can start with a small status set, but future configuration should remain possible.

## Permissions

Vendor directory access should respect Falcon's permissions engine.

Future permission distinctions may include:

- view vendors
- create vendors
- edit vendors
- deactivate vendors
- view financial terms
- manage vendor contacts

## Customization Opportunities

Future customization may include:

- company-specific vendor statuses
- preferred vendor groups
- client-specific vendor eligibility
- coverage rules
- vendor score thresholds
- assignment restrictions
- financial visibility controls

## Competitor Weaknesses

Falcon should make vendor management easier than competing AMC platforms by reducing clicks, making coverage and status obvious, and surfacing vendor performance/risk signals where assignment decisions happen.

The directory should not become a static address book. It should support assignment, reporting, and operational visibility.

## Future Expansion

- vendor portal
- vendor onboarding
- license/certification tracking
- insurance/E&O tracking
- document collection
- vendor scorecards
- coverage maps
- communication history
- client-specific eligibility controls
