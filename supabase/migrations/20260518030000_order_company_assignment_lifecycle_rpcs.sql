begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values
  (
    'order_company_assignments.read_owner',
    'order_company_assignments',
    'Read owned company assignments',
    'View order-company assignment records for orders owned by the current company.',
    true,
    false
  ),
  (
    'order_company_assignments.offer',
    'order_company_assignments',
    'Offer company assignments',
    'Offer scoped order work from the owner company to an assigned company through an active relationship.',
    true,
    false
  ),
  (
    'order_company_assignments.respond',
    'order_company_assignments',
    'Respond to company assignments',
    'Accept or decline known order-company assignments for the assigned company.',
    true,
    false
  ),
  (
    'order_company_assignments.progress',
    'order_company_assignments',
    'Progress company assignments',
    'Start or submit known order-company assignments for the assigned company.',
    true,
    false
  ),
  (
    'order_company_assignments.complete',
    'order_company_assignments',
    'Complete company assignments',
    'Complete submitted order-company assignments for orders owned by the current company.',
    true,
    false
  ),
  (
    'order_company_assignments.cancel',
    'order_company_assignments',
    'Cancel company assignments',
    'Cancel current order-company assignments for orders owned by the current company.',
    true,
    false
  ),
  (
    'order_company_assignments.revoke',
    'order_company_assignments',
    'Revoke company assignments',
    'Revoke current order-company assignments for orders owned by the current company.',
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

create or replace function public.order_company_assignment_expected_type(
  p_relationship_type text
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case p_relationship_type
    when 'amc_vendor' then 'vendor_appraisal'
    when 'staff_overflow_vendor' then 'staff_overflow'
    when 'review_provider' then 'review_provider'
    when 'enterprise_child' then 'enterprise_delegated'
    when 'billing_managed' then 'billing_managed'
    when 'support_managed' then 'support_managed'
    else null
  end;
$$;

create or replace function public.rpc_order_company_assignment_list(
  p_status text default null,
  p_assignment_type text default null
)
returns table (
  id uuid,
  order_id uuid,
  owner_company_id uuid,
  assigned_company_id uuid,
  assigned_company_name text,
  relationship_id uuid,
  relationship_type text,
  assignment_type text,
  status text,
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

  if not public.current_app_user_has_permission('order_company_assignments.read_owner') then
    raise exception 'missing required assignment read permission'
      using errcode = '42501';
  end if;

  if v_status is not null and v_status not in (
    'offered',
    'accepted',
    'in_progress',
    'submitted',
    'completed',
    'declined',
    'cancelled',
    'revoked'
  ) then
    raise exception 'invalid order-company assignment status: %', p_status;
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
    oca.id,
    oca.order_id,
    oca.owner_company_id,
    oca.assigned_company_id,
    c.name as assigned_company_name,
    oca.relationship_id,
    cr.relationship_type,
    oca.assignment_type,
    oca.status,
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
    oca.review_due_at,
    oca.expires_at,
    oca.created_at,
    oca.updated_at
  from public.order_company_assignments oca
  join public.company_relationships cr
    on cr.id = oca.relationship_id
  join public.companies c
    on c.id = oca.assigned_company_id
  where oca.owner_company_id = v_company_id
    and (v_status is null or oca.status = v_status)
    and (v_assignment_type is null or oca.assignment_type = v_assignment_type)
  order by oca.updated_at desc, oca.created_at desc;
end;
$$;

create or replace function public.rpc_order_company_assignment_detail(
  p_assignment_id uuid
)
returns table (
  id uuid,
  order_id uuid,
  owner_company_id uuid,
  assigned_company_id uuid,
  assigned_company_name text,
  relationship_id uuid,
  relationship_type text,
  assignment_type text,
  status text,
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
begin
  return query
  select *
    from public.rpc_order_company_assignment_list(null, null) listed
   where listed.id = p_assignment_id;

  if not found then
    raise exception 'Order-company assignment not found or not authorized';
  end if;
end;
$$;

create or replace function public.rpc_order_company_assignment_offer(
  p_order_id uuid,
  p_assigned_company_id uuid,
  p_relationship_id uuid,
  p_assignment_type text,
  p_instructions text default null,
  p_terms jsonb default '{}'::jsonb,
  p_handoff_payload jsonb default '{}'::jsonb,
  p_due_at timestamptz default null,
  p_review_due_at timestamptz default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_assignment_type text := lower(trim(coalesce(p_assignment_type, '')));
  v_assignment_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.offer') then
    raise exception 'missing required assignment offer permission'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('relationships.assign_work') then
    raise exception 'missing required relationship work-assignment permission'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

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
   where id = p_relationship_id;

  if not found then
    raise exception 'company relationship not found';
  end if;

  if v_relationship.status <> 'active' then
    raise exception 'order-company assignment offer requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_company_id then
    raise exception 'relationship source must match current owner company'
      using errcode = '42501';
  end if;

  if v_relationship.source_company_id <> coalesce(v_order.company_id, public.default_company_id()) then
    raise exception 'relationship source must match order owner company'
      using errcode = '42501';
  end if;

  if v_relationship.target_company_id <> p_assigned_company_id then
    raise exception 'relationship target must match assigned company'
      using errcode = '42501';
  end if;

  if v_assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type % is incompatible with relationship type %',
      p_assignment_type,
      v_relationship.relationship_type;
  end if;

  insert into public.order_company_assignments (
    order_id,
    owner_company_id,
    assigned_company_id,
    relationship_id,
    assignment_type,
    status,
    instructions,
    terms,
    handoff_payload,
    offered_by_user_id,
    offered_at,
    due_at,
    review_due_at,
    expires_at
  ) values (
    p_order_id,
    coalesce(v_order.company_id, public.default_company_id()),
    p_assigned_company_id,
    p_relationship_id,
    v_assignment_type,
    'offered',
    p_instructions,
    coalesce(p_terms, '{}'::jsonb),
    coalesce(p_handoff_payload, '{}'::jsonb),
    v_actor_user_id,
    now(),
    p_due_at,
    p_review_due_at,
    p_expires_at
  )
  returning id into v_assignment_id;

  return v_assignment_id;
end;
$$;

create or replace function public.rpc_order_company_assignment_accept(
  p_assignment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order_company_id uuid;
  v_relationship public.company_relationships%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.respond') then
    raise exception 'missing required assignment respond permission'
      using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.assigned_company_id <> v_company_id then
    raise exception 'assignment is not assigned to the current company'
      using errcode = '42501';
  end if;

  if v_assignment.status <> 'offered' then
    raise exception 'only offered order-company assignments can be accepted';
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if v_order_company_id is distinct from v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'accepted',
         accepted_by_user_id = v_actor_user_id,
         accepted_at = now()
   where id = p_assignment_id;

  return p_assignment_id;
end;
$$;

create or replace function public.rpc_order_company_assignment_decline(
  p_assignment_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order_company_id uuid;
  v_relationship public.company_relationships%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.respond') then
    raise exception 'missing required assignment respond permission'
      using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.assigned_company_id <> v_company_id then
    raise exception 'assignment is not assigned to the current company'
      using errcode = '42501';
  end if;

  if v_assignment.status <> 'offered' then
    raise exception 'only offered order-company assignments can be declined';
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if v_order_company_id is distinct from v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'declined',
         declined_by_user_id = v_actor_user_id,
         declined_at = now(),
         submission_payload = case
           when nullif(trim(coalesce(p_reason, '')), '') is null then submission_payload
           else jsonb_set(
             coalesce(submission_payload, '{}'::jsonb),
             '{decline_reason}',
             to_jsonb(p_reason),
             true
           )
         end
   where id = p_assignment_id;

  return p_assignment_id;
end;
$$;

create or replace function public.rpc_order_company_assignment_start(
  p_assignment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order_company_id uuid;
  v_relationship public.company_relationships%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.progress') then
    raise exception 'missing required assignment progress permission'
      using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.assigned_company_id <> v_company_id then
    raise exception 'assignment is not assigned to the current company'
      using errcode = '42501';
  end if;

  if v_assignment.status <> 'accepted' then
    raise exception 'only accepted order-company assignments can be started';
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if v_order_company_id is distinct from v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'in_progress',
         started_at = coalesce(started_at, now())
   where id = p_assignment_id;

  return p_assignment_id;
end;
$$;

create or replace function public.rpc_order_company_assignment_submit(
  p_assignment_id uuid,
  p_submission_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order_company_id uuid;
  v_relationship public.company_relationships%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.progress') then
    raise exception 'missing required assignment progress permission'
      using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.assigned_company_id <> v_company_id then
    raise exception 'assignment is not assigned to the current company'
      using errcode = '42501';
  end if;

  if v_assignment.status not in ('accepted', 'in_progress') then
    raise exception 'only accepted or in-progress order-company assignments can be submitted';
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if v_order_company_id is distinct from v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'submitted',
         submitted_by_user_id = v_actor_user_id,
         submitted_at = now(),
         submission_payload = coalesce(p_submission_payload, '{}'::jsonb)
   where id = p_assignment_id;

  return p_assignment_id;
end;
$$;

create or replace function public.rpc_order_company_assignment_complete(
  p_assignment_id uuid,
  p_completion_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
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

  if v_assignment.status <> 'submitted' then
    raise exception 'only submitted order-company assignments can be completed';
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

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'completed',
         completed_by_user_id = v_actor_user_id,
         completed_at = now(),
         submission_payload = case
           when nullif(trim(coalesce(p_completion_note, '')), '') is null then submission_payload
           else jsonb_set(
             coalesce(submission_payload, '{}'::jsonb),
             '{completion_note}',
             to_jsonb(p_completion_note),
             true
           )
         end
   where id = p_assignment_id;

  return p_assignment_id;
end;
$$;

create or replace function public.rpc_order_company_assignment_cancel(
  p_assignment_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.cancel') then
    raise exception 'missing required assignment cancel permission'
      using errcode = '42501';
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

  if v_assignment.status not in ('offered', 'accepted', 'in_progress') then
    raise exception 'only offered, accepted, or in-progress order-company assignments can be cancelled';
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

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'cancelled',
         cancelled_by_user_id = v_actor_user_id,
         cancelled_at = now(),
         submission_payload = case
           when nullif(trim(coalesce(p_reason, '')), '') is null then submission_payload
           else jsonb_set(
             coalesce(submission_payload, '{}'::jsonb),
             '{cancel_reason}',
             to_jsonb(p_reason),
             true
           )
         end
   where id = p_assignment_id;

  return p_assignment_id;
end;
$$;

create or replace function public.rpc_order_company_assignment_revoke(
  p_assignment_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.revoke') then
    raise exception 'missing required assignment revoke permission'
      using errcode = '42501';
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

  if v_assignment.status not in ('offered', 'accepted', 'in_progress', 'submitted') then
    raise exception 'only current order-company assignments can be revoked';
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

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'revoked',
         revoked_by_user_id = v_actor_user_id,
         revoked_at = now(),
         submission_payload = case
           when nullif(trim(coalesce(p_reason, '')), '') is null then submission_payload
           else jsonb_set(
             coalesce(submission_payload, '{}'::jsonb),
             '{revoke_reason}',
             to_jsonb(p_reason),
             true
           )
         end
   where id = p_assignment_id;

  return p_assignment_id;
end;
$$;

revoke all privileges on table public.order_company_assignments from public, anon, authenticated;
grant all privileges on table public.order_company_assignments to service_role;

revoke all on function public.order_company_assignment_expected_type(text) from public, anon, authenticated;
revoke all on function public.rpc_order_company_assignment_list(text, text) from public, anon;
revoke all on function public.rpc_order_company_assignment_detail(uuid) from public, anon;
revoke all on function public.rpc_order_company_assignment_offer(uuid, uuid, uuid, text, text, jsonb, jsonb, timestamptz, timestamptz, timestamptz) from public, anon;
revoke all on function public.rpc_order_company_assignment_accept(uuid) from public, anon;
revoke all on function public.rpc_order_company_assignment_decline(uuid, text) from public, anon;
revoke all on function public.rpc_order_company_assignment_start(uuid) from public, anon;
revoke all on function public.rpc_order_company_assignment_submit(uuid, jsonb) from public, anon;
revoke all on function public.rpc_order_company_assignment_complete(uuid, text) from public, anon;
revoke all on function public.rpc_order_company_assignment_cancel(uuid, text) from public, anon;
revoke all on function public.rpc_order_company_assignment_revoke(uuid, text) from public, anon;

grant execute on function public.order_company_assignment_expected_type(text) to service_role;
grant execute on function public.rpc_order_company_assignment_list(text, text) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_detail(uuid) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_offer(uuid, uuid, uuid, text, text, jsonb, jsonb, timestamptz, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_accept(uuid) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_decline(uuid, text) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_start(uuid) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_submit(uuid, jsonb) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_complete(uuid, text) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_cancel(uuid, text) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_revoke(uuid, text) to authenticated, service_role;

comment on function public.order_company_assignment_expected_type(text) is
  'Phase 8B4B internal helper mapping relationship types to compatible order-company assignment types. This helper does not grant order/client visibility.';

comment on function public.rpc_order_company_assignment_list(text, text) is
  'Phase 8B4B owner-side assignment management list. Returns assignments for the current owner company only; assigned-company users do not get list/read-path access and assignments do not grant order/client visibility.';

comment on function public.rpc_order_company_assignment_detail(uuid) is
  'Phase 8B4B owner-side assignment management detail. Assigned-company lifecycle actions operate by known assignment_id and are not read-path access.';

comment on function public.rpc_order_company_assignment_offer(uuid, uuid, uuid, text, text, jsonb, jsonb, timestamptz, timestamptz, timestamptz) is
  'Phase 8B4B owner-side assignment offer RPC. Requires owner order authority, order_company_assignments.offer, and relationships.assign_work. Does not modify core order assignment columns or grant vendor visibility.';

comment on function public.rpc_order_company_assignment_accept(uuid) is
  'Phase 8B4B assigned-company accept by known assignment_id. This lifecycle action does not expose order/client details or modify core order assignment columns.';

comment on function public.rpc_order_company_assignment_decline(uuid, text) is
  'Phase 8B4B assigned-company decline by known assignment_id. This lifecycle action does not expose order/client details or modify core order assignment columns.';

comment on function public.rpc_order_company_assignment_start(uuid) is
  'Phase 8B4B assigned-company start by known assignment_id. This lifecycle action does not expose order/client details or modify core order assignment columns.';

comment on function public.rpc_order_company_assignment_submit(uuid, jsonb) is
  'Phase 8B4B assigned-company submit by known assignment_id. This lifecycle action stores assignment submission payload only and does not expose order/client details.';

comment on function public.rpc_order_company_assignment_complete(uuid, text) is
  'Phase 8B4B owner-side completion RPC. Owner company remains canonical order owner; no workflow, order visibility, or core order assignment columns are changed.';

comment on function public.rpc_order_company_assignment_cancel(uuid, text) is
  'Phase 8B4B owner-side cancellation RPC. Owner company remains canonical order owner; no workflow, order visibility, or core order assignment columns are changed.';

comment on function public.rpc_order_company_assignment_revoke(uuid, text) is
  'Phase 8B4B owner-side revocation RPC. Owner company remains canonical order owner; no workflow, order visibility, or core order assignment columns are changed.';

commit;
