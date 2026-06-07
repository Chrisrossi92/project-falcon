-- AMC-14B: keep shared order projections behind caller RLS after AMC scope hardening.

begin;

alter view public.v_orders_frontend_v4 set (security_invoker = true);
alter view public.v_orders_active_frontend_v4 set (security_invoker = true);
alter view public.v_orders_list set (security_invoker = true);
alter view public.v_orders_list_with_last_activity set (security_invoker = true);

comment on view public.v_orders_frontend_v4 is
  'AMC-14B data isolation audit: shared order projection includes operations_scope and runs as security_invoker so authenticated callers remain constrained by orders RLS. Runtime workspace selection must still pass an explicit operations_scope filter.';

comment on view public.v_orders_active_frontend_v4 is
  'AMC-14B data isolation audit: active shared order projection inherits v_orders_frontend_v4 caller/RLS behavior and must be filtered by explicit operations_scope by workspace-aware services.';

comment on view public.v_orders_list is
  'AMC-14B data isolation audit: order list compatibility projection runs as security_invoker so caller RLS remains authoritative.';

comment on view public.v_orders_list_with_last_activity is
  'AMC-14B data isolation audit: order list activity projection runs as security_invoker so caller RLS remains authoritative.';

commit;
