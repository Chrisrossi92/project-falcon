begin;

drop function if exists public.rpc_create_order(jsonb);

create or replace function public.rpc_create_order(
  payload jsonb,
  p_operations_scope text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
  v_managing_amc_id bigint;
  v_client_contact_id bigint;
  v_client_contact public.client_contacts%rowtype;
  v_manual text;
  v_appraiser uuid;
  v_reviewer uuid;
  v_split numeric;
  v_entry_contact_name text;
  v_entry_contact_phone text;
  v_property_contact_name text;
  v_property_contact_phone text;
  v_company_id uuid;
  v_order_number text;
  v_operations_scope text := lower(trim(coalesce(nullif(p_operations_scope, ''), 'internal_operations')));
  v_status text := lower(trim(coalesce(nullif(payload->>'status', ''), 'new')));
  v_row public.orders;
begin
  if not public.current_app_user_can_create_order() then
    raise exception 'not authorized to create orders'
      using errcode = '42501';
  end if;

  if v_operations_scope not in ('internal_operations', 'amc_operations') then
    raise exception 'invalid_order_operations_scope'
      using errcode = '22023';
  end if;

  if v_status <> 'new' then
    raise exception 'invalid_order_create_status'
      using errcode = '22023';
  end if;

  v_client_id := nullif(payload->>'client_id', '')::bigint;
  v_managing_amc_id := nullif(payload->>'managing_amc_id', '')::bigint;
  v_client_contact_id := nullif(payload->>'client_contact_id', '')::bigint;
  v_manual := coalesce(
    nullif(payload->>'manual_client', ''),
    nullif(payload->>'manual_client_name', '')
  );
  v_appraiser := nullif(payload->>'appraiser_id', '')::uuid;
  v_reviewer := nullif(payload->>'reviewer_id', '')::uuid;
  v_split := nullif(coalesce(payload->>'split_pct', payload->>'split_percent', payload->>'appraiser_split'), '')::numeric;
  v_entry_contact_name := nullif(coalesce(payload->>'entry_contact_name', payload->>'property_contact_name'), '');
  v_entry_contact_phone := nullif(coalesce(payload->>'entry_contact_phone', payload->>'property_contact_phone'), '');
  v_property_contact_name := nullif(coalesce(payload->>'property_contact_name', payload->>'entry_contact_name'), '');
  v_property_contact_phone := nullif(coalesce(payload->>'property_contact_phone', payload->>'entry_contact_phone'), '');
  v_company_id := public.current_company_id();

  if v_client_id is not null
     and not public.current_app_user_can_attach_order_client(v_client_id) then
    raise exception 'client_id % is not attachable to orders in the current company', v_client_id
      using errcode = '42501';
  end if;

  if v_client_id is not null
     and not public.client_relationship_has_operations_scope(v_client_id, v_company_id, v_operations_scope) then
    raise exception 'client_scope_incompatible'
      using errcode = '42501';
  end if;

  if v_managing_amc_id is not null
     and not public.current_app_user_can_attach_order_amc(v_managing_amc_id) then
    raise exception 'managing_amc_id % is not an attachable current-company AMC client', v_managing_amc_id
      using errcode = '42501';
  end if;

  if v_managing_amc_id is not null
     and not public.client_relationship_has_operations_scope(v_managing_amc_id, v_company_id, v_operations_scope) then
    raise exception 'managing_amc_scope_incompatible'
      using errcode = '42501';
  end if;

  if v_client_contact_id is not null then
    if v_client_id is null then
      raise exception 'client_contact_requires_client'
        using errcode = '22023';
    end if;

    select *
      into v_client_contact
      from public.client_contacts cc
     where cc.id = v_client_contact_id
       and cc.company_id = v_company_id
       and cc.client_id = v_client_id
       and cc.status = 'active';

    if not found then
      raise exception 'client_contact_not_found'
        using errcode = 'P0002';
    end if;
  end if;

  v_order_number := public.next_order_number_v2(v_company_id, now());

  insert into public.orders (
    client_id, managing_amc_id, client_contact_id,
    client_contact_name, client_contact_title, client_contact_email, client_contact_phone,
    manual_client, manual_client_name, appraiser_id, reviewer_id, order_number,
    operations_scope,
    property_address, city, state, postal_code, property_type, report_type,
    base_fee, appraiser_fee, split_pct, appraiser_split,
    entry_contact_name, entry_contact_phone, property_contact_name, property_contact_phone,
    access_notes, special_instructions, notes,
    site_visit_at, review_due_at, final_due_at,
    status, created_at, updated_at
  ) values (
    v_client_id, v_managing_amc_id, v_client_contact_id,
    v_client_contact.name, v_client_contact.title, v_client_contact.email, v_client_contact.phone,
    v_manual, v_manual, v_appraiser, v_reviewer, v_order_number,
    v_operations_scope,
    nullif(payload->>'property_address',''), nullif(payload->>'city',''), nullif(payload->>'state',''), nullif(payload->>'postal_code',''),
    nullif(payload->>'property_type',''), nullif(payload->>'report_type',''),
    nullif(payload->>'base_fee','')::numeric,
    nullif(payload->>'appraiser_fee','')::numeric,
    v_split,
    v_split,
    v_entry_contact_name,
    v_entry_contact_phone,
    v_property_contact_name,
    v_property_contact_phone,
    nullif(payload->>'access_notes',''),
    nullif(coalesce(payload->>'special_instructions', payload->>'notes'), ''),
    nullif(payload->>'notes',''),
    nullif(payload->>'site_visit_at','')::timestamp,
    nullif(coalesce(payload->>'review_due_at', payload->>'review_due_date'),'')::timestamptz,
    nullif(coalesce(payload->>'final_due_at', payload->>'final_due_date'),'')::timestamptz,
    v_status,
    now(), now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.rpc_create_order(jsonb, text) to authenticated;

comment on function public.rpc_create_order(jsonb, text) is
  'Guarded order creation RPC. Generates order number server-side, snapshots selected client relationship contact fields, explicitly writes operations_scope, restricts create status to safe initial status, and rejects client/AMC attachments incompatible with the requested operations scope.';

commit;
