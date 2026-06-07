begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_available_work_detail(p_work_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_due_soon_window interval := interval '48 hours';
  v_work_key text := lower(btrim(coalesce(p_work_key, '')));
  v_item jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_vendor_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_bids.read') then
    raise exception 'vendor_bids_read_permission_required'
      using errcode = '42501';
  end if;

  if v_work_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'available_work_unavailable'
    );
  end if;

  with detail_rows as (
    select
      encode(
        extensions.digest(
          concat_ws(
            ':',
            'vendor_available_work_v1',
            brr.id::text,
            brr.vendor_company_id::text
          ),
          'sha256'
        ),
        'hex'
      ) as work_key,
      case
        when response.selected_at is not null or brr.status = 'selected' then 'selected'
        when brr.status = 'not_selected' then 'not_selected'
        when brr.status = 'declined' then 'declined'
        when br.status = 'expired'
          or brr.status = 'expired'
          or (
            response.id is null
            and brr.status in ('pending', 'sent', 'viewed')
            and br.response_due_at is not null
            and br.response_due_at <= now()
          ) then 'expired'
        when response.submitted_at is not null or brr.status = 'responded' then 'submitted'
        when brr.status = 'viewed' then 'viewed'
        when br.response_due_at is not null and br.response_due_at <= now() + v_due_soon_window then 'due_soon'
        else 'available'
      end as status,
      case
        when response.selected_at is not null or brr.status = 'selected' then 'selected'
        when brr.status = 'not_selected' then 'not_selected'
        else null
      end as selection_outcome,
      br.response_due_at as bid_due_at,
      br.desired_vendor_due_at as requested_due_date,
      null::integer as requested_turn_time_days,
      nullif(btrim(br.request_message), '') as instructions,
      o.id as scoped_order_row_id,
      o.order_number,
      coalesce(nullif(o.property_address, ''), nullif(o.address, '')) as property_address,
      o.city,
      o.state,
      coalesce(nullif(o.postal_code, ''), nullif(o.zip, '')) as postal_code,
      o.county,
      o.property_type,
      o.report_type,
      owner_company.name as owner_company_name,
      response.fee_amount,
      response.currency,
      response.turn_time_days,
      response.proposed_due_at,
      response.comments as bid_comments,
      response.submitted_at,
      brr.declined_at,
      coalesce(brr.expired_at, case when br.status = 'expired' then br.updated_at else null end) as expired_at,
      brr.metadata ->> 'decline_reason' as decline_reason,
      brr.metadata ->> 'decline_comments' as decline_comments
    from public.order_vendor_bid_request_recipients brr
    join public.order_vendor_bid_requests br
      on br.id = brr.bid_request_id
    join public.orders o
      on o.id = br.order_id
    join public.company_relationships cr
      on cr.id = brr.relationship_id
     and cr.source_company_id = br.company_id
     and cr.target_company_id = brr.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    join public.company_vendor_profiles cvp
      on cvp.id = brr.vendor_profile_id
     and cvp.owner_company_id = br.company_id
     and cvp.vendor_company_id = brr.vendor_company_id
     and (
       cvp.relationship_id is null
       or cvp.relationship_id = brr.relationship_id
     )
     and cvp.vendor_status not in ('inactive', 'do_not_use')
    join public.companies owner_company
      on owner_company.id = br.company_id
    left join lateral (
      select obr.*
        from public.order_vendor_bid_responses obr
       where obr.recipient_id = brr.id
       order by obr.submitted_at desc nulls last, obr.created_at desc
       limit 1
    ) response on true
    where brr.vendor_company_id = v_vendor_company_id
      and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
      and br.status in ('sent', 'partially_responded', 'closed', 'expired')
      and brr.status in ('pending', 'sent', 'viewed', 'responded', 'declined', 'selected', 'not_selected', 'expired')
  ),
  selected_work as (
    select *
      from detail_rows
     where work_key = v_work_key
     limit 1
  ),
  vendor_documents as (
    select
      encode(
        extensions.digest(
          concat_ws(
            ':',
            'vendor_document_v1',
            od.id::text,
            sw.work_key
          ),
          'sha256'
        ),
        'hex'
      ) as document_key,
      od.category,
      coalesce(nullif(od.title, ''), od.file_name) as title,
      od.file_name,
      od.mime_type,
      od.file_size,
      od.created_at
    from selected_work sw
    join public.order_documents od
      on od.order_id = sw.scoped_order_row_id
     and od.status = 'active'
     and od.visibility_scope = 'vendor'
    order by od.created_at desc, od.file_name asc
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'work_key', sw.work_key,
    'status', sw.status,
    'selection_outcome', sw.selection_outcome,
    'bid_due_at', sw.bid_due_at,
    'requested_due_date', sw.requested_due_date,
    'requested_turn_time_days', sw.requested_turn_time_days,
    'expired_at', sw.expired_at,
    'order', jsonb_build_object(
      'order_number', sw.order_number,
      'property_address', sw.property_address,
      'city', sw.city,
      'state', sw.state,
      'postal_code', sw.postal_code,
      'county', sw.county,
      'property_type', sw.property_type,
      'report_type', sw.report_type
    ),
    'owner', jsonb_build_object(
      'company_name', sw.owner_company_name
    ),
    'summary', jsonb_build_object(
      'scope', null,
      'complexity', '[]'::jsonb,
      'documents_available', (select count(*)::integer from vendor_documents)
    ),
    'instructions', sw.instructions,
    'bid', jsonb_strip_nulls(jsonb_build_object(
      'status', case when sw.submitted_at is not null then 'submitted' else null end,
      'fee_amount', sw.fee_amount,
      'currency', sw.currency,
      'turn_time_days', sw.turn_time_days,
      'proposed_due_at', sw.proposed_due_at,
      'comments', sw.bid_comments,
      'submitted_at', sw.submitted_at
    )),
    'decline', jsonb_strip_nulls(jsonb_build_object(
      'status', case when sw.declined_at is not null then 'declined' else null end,
      'reason', sw.decline_reason,
      'comments', sw.decline_comments,
      'declined_at', sw.declined_at
    )),
    'documents', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'document_key', vd.document_key,
            'category', vd.category,
            'title', vd.title,
            'file_name', vd.file_name,
            'mime_type', vd.mime_type,
            'file_size', vd.file_size,
            'created_at', vd.created_at
          )
          order by vd.created_at desc, vd.file_name asc
        )
        from vendor_documents vd
      ),
      '[]'::jsonb
    )
  ))
    into v_item
    from selected_work sw;

  if v_item is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'available_work_unavailable'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'item', v_item
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_available_work_detail(text) from public, anon;
grant execute on function public.rpc_vendor_workspace_available_work_detail(text) to authenticated, service_role;

comment on function public.rpc_vendor_workspace_available_work_detail(text) is
  'AMC-9F authenticated Vendor Workspace unified work detail. Requires vendor_bids.read, resolves an opaque work key only across rows scoped to the current vendor company, returns vendor-safe detail for available, viewed, submitted, declined, selected, not-selected, and expired AMC-scoped bid states with vendor-visible document metadata, and does not mutate bids, responses, assignments, orders, public token flows, shared order APIs, or owner-side bid APIs.';

commit;
