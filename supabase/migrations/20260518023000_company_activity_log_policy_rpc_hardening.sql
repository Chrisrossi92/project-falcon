begin;

create or replace function public.current_app_user_can_write_order_activity(
  p_order_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.orders o
      where o.id = p_order_id
        and public.current_app_user_has_current_company()
        and coalesce(o.company_id, public.default_company_id()) = public.current_company_id()
        and public.current_app_user_can_read_order(o.id)
        and public.current_app_user_can_update_order_row(
          o.company_id,
          o.appraiser_id,
          o.assigned_to,
          o.reviewer_id,
          o.status
        )
    );
$$;

grant execute on function public.current_app_user_can_write_order_activity(uuid) to authenticated;

drop policy if exists "Admins can insert logs" on public.activity_log;
drop policy if exists "Admins can read all logs" on public.activity_log;
drop policy if exists "Allow insert for authenticated" on public.activity_log;
drop policy if exists "Logged-in users can insert logs" on public.activity_log;
drop policy if exists "act_order_scoped" on public.activity_log;
drop policy if exists "activity insert note" on public.activity_log;
drop policy if exists "activity read for authenticated" on public.activity_log;
drop policy if exists "activity_appraiser_relevant" on public.activity_log;
drop policy if exists "activity_delete_block" on public.activity_log;
drop policy if exists "activity_delete_none" on public.activity_log;
drop policy if exists "activity_insert" on public.activity_log;
drop policy if exists "activity_insert_block" on public.activity_log;
drop policy if exists "activity_insert_visible" on public.activity_log;
drop policy if exists "activity_insert_visible_order" on public.activity_log;
drop policy if exists "activity_log_read" on public.activity_log;
drop policy if exists "activity_owner_admin_full_access" on public.activity_log;
drop policy if exists "activity_read" on public.activity_log;
drop policy if exists "activity_read_auth" on public.activity_log;
drop policy if exists "activity_read_own_orders" on public.activity_log;
drop policy if exists "activity_select_admin" on public.activity_log;
drop policy if exists "activity_select_appraiser" on public.activity_log;
drop policy if exists "activity_select_my_orders" on public.activity_log;
drop policy if exists "activity_select_own_orders" on public.activity_log;
drop policy if exists "activity_update_block" on public.activity_log;
drop policy if exists "activity_update_none" on public.activity_log;
drop policy if exists "insert activity (assigned/appraiser/admin)" on public.activity_log;
drop policy if exists "read activity (assigned or admin)" on public.activity_log;
drop policy if exists "read activity (assigned/appraiser/admin)" on public.activity_log;

create policy "activity_log_select_readable_order"
on public.activity_log
for select
to authenticated
using (
  order_id is not null
  and public.current_app_user_can_read_order(order_id)
);

create policy "activity_log_insert_updateable_order"
on public.activity_log
for insert
to authenticated
with check (
  order_id is not null
  and public.current_app_user_can_write_order_activity(order_id)
);

create policy "activity_log_update_none"
on public.activity_log
for update
to authenticated
using (false)
with check (false);

create policy "activity_log_delete_none"
on public.activity_log
for delete
to authenticated
using (false);

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
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_from text := coalesce(p_payload->>'from_status', p_payload->>'from');
  v_to text := coalesce(p_payload->>'to_status', p_payload->>'to');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_msg text;
  v_order public.orders;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if v_app_uid is null then
    raise exception 'current app user not found';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = p_order_id
   limit 1;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.current_app_user_has_current_company()
     or coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id()
     or not public.current_app_user_can_read_order(p_order_id)
     or not public.current_app_user_can_update_order_row(
       v_order.company_id,
       v_order.appraiser_id,
       v_order.assigned_to,
       v_order.reviewer_id,
       v_order.status
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
    coalesce(v_order.company_id, public.default_company_id()),
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
  v_order public.orders;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if v_app_uid is null then
    raise exception 'current app user not found';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = p_order_id
   limit 1;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.current_app_user_has_current_company()
     or coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id()
     or not public.current_app_user_can_read_order(p_order_id)
     or not public.current_app_user_can_update_order_row(
       v_order.company_id,
       v_order.appraiser_id,
       v_order.assigned_to,
       v_order.reviewer_id,
       v_order.status
     ) then
    raise exception 'not authorized to log activity for this order';
  end if;

  select * into v_actor from public._activity_actor();

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
    coalesce(v_order.company_id, public.default_company_id()),
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

comment on function public.current_app_user_can_write_order_activity(uuid) is
  'Slice 7G1 activity write predicate. Authenticated app writes require current-company membership plus readable and updateable source order; order_id-null system rows are hidden/blocked from app roles.';

comment on function public.rpc_log_event(uuid, text, text, jsonb) is
  'Slice 7G1: logs order activity only for readable/updateable current-company orders while preserving existing message/dedupe semantics.';

comment on function public.rpc_log_event(uuid, text, jsonb) is
  'Slice 7G1: logs order activity only for readable/updateable current-company orders while preserving existing compact RPC shape.';

comment on policy "activity_log_select_readable_order" on public.activity_log is
  'Slice 7G1: authenticated activity reads require a non-null readable source order; order_id-null system rows are not exposed to app roles.';

comment on policy "activity_log_insert_updateable_order" on public.activity_log is
  'Slice 7G1: authenticated direct activity inserts require a non-null readable/updateable current-company order.';

commit;
