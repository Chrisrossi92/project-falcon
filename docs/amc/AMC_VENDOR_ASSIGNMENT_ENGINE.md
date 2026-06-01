# AMC Vendor Assignment Engine

## Purpose

The AMC Vendor Assignment Engine defines how Falcon should help an AMC decide which vendor company or vendor appraiser should receive assignment outreach.

This is not just a vendor list. It is the decision-assistance engine for selecting who should receive an assignment while reusing Falcon's shared orders, users, calendar, notifications, activity, permissions, and reporting infrastructure.

## Assignment Philosophy

Falcon AMC should not hardcode one assignment philosophy. Different AMC companies may prefer manual dispatch, ranked recommendations, top-N outreach, round robin, first-to-accept assignment, or a hybrid model.

MVP may use simple defaults, but those defaults should be documented as defaults rather than permanent rules.

## Minimum MVP Assignment Workflow

- User opens an AMC order requiring assignment.
- Falcon shows eligible vendor companies based on coverage and status.
- User can select a vendor company directly.
- User can assign internal staff when needed.
- Assignment action writes order activity and supports notifications.
- Vendor Company is the primary MVP assignment unit; individual vendor appraisers can be layered in later.

## Vendor Matching Inputs

Vendor matching may eventually use:

- coverage area
- vendor status
- product eligibility
- performance score
- capacity
- relationship history
- recent assignment count
- client preference
- company preference
- fee expectations
- turnaround expectations

## Coverage Logic

Coverage should be a primary gate before ranking.

Coverage inputs may include:

- county
- state
- market
- zip
- radius

If a vendor does not cover the order geography, they should not appear as an eligible default recommendation unless a user intentionally expands the search.

## Recommendation Engine

Future ranking may include:

- coverage fit
- performance
- capacity
- relationship history
- recency
- company preference
- client preference
- responsiveness
- fee/margin fit

The user should be able to select all eligible vendors, deselect lower-ranked vendors, or send assignment outreach to the top N vendors.

## Vendor Outreach Engine

Vendor outreach should reduce manual communication and clicks while preserving human control.

Future outreach should support:

- vendor-specific assignment emails
- order/property details
- due date and product details
- accept/decline links or tracked response actions
- follow-up reminders
- activity logging

## Email Template Personalization

Outreach should support custom-looking templated emails with property/order details and vendor-specific personalization.

Example:

> You've completed 3 assignments for us in the last 30 days. Thank you for your continued partnership.

Personalization should make outreach feel intentional without requiring staff to rewrite the same message for every assignment.

## Vendor Response Tracking

Future response states:

- sent
- viewed
- responded
- accepted
- declined
- assigned

Response tracking should feed assignment decisions, operational visibility, vendor performance, and reporting.

## Assignment Models

Falcon AMC should leave room for multiple assignment models:

- manual assignment
- ranked recommendation
- top-N outreach
- round robin
- first-to-accept

Do not hardcode one assignment philosophy.

## Customization Opportunities

Company-level customization may eventually include:

- preferred assignment model
- top-N default count
- coverage rules
- vendor ranking weights
- client-specific vendor preferences
- vendor outreach templates
- response deadlines
- escalation timing

## Competitor Weaknesses

Falcon should outperform competing AMC platforms by reducing clicks, reducing manual communication, surfacing operational insights sooner, and making assignment decisions easier.

The assignment engine should make it clear why a vendor is recommended, what risk exists, and what action should happen next.

## Future Expansion

- vendor scoring
- real-time capacity signals
- automatic reminders
- client-specific vendor exclusions
- assignment experiments
- margin-aware ranking
- vendor portal response capture
- first-to-accept workflows

## Implementation Phases

Phase 1: document assignment doctrine and preserve V1.1 stability.

Phase 2: implement simple vendor-company assignment for AMC MVP.

Phase 3: add recommendation and outreach workflows.

Phase 4: add configurable assignment models and analytics.
