-- Active-only frontend view for dashboards.
-- Mirrors v_orders_frontend_v4 but filters out completed/cancelled rows.

create or replace view public.v_orders_active_frontend_v4 as
select *
from public.v_orders_frontend_v4
where lower(coalesce(status::text, '')) not in ('completed', 'complete', 'cancelled', 'canceled');

grant select on public.v_orders_active_frontend_v4 to authenticated;
grant select on public.v_orders_active_frontend_v4 to anon;
