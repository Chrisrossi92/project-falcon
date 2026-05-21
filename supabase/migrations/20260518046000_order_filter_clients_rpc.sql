begin;

create or replace function public.rpc_order_filter_clients()
returns table (
  client_id bigint,
  client_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_authorized boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  v_authorized :=
    public.current_app_user_has_permission('orders.read.all')
    or public.current_app_user_has_permission('orders.read.assigned')
    or public.current_app_user_has_permission('clients.read.all')
    or public.current_app_user_has_permission('clients.read.assigned');

  if not v_authorized then
    raise exception 'order_filter_clients_permission_required'
      using errcode = '42501';
  end if;

  return query
  select distinct
    c.id as client_id,
    c.name as client_name
  from public.orders o
  join public.clients c
    on c.id = o.client_id
   and coalesce(c.company_id, public.default_company_id()) = v_company_id
  where o.client_id is not null
    and coalesce(o.company_id, public.default_company_id()) = v_company_id
    and nullif(trim(c.name), '') is not null
    and public.current_app_user_can_read_order(o.id)
  order by c.name asc, c.id asc;
end;
$$;

revoke all privileges on function public.rpc_order_filter_clients() from public, anon;
grant execute on function public.rpc_order_filter_clients() to authenticated, service_role;

comment on function public.rpc_order_filter_clients() is
  'Phase 8C5G4B1 safe Orders filter client option projection. Returns distinct current-company clients attached to readable source orders only; no contact fields, order details, metrics, borrower data, or cross-company clients.';

commit;
