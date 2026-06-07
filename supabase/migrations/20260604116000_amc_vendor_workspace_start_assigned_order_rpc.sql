begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_start_assigned_order(p_assignment_work_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_started_at timestamptz := now();
  v_activity_payload jsonb;
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

  if not public.current_app_user_has_permission('vendor_assignments.progress') then
    raise exception 'vendor_assignments_progress_permission_required'
      using errcode = '42501';
  end if;

  if p_assignment_work_key is null
     or p_assignment_work_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
   where encode(
           extensions.digest(
             concat_ws(
               ':',
               'vendor_assignment_work_v1',
               oca.id::text,
               oca.assigned_company_id::text
             ),
             'sha256'
           ),
           'hex'
         ) = p_assignment_work_key
     and oca.assigned_company_id = v_vendor_company_id
     and oca.assignment_type = 'vendor_appraisal'
   for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found
     or coalesce(v_order.company_id, public.default_company_id()) is distinct from v_assignment.owner_company_id
     or coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_assignment.relationship_id;

  if not found
     or v_relationship.source_company_id is distinct from v_assignment.owner_company_id
     or v_relationship.target_company_id is distinct from v_assignment.assigned_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_relationship.status <> 'active'
     or v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
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
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
  end if;

  if v_assignment.status <> 'accepted'
     or v_assignment.started_at is not null then
    return jsonb_build_object(
      'ok', false,
      'error', 'assignment_start_invalid',
      'status', v_assignment.status,
      'field_errors', jsonb_build_object(
        'action', 'Only accepted assignments that have not started can be started.'
      )
    );
  end if;

  update public.order_company_assignments
     set status = 'in_progress',
         started_at = coalesce(started_at, v_started_at)
   where id = v_assignment.id
   returning * into v_assignment;

  v_activity_payload := jsonb_build_object(
    'responded_via', 'vendor_workspace',
    'assignment_work_key', p_assignment_work_key
  );

  perform public.log_order_company_assignment_event(
    v_assignment.id,
    'assignment.started',
    v_actor_user_id,
    v_vendor_company_id,
    'Assignment started',
    v_activity_payload
  );
  perform public.notify_order_company_assignment_event(
    v_assignment.id,
    'assignment.started',
    v_actor_user_id,
    v_vendor_company_id,
    v_activity_payload
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'in_progress',
    'message', 'Work started.',
    'started_at', v_assignment.started_at
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_start_assigned_order(text) from public, anon;
grant execute on function public.rpc_vendor_workspace_start_assigned_order(text) to authenticated, service_role;

comment on function public.rpc_vendor_workspace_start_assigned_order(text) is
  'AMC-10C authenticated Vendor Workspace Start Work action. Requires vendor_assignments.progress, resolves only opaque assignment_work_key values scoped to current_company_id(), active AMC vendor relationship/profile rows, vendor_appraisal assignments, and AMC-scoped orders. Reuses the existing order_company_assignments lifecycle by moving eligible accepted assignments to in_progress, stamping started_at, and logging/notifying assignment.started without exposing raw ids, shared order routes, client fees, AMC margins, internal notes, procurement/candidate data, owner-side assignment APIs, or token route behavior.';

commit;
