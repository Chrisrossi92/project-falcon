-- Normalize activity logging to RPC-only and a single feed view
-- - Canonical store: public.activity_log
-- - View: public.v_order_activity_feed (UI-facing shape)
-- - RPCs: rpc_get_activity_feed, rpc_log_event, rpc_log_note
-- - Block direct inserts/updates; RLS required via RPC

begin;

-- 1) Ensure RLS is on and block direct writes (RPC-only)
alter table public.activity_log enable row level security;

drop policy if exists activity_insert_none on public.activity_log;
create policy activity_insert_none on public.activity_log
  for insert with check (false);

drop policy if exists activity_update_none on public.activity_log;
create policy activity_update_none on public.activity_log
  for update using (false) with check (false);

-- Keep existing SELECT policies; we rely on them to gate feed visibility.

-- 2) UI-facing feed view (includes basic actor info)
create or replace view public.v_order_activity_feed as
select
  a.id,
  a.order_id,
  coalesce(a.event_type, a.action)       as event_type,
  coalesce(a.message, a.detail->>'text') as message,
  a.detail,
  a.created_at,
  a.created_by,
  coalesce(a.created_by_name, p.full_name)  as created_by_name,
  coalesce(a.created_by_email, p.email)     as created_by_email
from public.activity_log a
left join public.profiles p
  on p.id = coalesce(a.created_by, a.actor_id);

comment on view public.v_order_activity_feed is 'Normalized activity feed for orders; source of truth for UI timelines';

-- 3) Helpers to hydrate actor info
create or replace function public._activity_actor()
returns table(user_id uuid, full_name text, email text)
language sql
security definer
set search_path = public
as $$
  select auth.uid(), p.full_name, p.email
    from auth.uid() uid
    left join public.profiles p on p.id = uid;
$$;

-- 4) RPC: list feed
drop function if exists public.rpc_get_activity_feed(uuid, int, timestamptz);
create or replace function public.rpc_get_activity_feed(
  p_order_id uuid,
  p_limit int default 200,
  p_before timestamptz default null
) returns setof public.v_order_activity_feed
language sql
security definer
set search_path = public
as $$
  select *
    from public.v_order_activity_feed f
   where f.order_id = p_order_id
     and (p_before is null or f.created_at < p_before)
   order by f.created_at asc
   limit coalesce(p_limit, 200);
$$;
grant execute on function public.rpc_get_activity_feed(uuid, int, timestamptz) to authenticated;

-- 5) RPC: log event
drop function if exists public.rpc_log_event(uuid, text, text, jsonb);
create or replace function public.rpc_log_event(
  p_order_id uuid,
  p_event_type text,
  p_message text default null,
  p_payload jsonb default '{}'::jsonb
) returns public.activity_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor record;
  v_row public.activity_log;
  v_role text := (current_setting('request.jwt.claims', true)::jsonb ->> 'role');
  v_uid  uuid := auth.uid();
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if not exists (
    select 1 from public.orders o
     where o.id = p_order_id
       and (
         v_role in ('admin','reviewer')
         or coalesce(o.appraiser_id, o.assigned_to) = v_uid
       )
  ) then
    raise exception 'not authorized to log activity for this order';
  end if;

  select * into v_actor from public._activity_actor();

  insert into public.activity_log (
    order_id,
    event_type,
    message,
    detail,
    created_by,
    created_by_name,
    created_by_email
  )
  values (
    p_order_id,
    p_event_type,
    p_message,
    coalesce(p_payload, '{}'::jsonb),
    v_actor.user_id,
    v_actor.full_name,
    v_actor.email
  )
  returning * into v_row;

  return v_row;
end;
$$;
grant execute on function public.rpc_log_event(uuid, text, text, jsonb) to authenticated;

-- 6) RPC: log note (wrapper)
drop function if exists public.rpc_log_note(uuid, text);
create or replace function public.rpc_log_note(
  p_order_id uuid,
  p_message text
) returns public.activity_log
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.rpc_log_event(p_order_id, 'note_added', p_message, '{}'::jsonb);
end;
$$;
grant execute on function public.rpc_log_note(uuid, text) to authenticated;

commit;
