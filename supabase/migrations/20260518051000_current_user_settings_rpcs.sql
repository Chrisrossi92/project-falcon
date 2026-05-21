begin;

create or replace function public.rpc_current_user_settings_get()
returns table (
  user_id uuid,
  email text,
  display_name text,
  full_name text,
  phone text,
  avatar_url text,
  display_color text,
  color text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid := public.current_app_user_id();
begin
  if v_app_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  return query
  select
    u.id as user_id,
    u.email,
    u.display_name,
    u.full_name,
    u.phone,
    u.avatar_url,
    u.display_color,
    u.color
  from public.users u
  where u.id = v_app_user_id;
end;
$$;

create or replace function public.rpc_current_user_settings_update(
  p_patch jsonb
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  full_name text,
  phone text,
  avatar_url text,
  display_color text,
  color text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid := public.current_app_user_id();
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_display_name text;
  v_full_name text;
  v_phone text;
  v_avatar_url text;
  v_color text;
begin
  if v_app_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_patch ? 'display_name' then
    v_display_name := nullif(trim(coalesce(v_patch->>'display_name', '')), '');
  end if;

  if v_patch ? 'full_name' then
    v_full_name := nullif(trim(coalesce(v_patch->>'full_name', '')), '');
  end if;

  if v_patch ? 'phone' then
    v_phone := nullif(trim(coalesce(v_patch->>'phone', '')), '');
  end if;

  if v_patch ? 'avatar_url' then
    v_avatar_url := nullif(trim(coalesce(v_patch->>'avatar_url', '')), '');
  end if;

  if v_patch ? 'display_color' then
    v_color := nullif(trim(coalesce(v_patch->>'display_color', '')), '');
  elsif v_patch ? 'color' then
    v_color := nullif(trim(coalesce(v_patch->>'color', '')), '');
  end if;

  if v_color is not null and v_color !~* '^#[0-9a-f]{6}$' then
    raise exception 'invalid_profile_color'
      using errcode = '22023';
  end if;

  update public.users u
     set display_name = case when v_patch ? 'display_name' then v_display_name else u.display_name end,
         full_name = case when v_patch ? 'full_name' then v_full_name else u.full_name end,
         phone = case when v_patch ? 'phone' then v_phone else u.phone end,
         avatar_url = case when v_patch ? 'avatar_url' then v_avatar_url else u.avatar_url end,
         display_color = case when (v_patch ? 'display_color') or (v_patch ? 'color') then v_color else u.display_color end,
         color = case when (v_patch ? 'display_color') or (v_patch ? 'color') then v_color else u.color end,
         updated_at = now()
   where u.id = v_app_user_id;

  if not found then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  return query
  select
    u.id as user_id,
    u.email,
    u.display_name,
    u.full_name,
    u.phone,
    u.avatar_url,
    u.display_color,
    u.color
  from public.users u
  where u.id = v_app_user_id;
end;
$$;

revoke all privileges on function public.rpc_current_user_settings_get() from public, anon;
revoke all privileges on function public.rpc_current_user_settings_update(jsonb) from public, anon;

grant execute on function public.rpc_current_user_settings_get() to authenticated, service_role;
grant execute on function public.rpc_current_user_settings_update(jsonb) to authenticated, service_role;

comment on function public.rpc_current_user_settings_get() is
  'Phase 8C5I1 safe current-user settings read projection. Returns allowlisted profile/account display fields for current_app_user_id only.';

comment on function public.rpc_current_user_settings_update(jsonb) is
  'Phase 8C5I1 safe current-user settings update RPC. Updates only allowlisted current-user display/profile fields, keeps color/display_color synced, and does not update role/status/permissions/company authority.';

commit;
