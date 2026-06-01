# Falcon AMC MVP Plan

## Purpose

This plan defines the AMC roadmap, architecture, operational model, and MVP requirements before any AMC implementation work begins.

The goal is to keep future AMC work aligned with Falcon's existing framework and avoid creating a second disconnected platform.

## Core Doctrine

Falcon is one platform.

Falcon is not:

- Falcon Internal
- Falcon AMC

as separate systems.

Falcon is:

```text
Falcon Platform
  |-- Internal Operations Mode
  `-- AMC Operations Mode
```

Falcon uses shared infrastructure, shared users, shared clients, shared orders, shared calendar, shared notifications, shared permissions engine, and shared reporting engine.

Internal Operations Mode and AMC Operations Mode are different operational lenses over the same platform.

## Vision

Falcon should allow Continental to operate both internal appraisal production and AMC operations from a unified platform.

AMC capability is intended to create new revenue opportunities while leveraging the same operational engine already being validated through Falcon V1.1.

## Operations Command Toggle

Future AMC work should document and eventually support an Operations Command control that lets users switch between:

- Internal Operations
- AMC Operations

without leaving Falcon.

The model should be similar to Slack workspaces, Teams organizations, or Discord servers: same login, different operational context.

Future consideration: Operations Command should surface alerts indicating activity requiring attention in the other operational mode.

Example:

- Internal Operations:
  - 2 reviews due
  - 1 assignment waiting
- AMC Operations:
  - 3 orders unassigned
  - 1 client escalation

## Internal Operations Mode

Purpose: run Continental's internal production operation.

Focus:

- Appraisers
- Reviewers
- Revenue splits
- Internal assignments
- Production management

Users:

- Owner
- Admin
- Appraiser
- Reviewer
- Billing

## AMC Operations Mode

Purpose: operate an appraisal management company.

Focus:

- Clients
- Vendors
- Vendor assignments
- Turn times
- AMC margin
- Client service

Users:

- Owner
- Admin
- AMC Coordinator
- Vendor Manager
- Client Manager

Do not implement these roles yet. This plan documents the target model only.

## Shared Order Model

A single order can be viewed through either operational lens.

Internal View:

- Appraiser
- Reviewer
- Split
- Production metrics

AMC View:

- Client
- Vendor
- Vendor fee
- AMC fee
- Margin
- Vendor performance

Both views should reference the same underlying order record.

## Relationship Model

AMC Operations should support a relationship hierarchy that can represent clients, the AMC operating entity, vendor companies, and individual appraisers.

Relationship hierarchy:

```text
Client
  |
  v
AMC
  |
  v
Vendor Company
  |
  v
Individual Appraiser
```

Internal Continental example:

```text
Union Bank
  |
  v
Continental AMC
  |
  v
Continental Real Estate Solutions
  |
  v
Kady Weith
```

Future external vendor example:

```text
Union Bank
  |
  v
Continental AMC
  |
  v
ABC Valuation
  |
  v
John Smith
```

Internal Operations may assign directly to appraisers.

AMC Operations should support assignment to vendor companies and eventually vendor appraisers. Do not design AMC around individual appraisers only.

## AMC Revenue Model

AMC mode needs a different financial lens than internal production.

Internal Operations:

- Fee
- Appraiser split
- Internal production revenue

AMC Operations:

- Client fee
- Vendor fee
- AMC margin

Example:

- Client Fee: $2,000
- Vendor Fee: $1,600
- AMC Margin: $400

This affects AMC dashboards, order views, reporting, and future financial analytics.

## Vendor Model

Vendors may be:

- individual appraisers
- appraisal companies
- appraisal companies with multiple appraisers

Example:

```text
ABC Valuation
  |-- John Smith
  |-- Sarah Jones
  `-- Mike Davis
```

Vendor Company should be treated as the primary AMC assignment unit for MVP. Individual vendor appraisers can be layered in later.

## Shared Components

AMC work should maximize reuse of existing Falcon platform components:

- Orders
- Clients
- Calendar
- Notifications
- Activity Timeline
- Reporting
- User Management
- Permissions Engine

The goal is maximum reuse and no duplicate systems.

## AMC MVP Requirements

Must have:

- Order Intake:
  - Client
  - Property
  - Product
  - Due Date
- Order Assignment:
  - Assign vendor
  - Assign internal staff
- Vendor Directory:
  - Vendor company
  - Optional individual vendor appraiser contacts
  - Coverage area
  - Contact information
  - Status
- Client Directory
- Order Tracking:
  - New
  - Assigned
  - In Progress
  - Review
  - Delivered
  - Complete
- AMC Reporting:
  - Orders by client
  - Orders by vendor
  - Turn times
  - Revenue
  - Margin

## AMC MVP Non-Goals

The following are not required for AMC MVP:

- Vendor bidding
- Automated rotations
- Client portal
- Vendor portal
- Payment processing
- Invoicing system
- AI assignment engine
- Nationwide panel automation

## Future AMC Expansion

Future ideas:

- Vendor portals
- Client portals
- Vendor scoring
- Rotation logic
- Bidding
- Margin optimization
- Vendor capacity tracking
- AMC analytics
- Multi-company support

## Implementation Phases

Phase 1: Falcon V1.1 stabilization.

Phase 2: AMC MVP.

Phase 3: AMC operational expansion.

Phase 4: Multi-tenant AMC platform.

## AMC Doctrine Documents

Each AMC subsystem should be planned through doctrine before implementation. These documents define the operating model, customization posture, shared-platform expectations, and competitive differentiation goals for the AMC layer:

- [AMC Vendor Assignment Engine](../amc/AMC_VENDOR_ASSIGNMENT_ENGINE.md)
- [AMC Customization Framework](../amc/AMC_CUSTOMIZATION_FRAMEWORK.md)
- [AMC Vendor Performance Model](../amc/AMC_VENDOR_PERFORMANCE_MODEL.md)
- [AMC Vendor Directory](../amc/AMC_VENDOR_DIRECTORY.md)
- [AMC Financial Model](../amc/AMC_FINANCIAL_MODEL.md)
- [AMC Order Lifecycle](../amc/AMC_ORDER_LIFECYCLE.md)
- [AMC Operations Command](../amc/AMC_OPERATIONS_COMMAND.md)

All AMC implementation should preserve Falcon as one platform, reuse existing infrastructure wherever possible, avoid a second disconnected system, support company-by-company customization over time, and avoid hardcoding one AMC operating philosophy.

Falcon's AMC layer should outperform competitor portals through presentation, ease of use, workflow clarity, fewer clicks, better operational visibility, reduced manual communication, earlier operational insights, and easier assignment decisions.

## Implementation Guardrails

- Documentation only in this slice.
- No runtime code changes.
- No schema changes.
- No roles, permissions, memberships, or auth changes.
- No separate Falcon Internal or Falcon AMC platform.
- Do not begin AMC implementation until this strategy is reviewed and approved.
