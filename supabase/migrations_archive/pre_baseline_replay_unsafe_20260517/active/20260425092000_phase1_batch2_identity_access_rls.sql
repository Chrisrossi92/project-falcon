begin;

-- Phase 1 Batch 2 Step 1:
-- Align access checks and RLS with app identity.
-- public.users.id is the app user id; auth.uid() must map through users.auth_id.

create or replace function public.current_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.user_roles ur
     where ur.user_id = public.current_app_user_id()
       and ur.role in ('owner', 'admin')
  );
$$;

grant execute on function public.current_is_admin() to authenticated;

create or replace function public.current_is_appraiser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.users u
     where u.id = public.current_app_user_id()
       and u.role = 'appraiser'
  );
$$;

grant execute on function public.current_is_appraiser() to authenticated;

-- Orders RLS: compare assignment columns to app user id.
alter table public.orders enable row level security;

drop policy if exists orders_select_admin on public.orders;
create policy orders_select_admin on public.orders
for select using (public.current_is_admin());

drop policy if exists orders_select_appraiser on public.orders;
create policy orders_select_appraiser on public.orders
for select using (
  public.current_is_appraiser()
  and coalesce(appraiser_id, assigned_to) = public.current_app_user_id()
);

drop policy if exists orders_insert_admin on public.orders;
create policy orders_insert_admin on public.orders
for insert with check (public.current_is_admin());

drop policy if exists orders_update_admin on public.orders;
create policy orders_update_admin on public.orders
for update using (public.current_is_admin())
with check (public.current_is_admin());

drop policy if exists orders_update_my_assigned on public.orders;
create policy orders_update_my_assigned on public.orders
for update using (
  public.current_is_appraiser()
  and coalesce(appraiser_id, assigned_to) = public.current_app_user_id()
)
with check (
  public.current_is_appraiser()
  and coalesce(appraiser_id, assigned_to) = public.current_app_user_id()
);

drop policy if exists orders_delete_admin on public.orders;
create policy orders_delete_admin on public.orders
for delete using (public.current_is_admin());

-- Clients RLS: appraisers see clients only through app-user assignment.
alter table public.clients enable row level security;

drop policy if exists clients_select_admin on public.clients;
create policy clients_select_admin on public.clients
for select using (public.current_is_admin());

drop policy if exists clients_select_my_clients on public.clients;
create policy clients_select_my_clients on public.clients
for select using (
  public.current_is_appraiser()
  and exists (
    select 1
      from public.orders o
     where o.client_id = clients.id
       and coalesce(o.is_archived, false) = false
       and coalesce(o.appraiser_id, o.assigned_to) = public.current_app_user_id()
  )
);

drop policy if exists clients_write_admin on public.clients;
create policy clients_write_admin on public.clients
for all using (public.current_is_admin())
with check (public.current_is_admin());

-- Activity RLS: visibility uses app user id. Activity actor writes are unchanged.
alter table public.activity_log enable row level security;

drop policy if exists activity_select_admin on public.activity_log;
create policy activity_select_admin on public.activity_log
for select using (public.current_is_admin());

drop policy if exists activity_select_appraiser on public.activity_log;
create policy activity_select_appraiser on public.activity_log
for select using (
  public.current_is_appraiser()
  and exists (
    select 1
      from public.orders o
     where o.id = activity_log.order_id
       and coalesce(o.appraiser_id, o.assigned_to) = public.current_app_user_id()
  )
);

drop policy if exists activity_select_my_orders on public.activity_log;
create policy activity_select_my_orders on public.activity_log
for select using (
  public.current_is_appraiser()
  and exists (
    select 1
      from public.orders o
     where o.id = activity_log.order_id
       and coalesce(o.appraiser_id, o.assigned_to) = public.current_app_user_id()
  )
);

drop policy if exists activity_insert_visible on public.activity_log;
create policy activity_insert_visible on public.activity_log
for insert with check (
  public.current_is_admin()
  or exists (
    select 1
      from public.orders o
     where o.id = activity_log.order_id
       and coalesce(o.appraiser_id, o.assigned_to) = public.current_app_user_id()
  )
);

drop policy if exists activity_insert_visible_order on public.activity_log;
create policy activity_insert_visible_order on public.activity_log
for insert with check (
  exists (
    select 1
      from public.orders o
     where o.id = activity_log.order_id
       and (
         (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('admin', 'reviewer')
         or coalesce(o.appraiser_id, o.assigned_to) = public.current_app_user_id()
       )
  )
);

drop policy if exists activity_delete_none on public.activity_log;
create policy activity_delete_none on public.activity_log
for delete using (public.current_is_admin());

-- Activity logging RPC authorization: only the access comparison changes.
-- Inserted actor values continue to flow through _activity_actor().
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
  v_uid uuid := public.current_app_user_id();
  v_from text := coalesce(p_payload->>'from_status', p_payload->>'from');
  v_to text := coalesce(p_payload->>'to_status', p_payload->>'to');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_msg text;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if not exists (
    select 1
      from public.orders o
     where o.id = p_order_id
       and (
         v_role in ('admin', 'reviewer')
         or coalesce(o.appraiser_id, o.assigned_to) = v_uid
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
        then format('Status changed: %s -> %s', v_from, v_to)
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
