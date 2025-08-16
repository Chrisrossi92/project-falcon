-- Activity Log: table + indexes + RLS + RPCs
create extension if not exists "pgcrypto";

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_user_id uuid not null default auth.uid(),
  action text not null check (action in ('status_change','note','assignment','comment')),
  prev_status text,
  new_status text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_order_id_idx   on public.activity_log(order_id);
create index if not exists activity_log_created_idx    on public.activity_log(created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists activity_log_read on public.activity_log;
create policy activity_log_read
  on public.activity_log
  for select
  to authenticated
  using (true);

-- RPC-only writes
drop function if exists public.rpc_log_status_change(uuid, text, text, text);
create or replace function public.rpc_log_status_change(
  p_order_id uuid,
  p_prev_status text,
  p_new_status text,
  p_message text default null
) returns public.activity_log
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.activity_log;
begin
  insert into public.activity_log(order_id, actor_user_id, action, prev_status, new_status, message)
  values (p_order_id, auth.uid(), 'status_change', p_prev_status, p_new_status, p_message)
  returning * into v_row;
  return v_row;
end $$;

grant execute on function public.rpc_log_status_change(uuid, text, text, text) to authenticated;

drop function if exists public.rpc_log_note(uuid, text);
create or replace function public.rpc_log_note(
  p_order_id uuid,
  p_message text
) returns public.activity_log
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.activity_log;
begin
  insert into public.activity_log(order_id, actor_user_id, action, message)
  values (p_order_id, auth.uid(), 'note', p_message)
  returning * into v_row;
  return v_row;
end $$;

grant execute on function public.rpc_log_note(uuid, text) to authenticated;
