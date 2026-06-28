# Falcon Experience Framework

## Purpose

This document defines Falcon's shared product experience framework across Internal Operations,
Falcon AMC, Client Portal, and Vendor Workspace.

Falcon is an operations platform for valuation firms. It should feel like one cohesive operating
system, not disconnected apps. Users should never feel like:

> I am on another product.

They should feel like:

> I am in Falcon, viewing a different workspace.

This is product architecture guidance only. It does not change runtime behavior, application code,
routes, workflows, database schema, RPCs, permissions, data fetching, UI components, emails,
notifications, or deployments.

## Companion Documents

- `docs/architecture/FALCON_PRODUCT_PRINCIPLES.md` defines Falcon's permanent product philosophy.
- `docs/architecture/FALCON_INFORMATION_ARCHITECTURE_AND_UX_GUIDE.md` defines page hierarchy,
  visibility, and layout philosophy.
- `docs/architecture/FALCON_DESIGN_SYSTEM.md` defines Falcon's visual language and reusable design
  categories.
- `docs/architecture/FALCON_MOTION_AND_INTERACTION_GUIDE.md` defines motion, transition,
  microinteraction, and animation philosophy.
- `docs/architecture/FALCON_PAGE_INVENTORY.md` maintains the canonical inventory of primary pages.
- `docs/architecture/FALCON_EXPERIENCE_FRAMEWORK_AUDIT.md` records current implementation
  readiness against this framework for loading, state, motion, and shell consistency.
- `docs/architecture/FALCON_PORTAL_SHELL_UNIFICATION_AUDIT.md` records Client Portal and Vendor
  Workspace shell readiness against Falcon's premium operating-system language.

This framework sits above individual page polish. Future experience work should use it to keep
Dashboard, Orders, Order Detail, Calendar, AMC, Client Portal, and Vendor Workspace aligned as one
Falcon system.

## Core Experience Philosophy

Falcon should be calm, fast, precise, and operationally serious.

Every workspace may expose different data, permissions, workflows, and actions, but the experience
language should remain shared:

- shared shell structure;
- shared loading and state behavior;
- shared motion qualities;
- shared page hierarchy;
- shared action hierarchy;
- shared workspace orientation;
- shared safety posture around sensitive information.

Workspace differences should come from role, permission, product context, and workflow ownership.
They should not come from unrelated visual systems, unrelated loading language, unrelated empty
states, or disconnected navigation patterns.

## Shared Motion Principles

Motion in Falcon should:

- clarify what changed;
- orient the user after navigation or state changes;
- reduce harsh transitions;
- support perceived performance;
- preserve focus on operational work.

Motion should not:

- decorate passive content;
- bounce;
- distract;
- delay work;
- feel playful in serious workflows;
- soften destructive or governed actions.

Preferred motion qualities:

- subtle;
- fast;
- consistent;
- calm;
- reusable.

Future motion implementation should continue to use shared tokens and primitives from the motion
guide. New workspace-specific motion patterns should be promoted to shared patterns only when they
solve a repeated Falcon problem.

## Shared Loading System

Falcon should use staged loading behavior. Loading UI should reduce uncertainty without making fast
work feel slower.

### Fast Loads

If content resolves very quickly, avoid unnecessary loading UI. Do not flash skeletons, spinners, or
progress indicators for loads that complete before the user can meaningfully perceive waiting.

Fast loads should feel immediate.

### Normal Loads

Use skeletons over spinners when the future content shape is known.

Skeletons should preserve layout, avoid page jump, and match the density of the content they
represent. They should not overstate information that may not exist.

### Longer Loads

Use a subtle top or content progress indicator only when it helps reduce uncertainty. Progress
should communicate that Falcon is still working without blocking the page or drawing unnecessary
attention.

Longer-load indicators are appropriate for larger route transitions, heavier filtered queries,
document-heavy surfaces, or workspace-wide refreshes.

### Slow Loads

When waiting becomes noticeable, use contextual copy. Avoid generic `Loading...` whenever possible.

Preferred examples:

- Loading active schedule
- Loading appraisal orders
- Loading assignment details
- Loading vendor workspace
- Loading client deliverables

The copy should describe the specific operational object or workspace being loaded. It should not
expose unsafe internals, raw ids, storage paths, bucket names, or implementation details.

## Shared Skeleton Behavior

Skeletons should preserve the shape and priority of the incoming content.

Use skeletons for:

- page headers when the primary object is still resolving;
- summary metrics and dashboard counts;
- table rows and work queues;
- order detail sections;
- document lists;
- assignment, request, and portal cards.

Do not use skeletons for:

- unknown or variable content where the shape would mislead the user;
- failures that need an error state;
- empty datasets that need an empty state;
- long-running actions that need contextual progress or disabled/action feedback.

Skeletons should be calm and restrained. They should not shimmer aggressively, shift layout, or
create the impression that more information exists than the user will receive.

## Shared Empty, Error, And Success States

State feedback should answer two questions:

- What is happening?
- What can the user do next?

### Empty States

Empty states should be task-oriented and safe for the viewer.

Prefer:

- Request an appraisal
- Upload engagement package
- No assignments due today
- No matching orders

Avoid:

- No data
- Nothing here
- Empty

Empty states should not expose internal operational context to clients or vendors.

### Error States

Error states should be calm, specific, and recoverable when possible.

They should explain the failed user-facing operation without exposing implementation details,
database names, RPC names, storage paths, raw ids, stack traces, or secrets.

Prefer:

- We could not load this order. Try again.
- We could not refresh assignment details.
- You do not have access to this document.

### Success States

Success states should confirm important work without interrupting flow.

Use subtle confirmations for saves, submissions, uploads, review actions, assignment actions, and
portal requests. Avoid large celebratory treatment in serious workflows.

Success language should be precise:

- Report submitted
- Assignment accepted
- Request sent
- Preferences saved

## Shared Page Transition Expectations

Page transitions should make Falcon feel continuous across workspaces.

Expected behavior:

- route changes should avoid harsh blank screens;
- shell-level navigation should remain stable when possible;
- page content should enter subtly and quickly;
- object-to-detail movement should preserve orientation where feasible;
- reduced-motion preferences must be respected;
- transitions must never delay access to actionable content.

Dashboard, Orders, Order Detail, Calendar, AMC, Client Portal, and Vendor Workspace should feel
like views within the same operating system. Navigation may change context, but it should not feel
like launching a separate product.

## Shared Shell Expectations

Falcon's shell should provide stable orientation across the platform.

Shared shell expectations:

- persistent Falcon identity;
- clear workspace context;
- role-appropriate navigation;
- consistent action placement;
- consistent notification and account access;
- consistent page header rhythm;
- stable spacing and responsive behavior;
- safe suppression of inaccessible features.

The shell should make workspace context clear without repeating product context in every page
title. For example, an order page should focus on the order, while the shell can establish whether
the user is in Internal Operations, Falcon AMC, Client Portal, or Vendor Workspace.

Shell unification must preserve existing permissions, workflow boundaries, product separation, and
data visibility rules.

## Portal Unification Principles

Client Portal and Vendor Workspace should use Falcon's premium shell language. They should feel
like Falcon with different permissions, not separate products.

Portal unification does not mean identical workflows. It means shared experience standards with
role-appropriate information and actions.

### Client Portal

Client Portal should emphasize:

- order requests;
- report access;
- status visibility;
- communication clarity.

Client-facing language should be safe, concise, and status-oriented. Clients should understand what
Falcon knows, what Falcon needs from them, and where deliverables are available.

Client Portal must not expose internal notes, internal workflow diagnostics, vendor-only details,
unsafe document metadata, storage paths, bucket names, raw ids, or unrelated account data.

### Vendor Workspace

Vendor Workspace should emphasize:

- assigned work;
- due dates;
- files;
- revision requests;
- submission flow.

Vendor-facing language should make the next required action obvious. Vendors should be able to see
what work is assigned, what is due, what files are available, what revisions are required, and how
to submit or resubmit work.

Vendor Workspace must preserve vendor isolation, assignment access rules, document access rules,
and safe payload boundaries.

## Future Global Search And Command Center Principles

Future global search should not be decorative or superficial. It should become a useful command
center for operational work.

Potential future search and jump targets:

- orders;
- clients;
- contacts;
- properties;
- vendors;
- appraisers;
- activity;
- statuses.

The command center should help users move quickly to known work, discover relevant operational
objects, and execute safe common commands when product-approved.

Future principles:

- results must be permission-scoped;
- results must preserve workspace context;
- labels should be operationally meaningful;
- unsafe metadata must stay hidden;
- commands must respect RPC-first and backend-owned mutation doctrine;
- destructive or governed actions must not become casual shortcuts;
- search should prioritize useful work over decorative autocomplete.

This document does not approve or implement global search. It defines the experience standard for a
future design and implementation slice.

## Adoption Rules

Future Falcon experience work should:

- start from shared framework standards before page-specific polish;
- use existing shared motion, interaction, and state primitives where possible;
- promote repeated local patterns into shared primitives intentionally;
- keep workspace-specific differences tied to permissions, workflow, and product context;
- update this document when platform-level experience standards change;
- update companion docs when visual language, motion behavior, page hierarchy, or page inventory
  changes.

Future implementation slices must preserve existing runtime governance. This framework does not
authorize route changes, permission changes, schema changes, RPC changes, workflow changes, data
fetching changes, or UI implementation changes by implication.
