# AMC Operations Command

## Purpose

AMC Operations Command defines how users should eventually move between Internal Operations Mode and AMC Operations Mode without leaving Falcon.

## One Platform / Two Modes

Falcon is one platform with two operational modes:

- Internal Operations Mode
- AMC Operations Mode

These modes should share users, clients, orders, calendar, notifications, permissions, reporting, and shell infrastructure wherever possible.

## Mode Switching

Operations Command should let users switch between Internal Operations and AMC Operations using the same login.

The experience should feel like changing operational context rather than opening a different product.

## AMC-1A Runtime Foundation

AMC-1A adds the minimum runtime foundation for operational mode state:

- supported modes: Internal Operations and AMC Operations
- default mode: Internal Operations
- persistence: browser localStorage only
- authorization: unchanged; permissions remain the sole access-control authority

This foundation does not add visible mode-switching UI, AMC routes, vendor management, dashboard changes, schema changes, roles, or permissions.

## AMC-1B Shell Switcher

AMC-1B adds the first visible Operations Command switcher to the existing Falcon shell:

- desktop: switcher appears in the left-rail operational context block
- mobile: switcher appears near the top of the mobile navigation menu
- behavior: local mode switching only, persisted through the AMC-1A localStorage foundation
- authorization: unchanged; permissions remain the sole access-control authority

This slice does not add schema changes, RLS changes, permissions, roles, routes, dashboard data changes, order/client/calendar behavior changes, vendor workflows, or AMC screens.

## AMC-1C Navigation Awareness

AMC-1C threads the selected operations mode into Falcon's current navigation and command composition helpers as presentation metadata:

- primary navigation derivation accepts operations mode
- desktop shell grouping accepts operations mode
- mobile shell ordering accepts operations mode
- command palette composition accepts operations mode

There are no visible AMC navigation differences in this slice. Existing routes, route guards, permissions, labels, groups, commands, and screens remain unchanged, and no duplicate `/amc/*` route tree is introduced.

## AMC-1D Dashboard Awareness

AMC-1D threads the selected operations mode into the current dashboard resolution path:

- DashboardGate reads the active operations mode
- dashboard resolution accepts operations mode as presentation metadata
- existing dashboard components receive operations mode context for future use

The `/dashboard` route remains shared. This slice does not add AMC dashboard widgets, duplicate dashboard pages, dashboard data/query changes, route changes, permission changes, or `/amc/*` routes.

## AMC-1E Closeout

AMC-1 Operations Command foundation is complete for MVP plumbing:

- operations mode constants, labels, normalization, and local persistence are in place
- desktop and mobile shell switchers are in place and synchronized
- navigation, command palette, and dashboard resolution are mode-aware as presentation metadata
- shared route doctrine is preserved; `/dashboard` remains shared and no `/amc/*` route tree exists
- permissions remain authoritative and are not granted, removed, or changed by mode switching

AMC-2 may begin later as vendor directory/domain work. AMC-2 should build on this shared mode context without duplicating screens or introducing separate AMC platform infrastructure.

## Cross-Mode Attention Indicators

Operations Command should eventually surface attention indicators from the other mode.

Example:

- Internal Operations:
  - 2 reviews due
  - 1 assignment waiting
- AMC Operations:
  - 3 orders unassigned
  - 1 client escalation

These indicators should help users see cross-mode work without forcing constant navigation.

## Shared Navigation Principles

Shared navigation should:

- avoid duplicate platforms
- preserve familiar Falcon workflows
- make the current mode obvious
- keep unfinished AMC surfaces hidden until ready
- reduce clicks to reach urgent work
- surface operational visibility sooner than competing AMC platforms

## Permissions

Mode visibility and actions should respect Falcon's permissions engine.

Future permissions may determine:

- who can see AMC Operations Mode
- who can switch modes
- who can assign vendors
- who can manage vendor companies
- who can see financial/margin data
- who can configure AMC policies

## Future Expansion

- cross-mode dashboards
- mode-specific saved views
- mode-specific notification filters
- cross-mode command palette actions
- attention badges in shell navigation
- company-by-company mode configuration
