# Falcon v1 Logo Implementation Strategy

## Purpose

This document defines Falcon v1 logo asset strategy, shell placement rules, accessibility
expectations, and naming conventions before additional brand runtime work continues.

Falcon's operational shell is moving toward an Executive Operational Command Console. Logo usage
must support that environment without creating duplicate brand blocks, decorative chrome, or
route/navigation confusion.

This phase is docs/planning only. It does not implement runtime code, CSS changes, component
changes, route changes, permission changes, workflow changes, data changes, backend changes, schema
changes, Supabase changes, AMC work, Client Portal work, automation, AI work, or production data
changes.

## Asset Variants Needed

Falcon should keep a small, governed logo asset set.

Required variants:

- dark-shell wordmark;
- light-surface wordmark;
- mark-only;
- favicon/app-icon derivatives where needed by platform packaging.

Each variant should be exported intentionally instead of relying on one large image to work in every
context.

## Dark-Shell Wordmark

Purpose:

- primary brand identity in dark shell environments;
- top-left utility/context brand anchor in the operational shell;
- mobile shell brand when a compact header still needs full brand identity;
- auth/account/transition states where no left operational rail is present.

Requirements:

- readable on slate/charcoal/navy shell surfaces;
- transparent background;
- restrained glow or highlight only if it is part of the approved asset;
- no decorative page background baked into the exported wordmark;
- sized for predictable shell placement without cropping important letterforms.

Recommended file naming:

- `falcon-wordmark-dark-shell.png`;
- `falcon-wordmark-dark-shell@2x.png` if a high-density export is needed.

## Light-Surface Wordmark

Purpose:

- brand usage on light documentation, auth, print, or neutral surface contexts;
- future controlled usage on light panels only when brand identity is required.

Requirements:

- readable on white and light slate surfaces;
- transparent background;
- no dark environmental plate baked into the file;
- visually paired with the dark-shell wordmark.

Recommended file naming:

- `falcon-wordmark-light-surface.png`;
- `falcon-wordmark-light-surface@2x.png` if a high-density export is needed.

## Mark-Only

Purpose:

- operational spine identity stamp in the left rail;
- collapsed rail;
- mobile compact shell;
- favicon/app icon source;
- small command/menu contexts where the full wordmark would be illegible.

Requirements:

- readable at small sizes;
- distinct enough without the wordmark;
- available in dark-shell and light-surface compatible treatments if needed;
- not used as a decorative repeated motif.

Recommended file naming:

- `falcon-mark-dark-shell.png`;
- `falcon-mark-light-surface.png`;
- `falcon-mark-app-icon.png` if platform cropping or padding differs.

## Placement Rules

Logo placement should reinforce shell hierarchy.

Rules:

- one primary brand anchor per shell viewport;
- full wordmark belongs in the top-left utility/context zone when the operational spine shell is
  present;
- left rail should use mark-only as the operational spine identity stamp;
- do not repeat full wordmarks in both left rail and top utility bar;
- do not place the wordmark inside page headers when the shell already carries the brand;
- keep operational work-mode labels separate from brand identity;
- avoid oversized brand treatment inside internal workspaces;
- do not use the logo as a decorative background or hero graphic in the internal app.

The brand anchor should identify Falcon once, then let operational navigation and active work take
over.

## Top-Left Utility Brand Anchor

The top-left utility/context zone should carry the full `FALCON` wordmark in the operational spine
shell.

Allowed top-left usage:

- full wordmark as the global shell brand anchor;
- work-mode or platform selector placed near the wordmark as context;
- mobile header when the left rail is not visible;
- compact mark-only usage if a collapsed or mobile shell needs orientation;
- account/auth/transition states where no left rail is present.

Disallowed top-left usage:

- duplicate full wordmark while another full wordmark is already visible;
- horizontal route inventory plus logo treatment;
- large persistent search plus full brand plus profile cluster competing for shell authority.

The top bar remains utility/context, not primary route navigation. The full wordmark may live in
the top-left context zone, while the top-right remains utility controls only.

## Top-Right Utility Cluster

The top-right area should remain a compact utility cluster only.

Allowed top-right content:

- command/search access;
- notifications;
- current company/account utility if needed;
- profile/avatar.

Disallowed top-right content:

- full wordmark;
- route navigation;
- duplicated work-mode branding;
- large persistent search that visually outranks the operational spine.

## Left Rail Mark-Only

The left rail should use mark-only as the operational spine identity stamp.

Left rail rules:

- mark-only when expanded;
- mark-only when collapsed;
- mark-only on narrow shell variants where the full wordmark would become illegible;
- no full wordmark in the rail while the top-left utility/context zone already carries the full
  wordmark.

Collapsed behavior must preserve orientation:

- mark-only should remain linked to Dashboard / Operations where the brand anchor links;
- tooltip or accessible label should identify `Falcon`;
- active lane treatment should remain independent of the mark.

## Work-Mode / Platform Selector

Work-mode or platform selection belongs near the full wordmark in the top-left utility/context
zone, not inside page content.

Rules:

- keep work-mode/platform context adjacent to the wordmark without making it part of the logo;
- use text for work-mode labels such as `Operations Command`;
- do not embed work-mode text inside logo images;
- do not move work-mode selection into Dashboard, Orders, or Order Detail page headers;
- do not make work-mode context a route-navigation substitute.

## Mobile / Collapsed Behavior

Mobile and collapsed shell rules:

- use the full wordmark in the mobile top-left area only when it remains legible and does not crowd
  primary utility controls;
- use mark-only when horizontal space is constrained or when the rail is collapsed;
- preserve the mobile menu, command/search, notification, and profile access hierarchy;
- do not expose additional routes to justify logo placement;
- do not create a separate mobile brand system.

Mobile should feel like the same Falcon environment with reduced chrome, not a different product.

## Accessibility / Alt Text

Logo accessibility rules:

- full wordmark image alt text should be `Falcon`;
- mark-only image alt text should be `Falcon` when it is the only brand label;
- decorative repeated logo usage should use empty alt text, but decorative logo usage is generally
  discouraged in the internal app;
- linked full-wordmark or mark-only anchors should use an accessible label such as
  `Falcon dashboard` when the link destination is Dashboard / Operations;
- work-mode labels such as `Operations Command` should remain text, not embedded in the image.

Do not rely on the image alone to communicate role, mode, permission, or workflow state.

## Naming Conventions

Asset names should be explicit about:

- brand element: `wordmark`, `mark`, `app-icon`;
- surface intent: `dark-shell`, `light-surface`;
- scale or density when relevant: `@2x`;
- file format: `.png`, `.svg`, or `.webp` as approved by implementation needs.

Examples:

- `falcon-wordmark-dark-shell.png`;
- `falcon-wordmark-light-surface.png`;
- `falcon-mark-dark-shell.png`;
- `falcon-mark-light-surface.png`;
- `falcon-mark-app-icon.png`.

Avoid vague names such as:

- `logo.png`;
- `new-logo.png`;
- `falcon-final.png`;
- `brand2.png`.

## Current Asset Note

The currently available runtime asset is:

- `src/assets/branding/falcon-wordmark-transparent.png`.

It is acceptable as the first integrated shell wordmark, but the governed asset set should still
separate dark-shell, light-surface, and mark-only variants before broader brand lock.

## A4.2.3 Runtime Integration Note

Phase A4.2.3 implements the revised placement doctrine in the shell:

- full Falcon wordmark in the top-left utility/context zone;
- `Operations Command` mode context near the wordmark under the `Staff Appraiser Operations`
  platform label;
- compact mark-only identity stamp in the left operational rail;
- top-right utility cluster preserved for command/search, notifications, and profile only.

This runtime integration is presentation/context only. It does not add platform switching logic,
route changes, permission changes, workflow changes, data/query changes, backend/schema changes,
AMC implementation, Client Portal work, automation, AI work, or production data changes.

## A4.2.3b Shell Composition Correction

Phase A4.2.3b corrects shell placement after runtime review:

- left rail top contains `Staff Appraiser Operations` and `Operations Command`;
- standalone mark-only `F` is removed from the expanded left rail;
- `Spine / Internal Ops` transitional copy is removed;
- top shell immediately right of the rail contains the single full Falcon wordmark;
- top-right remains utility-only: command/search, notifications, and profile.

This correction keeps the top bar as utility/context and does not reintroduce top-route navigation
or duplicate full wordmarks.

## A4.2.3d Left Rail Environmental Depth Note

Phase A4.2.3d adds a restrained tonal depth treatment to the left operational rail while preserving
the corrected logo and context placement:

- the left rail remains the dark operational movement anchor;
- the top shell continues to carry the single full Falcon wordmark;
- `Staff Appraiser Operations` and `Operations Command` remain in the left rail context area;
- top-right remains utility-only.

This pass is visual shell treatment only. It does not change logo doctrine, route navigation,
permissions, workflows, data/query behavior, backend/schema behavior, AMC, Client Portal,
automation, AI, or production data behavior.

## A4.2.3e Left Rail Gradient Direction Note

Phase A4.2.3e refines the rail depth orientation:

- the top of the left rail is now the darkest/deepest point;
- the rail becomes subtly softer and slightly lighter downward;
- the treatment is slightly more visible than A4.2.3d while remaining restrained.

Logo placement doctrine remains unchanged: the top shell carries the single full Falcon wordmark,
the left rail carries operational mode context, and the top-right remains utility-only.

## Implementation Sequence

Recommended next steps:

1. Approve dark-shell wordmark treatment for the top-left utility/context brand anchor.
2. Export a mark-only asset for the left operational rail, collapsed rail, and compact mobile use.
3. Export a light-surface wordmark for documentation/auth/light contexts.
4. Replace generic or transitional asset names with governed names.
5. Confirm accessibility labels and link destinations in shell tests.
6. Run visual QA across expanded desktop, mobile header, and any future collapsed shell state.

## Explicit Non-Goals

This strategy does not authorize:

- runtime code changes;
- CSS changes;
- component changes;
- route changes;
- permission changes;
- workflow or lifecycle changes;
- data/query changes;
- backend changes;
- schema changes;
- Supabase changes;
- AMC work;
- Client Portal work;
- automation;
- AI UI;
- production data changes.
