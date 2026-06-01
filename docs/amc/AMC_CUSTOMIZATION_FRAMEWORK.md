# AMC Customization Framework

## Purpose

The AMC Customization Framework defines how Falcon should preserve flexibility for different AMC operating models while reusing the existing Falcon platform.

## Core Principle

Falcon should prefer configurable behavior over hardcoded behavior.

Different AMC companies may handle assignment, status, notifications, turn-time expectations, vendor scoring, margin tracking, and escalation differently. Even where customization is not built yet, architecture should leave room for it.

MVP can hardcode defaults, but defaults should be documented as defaults, not permanent rules.

## What Should Be Configurable

Future configurable areas may include:

- assignment model
- coverage matching rules
- vendor ranking weights
- vendor outreach templates
- notification policies
- status labels
- turn-time expectations
- escalation thresholds
- vendor performance scoring
- margin visibility
- report views
- client-specific workflow requirements

## Company Policy Variance

AMC companies may differ in:

- whether they assign manually or use rotation
- how they define active vendor capacity
- when they escalate late work
- whether they expose margin broadly
- how they treat preferred vendor lists
- how aggressively they automate outreach
- how they classify delivered, reviewed, and completed work

Falcon should avoid locking every company into Continental's first AMC workflow.

## Configuration Levels

Future configuration may exist at multiple levels:

- platform defaults
- company defaults
- client-specific rules
- vendor-specific rules
- user preferences
- feature/mode flags

## Feature Flags / Mode Flags

AMC functionality should be gated through explicit mode or feature flags where appropriate.

Flags should help Falcon introduce AMC capability without destabilizing Internal Operations Mode or exposing unfinished surfaces.

## Future Admin Settings

Future admin settings may include:

- assignment strategy
- vendor eligibility rules
- default response deadlines
- client-specific vendor policies
- financial visibility controls
- escalation settings
- notification defaults
- dashboard preferences

## Guardrails

- Reuse Falcon infrastructure wherever possible.
- Avoid building a second disconnected platform.
- Do not hardcode one AMC operating philosophy.
- Keep defaults simple and documented.
- Protect V1.1 stabilization from broad AMC implementation.
- Make customization intentional rather than ad hoc.

## Implementation Phases

Phase 1: document customization doctrine.

Phase 2: use documented hardcoded defaults for AMC MVP.

Phase 3: introduce admin-managed settings for high-value policies.

Phase 4: support deeper company/client/vendor-specific configuration.
