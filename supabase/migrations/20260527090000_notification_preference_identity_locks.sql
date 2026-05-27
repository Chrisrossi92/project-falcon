begin;

create or replace function public.notification_policy_channel_state(
  p_rules jsonb,
  p_roles text[],
  p_channel text
)
returns table (
  default_enabled boolean,
  locked boolean,
  lock_reason text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_role_channel jsonb;
  v_email_mode text;
  v_default boolean := false;
  v_locked boolean := false;
  v_lock_reason text := null;
begin
  p_rules := coalesce(p_rules, '{}'::jsonb);
  p_channel := lower(btrim(coalesce(p_channel, '')));
  v_email_mode := lower(coalesce(p_rules #>> '{email,mode}', 'optional_off'));

  if p_channel = 'email' then
    v_default := v_email_mode in ('required', 'optional_on');
    v_locked := v_email_mode = 'required';
    if v_locked then
      v_lock_reason := coalesce(p_rules #>> '{email,lock_reason}', 'Required by notification policy.');
    end if;
  end if;

  foreach v_role in array coalesce(p_roles, array[]::text[]) loop
    v_role := lower(btrim(coalesce(v_role, '')));
    if v_role = '' then
      continue;
    end if;

    v_role_channel := p_rules #> array['roles', v_role, p_channel];
    if v_role_channel is null and p_channel = 'email' then
      v_role_channel := p_rules #> array['roles', v_role, 'email'];
    end if;

    if v_role_channel is not null then
      if v_role_channel ? 'default' then
        v_default := v_default or coalesce((v_role_channel->>'default')::boolean, false);
      end if;

      if coalesce((v_role_channel->>'required')::boolean, false) then
        v_locked := true;
        v_lock_reason := coalesce(
          nullif(v_role_channel->>'lock_reason', ''),
          nullif(v_lock_reason, ''),
          'Required by company policy.'
        );
      end if;
    end if;

    if p_channel = 'email'
       and exists (
         select 1
           from public.notification_policies np
          where np.key = 'locks.' || v_role
            and coalesce(np.rules->'email_required', '[]'::jsonb) ? (p_rules->>'event_key')
       ) then
      v_locked := true;
      v_default := true;
      v_lock_reason := coalesce(nullif(v_lock_reason, ''), 'Required by company policy.');
    end if;
  end loop;

  return query select v_default, v_locked, v_lock_reason;
end;
$$;

create or replace function public.current_app_user_notification_role_keys()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  with ctx as (
    select public.current_app_user_id() as user_id,
           public.current_company_id() as company_id
  ),
  assigned as (
    select distinct lower(btrim(r.name)) as role_key
      from ctx
      join public.user_role_assignments ura
        on ura.user_id = ctx.user_id
       and ura.company_id = ctx.company_id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
      join public.roles r
        on r.id = ura.role_id
     where ctx.user_id is not null
       and ctx.company_id is not null
  ),
  legacy as (
    select distinct lower(btrim(ur.role)) as role_key
      from ctx
      left join public.users u
        on u.id = ctx.user_id
      join public.user_roles ur
        on ur.user_id = ctx.user_id
        or ur.user_id = u.auth_id
     where ctx.company_id = public.default_company_id()
       and ur.role is not null
  )
  select coalesce(array_agg(distinct role_key order by role_key), array[]::text[])
    from (
      select role_key from assigned
      union
      select role_key from legacy
    ) roles
   where role_key is not null
     and role_key <> '';
$$;

create or replace function public.rpc_current_user_notification_preferences_get()
returns table (
  event_key text,
  channel text,
  effective_enabled boolean,
  locked boolean,
  lock_reason text,
  default_enabled boolean,
  user_override boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with ctx as (
    select
      public.current_app_user_id() as user_id,
      public.current_app_user_notification_role_keys() as role_keys
  ),
  policy_rows as (
    select
      np.key,
      jsonb_set(coalesce(np.rules, '{}'::jsonb), '{event_key}', to_jsonb(np.key), true) as rules
      from public.notification_policies np
     where np.key not like 'locks.%'
       and np.key not like 'defaults.%'
  ),
  expanded as (
    select
      p.key as event_key,
      channel.channel,
      state.default_enabled,
      state.locked,
      state.lock_reason
      from policy_rows p
      cross join (values ('in_app'::text), ('email'::text)) channel(channel)
      cross join ctx
      cross join lateral public.notification_policy_channel_state(
        p.rules,
        ctx.role_keys,
        channel.channel
      ) state
  )
  select
    expanded.event_key,
    expanded.channel,
    case
      when expanded.locked then true
      else coalesce(up.enabled, expanded.default_enabled)
    end as effective_enabled,
    expanded.locked,
    expanded.lock_reason,
    expanded.default_enabled,
    up.enabled as user_override
    from expanded
    cross join ctx
    left join public.user_notification_prefs up
      on up.user_id = ctx.user_id
     and up.type = expanded.event_key
     and up.channel = expanded.channel
   where ctx.user_id is not null
   order by expanded.event_key, expanded.channel;
$$;

create or replace function public.rpc_current_user_notification_preference_update(
  p_event_key text,
  p_channel text,
  p_enabled boolean,
  p_meta jsonb default null
)
returns table (
  event_key text,
  channel text,
  effective_enabled boolean,
  locked boolean,
  lock_reason text,
  default_enabled boolean,
  user_override boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.current_app_user_id();
  v_event_key text := btrim(coalesce(p_event_key, ''));
  v_channel text := lower(btrim(coalesce(p_channel, '')));
  v_locked boolean;
begin
  if v_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_event_key = '' or not exists (
    select 1 from public.notification_policies np
     where np.key = v_event_key
       and np.key not like 'locks.%'
       and np.key not like 'defaults.%'
  ) then
    raise exception 'unknown_notification_event'
      using errcode = '22023';
  end if;

  if v_channel not in ('in_app', 'email') then
    raise exception 'invalid_notification_channel'
      using errcode = '22023';
  end if;

  select prefs.locked
    into v_locked
    from public.rpc_current_user_notification_preferences_get() prefs
   where prefs.event_key = v_event_key
     and prefs.channel = v_channel;

  if coalesce(v_locked, false) and not coalesce(p_enabled, false) then
    raise exception 'notification_preference_locked'
      using errcode = '42501';
  end if;

  insert into public.user_notification_prefs (user_id, type, channel, enabled, meta)
  values (v_user_id, v_event_key, v_channel, coalesce(p_enabled, false), p_meta)
  on conflict (user_id, type, channel)
  do update set
    enabled = excluded.enabled,
    meta = coalesce(excluded.meta, public.user_notification_prefs.meta);

  return query
  select *
    from public.rpc_current_user_notification_preferences_get() prefs
   where prefs.event_key = v_event_key
     and prefs.channel = v_channel;
end;
$$;

create or replace function public.rpc_notification_policy_lock_update(
  p_event_key text,
  p_channel text,
  p_locked boolean,
  p_role text default 'appraiser',
  p_lock_reason text default null
)
returns table (
  event_key text,
  channel text,
  role_key text,
  locked boolean,
  lock_reason text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_event_key text := btrim(coalesce(p_event_key, ''));
  v_channel text := lower(btrim(coalesce(p_channel, '')));
  v_role text := lower(btrim(coalesce(p_role, 'appraiser')));
  v_reason text := nullif(btrim(coalesce(p_lock_reason, '')), '');
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('notifications.preferences.manage_company') then
    raise exception 'notifications_manage_company_required'
      using errcode = '42501';
  end if;

  if v_event_key = '' or not exists (
    select 1 from public.notification_policies np
     where np.key = v_event_key
       and np.key not like 'locks.%'
       and np.key not like 'defaults.%'
  ) then
    raise exception 'unknown_notification_event'
      using errcode = '22023';
  end if;

  if v_channel not in ('in_app', 'email') then
    raise exception 'invalid_notification_channel'
      using errcode = '22023';
  end if;

  if v_role not in ('owner', 'admin', 'reviewer', 'appraiser', 'billing') then
    raise exception 'invalid_notification_role'
      using errcode = '22023';
  end if;

  update public.notification_policies np
     set rules = jsonb_set(
           jsonb_set(
             coalesce(np.rules, '{}'::jsonb),
             array['roles', v_role, v_channel, 'required'],
             to_jsonb(coalesce(p_locked, false)),
             true
           ),
           array['roles', v_role, v_channel, 'lock_reason'],
           to_jsonb(coalesce(v_reason, 'Required by company policy.')),
           true
         ),
         updated_by = v_actor_user_id,
         updated_at = now()
   where np.key = v_event_key;

  event_key := v_event_key;
  channel := v_channel;
  role_key := v_role;
  locked := coalesce(p_locked, false);
  lock_reason := coalesce(v_reason, 'Required by company policy.');
  return next;
end;
$$;

create or replace function public.rpc_notification_policy_locks_get(
  p_role text default 'appraiser'
)
returns table (
  event_key text,
  channel text,
  role_key text,
  locked boolean,
  lock_reason text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_role text := lower(btrim(coalesce(p_role, 'appraiser')));
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('notifications.preferences.manage_company') then
    raise exception 'notifications_manage_company_required'
      using errcode = '42501';
  end if;

  if v_role not in ('owner', 'admin', 'reviewer', 'appraiser', 'billing') then
    raise exception 'invalid_notification_role'
      using errcode = '22023';
  end if;

  return query
  select
    np.key as event_key,
    channel.channel,
    v_role as role_key,
    coalesce((np.rules #>> array['roles', v_role, channel.channel, 'required'])::boolean, false)
      or (channel.channel = 'email' and lower(coalesce(np.rules #>> '{email,mode}', '')) = 'required')
      as locked,
    coalesce(
      nullif(np.rules #>> array['roles', v_role, channel.channel, 'lock_reason'], ''),
      nullif(np.rules #>> '{email,lock_reason}', ''),
      'Required by company policy.'
    ) as lock_reason
    from public.notification_policies np
    cross join (values ('in_app'::text), ('email'::text)) channel(channel)
   where np.key not like 'locks.%'
     and np.key not like 'defaults.%'
   order by np.key, channel.channel;
end;
$$;

create or replace function public.rpc_set_notification_pref_v1(
  p_user_id uuid,
  p_type text,
  p_channel text,
  p_enabled boolean,
  p_meta jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if p_user_id is not null and p_user_id <> v_actor_user_id then
    raise exception 'notification_preference_target_self_required'
      using errcode = '42501';
  end if;

  perform 1
    from public.rpc_current_user_notification_preference_update(
      p_type,
      p_channel,
      p_enabled,
      p_meta
    );
end;
$$;

create or replace function public.rpc_notification_prefs_ensure()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.current_app_user_id();
begin
  if v_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  insert into public.notification_prefs(user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;
  return true;
end;
$$;

create or replace function public.rpc_notification_prefs_get(
  p_user_id uuid default null
)
returns public.notification_prefs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_target_user_id uuid := coalesce(p_user_id, v_actor_user_id);
  v_row public.notification_prefs;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_target_user_id <> v_actor_user_id
     and not public.current_app_user_has_permission('notifications.preferences.manage_company') then
    raise exception 'notifications_manage_company_required'
      using errcode = '42501';
  end if;

  insert into public.notification_prefs(user_id)
  values (v_target_user_id)
  on conflict (user_id) do nothing;

  select *
    into v_row
    from public.notification_prefs
   where user_id = v_target_user_id
   limit 1;

  return v_row;
end;
$$;

create or replace function public.rpc_notification_prefs_update(
  patch jsonb
)
returns public.notification_prefs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notification_prefs;
begin
  select *
    into v_row
    from public.rpc_notification_prefs_update(patch, null);

  return v_row;
end;
$$;

create or replace function public.rpc_notification_prefs_update(
  patch jsonb,
  p_user_id uuid default null
)
returns public.notification_prefs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_target_user_id uuid := coalesce(p_user_id, v_actor_user_id);
  v_row public.notification_prefs;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(patch, '{}'::jsonb)) <> 'object' then
    raise exception 'notification_preferences_patch_object_required'
      using errcode = '22023';
  end if;

  if v_target_user_id <> v_actor_user_id
     and not public.current_app_user_has_permission('notifications.preferences.manage_company') then
    raise exception 'notifications_manage_company_required'
      using errcode = '42501';
  end if;

  insert into public.notification_prefs (
    user_id,
    dnd_until,
    snooze_until,
    email_enabled,
    push_enabled,
    categories,
    updated_at
  )
  values (
    v_target_user_id,
    (patch->>'dnd_until')::timestamptz,
    (patch->>'snooze_until')::timestamptz,
    (patch->>'email_enabled')::boolean,
    (patch->>'push_enabled')::boolean,
    patch->'categories',
    now()
  )
  on conflict (user_id)
  do update set
    dnd_until = coalesce((patch->>'dnd_until')::timestamptz, public.notification_prefs.dnd_until),
    snooze_until = coalesce((patch->>'snooze_until')::timestamptz, public.notification_prefs.snooze_until),
    email_enabled = coalesce((patch->>'email_enabled')::boolean, public.notification_prefs.email_enabled),
    push_enabled = coalesce((patch->>'push_enabled')::boolean, public.notification_prefs.push_enabled),
    categories = coalesce(patch->'categories', public.notification_prefs.categories),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

drop policy if exists "prefs_select_own" on public.notification_prefs;
drop policy if exists "prefs_select_self" on public.notification_prefs;
create policy "prefs_select_self"
  on public.notification_prefs
  for select
  to authenticated
  using (user_id = public.current_app_user_id());

drop policy if exists "prefs_upsert_own" on public.notification_prefs;
drop policy if exists "prefs_insert_self" on public.notification_prefs;
create policy "prefs_insert_self"
  on public.notification_prefs
  for insert
  to authenticated
  with check (user_id = public.current_app_user_id());

drop policy if exists "prefs_update_own" on public.notification_prefs;
drop policy if exists "prefs_update_self" on public.notification_prefs;
create policy "prefs_update_self"
  on public.notification_prefs
  for update
  to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists "prefs_select_own" on public.user_notification_prefs;
create policy "prefs_select_own"
  on public.user_notification_prefs
  for select
  to authenticated
  using (user_id = public.current_app_user_id());

drop policy if exists "prefs_upsert_own" on public.user_notification_prefs;
create policy "prefs_upsert_own"
  on public.user_notification_prefs
  for insert
  to authenticated
  with check (user_id = public.current_app_user_id());

drop policy if exists "prefs_update_own" on public.user_notification_prefs;
create policy "prefs_update_own"
  on public.user_notification_prefs
  for update
  to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

revoke all privileges on function public.rpc_current_user_notification_preferences_get() from public, anon;
revoke all privileges on function public.rpc_current_user_notification_preference_update(text, text, boolean, jsonb) from public, anon;
revoke all privileges on function public.rpc_notification_policy_lock_update(text, text, boolean, text, text) from public, anon;
revoke all privileges on function public.rpc_notification_policy_locks_get(text) from public, anon;
revoke all privileges on function public.notification_policy_channel_state(jsonb, text[], text) from public, anon;
revoke all privileges on function public.current_app_user_notification_role_keys() from public, anon;

grant execute on function public.rpc_current_user_notification_preferences_get() to authenticated, service_role;
grant execute on function public.rpc_current_user_notification_preference_update(text, text, boolean, jsonb) to authenticated, service_role;
grant execute on function public.rpc_notification_policy_lock_update(text, text, boolean, text, text) to authenticated, service_role;
grant execute on function public.rpc_notification_policy_locks_get(text) to authenticated, service_role;
grant execute on function public.notification_policy_channel_state(jsonb, text[], text) to authenticated, service_role;
grant execute on function public.current_app_user_notification_role_keys() to authenticated, service_role;

comment on function public.rpc_current_user_notification_preferences_get() is
  'Returns current public.users.id-scoped effective notification preferences by event/channel, merging notification_policies defaults, user_notification_prefs overrides, and policy locks.';

comment on function public.rpc_current_user_notification_preference_update(text, text, boolean, jsonb) is
  'Updates the current public.users.id-scoped event/channel notification preference. Disabling locked policy-required preferences is rejected.';

comment on function public.rpc_notification_policy_lock_update(text, text, boolean, text, text) is
  'Owner/admin guarded V1 lock setter for staff-critical notification preferences stored in notification_policies role/channel rules.';

comment on function public.rpc_notification_policy_locks_get(text) is
  'Owner/admin guarded V1 lock reader for staff-critical notification preferences stored in notification_policies role/channel rules.';

commit;
