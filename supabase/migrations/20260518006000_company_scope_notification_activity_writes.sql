begin;

update public.notifications n
   set company_id = coalesce(o.company_id, public.default_company_id())
  from public.orders o
 where n.order_id = o.id
   and n.company_id is null;

update public.notifications
   set company_id = public.default_company_id()
 where company_id is null;

update public.activity_log a
   set company_id = coalesce(o.company_id, public.default_company_id())
  from public.orders o
 where a.order_id = o.id
   and a.company_id is null;

update public.activity_log
   set company_id = public.default_company_id()
 where company_id is null;

create or replace function public.rpc_notification_create(patch jsonb)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notifications;
  v_order_id uuid := nullif(patch->>'order_id', '')::uuid;
  v_company_id uuid;
begin
  select o.company_id
    into v_company_id
    from public.orders o
   where o.id = v_order_id
   limit 1;

  v_company_id := coalesce(v_company_id, public.default_company_id());

  insert into public.notifications (
    user_id,
    company_id,
    type,
    category,
    title,
    body,
    order_id,
    is_read,
    created_at,
    link_path,
    payload
  ) values (
    coalesce(nullif(patch->>'user_id', '')::uuid, public.current_app_user_id()),
    v_company_id,
    coalesce(patch->>'type', patch->>'category'),
    patch->>'category',
    patch->>'title',
    patch->>'body',
    v_order_id,
    coalesce(nullif(patch->>'is_read', '')::boolean, false),
    coalesce(nullif(patch->>'created_at', '')::timestamptz, now()),
    patch->>'link_path',
    coalesce(patch->'payload', '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.rpc_notification_create(jsonb) to authenticated;

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
  v_company_id uuid;
  v_order_authorized boolean := false;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if v_app_uid is null then
    raise exception 'current app user not found';
  end if;

  select o.company_id
    into v_company_id
    from public.orders o
   where o.id = p_order_id
     and (
       v_role in ('admin', 'reviewer')
       or coalesce(o.appraiser_id, o.assigned_to) = v_app_uid
     )
   limit 1;
  v_order_authorized := found;

  if not v_order_authorized then
    raise exception 'not authorized to log activity for this order';
  end if;

  v_company_id := coalesce(v_company_id, public.default_company_id());

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
    company_id,
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
    v_company_id,
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
  v_company_id uuid;
begin
  select * into v_actor from public._activity_actor();

  if v_app_uid is null then
    raise exception 'current app user not found';
  end if;

  select o.company_id
    into v_company_id
    from public.orders o
   where o.id = p_order_id
   limit 1;

  v_company_id := coalesce(v_company_id, public.default_company_id());

  insert into public.activity_log (
    order_id,
    company_id,
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
    v_company_id,
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

comment on function public.rpc_notification_create(jsonb) is
  'Creates notifications with server-derived company scope from order_id, falling back to falcon_default during default-company mode.';

comment on function public.rpc_log_event(uuid, text, text, jsonb) is
  'Logs order activity with company scope derived from the source order.';

comment on function public.rpc_log_event(uuid, text, jsonb) is
  'Logs order activity with company scope derived from the source order.';

commit;
