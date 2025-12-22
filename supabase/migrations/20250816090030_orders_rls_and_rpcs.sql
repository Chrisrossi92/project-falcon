-- Orders RLS + RPC-only write paths
create extension if not exists "pgcrypto";

-- 1) Enable RLS and broad read (tighten later)
alter table public.orders enable row level security;

drop policy if exists orders_read_all on public.orders;
create policy orders_read_all
  on public.orders
  for select
  to authenticated
  using (true);

-- 2) RPC: update status (+activity log)
drop function if exists public.rpc_update_order_status(uuid, text, text);
create or replace function public.rpc_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare v_prev text; v_row public.orders;
begin
  select status into v_prev from public.orders where id = p_order_id;
  update public.orders
     set status = p_new_status, updated_at = now()
   where id = p_order_id
   returning * into v_row;
  perform public.rpc_log_status_change(p_order_id, v_prev, p_new_status, p_note);
  return v_row;
end $$;
grant execute on function public.rpc_update_order_status(uuid, text, text) to authenticated;

-- 3) RPC: assign order (+activity log)
drop function if exists public.rpc_assign_order(uuid, uuid, text);
create or replace function public.rpc_assign_order(
  p_order_id uuid,
  p_assigned_to uuid,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.orders;
begin
  update public.orders
     set assigned_to = p_assigned_to, updated_at = now()
   where id = p_order_id
   returning * into v_row;
  insert into public.activity_log(order_id, actor_user_id, action, message)
  values (p_order_id, auth.uid(), 'assignment', coalesce(p_note, 'assigned'));
  return v_row;
end $$;
grant execute on function public.rpc_assign_order(uuid, uuid, text) to authenticated;

-- 4) RPC: update due dates
drop function if exists public.rpc_update_due_dates(uuid, date, date);
create or replace function public.rpc_update_due_dates(
  p_order_id uuid, p_due_date date, p_review_due_date date
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.orders;
begin
  update public.orders
     set due_date = p_due_date, review_due_date = p_review_due_date, updated_at = now()
   where id = p_order_id
   returning * into v_row;
  return v_row;
end $$;
grant execute on function public.rpc_update_due_dates(uuid, date, date) to authenticated;
