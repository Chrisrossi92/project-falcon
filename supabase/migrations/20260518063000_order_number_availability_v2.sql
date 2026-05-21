begin;

create or replace function public.rpc_is_order_number_available_v2(
  p_order_number text,
  p_order_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_order_number text := btrim(coalesce(p_order_number, ''));
  v_conflicting_order_id uuid := null;
begin
  if auth.role() <> 'service_role'
     and public.current_app_user_id() is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if auth.role() <> 'service_role'
     and not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if v_order_number = '' then
    raise exception 'order_number_required'
      using errcode = '22023';
  end if;

  if length(v_order_number) > 80 then
    raise exception 'order_number_too_long'
      using errcode = '22023';
  end if;

  if p_order_id is not null
     and not exists (
       select 1
       from public.orders o
       where o.id = p_order_id
         and coalesce(o.company_id, public.default_company_id()) = v_company_id
     ) then
    raise exception 'order_not_found_in_current_company'
      using errcode = '42501';
  end if;

  select o.id
    into v_conflicting_order_id
    from public.orders o
   where coalesce(o.company_id, public.default_company_id()) = v_company_id
     and coalesce(o.order_number, '') = v_order_number
     and (p_order_id is null or o.id <> p_order_id)
   order by o.created_at asc nulls last, o.id asc
   limit 1;

  return jsonb_build_object(
    'available', v_conflicting_order_id is null,
    'order_number', v_order_number,
    'company_id', v_company_id,
    'conflicting_order_id', v_conflicting_order_id,
    'scope', 'company'
  );
end;
$$;

revoke all privileges on function public.rpc_is_order_number_available_v2(text, uuid) from public, anon;
grant execute on function public.rpc_is_order_number_available_v2(text, uuid) to authenticated, service_role;

comment on function public.rpc_is_order_number_available_v2(text, uuid) is
  'Phase 10E8B read-only company-scoped order-number availability check. Does not mutate orders, does not implement manual override, and does not replace legacy global availability until later wiring.';

commit;
