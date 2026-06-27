# Falcon Premium Experience QA Guide

## Purpose

This guide defines the lightweight authenticated local QA path for Falcon Premium Experience
reviews. It exists so future visual QA is not blocked by sign-in setup, unclear environment
assumptions, or missing state coverage.

This is a documentation-only guide. It does not create credentials, change authentication, change
runtime code, seed data, alter permissions, or approve production access.

Implementation-complete does not mean visually approved. A premium slice is visually approved only
after the relevant screens are reviewed in a browser with an authenticated QA session, or after a
specific blocker and follow-up path are documented in the owning experience plan.

## Start The Local App

Before starting Falcon locally:

- Verify which Supabase target the local app will use.
- Confirm the target is local development, an approved staging project, or another explicitly
  approved QA target.
- Never assume `.env.local` or `.env.staging.local` points to disposable data.
- Do not run browser QA against legacy production/archive or an unknown hosted project.
- Do not print, copy, or document secret values while preparing QA.

Typical local startup:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

If that port is already in use, allow Vite to choose another local port and record the actual URL in
the relevant experience plan. Stop the local server after QA is complete.

## Required Environment Assumptions

The browser-facing environment must include the normal frontend Supabase variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY` or `VITE_GOOGLE_MAPS_KEY` when map surfaces are being reviewed

Environment rules:

- No frontend environment may use a Supabase service-role key.
- Local QA may use local Supabase or a hosted staging target, but the target must be recorded.
- The approved AMC staging Supabase project ref is `voompccpkjfcsmehdoqu`.
- Legacy hosted production/archive is `okwqhkrsjgxrhyisaovc` and must not be used for Premium
  Experience mutation or exploratory QA.
- Browser QA should use disposable QA data, seeded fixtures, or approved staging smoke data. Do not
  use real customer, borrower, lender, vendor, payment, bank, tax, or private production data.

## Authenticated Test States

Falcon routes require a real authenticated session. Browser QA that reaches only the sign-in screen
is a blocked QA attempt, not visual approval of the target surface.

Use approved disposable local or staging QA personas. Credentials must come from an approved local
secret store, staging secret store, or a human-provided browser session. Do not add credentials to
this guide or to experience plans.

Suggested representative personas, when they already exist in fixtures or smoke-test setup:

| Persona | Workspace | Best QA Coverage |
| --- | --- | --- |
| Owner/Admin | Internal Operations | Admin-level Order Detail, Orders table, lifecycle actions, assignment controls |
| Reviewer | Internal Operations | Reviewer Order Detail view, review-oriented Smart Actions, assigned work queues |
| Appraiser | Internal Operations | Appraiser Order Detail view, appraiser-focused actions, assigned work visibility |
| AMC Owner/Admin | AMC Operations | AMC orders, procurement/bids, candidate and vendor assignment surfaces |
| Vendor Manager | Vendor Workspace | Vendor-facing assigned work, bid response, document access, invoice states |
| Wrong Vendor Manager | Vendor Workspace | Access-denial and tenant-isolation checks for AMC/vendor surfaces |
| Internal Operations User | Internal Operations | Normal internal workspace access without AMC vendor workspace data |

The AMC personas align with `docs/amc/AMC_FULL_MVP_SMOKE_TEST_PLAN.md`. That smoke plan defines
roles and capabilities, not reusable public credentials.

## Known QA Blockers

Track these blockers explicitly in the owning experience plan when they occur:

- Local auth is required. A redirect to `Sign in to Falcon` means the target page was not visually
  reviewed.
- Sandbox browser limitations can prevent local browser launch, local server access, or reuse of a
  signed-in Chrome session.
- The in-app browser may not share cookies or auth state with the user's normal browser.
- A local server may require explicit sandbox network permission before browser automation can
  reach `127.0.0.1` or `localhost`.
- Vite/Tailwind may emit an existing ambiguity warning for dynamic easing classes such as
  `ease-[${EASING}]`. Document the warning if it appears, but do not treat it as a visual QA pass
  or failure unless it affects rendered UI.
- Missing seeded data can block states such as no files, files present, procurement present,
  procurement absent, loading, error, saved views, or expanded drawers.

## Order Detail QA Checklist

Review representative authenticated states:

- Internal order.
- AMC order.
- Reviewer view.
- Appraiser view.
- Owner/admin view.
- Order with files.
- Order without files.
- Order with procurement/bids.
- Order without procurement/bids.
- Dialogs and menus, including More actions and Print Packet where available.
- Desktop, tablet/narrow, and mobile/narrow viewports.

Check:

- First viewport clarity.
- Order identity, property/address, status, due dates, assigned people, workspace/context, and
  primary next action are easy to distinguish.
- Smart Action has clearer priority than secondary actions.
- Secondary action groups wrap without clipping.
- Files states are calm and preserve the existing action meaning.
- Procurement/bid states are readable and do not change vendor or bid behavior.
- Dialog title, warning, field, submit, cancel, loading, and error hierarchy is clear.
- Activity, Notes, Contacts, Map, and deep detail sections feel secondary to the main workflow.
- Hover and focus behavior appears only on actual interactive controls.
- Passive content does not look clickable.
- No awkward layout shifts, clipped text, clipped buttons, or broken wrapping.

## Orders QA Checklist

Review representative authenticated states:

- Default Orders view.
- Filtered Orders view.
- Search results.
- No-results or empty state.
- Loading state when easy to simulate.
- Error state when a safe test harness supports it.
- Saved Views open.
- Expanded row drawer.
- Desktop width.
- Tablet/narrow width.
- Mobile/narrow width with the existing horizontal table scroll strategy.

Check:

- Table scan speed.
- Property/address, client, status, due date, assigned user, and workspace/context are easy to
  compare.
- Supporting metadata is visually quieter than primary row fields.
- Row hover, focus, selected, and expanded states are consistent.
- Nested row actions do not visually compete with the row or accidentally trigger expansion.
- Filters and search wrap cleanly.
- Active chips are readable and current filter state is visible.
- Reset and clear controls are available but quiet.
- Saved Views popover does not clip awkwardly.
- Expanded drawer panels stack cleanly.
- Horizontal table scroll works without clipping fields or actions.
- Empty, loading, and error states feel calm.
- Passive cells do not look independently clickable.

## Recording QA Outcomes

Each premium experience plan should maintain a browser QA section for the relevant surface. Record:

- Sprint or review date.
- Local app URL.
- Environment target classification, such as local Supabase or approved staging.
- Browser used and whether browser automation was available.
- Authenticated persona, role, and workspace. Do not record credentials.
- Representative states checked.
- Viewport sizes or approximate desktop/tablet/mobile widths.
- Visual issues found.
- Fixes made, if any.
- Deferred issues, if any.
- Validation commands run after any code changes.
- Final QA status: `passed`, `needs fixes`, `attempted`, or `blocked`.

If auth, browser launch, seeded data, or environment setup blocks visual inspection, mark the pass as
`blocked` or `attempted`. Do not describe the surface as visually approved until the target UI has
actually rendered in an authenticated browser session.

## Approval Rule

Premium Experience implementation can be code-complete, test-complete, and documentation-complete
without being visually approved. Visual approval requires browser evidence from the target surface
or a documented exception accepted for that slice.
