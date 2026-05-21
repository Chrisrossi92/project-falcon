begin;

create table if not exists public.order_company_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  owner_company_id uuid not null,
  assigned_company_id uuid not null,
  relationship_id uuid not null,
  assignment_type text not null,
  status text not null default 'offered',
  instructions text null,
  terms jsonb not null default '{}'::jsonb,
  handoff_payload jsonb not null default '{}'::jsonb,
  submission_payload jsonb not null default '{}'::jsonb,
  compliance_snapshot jsonb not null default '{}'::jsonb,
  offered_by_user_id uuid null,
  accepted_by_user_id uuid null,
  declined_by_user_id uuid null,
  submitted_by_user_id uuid null,
  completed_by_user_id uuid null,
  cancelled_by_user_id uuid null,
  revoked_by_user_id uuid null,
  offered_at timestamptz null,
  accepted_at timestamptz null,
  declined_at timestamptz null,
  started_at timestamptz null,
  submitted_at timestamptz null,
  completed_at timestamptz null,
  cancelled_at timestamptz null,
  revoked_at timestamptz null,
  due_at timestamptz null,
  review_due_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_company_assignments_distinct_companies check (owner_company_id <> assigned_company_id),
  constraint order_company_assignments_assignment_type_valid check (
    assignment_type in (
      'vendor_appraisal',
      'staff_overflow',
      'review_provider',
      'enterprise_delegated',
      'billing_managed',
      'support_managed'
    )
  ),
  constraint order_company_assignments_status_valid check (
    status in (
      'offered',
      'accepted',
      'in_progress',
      'submitted',
      'completed',
      'declined',
      'cancelled',
      'revoked'
    )
  )
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_order_fkey'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      add constraint order_company_assignments_order_fkey
      foreign key (order_id)
      references public.orders(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_owner_company_fkey'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      add constraint order_company_assignments_owner_company_fkey
      foreign key (owner_company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_assigned_company_fkey'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      add constraint order_company_assignments_assigned_company_fkey
      foreign key (assigned_company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_relationship_fkey'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      add constraint order_company_assignments_relationship_fkey
      foreign key (relationship_id)
      references public.company_relationships(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_offered_by_user_fkey'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      add constraint order_company_assignments_offered_by_user_fkey
      foreign key (offered_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_accepted_by_user_fkey'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      add constraint order_company_assignments_accepted_by_user_fkey
      foreign key (accepted_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_declined_by_user_fkey'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      add constraint order_company_assignments_declined_by_user_fkey
      foreign key (declined_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_submitted_by_user_fkey'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      add constraint order_company_assignments_submitted_by_user_fkey
      foreign key (submitted_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_completed_by_user_fkey'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      add constraint order_company_assignments_completed_by_user_fkey
      foreign key (completed_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_cancelled_by_user_fkey'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      add constraint order_company_assignments_cancelled_by_user_fkey
      foreign key (cancelled_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignments_revoked_by_user_fkey'
       and conrelid = 'public.order_company_assignments'::regclass
  ) then
    alter table public.order_company_assignments
      add constraint order_company_assignments_revoked_by_user_fkey
      foreign key (revoked_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;
end;
$$;

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
      elsif OLD.status = 'submitted' and NEW.status not in ('completed', 'in_progress', 'revoked') then
        raise exception 'Invalid order-company assignment status transition: % -> %', OLD.status, NEW.status;
      end if;
    end if;
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = NEW.order_id;

  if v_order_company_id is null then
    raise exception 'Order-company assignments require an order with company ownership';
  end if;

  if v_order_company_id is distinct from NEW.owner_company_id then
    raise exception 'Order owner company mismatch for order-company assignment';
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = NEW.relationship_id;

  if not found then
    raise exception 'Order-company assignment relationship does not exist';
  end if;

  if v_relationship.status <> 'active' then
    raise exception 'Order-company assignments require an active company relationship';
  end if;

  if v_relationship.source_company_id is distinct from NEW.owner_company_id then
    raise exception 'Order-company assignment relationship source must match order owner company';
  end if;

  if v_relationship.target_company_id is distinct from NEW.assigned_company_id then
    raise exception 'Order-company assignment relationship target must match assigned company';
  end if;

  v_expected_assignment_type := case v_relationship.relationship_type
    when 'amc_vendor' then 'vendor_appraisal'
    when 'staff_overflow_vendor' then 'staff_overflow'
    when 'review_provider' then 'review_provider'
    when 'enterprise_child' then 'enterprise_delegated'
    when 'billing_managed' then 'billing_managed'
    when 'support_managed' then 'support_managed'
    else null
  end;

  if v_expected_assignment_type is null then
    raise exception 'Unsupported relationship type for order-company assignment: %', v_relationship.relationship_type;
  end if;

  if NEW.assignment_type <> v_expected_assignment_type then
    raise exception 'Assignment type % is incompatible with relationship type %', NEW.assignment_type, v_relationship.relationship_type;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_order_company_assignments_guard on public.order_company_assignments;
create trigger trg_order_company_assignments_guard
before insert or update on public.order_company_assignments
for each row execute function public.tg_order_company_assignments_guard();

create or replace function public.tg_order_company_assignments_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_order_company_assignments_touch_updated_at on public.order_company_assignments;
create trigger trg_order_company_assignments_touch_updated_at
before update on public.order_company_assignments
for each row execute function public.tg_order_company_assignments_touch_updated_at();

create unique index if not exists order_company_assignments_current_unique
  on public.order_company_assignments (order_id, assigned_company_id, assignment_type)
  where status in ('offered', 'accepted', 'in_progress', 'submitted');

create index if not exists idx_order_company_assignments_order
  on public.order_company_assignments (order_id);

create index if not exists idx_order_company_assignments_owner_status
  on public.order_company_assignments (owner_company_id, status);

create index if not exists idx_order_company_assignments_assigned_status
  on public.order_company_assignments (assigned_company_id, status);

create index if not exists idx_order_company_assignments_relationship_status
  on public.order_company_assignments (relationship_id, status);

create index if not exists idx_order_company_assignments_type_status
  on public.order_company_assignments (assignment_type, status);

create index if not exists idx_order_company_assignments_due_current
  on public.order_company_assignments (due_at)
  where status in ('offered', 'accepted', 'in_progress', 'submitted');

create index if not exists idx_order_company_assignments_created_at
  on public.order_company_assignments (created_at desc);

alter table public.order_company_assignments enable row level security;

revoke all privileges on table public.order_company_assignments from public, anon, authenticated;
revoke all privileges on function public.tg_order_company_assignments_guard() from public, anon, authenticated;
revoke all privileges on function public.tg_order_company_assignments_touch_updated_at() from public, anon, authenticated;

grant all privileges on table public.order_company_assignments to service_role;
grant execute on function public.tg_order_company_assignments_guard() to service_role;
grant execute on function public.tg_order_company_assignments_touch_updated_at() to service_role;

comment on table public.order_company_assignments is
  'Phase 8B4A service-role-only foundation for assigning specific orders from an owner company to an assigned company through an active company relationship. Rows do not grant order visibility until a later explicit read-predicate slice.';

comment on column public.order_company_assignments.order_id is
  'Owned source order. The order remains owned by orders.company_id; this foundation does not change order read visibility.';

comment on column public.order_company_assignments.owner_company_id is
  'Company that owns the order and is the relationship source. Must match orders.company_id and company_relationships.source_company_id.';

comment on column public.order_company_assignments.assigned_company_id is
  'Company receiving scoped work through an active relationship. Must match company_relationships.target_company_id.';

comment on column public.order_company_assignments.relationship_id is
  'Active company_relationships row that authorizes the existence of this assignment record. Relationship existence alone does not grant visibility.';

comment on column public.order_company_assignments.assignment_type is
  'Static assignment vocabulary for future lifecycle RPCs. Relationship type compatibility is enforced by trigger.';

comment on column public.order_company_assignments.status is
  'Assignment lifecycle status. Phase 8B4A stores lifecycle state only; no activity, notification, workflow, order visibility, or client visibility side effects are introduced.';

comment on column public.order_company_assignments.instructions is
  'Owner-company handoff instructions for future assignment lifecycle surfaces.';

comment on column public.order_company_assignments.terms is
  'Structured terms for future assignment lifecycle surfaces. No operational permissions are derived from this JSON.';

comment on column public.order_company_assignments.handoff_payload is
  'Structured handoff metadata for future assignment lifecycle surfaces. No operational permissions are derived from this JSON.';

comment on column public.order_company_assignments.submission_payload is
  'Structured assigned-company submission metadata for future assignment lifecycle surfaces.';

comment on column public.order_company_assignments.compliance_snapshot is
  'Point-in-time assignment compliance metadata. Compliance data does not grant order/client visibility.';

comment on function public.tg_order_company_assignments_guard() is
  'Phase 8B4A guard for order-company assignment immutability, active relationship validation, owner/assigned company matching, assignment-type compatibility, and status transitions. Does not modify order visibility.';

comment on function public.tg_order_company_assignments_touch_updated_at() is
  'Phase 8B4A updated_at maintenance trigger for order_company_assignments.';

commit;
