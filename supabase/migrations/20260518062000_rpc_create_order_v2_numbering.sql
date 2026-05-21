begin;

create or replace function public.rpc_create_order(payload jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
  v_managing_amc_id bigint;
  v_manual text;
  v_appraiser uuid;
  v_company_id uuid;
  v_order_number text;
  v_row public.orders;
begin
  if not public.current_app_user_can_create_order() then
    raise exception 'not authorized to create orders'
      using errcode = '42501';
  end if;

  v_client_id := nullif(payload->>'client_id', '')::bigint;
  v_managing_amc_id := nullif(payload->>'managing_amc_id', '')::bigint;
  v_manual := coalesce(
    nullif(payload->>'manual_client', ''),
    nullif(payload->>'manual_client_name', '')
  );
  v_appraiser := nullif(payload->>'appraiser_id', '')::uuid;

  if v_client_id is not null
     and not public.current_app_user_can_attach_order_client(v_client_id) then
    raise exception 'client_id % is not attachable to orders in the current company', v_client_id
      using errcode = '42501';
  end if;

  if v_managing_amc_id is not null
     and not public.current_app_user_can_attach_order_amc(v_managing_amc_id) then
    raise exception 'managing_amc_id % is not an attachable current-company AMC client', v_managing_amc_id
      using errcode = '42501';
  end if;

  v_company_id := public.current_company_id();
  v_order_number := public.next_order_number_v2(v_company_id, now());

  insert into public.orders (
    client_id, managing_amc_id, manual_client, manual_client_name, appraiser_id, order_number,
    property_address, city, state, postal_code,
    base_fee, appraiser_fee, appraiser_split, notes,
    status, created_at, updated_at
  ) values (
    v_client_id, v_managing_amc_id, v_manual, v_manual, v_appraiser, v_order_number,
    nullif(payload->>'property_address',''), nullif(payload->>'city',''), nullif(payload->>'state',''), nullif(payload->>'postal_code',''),
    nullif(payload->>'base_fee','')::numeric,
    nullif(payload->>'appraiser_fee','')::numeric,
    nullif(payload->>'appraiser_split','')::numeric,
    nullif(payload->>'notes',''),
    coalesce(nullif(payload->>'status',''),'new'),
    now(), now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.rpc_create_order(jsonb) is
  'Guarded order creation RPC. Phase 10E6B generates orders.order_number server-side through next_order_number_v2(current_company_id(), now()) and ignores submitted payload.order_number; manual override remains deferred.';

grant execute on function public.rpc_create_order(jsonb) to authenticated;

commit;
