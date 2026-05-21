begin;

drop policy if exists "allow_admin_update_orders" on public.orders;
drop policy if exists "orders_appraiser_update_own" on public.orders;
drop policy if exists "orders_delete_admin" on public.orders;
drop policy if exists "orders_insert_admin" on public.orders;
drop policy if exists "orders_update_admin" on public.orders;
drop policy if exists "orders_update_lifecycle_visibility" on public.orders;
drop policy if exists "orders_update_my_assigned" on public.orders;

create policy "orders_insert_company_authorized"
on public.orders
for insert
to authenticated
with check (
  public.current_app_user_can_create_order()
  and coalesce(company_id, public.current_company_id()) = public.current_company_id()
);

create policy "orders_update_company_authorized"
on public.orders
for update
to authenticated
using (
  public.current_app_user_can_update_order_row(
    company_id,
    appraiser_id,
    assigned_to,
    reviewer_id,
    status
  )
)
with check (
  public.current_app_user_can_update_order_row(
    company_id,
    appraiser_id,
    assigned_to,
    reviewer_id,
    status
  )
);

create policy "orders_delete_company_authorized"
on public.orders
for delete
to authenticated
using (
  public.current_app_user_has_current_company()
  and coalesce(company_id, public.default_company_id()) = public.current_company_id()
  and public.current_app_user_has_any_permission(array['orders.delete', 'orders.archive'])
);

comment on policy "orders_insert_company_authorized" on public.orders is
  'Slice 7F1 order insert policy. Requires current-company create authorization; company ownership is assigned by trigger from current_company_id().';

comment on policy "orders_update_company_authorized" on public.orders is
  'Slice 7F1 order update policy. Requires current-company update authorization through current_app_user_can_update_order_row().';

comment on policy "orders_delete_company_authorized" on public.orders is
  'Slice 7F1 order delete policy. Preserves current hard-delete behavior for users with order delete/archive authority, scoped to current company.';

commit;
