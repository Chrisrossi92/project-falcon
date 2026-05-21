# Falcon Competitive Research Synthesis

## Research Inputs

This synthesis consolidates the initial findings from:

- `DART_PLATFORM_ANALYSIS_INITIAL_FINDINGS.md`
- `JARO_PLATFORM_ANALYSIS_INITIAL_FINDINGS.md`
- `MOUNTAINSEED_PLATFORM_ANALYSIS_INITIAL_FINDINGS.md`

The goal is not competitor feature-copying. The goal is to translate the research into Falcon
product principles, implementation guardrails, and a practical planning sequence.

## Strategic Position

Falcon should become a modern operational command platform for appraisal work.

The competitive landscape is clear:

| Platform | Primary Identity |
|---|---|
| Dart | Fragmented legacy utility portal |
| MountainSeed | Dense operational utility platform |
| Jaro | Polished modern SaaS operational platform |
| Falcon | Modern operational command platform |

Falcon's opportunity is to combine Jaro-level polish with MountainSeed-level operational richness
while avoiding Dart-style fragmentation.

## Falcon Product Principles

1. Operational clarity outranks product cleverness.
   Important assignment context, workflow state, due dates, files, communication, and next actions
   should remain easy to find.

2. Calendar-first workflow is validated.
   Appraisal operations are deadline-oriented, inspection-driven, and schedule-aware. The dashboard
   should keep Calendar as the primary visual surface, with Orders close beside or below it.

3. Dense-but-readable operational data is acceptable.
   Falcon should not over-minimize commercial appraisal work. The product should support rich
   assignment context through hierarchy, grouping, progressive reveal, and scan-friendly density.

4. Context first, filters second.
   Users should see relevant work before they are asked to construct searches or filters. Filters
   should refine visible context, not replace it as the entry point.

5. Simple operational language beats stress and jargon.
   Labels should be direct and calm: `Calendar`, `Status`, `New`, `In Review`, `Needs Revisions`.
   Avoid language that sounds subjective, alarmist, or system-invented.

6. Attachments and files are workflow assets.
   Engagement letters, rent rolls, leases, financials, prior reports, photos, and revision files
   should be contextual to the order/workflow, not treated as a disconnected document dump.

7. Workflow surfaces should stay workflow-focused.
   Admin/vendor profile functions should be separated from order, calendar, and worklist surfaces.
   Team, profile, billing, credentials, vacation, and setup functions belong in dedicated admin or
   account areas unless they directly affect the current workflow.

8. Operational cohesion is the long-term differentiator.
   Falcon should avoid becoming a set of mini-tools. Actions should remain contextual to orders,
   calendar events, communication, files, and status movement.

## UI/UX Guardrails

- Keep Calendar first on operational dashboard surfaces.
- Keep Orders highly visible and close to Calendar.
- Use compact metrics as filters or orientation, not as KPI theater.
- Prefer status-based filters over subjective system judgments.
- Preserve useful density in tables and detail pages, but improve grouping and visual hierarchy.
- Use drawers, panels, and progressive reveal for secondary details without hiding critical context.
- Keep filters visible, understandable, and low-friction.
- Make order detail pages rich enough for real commercial workflow context.
- Keep activity and communication chronological, actor-aware, and workflow-relevant.
- Treat attachments as part of the order workflow and detail context.
- Use restrained color with status consistency. Avoid decorative color noise.
- Keep navigation workflow-aware and avoid adding standalone utilities unless the workflow demands it.
- Keep admin/profile/setup functions away from primary operational worklists.

## Anti-Patterns To Avoid

- Dart-style disconnected utility pages.
- Database-first UX where users must build a query before seeing useful context.
- KPI-heavy dashboards that fragment attention.
- Search-first operational entry points.
- Hidden critical order context.
- Over-minimized commercial workflows.
- Giant enterprise forms as the main experience.
- Giant unstructured communication logs.
- Detached upload/file utilities that are not connected to workflow.
- Alarmist language, stress language, or vague prioritization claims.
- Over-coloring and visual noise.
- Admin/vendor profile clutter inside workflow surfaces.
- AI gimmicks, fake metrics, and product theater.
- Broad feature additions that weaken existing route guards, permissions, RLS, or RPC paths.

## Near-Term Implementation Opportunities

1. Dashboard continuation: Calendar plus Orders refinement.
   Keep the current Calendar-first dashboard direction. Refine table density, status rail behavior,
   and calendar/order handoff interactions without adding backend data sources.

2. Order detail information architecture pass.
   Reorganize visible order context so commercial workflow data is richer but easier to scan:
   property, client/lender, due dates, site visit, participants, status, instructions, and activity.

3. Activity/communication presentation polish.
   Preserve audit visibility while improving timeline grouping, actor separation, and unresolved
   workflow cues where existing data supports it.

4. Attachment/files planning pass.
   Identify current file/attachment surfaces and design how files should appear as order workflow
   assets before implementing storage or upload changes.

5. Order Detail print/export packet planning.
   Admins need a safe way to print or export order detail records for invoicing support, workfile
   documentation, internal admin records, and later dispute/audit review. Plan two modes after the
   Order Detail layout stabilizes and before or alongside attachments/files: `Order Summary`
   should include the operational overview only with no activity log, while `Order Audit` should
   include the operational overview plus activity log. The first implementation should use already
   loaded order/activity data where possible, then evaluate whether a dedicated print route or PDF
   export is needed. Permissions, route guards, order visibility, activity visibility, RLS, and RPC
   boundaries must remain unchanged.

6. Orders filters refinement.
   Ensure Orders search/filtering remains visible and useful while preserving context-first entry.
   Filters should narrow the table, not dominate the page.

7. Admin/workflow separation cleanup.
   Keep Owner Setup, Team Access, profile, and setup surfaces distinct from dashboard/order workflow
   surfaces. Do not pull admin widgets into the operational dashboard.

## Medium-Term Implementation Opportunities

1. Workflow-native order workspace.
   Evolve order detail and drawer surfaces into a cohesive workspace: summary, dates, assignment,
   status actions, activity, communication, files, and instructions in one coherent structure.

2. Workflow-aware files.
   Add contextual attachment groups for engagement, source documents, report files, revision files,
   and internal materials, with permissions and storage rules designed before implementation.

3. Print-ready order records.
   Add printable/exportable order record packets once Order Detail hierarchy is stable. `Order
   Summary` should support operational/invoicing/workfile needs without activity history, and
   `Order Audit` should include activity history for internal records and later dispute/audit
   review. Prefer existing loaded data first; add dedicated print/PDF infrastructure only after
   confirming security, permissions, and data-shape needs.

4. Communication intelligence without gimmicks.
   Surface unresolved messages, recent changes, and workflow-relevant notes without replacing the
   activity log or inventing subjective priority.

5. Role-specific operational emphasis.
   Owner/Admin: company workload, calendar, status distribution, assignment load.
   Reviewer: in-review, returned, ready-for-client, review handoffs.
   Appraiser: assigned work, due soon, site visits, revision requests.

6. Advanced filters as progressive disclosure.
   Move toward simple default filters with expandable advanced controls, avoiding giant always-open
   enterprise search forms.

7. Commercial-first operational context.
   Expand detail surfaces to support commercial-specific data and documentation without forcing
   residential assumptions into the primary workflow.

## Recommended Implementation Sequence

1. Order Detail Operational Context Audit.
   Inspect current order detail, drawer, activity, date, participant, and status surfaces. Produce a
   narrow plan for grouping and scanability before code changes.

2. Order Detail Context Polish.
   Improve hierarchy and copy using existing data only. Do not add new backend fields or file
   storage behavior in this slice.

3. Activity/Communication Timeline Polish.
   Improve grouping, actor labels, and timeline scanability using existing activity data.

4. Order Detail Print Packet Design.
   Define print/export behavior for `Order Summary` and `Order Audit` after the Order Detail layout
   stabilizes. Keep the design read-only, visibility-safe, and based on existing order/activity data
   before considering a dedicated print route or PDF export.

5. Attachments/Files Workflow Design.
   Design file categories, order placement, permissions, and storage/RLS requirements before adding
   upload behavior.

6. Orders Filter/Context Refinement.
   Keep the Orders page context-first while improving visible filters and table scanability.

7. Dashboard Follow-On Polish.
   Continue small dashboard improvements only when they support Calendar plus Orders, not when they
   add dashboard theater.

## Recommended First Implementation Slice

Start with an Order Detail Operational Context Audit.

Reasoning:

- MountainSeed validates dense operational context.
- Jaro validates polished order detail organization.
- Dart shows the cost of detached utilities.
- Falcon already has order detail, drawer, activity, calendar, and status components that can be
  improved without new backend behavior.

The first slice should be documentation plus read-only inspection, followed by a narrow UI polish
slice using existing data only.

## Files And Components To Inspect Before Code Changes

Dashboard and calendar:

- `src/features/dashboard/DashboardPage.jsx`
- `src/features/dashboard/DashboardGate.jsx`
- `src/components/dashboard/DashboardCalendarPanel.jsx`
- `src/components/calendar/CalendarGrid.jsx`
- `src/components/calendar/TwoWeekCalendar.jsx`
- `src/components/calendar/MonthsCalendar.jsx`
- `src/components/calendar/EventChip.jsx`
- `src/components/calendar/EventPopover.jsx`
- `src/lib/calendar/normalizeCalendarEvent.js`
- `src/lib/hooks/useDashboardSummary.js`
- `src/lib/api/calendar.js`

Orders list, filters, and status workflow:

- `src/pages/orders/Orders.jsx`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/features/orders/OrdersFilters.jsx`
- `src/features/orders/columns/ordersColumns.jsx`
- `src/components/orders/table/OrdersTableRow.jsx`
- `src/components/orders/table/OrderStatusBadge.jsx`
- `src/features/orders/smartActions.js`
- `src/features/orders/components/SmartActionsControl.jsx`
- `src/lib/constants/orderStatus.js`
- `src/lib/workflow/orderWorkflow.js`
- `src/lib/workflow/orderWorkflowGuards.js`

Order detail and drawer context:

- `src/pages/orders/OrderDetail.jsx`
- `src/pages/orders/EditOrder.jsx`
- `src/components/orders/view/OrderDetailPanel.jsx`
- `src/components/orders/view/OrderSidebarPanel.jsx`
- `src/components/orders/view/OrderDatesPanel.jsx`
- `src/components/orders/view/OrderAdminInfoPanel.jsx`
- `src/components/orders/view/AppraiserDrawerSummary.jsx`
- `src/components/orders/view/QuickActionsDrawerPanel.jsx`
- `src/components/orders/drawer/OrderDrawerContent.jsx`
- `src/components/orders/drawer/OrderOpenFullLink.jsx`
- `src/lib/orders/normalizeOrder.js`
- `src/lib/mappers/orderMapper.js`

Activity and communication:

- `src/components/orders/view/OrderActivity.jsx`
- `src/components/activity/ActivityLog.jsx`
- `src/components/activity/DaySection.jsx`
- `src/components/activity/Row.jsx`
- `src/components/activity/Badges.jsx`
- `src/components/activity/timelineIntelligence.js`
- `src/lib/services/activityService.js`
- `src/lib/logactivity.js`

Files, uploads, and workflow assets:

- Search current code for `attachment`, `file`, `upload`, `document`, and storage usage before
  choosing a design.
- Inspect any existing Supabase storage policies, migrations, or Edge Functions before adding file
  behavior.

Admin, setup, and vendor/profile separation:

- `src/pages/admin/OwnerSetup.jsx`
- `src/pages/admin/UsersIndex.jsx`
- `src/features/company-invitations/CompanyInvitationsPanel.jsx`
- `src/features/company-invitations/InviteCompanyMemberModal.jsx`
- `src/pages/Settings.jsx`
- `src/routes/index.jsx`
- `src/components/shell/TopNav.jsx`
- `src/components/nav/CommandPalette.jsx`
- `src/lib/commandPalette/currentCommandPaletteCommands.js`

Tests to inspect alongside any implementation:

- `src/features/dashboard/__tests__/DashboardPage.test.jsx`
- `src/pages/orders/__tests__/OrderDetail.test.jsx`
- `src/components/orders/form/__tests__/OrderForm.test.jsx`
- `src/components/orders/form/__tests__/AssignmentFields.test.jsx`
- `src/components/shell/__tests__/TopNav.test.jsx`
- `src/components/nav/__tests__/CommandPalette.test.jsx`

## Explicit Implementation Constraints

- Do not add new backend writes during UI polish slices.
- Do not weaken order RLS, RPC mutation paths, route guards, or permissions.
- Do not introduce fake metrics or subjective prioritization.
- Do not move admin/vendor profile tasks into Calendar, Orders, or order detail surfaces.
- Do not add attachment upload/storage behavior before file workflow and security design are done.
- Do not build a giant search form as the primary Orders experience.
- Do not add new product-mode/module authority from dashboard or setup surfaces.
