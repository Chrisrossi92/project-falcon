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
