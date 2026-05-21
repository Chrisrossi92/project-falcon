begin;

create or replace function public.rpc_update_order(order_id uuid, patch jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  has_client boolean := patch ? 'client_id';
  has_managing_amc boolean := patch ? 'managing_amc_id';
  in_client text := patch->>'client_id';
  in_managing_amc text := patch->>'managing_amc_id';
  v_client_id bigint;
  v_managing_amc_id bigint;
  v_manual text := coalesce(
    nullif(patch->>'manual_client', ''),
    nullif(patch->>'manual_client_name', '')
  );
  v_existing public.orders;
  v_row public.orders;
begin
  if coalesce(patch, '{}'::jsonb) ? 'order_number' then
    raise exception 'generic order update RPCs do not accept order_number; use rpc_order_number_override'
      using errcode = '22023';
  end if;

  select *
    into v_existing
    from public.orders
   where id = order_id;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_existing.company_id,
    v_existing.appraiser_id,
    v_existing.assigned_to,
    v_existing.reviewer_id,
    v_existing.status
  ) then
    raise exception 'not authorized to update order %', order_id
      using errcode = '42501';
  end if;

  if has_client then
    v_client_id := nullif(in_client, '')::bigint;
    if v_client_id is not null
       and not public.current_app_user_can_attach_order_client(v_client_id) then
      raise exception 'client_id % is not attachable to orders in the current company', v_client_id
        using errcode = '42501';
    end if;
  end if;

  if has_managing_amc then
    v_managing_amc_id := nullif(in_managing_amc, '')::bigint;
    if v_managing_amc_id is not null
       and not public.current_app_user_can_attach_order_amc(v_managing_amc_id) then
      raise exception 'managing_amc_id % is not an attachable current-company AMC client', v_managing_amc_id
        using errcode = '42501';
    end if;
  end if;

  update public.orders
     set client_id        = case when has_client then v_client_id else client_id end,
         managing_amc_id  = case when has_managing_amc then v_managing_amc_id else managing_amc_id end,
         manual_client    = coalesce(v_manual, manual_client),
         manual_client_name = coalesce(v_manual, manual_client_name),
         appraiser_id     = coalesce(nullif(patch->>'appraiser_id','')::uuid, appraiser_id),
         property_address = coalesce(nullif(patch->>'property_address',''), property_address),
         city             = coalesce(nullif(patch->>'city',''), city),
         state            = coalesce(nullif(patch->>'state',''), state),
         postal_code      = coalesce(nullif(patch->>'postal_code',''), postal_code),
         base_fee         = coalesce(nullif(patch->>'base_fee','')::numeric, base_fee),
         appraiser_fee    = coalesce(nullif(patch->>'appraiser_fee','')::numeric, appraiser_fee),
         appraiser_split  = coalesce(nullif(patch->>'appraiser_split','')::numeric, appraiser_split),
         notes            = coalesce(nullif(patch->>'notes',''), notes),
         updated_at       = now()
   where id = order_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.rpc_order_update(p_order_id uuid, p jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.orders;
  v_row public.orders;
  v_client_id public.orders.client_id%TYPE := null;
  v_managing_amc_id public.orders.managing_amc_id%TYPE := null;
  v_appraiser_id public.orders.appraiser_id%TYPE := null;
  v_reviewer_id public.orders.reviewer_id%TYPE := null;
begin
  if coalesce(p, '{}'::jsonb) ? 'order_number' then
    raise exception 'generic order update RPCs do not accept order_number; use rpc_order_number_override'
      using errcode = '22023';
  end if;

  select *
    into v_existing
    from public.orders
   where id = p_order_id;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_existing.company_id,
    v_existing.appraiser_id,
    v_existing.assigned_to,
    v_existing.reviewer_id,
    v_existing.status
  ) then
    raise exception 'not authorized to update order %', p_order_id
      using errcode = '42501';
  end if;

  if p ? 'client_id' then
    v_client_id := nullif(p->>'client_id', '')::bigint;
    if v_client_id is not null
       and not public.current_app_user_can_attach_order_client(v_client_id) then
      raise exception 'client_id % is not attachable to orders in the current company', v_client_id
        using errcode = '42501';
    end if;
  end if;

  if p ? 'managing_amc_id' then
    v_managing_amc_id := nullif(p->>'managing_amc_id', '')::bigint;
    if v_managing_amc_id is not null
       and not public.current_app_user_can_attach_order_amc(v_managing_amc_id) then
      raise exception 'managing_amc_id % is not an attachable current-company AMC client', v_managing_amc_id
        using errcode = '42501';
    end if;
  end if;

  if p ? 'appraiser_id' then
    v_appraiser_id := public.fn_to_users_id((p->>'appraiser_id')::uuid);
  end if;

  if p ? 'reviewer_id' then
    v_reviewer_id := public.fn_to_users_id((p->>'reviewer_id')::uuid);
  end if;

  update public.orders o
  set
    title            = coalesce(p->>'title', o.title),
    address          = coalesce(p->>'address', o.address),
    city             = coalesce(p->>'city', o.city),
    state            = coalesce(p->>'state', o.state),
    zip              = coalesce(p->>'zip', o.zip),
    client_id        = case when p ? 'client_id' then v_client_id else o.client_id end,
    managing_amc_id  = case when p ? 'managing_amc_id' then v_managing_amc_id else o.managing_amc_id end,
    appraiser_id     = coalesce(v_appraiser_id, o.appraiser_id),
    reviewer_id      = coalesce(v_reviewer_id,  o.reviewer_id),
    due_date         = coalesce((p->>'due_date')::date, o.due_date),
    review_due_date  = coalesce((p->>'review_due_date')::date, o.review_due_date),
    site_visit_at    = coalesce((p->>'site_visit_at')::timestamp, o.site_visit_at),
    fee_amount       = coalesce((p->>'fee_amount')::numeric, o.fee_amount),
    is_archived      = coalesce((p->>'is_archived')::boolean, o.is_archived),
    updated_at       = now()
  where o.id = p_order_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.rpc_order_update(p_order_id text, p_patch jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(p_patch, '{}'::jsonb) ? 'order_number' then
    raise exception 'generic order update RPCs do not accept order_number; use rpc_order_number_override'
      using errcode = '22023';
  end if;

  raise exception 'rpc_order_update(text,jsonb) is deprecated and quarantined; use rpc_order_update(uuid,jsonb), rpc_update_order(uuid,jsonb), or direct authorized orders writes'
    using errcode = '0A000';
end;
$$;

revoke execute on function public.rpc_update_order(uuid, jsonb) from public;
revoke execute on function public.rpc_update_order(uuid, jsonb) from anon;
grant execute on function public.rpc_update_order(uuid, jsonb) to authenticated;

revoke execute on function public.rpc_order_update(uuid, jsonb) from public;
revoke execute on function public.rpc_order_update(uuid, jsonb) from anon;
grant execute on function public.rpc_order_update(uuid, jsonb) to authenticated;

revoke execute on function public.rpc_order_update(text, jsonb) from public;
revoke execute on function public.rpc_order_update(text, jsonb) from anon;
revoke execute on function public.rpc_order_update(text, jsonb) from authenticated;
grant execute on function public.rpc_order_update(text, jsonb) to service_role;

comment on function public.rpc_update_order(uuid, jsonb) is
  'Phase 10E8L generic order update RPC. Preserves ordinary order updates but rejects order_number patch keys; use rpc_order_number_override(uuid,text,text) for audited order-number changes.';

comment on function public.rpc_order_update(uuid, jsonb) is
  'Phase 10E8L generic order update RPC. Preserves ordinary order updates but rejects order_number patch keys; use rpc_order_number_override(uuid,text,text) for audited order-number changes.';

comment on function public.rpc_order_update(text, jsonb) is
  'Phase 10E8L quarantine preservation. Deprecated text-id order update RPC remains service_role-only and rejects order_number patch keys before raising the legacy quarantine exception.';

commit;
