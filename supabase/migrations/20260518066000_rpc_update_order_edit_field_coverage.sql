begin;

create or replace function public.rpc_update_order(order_id uuid, patch jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patch jsonb := coalesce(patch, '{}'::jsonb);
  has_client boolean := v_patch ? 'client_id';
  has_managing_amc boolean := v_patch ? 'managing_amc_id';
  has_manual_client boolean := (v_patch ? 'manual_client') or (v_patch ? 'manual_client_name');
  has_appraiser boolean := v_patch ? 'appraiser_id';
  has_reviewer boolean := v_patch ? 'reviewer_id';
  has_property_address boolean := v_patch ? 'property_address';
  has_city boolean := v_patch ? 'city';
  has_state boolean := v_patch ? 'state';
  has_postal_code boolean := v_patch ? 'postal_code';
  has_base_fee boolean := v_patch ? 'base_fee';
  has_split_pct boolean := v_patch ? 'split_pct';
  has_appraiser_split boolean := v_patch ? 'appraiser_split';
  has_appraiser_fee boolean := v_patch ? 'appraiser_fee';
  has_property_type boolean := v_patch ? 'property_type';
  has_report_type boolean := v_patch ? 'report_type';
  has_entry_contact_name boolean := v_patch ? 'entry_contact_name';
  has_entry_contact_phone boolean := v_patch ? 'entry_contact_phone';
  has_site_visit_at boolean := v_patch ? 'site_visit_at';
  has_review_due_at boolean := v_patch ? 'review_due_at';
  has_final_due_at boolean := v_patch ? 'final_due_at';
  has_notes boolean := v_patch ? 'notes';
  in_client text := v_patch->>'client_id';
  in_managing_amc text := v_patch->>'managing_amc_id';
  v_client_id bigint;
  v_managing_amc_id bigint;
  v_manual text := coalesce(
    v_patch->>'manual_client_name',
    v_patch->>'manual_client'
  );
  v_split numeric;
  v_existing public.orders;
  v_row public.orders;
begin
  if jsonb_typeof(v_patch) <> 'object' then
    raise exception 'order update patch must be a JSON object'
      using errcode = '22023';
  end if;

  if v_patch ? 'order_number' then
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

  if has_split_pct then
    v_split := nullif(v_patch->>'split_pct', '')::numeric;
  elsif has_appraiser_split then
    v_split := nullif(v_patch->>'appraiser_split', '')::numeric;
  end if;

  update public.orders
     set client_id        = case when has_client then v_client_id else client_id end,
         managing_amc_id  = case when has_managing_amc then v_managing_amc_id else managing_amc_id end,
         manual_client    = case when has_manual_client then nullif(v_manual, '') else manual_client end,
         manual_client_name = case when has_manual_client then nullif(v_manual, '') else manual_client_name end,
         appraiser_id     = case when has_appraiser then nullif(v_patch->>'appraiser_id', '')::uuid else appraiser_id end,
         reviewer_id      = case when has_reviewer then nullif(v_patch->>'reviewer_id', '')::uuid else reviewer_id end,
         property_address = case when has_property_address then nullif(v_patch->>'property_address', '') else property_address end,
         city             = case when has_city then nullif(v_patch->>'city', '') else city end,
         state            = case when has_state then nullif(v_patch->>'state', '') else state end,
         postal_code      = case when has_postal_code then nullif(v_patch->>'postal_code', '') else postal_code end,
         base_fee         = case when has_base_fee then nullif(v_patch->>'base_fee', '')::numeric else base_fee end,
         appraiser_fee    = case when has_appraiser_fee then nullif(v_patch->>'appraiser_fee', '')::numeric else appraiser_fee end,
         split_pct        = case when has_split_pct or has_appraiser_split then v_split else split_pct end,
         appraiser_split  = case when has_split_pct or has_appraiser_split then v_split else appraiser_split end,
         property_type    = case when has_property_type then nullif(v_patch->>'property_type', '') else property_type end,
         report_type      = case when has_report_type then nullif(v_patch->>'report_type', '') else report_type end,
         entry_contact_name = case when has_entry_contact_name then nullif(v_patch->>'entry_contact_name', '') else entry_contact_name end,
         entry_contact_phone = case when has_entry_contact_phone then nullif(v_patch->>'entry_contact_phone', '') else entry_contact_phone end,
         site_visit_at    = case when has_site_visit_at then nullif(v_patch->>'site_visit_at', '')::timestamp else site_visit_at end,
         review_due_at    = case when has_review_due_at then nullif(v_patch->>'review_due_at', '')::timestamptz else review_due_at end,
         final_due_at     = case when has_final_due_at then nullif(v_patch->>'final_due_at', '')::timestamptz else final_due_at end,
         notes            = case when has_notes then nullif(v_patch->>'notes', '') else notes end,
         updated_at       = now()
   where id = order_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.rpc_update_order(uuid, jsonb) from public;
revoke execute on function public.rpc_update_order(uuid, jsonb) from anon;
grant execute on function public.rpc_update_order(uuid, jsonb) to authenticated;

comment on function public.rpc_update_order(uuid, jsonb) is
  'Phase 10F3B generic order update RPC coverage. Supports the current normal OrderForm edit payload through an explicit allowlist, preserves client/AMC guards and order_number rejection, and does not provide status/workflow or tenant mutation authority.';

commit;
