begin;

create or replace function public.app_user_has_company_role(
  p_user_id uuid,
  p_company_id uuid,
  p_role_names text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      p_user_id as user_id,
      coalesce(p_company_id, public.default_company_id()) as company_id,
      array(
        select lower(trim(role_name))
        from unnest(coalesce(p_role_names, array[]::text[])) as role_name
        where nullif(trim(role_name), '') is not null
      ) as role_names
  )
  select exists (
    select 1
    from normalized n
    join public.company_memberships cm
      on cm.user_id = n.user_id
     and cm.company_id = n.company_id
     and cm.status = 'active'
    join public.user_role_assignments ura
      on ura.user_id = n.user_id
     and ura.company_id = n.company_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
    join public.roles r
      on r.id = ura.role_id
    where lower(r.name) = any(n.role_names)
  )
  or exists (
    select 1
    from normalized n
    join public.company_memberships cm
      on cm.user_id = n.user_id
     and cm.company_id = n.company_id
     and cm.status = 'active'
    join public.user_roles ur
      on ur.user_id = n.user_id
    where n.company_id = public.default_company_id()
      and lower(ur.role) = any(n.role_names)
  );
$$;

revoke execute on function public.app_user_has_company_role(uuid, uuid, text[]) from public;
revoke execute on function public.app_user_has_company_role(uuid, uuid, text[]) from anon;
grant execute on function public.app_user_has_company_role(uuid, uuid, text[]) to authenticated;
grant execute on function public.app_user_has_company_role(uuid, uuid, text[]) to service_role;

create or replace function public.current_app_user_can_assign_order_target(
  p_target_user_id uuid,
  p_company_id uuid,
  p_assignment_kind text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      p_target_user_id as target_user_id,
      coalesce(p_company_id, public.default_company_id()) as company_id,
      lower(trim(coalesce(p_assignment_kind, ''))) as assignment_kind
  )
  select
    p_target_user_id is null
    or auth.role() = 'service_role'
    or exists (
      select 1
      from normalized n
      join public.company_memberships cm
        on cm.user_id = n.target_user_id
       and cm.company_id = n.company_id
       and cm.status = 'active'
      where n.company_id = public.current_company_id()
        and case
          when n.assignment_kind in ('appraiser', 'assigned_to') then
            public.app_user_has_company_role(n.target_user_id, n.company_id, array['appraiser'])
          when n.assignment_kind in ('reviewer', 'current_reviewer') then
            public.app_user_has_company_role(n.target_user_id, n.company_id, array['reviewer'])
          else false
        end
    );
$$;

revoke execute on function public.current_app_user_can_assign_order_target(uuid, uuid, text) from public;
revoke execute on function public.current_app_user_can_assign_order_target(uuid, uuid, text) from anon;
grant execute on function public.current_app_user_can_assign_order_target(uuid, uuid, text) to authenticated;
grant execute on function public.current_app_user_can_assign_order_target(uuid, uuid, text) to service_role;

create or replace function public.tg_orders_validate_assignment_targets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := coalesce(NEW.company_id, OLD.company_id, public.default_company_id());
begin
  if TG_OP = 'INSERT' or NEW.appraiser_id is distinct from OLD.appraiser_id then
    if not public.current_app_user_can_assign_order_target(NEW.appraiser_id, v_company_id, 'appraiser') then
      raise exception 'appraiser_id % is not an assignable current-company appraiser', NEW.appraiser_id
        using errcode = '42501';
    end if;
  end if;

  if TG_OP = 'INSERT' or NEW.assigned_to is distinct from OLD.assigned_to then
    if not public.current_app_user_can_assign_order_target(NEW.assigned_to, v_company_id, 'assigned_to') then
      raise exception 'assigned_to % is not an assignable current-company appraiser', NEW.assigned_to
        using errcode = '42501';
    end if;
  end if;

  if TG_OP = 'INSERT' or NEW.reviewer_id is distinct from OLD.reviewer_id then
    if not public.current_app_user_can_assign_order_target(NEW.reviewer_id, v_company_id, 'reviewer') then
      raise exception 'reviewer_id % is not an assignable current-company reviewer', NEW.reviewer_id
        using errcode = '42501';
    end if;
  end if;

  if TG_OP = 'INSERT' or NEW.current_reviewer_id is distinct from OLD.current_reviewer_id then
    if not public.current_app_user_can_assign_order_target(NEW.current_reviewer_id, v_company_id, 'current_reviewer') then
      raise exception 'current_reviewer_id % is not an assignable current-company reviewer', NEW.current_reviewer_id
        using errcode = '42501';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_orders_validate_assignment_targets on public.orders;
create trigger trg_orders_validate_assignment_targets
before insert or update of appraiser_id, assigned_to, reviewer_id, current_reviewer_id, company_id on public.orders
for each row execute function public.tg_orders_validate_assignment_targets();

create or replace function public.rpc_assign_order(p_order_id uuid, p_appraiser_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_assign_order(uuid,uuid) is deprecated and quarantined; use tenant-safe direct orders updates or rpc_assign_order(uuid,uuid,text)'
    using errcode = '0A000';
end;
$$;

drop function public.rpc_assign_order(uuid, uuid, text);

create or replace function public.rpc_assign_order(
  p_order_id uuid,
  p_assigned_to uuid,
  p_note text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_row public.orders;
  v_actor uuid := public.current_app_user_id();
begin
  if v_actor is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
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

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id() then
    raise exception 'order is not in the current company'
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

  if not public.current_app_user_has_any_permission(array[
    'assignments.assign_appraiser',
    'assignments.reassign'
  ]) then
    raise exception 'missing required assignment permission'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_assign_order_target(
    p_assigned_to,
    v_order.company_id,
    'assigned_to'
  ) then
    raise exception 'assigned_to % is not an assignable current-company appraiser', p_assigned_to
      using errcode = '42501';
  end if;

  update public.orders
     set assigned_to = p_assigned_to,
         updated_at = now()
   where id = p_order_id
   returning * into v_row;

  insert into public.activity_log(order_id, company_id, actor_user_id, action, message)
  values (p_order_id, v_row.company_id, v_actor, 'assignment', coalesce(p_note, 'assigned'));

  return v_row;
end;
$$;

create or replace function public.rpc_assign_reviewer(order_id uuid, reviewer_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_assign_reviewer(uuid,uuid) is deprecated and quarantined; use tenant-safe direct orders updates after review routing is redesigned'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_assign_next_reviewer(order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_assign_next_reviewer(uuid) is deprecated and quarantined; review routing requires a tenant-safe redesign'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_update_due_dates(
  p_order_id uuid,
  p_due_date date,
  p_review_due_date date
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_row public.orders;
begin
  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
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

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id() then
    raise exception 'order is not in the current company'
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

  update public.orders
     set due_date = p_due_date,
         review_due_date = p_review_due_date,
         updated_at = now()
   where id = p_order_id
   returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.rpc_update_order_dates(
  order_id uuid,
  site_visit_at timestamp with time zone,
  review_due_at timestamp with time zone,
  final_due_at timestamp with time zone
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_row public.orders;
begin
  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders
   where id = order_id
   for update;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id() then
    raise exception 'order is not in the current company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(order_id) then
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

  update public.orders
     set site_visit_at = rpc_update_order_dates.site_visit_at,
         review_due_at = rpc_update_order_dates.review_due_at,
         final_due_at = rpc_update_order_dates.final_due_at,
         updated_at = now()
   where id = rpc_update_order_dates.order_id
   returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.rpc_order_set_dates(
  p_order_id uuid,
  p_site_visit_at timestamp without time zone default null,
  p_review_due_at date default null,
  p_due_date date default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_order_set_dates(uuid,timestamp,date,date) is deprecated and quarantined; use tenant-safe direct orders updates or rpc_update_order_dates(uuid,timestamptz,timestamptz,timestamptz)'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_order_set_dates(
  p_order_id uuid,
  p_site_visit_at timestamp with time zone default null,
  p_review_due_at date default null,
  p_final_due_at date default null,
  p_due_date date default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_order_set_dates(uuid,timestamptz,date,date,date) is deprecated and quarantined; use tenant-safe direct orders updates or rpc_update_order_dates(uuid,timestamptz,timestamptz,timestamptz)'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_order_update_dates(
  p_order_id text,
  p_site_visit_at timestamp with time zone,
  p_review_due_at timestamp with time zone,
  p_final_due_at timestamp with time zone,
  p_due_date timestamp with time zone
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_order_update_dates(text,timestamptz,timestamptz,timestamptz,timestamptz) is deprecated and quarantined; use tenant-safe direct orders updates or rpc_update_order_dates(uuid,timestamptz,timestamptz,timestamptz)'
    using errcode = '0A000';
end;
$$;

create or replace function public.set_order_appointment(
  p_order_id uuid,
  p_datetime timestamp with time zone,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, falcon_mvp, auth, extensions
as $$
begin
  raise exception 'set_order_appointment(uuid,timestamptz,text) is deprecated and quarantined; use tenant-safe order site_visit_at updates'
    using errcode = '0A000';
end;
$$;

revoke execute on function public.rpc_assign_order(uuid, uuid, text) from public;
revoke execute on function public.rpc_assign_order(uuid, uuid, text) from anon;
grant execute on function public.rpc_assign_order(uuid, uuid, text) to authenticated;
grant execute on function public.rpc_assign_order(uuid, uuid, text) to service_role;

revoke execute on function public.rpc_update_due_dates(uuid, date, date) from public;
revoke execute on function public.rpc_update_due_dates(uuid, date, date) from anon;
grant execute on function public.rpc_update_due_dates(uuid, date, date) to authenticated;
grant execute on function public.rpc_update_due_dates(uuid, date, date) to service_role;

revoke execute on function public.rpc_update_order_dates(uuid, timestamp with time zone, timestamp with time zone, timestamp with time zone) from public;
revoke execute on function public.rpc_update_order_dates(uuid, timestamp with time zone, timestamp with time zone, timestamp with time zone) from anon;
grant execute on function public.rpc_update_order_dates(uuid, timestamp with time zone, timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.rpc_update_order_dates(uuid, timestamp with time zone, timestamp with time zone, timestamp with time zone) to service_role;

revoke execute on function public.rpc_assign_order(uuid, uuid) from public;
revoke execute on function public.rpc_assign_order(uuid, uuid) from anon;
revoke execute on function public.rpc_assign_order(uuid, uuid) from authenticated;
grant execute on function public.rpc_assign_order(uuid, uuid) to service_role;

revoke execute on function public.rpc_assign_reviewer(uuid, uuid) from public;
revoke execute on function public.rpc_assign_reviewer(uuid, uuid) from anon;
revoke execute on function public.rpc_assign_reviewer(uuid, uuid) from authenticated;
grant execute on function public.rpc_assign_reviewer(uuid, uuid) to service_role;

revoke execute on function public.rpc_assign_next_reviewer(uuid) from public;
revoke execute on function public.rpc_assign_next_reviewer(uuid) from anon;
revoke execute on function public.rpc_assign_next_reviewer(uuid) from authenticated;
grant execute on function public.rpc_assign_next_reviewer(uuid) to service_role;

revoke execute on function public.rpc_order_set_dates(uuid, timestamp without time zone, date, date) from public;
revoke execute on function public.rpc_order_set_dates(uuid, timestamp without time zone, date, date) from anon;
revoke execute on function public.rpc_order_set_dates(uuid, timestamp without time zone, date, date) from authenticated;
grant execute on function public.rpc_order_set_dates(uuid, timestamp without time zone, date, date) to service_role;

revoke execute on function public.rpc_order_set_dates(uuid, timestamp with time zone, date, date, date) from public;
revoke execute on function public.rpc_order_set_dates(uuid, timestamp with time zone, date, date, date) from anon;
revoke execute on function public.rpc_order_set_dates(uuid, timestamp with time zone, date, date, date) from authenticated;
grant execute on function public.rpc_order_set_dates(uuid, timestamp with time zone, date, date, date) to service_role;

revoke execute on function public.rpc_order_update_dates(text, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone) from public;
revoke execute on function public.rpc_order_update_dates(text, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone) from anon;
revoke execute on function public.rpc_order_update_dates(text, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone) from authenticated;
grant execute on function public.rpc_order_update_dates(text, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone) to service_role;

revoke execute on function public.set_order_appointment(uuid, timestamp with time zone, text) from public;
revoke execute on function public.set_order_appointment(uuid, timestamp with time zone, text) from anon;
revoke execute on function public.set_order_appointment(uuid, timestamp with time zone, text) from authenticated;
grant execute on function public.set_order_appointment(uuid, timestamp with time zone, text) to service_role;

comment on function public.app_user_has_company_role(uuid, uuid, text[]) is
  'Slice 7F4A helper. Checks active company membership plus current-company role assignment, with default-company legacy role fallback for compatibility.';

comment on function public.current_app_user_can_assign_order_target(uuid, uuid, text) is
  'Slice 7F4A helper. Validates appraiser/reviewer assignment targets against current-company membership and role capability.';

comment on function public.tg_orders_validate_assignment_targets() is
  'Slice 7F4A trigger guard. Validates appraiser_id, assigned_to, reviewer_id, and current_reviewer_id target users before assignment writes.';

comment on function public.rpc_assign_order(uuid, uuid, text) is
  'Slice 7F4A guarded compatibility RPC. Requires current-company membership, readable/updateable order, assignment permission, and an assignable current-company appraiser target.';

comment on function public.rpc_update_due_dates(uuid, date, date) is
  'Slice 7F4A guarded compatibility RPC. Requires current-company membership plus readable/updateable order before date mutation.';

comment on function public.rpc_update_order_dates(uuid, timestamp with time zone, timestamp with time zone, timestamp with time zone) is
  'Slice 7F4A guarded date RPC. Requires current-company membership plus readable/updateable order before site/review/final date mutation.';

comment on function public.rpc_assign_order(uuid, uuid) is
  'Slice 7F4A quarantine. Deprecated appraiser assignment RPC without tenant-safe target validation; preserved only as a service_role-callable exception.';

comment on function public.rpc_assign_reviewer(uuid, uuid) is
  'Slice 7F4A quarantine. Deprecated current_reviewer_id assignment RPC without tenant-safe review routing semantics; preserved only as a service_role-callable exception.';

comment on function public.rpc_assign_next_reviewer(uuid) is
  'Slice 7F4A quarantine. Deprecated review_route helper; review routing requires tenant-safe redesign before re-enabling.';

comment on function public.rpc_order_set_dates(uuid, timestamp without time zone, date, date) is
  'Slice 7F4A quarantine. Deprecated mixed legacy date RPC; use tenant-safe direct orders updates or rpc_update_order_dates.';

comment on function public.rpc_order_set_dates(uuid, timestamp with time zone, date, date, date) is
  'Slice 7F4A quarantine. Deprecated mixed legacy date RPC; use tenant-safe direct orders updates or rpc_update_order_dates.';

comment on function public.rpc_order_update_dates(text, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone) is
  'Slice 7F4A quarantine. Deprecated text-id date RPC with legacy role checks; use tenant-safe direct orders updates or rpc_update_order_dates.';

comment on function public.set_order_appointment(uuid, timestamp with time zone, text) is
  'Slice 7F4A quarantine. Deprecated falcon_mvp appointment helper; use tenant-safe order site_visit_at updates.';

commit;
