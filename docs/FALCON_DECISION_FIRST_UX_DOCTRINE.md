# Falcon Decision-First UX Doctrine

## Purpose

This document establishes Falcon's product-wide decision-first UX doctrine.

Falcon is an operational platform. Its default surfaces should help users make the right decision
and take the next action with confidence. They should not require users to read dense operational,
vendor, assignment, or audit data before the work path is clear.

This is doctrine documentation only. It does not implement runtime code, CSS changes, component
changes, route changes, permission changes, workflow changes, backend changes, Supabase changes,
email behavior, notification behavior, automation, AI behavior, or production data changes.

## Core Doctrine

Users are paid to make decisions, not read data.

Every primary Falcon surface should answer, in order:

1. What is happening?
2. What action should I take?
3. Why is that action recommended?

If a surface cannot answer those questions quickly, it should be simplified before more reference
data is added.

## Information Hierarchy

### Level 1: Decision Information

Level 1 is the default visible layer. It tells the user what matters and what to do next.

Examples:

- status;
- score;
- recommendation;
- owner;
- due date;
- next action.

### Level 2: Supporting Information

Level 2 helps the user understand the decision without turning the surface into a report.

Examples:

- summary metrics;
- counts;
- short explanations.

### Level 3: Reference Information

Level 3 is valid and often necessary, but it should not dominate the default view.

Examples:

- coverage;
- contacts;
- performance history;
- compliance details;
- notes;
- audit trails.

## Default UI Rule

Default Falcon surfaces should:

- show Level 1;
- minimize Level 2;
- hide Level 3 behind drawers, accordions, details panels, or contextual actions.

This rule does not remove access to detail. It changes where detail lives so daily decisions remain
fast, clear, and action-oriented.

## Example Applications

### Vendor Cards

Current direction to avoid:

- large explanation sections;
- dense coverage, compliance, contact, and history blocks in the default card body;
- visible detail competing with score and next action.

Future direction:

- show score, recommendation, and action first;
- expose the reason through a `Why?` drawer or details action;
- keep coverage, contacts, performance history, and compliance detail behind secondary disclosure.

### Assignment Packets

Assignment packet surfaces should lead with:

- status;
- due date;
- owner/vendor;
- next action.

Supporting terms, handoff detail, selected-bid context, notes, files, and activity should stay
available behind expansion or secondary panels unless they are directly needed for the next action.

### Dashboards

Dashboards should lead with operational actions:

- what needs attention now;
- what is blocked;
- what is due or overdue;
- what queue or lane should be opened next.

Analytics, trend detail, and broad reporting should be secondary to operational action.

### Vendor Workbench

Vendor Workbench should lead with work queues:

- available work;
- bids needing response;
- assigned orders needing action;
- documents or tasks blocking progress.

Profile, compliance, coverage, contacts, and performance history should remain accessible but should
not dominate the default workbench.

### Client Portal

Client Portal should lead with order progress:

- current status;
- expected next step;
- due or delivery context;
- required client action.

Supporting order detail, document history, billing context, messages, and audit detail should be
secondary.

## Future Implementation Buckets

Decision-first doctrine should guide future runtime passes through explicit, narrow buckets:

- Vendor Card Compaction;
- Assignment Packet Compaction;
- Dashboard Information Density Review;
- Mobile Decision-First Review.

Each bucket should preserve permissions, route authority, workflow authority, and existing data
contracts unless a separate implementation plan authorizes a broader change.
