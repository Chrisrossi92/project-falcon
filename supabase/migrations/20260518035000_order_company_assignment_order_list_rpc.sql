begin;

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
  updated_at timestamptz
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
    oca.updated_at
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
  'Phase 8C2A narrow owner-side assignment summary list for one readable owner order. Returns assignment lifecycle summary fields only; does not expose assignment payload JSON, client data, AMC data, fees, splits, internal notes, owner assignment user columns, assigned-company order access, or canonical order visibility beyond current_app_user_can_read_order.';

commit;
