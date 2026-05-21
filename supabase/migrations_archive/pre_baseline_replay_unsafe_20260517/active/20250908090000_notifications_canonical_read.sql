-- Canonicalize notifications read state and expose RPC contract
-- - Use read_at (null = unread) as the single source of truth
-- - Backfill from legacy flags (is_read/read)
-- - RPCs: rpc_get_notifications, rpc_get_unread_count, rpc_mark_notification_read, rpc_mark_all_notifications_read

begin;

-- 1) Ensure column exists
alter table public.notifications
  add column if not exists read_at timestamptz;

-- 2) Backfill read_at from legacy flags
update public.notifications
   set read_at = coalesce(read_at, created_at, now())
 where read_at is null
   and (coalesce(is_read, false) = true or coalesce(read, false) = true);

-- 3) Optional clarity: note legacy flags
comment on column public.notifications.is_read is 'LEGACY (deprecated) — use read_at IS NOT NULL';
comment on column public.notifications.read is 'LEGACY (deprecated) — use read_at IS NOT NULL';

-- 4) RLS safety (idempotent)
alter table public.notifications enable row level security;

drop policy if exists notif_select_owner on public.notifications;
create policy notif_select_owner on public.notifications
  for select using (user_id = auth.uid());

-- Disallow direct writes; mutations go through RPCs
drop policy if exists notif_insert_none on public.notifications;
create policy notif_insert_none on public.notifications
  for insert with check (false);

drop policy if exists notif_update_none on public.notifications;
create policy notif_update_none on public.notifications
  for update using (false) with check (false);

-- 5) RPCs (read_at driven, recipient-scoped)

-- List notifications for the current user (newest first)
drop function if exists public.rpc_get_notifications(int, timestamptz);
create or replace function public.rpc_get_notifications(
  p_limit int default 50,
  p_before timestamptz default null
) returns setof public.notifications
language sql
security definer
set search_path = public
as $$
  select *
    from public.notifications n
   where n.user_id = auth.uid()
     and (p_before is null or n.created_at < p_before)
   order by n.created_at desc
   limit coalesce(p_limit, 50);
$$;
grant execute on function public.rpc_get_notifications(int, timestamptz) to authenticated;

-- Unread count
drop function if exists public.rpc_get_unread_count();
create or replace function public.rpc_get_unread_count()
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
    from public.notifications n
   where n.user_id = auth.uid()
     and n.read_at is null;
$$;
grant execute on function public.rpc_get_unread_count() to authenticated;

-- Mark a single notification read
drop function if exists public.rpc_mark_notification_read(uuid);
create or replace function public.rpc_mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications
     set read_at = coalesce(read_at, now())
   where id = p_notification_id
     and user_id = auth.uid();

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;
grant execute on function public.rpc_mark_notification_read(uuid) to authenticated;

-- Mark all notifications read for current user
drop function if exists public.rpc_mark_all_notifications_read();
create or replace function public.rpc_mark_all_notifications_read()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications
     set read_at = coalesce(read_at, now())
   where user_id = auth.uid()
     and read_at is null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;
grant execute on function public.rpc_mark_all_notifications_read() to authenticated;

commit;
