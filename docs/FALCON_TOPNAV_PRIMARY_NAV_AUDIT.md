# Falcon TopNav Primary Navigation Audit

## Purpose

This document records the `TopNav` primary navigation behavior audited before extraction and the completed current-live registry helper migration.

This document is planning and audit documentation only. It does not change `TopNav`, mobile navigation, routes, dashboards, command palette behavior, permissions, seeds, migrations, company settings, module settings, product-mode runtime behavior, or backend visibility.

## Safety Boundary

- Current Staff/default navigation behavior must remain the baseline.
- Primary operational nav rendering now uses `getCurrentPrimaryNavLinks()` for both desktop and mobile.
- `CommandPalette` remains independent and hardcoded.
- Dashboards remain independent and permission-driven.
- Product-mode and shadow metadata remain diagnostic only.
- Current-live registry metadata may describe live behavior, but it must not introduce mode-aware behavior.
- Vendor Portal and Client Portal future concepts must not appear in live primary navigation.
- Module/company setting enforcement remains deferred.

## Phase 9H31 Migration Lock

Phase 9H28 through Phase 9H30 completed the safe current-live helper migration for primary `TopNav` rendering:

- `src/lib/navigation/currentPrimaryNavLinks.js` returns current primary nav entries from `currentNavigationRegistry` metadata.
- Desktop primary `TopNav` rendering uses `getCurrentPrimaryNavLinks()`.
- Mobile primary `TopNav` rendering uses `getCurrentPrimaryNavLinks()`.
- Current labels, order, paths, permission hiding, and Clients dynamic route behavior are preserved.
- Mobile menu close-on-navigation behavior is preserved.
- Settings/account utility behavior remains separate from primary nav.

The lock preserves this safety boundary:

- No product-mode or shadow metadata authority.
- No mode-aware nav.
- No Vendor Portal or Client Portal future concepts in live primary nav.
- No `CommandPalette` migration.
- No dashboard migration.
- No route authority changes.
- No permission, seed, or migration changes.

Validation baseline:

- `src/lib/navigation/__tests__/currentPrimaryNavLinks.test.js`
- `src/components/shell/__tests__/TopNav.test.jsx`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Static scans confirming no product-mode/shadow metadata imports in `TopNav` or active nav authority surfaces.

## Current TopNav Primary Behavior

### Dashboard

- The Falcon brand link routes to `/dashboard`.
- Dashboard is not rendered as a desktop primary nav item.
- Dashboard is not rendered as a mobile drawer nav item.
- `/dashboard` route behavior is delegated to `DashboardGate`, which chooses the order dashboard, assignment dashboard, or unavailable state from active permissions.
- TopNav does not use product-mode dashboard metadata.

### Orders

- Desktop nav always renders `Orders` with route `/orders`.
- Mobile nav always renders `Orders` with route `/orders`.
- TopNav does not currently check order read permission before showing the link.
- Route authority still belongs to `src/routes/index.jsx` and protected route gates.

### Calendar

- Desktop nav always renders `Calendar` with route `/calendar`.
- Mobile nav always renders `Calendar` with route `/calendar`.
- TopNav does not currently check calendar or order-navigation permission before showing the link.
- Route authority still belongs to the protected route gate.

### Clients

- Desktop nav renders `Clients` only when the user has `clients.read.all` or `clients.read.assigned`.
- Mobile nav uses the same visibility condition.
- The route is dynamic:
  - Users with `clients.read.all` route to `/clients`.
  - Assigned-only users route to `/clients/cards`.
- This dynamic route behavior must be preserved exactly during any registry extraction.

### Relationships

- Desktop nav renders `Relationships` when the user has `relationships.read`.
- Mobile nav uses the same visibility condition.
- The route is `/relationships`.
- Relationship existence does not grant any operational visibility; nav visibility remains permission-driven.

### Assignments

- Desktop nav renders `Assignments` when the user has `order_company_assignments.read_assigned` or `order_company_assignments.read_owner`.
- Mobile nav uses the same visibility condition.
- The route is `/assignments`.
- Assignment packet access remains separate from canonical order access.
- The nav link does not expose owner order routes to assigned-company users.

### Users / Team

- Desktop nav renders `Users` when the user has `users.read`.
- Mobile nav uses the same visibility condition.
- The route is `/users`.
- The visible label remains `Users`, even though product-mode planning may refer to the concept as Team Access.

### Activity

- TopNav does not currently render an `Activity` primary nav item.
- Mobile nav does not render `Activity`.
- `/activity` remains route-gated elsewhere and must not be introduced into TopNav by a primary nav registry extraction unless an explicit later slice approves it.

### Settings

- Settings is not a desktop primary nav item.
- The avatar menu exposes `Account settings` to `/settings` through the registry-backed settings utility helper.
- Mobile nav renders `Settings` when the user has `settings.view`.
- The Settings page links to `Notification Settings →` through the registry-backed settings utility helper.
- Product Metadata Diagnostics remains hidden and diagnostic-only.

### Mobile Nav Relationship

- Mobile nav is implemented in the same `TopNav.jsx` component and now uses the same current-live primary nav helper for primary operational links.
- Mobile ordering mirrors operational desktop ordering for Orders, Assignments, Relationships, Calendar, Clients, and Users, then adds a separator and Settings.
- Mobile links call `setOpen(false)` when selected.
- The mobile drawer also closes on pathname changes.
- Desktop and mobile primary nav rendering now share helper output; Settings remains mobile-specific utility behavior after the separator.

### Command Palette Relationship

- `CommandPalette` is opened from TopNav search controls and keyboard shortcut handling.
- TopNav passes the current `clientsPath` into `CommandPalette`.
- Command entries and permission filtering remain inside `src/components/nav/CommandPalette.jsx`.
- CommandPalette is not rendered from `currentNavigationRegistry`.
- Primary nav extraction must not change command labels, routes, search fallback behavior, or permission behavior.

## Current Authority Sources

### Permission Hooks

TopNav currently uses active permission hooks directly:

- `useCan(PERMISSIONS.CLIENTS_READ_ALL)`
- `useCan(PERMISSIONS.CLIENTS_READ_ASSIGNED)`
- `useCanAny([PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED, PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER])`
- `useCan(PERMISSIONS.RELATIONSHIPS_READ)`
- `useCan(PERMISSIONS.USERS_READ)`
- `useCan(PERMISSIONS.SETTINGS_VIEW)`

Derived visibility:

- `Clients`: `clients.read.all` or `clients.read.assigned`.
- `Assignments`: assigned or owner assignment read permission.
- `Relationships`: `relationships.read`.
- `Users`: `users.read`.
- Mobile `Settings`: `settings.view`.

### Role Fallback

- Current `TopNav` behavior is permission-only.
- No legacy role fallback remains in active TopNav rendering.
- Any registry helper must preserve permission semantics and must not reintroduce role-string authority.

### Loading And Resolver Timing

- Permission hooks resolve asynchronously.
- TopNav does not render explicit loading placeholders for permissioned nav links.
- Permissioned links are hidden until their hook reports `allowed`.
- Orders and Calendar render regardless of permission hook loading.
- The current behavior can create brief hidden-link flicker for permissioned links; this is existing behavior and must not be "fixed" during extraction.

### Hidden Versus Disabled

- TopNav hides inaccessible permissioned links.
- It does not render disabled, locked, upsell, placeholder, or future-mode items.
- Future Vendor/Client concepts must remain absent rather than disabled.

### Dynamic Clients Route

- `clientsPath` is derived inside TopNav from `clients.read.all`.
- Users with full client read access go to `/clients`.
- Users with assigned-only client access go to `/clients/cards`.
- TopNav also passes the same `clientsPath` to `CommandPalette`.
- This shared dynamic path is a key parity risk for any helper extraction.

### Assignment Visibility

- Assignment nav visibility is permission-driven, not relationship-driven.
- Assigned-company users can reach assignment packet routes through `/assignments`.
- Assignment nav must not imply canonical order visibility.

## Current Rendering Patterns

- Desktop primary nav entries render from `getCurrentPrimaryNavLinks()`.
- Mobile primary nav entries render from `getCurrentPrimaryNavLinks()`.
- The shared primary nav helper is backed by current-live registry metadata.
- The desktop ordering is: Orders, Assignments, Relationships, Calendar, Clients, Users.
- The mobile ordering is: Orders, Assignments, Relationships, Calendar, Clients, Users, separator, Settings.
- The avatar settings utility link and primary operational links are registry-backed through current-live helpers.
- TopNav imports `Menu` and `Search` icons from `lucide-react`; primary nav items are text-only.
- Active state is owned by the `NavItem` wrapper around `NavLink`.
- `NavItem` uses `end`, so active state is exact-path based. Nested routes such as `/orders/:id` do not keep `Orders` active through TopNav.
- Desktop and mobile now share primary helper output, reducing drift risk for the primary link set. Settings/account utility behavior remains separate by design.

## Migration Risks

- Permission flicker could change if helper extraction adds loading placeholders or default visibility.
- Loading-state behavior could regress if unresolved permissions are treated as allowed or errored permissions are treated differently.
- Mobile parity could regress because mobile nav is duplicated rather than derived from the desktop block.
- Clients dynamic routing could regress if `/clients` and `/clients/cards` are modeled as static metadata too early.
- Assignment visibility could leak if relationship metadata or mode metadata is mistaken for permission authority.
- Relationship visibility could leak if relationship existence is treated as a nav grant.
- Hidden-link behavior could regress if unavailable items are rendered as disabled or locked.
- Mode-aware leakage could occur if product-mode or shadow navigation metadata is imported into active TopNav.
- Future Vendor/Client contamination could occur if shadow-only portal entries are merged into current-live primary nav helpers.
- Command palette drift could occur because TopNav passes `clientsPath` into `CommandPalette` while command rendering remains independent.
- Dashboard cross-contamination could occur if the brand `/dashboard` behavior is folded into primary nav migration without preserving `DashboardGate`.
- Exact active-state behavior could change if helper extraction changes `NavLink end` semantics.

## Recommended Extraction Sequence

### Stage 1: Extract Current-Live Helper Only

Status: complete in Phase 9H28.

- Extract current primary nav entries into a current-live helper.
- Keep `TopNav` rendering unchanged.
- Preserve labels, routes, ordering, permission predicates, dynamic Clients route behavior, and active-state notes.
- Do not import product-mode, module, package, company setting, or shadow metadata.

### Stage 2: Add Parity Tests

Status: complete for helper and TopNav rendering parity.

- Test Staff/default desktop primary labels and order.
- Test mobile labels and order separately.
- Test Clients full-read route `/clients` and assigned-only route `/clients/cards`.
- Test assignment, relationship, users, and mobile settings visibility gates.
- Test that Activity, Vendor, Client Portal, Product Metadata Diagnostics, and future-mode entries are absent.

### Stage 3: Switch Desktop Rendering To Helper

Status: complete in Phase 9H29.

- Switch only desktop primary nav rendering to the helper.
- Preserve `NavItem` and `NavLink end` active-state behavior.
- Preserve Orders and Calendar always-visible behavior.
- Leave mobile nav unchanged until the next slice.
- Leave CommandPalette and dashboard behavior unchanged.

### Stage 4: Switch Mobile Rendering To Helper

Status: complete in Phase 9H30.

- Switch mobile nav only after desktop parity is proven.
- Preserve mobile-specific Settings placement after the separator.
- Preserve drawer close behavior on link click and pathname changes.
- Preserve mobile label/order parity.

### Stage 5: Diagnostics-Only Live Versus Shadow Comparison

- Compare current-live primary nav helper output with shadow product-mode nav in diagnostics only.
- Do not allow diagnostics to affect runtime rendering.
- Continue treating shadow metadata as future/non-authoritative.

## Guardrails

- Preserve Staff/default behavior exactly.
- Do not introduce mode-aware live nav.
- Do not introduce Vendor Portal or Client Portal concepts in live primary nav.
- Do not use product-mode or shadow metadata as live authority.
- Desktop and mobile primary nav now share the current-live helper; keep Settings/account utility behavior separate.
- Do not change permission semantics.
- Do not change route guards.
- Do not change dashboard behavior.
- Do not change CommandPalette behavior.
- Do not add module/company setting enforcement.
- Do not add migrations, permissions, or seeds.
- Keep rollback simple: return TopNav to its current hardcoded entries if helper rendering creates any drift.
