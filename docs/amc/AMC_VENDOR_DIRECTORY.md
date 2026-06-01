# AMC Vendor Directory

## Purpose

The AMC Vendor Directory defines the vendor data model and management doctrine for AMC MVP planning.

The directory should support vendor companies first while leaving room for individual appraiser contacts and future vendor portal functionality.

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
