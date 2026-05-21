# Falcon Vendor Profile, Availability, and Upgrade Doctrine

## Purpose

This document defines the canonical doctrine for Vendor Portal profile data, availability, onboarding readiness, future capacity signals, and upgrade paths before implementation.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, relationship lifecycle, assignment lifecycle, permission seeds, database migrations, billing logic, payments, compliance workflows, onboarding enforcement, company settings, or tenant/module/package runtime behavior.

Reference docs:

- `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`
- `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`
- `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`
- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`

## Core Doctrine

- Vendor profile supports assignment eligibility, communication, and panel readiness.
- Vendor profile is not a visibility grant.
- Profile completion does not expose orders, clients, packets, activity, notifications, documents, or internal AMC queues.
- Assignment packets remain the operational visibility grant.
- Vendor profile should feel useful to the vendor, not like AMC-only administrative data collection.
- Availability affects assignment eligibility only.
- Availability does not expose internal workload unless explicitly modeled later.
- Capacity, routing, compliance, payments, and scorecards remain deferred until their data contracts are stable.
- Upgrade prompts should be contextual, respectful, and never framed as missing tools.

## Vendor Profile Purpose

Vendor profile should help vendors:

- Keep assignment contact information accurate.
- Communicate service areas, specialties, and availability.
- Understand readiness blockers in plain operational language.
- Prepare for future assignment eligibility without exposing internal AMC rules.
- Maintain profile information that helps them receive appropriate packet offers.

Vendor profile should help AMC operators:

- Review assignment eligibility.
- Identify correct contacts.
- Understand panel readiness.
- Confirm future compliance, license, coverage, and service-area information.
- Make manual routing decisions with clear, auditable context.

Vendor profile should not:

- Grant packet or order visibility.
- Expose client/lender data.
- Expose internal order, review, SLA, queue, or escalation data.
- Expose private AMC notes to vendors.
- Act as a scorecard or ranking surface before productized.
- Become a hidden Staff Appraisal settings page.

## Vendor Profile Fields

The fields below are conceptual planning fields. They do not add schema, UI, routes, permission seeds, onboarding enforcement, or validation behavior.

### Company / vendor display name

Current/future/deferred status:

- Current concept, future productized profile field.

Who can edit:

- Vendor Owner or vendor admin later.
- AMC authorized user may edit internal display metadata later where needed.

Who can view:

- Vendor users in their own profile.
- AMC users with panel/vendor management authority.
- Other vendors and clients should not see it unless explicitly exposed in a future product surface.

Assignment relevance:

- Helps AMC identify the vendor company during manual routing and packet communication.

Privacy/visibility notes:

- Display name is not packet visibility.
- It should not reveal relationship topology, other clients, or internal AMC notes.

### Primary contacts

Current/future/deferred status:

- Future productized profile field.

Who can edit:

- Vendor Owner/admin later.
- Authorized AMC vendor manager may maintain owner-side contact metadata later.

Who can view:

- Vendor organization users with profile authority.
- AMC users with vendor management or assignment authority.

Assignment relevance:

- Determines offer, packet, reminder, correction, and operational communication routing.

Privacy/visibility notes:

- Contact visibility should be panel/assignment scoped.
- Contacts should not be exposed to clients by default.

### Service areas

Current/future/deferred status:

- Future productized profile field.

Who can edit:

- Vendor Owner/admin later.
- AMC authorized user may verify or restrict service areas later.

Who can view:

- Vendor users in their own profile.
- AMC users evaluating assignment eligibility.

Assignment relevance:

- Future eligibility and manual routing input.
- Future service-area routing input.

Privacy/visibility notes:

- Service area fit should not expose specific client/order demand outside packet offers.
- Service area availability is not packet visibility.

### License / certification info later

Current/future/deferred status:

- Deferred compliance/readiness data.

Who can edit:

- Vendor Owner/admin later.
- AMC compliance/vendor manager may verify, reject, or annotate later.

Who can view:

- Vendor users can view their submitted/verified profile data.
- AMC authorized users can view verification state and compliance details.

Assignment relevance:

- Future eligibility input for product type, state, coverage, or client requirement matching.

Privacy/visibility notes:

- Verification notes may require public/private separation.
- Missing license data should use readiness language, not punitive language.

### Specialties / property types later

Current/future/deferred status:

- Deferred routing/readiness data.

Who can edit:

- Vendor Owner/admin later.
- AMC authorized user may verify or tag later.

Who can view:

- Vendor users in profile.
- AMC users during panel review and assignment selection.

Assignment relevance:

- Future manual routing and suggested-vendor input.

Privacy/visibility notes:

- Specialty fit should not expose client restrictions or hidden order pipeline.

### Fee preferences later

Current/future/deferred status:

- Deferred until billing, payout, and assignment pricing doctrine are stable.

Who can edit:

- Vendor Owner/admin later.
- AMC authorized user may manage negotiated terms later.

Who can view:

- Vendor users where vendor-facing fee preference views are productized.
- AMC users with vendor management/billing authority.

Assignment relevance:

- Future routing, offer preparation, payout, or billing context.

Privacy/visibility notes:

- Fee preferences should not expose client fees, AMC margins, splits, or billing strategy by default.
- Fee data must not leak through packets unless intentionally included.

### Communication preferences

Current/future/deferred status:

- Future productized profile/preference field.

Who can edit:

- Vendor users for personal preferences.
- Vendor Owner/admin for organization-level contacts/preferences later.

Who can view:

- Vendor users for their own preferences.
- AMC systems/users may use delivery preferences without exposing hidden notification policy internals.

Assignment relevance:

- Helps route offer, correction, due-risk, and packet update notifications.

Privacy/visibility notes:

- Preferences tune delivery; they do not create visibility.
- Required operational notifications may remain mandatory.

### Document / compliance uploads later

Current/future/deferred status:

- Deferred compliance system.

Who can edit:

- Vendor Owner/admin uploads later.
- AMC compliance/vendor manager reviews later.

Who can view:

- Vendor users can see their submitted documents and safe review state.
- AMC authorized users can view compliance materials.

Assignment relevance:

- Future readiness and eligibility input.

Privacy/visibility notes:

- Compliance documents are not packet documents by default.
- Compliance review notes may require public/private separation.

### Insurance / W-9 / payment info later

Current/future/deferred status:

- Deferred billing/payment/compliance system.

Who can edit:

- Vendor Owner/admin later through secure payment/compliance surfaces.
- AMC finance/compliance users later where authorized.

Who can view:

- Vendor users with organization authority.
- AMC finance/compliance users only where productized.

Assignment relevance:

- Future payout readiness, compliance, and vendor account status.

Privacy/visibility notes:

- Payment/tax data must not appear in packet surfaces, client surfaces, dashboards, or general panel views by default.
- Do not build payments/compliance in this doctrine phase.

### Public / private notes separation

Current/future/deferred status:

- Future profile/relationship-note design.

Who can edit:

- Vendor users may edit vendor-visible profile notes later.
- AMC users may edit private relationship notes later.

Who can view:

- Vendor-visible notes are visible to vendor users and authorized AMC users.
- Private AMC notes are visible only to authorized AMC users.

Assignment relevance:

- Vendor-visible notes can support packet communication and readiness context.
- Private AMC notes can support internal vendor management later.

Privacy/visibility notes:

- Private AMC notes must never leak to vendor profile, packet, notification, or activity surfaces.
- Public/private note boundaries must be explicit in UI and data contracts before implementation.

## Availability Doctrine

Availability is an eligibility signal. It should help decide whether a vendor may be offered work. It should not expose internal workload, order history, or unrelated packets.

### Current availability status

Purpose:

- Indicates whether the vendor is generally open to assignment offers.

Rules:

- Availability may affect assignment eligibility later.
- Availability does not grant packet visibility.
- Availability does not expose hidden AMC demand or owner-order pipeline.

### Temporary pause

Purpose:

- Lets a vendor or AMC temporarily hold new offers.

Rules:

- Paused availability should stop or warn on new offers when implemented.
- Existing packet visibility remains governed by assignment lifecycle.
- Pause language should be neutral: "Paused" or "Not accepting new offers", not punitive.

### Capacity notes

Purpose:

- Lets vendors provide plain-language capacity context.

Rules:

- Capacity notes are advisory until a formal model exists.
- Capacity notes should not expose internal workload unless explicitly modeled later.
- AMC users should treat capacity notes as manual-routing context, not automatic blocking logic.

### Blackout dates later

Purpose:

- Future date ranges where the vendor is unavailable.

Rules:

- Blackout dates can affect offer eligibility later.
- Blackout dates do not expose vendor calendar details beyond what the vendor intentionally shares.
- Existing packet deadlines still require packet-specific handling.

### Workload / capacity later

Purpose:

- Future structured capacity signal for assignment planning.

Rules:

- No auto-routing until capacity semantics are proven.
- Workload should not reveal the vendor's internal Staff Appraisal orders unless explicitly shared by the vendor through a future integration.
- Capacity models should be explainable and overrideable.

### Service area availability later

Purpose:

- Future location/product-specific eligibility signal.

Rules:

- Service area availability can guide assignment offers.
- It should not reveal hidden client/order demand.
- Service area data should be visible to AMC users only for routing and readiness purposes.

### Manual override by AMC later

Purpose:

- Future controlled exception path when AMC intentionally offers work despite availability limitations.

Rules:

- Override should require reason capture and audit.
- Override should be visible to AMC operators as an exception.
- Override does not widen vendor visibility beyond the resulting packet.

## Vendor Onboarding Readiness

Readiness is an eligibility and setup concept. It is not packet visibility.

### `invited`

Meaning:

- Vendor has been invited but has not completed joining/setup.

Visibility:

- No packet visibility from readiness alone.

Assignment effect:

- Not eligible for normal assignment offers by default.

### `profile_started`

Meaning:

- Vendor has begun profile setup but required fields remain incomplete.

Visibility:

- No packet visibility from readiness alone.

Assignment effect:

- May block or warn on offers depending on future policy.

### `profile_complete`

Meaning:

- Basic vendor profile information is complete.

Visibility:

- No packet visibility from readiness alone.

Assignment effect:

- May satisfy basic readiness for manual routing, subject to relationship state and other eligibility inputs.

### `compliance_pending`

Meaning:

- Required compliance, license, document, insurance, or payment readiness is incomplete or awaiting review.

Visibility:

- No packet visibility from readiness alone.

Assignment effect:

- Should block or warn on offers when compliance is required.

### `ready_for_assignments`

Meaning:

- Vendor is generally ready for assignment offers.

Visibility:

- No packet visibility from readiness alone.

Assignment effect:

- Vendor may be considered for offers, subject to assignment eligibility and manual routing.

### `limited_readiness`

Meaning:

- Vendor is ready only for certain regions, products, volumes, or conditions.

Visibility:

- No packet visibility from readiness alone.

Assignment effect:

- Offers should match the limitation or require a future manual override.

### `paused_or_suspended`

Meaning:

- Vendor is temporarily paused or blocked from normal new offers.

Visibility:

- Existing packet visibility remains governed by packet lifecycle only.

Assignment effect:

- New offers should be blocked or require explicit future override depending on reason and policy.

Language rule:

- Use neutral readiness language. Avoid punitive or shaming labels in vendor-facing UI.

## Vendor Upgrade Doctrine

Vendor Portal to Staff Appraisal Mode is the natural upgrade path when a vendor wants to run its own appraisal operations in Falcon.

Upgrade should be shown when the vendor expresses intent for:

- Internal order management.
- Client management.
- Team management.
- Internal calendar/workload planning.
- Reporting and analytics for owned work.
- AI/report assistance later when productized.

Upgrade copy should be:

- Contextual.
- Respectful.
- Outcome-based.
- Sparse.
- Directed at users who can act on it.

Good upgrade framing:

- "Run your own appraisal operations with Staff Appraisal Mode."
- "Add internal order management when you are ready to manage your own clients and team."
- "Use reporting tools for your own company work."

Avoid:

- "Unlock missing tools."
- "You do not have access to Orders."
- "Upgrade to see hidden modules."
- "Your account is limited."

Upgrade prompts should not appear:

- During urgent packet response.
- During overdue packet work.
- During correction/resubmission flows.
- In notification copy for packet deadlines.
- As persistent disabled navigation.

Future upgrades:

- Staff Appraisal Mode.
- AI/report assistance.
- Reporting/analytics.
- Vendor organization administration.
- Future billing/payout views if productized.

## AMC-Side Vendor Profile Usage

AMC users may use vendor profile/readiness data for:

- Assignment eligibility review.
- Contact management.
- Panel readiness.
- Manual routing context.
- Future vendor scoring.
- Future compliance review.
- Future service-area routing.
- Future payout/billing.

AMC-side usage rules:

- Profile data should explain why a vendor is eligible, limited, paused, or blocked.
- Private notes stay internal to AMC users.
- Scorecards remain hidden until a transparent product surface exists.
- Profile signals should not become hidden auto-routing before manual routing is proven.
- Profile/readiness data should not expose client/internal order data to vendors.

## Guardrails

- Do not expose private AMC notes to vendors.
- Do not expose vendor scorecards to vendors until productized.
- Do not treat profile completion as order, client, packet, activity, notification, calendar, queue, workflow, or team access.
- Do not auto-route from an incomplete availability model.
- Do not leak client/internal order data in vendor profile.
- Do not use punitive language in availability/readiness states.
- Do not build payments/compliance yet.
- Do not expose payment/tax data in packet, dashboard, client, or general panel surfaces.
- Do not treat communication preferences as visibility preferences.
- Do not let readiness state override assignment packet lifecycle.

## Future Contributor Checklist

Before implementing vendor profile, availability, or upgrade surfaces, verify:

- The profile field supports eligibility, communication, readiness, or vendor self-service.
- The field has clear edit/view authority.
- The field does not grant packet or order visibility.
- Public/private notes are explicitly separated.
- Availability affects eligibility only.
- Readiness language is neutral and useful.
- Upgrade prompts appear only in relevant, non-urgent contexts.
- Staff Appraisal upgrade copy describes outcomes, not missing modules.
- Payments, compliance, scorecards, and auto-routing remain deferred unless separately productized.
