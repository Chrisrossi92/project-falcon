create extension if not exists "pgcrypto";
set search_path = public;

-- PROFILES (self-edit via RPC; reads open to authenticated)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  color text check (color ~* '^[#a-z0-9() ,.-]{0,32}$' or color is null),
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_read on public.user_profiles;
create policy user_profiles_read
  on public.user_profiles
  for select
  to authenticated
  using (true);

drop function if exists public.rpc_update_profile(text,text,text,text);
create or replace function public.rpc_update_profile(
  p_display_name text,
  p_color text,
  p_phone text,
  p_avatar_url text
) returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.user_profiles;
begin
  insert into public.user_profiles(user_id, display_name, color, phone, avatar_url)
  values (auth.uid(), p_display_name, p_color, p_phone, p_avatar_url)
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        color        = excluded.color,
        phone        = excluded.phone,
        avatar_url   = excluded.avatar_url,
        updated_at   = now()
  returning * into v_row;
  return v_row;
end $$;
grant execute on function public.rpc_update_profile(text,text,text,text) to authenticated;

-- ROLES (admin-managed via RPC; reads open to authenticated)
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role    text not null check (role in ('admin','appraiser','associate','reviewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;

drop policy if exists user_roles_read on public.user_roles;
create policy user_roles_read
  on public.user_roles
  for select
  to authenticated
  using (true);

drop function if exists public.rpc_set_user_role(uuid, text, boolean);
create or replace function public.rpc_set_user_role(
  p_user_id uuid,
  p_role text,
  p_grant boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare is_admin boolean;
begin
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
    into is_admin;
  if not is_admin then
    raise exception 'forbidden: admin only';
  end if;

  if p_grant then
    insert into public.user_roles(user_id, role) values (p_user_id, p_role)
    on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = p_role;
  end if;
end $$;
grant execute on function public.rpc_set_user_role(uuid, text, boolean) to authenticated;

-- Bootstrap: first caller becomes admin if none exist
drop function if exists public.rpc_bootstrap_admin();
create or replace function public.rpc_bootstrap_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare has_admin boolean;
begin
  select exists(select 1 from public.user_roles where role='admin') into has_admin;
  if has_admin then return false; end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'admin')
  on conflict do nothing;
  return true;
end $$;
grant execute on function public.rpc_bootstrap_admin() to authenticated;

-- Enriched Admin Calendar (color + icon)
create or replace view public.v_admin_calendar_enriched as
select
  e.*, 
  p.display_name as appraiser_name,
  p.color        as appraiser_color,
  case e.event_type
    when 'site_visit'     then 'map-pin'
    when 'due_for_review' then 'alert-triangle'
    when 'due_to_client'  then 'send'
    else 'calendar'
  end as event_icon
from public.calendar_events e
left join public.user_profiles p on p.user_id = e.appraiser_id;
