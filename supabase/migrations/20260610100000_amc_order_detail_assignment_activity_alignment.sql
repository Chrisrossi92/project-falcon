begin;

drop function if exists public.rpc_order_company_assignment_list_for_order(uuid);

create or replace function public.rpc_order_company_assignment_list_for_order(
  p_order_id uuid
)
returns table (
  id uuid,
  order_id uuid,
  owner_company_id uuid,
  assigned_company_id uuid,
  assigned_company_name text,
  relationship_id uuid,
  relationship_type text,
  relationship_status text,
  assignment_type text,
  status text,
  instructions text,
  offered_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  revoked_at timestamptz,
  due_at timestamptz,
  review_due_at timestamptz,
  accepted_fee_amount numeric,
  accepted_fee_currency text,
  accepted_turn_time_days integer,
  accepted_vendor_due_at timestamptz,
  selected_bid_request_id uuid,
  selected_bid_recipient_id uuid,
  selected_bid_response_id uuid,
  vendor_profile_id uuid,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  revision_summary text,
  revision_requested_at timestamptz,
  revision_due_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_order public.orders%rowtype;
begin
  if p_order_id is null then
    raise exception 'order id is required';
  end if;

  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.read_owner') then
    raise exception 'missing required owner assignment read permission'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = p_order_id;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order is not owned by the current company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  return query
  select
    oca.id,
    oca.order_id,
    oca.owner_company_id,
    oca.assigned_company_id,
    assigned_company.name as assigned_company_name,
    oca.relationship_id,
    cr.relationship_type,
    cr.status as relationship_status,
    oca.assignment_type,
    oca.status,
    oca.instructions,
    oca.offered_at,
    oca.accepted_at,
    oca.declined_at,
    oca.started_at,
    oca.submitted_at,
    oca.completed_at,
    oca.cancelled_at,
    oca.revoked_at,
    oca.due_at,
    oca.review_due_at,
    case
      when nullif(oca.terms ->> 'fee_amount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
        then (oca.terms ->> 'fee_amount')::numeric
      else null
    end as accepted_fee_amount,
    nullif(oca.terms ->> 'currency', '') as accepted_fee_currency,
    case
      when nullif(oca.terms ->> 'turn_time_days', '') ~ '^[0-9]+$'
        then (oca.terms ->> 'turn_time_days')::integer
      else null
    end as accepted_turn_time_days,
    coalesce(
      nullif(oca.terms ->> 'proposed_due_at', '')::timestamptz,
      oca.due_at
    ) as accepted_vendor_due_at,
    nullif(oca.handoff_payload ->> 'bid_request_id', '')::uuid as selected_bid_request_id,
    nullif(oca.handoff_payload ->> 'bid_recipient_id', '')::uuid as selected_bid_recipient_id,
    nullif(oca.handoff_payload ->> 'bid_response_id', '')::uuid as selected_bid_response_id,
    nullif(oca.handoff_payload ->> 'vendor_profile_id', '')::uuid as vendor_profile_id,
    oca.expires_at,
    oca.created_at,
    oca.updated_at,
    case
      when oca.status = 'revision_requested' then coalesce(
        nullif(oca.submission_payload #>> '{revision,summary}', ''),
        nullif(oca.submission_payload #>> '{revision,instructions}', '')
      )
      else null
    end as revision_summary,
    case
      when oca.status = 'revision_requested' then coalesce(
        nullif(oca.submission_payload #>> '{revision,requested_at}', '')::timestamptz,
        oca.updated_at
      )
      else null
    end as revision_requested_at,
    case
      when oca.status = 'revision_requested' then coalesce(
        nullif(oca.submission_payload #>> '{revision,due_at}', '')::timestamptz,
        oca.review_due_at
      )
      else null
    end as revision_due_at
  from public.order_company_assignments oca
  join public.company_relationships cr
    on cr.id = oca.relationship_id
  join public.companies assigned_company
    on assigned_company.id = oca.assigned_company_id
  where oca.order_id = p_order_id
    and oca.owner_company_id = v_company_id
    and cr.source_company_id = oca.owner_company_id
    and cr.target_company_id = oca.assigned_company_id
    and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
  order by oca.updated_at desc, oca.created_at desc;
end;
$$;

revoke all on function public.rpc_order_company_assignment_list_for_order(uuid) from public, anon;
grant execute on function public.rpc_order_company_assignment_list_for_order(uuid) to authenticated, service_role;

create or replace function public.amc_log_order_procurement_activity(
  p_order_id uuid,
  p_event_type text,
  p_message text,
  p_detail jsonb default '{}'::jsonb,
  p_actor_user_id uuid default null,
  p_actor_name text default null,
  p_actor_email text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_actor_user_id uuid := coalesce(p_actor_user_id, public.current_app_user_id());
  v_actor_name text := p_actor_name;
  v_actor_email text := p_actor_email;
begin
  if p_order_id is null or nullif(btrim(coalesce(p_event_type, '')), '') is null then
    return;
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = p_order_id;

  if not found then
    return;
  end if;

  if v_actor_user_id is not null and (v_actor_name is null or v_actor_email is null) then
    select
      coalesce(u.full_name, u.name, u.email),
      u.email
      into v_actor_name, v_actor_email
      from public.users u
     where u.id = v_actor_user_id
     limit 1;
  end if;

  insert into public.activity_log (
    order_id,
    company_id,
    event_type,
    action,
    message,
    detail,
    actor_user_id,
    created_by_name,
    created_by_email
  )
  values (
    p_order_id,
    coalesce(v_order.company_id, public.default_company_id()),
    p_event_type,
    p_event_type,
    p_message,
    coalesce(p_detail, '{}'::jsonb),
    v_actor_user_id,
    v_actor_name,
    v_actor_email
  );
end;
$$;

create or replace function public.amc_client_request_conversion_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted'
     and new.accepted_order_id is not null
     and (
       old.accepted_order_id is distinct from new.accepted_order_id
       or old.status is distinct from new.status
     ) then
    perform public.amc_log_order_procurement_activity(
      new.accepted_order_id,
      'client_request_converted',
      'Client request approved and converted to order.',
      jsonb_build_object(
        'client_portal_order_request_id', new.id,
        'request_key', public.client_portal_order_request_key(new.id, new.company_id, new.client_id)
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.amc_bid_request_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'sent' then
    perform public.amc_log_order_procurement_activity(
      new.order_id,
      'bid_request_sent',
      'Bid request sent.',
      jsonb_build_object(
        'bid_request_id', new.id,
        'response_due_at', new.response_due_at,
        'client_due_at', new.client_due_at,
        'desired_vendor_due_at', new.desired_vendor_due_at
      ),
      new.requested_by_user_id
    );
  end if;

  return new;
end;
$$;

create or replace function public.amc_bid_response_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_vendor_name text;
begin
  select br.order_id, c.name
    into v_order_id, v_vendor_name
    from public.order_vendor_bid_request_recipients brr
    join public.order_vendor_bid_requests br
      on br.id = brr.bid_request_id
    left join public.companies c
      on c.id = brr.vendor_company_id
   where brr.id = new.recipient_id
   limit 1;

  perform public.amc_log_order_procurement_activity(
    v_order_id,
    'bid_response_received',
    concat('Bid response received', case when v_vendor_name is null then '.' else ' from ' || v_vendor_name || '.' end),
    jsonb_build_object(
      'bid_response_id', new.id,
      'recipient_id', new.recipient_id,
      'fee_amount', new.fee_amount,
      'currency', new.currency,
      'turn_time_days', new.turn_time_days,
      'proposed_due_at', new.proposed_due_at
    ),
    null,
    v_vendor_name,
    null
  );

  return new;
end;
$$;

create or replace function public.amc_bid_selected_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_vendor_name text;
begin
  if old.selected_at is null and new.selected_at is not null then
    select br.order_id, c.name
      into v_order_id, v_vendor_name
      from public.order_vendor_bid_request_recipients brr
      join public.order_vendor_bid_requests br
        on br.id = brr.bid_request_id
      left join public.companies c
        on c.id = brr.vendor_company_id
     where brr.id = new.recipient_id
     limit 1;

    perform public.amc_log_order_procurement_activity(
      v_order_id,
      'bid_selected',
      concat('Bid selected', case when v_vendor_name is null then '.' else ': ' || v_vendor_name || '.' end),
      jsonb_build_object(
        'bid_response_id', new.id,
        'recipient_id', new.recipient_id,
        'fee_amount', new.fee_amount,
        'currency', new.currency,
        'turn_time_days', new.turn_time_days,
        'proposed_due_at', new.proposed_due_at,
        'selected_at', new.selected_at
      ),
      new.selected_by_user_id
    );
  end if;

  return new;
end;
$$;

create or replace function public.amc_vendor_assignment_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor_name text;
begin
  if new.assignment_type <> 'vendor_appraisal' then
    return new;
  end if;

  select c.name
    into v_vendor_name
    from public.companies c
   where c.id = new.assigned_company_id
   limit 1;

  if tg_op = 'INSERT' and new.status = 'offered' then
    perform public.amc_log_order_procurement_activity(
      new.order_id,
      'assignment_offered',
      concat('Assignment offered', case when v_vendor_name is null then '.' else ' to ' || v_vendor_name || '.' end),
      jsonb_build_object(
        'assignment_id', new.id,
        'assigned_company_id', new.assigned_company_id,
        'bid_response_id', new.handoff_payload ->> 'bid_response_id',
        'fee_amount', new.terms ->> 'fee_amount',
        'currency', new.terms ->> 'currency',
        'turn_time_days', new.terms ->> 'turn_time_days',
        'proposed_due_at', new.terms ->> 'proposed_due_at'
      ),
      new.offered_by_user_id
    );
  elsif tg_op = 'UPDATE'
     and old.status is distinct from new.status
     and new.status = 'accepted' then
    perform public.amc_log_order_procurement_activity(
      new.order_id,
      'assignment_accepted',
      concat('Assignment accepted', case when v_vendor_name is null then '.' else ' by ' || v_vendor_name || '.' end),
      jsonb_build_object(
        'assignment_id', new.id,
        'assigned_company_id', new.assigned_company_id,
        'accepted_at', new.accepted_at,
        'bid_response_id', new.handoff_payload ->> 'bid_response_id',
        'fee_amount', new.terms ->> 'fee_amount',
        'currency', new.terms ->> 'currency',
        'turn_time_days', new.terms ->> 'turn_time_days',
        'proposed_due_at', new.terms ->> 'proposed_due_at'
      ),
      null,
      v_vendor_name,
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists amc_client_request_conversion_activity on public.client_portal_order_requests;
create trigger amc_client_request_conversion_activity
after update on public.client_portal_order_requests
for each row
execute function public.amc_client_request_conversion_activity_trigger();

drop trigger if exists amc_bid_request_activity on public.order_vendor_bid_requests;
create trigger amc_bid_request_activity
after insert on public.order_vendor_bid_requests
for each row
execute function public.amc_bid_request_activity_trigger();

drop trigger if exists amc_bid_response_activity on public.order_vendor_bid_responses;
create trigger amc_bid_response_activity
after insert on public.order_vendor_bid_responses
for each row
execute function public.amc_bid_response_activity_trigger();

drop trigger if exists amc_bid_selected_activity on public.order_vendor_bid_responses;
create trigger amc_bid_selected_activity
after update on public.order_vendor_bid_responses
for each row
execute function public.amc_bid_selected_activity_trigger();

drop trigger if exists amc_vendor_assignment_activity_insert on public.order_company_assignments;
create trigger amc_vendor_assignment_activity_insert
after insert on public.order_company_assignments
for each row
execute function public.amc_vendor_assignment_activity_trigger();

drop trigger if exists amc_vendor_assignment_activity_update on public.order_company_assignments;
create trigger amc_vendor_assignment_activity_update
after update on public.order_company_assignments
for each row
execute function public.amc_vendor_assignment_activity_trigger();

revoke all on function public.amc_log_order_procurement_activity(uuid, text, text, jsonb, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.amc_client_request_conversion_activity_trigger()
  from public, anon, authenticated;
revoke all on function public.amc_bid_request_activity_trigger()
  from public, anon, authenticated;
revoke all on function public.amc_bid_response_activity_trigger()
  from public, anon, authenticated;
revoke all on function public.amc_bid_selected_activity_trigger()
  from public, anon, authenticated;
revoke all on function public.amc_vendor_assignment_activity_trigger()
  from public, anon, authenticated;

comment on function public.rpc_order_company_assignment_list_for_order(uuid) is
  'AMC-12.1 owner-side assignment summary list for one readable owner order. Returns lifecycle summary fields plus selected-bid accepted fee, turn time, vendor due date, and linkage ids needed for AMC Order Detail; does not expose raw assignment payload JSON, internal notes, fees/margins beyond accepted vendor bid terms, direct table access, or cross-company assignments.';

comment on function public.amc_log_order_procurement_activity(uuid, text, text, jsonb, uuid, text, text) is
  'AMC-12.1 backend-only activity-log helper for procurement and assignment audit events. Inserts permanent order activity only; does not send notifications, queue email, mutate orders, or expose vendor/private payloads.';

commit;
