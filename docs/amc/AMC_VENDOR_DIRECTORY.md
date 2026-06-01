# AMC Vendor Directory

## Purpose

The AMC Vendor Directory defines the vendor data model and management doctrine for AMC MVP planning.

The directory should support vendor companies first while leaving room for individual appraiser contacts and future vendor portal functionality.

## Vendor Company First Model

Vendor Company is the primary AMC assignment unit for MVP.

Individual vendor appraisers can be layered in later. Falcon should not design AMC around individual appraisers only.

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
