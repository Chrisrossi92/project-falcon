# Falcon Navigation Composition

## Purpose

This document defines how Falcon should eventually compose navigation, dashboards, command palette entries, empty states, and upgrade prompts from enabled modules.

It is planning documentation only. It does not change route config, navigation components, dashboards, permission seeds, billing logic, onboarding UI, database migrations, or frontend behavior.

The module registry defines available product surfaces. The permission matrix defines authority inside those surfaces. The product-mode composition matrix defines which modules are enabled, optional, hidden, and lane-separated by mode. This document defines how those inputs should become a complete, mode-native workspace.

The implementation slice map in `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md` defines the safe future build order for turning this registry into runtime constants, resolvers, shadow registries, and later package/company settings behavior.

The mode-specific dashboard and navigation blueprint in `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md` defines the intended dashboard names, daily questions, navigation lanes, mobile expectations, command palette expectations, empty states, upgrade surfaces, and anti-reuse rules for each product mode.

The mode-native empty states and upgrade surfaces blueprint in `docs/FALCON_MODE_EMPTY_STATES_AND_UPGRADES.md` defines first-run, no-data, filtered-empty, permission-limited, scoped, setup-needed, and contextual upgrade behavior for each product mode.

The mode-native language guide in `docs/FALCON_MODE_LANGUAGE_GUIDE.md` defines preferred labels, avoided terms, copy boundaries, and safe vocabulary for navigation, dashboards, empty states, command palette entries, upgrade prompts, notifications, and activity labels.

The product-mode guardrails in `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md` define forbidden UI patterns, isolation rules, visibility-leak prevention, safe defaults, and future implementation review checks.

## Shadow Composition Implementation Lock

Phase 9H now provides metadata-only shadow composition diagnostics for the future composition model described in this document.

Completed diagnostics:

- Navigation: produces mode/module nav entries from module registry metadata.
- Command palette: produces mode/module command entries from module registry metadata.
- Dashboard: produces mode-native dashboard shell, section, and widget metadata.
- Empty states: produces mode-native empty-state metadata.
- Upgrade prompts: produces contextual upgrade prompt metadata.
- Routes: produces mode/module route concept diagnostics and permission metadata.
- Integrity guard: verifies product modes, module registry IDs, shadow diagnostics, hidden Vendor/Client concept boundaries, Hybrid lane separation, metadata-only permissions, unknown-input safety, and import safety.
- Developer diagnostics page: `/settings/product-metadata-diagnostics` displays product modes, module registry metadata, dependencies, and shadow navigation, route, command palette, dashboard, empty-state, and upgrade-prompt outputs.
- Navigation parity audit: `docs/FALCON_NAVIGATION_PARITY_AUDIT.md` compares current active navigation, route authority, command palette links, dashboard links, assignment links, and relationship links against shadow navigation expectations before any live migration.
- Command palette parity audit: `docs/FALCON_COMMAND_PALETTE_PARITY_AUDIT.md` compares current active command behavior, command gates, route behavior, naming/copy, and settings/assignment/relationship exposure against shadow command expectations before any live command migration.
- Active command palette migration plan and lock: `docs/FALCON_ACTIVE_COMMAND_PALETTE_MIGRATION_PLAN.md` defines the behavior-preserving path from active hardcoded command construction to current-live helpers and records the completed helper-backed active CommandPalette migration before any runtime mode-aware command composition.
- Dashboard parity audit: `docs/FALCON_DASHBOARD_PARITY_AUDIT.md` compares `DashboardGate`, Staff/default dashboard behavior, assignment-native dashboard behavior, links/actions, role/permission lenses, and active dashboard safety against shadow dashboard expectations before any live dashboard migration.

Safety boundary:

- These diagnostics do not drive `TopNav`, mobile navigation, `DashboardGate`, dashboard pages, routes, or active empty states. Active `CommandPalette` now reads current-live command helpers only, not shadow or product-mode diagnostics.
- Shadow composition imports are allowed only in test files and the protected read-only diagnostics page.
- The diagnostics route is protected by existing `settings.view`, uses local page state only, performs no writes, and is non-authoritative.
- Shadow entries are diagnostic metadata only.
- Permission domains in shadow entries do not authorize visibility.
- Upgrade prompt metadata does not create billing, package, onboarding, or entitlement authority.
- Unknown modes and unknown module IDs return safe empty diagnostics rather than throwing.
- Static scans are part of the validation baseline and confirm no active product-surface imports exist outside the diagnostics page.

Migration readiness checklist:

- Keep `docs/FALCON_NAVIGATION_PARITY_AUDIT.md` current before any active navigation work.
- Keep `docs/FALCON_COMMAND_PALETTE_PARITY_AUDIT.md` current before any active command palette work.
- Keep `docs/FALCON_ACTIVE_COMMAND_PALETTE_MIGRATION_PLAN.md` current now that active command construction renders from current-live helpers.
- Keep `docs/FALCON_DASHBOARD_PARITY_AUDIT.md` current before any active dashboard shell or widget work.
- Manually review diagnostics output for all product modes before active wiring.
- Understand Staff current nav/dashboard parity before replacing active Staff surfaces.
- Preserve assignment-only dashboard safety before replacing dashboard surfaces.
- Keep Vendor and Client hidden-surface guardrails passing.
- Confirm Hybrid lane metadata preserves internal, network, packet, and client separation.
- Preserve current order-search fallback, command labels, route paths, permission loading/error fallback, and hidden-future-command behavior during any further active command migration.
- Do not introduce mode-aware command composition until company/module settings, routes, and safe data contracts exist.
- Map and review dashboard behavior before active dashboard shell or widget registration changes.
- Map route exposure before active route authority or route visibility changes.
- Keep permission metadata non-authoritative until explicit authorization wiring is designed.
- Do not wire runtime composition without a fallback plan to current behavior.

## Core Doctrine

- Navigation should derive from enabled modules plus user permissions.
- Product mode decides lane structure.
- Modules register navigation, dashboard, command, setup, empty-state, and upgrade surfaces.
- Permissions decide whether a user can see or use a registered item.
- Hidden modules should not appear as disabled clutter.
- Upgrade prompts should be contextual and sparse.
- Dashboard shells should be mode-specific.
- Dashboard widgets should come from enabled modules.
- Command palette entries should come from enabled modules plus permissions.
- Empty states should feel native to the current mode.
- Surface labels and user-facing copy should use the current mode's vocabulary.
- Internal architecture and authorization terms should not leak into normal UI copy.
- Product-mode UX should follow the guardrails and anti-pattern checks before active implementation.
- Relationship state alone grants no operational visibility.
- Assignment packets, readable orders, readable clients, and portal scopes remain the visibility boundary.

## Composition Inputs

Future composition should resolve surfaces from these inputs:

- Product mode.
- Enabled module bundle.
- Module dependency status.
- Active company context.
- User permission set.
- Object visibility scope, such as readable order, readable client, assignment packet, or portal account.
- Setup and onboarding state.
- Package or entitlement state for contextual upgrade prompts.

The output should be a coherent workspace, not a list of everything Falcon could theoretically do.

## Navigation Composition Doctrine

Navigation should be assembled in this order:

1. Resolve the product mode and its lane structure.
2. Resolve enabled modules and required dependencies.
3. Collect navigation entries registered by enabled modules.
4. Filter entries by route/nav permissions.
5. Apply mode-specific labels, grouping, and ordering.
6. Apply object-count or attention metadata only after visibility is resolved.
7. Add contextual upgrade prompts only where the current lane has a natural reason to care.

Navigation should not expose unavailable modules as disabled menu items. A user in Vendor Portal Mode should not see internal Staff/AMC order operations as a locked product area. A client user should not see internal review, assignment, or vendor management lanes. Hidden modules are hidden because they are not part of that mode's operating surface.

Future module navigation entries should record:

- `module_id`
- `nav_entry_id`
- Display label.
- Route target.
- Product-mode lane.
- Required modules.
- Required permissions.
- Optional any-of permission set.
- Visibility scope, if object-derived.
- Empty-state reference.
- Upgrade prompt reference, if contextually relevant.
- Sort order.
- Mode-specific label overrides.

## Dashboard Composition Doctrine

The dashboard shell should be mode-specific. A dashboard is not just a grid of reusable widgets; it should answer the mode's primary daily question.

Dashboard widgets should come from enabled modules and then be filtered by permissions and readable data scope. Widgets should not leak concepts from hidden modules. Assignment-only users should receive assignment packet queues, not a blank or broken internal order cockpit. Client Portal users should receive request/status/report surfaces, not internal workflow queues.

Future dashboard widget registrations should record:

- `module_id`
- `widget_id`
- Display title.
- Dashboard lane or region.
- Supported product modes.
- Required modules.
- Required permissions.
- Data source contract.
- Visibility scope.
- Empty-state reference.
- Upgrade prompt reference, if contextually relevant.
- Priority and ordering.

Dashboard expectations by surface:

- Staff dashboards should answer what internal orders need attention, who owns them, and what blocks delivery.
- AMC dashboards should answer which client orders need intake, assignment, vendor follow-up, review, or SLA escalation.
- Vendor dashboards should answer which assignment packets need acceptance, scheduling, work, submission, or correction.
- Client dashboards should answer which requested orders are pending, in progress, delivered, or need client action.
- Hybrid dashboards should separate internal operations from network work into clear lanes.

## Command Palette Doctrine

Command palette entries should derive from enabled modules plus permissions. The palette is an acceleration surface, not an escape hatch around product-mode design.

Current implementation lock: active `CommandPalette` uses `getCurrentCommandPaletteCommands()` and `getCurrentOrderSearchFallback()` for current-live Staff/default command construction and order-search fallback only. This is not mode-aware command composition, does not import shadow metadata, and does not add Vendor/Client future commands.

Command entries should not expose hidden module concepts. Assignment-only users should not see canonical order commands. Client Portal users should not see internal workflow, review, assignment, or vendor management commands. Staff users should not see AMC panel administration commands unless those modules are enabled.

Future command registrations should record:

- `module_id`
- `command_id`
- Label.
- Search keywords.
- Route or action target.
- Required modules.
- Required permissions.
- Required object visibility scope, if contextual.
- Supported product modes.
- Hidden product modes.
- Dangerous-action flag.

Dangerous commands should be rare, explicit, and permission-gated. Delete, archive, billing, integration-secret, role-management, tenant-admin, assignment-revoke, and relationship-archive actions should not be casual global commands.

## Empty State Doctrine

Empty states should be mode-native.

An empty state may suggest:

- A setup step.
- A next operational action.
- A safe explanation of why nothing appears.
- A contextual upgrade where the user has a natural reason to care.

Empty states should never imply the product is broken, incomplete, or a stripped-down version of another mode. Vendor Portal empty states should speak in assignment packet language. Client Portal empty states should speak in request, status, document, and report language. Staff and AMC empty states should use their own operational vocabulary.

Future empty-state registrations should record:

- `module_id`
- `empty_state_id`
- Supported product modes.
- Surface type, such as nav lane, dashboard widget, list, detail, or setup step.
- Trigger condition.
- Headline and body copy.
- Primary action.
- Secondary action.
- Setup step reference.
- Upgrade prompt reference, if appropriate.

## Upgrade Prompt Doctrine

Upgrade prompts should be sparse. Falcon should not become a locked-feature graveyard.

Use upgrade prompts only where:

- The user is already working in a related enabled module.
- The unavailable module would clearly extend the current workflow.
- The prompt does not interrupt core work.
- The prompt does not replace an empty state that should instead offer a setup or next action.

Do not create nav clutter from unavailable modules. Do not place persistent locked lanes beside daily work. Do not show upgrade prompts for hidden module concepts that the mode should not expose.

Future upgrade prompt registrations should record:

- `module_id`
- `upgrade_prompt_id`
- Trigger surface.
- Supported product modes.
- Required current module context.
- Required package/entitlement condition.
- Message and call to action.
- Destination, such as billing, sales contact, or setup request.
- Suppression rules.

## Future Registry Model

Each module should eventually be able to register:

- Module navigation entries.
- Module dashboard widgets.
- Module command entries.
- Module setup steps.
- Module empty states.
- Module upgrade prompts.
- Module dependency requirements.

Dependency requirements should be explicit. Dependent modules should not render partial surfaces when required foundations are disabled. For example, `vendor_portal` depends on assignment packet foundations; `client_portal` depends on client/order scoped access; `billing` depends on tenant administration and package context; `integrations` depends on tenant administration and integration configuration authority.

Future composition resolution should follow this order:

1. Resolve active company and product mode.
2. Resolve enabled modules and dependency satisfaction.
3. Select the mode shell and lane structure.
4. Collect registered surfaces from enabled modules.
5. Filter by route/nav/dashboard/command permissions.
6. Filter by object visibility scope where applicable.
7. Apply setup and empty-state conditions.
8. Apply sparse contextual upgrade prompts.
9. Return a complete mode-native workspace model.

## Product Mode Examples

### Staff Appraisal Mode

Navigation expectation:

- Dashboard.
- Orders.
- Calendar.
- Clients.
- Team Access.
- Reports/Analytics if enabled.
- Settings.

Dashboard expectation:

- Internal order attention queues.
- Due-soon and overdue pressure.
- Appraiser and reviewer workload.
- Pending review, revision, and delivery queues.
- Calendar pressure and recent operational activity.

Command expectation:

- New order, find order, update assigned work, add client, invite team member, open calendar, and review-related commands where permitted.
- No AMC panel administration, vendor portal execution, or client portal commands unless those modules are enabled.

Empty-state expectation:

- Guide the user toward creating orders, adding clients, inviting team members, or completing setup.
- Do not imply that AMC, vendor, or client portal modules are missing from the workspace.

Upgrade expectation:

- Contextual prompts may appear around client portal, analytics, AI, integrations, reports, or Continental AMC Panel participation.
- Prompts should not interrupt order execution.

### AMC Operations Mode

Navigation expectation:

- AMC Dashboard.
- Orders / Intake.
- Assignments.
- Vendor Panel.
- Clients / Lenders.
- Reviews / QC.
- Calendar / SLA.
- Analytics and integrations if enabled.
- Settings.

Dashboard expectation:

- Intake and unassigned order queues.
- Vendor offer and acceptance status.
- Assignment SLA pressure.
- Review and revision queues.
- Client/lender exceptions.
- Vendor performance exceptions.

Command expectation:

- Intake order, offer assignment, find vendor, open relationship, review order, escalate SLA, and client/lender commands where permitted.
- No vendor-only packet execution shell for internal AMC users.
- No client-only request shell for internal AMC users.

Empty-state expectation:

- Guide setup of clients/lenders, vendor relationships, assignment packets, and intake.
- Use AMC operations language rather than Staff Appraisal language where terminology differs.

Upgrade expectation:

- Contextual prompts may introduce vendor portal, client portal, analytics, integrations, billing, or AI where those workflows are already relevant.

### Vendor Portal Mode

Navigation expectation:

- Dashboard.
- Assignments.
- Calendar, if assignment dates exist or scheduling is enabled.
- Notifications.
- Profile / Settings.

Dashboard expectation:

- Offered packets awaiting response.
- Accepted work in progress.
- Due or expiring assignments.
- Submitted or completed packet history where appropriate.
- Assignment-scoped activity.

Command expectation:

- Open packet, accept offer, decline offer, start work, submit work, update vendor profile, and view assignment timeline where permitted.
- No canonical order list, internal client CRM, internal review workflow, team operations, or AMC administration commands.

Empty-state expectation:

- Explain that no packets are currently assigned or offered.
- Provide profile/setup guidance if required for future assignment readiness.
- Never make the vendor experience feel like a disabled Staff account.

Upgrade expectation:

- Staff Appraisal Mode may be introduced only as a contextual growth path for vendors that want their own internal operations workspace.
- No persistent locked Staff/AMC nav.

### Client Portal Mode

Navigation expectation:

- Dashboard.
- Requests / Orders.
- Reports / Documents.
- Messages or activity where enabled.
- Billing if packaged for the client relationship.
- Settings.

Dashboard expectation:

- Submitted requests and status.
- Orders needing client action.
- Delivered reports/documents.
- Recent client-visible messages or activity.
- Billing or integration notices only when enabled.

Command expectation:

- Submit request, view status, download report, upload required document, message operations, and manage client settings where permitted.
- No internal workflow transition, review, vendor assignment, canonical order table, or team-access commands.

Empty-state expectation:

- Guide request submission, report/document retrieval, or account setup.
- Use client-facing vocabulary, not internal operational statuses.

Upgrade expectation:

- Contextual prompts may point to integrations, analytics, billing, or advanced reporting for client organizations.
- No locked internal operations graveyard.

### Hybrid / Ecosystem Mode

Navigation expectation:

- Internal Operations lane for owned orders, clients, reviews, calendar, and team work.
- Network Work lane for assignments, relationships, vendor/client participation, and packet work.
- Intelligence lane for analytics, reports, and AI where enabled.
- Administration lane for settings, billing, integrations, onboarding, and tenant administration where enabled.

Dashboard expectation:

- Clear lane separation between owned internal work and external network packets.
- Separate counts and queues for owned orders versus assignment packets.
- Relationship and assignment attention without implying relationship state grants order access.
- Cross-surface summaries only where visibility scope allows.

Command expectation:

- Commands should be lane-aware.
- Owned-order commands should target canonical order surfaces.
- Packet commands should target assignment surfaces.
- Relationship commands should not imply order/client visibility.

Empty-state expectation:

- Empty states should clarify whether the lane is internal operations, sent network work, received network work, client portal work, or setup/admin.
- They should not blend internal and network concepts into one ambiguous queue.

Upgrade expectation:

- Hybrid mode can expose contextual upgrades across AMC, vendor, client, analytics, AI, billing, and integrations.
- Prompts must stay lane-specific so users understand which operating surface is being expanded.

## Anti-Clutter Rules

- Do not render hidden modules as disabled nav items.
- Do not show a mode user commands for surfaces outside the enabled module set.
- Do not reuse Staff or AMC cockpit language for Vendor Portal or Client Portal dashboards.
- Do not mix assignment packets into canonical order lanes without an explicit Hybrid/Ecosystem separation.
- Do not show upgrade prompts where a setup step or empty-state explanation is the correct response.
- Do not let route/nav permission imply workflow/action permission.
- Do not let relationship state imply operational visibility.
- Do not let a sparse module bundle feel like a broken account.
