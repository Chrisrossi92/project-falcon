begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values (
  'order_company_assignments.read_assigned',
  'order_company_assignments',
  'Read assigned company work packets',
  'View assignment-scoped work packet projections for assignments assigned to the current company. This does not grant canonical order or client visibility.',
  true,
  false
)
on conflict (key) do update
  set category = excluded.category,
      label = excluded.label,
      description = excluded.description,
      is_system = excluded.is_system,
      is_owner_only = excluded.is_owner_only,
      updated_at = now();

create or replace function public.rpc_order_company_assignment_inbox(
  p_status text default null,
  p_assignment_type text default null
)
returns table (
  assignment_id uuid,
  order_id uuid,
  owner_company_id uuid,
  owner_company_name text,
  assigned_company_id uuid,
  relationship_id uuid,
  relationship_type text,
  assignment_type text,
  assignment_status text,
  instructions text,
  terms jsonb,
  handoff_payload jsonb,
  offered_at timestamptz,
  accepted_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  revoked_at timestamptz,
  due_at timestamptz,
  review_due_at timestamptz,
  expires_at timestamptz,
  order_number text,
  order_status text,
  property_type text,
  report_type text,
  city text,
  state text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
  v_assignment_type text := nullif(lower(trim(coalesce(p_assignment_type, ''))), '');
begin
  if public.current_app_user_id() is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.read_assigned') then
    raise exception 'missing required assigned assignment read permission'
      using errcode = '42501';
  end if;

  if v_status is not null and v_status not in (
    'offered',
    'accepted',
    'in_progress',
    'submitted',
    'completed'
  ) then
    raise exception 'invalid or non-visible assigned assignment status: %', p_status;
  end if;

  if v_assignment_type is not null and v_assignment_type not in (
    'vendor_appraisal',
    'staff_overflow',
    'review_provider',
    'enterprise_delegated',
    'billing_managed',
    'support_managed'
  ) then
    raise exception 'invalid order-company assignment type: %', p_assignment_type;
  end if;

  return query
  select
    oca.id as assignment_id,
    oca.order_id,
    oca.owner_company_id,
    owner_company.name as owner_company_name,
    oca.assigned_company_id,
    oca.relationship_id,
    cr.relationship_type,
    oca.assignment_type,
    oca.status as assignment_status,
    oca.instructions,
    oca.terms,
    oca.handoff_payload,
    oca.offered_at,
    oca.accepted_at,
    oca.started_at,
    oca.submitted_at,
    oca.completed_at,
    oca.cancelled_at,
    oca.revoked_at,
    oca.due_at,
    oca.review_due_at,
    oca.expires_at,
    o.order_number,
    o.status as order_status,
    o.property_type,
    o.report_type,
    o.city,
    o.state
  from public.order_company_assignments oca
  join public.orders o
    on o.id = oca.order_id
  join public.company_relationships cr
    on cr.id = oca.relationship_id
  join public.companies owner_company
    on owner_company.id = oca.owner_company_id
  where oca.assigned_company_id = v_company_id
    and oca.status in ('offered', 'accepted', 'in_progress', 'submitted', 'completed')
    and (v_status is null or oca.status = v_status)
    and (v_assignment_type is null or oca.assignment_type = v_assignment_type)
    and cr.status = 'active'
    and cr.source_company_id = oca.owner_company_id
    and cr.target_company_id = oca.assigned_company_id
    and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
    and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id
  order by oca.updated_at desc, oca.created_at desc;
end;
$$;

create or replace function public.rpc_order_company_assignment_work_packet(
  p_assignment_id uuid
)
returns table (
  assignment_id uuid,
  order_id uuid,
  owner_company_id uuid,
  owner_company_name text,
  assigned_company_id uuid,
  relationship_id uuid,
  relationship_type text,
  assignment_type text,
  assignment_status text,
  instructions text,
  terms jsonb,
  handoff_payload jsonb,
  offered_at timestamptz,
  accepted_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  revoked_at timestamptz,
  due_at timestamptz,
  assignment_review_due_at timestamptz,
  expires_at timestamptz,
  order_number text,
  order_status text,
  property_type text,
  report_type text,
  city text,
  state text,
  property_address text,
  postal_code text,
  site_visit_at timestamptz,
  final_due_at timestamptz,
  order_review_due_at timestamptz,
  submission_payload jsonb,
  compliance_snapshot jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.current_app_user_id() is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.read_assigned') then
    raise exception 'missing required assigned assignment read permission'
      using errcode = '42501';
  end if;

  return query
  select
    oca.id as assignment_id,
    oca.order_id,
    oca.owner_company_id,
    owner_company.name as owner_company_name,
    oca.assigned_company_id,
    oca.relationship_id,
    cr.relationship_type,
    oca.assignment_type,
    oca.status as assignment_status,
    oca.instructions,
    oca.terms,
    oca.handoff_payload,
    oca.offered_at,
    oca.accepted_at,
    oca.started_at,
    oca.submitted_at,
    oca.completed_at,
    oca.cancelled_at,
    oca.revoked_at,
    oca.due_at,
    oca.review_due_at as assignment_review_due_at,
    oca.expires_at,
    o.order_number,
    o.status as order_status,
    o.property_type,
    o.report_type,
    o.city,
    o.state,
    coalesce(o.property_address, o.address) as property_address,
    coalesce(o.postal_code, o.zip) as postal_code,
    coalesce(
      o.site_visit_at::timestamptz,
      (o.site_visit_date)::timestamptz,
      (o.inspection_date)::timestamptz
    ) as site_visit_at,
    coalesce(
      o.final_due_at,
      o.client_due_at,
      (o.due_to_client)::timestamptz,
      (o.due_date)::timestamptz
    ) as final_due_at,
    coalesce(
      o.review_due_at,
      (o.due_for_review)::timestamptz,
      (o.review_due_date)::timestamptz
    ) as order_review_due_at,
    oca.submission_payload,
    oca.compliance_snapshot
  from public.order_company_assignments oca
  join public.orders o
    on o.id = oca.order_id
  join public.company_relationships cr
    on cr.id = oca.relationship_id
  join public.companies owner_company
    on owner_company.id = oca.owner_company_id
  where oca.id = p_assignment_id
    and oca.assigned_company_id = public.current_company_id()
    and oca.status in ('accepted', 'in_progress', 'submitted', 'completed')
    and cr.status = 'active'
    and cr.source_company_id = oca.owner_company_id
    and cr.target_company_id = oca.assigned_company_id
    and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
    and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id;

  if not found then
    raise exception 'Order-company assignment work packet not found or not authorized';
  end if;
end;
$$;

create or replace function public.rpc_order_company_assignment_owner_packet(
  p_assignment_id uuid
)
returns table (
  assignment_id uuid,
  order_id uuid,
  owner_company_id uuid,
  assigned_company_id uuid,
  assigned_company_name text,
  relationship_id uuid,
  relationship_type text,
  relationship_status text,
  assignment_type text,
  assignment_status text,
  instructions text,
  terms jsonb,
  handoff_payload jsonb,
  submission_payload jsonb,
  compliance_snapshot jsonb,
  offered_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  revoked_at timestamptz,
  due_at timestamptz,
  assignment_review_due_at timestamptz,
  expires_at timestamptz,
  order_number text,
  order_status text,
  property_address text,
  city text,
  state text,
  postal_code text,
  property_type text,
  report_type text,
  site_visit_at timestamptz,
  final_due_at timestamptz,
  order_review_due_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.current_app_user_id() is null then
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

  return query
  select
    oca.id as assignment_id,
    oca.order_id,
    oca.owner_company_id,
    oca.assigned_company_id,
    assigned_company.name as assigned_company_name,
    oca.relationship_id,
    cr.relationship_type,
    cr.status as relationship_status,
    oca.assignment_type,
    oca.status as assignment_status,
    oca.instructions,
    oca.terms,
    oca.handoff_payload,
    oca.submission_payload,
    oca.compliance_snapshot,
    oca.offered_at,
    oca.accepted_at,
    oca.declined_at,
    oca.started_at,
    oca.submitted_at,
    oca.completed_at,
    oca.cancelled_at,
    oca.revoked_at,
    oca.due_at,
    oca.review_due_at as assignment_review_due_at,
    oca.expires_at,
    o.order_number,
    o.status as order_status,
    coalesce(o.property_address, o.address) as property_address,
    o.city,
    o.state,
    coalesce(o.postal_code, o.zip) as postal_code,
    o.property_type,
    o.report_type,
    coalesce(
      o.site_visit_at::timestamptz,
      (o.site_visit_date)::timestamptz,
      (o.inspection_date)::timestamptz
    ) as site_visit_at,
    coalesce(
      o.final_due_at,
      o.client_due_at,
      (o.due_to_client)::timestamptz,
      (o.due_date)::timestamptz
    ) as final_due_at,
    coalesce(
      o.review_due_at,
      (o.due_for_review)::timestamptz,
      (o.review_due_date)::timestamptz
    ) as order_review_due_at
  from public.order_company_assignments oca
  join public.orders o
    on o.id = oca.order_id
  join public.company_relationships cr
    on cr.id = oca.relationship_id
  join public.companies assigned_company
    on assigned_company.id = oca.assigned_company_id
  where oca.id = p_assignment_id
    and oca.owner_company_id = public.current_company_id()
    and public.current_app_user_can_read_order(oca.order_id)
    and cr.source_company_id = oca.owner_company_id
    and cr.target_company_id = oca.assigned_company_id
    and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
    and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id;

  if not found then
    raise exception 'Order-company assignment owner packet not found or not authorized';
  end if;
end;
$$;

revoke all privileges on table public.order_company_assignments from public, anon, authenticated;
grant all privileges on table public.order_company_assignments to service_role;

revoke all on function public.rpc_order_company_assignment_inbox(text, text) from public, anon;
revoke all on function public.rpc_order_company_assignment_work_packet(uuid) from public, anon;
revoke all on function public.rpc_order_company_assignment_owner_packet(uuid) from public, anon;

grant execute on function public.rpc_order_company_assignment_inbox(text, text) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_work_packet(uuid) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_owner_packet(uuid) to authenticated, service_role;

comment on function public.rpc_order_company_assignment_inbox(text, text) is
  'Phase 8B4D assigned-company inbox. Returns assignment-scoped packet list data for the assigned company only; this is not canonical order read access and does not grant client visibility.';

comment on function public.rpc_order_company_assignment_work_packet(uuid) is
  'Phase 8B4D assigned-company work packet by assignment_id. Packet access does not modify current_app_user_can_read_order, expose canonical order views, grant client visibility, or modify core order assignment columns.';

comment on function public.rpc_order_company_assignment_owner_packet(uuid) is
  'Phase 8B4D owner-company assignment packet. Owner company remains canonical order owner; relationship existence alone grants nothing and packets are assignment-management projections.';

commit;
