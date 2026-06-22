begin;

grant select on table public.amcs to authenticated;

drop policy if exists amcs_select_for_readable_orders on public.amcs;
create policy amcs_select_for_readable_orders
on public.amcs
for select
to authenticated
using (
  exists (
    select 1
      from public.orders o
     where o.amc_id = amcs.id
       and public.current_app_user_can_read_order(o.id)
  )
);

comment on policy amcs_select_for_readable_orders on public.amcs is
  'Allows authenticated users to read AMC reference rows only when linked to an order the caller can already read. Supports security_invoker order projections without broad AMC table exposure.';

comment on table public.amcs is
  'Legacy AMC reference table. Browser reads remain RLS-constrained to rows linked from caller-readable orders for order projection compatibility.';

commit;
