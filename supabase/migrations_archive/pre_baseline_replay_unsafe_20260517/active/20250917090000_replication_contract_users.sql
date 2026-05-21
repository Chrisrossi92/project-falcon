-- Consolidated user management contract for replication/export.

begin;

-- Ensure user_profiles has all expected columns (idempotent)
alter table if exists public.user_profiles
  add column if not exists is_active boolean default true,
  add column if not exists status text,
  add column if not exists display_color text,
  add column if not exists fee_split numeric,
  add column if not exists split numeric,
  add column if not exists split_pct numeric,
  add column if not exists full_name text,
  add column if not exists name text;

-- Expand roles constraint to include owner
alter table if exists public.user_roles
  alter column role type text;

-- current_is_admin helper (owner or admin)
create or replace function public.current_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('owner','admin')
  );
$$;
grant execute on function public.current_is_admin() to authenticated;

-- RPC: set user role (owner/admin only). Update if exists else insert.
create or replace function public.rpc_admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'forbidden: admin only';
  end if;

  update public.user_roles
    set role = p_role
    where user_id = p_user_id;
  if not found then
    insert into public.user_roles(user_id, role)
    values (p_user_id, p_role)
    on conflict (user_id, role) do update set role = excluded.role;
  end if;
end;
$$;
grant execute on function public.rpc_admin_set_user_role(uuid, text) to authenticated;

-- RPC: update profile fields (upsert row if missing; applies only provided fields)
create or replace function public.rpc_admin_update_user_profile(
  p_user_id uuid,
  p_display_name text default null,
  p_full_name text default null,
  p_name text default null,
  p_color text default null,
  p_display_color text default null,
  p_avatar_url text default null,
  p_fee_split numeric default null,
  p_split numeric default null,
  p_split_pct numeric default null,
  p_is_active boolean default null,
  p_status text default null,
  p_phone text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'forbidden: admin only';
  end if;

  -- upsert shell row if missing
  insert into public.user_profiles(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.user_profiles
    set display_name = coalesce(p_display_name, display_name),
        full_name    = coalesce(p_full_name, full_name),
        name         = coalesce(p_name, name),
        color        = coalesce(p_color, color),
        display_color= coalesce(p_display_color, display_color),
        avatar_url   = coalesce(p_avatar_url, avatar_url),
        fee_split    = coalesce(p_fee_split, fee_split),
        split        = coalesce(p_split, split),
        split_pct    = coalesce(p_split_pct, split_pct),
        is_active    = coalesce(p_is_active, is_active),
        status       = coalesce(p_status, status),
        phone        = coalesce(p_phone, phone),
        updated_at   = now()
  where user_id = p_user_id;
end;
$$;
grant execute on function public.rpc_admin_update_user_profile(
  uuid, text, text, text, text, text, text, numeric, numeric, numeric, boolean, text, text
) to authenticated;

-- Profiles facade aligning FE contract
create or replace view public.profiles as
select
  au.id                              as id,
  au.id                              as uid,
  au.id                              as auth_id,
  au.email                           as email,
  coalesce(up.display_name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email) as display_name,
  coalesce(up.display_name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name')          as full_name,
  coalesce(au.raw_user_meta_data->>'name', up.display_name)                                               as name,
  ur.role                            as role,
  coalesce(up.color, up.display_name) as display_color,
  up.color,
  up.avatar_url,
  up.phone,
  up.created_at,
  up.updated_at,
  coalesce(up.status, case when coalesce(up.is_active, true) then 'active' else 'inactive' end) as status,
  up.is_active,
  up.fee_split,
  up.split,
  up.split_pct,
  coalesce(au.is_anonymous, false)   as is_active_flag
from auth.users au
left join public.user_profiles up on up.user_id = au.id
left join lateral (
  select ur.role
  from public.user_roles ur
  where ur.user_id = au.id
  order by case ur.role when 'owner' then 1 when 'admin' then 2 when 'reviewer' then 3 when 'appraiser' then 4 else 5 end
  limit 1
) ur on true;

grant select on public.profiles to authenticated;

commit;
