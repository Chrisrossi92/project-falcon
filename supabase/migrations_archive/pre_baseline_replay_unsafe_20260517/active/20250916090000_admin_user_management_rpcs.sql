-- Admin-only RPCs for managing users via user_profiles/user_roles (profiles view is read-only).

begin;

-- Helper: ensure columns exist for active/fee splits (idempotent)
alter table if exists public.user_profiles
  add column if not exists is_active boolean default true,
  add column if not exists fee_split numeric,
  add column if not exists split numeric,
  add column if not exists split_pct numeric,
  add column if not exists full_name text,
  add column if not exists name text,
  add column if not exists display_color text;

-- Role helper
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

-- RPC: set user role (upsert into user_roles)
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

  insert into public.user_roles(user_id, role)
  values (p_user_id, p_role)
  on conflict (user_id, role) do update set role = excluded.role;
end;
$$;
grant execute on function public.rpc_admin_set_user_role(uuid, text) to authenticated;

-- RPC: set user active flag (user_profiles.is_active)
create or replace function public.rpc_admin_set_user_active(p_user_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'forbidden: admin only';
  end if;

  update public.user_profiles
    set is_active = coalesce(p_is_active, true),
        updated_at = now()
  where user_id = p_user_id;
end;
$$;
grant execute on function public.rpc_admin_set_user_active(uuid, boolean) to authenticated;

-- RPC: update profile fields (only non-null params applied)
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
  p_status text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'forbidden: admin only';
  end if;

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
        updated_at   = now()
  where user_id = p_user_id;
end;
$$;
grant execute on function public.rpc_admin_update_user_profile(
  uuid, text, text, text, text, text, text, numeric, numeric, numeric, boolean, text
) to authenticated;

commit;
