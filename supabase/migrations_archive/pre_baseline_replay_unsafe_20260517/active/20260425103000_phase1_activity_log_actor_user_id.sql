begin;

-- Phase 1 cleanup:
-- Keep legacy activity display identity in created_by/actor_id as auth/profile id,
-- and add actor_user_id as the canonical public.users.id actor.

alter table public.activity_log
  add column if not exists actor_user_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'activity_log_actor_user_id_fkey'
  ) then
    alter table public.activity_log
      add constraint activity_log_actor_user_id_fkey
      foreign key (actor_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;
end;
$$;

alter table public.activity_log
  alter column actor_user_id set default public.current_app_user_id();

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
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_from text := coalesce(p_payload->>'from_status', p_payload->>'from');
  v_to text := coalesce(p_payload->>'to_status', p_payload->>'to');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_msg text;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if v_app_uid is null then
    raise exception 'current app user not found';
  end if;

  if not exists (
    select 1
      from public.orders o
     where o.id = p_order_id
       and (
         v_role in ('admin', 'reviewer')
         or coalesce(o.appraiser_id, o.assigned_to) = v_app_uid
       )
  ) then
    raise exception 'not authorized to log activity for this order';
  end if;

  if p_event_type = 'status_changed' and v_from is not null and v_to is not null and v_from = v_to then
    return null;
  end if;

  if v_from is not null then
    v_payload := v_payload || jsonb_build_object('from_status', v_from);
  end if;
  if v_to is not null then
    v_payload := v_payload || jsonb_build_object('to_status', v_to);
  end if;

  select * into v_actor from public._activity_actor();
  if exists (
    select 1
      from public.activity_log a
     where a.order_id = p_order_id
       and a.event_type = p_event_type
       and (
         a.actor_user_id = v_app_uid
         or coalesce(a.created_by, a.actor_id) = v_auth_uid
       )
       and coalesce(a.detail->>'to_status', a.detail->>'to') = coalesce(v_payload->>'to_status', v_to)
       and a.created_at > now() - interval '10 seconds'
  ) then
    return null;
  end if;

  v_msg := coalesce(
    p_message,
    case
      when p_event_type = 'status_changed' and v_from is not null and v_to is not null
        then format('Status changed: %s -> %s', v_from, v_to)
      else null
    end
  );

  insert into public.activity_log (
    order_id,
    event_type,
    message,
    detail,
    actor_user_id,
    actor_id,
    created_by,
    created_by_name,
    created_by_email
  )
  values (
    p_order_id,
    p_event_type,
    v_msg,
    v_payload,
    v_app_uid,
    v_auth_uid,
    v_auth_uid,
    v_actor.full_name,
    v_actor.email
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.rpc_log_event(uuid, text, text, jsonb) to authenticated;

create or replace function public.rpc_log_event(
  p_order_id uuid,
  p_event_type text,
  p_details jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor record;
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
begin
  select * into v_actor from public._activity_actor();

  if v_app_uid is null then
    raise exception 'current app user not found';
  end if;

  insert into public.activity_log (
    order_id,
    event_type,
    detail,
    actor_user_id,
    actor_id,
    created_by,
    created_by_name,
    created_by_email,
    created_at
  )
  values (
    p_order_id,
    p_event_type,
    coalesce(p_details, '{}'::jsonb),
    v_app_uid,
    v_auth_uid,
    v_auth_uid,
    v_actor.full_name,
    v_actor.email,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.rpc_log_event(uuid, text, jsonb) to authenticated;

commit;
