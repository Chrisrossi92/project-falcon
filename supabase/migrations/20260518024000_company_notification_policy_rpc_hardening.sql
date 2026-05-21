begin;

create or replace function public.current_app_user_can_access_notification_row(
  p_user_id uuid,
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
    or (
      p_user_id = public.current_app_user_id()
      and (
        p_order_id is null
        or public.current_app_user_can_read_order(p_order_id)
      )
    );
$$;

grant execute on function public.current_app_user_can_access_notification_row(uuid, uuid) to authenticated;

drop policy if exists "Users can read their notifications" on public.notifications;
drop policy if exists "allow_insert_notifications" on public.notifications;
drop policy if exists "allow_select_own_notifications" on public.notifications;
drop policy if exists "notif_delete_none" on public.notifications;
drop policy if exists "notif_delete_own" on public.notifications;
drop policy if exists "notif_insert_none" on public.notifications;
drop policy if exists "notif_insert_own" on public.notifications;
drop policy if exists "notif_select_own" on public.notifications;
drop policy if exists "notif_select_owner" on public.notifications;
drop policy if exists "notif_select_self" on public.notifications;
drop policy if exists "notif_update_own" on public.notifications;
drop policy if exists "notif_update_self" on public.notifications;
drop policy if exists "notifications_block_delete" on public.notifications;
drop policy if exists "notifications_block_insert" on public.notifications;
drop policy if exists "notifications_block_insert_delete" on public.notifications;
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_read_own" on public.notifications;

create policy "notifications_select_current_user_order_safe"
on public.notifications
for select
to authenticated
using (
  public.current_app_user_can_access_notification_row(user_id, order_id)
);

create policy "notifications_insert_none"
on public.notifications
for insert
to authenticated
with check (false);

create policy "notifications_update_none"
on public.notifications
for update
to authenticated
using (false)
with check (false);

create policy "notifications_delete_none"
on public.notifications
for delete
to authenticated
using (false);

create or replace function public.rpc_notification_create(patch jsonb)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notifications;
  v_order public.orders;
  v_order_id uuid := nullif(patch->>'order_id', '')::uuid;
  v_company_id uuid;
  v_recipient_user_id uuid := nullif(patch->>'user_id', '')::uuid;
  v_app_user_id uuid := public.current_app_user_id();
  v_is_service_role boolean := auth.role() = 'service_role';
begin
  if v_recipient_user_id is null then
    v_recipient_user_id := v_app_user_id;
  end if;

  if v_recipient_user_id is null then
    raise exception 'notification recipient user_id is required'
      using errcode = '23502';
  end if;

  if v_order_id is null then
    if not v_is_service_role then
      raise exception 'authenticated notification creation requires an order_id'
        using errcode = '42501';
    end if;

    v_company_id := public.default_company_id();
  else
    select *
      into v_order
      from public.orders o
     where o.id = v_order_id
     limit 1;

    if not found then
      raise exception 'notification source order not found'
        using errcode = '23503';
    end if;

    v_company_id := coalesce(v_order.company_id, public.default_company_id());

    if not v_is_service_role then
      if v_app_user_id is null then
        raise exception 'current app user not found'
          using errcode = '42501';
      end if;

      if not public.current_app_user_has_current_company()
         or v_company_id <> public.current_company_id()
         or not public.current_app_user_can_read_order(v_order_id)
         or not public.current_app_user_can_update_order_row(
           v_order.company_id,
           v_order.appraiser_id,
           v_order.assigned_to,
           v_order.reviewer_id,
           v_order.status
         ) then
        raise exception 'not authorized to create notification for this order'
          using errcode = '42501';
      end if;
    end if;

    if not exists (
      select 1
        from public.company_memberships cm
       where cm.user_id = v_recipient_user_id
         and cm.company_id = v_company_id
         and cm.status = 'active'
    ) then
      raise exception 'notification recipient is not an active member of the source company'
        using errcode = '42501';
    end if;
  end if;

  insert into public.notifications (
    user_id,
    company_id,
    type,
    category,
    title,
    body,
    message,
    order_id,
    is_read,
    created_at,
    link_path,
    payload,
    priority
  ) values (
    v_recipient_user_id,
    v_company_id,
    coalesce(patch->>'type', patch->>'category'),
    patch->>'category',
    patch->>'title',
    patch->>'body',
    patch->>'message',
    v_order_id,
    coalesce(nullif(patch->>'is_read', '')::boolean, false),
    coalesce(nullif(patch->>'created_at', '')::timestamptz, now()),
    patch->>'link_path',
    coalesce(patch->'payload', '{}'::jsonb),
    patch->>'priority'
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.rpc_notification_create(jsonb) from public, anon;
grant execute on function public.rpc_notification_create(jsonb) to authenticated, service_role;

create or replace function public.rpc_mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications n
     set read_at = coalesce(n.read_at, now()),
         is_read = true,
         read = true
   where n.id = p_notification_id
     and public.current_app_user_can_access_notification_row(n.user_id, n.order_id);

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function public.rpc_mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications n
     set read_at = coalesce(n.read_at, now()),
         is_read = true,
         read = true
   where public.current_app_user_can_access_notification_row(n.user_id, n.order_id)
     and n.read_at is null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

create or replace function public.rpc_dismiss_notification(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications n
     set dismissed_at = coalesce(n.dismissed_at, now()),
         read_at = coalesce(n.read_at, now()),
         is_read = true,
         read = true
   where n.id = p_notification_id
     and public.current_app_user_can_access_notification_row(n.user_id, n.order_id);

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function public.rpc_dismiss_seen_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications n
     set dismissed_at = coalesce(n.dismissed_at, now())
   where public.current_app_user_can_access_notification_row(n.user_id, n.order_id)
     and n.read_at is not null
     and n.dismissed_at is null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

create or replace function public.rpc_notifications_mark_all_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications n
     set is_read = true,
         read = true,
         read_at = coalesce(n.read_at, now())
   where public.current_app_user_can_access_notification_row(n.user_id, n.order_id)
     and coalesce(n.is_read, false) = false;
$$;

create or replace function public.rpc_notifications_mark_read(ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications n
     set is_read = true,
         read = true,
         read_at = coalesce(n.read_at, now())
   where n.id = any(ids)
     and public.current_app_user_can_access_notification_row(n.user_id, n.order_id);
$$;

revoke execute on function public.rpc_mark_notification_read(uuid) from public, anon;
revoke execute on function public.rpc_mark_all_notifications_read() from public, anon;
revoke execute on function public.rpc_dismiss_notification(uuid) from public, anon;
revoke execute on function public.rpc_dismiss_seen_notifications() from public, anon;
revoke execute on function public.rpc_notifications_mark_all_read() from public, anon;
revoke execute on function public.rpc_notifications_mark_read(uuid[]) from public, anon;

grant execute on function public.rpc_mark_notification_read(uuid) to authenticated, service_role;
grant execute on function public.rpc_mark_all_notifications_read() to authenticated, service_role;
grant execute on function public.rpc_dismiss_notification(uuid) to authenticated, service_role;
grant execute on function public.rpc_dismiss_seen_notifications() to authenticated, service_role;
grant execute on function public.rpc_notifications_mark_all_read() to authenticated, service_role;
grant execute on function public.rpc_notifications_mark_read(uuid[]) to authenticated, service_role;

create or replace function public.rpc_notify_admins(
  p_title text,
  p_body text,
  p_message text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'rpc_notify_admins is deprecated/quarantined',
    hint = 'Use tenant-safe order-tied notification creation paths.';
end;
$$;

create or replace function public.rpc_notify_user(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'rpc_notify_user is deprecated/quarantined',
    hint = 'Use tenant-safe order-tied notification creation paths.';
end;
$$;

create or replace function public.notify_admins(
  p_title text,
  p_body text,
  p_message text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'notify_admins is deprecated/quarantined',
    hint = 'Use tenant-safe order-tied notification creation paths.';
end;
$$;

create or replace function public.notify_safe(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_message text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'notify_safe is deprecated/quarantined',
    hint = 'Use tenant-safe order-tied notification creation paths.';
end;
$$;

create or replace function public.rpc_debug_notifications_access()
returns table(ok boolean, rows_seen integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'rpc_debug_notifications_access is deprecated/quarantined',
    hint = 'Use catalog checks and tenant-safe notification RPC validation instead.';
end;
$$;

revoke execute on function public.rpc_notify_admins(text, text, text) from public, anon, authenticated;
revoke execute on function public.rpc_notify_user(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_safe(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.rpc_debug_notifications_access() from public, anon, authenticated;

grant execute on function public.rpc_notify_admins(text, text, text) to service_role;
grant execute on function public.rpc_notify_user(uuid, text, text, text) to service_role;
grant execute on function public.notify_admins(text, text, text) to service_role;
grant execute on function public.notify_safe(uuid, text, text, text) to service_role;
grant execute on function public.rpc_debug_notifications_access() to service_role;

comment on function public.current_app_user_can_access_notification_row(uuid, uuid) is
  'Slice 7G2A notification row predicate. Personal notifications require current_app_user_id(); order-tied notifications additionally require readable source orders.';

comment on policy "notifications_select_current_user_order_safe" on public.notifications is
  'Slice 7G2A canonical notification SELECT policy. Uses app user identity and hides order-tied rows unless the source order is readable.';

comment on policy "notifications_insert_none" on public.notifications is
  'Slice 7G2A blocks direct authenticated notification inserts; use rpc_notification_create for tenant-safe order-tied notifications.';

comment on policy "notifications_update_none" on public.notifications is
  'Slice 7G2A blocks direct authenticated notification updates; use mark/dismiss RPCs for personal delivery-state mutations.';

comment on policy "notifications_delete_none" on public.notifications is
  'Slice 7G2A keeps notification deletes blocked for authenticated app users.';

comment on function public.rpc_notification_create(jsonb) is
  'Slice 7G2A tenant-safe notification creation. Authenticated callers must create order-tied notifications for readable/updateable current-company orders; recipient must be an active member of the source company. Non-order creation is service_role-only.';

comment on function public.rpc_mark_notification_read(uuid) is
  'Slice 7G2A marks only current-user notifications that are personal or tied to readable source orders.';

comment on function public.rpc_mark_all_notifications_read() is
  'Slice 7G2A marks only current-user notifications that are personal or tied to readable source orders.';

comment on function public.rpc_dismiss_notification(uuid) is
  'Slice 7G2A dismisses only current-user notifications that are personal or tied to readable source orders.';

comment on function public.rpc_dismiss_seen_notifications() is
  'Slice 7G2A dismisses only seen current-user notifications that are personal or tied to readable source orders.';

comment on function public.rpc_notifications_mark_all_read() is
  'Slice 7G2A legacy mark-all-read compatibility wrapper with order-readable notification mutation safety.';

comment on function public.rpc_notifications_mark_read(uuid[]) is
  'Slice 7G2A legacy mark-read compatibility wrapper with order-readable notification mutation safety.';

comment on function public.rpc_notify_admins(text, text, text) is
  'Slice 7G2A quarantine. Deprecated manual notification RPC; app-role execute revoked and body raises an exception.';

comment on function public.rpc_notify_user(uuid, text, text, text) is
  'Slice 7G2A quarantine. Deprecated manual notification RPC; app-role execute revoked and body raises an exception.';

comment on function public.notify_admins(text, text, text) is
  'Slice 7G2A quarantine. Deprecated manual notification wrapper; app-role execute revoked and body raises an exception.';

comment on function public.notify_safe(uuid, text, text, text) is
  'Slice 7G2A quarantine. Deprecated manual notification wrapper; app-role execute revoked and body raises an exception.';

comment on function public.rpc_debug_notifications_access() is
  'Slice 7G2A quarantine. Deprecated debug RPC; app-role execute revoked and body raises an exception.';

commit;
