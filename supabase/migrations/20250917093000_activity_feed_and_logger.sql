-- Activity feed + event logger RPCs (profiles-based).

begin;

-- Helper: try flexible activity function if present
create or replace function public.rpc_get_activity_feed(p_order_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  event_type text,
  title text,
  body text,
  actor_name text,
  actor_role text
) language plpgsql security definer set search_path = public as $$
declare
  has_flex boolean := false;
begin
  -- Prefer flexible function if exists
  select exists(
    select 1 from pg_proc where proname in ('get_order_activity_flexible_v3','get_order_activity_flexible')
  ) into has_flex;

  if has_flex then
    return query
    select
      e.id,
      e.created_at,
      e.event_type,
      coalesce(e.title, initcap(replace(e.event_type,'_',' '))) as title,
      coalesce(e.message, e.body, e.detail::text, '')          as body,
      coalesce(p.display_name, p.full_name, p.name, p.email)   as actor_name,
      p.role                                                    as actor_role
    from public.get_order_activity_flexible_v3(p_order_id) e
    left join public.profiles p on p.id = e.created_by
    order by e.created_at asc;
  end if;

  -- Fallback: read activity_log directly
  return query
  select
    al.id,
    al.created_at,
    al.event_type,
    initcap(replace(al.event_type,'_',' ')) as title,
    coalesce(al.message, al.detail::text, '') as body,
    coalesce(p.display_name, p.full_name, p.name, p.email) as actor_name,
    p.role as actor_role
  from public.activity_log al
  left join public.profiles p on p.id = al.created_by
  where al.order_id = p_order_id
  order by al.created_at asc;
end;
$$;
grant execute on function public.rpc_get_activity_feed(uuid) to authenticated;

-- Event logger (note-friendly)
create or replace function public.rpc_log_event(p_order_id uuid, p_event_type text, p_details jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor uuid := auth.uid();
  v_actor_role text;
begin
  select role into v_actor_role from public.profiles where id = v_actor;

  insert into public.activity_log (order_id, event_type, detail, created_by, created_by_role, created_at)
  values (p_order_id, p_event_type, coalesce(p_details,'{}'::jsonb), v_actor, v_actor_role, now())
  returning id into v_id;

  return v_id;
end;
$$;
grant execute on function public.rpc_log_event(uuid, text, jsonb) to authenticated;

commit;
