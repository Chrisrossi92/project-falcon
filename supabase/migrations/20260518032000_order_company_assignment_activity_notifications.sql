begin;

create table if not exists public.order_company_assignment_activity (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null,
  order_id uuid not null,
  owner_company_id uuid not null,
  assigned_company_id uuid not null,
  relationship_id uuid not null,
  event_type text not null,
  actor_user_id uuid null,
  actor_company_id uuid null,
  actor_side text not null default 'system',
  message text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint order_company_assignment_activity_event_type_valid check (
    event_type in (
      'assignment.offered',
      'assignment.accepted',
      'assignment.declined',
      'assignment.started',
      'assignment.submitted',
      'assignment.completed',
      'assignment.cancelled',
      'assignment.revoked'
    )
  ),
  constraint order_company_assignment_activity_actor_side_valid check (
    actor_side in ('owner', 'assigned', 'system')
  )
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignment_activity_assignment_fkey'
       and conrelid = 'public.order_company_assignment_activity'::regclass
  ) then
    alter table public.order_company_assignment_activity
      add constraint order_company_assignment_activity_assignment_fkey
      foreign key (assignment_id)
      references public.order_company_assignments(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignment_activity_order_fkey'
       and conrelid = 'public.order_company_assignment_activity'::regclass
  ) then
    alter table public.order_company_assignment_activity
      add constraint order_company_assignment_activity_order_fkey
      foreign key (order_id)
      references public.orders(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignment_activity_owner_company_fkey'
       and conrelid = 'public.order_company_assignment_activity'::regclass
  ) then
    alter table public.order_company_assignment_activity
      add constraint order_company_assignment_activity_owner_company_fkey
      foreign key (owner_company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignment_activity_assigned_company_fkey'
       and conrelid = 'public.order_company_assignment_activity'::regclass
  ) then
    alter table public.order_company_assignment_activity
      add constraint order_company_assignment_activity_assigned_company_fkey
      foreign key (assigned_company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignment_activity_relationship_fkey'
       and conrelid = 'public.order_company_assignment_activity'::regclass
  ) then
    alter table public.order_company_assignment_activity
      add constraint order_company_assignment_activity_relationship_fkey
      foreign key (relationship_id)
      references public.company_relationships(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignment_activity_actor_user_fkey'
       and conrelid = 'public.order_company_assignment_activity'::regclass
  ) then
    alter table public.order_company_assignment_activity
      add constraint order_company_assignment_activity_actor_user_fkey
      foreign key (actor_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_company_assignment_activity_actor_company_fkey'
       and conrelid = 'public.order_company_assignment_activity'::regclass
  ) then
    alter table public.order_company_assignment_activity
      add constraint order_company_assignment_activity_actor_company_fkey
      foreign key (actor_company_id)
      references public.companies(id)
      on delete set null
      not valid;
  end if;
end;
$$;

create index if not exists idx_order_company_assignment_activity_assignment_created
  on public.order_company_assignment_activity (assignment_id, created_at desc);

create index if not exists idx_order_company_assignment_activity_owner_created
  on public.order_company_assignment_activity (owner_company_id, created_at desc);

create index if not exists idx_order_company_assignment_activity_assigned_created
  on public.order_company_assignment_activity (assigned_company_id, created_at desc);

create index if not exists idx_order_company_assignment_activity_event_created
  on public.order_company_assignment_activity (event_type, created_at desc);

alter table public.order_company_assignment_activity enable row level security;

create or replace function public.order_company_assignment_user_has_permission(
  p_user_id uuid,
  p_company_id uuid,
  p_permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with ctx as (
    select
      p_user_id as user_id,
      p_company_id as company_id,
      p_permission_key as permission_key,
      public.default_company_id() as default_company_id
  ),
  active_membership as (
    select 1
      from ctx
      join public.company_memberships cm
        on cm.user_id = ctx.user_id
       and cm.company_id = ctx.company_id
       and cm.status = 'active'
  ),
  assigned_roles as (
    select r.id, r.name, r.is_owner_role
      from ctx
      join active_membership on true
      join public.user_role_assignments ura
        on ura.user_id = ctx.user_id
       and ura.company_id = ctx.company_id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
      join public.roles r
        on r.id = ura.role_id
  ),
  legacy_roles as (
    select distinct lower(trim(ur.role)) as role_name
      from ctx
      join active_membership on true
      left join public.users u
        on u.id = ctx.user_id
      join public.user_roles ur
        on ur.user_id = ctx.user_id
        or ur.user_id = u.auth_id
     where ctx.company_id = ctx.default_company_id
       and ur.role is not null
  )
  select exists (
    select 1
      from ctx
      join active_membership on true
     where exists (
       select 1
         from assigned_roles ar
        where ar.is_owner_role
           or lower(ar.name) = 'owner'
     )
        or exists (
       select 1
         from legacy_roles lr
        where lr.role_name = 'owner'
     )
        or exists (
       select 1
         from assigned_roles ar
         join public.role_permissions rp
           on rp.role_id = ar.id
        where rp.permission_key = ctx.permission_key
     )
        or exists (
       select 1
         from legacy_roles lr
         join public.roles r
           on r.company_id is null
          and lower(r.name) = lr.role_name
         join public.role_permissions rp
           on rp.role_id = r.id
        where rp.permission_key = ctx.permission_key
     )
  );
$$;

create or replace function public.order_company_assignment_assigned_notification_recipients(
  p_assignment_id uuid,
  p_event_type text,
  p_actor_user_id uuid default null
)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with assignment as (
    select *
      from public.order_company_assignments
     where id = p_assignment_id
  ),
  read_assigned as (
    select cm.user_id
      from assignment a
      join public.company_memberships cm
        on cm.company_id = a.assigned_company_id
       and cm.status = 'active'
     where cm.user_id is distinct from p_actor_user_id
       and public.order_company_assignment_user_has_permission(
         cm.user_id,
         a.assigned_company_id,
         'order_company_assignments.read_assigned'
       )
  ),
  respond_preferred as (
    select ra.user_id
      from read_assigned ra
      join assignment a on true
     where public.order_company_assignment_user_has_permission(
       ra.user_id,
       a.assigned_company_id,
       'order_company_assignments.respond'
     )
  )
  select user_id
    from respond_preferred
   where p_event_type = 'assignment.offered'
  union
  select user_id
    from read_assigned
   where p_event_type = 'assignment.offered'
     and not exists (select 1 from respond_preferred)
  union
  select user_id
    from read_assigned
   where p_event_type in (
     'assignment.completed',
     'assignment.cancelled',
     'assignment.revoked'
   );
$$;

create or replace function public.order_company_assignment_owner_notification_recipients(
  p_assignment_id uuid,
  p_event_type text,
  p_actor_user_id uuid default null
)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with assignment as (
    select *
      from public.order_company_assignments
     where id = p_assignment_id
  ),
  active_owner_members as (
    select cm.user_id, a.owner_company_id
      from assignment a
      join public.company_memberships cm
        on cm.company_id = a.owner_company_id
       and cm.status = 'active'
     where cm.user_id is distinct from p_actor_user_id
  )
  select user_id
    from active_owner_members
   where p_event_type = 'assignment.accepted'
     and public.order_company_assignment_user_has_permission(
       user_id,
       owner_company_id,
       'order_company_assignments.read_owner'
     )
  union
  select user_id
    from active_owner_members
   where p_event_type = 'assignment.declined'
     and (
       public.order_company_assignment_user_has_permission(
         user_id,
         owner_company_id,
         'order_company_assignments.read_owner'
       )
       or public.order_company_assignment_user_has_permission(
         user_id,
         owner_company_id,
         'order_company_assignments.offer'
       )
     )
  union
  select user_id
    from active_owner_members
   where p_event_type = 'assignment.submitted'
     and public.order_company_assignment_user_has_permission(
       user_id,
       owner_company_id,
       'order_company_assignments.read_owner'
     )
     and public.order_company_assignment_user_has_permission(
       user_id,
       owner_company_id,
       'order_company_assignments.complete'
     );
$$;

create or replace function public.log_order_company_assignment_event(
  p_assignment_id uuid,
  p_event_type text,
  p_actor_user_id uuid default public.current_app_user_id(),
  p_actor_company_id uuid default public.current_company_id(),
  p_message text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.order_company_assignments%rowtype;
  v_activity_id uuid;
  v_actor_side text := 'system';
begin
  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if p_actor_company_id = v_assignment.owner_company_id then
    v_actor_side := 'owner';
  elsif p_actor_company_id = v_assignment.assigned_company_id then
    v_actor_side := 'assigned';
  end if;

  insert into public.order_company_assignment_activity (
    assignment_id,
    order_id,
    owner_company_id,
    assigned_company_id,
    relationship_id,
    event_type,
    actor_user_id,
    actor_company_id,
    actor_side,
    message,
    payload
  ) values (
    v_assignment.id,
    v_assignment.order_id,
    v_assignment.owner_company_id,
    v_assignment.assigned_company_id,
    v_assignment.relationship_id,
    p_event_type,
    p_actor_user_id,
    p_actor_company_id,
    v_actor_side,
    p_message,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_activity_id;

  return v_activity_id;
end;
$$;

create or replace function public.notify_order_company_assignment_event(
  p_assignment_id uuid,
  p_event_type text,
  p_actor_user_id uuid default public.current_app_user_id(),
  p_actor_company_id uuid default public.current_company_id(),
  p_payload jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_owner_company public.companies%rowtype;
  v_assigned_company public.companies%rowtype;
  v_recipient_id uuid;
  v_recipient_company_id uuid;
  v_notification_payload jsonb;
  v_title text;
  v_body text;
  v_count integer := 0;
  v_link_path text;
  v_priority text := 'normal';
begin
  if p_event_type = 'assignment.started' then
    return 0;
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id;

  if not found then
    raise exception 'order-company assignment not found';
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

  select *
    into v_owner_company
    from public.companies
   where id = v_assignment.owner_company_id;

  select *
    into v_assigned_company
    from public.companies
   where id = v_assignment.assigned_company_id;

  v_link_path := '/assignments/' || v_assignment.id::text;
  v_title := case p_event_type
    when 'assignment.offered' then 'Assignment offered'
    when 'assignment.accepted' then 'Assignment accepted'
    when 'assignment.declined' then 'Assignment declined'
    when 'assignment.submitted' then 'Assignment submitted'
    when 'assignment.completed' then 'Assignment completed'
    when 'assignment.cancelled' then 'Assignment cancelled'
    when 'assignment.revoked' then 'Assignment revoked'
    else 'Assignment update'
  end;
  v_priority := case p_event_type
    when 'assignment.offered' then 'high'
    when 'assignment.submitted' then 'high'
    when 'assignment.cancelled' then 'high'
    when 'assignment.revoked' then 'high'
    else 'normal'
  end;

  for v_recipient_id in
    select recipient.user_id
      from public.order_company_assignment_assigned_notification_recipients(
        p_assignment_id,
        p_event_type,
        p_actor_user_id
      ) as recipient(user_id)
    union
    select recipient.user_id
      from public.order_company_assignment_owner_notification_recipients(
        p_assignment_id,
        p_event_type,
        p_actor_user_id
      ) as recipient(user_id)
  loop
    if exists (
      select 1
        from public.company_memberships cm
       where cm.user_id = v_recipient_id
         and cm.company_id = v_assignment.assigned_company_id
         and cm.status = 'active'
    ) then
      v_recipient_company_id := v_assignment.assigned_company_id;
      v_notification_payload := jsonb_build_object(
        'source_type', 'order_company_assignment',
        'event_key', p_event_type,
        'assignment_id', v_assignment.id,
        'assignment_type', v_assignment.assignment_type,
        'assignment_status', v_assignment.status,
        'owner_company_id', v_assignment.owner_company_id,
        'assigned_company_id', v_assignment.assigned_company_id,
        'relationship_id', v_assignment.relationship_id,
        'order_number', v_order.order_number,
        'order_status', v_order.status,
        'city', v_order.city,
        'state', v_order.state,
        'property_type', v_order.property_type,
        'report_type', v_order.report_type,
        'due_at', v_assignment.due_at,
        'review_due_at', v_assignment.review_due_at
      );
      v_body := trim(both ' ' from concat_ws(
        ' ',
        nullif(v_order.order_number, ''),
        nullif(concat_ws(', ', nullif(v_order.city, ''), nullif(v_order.state, '')), '')
      ));
    else
      v_recipient_company_id := v_assignment.owner_company_id;
      v_notification_payload := jsonb_build_object(
        'source_type', 'order_company_assignment',
        'event_key', p_event_type,
        'assignment_id', v_assignment.id,
        'assignment_type', v_assignment.assignment_type,
        'assignment_status', v_assignment.status,
        'owner_company_id', v_assignment.owner_company_id,
        'assigned_company_id', v_assignment.assigned_company_id,
        'relationship_id', v_assignment.relationship_id,
        'order_id', v_assignment.order_id,
        'order_number', v_order.order_number,
        'order_status', v_order.status,
        'assigned_company_name', v_assigned_company.name,
        'city', v_order.city,
        'state', v_order.state,
        'property_type', v_order.property_type,
        'report_type', v_order.report_type,
        'due_at', v_assignment.due_at,
        'review_due_at', v_assignment.review_due_at
      );
      v_body := trim(both ' ' from concat_ws(
        ' ',
        nullif(v_assigned_company.name, ''),
        nullif(v_order.order_number, '')
      ));
    end if;

    insert into public.notifications (
      user_id,
      company_id,
      type,
      category,
      title,
      body,
      message,
      order_id,
      is_read,
      read,
      created_at,
      link_path,
      payload,
      priority
    ) values (
      v_recipient_id,
      v_recipient_company_id,
      p_event_type,
      'assignment',
      v_title,
      nullif(v_body, ''),
      nullif(v_body, ''),
      null,
      false,
      false,
      now(),
      v_link_path,
      case
        when v_recipient_company_id = v_assignment.owner_company_id
          then v_notification_payload || coalesce(p_payload, '{}'::jsonb)
        else v_notification_payload
      end,
      v_priority
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
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

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.accepted',
    v_actor_user_id,
    v_company_id,
    'Assignment accepted',
    '{}'::jsonb
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.accepted',
    v_actor_user_id,
    v_company_id,
    '{}'::jsonb
  );

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
  v_payload jsonb := '{}'::jsonb;
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

  if nullif(trim(coalesce(p_reason, '')), '') is not null then
    v_payload := jsonb_build_object('reason', p_reason);
  end if;

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.declined',
    v_actor_user_id,
    v_company_id,
    'Assignment declined',
    v_payload
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.declined',
    v_actor_user_id,
    v_company_id,
    v_payload
  );

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

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.started',
    v_actor_user_id,
    v_company_id,
    'Assignment started',
    '{}'::jsonb
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.started',
    v_actor_user_id,
    v_company_id,
    '{}'::jsonb
  );

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

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.submitted',
    v_actor_user_id,
    v_company_id,
    'Assignment submitted',
    '{}'::jsonb
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.submitted',
    v_actor_user_id,
    v_company_id,
    '{}'::jsonb
  );

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
  v_payload jsonb := '{}'::jsonb;
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

  if nullif(trim(coalesce(p_completion_note, '')), '') is not null then
    v_payload := jsonb_build_object('completion_note', p_completion_note);
  end if;

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.completed',
    v_actor_user_id,
    v_company_id,
    'Assignment completed',
    v_payload
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.completed',
    v_actor_user_id,
    v_company_id,
    v_payload
  );

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
  v_payload jsonb := '{}'::jsonb;
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

  if nullif(trim(coalesce(p_reason, '')), '') is not null then
    v_payload := jsonb_build_object('reason', p_reason);
  end if;

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.cancelled',
    v_actor_user_id,
    v_company_id,
    'Assignment cancelled',
    v_payload
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.cancelled',
    v_actor_user_id,
    v_company_id,
    v_payload
  );

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
  v_payload jsonb := '{}'::jsonb;
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

  if nullif(trim(coalesce(p_reason, '')), '') is not null then
    v_payload := jsonb_build_object('reason', p_reason);
  end if;

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.revoked',
    v_actor_user_id,
    v_company_id,
    'Assignment revoked',
    v_payload
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.revoked',
    v_actor_user_id,
    v_company_id,
    v_payload
  );

  return p_assignment_id;
end;
$$;

revoke all privileges on table public.order_company_assignment_activity from public, anon, authenticated;
grant all privileges on table public.order_company_assignment_activity to service_role;

revoke all on function public.order_company_assignment_user_has_permission(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.order_company_assignment_assigned_notification_recipients(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.order_company_assignment_owner_notification_recipients(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.log_order_company_assignment_event(uuid, text, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.notify_order_company_assignment_event(uuid, text, uuid, uuid, jsonb) from public, anon, authenticated;

grant execute on function public.order_company_assignment_user_has_permission(uuid, uuid, text) to service_role;
grant execute on function public.order_company_assignment_assigned_notification_recipients(uuid, text, uuid) to service_role;
grant execute on function public.order_company_assignment_owner_notification_recipients(uuid, text, uuid) to service_role;
grant execute on function public.log_order_company_assignment_event(uuid, text, uuid, uuid, text, jsonb) to service_role;
grant execute on function public.notify_order_company_assignment_event(uuid, text, uuid, uuid, jsonb) to service_role;

revoke all on function public.rpc_order_company_assignment_offer(uuid, uuid, uuid, text, text, jsonb, jsonb, timestamptz, timestamptz, timestamptz) from public, anon;
revoke all on function public.rpc_order_company_assignment_accept(uuid) from public, anon;
revoke all on function public.rpc_order_company_assignment_decline(uuid, text) from public, anon;
revoke all on function public.rpc_order_company_assignment_start(uuid) from public, anon;
revoke all on function public.rpc_order_company_assignment_submit(uuid, jsonb) from public, anon;
revoke all on function public.rpc_order_company_assignment_complete(uuid, text) from public, anon;
revoke all on function public.rpc_order_company_assignment_cancel(uuid, text) from public, anon;
revoke all on function public.rpc_order_company_assignment_revoke(uuid, text) from public, anon;

grant execute on function public.rpc_order_company_assignment_offer(uuid, uuid, uuid, text, text, jsonb, jsonb, timestamptz, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_accept(uuid) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_decline(uuid, text) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_start(uuid) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_submit(uuid, jsonb) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_complete(uuid, text) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_cancel(uuid, text) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_revoke(uuid, text) to authenticated, service_role;

comment on table public.order_company_assignment_activity is
  'Phase 8B4E assignment-scoped activity log. This is not canonical order activity and does not grant order, client, calendar, notification, or canonical order-view visibility.';

comment on column public.order_company_assignment_activity.order_id is
  'Owner-order audit pointer only. Assigned-company activity access must be assignment-scoped and must not derive canonical order visibility from this value.';

comment on function public.order_company_assignment_user_has_permission(uuid, uuid, text) is
  'Phase 8B4E internal permission predicate for assignment notification recipient resolution. Not an app-facing authorization surface.';

comment on function public.order_company_assignment_assigned_notification_recipients(uuid, text, uuid) is
  'Phase 8B4E internal assigned-company recipient resolver. Relationship existence alone grants nothing; active membership and assignment permissions are required.';

comment on function public.order_company_assignment_owner_notification_recipients(uuid, text, uuid) is
  'Phase 8B4E internal owner-company recipient resolver for assignment lifecycle notifications.';

comment on function public.log_order_company_assignment_event(uuid, text, uuid, uuid, text, jsonb) is
  'Phase 8B4E internal assignment activity writer. Assignment activity is separate from activity_log and does not expose owner-company order activity to assigned companies.';

comment on function public.notify_order_company_assignment_event(uuid, text, uuid, uuid, jsonb) is
  'Phase 8B4E internal assignment notification writer. Vendor notifications use notifications.order_id = null and /assignments/:assignment_id links, preserving current order-read boundaries.';

comment on function public.rpc_order_company_assignment_offer(uuid, uuid, uuid, text, text, jsonb, jsonb, timestamptz, timestamptz, timestamptz) is
  'Phase 8B4E owner-side assignment offer RPC with assignment-scoped activity and notification side effects. Does not modify core order assignment columns or grant vendor order visibility.';

comment on function public.rpc_order_company_assignment_accept(uuid) is
  'Phase 8B4E assigned-company accept RPC with assignment-scoped activity and owner notification side effects. Acting by assignment_id is not canonical order read access.';

comment on function public.rpc_order_company_assignment_decline(uuid, text) is
  'Phase 8B4E assigned-company decline RPC with assignment-scoped activity and owner notification side effects. Acting by assignment_id is not canonical order read access.';

comment on function public.rpc_order_company_assignment_start(uuid) is
  'Phase 8B4E assigned-company start RPC with assignment-scoped activity only. No owner order activity or canonical order visibility is exposed.';

comment on function public.rpc_order_company_assignment_submit(uuid, jsonb) is
  'Phase 8B4E assigned-company submit RPC with assignment-scoped activity and owner notification side effects. Acting by assignment_id is not canonical order read access.';

comment on function public.rpc_order_company_assignment_complete(uuid, text) is
  'Phase 8B4E owner-company complete RPC with assignment-scoped activity and assigned-company notification side effects. Notifications route to assignment packet context.';

comment on function public.rpc_order_company_assignment_cancel(uuid, text) is
  'Phase 8B4E owner-company cancel RPC with assignment-scoped activity and assigned-company notification side effects. Notifications route to assignment packet context.';

comment on function public.rpc_order_company_assignment_revoke(uuid, text) is
  'Phase 8B4E owner-company revoke RPC with assignment-scoped activity and assigned-company notification side effects. Notifications route to assignment packet context.';

commit;
