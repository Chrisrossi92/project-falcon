# Falcon v1 Surface / Elevation QA Review

## Purpose

This review evaluates whether the A3 surface/elevation work creates a consistent premium
operational-console feel across Falcon v1's main internal workflow surfaces.

It exists to:

- verify that Dashboard / Operations Command, Orders Workspace, and Order Detail now share a
  coherent surface hierarchy;
- catch cross-page visual drift before Phase A3 is frozen;
- identify only small presentation corrections if needed;
- prevent a new redesign phase from forming around subjective polish.

This review is docs-only. It does not add runtime code, styling changes, data changes, route
changes, permission changes, workflow changes, backend changes, automation, notifications, AMC
scope, Client Portal scope, mobile-native work, AI behavior, or production data changes.

## Surfaces Reviewed

Review targets:

- Dashboard / Operations Command;
- Orders Workspace;
- Order Detail.

Supporting surfaces to compare:

- shell and workspace background relationship;
- workspace headers and active work-mode cues;
- primary operational panels;
- secondary context panels;
- action/decision surfaces;
- read-only evidence surfaces;
- high-priority or blocker states;
- table/list surfaces and row containment.

## Consistency Checklist

### App Background -> Shell -> Workspace Frame Relationship

Expected:

- the app background should read as the broadest quiet environment;
- the shell should provide a clear operational container without becoming a card-heavy wrapper;
- each workspace should have a first-screen frame that connects the active shell cue to the page
  header and primary work area;
- Dashboard, Orders, and Order Detail should feel like related workstations, not unrelated pages.

Review questions:

- Does each page avoid white-on-white blending between background, shell, and page surface?
- Is the workspace header visually tied to the active shell/nav mode?
- Does the first screen clearly communicate what work surface the user is in?

### Primary Operational Panel Hierarchy

Expected:

- each page should have one dominant operational surface;
- the primary panel should carry stronger boundary, depth, or contrast than secondary context;
- primary panels should not compete with every smaller card on the page.

Review questions:

- On Dashboard, does the command surface clearly lead the page?
- On Orders, does the active worklist/table area read as the main operational area?
- On Order Detail, does the order workstation/header plus core status/action area read as the
  authority surface?

### Secondary Context Panel Hierarchy

Expected:

- secondary panels should support the main workflow without matching its visual weight;
- secondary context should use restrained borders and calmer depth;
- nested panels should avoid becoming a stack of equally weighted cards.

Review questions:

- Are supporting summaries, filters, readiness context, review context, and activity areas legible
  without competing with primary work?
- Do secondary panels remain scan-friendly on both dense and sparse states?

### Action / Decision Surface Distinction

Expected:

- action and decision surfaces should sit above read-only context;
- Smart Actions, operational input controls, and other allowed actions should be visually distinct
  from evidence or history;
- action surfaces should not imply lifecycle authority where none exists.

Review questions:

- Can a user quickly distinguish "can act here" from "read context here"?
- Do action areas remain calm and operational rather than loud or promotional?
- Do action surfaces avoid competing with page-level status authority?

### Read-Only Evidence Distinction

Expected:

- evidence/read-only surfaces should be clearly contained but lower in elevation than action areas;
- operational input evidence, file readiness context, review context, and activity/history should
  feel trustworthy and durable;
- evidence surfaces should not look like editable controls.

Review questions:

- Are read-only surfaces recognizable as context or proof?
- Do note/history/status details remain compact and scannable?
- Are evidence areas visually distinct from action/decision controls?

### Table / List Containment

Expected:

- table/list areas should have strong enough containment to prevent page blending;
- row separation should be visible but calm;
- headers, filters, active chips, and table/list surfaces should feel connected.

Review questions:

- Does the Orders table read as an operational worklist rather than a floating spreadsheet?
- Do Dashboard worklists/previews inherit enough containment to scan quickly?
- Are row boundaries legible without adding heavy grid clutter?

### Border Strength Consistency

Expected:

- workspace and primary shells should use stronger boundaries;
- nested surfaces should use restrained borders;
- high-priority states can use stronger borders only when they communicate operational urgency.

Review questions:

- Are border weights consistent across Dashboard, Orders, and Order Detail?
- Are there same-weight nested panels that flatten hierarchy?
- Are any borders too faint to separate adjacent white/neutral surfaces?

### Shadow / Elevation Consistency

Expected:

- depth should communicate hierarchy, not decoration;
- action surfaces may sit above evidence surfaces;
- drawers and modals remain the highest layer;
- normal panels should not all appear as floating cards.

Review questions:

- Does elevation strengthen the workflow hierarchy?
- Are there too many shadows on ordinary support panels?
- Do high-priority/action areas gain enough prominence without feeling noisy?

### Density And Spacing Rhythm

Expected:

- spacing should support scan-first operational work;
- dense lists and tables should keep compact metadata;
- panels should not drift into oversized hero or marketing-style spacing.

Review questions:

- Does first-screen density show useful work without crowding?
- Do related labels, counts, chips, and metadata stay visually grouped?
- Are there inconsistent gaps that make related controls feel disconnected?

### Active Work Mode / Header Relationship

Expected:

- shell/nav state, role/work cue, and page header should reinforce each other;
- Dashboard should read as Operations Command;
- Orders should read as an active order/worklist workspace;
- Order Detail should read as a specific operational workstation.

Review questions:

- Does the header copy match the active work mode?
- Does the shell cue feel connected to the page context?
- Does the active navigation state align with the visible workspace identity?

## Known Visual Risks

- Over-carded layouts: too many bordered containers can make the interface feel fragmented.
- Same-weight panels: equal borders/shadows across primary and secondary panels flatten the work
  hierarchy.
- White-on-white blending: insufficient neutral contrast can make sections feel unfinished or
  indistinct.
- Too much depth: shadows on every surface can make the UI feel decorative rather than operational.
- Table density issues: weak row separation reduces scan speed; heavy grid treatment creates a
  cluttered ERP feel.
- Action areas competing with context: action panels should be clear but should not drown out
  lifecycle/status authority or primary worklist context.

## Manual Browser Review Checklist

Review each target page at a normal desktop viewport and one narrower responsive viewport.

- Open Dashboard / Operations Command and confirm the command header, primary summary, attention
  area, worklist/workbench area, and support panels have distinct but related hierarchy.
- Open Orders Workspace and confirm the workspace header, filter panel, active chip/status strip,
  and table/list area read as one operational workspace.
- Open an Order Detail page and confirm status/lifecycle authority, allowed actions, operational
  input evidence, file/readiness context, review/revision context, and activity/history are
  visually separated.
- Confirm active nav state and role/work cue remain readable on each reviewed page.
- Confirm no first-screen section looks like a marketing hero, decorative dashboard, or unrelated
  card stack.
- Confirm empty/loading/error states still sit inside appropriate surfaces.
- Confirm dense table/list rows are scannable and row separation remains calm.
- Confirm no text overlaps, clipped labels, or cramped action clusters appear at reviewed widths.
- Confirm no page introduces decorative gradients, loud badges, or unrelated accent colors.

## Acceptable Small-Fix Criteria

If review finds issues, a follow-up A3.6 correction pass is acceptable only when the fix is:

- presentation-only;
- limited to Dashboard, Orders, Order Detail, or shared `WorkspaceSurface` recipes already used by
  those pages;
- focused on border, shadow, neutral contrast, spacing, or containment;
- small enough to validate with targeted tests plus lint/build;
- free of data/query, route, permission, workflow/lifecycle, backend/schema, automation,
  notification, AMC, Client Portal, mobile-native, AI, and production data changes.

A3.6 should not become a redesign. It should correct only cross-page inconsistencies that materially
hurt scan hierarchy or surface clarity.

## Stop Condition

If Dashboard, Orders, and Order Detail are consistent enough after manual review, freeze Phase A3
and move to Phase B: Role-Tailored Operational Surfaces.

If they are not consistent enough, do one small A3.6 visual correction pass only, then freeze Phase
A3 before moving to Phase B.

## Explicit Non-Goals

Phase A3.5 does not include:

- new features;
- data/query changes;
- workflow/lifecycle changes;
- route/permission changes;
- dashboard redesign;
- Orders redesign;
- Order Detail redesign;
- AMC work;
- Client Portal work;
- automation work;
- AI work.
