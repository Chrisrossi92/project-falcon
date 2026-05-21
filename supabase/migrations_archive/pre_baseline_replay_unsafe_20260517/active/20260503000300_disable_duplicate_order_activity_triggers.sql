begin;

alter table public.orders disable trigger trg_orders_activity;
alter table public.orders disable trigger trg_orders_log;

comment on trigger trg_orders_activity on public.orders is
  'Disabled 2026-05-03: legacy duplicate activity trigger. Canonical order audit logging is handled by trg_orders_audit_upd / trg_orders_audit_ins.';

comment on trigger trg_orders_log on public.orders is
  'Disabled 2026-05-03: legacy duplicate activity trigger. Canonical order audit logging is handled by trg_orders_audit_upd / trg_orders_audit_ins.';

commit;
