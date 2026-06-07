begin;

alter table public.order_company_assignment_activity
  drop constraint if exists order_company_assignment_activity_event_type_valid;

alter table public.order_company_assignment_activity
  add constraint order_company_assignment_activity_event_type_valid check (
    event_type = any (
      array[
        'assignment.offered',
        'assignment.accepted',
        'assignment.declined',
        'assignment.started',
        'assignment.submitted',
        'assignment.revision_requested',
        'assignment.resubmitted',
        'assignment.completed',
        'assignment.cancelled',
        'assignment.revoked'
      ]
    )
  );

create or replace function public.tg_order_company_assignments_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_order_company_id uuid;
  v_relationship public.company_relationships%rowtype;
  v_expected_assignment_type text;
begin
  if TG_OP = 'UPDATE' then
    if NEW.order_id is distinct from OLD.order_id then
      raise exception 'order_company_assignments.order_id is immutable';
    end if;

    if NEW.owner_company_id is distinct from OLD.owner_company_id then
      raise exception 'order_company_assignments.owner_company_id is immutable';
    end if;

    if NEW.assigned_company_id is distinct from OLD.assigned_company_id then
      raise exception 'order_company_assignments.assigned_company_id is immutable';
    end if;

    if NEW.relationship_id is distinct from OLD.relationship_id then
      raise exception 'order_company_assignments.relationship_id is immutable';
    end if;

    if NEW.assignment_type is distinct from OLD.assignment_type then
      raise exception 'order_company_assignments.assignment_type is immutable';
    end if;

    if NEW.status is distinct from OLD.status then
      if OLD.status in ('completed', 'declined', 'cancelled', 'revoked') then
        raise exception 'Terminal order-company assignment status cannot transition: %', OLD.status;
      end if;

      if OLD.status = 'offered' and NEW.status not in ('accepted', 'declined', 'cancelled', 'revoked') then
        raise exception 'Invalid order-company assignment status transition: % -> %', OLD.status, NEW.status;
      elsif OLD.status = 'accepted' and NEW.status not in ('in_progress', 'submitted', 'cancelled', 'revoked') then
        raise exception 'Invalid order-company assignment status transition: % -> %', OLD.status, NEW.status;
      elsif OLD.status = 'in_progress' and NEW.status not in ('submitted', 'cancelled', 'revoked') then
        raise exception 'Invalid order-company assignment status transition: % -> %', OLD.status, NEW.status;
      elsif OLD.status = 'submitted' and NEW.status not in ('completed', 'in_progress', 'revision_requested', 'revoked') then
        raise exception 'Invalid order-company assignment status transition: % -> %', OLD.status, NEW.status;
      elsif OLD.status = 'revision_requested' and NEW.status not in ('submitted') then
        raise exception 'Invalid order-company assignment status transition: % -> %', OLD.status, NEW.status;
      end if;
    end if;
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = NEW.order_id;

  if not found then
    raise exception 'Order-company assignment order does not exist';
  end if;

  if v_order_company_id is distinct from NEW.owner_company_id then
    raise exception 'Order-company assignment owner company must match source order company'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships cr
   where cr.id = NEW.relationship_id;

  if not found then
    raise exception 'Order-company assignment relationship does not exist';
  end if;

  if v_relationship.source_company_id is distinct from NEW.owner_company_id then
    raise exception 'Order-company assignment relationship source must match owner company'
      using errcode = '42501';
  end if;

  if v_relationship.target_company_id is distinct from NEW.assigned_company_id then
    raise exception 'Order-company assignment relationship target must match assigned company'
      using errcode = '42501';
  end if;

  if v_relationship.status <> 'active'
     and NEW.status in ('offered', 'accepted', 'in_progress', 'submitted', 'revision_requested') then
    raise exception 'Active order-company assignments require an active relationship'
      using errcode = '42501';
  end if;

  v_expected_assignment_type := public.order_company_assignment_expected_type(v_relationship.relationship_type);
  if v_expected_assignment_type is null then
    raise exception 'Relationship type cannot create order-company assignments: %', v_relationship.relationship_type;
  end if;

  if NEW.assignment_type <> v_expected_assignment_type then
    raise exception 'Assignment type % is incompatible with relationship type %',
      NEW.assignment_type,
      v_relationship.relationship_type;
  end if;

  return NEW;
end;
$$;

revoke all privileges on function public.tg_order_company_assignments_guard() from public, anon, authenticated;
grant execute on function public.tg_order_company_assignments_guard() to service_role;

comment on function public.tg_order_company_assignments_guard() is
  'AMC-13B.5 guard update for order-company assignment immutability, active relationship validation, owner/assigned company matching, assignment-type compatibility, and status transitions. Allows only the validated revision loop submitted -> revision_requested -> submitted while preserving existing terminal and invalid-transition protections. Resubmitted remains a vendor-facing label derived from submitted status plus resubmission metadata.';

comment on constraint order_company_assignment_activity_event_type_valid
  on public.order_company_assignment_activity is
  'AMC-13B.5 activity event allowlist. Adds assignment.revision_requested and assignment.resubmitted so AMC revision request/resubmission can log through the existing assignment activity model without creating a separate lifecycle.';

commit;
