# AMC Order Lifecycle

## Purpose

The AMC Order Lifecycle defines how AMC Operations Mode should represent order progress while reusing Falcon's shared order engine.

## Shared Order Engine

AMC orders should use Falcon's shared order infrastructure wherever possible.

The goal is one order engine with different operational lenses, not a disconnected AMC order system.

## Internal Lifecycle vs AMC Lifecycle

Internal Operations focuses on:

- appraiser assignment
- reviewer assignment
- internal production
- split/revenue tracking
- review handoff

AMC Operations focuses on:

- client intake
- vendor assignment
- vendor progress
- review/delivery
- client service
- margin and vendor performance

## MVP AMC Statuses

MVP AMC statuses:

- new
- assigned
- in_progress
- review
- delivered
- complete

Status labels may be hardcoded for MVP, but they should be treated as defaults rather than permanent rules.

## Hold/Escalation Concepts

AMC workflow should leave room for:

- hold reasons
- client delays
- vendor delays
- escalation flags
- late-work tracking
- stalled assignment tracking

Hold and escalation behavior should be documented before implementation because they affect reporting, notifications, and lifecycle state.

## Assignment State

Assignment state may differ from lifecycle status.

Future assignment states may include:

- unassigned
- outreach sent
- accepted
- declined
- assigned
- reassigned

## Delivery State

Delivery state may include:

- report received
- in review
- revision requested
- delivered to client
- completed

Delivery behavior should reuse activity, notifications, files, and reporting where possible.

## Customization Opportunities

Future lifecycle customization may include:

- status labels
- required transitions
- escalation thresholds
- client-specific delivery steps
- vendor-specific follow-up rules
- notification policies

## Future Expansion

- configurable lifecycle models
- client-specific workflow templates
- vendor-facing progress updates
- delivery quality checks
- SLA tracking
- escalation automation
