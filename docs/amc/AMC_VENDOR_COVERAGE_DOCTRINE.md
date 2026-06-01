# AMC Vendor Coverage Doctrine

## Purpose

Vendor coverage defines where a vendor can plausibly perform work and which product categories that coverage supports.

Coverage must support both commercial and residential workflows. It must not be designed as commercial-only, and it must not be reduced to residential ZIP-only coverage.

Coverage rows are informational until assignment matching is explicitly implemented. Coverage does not create assignments, assignment candidates, vendor portal access, order visibility, or automatic eligibility by itself.

## Core Doctrine

Coverage is independent from product type.

A vendor may cover different geographies for different products. For example, a firm may cover all of Ohio for commercial work, selected counties for multifamily work, and selected ZIPs for residential work.

Supported geographic coverage types:

- state
- county
- ZIP
- market
- radius

Supported coverage patterns:

- entire state
- selected counties
- selected ZIPs
- selected markets
- radius-based coverage
- future all-except exclusions

Product taxonomy should be controlled by stable slugs and display labels. Long-term coverage should not rely on free-text product values.

## Product Taxonomy

Product types should use stable slugs in stored data and display labels in UI.

Initial taxonomy:

| Slug | Label |
| --- | --- |
| `appraisal` | Appraisal |
| `restricted_appraisal` | Restricted Appraisal |
| `construction_draw` | Construction Draw |
| `short_term_rental` | Short-Term Rental |
| `residential` | Residential |
| `commercial` | Commercial |
| `industrial` | Industrial |
| `multifamily` | Multifamily |
| `land` | Land |
| `review` | Review |

The taxonomy can expand later, but new values should be introduced through controlled constants or reference data rather than ad hoc text entry.

AMC-3D adds the first frontend controlled taxonomy constants for these product types. The database remains text-backed for MVP, and the UI submits stable slugs while rendering display labels. County coverage builder work remains deferred.

## State And County Constants

AMC-3E.1 adds frontend static state and county constants for the first Coverage Builder phase.

The initial supported states are:

- Ohio (`OH`)
- Michigan (`MI`)
- Indiana (`IN`)

These constants are frontend-only reference data for MVP builder workflows. Backend reference tables, authoritative ZIP datasets, assignment matching, and Coverage Builder UI integration remain deferred.

## Coverage Builder Utility Layer

AMC-3E.2 adds a reusable frontend CoverageBuilder and pure payload-generation utilities in isolation.

The builder supports:

- entire-state coverage
- selected-county coverage
- selected-ZIP coverage
- market/radius coverage
- product-specific coverage using the controlled product taxonomy
- row previews before any backend submission

Generated rows follow the current `vendor_service_areas` shape and use positive coverage rows only. The component does not call backend APIs and is not yet integrated into Add Vendor or Vendor Profile service-area management.

Coverage Builder integration, backend reference tables, authoritative ZIP validation, assignment matching, mapping/geocoding, and normalized coverage-region tables remain deferred.

AMC-3E.3 integrates the isolated CoverageBuilder into the Add Vendor workflow only. Add Vendor now generates `vendor_service_areas`-shaped rows from coverage blocks and submits them through the existing vendor create payload.

AMC-3E.4 adds a Vendor Profile bulk Add Coverage workflow using the same CoverageBuilder. Bulk Add Coverage creates generated positive coverage rows through the existing `createVendorServiceArea` wrapper, while the existing single-row service-area edit workflow remains available for cleanup and correction.

Service-area edit replacement, backend reference tables, assignment matching, mapping/geocoding, bulk edit/delete, and normalized coverage-region tables remain deferred.

## MVP Data Strategy

The current `vendor_service_areas` table can support MVP coverage by storing positive coverage rows.

Examples:

```text
state | county   | zip   | market | radius_miles | product_type
OH    | null     | null  | null   | null         | commercial
OH    | Franklin | null  | null   | null         | multifamily
null  | null     | 43215 | null   | null         | residential
```

Do not introduce normalized coverage-region tables yet. The current table is sufficient for initial management UI, read summaries, and future assignment-matching discovery.

Avoid unnecessary row explosion. Full-state coverage should not expand into every county unless a later matching algorithm requires positive county rows. A full-state row can be represented by `state` with `county`, `zip`, `market`, and `radius_miles` empty.

Selected county coverage can be represented with one row per county and product type. Selected ZIP coverage can be represented with one row per ZIP and product type. Radius-based coverage can be represented with market, ZIP, or state context plus `radius_miles`.

## Future Normalized Model

Normalized coverage-region tables may be introduced later if assignment matching, exclusion handling, or high-volume coverage management requires them.

Possible future structure:

- coverage region: vendor profile, coverage type, state, market, ZIP/radius context, status
- coverage counties: included or excluded counties for a region
- coverage products: product types attached to a region

This is deferred. It should not be introduced before matching requirements are concrete.

## Assignment Matching Doctrine

Future assignment matching must evaluate:

- vendor status
- relationship status
- geography
- product type
- coverage specificity

Coverage specificity matters. A ZIP match should generally be more specific than county, county more specific than state, and explicit market/radius rules should be evaluated according to the matching design.

Coverage is only one input. Vendor Directory coverage must not bypass assignment permissions, assignment packet visibility, order status rules, client constraints, compliance state, or future assignment workflow controls.

## Examples

### Commercial Firm Covering All Ohio

A commercial firm covers all Ohio for commercial and multifamily work.

MVP positive rows:

```text
state | county | zip  | market | radius_miles | product_type
OH    | null   | null | null   | null         | commercial
OH    | null   | null | null   | null         | multifamily
```

### Residential Vendor Covering Selected ZIPs

A residential vendor covers selected Columbus ZIPs.

MVP positive rows:

```text
state | county | zip   | market | radius_miles | product_type
OH    | null   | 43215 | null   | null         | residential
OH    | null   | 43219 | null   | null         | residential
```

### Hybrid Vendor With Different Product Geographies

A hybrid vendor covers selected counties for commercial work but selected ZIPs for residential work.

MVP positive rows:

```text
state | county   | zip   | market | radius_miles | product_type
OH    | Franklin | null  | null   | null         | commercial
OH    | Delaware | null  | null   | null         | commercial
OH    | null     | 43215 | null   | null         | residential
OH    | null     | 43017 | null   | null         | residential
```

### Multi-State Vendor

A multi-state vendor covers Ohio, most of Michigan, and most of Indiana.

MVP positive rows should represent known positive coverage without modeling exclusions directly:

```text
state | county | zip  | market | radius_miles | product_type
OH    | null   | null | null   | null         | commercial
MI    | Wayne  | null | null   | null         | commercial
MI    | Oakland| null | null   | null         | commercial
IN    | Marion | null | null   | null         | commercial
```

Future all-except exclusions can represent "most of Michigan" or "most of Indiana" more compactly after normalized coverage regions are approved.

## Risks And Guardrails

- Do not design coverage as commercial-only.
- Do not design coverage as residential ZIP-only.
- Do not rely on free-text product values long term.
- Do not imply coverage automatically creates assignment eligibility.
- Do not create row explosion unnecessarily for full-state coverage.
- Do not use operations mode, product mode, or company type as authorization.
- Do not create `/amc/*` coverage routes.
- Do not connect coverage rows to assignment behavior until assignment matching is explicitly implemented.
