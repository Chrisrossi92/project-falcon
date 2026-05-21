-- Email outbox queue + notification email preferences
begin;

-- 1) Preferences table (per user)
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  email_enabled boolean not null default true,
  email_address text,
  digest_mode text,
  quiet_hours jsonb,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists notifprefs_select_self on public.notification_preferences;
create policy notifprefs_select_self on public.notification_preferences
  for select using (user_id = auth.uid());

drop policy if exists notifprefs_upsert_self on public.notification_preferences;
create policy notifprefs_upsert_self on public.notification_preferences
  for insert with check (user_id = auth.uid());
create policy notifprefs_update_self on public.notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) Outbox table
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete cascade,
  to_user_id uuid not null references public.users(id) on delete cascade,
  to_email text not null,
  subject text not null,
  body_text text,
  body_html text,
  status text not null default 'queued',
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.email_outbox enable row level security;

drop policy if exists email_outbox_select_admin on public.email_outbox;
create policy email_outbox_select_admin on public.email_outbox
  for select using (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('admin')
  );

drop policy if exists email_outbox_insert_self on public.email_outbox;
create policy email_outbox_insert_self on public.email_outbox
  for insert with check (to_user_id = auth.uid());

drop policy if exists email_outbox_update_admin on public.email_outbox;
create policy email_outbox_update_admin on public.email_outbox
  for update using (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('admin')
  ) with check (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('admin')
  );

-- 3) Helper: get email preference for a user
create or replace function public._notification_email_pref(p_user_id uuid)
returns table(email_enabled boolean, email_address text)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(p.email_enabled, true) as email_enabled,
    coalesce(p.email_address, prof.email) as email_address
  from public.notification_preferences p
  full join public.profiles prof on prof.id = p_user_id
  where coalesce(p.user_id, prof.id) = p_user_id;
$$;

-- 4) Trigger to enqueue email on new notification
create or replace function public.tg_notifications_queue_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean := true;
  v_email text;
  v_subject text;
  v_body text;
begin
  -- preferences
  select email_enabled, email_address
    into v_enabled, v_email
    from public._notification_email_pref(NEW.user_id);

  if coalesce(v_enabled, true) = false then
    return NEW;
  end if;

  if v_email is null then
    return NEW;
  end if;

  -- subject/body derivation (MVP)
  if NEW.order_id is not null then
    v_subject := coalesce(NEW.title, 'New update on your order');
  else
    v_subject := coalesce(NEW.title, 'New notification');
  end if;

  v_body := coalesce(NEW.message, NEW.body, NEW.body_text, NEW.title, 'You have a new notification.');

  insert into public.email_outbox(
    notification_id,
    to_user_id,
    to_email,
    subject,
    body_text
  ) values (
    NEW.id,
    NEW.user_id,
    v_email,
    v_subject,
    v_body
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notifications_queue_email on public.notifications;
create trigger trg_notifications_queue_email
after insert on public.notifications
for each row execute function public.tg_notifications_queue_email();

-- 5) RPC to set preferences
drop function if exists public.rpc_set_notification_preferences(boolean, text);
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
begin
  insert into public.notification_preferences(user_id, email_enabled, email_address, updated_at)
  values (auth.uid(), coalesce(p_email_enabled, true), p_email_address, now())
  on conflict (user_id) do update
    set email_enabled = coalesce(excluded.email_enabled, public.notification_preferences.email_enabled),
        email_address = coalesce(excluded.email_address, public.notification_preferences.email_address),
        updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
grant execute on function public.rpc_set_notification_preferences(boolean, text) to authenticated;

commit;
