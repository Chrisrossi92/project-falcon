begin;

do $$
begin
  if exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_status_valid'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      drop constraint order_company_assignments_status_valid;
  end if;

  alter table public.order_company_assignments
    add constraint order_company_assignments_status_valid check (
      status in (
        'offered',
        'accepted',
        'in_progress',
        'submitted',
        'revision_requested',
        'completed',
        'declined',
        'cancelled',
        'revoked'
      )
    );
end;
$$;

create or replace function public.rpc_amc_request_vendor_assignment_revision(
  p_assignment_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_owner_company_name text;
  v_instructions text;
  v_due_at timestamptz;
  v_requested_at timestamptz := now();
  v_prior_submission jsonb;
  v_revision_payload jsonb;
  v_submission_payload jsonb;
  v_activity_payload jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.complete') then
    raise exception 'missing required assignment complete permission'
      using errcode = '42501';
  end if;

  if p_assignment_id is null then
    raise exception 'assignment id is required';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    return jsonb_build_object(
      'ok', false,
      'error', 'assignment_revision_invalid',
      'field_errors', jsonb_build_object(
        'payload', 'Revision request payload must be an object.'
      )
    );
  end if;

  v_instructions := nullif(btrim(coalesce(
    v_payload ->> 'revision_instructions',
    v_payload ->> 'instructions',
    v_payload ->> 'summary',
    ''
  )), '');
  if v_instructions is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'assignment_revision_invalid',
      'field_errors', jsonb_build_object(
        'revision_instructions', 'Add vendor-facing revision instructions.'
      )
    );
  end if;

  if nullif(btrim(coalesce(v_payload ->> 'revision_due_at', v_payload ->> 'revision_due_date', '')), '') is not null then
    begin
      v_due_at := nullif(btrim(coalesce(v_payload ->> 'revision_due_at', v_payload ->> 'revision_due_date', '')), '')::timestamptz;
    exception
      when others then
        return jsonb_build_object(
          'ok', false,
          'error', 'assignment_revision_invalid',
          'field_errors', jsonb_build_object(
            'revision_due_at', 'Revision due date is invalid.'
          )
        );
    end;
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.owner_company_id <> v_company_id then
    raise exception 'assignment source order is not owned by the current company'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> 'vendor_appraisal' then
    raise exception 'only vendor appraisal assignments can receive AMC revision requests';
  end if;

  if v_assignment.status <> 'submitted' then
    return jsonb_build_object(
      'ok', false,
      'error', 'assignment_revision_invalid_state',
      'status', v_assignment.status,
      'message', 'Only submitted vendor assignments can receive revision requests.'
    );
  end if;

  select *
    into v_order
    from public.orders
   where id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  if coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    raise exception 'assignment source order is not AMC scoped';
  end if;

  if not public.current_app_user_can_read_order(v_order.id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order is not updateable by current user'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found
     or v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_relationship.status <> 'active'
     or v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment requires an active AMC vendor relationship';
  end if;

  select cvp.*
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.owner_company_id = v_assignment.owner_company_id
     and cvp.vendor_company_id = v_assignment.assigned_company_id
   order by
     case when cvp.relationship_id = v_assignment.relationship_id then 0 else 1 end,
     cvp.created_at desc
   limit 1;

  if not found
     or v_profile.vendor_status in ('inactive', 'do_not_use')
     or (
       v_profile.relationship_id is not null
       and v_profile.relationship_id is distinct from v_assignment.relationship_id
     ) then
    raise exception 'assignment requires an active AMC vendor profile';
  end if;

  select c.name
    into v_owner_company_name
    from public.companies c
   where c.id = v_assignment.owner_company_id;

  v_prior_submission := coalesce(v_assignment.submission_payload, '{}'::jsonb);
  v_revision_payload := jsonb_strip_nulls(jsonb_build_object(
    'status', 'revision_requested',
    'summary', v_instructions,
    'instructions', v_instructions,
    'requested_at', v_requested_at,
    'requested_by_label', coalesce(nullif(v_owner_company_name, ''), 'AMC coordinator'),
    'due_at', v_due_at,
    'prior_submission', v_prior_submission
  ));
  v_submission_payload := jsonb_set(
    v_prior_submission,
    '{revision}',
    v_revision_payload,
    true
  );

  update public.order_company_assignments
     set status = 'revision_requested',
         review_due_at = coalesce(v_due_at, review_due_at),
         submission_payload = v_submission_payload
   where id = v_assignment.id
   returning * into v_assignment;

  v_activity_payload := jsonb_strip_nulls(jsonb_build_object(
    'revision_requested_at', v_requested_at,
    'revision_due_at', v_due_at,
    'vendor_facing_instructions', v_instructions
  ));

  perform public.log_order_company_assignment_event(
    v_assignment.id,
    'assignment.revision_requested',
    v_actor_user_id,
    v_company_id,
    'Revision requested',
    v_activity_payload
  );
  perform public.notify_order_company_assignment_event(
    v_assignment.id,
    'assignment.revision_requested',
    v_actor_user_id,
    v_company_id,
    v_activity_payload
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'revision_requested',
    'message', 'Revision requested.',
    'requested_at', v_requested_at,
    'revision', jsonb_build_object(
      'status', 'revision_requested',
      'summary', v_instructions,
      'instructions', v_instructions,
      'requested_at', v_requested_at,
      'requested_by_label', coalesce(nullif(v_owner_company_name, ''), 'AMC coordinator'),
      'due_at', v_due_at
    )
  );
end;
$$;

revoke all on function public.rpc_amc_request_vendor_assignment_revision(uuid, jsonb) from public, anon;
grant execute on function public.rpc_amc_request_vendor_assignment_revision(uuid, jsonb) to authenticated, service_role;

comment on function public.rpc_amc_request_vendor_assignment_revision(uuid, jsonb) is
  'AMC-10H coordinator revision request action for submitted vendor_appraisal assignment packets. Requires order_company_assignments.complete, current owner company scope, readable/updateable AMC-scoped order, active AMC vendor relationship/profile, and submitted assignment state. Stores vendor-facing revision instructions under submission_payload.revision, does not accept or store internal notes because the current notification/activity payload path is shared, preserves prior submitted report metadata, logs/notifies assignment.revision_requested, and does not mutate base order lifecycle or public token routes.';

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

comment on function public.rpc_order_company_assignment_list_for_order(uuid) is
  'Phase 8C2A/AMC-10H narrow owner-side assignment summary list for one readable owner order. Returns assignment lifecycle summary fields plus vendor-safe revision request summary fields only; does not expose assignment payload JSON, client data, AMC data, fees, splits, internal notes, owner assignment user columns, assigned-company order access, or canonical order visibility beyond current_app_user_can_read_order.';

commit;
