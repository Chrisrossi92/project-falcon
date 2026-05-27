begin;

create or replace function public.notification_user_role_keys(
  p_user_id uuid,
  p_company_id uuid default null
)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  with target_company as (
    select coalesce(p_company_id, public.default_company_id()) as company_id
  ),
  assigned as (
    select distinct lower(btrim(r.name)) as role_key
      from target_company tc
      join public.user_role_assignments ura
        on ura.user_id = p_user_id
       and ura.company_id = tc.company_id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
      join public.roles r
        on r.id = ura.role_id
     where p_user_id is not null
       and tc.company_id is not null
  ),
  legacy as (
    select distinct lower(btrim(ur.role)) as role_key
      from public.users u
      join public.user_roles ur
        on ur.user_id = p_user_id
        or ur.user_id = u.auth_id
     where u.id = p_user_id
       and coalesce(p_company_id, public.default_company_id()) = public.default_company_id()
       and ur.role is not null
  ),
  user_fallback as (
    select lower(btrim(u.role)) as role_key
      from public.users u
     where u.id = p_user_id
       and u.role is not null
  )
  select coalesce(array_agg(distinct role_key order by role_key), array[]::text[])
    from (
      select role_key from assigned
      union
      select role_key from legacy
      union
      select role_key from user_fallback
    ) roles
   where role_key is not null
     and role_key <> '';
$$;

create or replace function public.notification_user_effective_preference(
  p_user_id uuid,
  p_event_key text,
  p_channel text,
  p_company_id uuid default null
)
returns table (
  effective_enabled boolean,
  locked boolean,
  lock_reason text,
  default_enabled boolean,
  user_override boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with policy_row as (
    select jsonb_set(coalesce(np.rules, '{}'::jsonb), '{event_key}', to_jsonb(np.key), true) as rules
      from public.notification_policies np
     where np.key = p_event_key
       and np.key not like 'locks.%'
       and np.key not like 'defaults.%'
     limit 1
  ),
  state as (
    select s.*
      from policy_row pr
      cross join lateral public.notification_policy_channel_state(
        pr.rules,
        public.notification_user_role_keys(p_user_id, p_company_id),
        p_channel
      ) s
  ),
  user_pref as (
    select up.enabled
      from public.user_notification_prefs up
     where up.user_id = p_user_id
       and up.type = p_event_key
       and up.channel = lower(btrim(coalesce(p_channel, '')))
     limit 1
  )
  select
    case
      when state.locked then true
      else coalesce(user_pref.enabled, state.default_enabled)
    end as effective_enabled,
    state.locked,
    state.lock_reason,
    state.default_enabled,
    user_pref.enabled as user_override
    from state
    left join user_pref on true;
$$;

create or replace function public._notification_email_target_v1(
  p_user_id uuid
)
returns table (
  to_user_id uuid,
  email_address text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id as to_user_id,
    nullif(btrim(u.email), '') as email_address
    from public.users u
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
  v_email text;
  v_subject text;
  v_body text;
  v_template text;
  v_payload jsonb;
  v_company_id uuid;
  v_email_allowed boolean := false;
begin
  begin
    if NEW.user_id is null or nullif(btrim(coalesce(NEW.type, '')), '') is null then
      return NEW;
    end if;

    if NEW.order_id is not null then
      select o.company_id
        into v_company_id
        from public.orders o
       where o.id = NEW.order_id
       limit 1;
    end if;

    select prefs.effective_enabled
      into v_email_allowed
      from public.notification_user_effective_preference(
        NEW.user_id,
        NEW.type,
        'email',
        v_company_id
      ) prefs;

    if coalesce(v_email_allowed, false) is false then
      return NEW;
    end if;

    select target.to_user_id, target.email_address
      into v_to_user_id, v_email
      from public._notification_email_target_v1(NEW.user_id) target;

    if v_to_user_id is null or v_email is null then
      return NEW;
    end if;

    if NEW.order_id is not null then
      v_subject := coalesce(NEW.title, 'New update on your order');
    else
      v_subject := coalesce(NEW.title, 'New notification');
    end if;

    v_body := coalesce(NEW.message, NEW.body, NEW.title, 'You have a new notification.');
    v_template := coalesce(
      NEW.payload->>'email_template_key',
      NEW.payload->>'template_key',
      NEW.payload->>'templateKey',
      NEW.type,
      'notification'
    );
    v_payload := coalesce(NEW.payload, '{}'::jsonb) || jsonb_build_object(
      'notification_id', NEW.id,
      'notification_type', NEW.type,
      'category', NEW.category,
      'title', v_subject,
      'body', v_body,
      'message', v_body,
      'order_id', NEW.order_id,
      'link_path', NEW.link_path
    );

    insert into public.email_queue(
      user_id,
      to_email,
      subject,
      template,
      payload
    ) values (
      v_to_user_id,
      v_email,
      v_subject,
      v_template,
      v_payload
    );
  exception
    when others then
      null;
  end;

  return NEW;
end;
$$;

revoke all privileges on function public.notification_user_role_keys(uuid, uuid) from public, anon;
revoke all privileges on function public.notification_user_effective_preference(uuid, text, text, uuid) from public, anon;
revoke all privileges on function public._notification_email_target_v1(uuid) from public, anon;

grant execute on function public.notification_user_role_keys(uuid, uuid) to authenticated, service_role;
grant execute on function public.notification_user_effective_preference(uuid, text, text, uuid) to authenticated, service_role;
grant execute on function public._notification_email_target_v1(uuid) to authenticated, service_role;

comment on function public.notification_user_effective_preference(uuid, text, text, uuid) is
  'Resolves one user event/channel notification preference using public.users.id, notification_policies defaults/locks, and user_notification_prefs overrides. Used by email queue fanout.';

comment on function public.tg_notifications_queue_email() is
  'Queues canonical email_queue rows after in-app notification insert only when the recipient public.users.id effective email preference allows it. Queue failures are swallowed so in-app notifications are not blocked.';

commit;
