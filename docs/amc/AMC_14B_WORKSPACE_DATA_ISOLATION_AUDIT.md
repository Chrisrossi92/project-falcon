# AMC-14B Workspace Data Isolation Audit

Run date: 2026-06-07.

Scope:

- Shared order projections and order list/search wrappers.
- Order assignment, assignment candidate, bid request/response, selected-bid assignment offer, and
  assignment invitation RPC families.
- Vendor Workspace available work, assigned orders, documents, reports, invoices, payments, profile,
  and dashboard summary RPC families.
- Client management/list/detail wrappers.
- Notifications and activity/audit-log surfaces.
- Dashboard KPI/order summary query wrappers.

Findings:

- AMC Vendor Workspace RPCs are scoped to `current_company_id()`, active AMC vendor relationships,
  opaque work keys or token keys, and AMC-scoped orders where relevant.
- AMC procurement and vendor-assignment RPCs guard owner company, current user permissions, readable
  order access, and `orders.operations_scope = 'amc_operations'` before returning candidates or
  creating vendor appraisal work.
- Notification list/count/bulk helpers were hardened in the prior AMC-14B slice with
  `p_operations_scope` and client-side defensive filtering.
- Shared order query wrappers pass explicit `operations_scope` filters for workspace-aware order
  lists and dashboard KPI counts.
- High-risk gap found: later order projection migrations set `v_orders_frontend_v4`,
  `v_orders_active_frontend_v4`, `v_orders_list`, and `v_orders_list_with_last_activity` to
  `security_invoker = false`. Because these projections are queried directly by frontend services,
  they must run with caller/RLS semantics.

Fix in this slice:

- `20260607102000_amc_workspace_data_isolation_audit.sql` restores `security_invoker = true` on the
  shared order projections and documents that selected-workspace isolation still requires explicit
  `operations_scope` filters at service/RPC call sites.

Deferred model review:

- Per-operation ownership and role assignment remain a broader model audit. Current hardening keeps
  same-login multi-operation access intact and prevents projection/RLS bypass on shared order views,
  but it does not introduce a new operation-role table.
