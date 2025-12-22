-- Enrich status change activity payload/message and add short-window dedupe
begin;

-- View: compute friendly message for status changes and pass through detail
create or replace view public.v_order_activity_feed as
select
  a.id,
  a.order_id,
  coalesce(a.event_type, a.action)       as event_type,
  coalesce(
    a.message,
    case
      when coalesce(a.event_type, a.action) = 'status_changed'
        and coalesce(a.detail->>'from_status', a.prev_status, a.detail->>'from') is not null
        and coalesce(a.detail->>'to_status',   a.new_status, a.detail->>'to')   is not null
      then format(
        'Status changed: %s → %s',
        coalesce(a.detail->>'from_status', a.prev_status, a.detail->>'from'),
        coalesce(a.detail->>'to_status',   a.new_status, a.detail->>'to')
      )
    end,
    a.detail->>'text'
  ) as message,
  a.detail,
  a.created_at,
  a.created_by,
  coalesce(a.created_by_name, p.full_name)  as created_by_name,
  coalesce(a.created_by_email, p.email)     as created_by_email
from public.activity_log a
left join public.profiles p
  on p.id = coalesce(a.created_by, a.actor_id);

comment on view public.v_order_activity_feed is 'Normalized activity feed for orders; source of truth for UI timelines';

-- RPC: log event with dedupe and status payload enrichment
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
  v_from text := coalesce(p_payload->>'from_status', p_payload->>'from');
  v_to   text := coalesce(p_payload->>'to_status',   p_payload->>'to');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_msg text;
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

  -- skip no-op status changes
  if p_event_type = 'status_changed' and v_from is not null and v_to is not null and v_from = v_to then
    return null;
  end if;

  -- populate payload from/to if missing
  if v_from is not null then
    v_payload := v_payload || jsonb_build_object('from_status', v_from);
  end if;
  if v_to is not null then
    v_payload := v_payload || jsonb_build_object('to_status', v_to);
  end if;

  -- short-window dedupe (10s) for same order/event/to_status by same actor
  select * into v_actor from public._activity_actor();
  if exists (
    select 1 from public.activity_log a
     where a.order_id = p_order_id
       and a.event_type = p_event_type
       and coalesce(a.created_by, a.actor_id) = v_actor.user_id
       and coalesce(a.detail->>'to_status', a.detail->>'to') = coalesce(v_payload->>'to_status', v_to)
       and a.created_at > now() - interval '10 seconds'
  ) then
    return null;
  end if;

  v_msg := coalesce(
    p_message,
    case
      when p_event_type = 'status_changed' and v_from is not null and v_to is not null
        then format('Status changed: %s → %s', v_from, v_to)
      else null
    end
  );

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
    v_msg,
    v_payload,
    v_actor.user_id,
    v_actor.full_name,
    v_actor.email
  )
  returning * into v_row;

  return v_row;
end;
$$;
grant execute on function public.rpc_log_event(uuid, text, text, jsonb) to authenticated;

commit;
