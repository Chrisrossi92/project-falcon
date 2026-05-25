# Falcon v1 Operational Spine Composition Plan

## Purpose

This document defines Falcon's operational shell information architecture before runtime
implementation of a left operational rail and utility top bar.

Falcon is transitioning from a top-nav-centered application into a role-aware operational
environment. The next shell step is establishing a persistent operational spine that reduces
cognitive load, removes redundant navigation, and strengthens Falcon's identity as an Executive
Operational Command Console.

This plan exists to:

- reduce shell redundancy;
- improve operational orientation;
- establish stronger environmental identity;
- lower cognitive load;
- strengthen role/work hierarchy.

This phase is planning only. It does not implement runtime code, route removals, permission
changes, workflow changes, data changes, backend changes, schema changes, Supabase changes,
dashboard data changes, AMC work, Client Portal work, automation, AI work, or production data
changes.

## Shell Information Architecture Philosophy

Falcon's shell should reinforce operational workflow, not route inventory.

Shell zones:

- **LEFT = operational movement**;
- **TOP = utility/context**;
- **CENTER = active work**.

The left rail should become the primary operational navigation authority. It should answer "where
do I move to do work?" without presenting every available route as equal.

The top bar should become a utility and context layer. It should answer "what is my current
context, and what global utilities do I need?" without duplicating primary navigation.

The center workspace remains the active work station. It should inherit the shell's role/work
identity and make the current job obvious.

## Operational Spine Philosophy

The operational spine is the persistent environmental anchor for Falcon.

It should provide:

- persistent operational rail;
- environmental anchor;
- role-aware operational identity;
- workstation orientation;
- calm but authoritative structure.

The spine should make Falcon feel grounded before any page content is read. It should not become a
decorative sidebar, a collapsed icon puzzle, or a broad admin route dump. It should be the
structural path through daily internal appraisal work.

## Primary Operational Navigation Proposal

Likely primary operational lanes:

- Dashboard / Operations;
- Orders;
- My Work;
- Review Queue;
- Calendar.

### Operational-First Hierarchy

Operational lanes should lead because Falcon v1 succeeds when internal staff can run daily
appraisal work with less ambiguity.

Primary lanes should be ordered by role/work mode:

- Owner/Admin: Operations, Orders, Calendar, Review Queue where relevant, My Work where relevant;
- Appraiser: My Work, Orders, Calendar, Dashboard / Operations where relevant;
- Reviewer: Review Queue, Orders, Calendar, Dashboard / Operations where relevant;
- Hybrid users: current work mode first, owner/admin exception visibility nearby but not dominant.

### Role-Aware Prioritization

The rail should use existing visible, permission-filtered navigation as input. Role-aware
prioritization is presentation, not authorization.

Rules:

- permissions and route guards remain authority;
- the rail may prioritize visible links differently by shell/work profile;
- hidden or unavailable links must not appear as disabled clutter;
- future Vendor/Client/AMC concepts must not appear in the v1 internal staff rail.

### Active Lane Treatment

The active lane should be unmistakable without noisy badges.

Expected treatment:

- strong contrast against the darker operational rail;
- clear selected state for the current route/workspace;
- subtle relationship to the workspace header;
- no animated or decorative active effects.

### Operational Grouping Logic

The rail should group by daily work value, not database objects.

Recommended grouping:

- primary daily lanes;
- role-specific work lanes;
- time/schedule lane;
- management/support group below or separated;
- admin/support utilities lowest or behind utility access.

## Management / Support Grouping Proposal

Likely management/support destinations:

- Clients;
- Assignments;
- Team;
- Reports;
- Settings;
- admin/support utilities.

Management/support should remain accessible without competing with operations.

Guidance:

- visually secondary to primary operational lanes;
- grouped below the primary spine area or behind a clearly labeled support section;
- quieter text and icon treatment than primary lanes;
- avoid equal visual weight with Operations, Orders, My Work, Review Queue, and Calendar;
- use overflow or de-emphasis strategies when a broad-access user has many visible links.

Possible de-emphasis strategies:

- secondary group label;
- lower-contrast rail items;
- compact utility section;
- optional more/menu pattern for non-daily support links;
- settings/profile-owned utilities in top bar or account menu where appropriate.

Reports should remain planned/future unless a real v1 route and data contract exists. Do not create
placeholder route exposure.

## Top Utility Bar Philosophy

The top bar should be a utility/context layer only. It should not duplicate primary nav after the
operational rail exists.

Likely top bar contents:

- compact search / command access;
- notifications;
- current company;
- profile/avatar;
- optional work-mode context.

The top bar should be compact and quiet. It should support action from anywhere without becoming a
second navigation system.

Items that should leave the top bar once the operational rail exists:

- primary route groups;
- duplicate operational lanes;
- management/support route inventory;
- broad desktop nav sections;
- any route list already represented in the left rail.

The brand/work-mode cue may stay in the shell, but it should not create a second nav hierarchy.

## Search Philosophy

Search is a utility, not the dominant shell element.

Guidance:

- preserve fast command access;
- use compact search or command-style affordance;
- avoid oversized persistent search bars;
- keep keyboard access visible but restrained;
- do not let search visually outrank the operational spine.

Search should remain useful for experienced users while the rail remains the primary orientation
tool for day-to-day movement.

## Responsive Philosophy

### Desktop

Desktop should support:

- persistent operational spine;
- grouped operational hierarchy;
- contextual shell identity;
- compact top utility bar;
- active workspace framing.

The desktop spine should reduce route scanning. Users should not need to parse a horizontal route
inventory to understand where work lives.

### Mobile

Mobile should be task-first, not a compressed desktop shell.

Mobile should support:

- reduced route exposure;
- compact operational rail behavior;
- role-prioritized operational access;
- continuity with desktop labels and work-mode identity;
- quick access to command/search, notifications, and profile.

Mobile should not attempt to show a dense persistent desktop rail. It may use a drawer, bottom
entry, or compact task menu, but it should preserve the same primary/secondary hierarchy.

## Collapsed Rail Philosophy

Collapse is appropriate only if it preserves operational orientation.

Possible collapse rules:

- allow collapse for space-constrained desktop or user preference after the full rail is proven;
- keep active lane visible;
- preserve section structure;
- use icons only when the label is available through tooltip or expanded-on-hover/focus behavior;
- keep keyboard and screen-reader labels explicit.

Avoid mystery meat navigation:

- do not rely on icons alone for critical work lanes;
- do not collapse before the IA is stable;
- do not hide role/work mode context when collapsed;
- do not use abstract icons that require memorization.

## Falcon Shell Identity Direction

The shell should reinforce the v1 identity:

- darker operational spine;
- stronger environmental framing;
- premium operational console;
- restrained executive tone;
- appraisal-native feel.

Avoid:

- startup dashboard aesthetics;
- ERP clutter;
- decorative gradients;
- glassmorphism;
- neon/gamer styling;
- route-list sprawl.

The shell should feel confident, quiet, and operationally specific.

## Runtime Implementation Roadmap

### A4.2.1 Operational Spine Runtime Experiment

Purpose:

- implement the smallest reversible left-rail shell experiment.

Expected scope:

- left rail shell layout;
- current visible permission-filtered links reused as input;
- no route removals;
- no permission or route guard changes;
- no page rewrites.

### A4.2.2 Nav Migration Pass

Purpose:

- move primary operational nav authority from the top bar into the left rail.

Expected scope:

- primary operational lane rendering;
- management/support de-emphasis;
- active lane state;
- parity tests for visible links and paths.

### A4.2.3 Utility Bar Consolidation

Purpose:

- convert the top bar into compact utility/context only.

Expected scope:

- command/search affordance;
- notifications;
- company/work-mode context;
- avatar/profile;
- remove duplicate primary nav from top bar only after rail parity is proven.

### A4.2.4 Responsive Shell Pass

Purpose:

- preserve operational hierarchy on mobile and narrower screens.

Expected scope:

- task-first mobile access;
- reduced route exposure;
- compact rail/drawer behavior;
- no desktop-density clone.

### A4.2.5 Cross-Shell UX QA

Purpose:

- review the shell across Dashboard, Orders, Order Detail, and role-specific surfaces before
  locking the operational spine.

Expected scope:

- desktop and mobile review;
- active lane / page header consistency;
- command/search utility behavior;
- no route/permission/workflow/data regressions.

## Explicit Non-Goals

Phase A4.2 does not include:

- runtime implementation yet;
- route removals yet;
- permission changes;
- workflow changes;
- backend changes;
- schema changes;
- Supabase changes;
- dashboard data changes;
- AMC work;
- Client Portal work;
- automation work;
- AI work.

## A4.2.1 Runtime Experiment Record

Phase A4.2.1 implements the smallest reversible operational spine runtime experiment.

Runtime files updated:

- `src/layout/Layout.jsx`;
- `src/components/shell/TopNav.jsx`;
- `src/components/shell/__tests__/TopNav.test.jsx`.

A4.2.1 changes:

- introduces a persistent desktop left rail as the primary operational navigation authority;
- adds Dashboard / Operations to the rail through the existing `/dashboard` route;
- reuses existing permission-filtered primary navigation links, route paths, shell profile metadata,
  and grouping helpers as the rail input;
- groups visible rail links into operational and management/support sections without changing route
  guards or authorization;
- converts the desktop top bar toward compact utility/context by removing the horizontal primary
  route inventory;
- keeps command/search, notifications, current work-mode cue, and profile access in the utility
  layer;
- preserves the existing role-prioritized mobile menu behavior while restyling it to match the
  darker shell environment;
- adjusts the main workspace and footer offsets so desktop content sits beside the persistent
  operational spine.

A4.2.1 intentionally does not:

- remove any route;
- change route guards;
- change permission checks;
- change visible-link filtering;
- add new workflow features;
- change Dashboard, Orders, Order Detail, or backend data behavior;
- add Reports or future-only lanes without live route contracts;
- move AMC, Client Portal, automation, or AI concepts into the internal staff shell.

Experiment assessment:

- Falcon now has clearer shell information architecture: left = movement, top = utility/context,
  center = active work;
- duplicate desktop navigation authority is reduced because the horizontal route inventory no
  longer competes with the operational rail;
- the darker rail strengthens the Executive Operational Command Console identity established in
  A4/A4.1;
- A4.2.2 should refine nav migration and secondary support placement only after browser review
  confirms the experiment preserves orientation across Dashboard, Orders, and Order Detail.

## A4.2.1a Utility-Bar Weight Reduction Record

Phase A4.2.1a refines the first operational spine runtime experiment without changing shell
information architecture.

Runtime files updated:

- `src/components/shell/TopNav.jsx`.

Docs updated:

- `docs/FALCON_V1_OPERATIONAL_SPINE_COMPOSITION_PLAN.md`;
- `docs/IMPLEMENTATION_ROADMAP.md`.

A4.2.1a changes:

- reduces the visual dominance of the top utility bar so it no longer competes with the left
  operational spine;
- quiets the header background, border, and shadow treatment;
- compresses the utility cluster and removes excessive boxed control weight;
- makes command/search feel like a compact utility affordance instead of a dominant shell object;
- softens avatar/profile chrome while keeping the same menu behavior;
- keeps the left rail as the darkest and strongest structural anchor.

A4.2.1a intentionally does not:

- redesign the left rail;
- reintroduce top navigation route duplication;
- change route paths or route guards;
- change permissions or visible-link filtering;
- change workflow, lifecycle, dashboard data, Orders data, Order Detail data, backend, schema,
  Supabase, automation, notification, AMC, Client Portal, AI, or production data behavior.

Hierarchy assessment:

- Falcon's shell now reads more clearly as left = structural operational anchor, top =
  utility/context, center = active operational work;
- the double-dark-bar effect is reduced while preserving the stronger operational environment
  created in A4.1 and A4.2.1;
- A4.2.2 should remain focused on nav parity and support placement, not broader visual redesign.

## A4.2.1b Top Utility Secondary Hierarchy Record

Phase A4.2.1b makes the top utility area clearly secondary to the left operational spine.

Runtime files updated:

- `src/components/shell/TopNav.jsx`;
- `src/components/shell/__tests__/TopNav.test.jsx`.

Docs updated:

- `docs/FALCON_V1_OPERATIONAL_SPINE_COMPOSITION_PLAN.md`;
- `docs/IMPLEMENTATION_ROADMAP.md`.

A4.2.1b changes:

- removes the desktop top-left work-mode block from the utility strip;
- makes the desktop header transparent and shadowless so it no longer reads as a full-width dark
  navigation bar;
- keeps mobile header treatment intact where the brand/menu still need compact containment;
- keeps command/search, notifications, and profile as one tight right-side utility island;
- preserves the left rail as the only dark structural navigation anchor.

A4.2.1b intentionally does not:

- redesign the left rail;
- reintroduce top-nav route duplication;
- add controls or new features;
- change route paths, route guards, permissions, visible-link filtering, workflow, lifecycle, data,
  backend, schema, Supabase, automation, notification, AMC, Client Portal, AI, or production data
  behavior.

Hierarchy assessment:

- Falcon now reads more decisively as left = operational movement, top = compact utility island,
  center = active work;
- the top area no longer presents as a competing full-width dark bar on desktop;
- the next shell pass should focus on navigation parity/support placement rather than adding more
  chrome.

## A4.2.2 Wordmark Brand Anchor Record

Phase A4.2.2 integrates the Falcon wordmark asset into the operational shell.

Runtime files updated:

- `src/components/shell/TopNav.jsx`;
- `src/components/shell/__tests__/TopNav.test.jsx`.

Branding asset used:

- `src/assets/branding/falcon-wordmark-transparent.png`.

A4.2.2 changes:

- replaces the plain `Falcon Operations` text/F-mark shell brand block with the Falcon wordmark;
- keeps the wordmark in the left operational rail as the global shell brand anchor;
- keeps `Operations Command` and other resolved work-mode labels as context in the current-mode
  rail card, not duplicate branding;
- preserves the compact right-side utility island and does not reintroduce top-route navigation;
- updates shell tests to confirm the wordmark renders and redundant `Falcon Operations` text is
  removed.

A4.2.2 intentionally does not:

- change route paths or route guards;
- change permissions or visible-link filtering;
- change workflow, lifecycle, data, backend, schema, Supabase, automation, notification, AMC,
  Client Portal, AI, or production data behavior;
- add new shell controls or navigation destinations.

Brand hierarchy assessment:

- the left rail now carries both the structural operational spine and the primary Falcon brand
  identity;
- the top utility area remains secondary and compact;
- work-mode context remains present without competing with the wordmark.

## Logo Implementation Strategy

Logo asset strategy is governed by `docs/FALCON_V1_LOGO_IMPLEMENTATION_STRATEGY.md`.

The revised spine direction is:

- top-left utility/context zone carries the full `FALCON` wordmark;
- work-mode/platform selector should live near the wordmark, not inside page content;
- left rail uses mark-only as the operational spine identity stamp;
- top-right remains utility cluster only;
- duplicate full wordmarks are not allowed;
- top bar remains utility/context and must not reintroduce route navigation.

## A4.2.3 Wordmark + Operational Mode Shell Integration Record

Phase A4.2.3 implements the revised logo placement doctrine in the operational shell.

Runtime files updated:

- `src/components/shell/TopNav.jsx`;
- `src/components/shell/__tests__/TopNav.test.jsx`.

Docs updated:

- `docs/FALCON_V1_OPERATIONAL_SPINE_COMPOSITION_PLAN.md`;
- `docs/IMPLEMENTATION_ROADMAP.md`.

A4.2.3 changes:

- moves the full Falcon wordmark from the left rail into the top-left utility/context zone;
- converts the left operational rail to a compact mark-only identity stamp;
- places the operational mode context near the wordmark with `Operations Command` as the initial
  mode and `Staff Appraiser Operations` as the platform context;
- preserves the top-right as command/search, notifications, and profile utility cluster only;
- keeps all route/navigation rendering sourced from the existing permission-filtered rail inputs.

A4.2.3 intentionally does not:

- add workflow switching logic;
- add AMC or Client Portal implementation;
- change route paths, route guards, permissions, visible-link filtering, workflow, lifecycle, data,
  backend, schema, Supabase, automation, notification, AI, or production data behavior;
- reintroduce top-nav route duplication or duplicate full wordmarks.

Shell composition assessment:

- brand identity now sits in the top-left context layer where future platform/mode context can
  live;
- the left rail reads more cleanly as operational movement plus a mark-only spine stamp;
- the top-right remains a restrained utility island.

## A4.2.3b Shell Brand / Context Correction Record

Phase A4.2.3b corrects the shell brand/context composition without changing navigation authority.

Runtime files updated:

- `src/components/shell/TopNav.jsx`;
- `src/components/shell/__tests__/TopNav.test.jsx`.

Docs updated:

- `docs/FALCON_V1_LOGO_IMPLEMENTATION_STRATEGY.md`;
- `docs/FALCON_V1_OPERATIONAL_SPINE_COMPOSITION_PLAN.md`;
- `docs/IMPLEMENTATION_ROADMAP.md`.

A4.2.3b changes:

- moves `Staff Appraiser Operations` and `Operations Command` into the top of the left rail;
- removes the standalone mark-only `F` from the expanded left rail;
- removes transitional `Spine / Internal Ops` copy;
- keeps the single full Falcon wordmark in the top shell immediately right of the rail;
- keeps the top-right utility-only cluster unchanged.

A4.2.3b intentionally does not:

- add route navigation to the top bar;
- duplicate the full wordmark;
- change route paths, route guards, permissions, visible-link filtering, workflow, lifecycle, data,
  backend, schema, Supabase, automation, notification, AMC, Client Portal, AI, or production data
  behavior.

## A4.2.3d Left Rail Environmental Depth Record

Phase A4.2.3d adds a tiny environmental depth pass to the left operational rail without changing
shell structure.

Runtime files updated:

- `src/components/shell/TopNav.jsx`.

Docs updated:

- `docs/FALCON_V1_LOGO_IMPLEMENTATION_STRATEGY.md`;
- `docs/FALCON_V1_OPERATIONAL_SPINE_COMPOSITION_PLAN.md`;
- `docs/IMPLEMENTATION_ROADMAP.md`.

A4.2.3d changes:

- replaces the rail's flat dark slab with a restrained dark tonal background;
- adds a subtle top-left atmospheric softening and vertical near-black depth;
- preserves the current navigation structure, spacing, active states, wordmark placement, and
  utility cluster.

A4.2.3d intentionally does not:

- brighten or decorate the rail;
- add glow, glassmorphism, or gamer/cyberpunk styling;
- change route paths, route guards, permissions, visible-link filtering, workflow, lifecycle, data,
  backend, schema, Supabase, automation, notification, AMC, Client Portal, AI, or production data
  behavior.

## A4.2.3e Left Rail Gradient Direction Record

Phase A4.2.3e refines the left rail environmental depth direction without changing shell
composition.

Runtime files updated:

- `src/components/shell/TopNav.jsx`.

Docs updated:

- `docs/FALCON_V1_LOGO_IMPLEMENTATION_STRATEGY.md`;
- `docs/FALCON_V1_OPERATIONAL_SPINE_COMPOSITION_PLAN.md`;
- `docs/IMPLEMENTATION_ROADMAP.md`.

A4.2.3e changes:

- makes the top of the left rail the darkest/deepest point;
- lets the rail become subtly softer and slightly lighter toward the lower rail;
- slightly increases the tonal gradient's visibility while keeping it restrained and operational.

A4.2.3e intentionally does not:

- change navigation structure, spacing, active states, wordmark placement, utility cluster, route
  paths, route guards, permissions, visible-link filtering, workflow, lifecycle, data, backend,
  schema, Supabase, automation, notification, AMC, Client Portal, AI, or production data behavior.
