begin;

drop policy if exists "orders_insert_company_authorized" on public.orders;
drop policy if exists "orders_update_company_authorized" on public.orders;
drop policy if exists "orders_delete_company_authorized" on public.orders;

create policy "orders_insert_rpc_only"
on public.orders
for insert
to authenticated
with check (false);

create policy "orders_update_rpc_only"
on public.orders
for update
to authenticated
using (false)
with check (false);

create policy "orders_delete_rpc_only"
on public.orders
for delete
to authenticated
using (false);

comment on policy "orders_insert_rpc_only" on public.orders is
  'Phase 10G3: direct authenticated browser/table inserts are blocked. Use guarded order creation RPCs such as rpc_create_order().';

comment on policy "orders_update_rpc_only" on public.orders is
  'Phase 10G3: direct authenticated browser/table updates are blocked. Use guarded order mutation RPCs such as rpc_update_order(), rpc_transition_order_status(), and rpc_order_number_override().';

comment on policy "orders_delete_rpc_only" on public.orders is
  'Phase 10G3: direct authenticated browser/table deletes are blocked. Archive/delete behavior must use a guarded RPC path.';

commit;
