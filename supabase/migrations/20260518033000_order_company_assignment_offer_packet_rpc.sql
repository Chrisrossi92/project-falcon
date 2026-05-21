begin;

create or replace function public.rpc_order_company_assignment_offer_packet(
  p_assignment_id uuid
)
returns table (
  assignment_id uuid,
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
  where oca.id = p_assignment_id
    and oca.assigned_company_id = public.current_company_id()
    and oca.status = 'offered'
    and cr.status = 'active'
    and cr.source_company_id = oca.owner_company_id
    and cr.target_company_id = oca.assigned_company_id
    and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
    and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id;

  if not found then
    raise exception 'Order-company assignment offer packet not found or not authorized';
  end if;
end;
$$;

revoke all on function public.rpc_order_company_assignment_offer_packet(uuid) from public, anon;
grant execute on function public.rpc_order_company_assignment_offer_packet(uuid) to authenticated, service_role;

comment on function public.rpc_order_company_assignment_offer_packet(uuid) is
  'Phase 8B4G assigned-company offered-assignment invitation preview by assignment_id. Returns inbox-safe fields only, does not expose order_id, and does not grant canonical order or client visibility.';

commit;
