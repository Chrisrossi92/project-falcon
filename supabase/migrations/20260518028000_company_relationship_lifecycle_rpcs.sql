begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values
  ('relationships.read', 'relationships', 'Read company relationships', 'View company relationship records involving the current company.', true, false),
  ('relationships.invite', 'relationships', 'Invite company relationships', 'Invite another company into a directional company relationship.', true, false),
  ('relationships.approve', 'relationships', 'Approve company relationships', 'Approve or decline incoming company relationship invitations.', true, false),
  ('relationships.suspend', 'relationships', 'Suspend company relationships', 'Suspend or reactivate company relationships.', true, false),
  ('relationships.archive', 'relationships', 'Archive company relationships', 'Archive company relationships.', true, false),
  ('relationships.manage_compliance', 'relationships', 'Manage relationship compliance', 'Manage compliance metadata for company relationships.', true, false),
  ('relationships.assign_work', 'relationships', 'Assign work through relationships', 'Future permission for assigning scoped work through company relationships.', true, false)
on conflict (key) do update
  set category = excluded.category,
      label = excluded.label,
      description = excluded.description,
      is_system = excluded.is_system,
      is_owner_only = excluded.is_owner_only,
      updated_at = now();

create or replace function public.current_app_user_can_read_company_relationship_row(
  p_source_company_id uuid,
  p_target_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and public.current_company_id() in (p_source_company_id, p_target_company_id)
    and public.current_app_user_has_permission('relationships.read');
$$;

create or replace function public.current_app_user_can_invite_company_relationship(
  p_target_company_id uuid,
  p_relationship_type text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with ctx as (
    select public.current_company_id() as source_company_id
  ),
  relationship_type as (
    select crt.*
      from public.company_relationship_types crt
     where crt.key = p_relationship_type
       and crt.is_active
  ),
  source_company as (
    select c.*
      from public.companies c
      join ctx on ctx.source_company_id = c.id
     where c.status = 'active'
  ),
  target_company as (
    select c.*
      from public.companies c
     where c.id = p_target_company_id
       and c.status = 'active'
  )
  select exists (
    select 1
      from ctx
      join relationship_type rt on true
      join source_company sc on true
      join target_company tc on true
     where public.current_app_user_has_current_company()
       and public.current_app_user_has_permission('relationships.invite')
       and ctx.source_company_id <> p_target_company_id
       and (
         coalesce(array_length(rt.allowed_source_company_types, 1), 0) = 0
         or sc.company_type = any(rt.allowed_source_company_types)
       )
       and (
         coalesce(array_length(rt.allowed_target_company_types, 1), 0) = 0
         or tc.company_type = any(rt.allowed_target_company_types)
       )
       and not exists (
         select 1
           from public.company_relationships cr
          where cr.source_company_id = ctx.source_company_id
            and cr.target_company_id = p_target_company_id
            and cr.relationship_type = p_relationship_type
            and cr.status in ('invited', 'active', 'suspended')
       )
  );
$$;

create or replace function public.current_app_user_can_approve_company_relationship(
  p_source_company_id uuid,
  p_target_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and public.current_company_id() = p_target_company_id
    and public.current_company_id() <> p_source_company_id
    and public.current_app_user_has_permission('relationships.approve');
$$;

create or replace function public.current_app_user_can_suspend_company_relationship(
  p_source_company_id uuid,
  p_target_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and public.current_company_id() in (p_source_company_id, p_target_company_id)
    and public.current_app_user_has_permission('relationships.suspend');
$$;

create or replace function public.current_app_user_can_archive_company_relationship(
  p_source_company_id uuid,
  p_target_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and public.current_company_id() = p_source_company_id
    and public.current_company_id() <> p_target_company_id
    and public.current_app_user_has_permission('relationships.archive');
$$;

create or replace function public.current_app_user_can_manage_company_relationship_compliance(
  p_source_company_id uuid,
  p_target_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and public.current_company_id() in (p_source_company_id, p_target_company_id)
    and public.current_app_user_has_permission('relationships.manage_compliance');
$$;

create or replace function public.tg_company_relationships_guard_immutable_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if NEW.source_company_id is distinct from OLD.source_company_id then
    raise exception 'company_relationships.source_company_id is immutable';
  end if;

  if NEW.target_company_id is distinct from OLD.target_company_id then
    raise exception 'company_relationships.target_company_id is immutable';
  end if;

  if NEW.relationship_type is distinct from OLD.relationship_type then
    raise exception 'company_relationships.relationship_type is immutable';
  end if;

  if NEW.status is distinct from OLD.status then
    if OLD.status = 'archived' then
      raise exception 'Archived company relationships are terminal';
    end if;

    if OLD.status = 'invited' and NEW.status not in ('active', 'declined', 'archived') then
      raise exception 'Invalid company relationship status transition: % -> %', OLD.status, NEW.status;
    elsif OLD.status = 'active' and NEW.status not in ('suspended', 'archived') then
      raise exception 'Invalid company relationship status transition: % -> %', OLD.status, NEW.status;
    elsif OLD.status = 'suspended' and NEW.status not in ('active', 'archived') then
      raise exception 'Invalid company relationship status transition: % -> %', OLD.status, NEW.status;
    elsif OLD.status = 'declined' and NEW.status <> 'archived' then
      raise exception 'Invalid company relationship status transition: % -> %', OLD.status, NEW.status;
    elsif OLD.status = 'expired' and NEW.status <> 'archived' then
      raise exception 'Invalid company relationship status transition: % -> %', OLD.status, NEW.status;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_company_relationships_guard_immutable_status on public.company_relationships;
create trigger trg_company_relationships_guard_immutable_status
before update on public.company_relationships
for each row execute function public.tg_company_relationships_guard_immutable_status();

create or replace function public.rpc_company_relationship_list(
  p_scope text default 'all',
  p_status text default null
)
returns table (
  id uuid,
  source_company_id uuid,
  source_company_name text,
  target_company_id uuid,
  target_company_name text,
  relationship_type text,
  relationship_type_label text,
  status text,
  settings jsonb,
  compliance jsonb,
  notes text,
  invited_at timestamptz,
  approved_at timestamptz,
  suspended_at timestamptz,
  archived_at timestamptz,
  declined_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'all'));
  v_company_id uuid := public.current_company_id();
begin
  if v_scope not in ('all', 'incoming', 'outgoing') then
    raise exception 'Invalid relationship list scope: %', p_scope;
  end if;

  if not public.current_app_user_has_current_company()
     or not public.current_app_user_has_permission('relationships.read') then
    raise exception 'Not authorized to list company relationships';
  end if;

  return query
  select
    cr.id,
    cr.source_company_id,
    sc.name as source_company_name,
    cr.target_company_id,
    tc.name as target_company_name,
    cr.relationship_type,
    crt.label as relationship_type_label,
    cr.status,
    cr.settings,
    cr.compliance,
    cr.notes,
    cr.invited_at,
    cr.approved_at,
    cr.suspended_at,
    cr.archived_at,
    cr.declined_at,
    cr.starts_at,
    cr.ends_at,
    cr.created_at,
    cr.updated_at
  from public.company_relationships cr
  join public.companies sc
    on sc.id = cr.source_company_id
  join public.companies tc
    on tc.id = cr.target_company_id
  join public.company_relationship_types crt
    on crt.key = cr.relationship_type
  where public.current_app_user_can_read_company_relationship_row(cr.source_company_id, cr.target_company_id)
    and (p_status is null or cr.status = p_status)
    and (
      v_scope = 'all'
      or (v_scope = 'incoming' and cr.target_company_id = v_company_id)
      or (v_scope = 'outgoing' and cr.source_company_id = v_company_id)
    )
  order by cr.updated_at desc, cr.created_at desc;
end;
$$;

create or replace function public.rpc_company_relationship_detail(
  p_relationship_id uuid
)
returns table (
  id uuid,
  source_company_id uuid,
  source_company_name text,
  target_company_id uuid,
  target_company_name text,
  relationship_type text,
  relationship_type_label text,
  status text,
  settings jsonb,
  compliance jsonb,
  notes text,
  invited_at timestamptz,
  approved_at timestamptz,
  suspended_at timestamptz,
  archived_at timestamptz,
  declined_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
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
    from public.rpc_company_relationship_list('all', null) listed
   where listed.id = p_relationship_id;

  if not found then
    raise exception 'Company relationship not found or not authorized';
  end if;
end;
$$;

create or replace function public.rpc_company_relationship_invite(
  p_target_company_id uuid,
  p_relationship_type text,
  p_settings jsonb default '{}'::jsonb,
  p_compliance jsonb default '{}'::jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_relationship_id uuid;
  v_source_company_id uuid := public.current_company_id();
  v_actor_user_id uuid := public.current_app_user_id();
begin
  if not public.current_app_user_can_invite_company_relationship(p_target_company_id, p_relationship_type) then
    raise exception 'Not authorized to invite company relationship';
  end if;

  insert into public.company_relationships (
    source_company_id,
    target_company_id,
    relationship_type,
    status,
    invited_by_user_id,
    invited_at,
    settings,
    compliance,
    notes
  ) values (
    v_source_company_id,
    p_target_company_id,
    p_relationship_type,
    'invited',
    v_actor_user_id,
    now(),
    coalesce(p_settings, '{}'::jsonb),
    coalesce(p_compliance, '{}'::jsonb),
    p_notes
  )
  returning id into v_relationship_id;

  return v_relationship_id;
end;
$$;

create or replace function public.rpc_company_relationship_accept(
  p_relationship_id uuid,
  p_compliance jsonb default '{}'::jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_relationship public.company_relationships%rowtype;
  v_actor_user_id uuid := public.current_app_user_id();
begin
  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id
   for update;

  if not found then
    raise exception 'Company relationship not found';
  end if;

  if v_relationship.status <> 'invited' then
    raise exception 'Only invited company relationships can be accepted';
  end if;

  if not public.current_app_user_can_approve_company_relationship(v_relationship.source_company_id, v_relationship.target_company_id) then
    raise exception 'Not authorized to accept company relationship';
  end if;

  update public.company_relationships
     set status = 'active',
         approved_by_user_id = v_actor_user_id,
         approved_at = now(),
         compliance = coalesce(p_compliance, v_relationship.compliance, '{}'::jsonb),
         notes = coalesce(p_notes, notes)
   where id = p_relationship_id;

  return p_relationship_id;
end;
$$;

create or replace function public.rpc_company_relationship_decline(
  p_relationship_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_relationship public.company_relationships%rowtype;
  v_actor_user_id uuid := public.current_app_user_id();
begin
  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id
   for update;

  if not found then
    raise exception 'Company relationship not found';
  end if;

  if v_relationship.status <> 'invited' then
    raise exception 'Only invited company relationships can be declined';
  end if;

  if not public.current_app_user_can_approve_company_relationship(v_relationship.source_company_id, v_relationship.target_company_id) then
    raise exception 'Not authorized to decline company relationship';
  end if;

  update public.company_relationships
     set status = 'declined',
         declined_by_user_id = v_actor_user_id,
         declined_at = now(),
         notes = coalesce(p_notes, notes)
   where id = p_relationship_id;

  return p_relationship_id;
end;
$$;

create or replace function public.rpc_company_relationship_suspend(
  p_relationship_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_relationship public.company_relationships%rowtype;
  v_actor_user_id uuid := public.current_app_user_id();
begin
  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id
   for update;

  if not found then
    raise exception 'Company relationship not found';
  end if;

  if v_relationship.status <> 'active' then
    raise exception 'Only active company relationships can be suspended';
  end if;

  if not public.current_app_user_can_suspend_company_relationship(v_relationship.source_company_id, v_relationship.target_company_id) then
    raise exception 'Not authorized to suspend company relationship';
  end if;

  update public.company_relationships
     set status = 'suspended',
         suspended_by_user_id = v_actor_user_id,
         suspended_at = now(),
         notes = coalesce(p_notes, notes)
   where id = p_relationship_id;

  return p_relationship_id;
end;
$$;

create or replace function public.rpc_company_relationship_reactivate(
  p_relationship_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_relationship public.company_relationships%rowtype;
begin
  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id
   for update;

  if not found then
    raise exception 'Company relationship not found';
  end if;

  if v_relationship.status <> 'suspended' then
    raise exception 'Only suspended company relationships can be reactivated';
  end if;

  if not public.current_app_user_can_suspend_company_relationship(v_relationship.source_company_id, v_relationship.target_company_id) then
    raise exception 'Not authorized to reactivate company relationship';
  end if;

  update public.company_relationships
     set status = 'active',
         suspended_by_user_id = null,
         suspended_at = null,
         notes = coalesce(p_notes, notes)
   where id = p_relationship_id;

  return p_relationship_id;
end;
$$;

create or replace function public.rpc_company_relationship_archive(
  p_relationship_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_relationship public.company_relationships%rowtype;
  v_actor_user_id uuid := public.current_app_user_id();
begin
  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id
   for update;

  if not found then
    raise exception 'Company relationship not found';
  end if;

  if v_relationship.status = 'archived' then
    raise exception 'Company relationship is already archived';
  end if;

  if not public.current_app_user_can_archive_company_relationship(v_relationship.source_company_id, v_relationship.target_company_id) then
    raise exception 'Not authorized to archive company relationship';
  end if;

  update public.company_relationships
     set status = 'archived',
         archived_by_user_id = v_actor_user_id,
         archived_at = now(),
         notes = coalesce(p_notes, notes)
   where id = p_relationship_id;

  return p_relationship_id;
end;
$$;

revoke all privileges on table public.company_types from public, anon, authenticated;
revoke all privileges on table public.company_relationship_types from public, anon, authenticated;
revoke all privileges on table public.company_relationships from public, anon, authenticated;

revoke all on function public.current_app_user_can_read_company_relationship_row(uuid, uuid) from public, anon;
revoke all on function public.current_app_user_can_invite_company_relationship(uuid, text) from public, anon;
revoke all on function public.current_app_user_can_approve_company_relationship(uuid, uuid) from public, anon;
revoke all on function public.current_app_user_can_suspend_company_relationship(uuid, uuid) from public, anon;
revoke all on function public.current_app_user_can_archive_company_relationship(uuid, uuid) from public, anon;
revoke all on function public.current_app_user_can_manage_company_relationship_compliance(uuid, uuid) from public, anon;
revoke all on function public.tg_company_relationships_guard_immutable_status() from public, anon, authenticated;
revoke all on function public.rpc_company_relationship_list(text, text) from public, anon;
revoke all on function public.rpc_company_relationship_detail(uuid) from public, anon;
revoke all on function public.rpc_company_relationship_invite(uuid, text, jsonb, jsonb, text) from public, anon;
revoke all on function public.rpc_company_relationship_accept(uuid, jsonb, text) from public, anon;
revoke all on function public.rpc_company_relationship_decline(uuid, text) from public, anon;
revoke all on function public.rpc_company_relationship_suspend(uuid, text) from public, anon;
revoke all on function public.rpc_company_relationship_reactivate(uuid, text) from public, anon;
revoke all on function public.rpc_company_relationship_archive(uuid, text) from public, anon;

grant execute on function public.current_app_user_can_read_company_relationship_row(uuid, uuid) to authenticated, service_role;
grant execute on function public.current_app_user_can_invite_company_relationship(uuid, text) to authenticated, service_role;
grant execute on function public.current_app_user_can_approve_company_relationship(uuid, uuid) to authenticated, service_role;
grant execute on function public.current_app_user_can_suspend_company_relationship(uuid, uuid) to authenticated, service_role;
grant execute on function public.current_app_user_can_archive_company_relationship(uuid, uuid) to authenticated, service_role;
grant execute on function public.current_app_user_can_manage_company_relationship_compliance(uuid, uuid) to authenticated, service_role;
grant execute on function public.tg_company_relationships_guard_immutable_status() to service_role;
grant execute on function public.rpc_company_relationship_list(text, text) to authenticated, service_role;
grant execute on function public.rpc_company_relationship_detail(uuid) to authenticated, service_role;
grant execute on function public.rpc_company_relationship_invite(uuid, text, jsonb, jsonb, text) to authenticated, service_role;
grant execute on function public.rpc_company_relationship_accept(uuid, jsonb, text) to authenticated, service_role;
grant execute on function public.rpc_company_relationship_decline(uuid, text) to authenticated, service_role;
grant execute on function public.rpc_company_relationship_suspend(uuid, text) to authenticated, service_role;
grant execute on function public.rpc_company_relationship_reactivate(uuid, text) to authenticated, service_role;
grant execute on function public.rpc_company_relationship_archive(uuid, text) to authenticated, service_role;

comment on function public.current_app_user_can_read_company_relationship_row(uuid, uuid) is
  'Phase 8B3 relationship helper. Allows reading relationship rows involving current_company_id() only when the user has relationships.read. Relationship reads do not grant order or operational visibility.';

comment on function public.current_app_user_can_invite_company_relationship(uuid, text) is
  'Phase 8B3 relationship helper. Allows current-company users with relationships.invite to invite active target companies into valid directional relationship types. Relationship existence does not grant order visibility.';

comment on function public.current_app_user_can_approve_company_relationship(uuid, uuid) is
  'Phase 8B3 relationship helper. Allows target-company users with relationships.approve to accept or decline incoming invitations.';

comment on function public.current_app_user_can_suspend_company_relationship(uuid, uuid) is
  'Phase 8B3 relationship helper. Allows source or target participants with relationships.suspend to suspend/reactivate a relationship without changing operational visibility.';

comment on function public.current_app_user_can_archive_company_relationship(uuid, uuid) is
  'Phase 8B3 relationship helper. Allows source-company users with relationships.archive to archive a relationship.';

comment on function public.current_app_user_can_manage_company_relationship_compliance(uuid, uuid) is
  'Phase 8B3 relationship helper reserved for future compliance update RPCs. It does not grant relationship visibility or operational visibility by itself.';

comment on function public.tg_company_relationships_guard_immutable_status() is
  'Phase 8B3 guard. Keeps relationship direction/type immutable and enforces lifecycle status transitions. Relationship status does not affect order/client visibility.';

comment on function public.rpc_company_relationship_list(text, text) is
  'Phase 8B3 RPC-only relationship list. Returns relationships involving current_company_id() for users with relationships.read. Relationships do not grant order/client/workflow visibility.';

comment on function public.rpc_company_relationship_detail(uuid) is
  'Phase 8B3 RPC-only relationship detail. Requires current company participation and relationships.read. Relationships do not grant operational visibility.';

comment on function public.rpc_company_relationship_invite(uuid, text, jsonb, jsonb, text) is
  'Phase 8B3 RPC-only invitation entrypoint. Creates an invited directional relationship from current_company_id() to the target company. No order visibility is granted.';

comment on function public.rpc_company_relationship_accept(uuid, jsonb, text) is
  'Phase 8B3 RPC-only target-company accept action. Accepting a relationship grants no operational visibility until future assignment-backed visibility exists.';

comment on function public.rpc_company_relationship_decline(uuid, text) is
  'Phase 8B3 RPC-only target-company decline action.';

comment on function public.rpc_company_relationship_suspend(uuid, text) is
  'Phase 8B3 RPC-only suspend action. Suspension changes relationship lifecycle only and does not alter order/client visibility.';

comment on function public.rpc_company_relationship_reactivate(uuid, text) is
  'Phase 8B3 RPC-only reactivate action. Reactivation changes relationship lifecycle only and does not alter order/client visibility.';

comment on function public.rpc_company_relationship_archive(uuid, text) is
  'Phase 8B3 RPC-only archive action. Archived relationships are terminal and grant no operational visibility.';

commit;
