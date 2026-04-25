begin;

-- Phase 1 identity alignment:
-- public.users.id is the canonical app user id.
-- auth.uid() is auth-only and must map through public.users.auth_id.

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
    from public.users u
   where u.auth_id = auth.uid()
   limit 1;
$$;

grant execute on function public.current_app_user_id() to authenticated;

drop function if exists public.rpc_get_notifications(integer);
drop function if exists public.rpc_get_notifications(integer, timestamptz);
drop function if exists public.rpc_get_unread_count();
drop function if exists public.rpc_mark_notification_read(uuid);
drop function if exists public.rpc_mark_all_notifications_read();
drop function if exists public.rpc_set_notification_preferences(boolean, text);

-- Notification reads/mutations must scope to public.users.id, not auth.uid().
drop policy if exists notif_select_owner on public.notifications;
create policy notif_select_owner on public.notifications
  for select using (user_id = public.current_app_user_id());

create or replace function public.rpc_get_notifications(
  p_limit int default 50,
  p_before timestamptz default null
) returns setof public.notifications
language sql
security definer
set search_path = public
as $$
  select *
    from public.notifications n
   where n.user_id = public.current_app_user_id()
     and (p_before is null or n.created_at < p_before)
   order by n.created_at desc
   limit coalesce(p_limit, 50);
$$;

grant execute on function public.rpc_get_notifications(int, timestamptz) to authenticated;

create or replace function public.rpc_get_unread_count()
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
    from public.notifications n
   where n.user_id = public.current_app_user_id()
     and n.read_at is null;
$$;

grant execute on function public.rpc_get_unread_count() to authenticated;

create or replace function public.rpc_mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications
     set read_at = coalesce(read_at, now())
   where id = p_notification_id
     and user_id = public.current_app_user_id();

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

grant execute on function public.rpc_mark_notification_read(uuid) to authenticated;

create or replace function public.rpc_mark_all_notifications_read()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications
     set read_at = coalesce(read_at, now())
   where user_id = public.current_app_user_id()
     and read_at is null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.rpc_mark_all_notifications_read() to authenticated;

-- Notification creation fallback must use the app user id.
create or replace function public.rpc_notification_create(patch jsonb)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notifications;
begin
  insert into public.notifications (
    user_id,
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
    coalesce(patch->>'type', patch->>'category'),
    patch->>'category',
    patch->>'title',
    patch->>'body',
    nullif(patch->>'order_id', '')::uuid,
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

-- Notification preferences are keyed by public.users.id.
drop policy if exists notifprefs_select_self on public.notification_preferences;
create policy notifprefs_select_self on public.notification_preferences
  for select using (user_id = public.current_app_user_id());

drop policy if exists notifprefs_upsert_self on public.notification_preferences;
create policy notifprefs_upsert_self on public.notification_preferences
  for insert with check (user_id = public.current_app_user_id());

drop policy if exists notifprefs_update_self on public.notification_preferences;
create policy notifprefs_update_self on public.notification_preferences
  for update using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

create or replace function public.rpc_set_notification_preferences(
  p_email_enabled boolean,
  p_email_address text default null
) returns public.notification_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notification_preferences;
  v_user_id uuid := public.current_app_user_id();
begin
  if v_user_id is null then
    raise exception 'current app user not found';
  end if;

  insert into public.notification_preferences(user_id, email_enabled, email_address, updated_at)
  values (v_user_id, coalesce(p_email_enabled, true), p_email_address, now())
  on conflict (user_id) do update
    set email_enabled = coalesce(excluded.email_enabled, public.notification_preferences.email_enabled),
        email_address = coalesce(excluded.email_address, public.notification_preferences.email_address),
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.rpc_set_notification_preferences(boolean, text) to authenticated;

-- Email queue lookup now treats notifications.user_id as public.users.id.
drop function if exists public._notification_email_target(uuid);
create or replace function public._notification_email_target(p_user_id uuid)
returns table(
  to_user_id uuid,
  email_enabled boolean,
  email_address text
)
language sql
security definer
set search_path = public
as $$
  select
    u.id as to_user_id,
    coalesce(np.email_enabled, true) as email_enabled,
    coalesce(np.email_address, u.email, p.email) as email_address
  from public.users u
  left join public.notification_preferences np
    on np.user_id = u.id
  left join public.profiles p
    on p.auth_id = u.auth_id
  where u.id = p_user_id
  limit 1;
$$;

create or replace function public.tg_notifications_queue_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_to_user_id uuid;
  v_enabled boolean := true;
  v_email text;
  v_subject text;
  v_body text;
  v_policy_rules jsonb;
  v_email_mode text := 'optional_on';
begin
  select rules
    into v_policy_rules
    from public.notification_policies
   where key = NEW.type
   limit 1;

  if v_policy_rules is not null then
    v_email_mode := coalesce(v_policy_rules->'email'->>'mode', 'off');
  end if;

  if v_email_mode = 'off' then
    return NEW;
  end if;

  select to_user_id, email_enabled, email_address
    into v_to_user_id, v_enabled, v_email
    from public._notification_email_target(NEW.user_id);

  if v_to_user_id is null then
    return NEW;
  end if;

  if v_email is null then
    return NEW;
  end if;

  if v_email_mode = 'optional_off' then
    return NEW;
  end if;

  if v_email_mode = 'optional_on' and coalesce(v_enabled, true) = false then
    return NEW;
  end if;

  if NEW.order_id is not null then
    v_subject := coalesce(NEW.title, 'New update on your order');
  else
    v_subject := coalesce(NEW.title, 'New notification');
  end if;

  v_body := coalesce(NEW.message, NEW.body, NEW.title, 'You have a new notification.');

  insert into public.email_outbox(
    notification_id,
    to_user_id,
    to_email,
    subject,
    body_text
  ) values (
    NEW.id,
    v_to_user_id,
    v_email,
    v_subject,
    v_body
  );

  return NEW;
end;
$$;

-- Assignment notifications should store public.users.id recipients.
create or replace function public.tg_orders_insert_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
  v_title text;
  v_body text;
begin
  if TG_OP = 'INSERT' then
    if NEW.appraiser_id is null then
      return NEW;
    end if;

    v_event_type := 'order.new_assigned';
    v_title := 'New order assigned';
    v_body := 'You''ve been assigned order #' || coalesce(NEW.order_number, NEW.id::text);
  elsif TG_OP = 'UPDATE' then
    if NEW.appraiser_id is null or NEW.appraiser_id is not distinct from OLD.appraiser_id then
      return NEW;
    end if;

    if OLD.appraiser_id is null then
      v_event_type := 'order.new_assigned';
      v_title := 'New order assigned';
      v_body := 'You''ve been assigned order #' || coalesce(NEW.order_number, NEW.id::text);
    else
      v_event_type := 'order.reassigned';
      v_title := 'Order reassigned';
      v_body := 'You''ve been reassigned order #' || coalesce(NEW.order_number, NEW.id::text);
    end if;
  else
    return NEW;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    order_id,
    link_path,
    payload
  ) values (
    NEW.appraiser_id,
    v_event_type,
    v_title,
    v_body,
    NEW.id,
    '/orders/' || NEW.id::text,
    jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'email_template_key',
        case
          when v_event_type = 'order.new_assigned' then 'APPRAISER_ASSIGNED'
          else null
        end
    )
  );

  return NEW;
end;
$$;

commit;
