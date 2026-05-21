begin;

create or replace function public.rpc_order_company_assignment_activity(
  p_assignment_id uuid
)
returns table (
  id uuid,
  assignment_id uuid,
  event_type text,
  actor_side text,
  actor_company_id uuid,
  actor_company_name text,
  message text,
  event_note text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_is_owner_reader boolean := false;
  v_is_assigned_reader boolean := false;
begin
  if p_assignment_id is null then
    raise exception 'assignment id is required';
  end if;

  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
   where oca.id = p_assignment_id;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_assignment.relationship_id;

  if not found then
    raise exception 'assignment relationship not found';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type'
      using errcode = '42501';
  end if;

  if v_company_id = v_assignment.owner_company_id then
    if not public.current_app_user_has_permission('order_company_assignments.read_owner') then
      raise exception 'missing required owner assignment read permission'
        using errcode = '42501';
    end if;

    if not public.current_app_user_can_read_order(v_assignment.order_id) then
      raise exception 'order is not readable by current user'
        using errcode = '42501';
    end if;

    v_is_owner_reader := true;
  elsif v_company_id = v_assignment.assigned_company_id then
    if not public.current_app_user_has_permission('order_company_assignments.read_assigned') then
      raise exception 'missing required assigned assignment read permission'
        using errcode = '42501';
    end if;

    if v_assignment.status not in ('offered', 'accepted', 'in_progress', 'submitted', 'completed') then
      raise exception 'assignment activity is not available for this assignment status'
        using errcode = '42501';
    end if;

    if v_relationship.status <> 'active' then
      raise exception 'assignment activity requires an active company relationship'
        using errcode = '42501';
    end if;

    v_is_assigned_reader := true;
  else
    raise exception 'assignment is not available to the current company'
      using errcode = '42501';
  end if;

  if not (v_is_owner_reader or v_is_assigned_reader) then
    raise exception 'assignment activity is not authorized'
      using errcode = '42501';
  end if;

  return query
  select
    activity.id,
    activity.assignment_id,
    activity.event_type,
    activity.actor_side,
    activity.actor_company_id,
    actor_company.name as actor_company_name,
    activity.message,
    case
      when activity.event_type in ('assignment.declined', 'assignment.cancelled', 'assignment.revoked')
        then nullif(activity.payload->>'reason', '')
      when activity.event_type = 'assignment.completed'
        then nullif(activity.payload->>'completion_note', '')
      else null
    end as event_note,
    activity.created_at
  from public.order_company_assignment_activity activity
  left join public.companies actor_company
    on actor_company.id = activity.actor_company_id
  where activity.assignment_id = v_assignment.id
    and activity.order_id = v_assignment.order_id
    and activity.owner_company_id = v_assignment.owner_company_id
    and activity.assigned_company_id = v_assignment.assigned_company_id
    and activity.relationship_id = v_assignment.relationship_id
  order by activity.created_at asc, activity.id asc;
end;
$$;

revoke all on function public.rpc_order_company_assignment_activity(uuid) from public, anon;
grant execute on function public.rpc_order_company_assignment_activity(uuid) to authenticated, service_role;

comment on function public.rpc_order_company_assignment_activity(uuid) is
  'Phase 8C3 assignment-scoped activity timeline read RPC. Reads order_company_assignment_activity only, returns allowlisted lifecycle display fields, omits order_id, raw payload, actor user IDs, client/AMC/order activity fields, fees, splits, and canonical order activity. Owner access follows read_owner plus current_app_user_can_read_order; assigned-company access follows read_assigned packet status rules without granting canonical order visibility.';

commit;
