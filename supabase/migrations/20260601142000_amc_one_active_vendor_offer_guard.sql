begin;

do $$
declare
  v_conflict record;
begin
  /*
    AMC-6E preflight: the MVP vendor-offer invariant allows only one active
    vendor_appraisal packet per order. Fail clearly if existing data would
    violate the partial unique index below; do not delete or rewrite history.
  */
  select
    oca.order_id,
    count(*) as active_vendor_assignment_count,
    array_agg(oca.id order by oca.created_at, oca.id) as assignment_ids
    into v_conflict
    from public.order_company_assignments oca
   where oca.assignment_type = 'vendor_appraisal'
     and oca.status in ('offered', 'accepted', 'in_progress', 'submitted')
   group by oca.order_id
  having count(*) > 1
   order by oca.order_id
   limit 1;

  if found then
    raise exception 'order_vendor_assignment_active_conflict'
      using errcode = '23505',
            detail = format(
              'Order %s has %s active vendor assignments: %s',
              v_conflict.order_id,
              v_conflict.active_vendor_assignment_count,
              v_conflict.assignment_ids
            );
  end if;
end;
$$;

create unique index if not exists order_company_assignments_one_active_vendor_per_order
  on public.order_company_assignments (order_id)
  where assignment_type = 'vendor_appraisal'
    and status in ('offered', 'accepted', 'in_progress', 'submitted');

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

  if v_assignment_type = 'vendor_appraisal'
     and exists (
       select 1
         from public.order_company_assignments oca
        where oca.order_id = p_order_id
          and oca.assignment_type = 'vendor_appraisal'
          and oca.status in ('offered', 'accepted', 'in_progress', 'submitted')
     ) then
    raise exception 'order_vendor_assignment_active_exists'
      using errcode = '23505';
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

  perform public.log_order_company_assignment_event(
    v_assignment_id,
    'assignment.offered',
    v_actor_user_id,
    v_company_id,
    'Assignment offered',
    '{}'::jsonb
  );
  perform public.notify_order_company_assignment_event(
    v_assignment_id,
    'assignment.offered',
    v_actor_user_id,
    v_company_id,
    '{}'::jsonb
  );

  return v_assignment_id;
end;
$$;

comment on index public.order_company_assignments_one_active_vendor_per_order is
  'AMC-6E MVP guard. Allows only one active vendor_appraisal assignment packet per order across offered, accepted, in_progress, and submitted statuses. Does not affect non-vendor assignment types.';

comment on function public.rpc_order_company_assignment_offer(uuid, uuid, uuid, text, text, jsonb, jsonb, timestamptz, timestamptz, timestamptz) is
  'AMC-6E patched owner-side assignment offer RPC. Preserves existing assignment packet offer behavior and adds stable order_vendor_assignment_active_exists enforcement for one active vendor_appraisal packet per order. Does not modify core order assignment columns or create UI/routes.';

commit;
