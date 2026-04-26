begin;

-- Seed / refresh central event policy registry in the existing notification_policies table.
-- Keep the existing rules shape that the frontend notification service already expects,
-- and extend it with rules.email.mode for backend email gating.
delete from public.notification_policies
where key in (
  'order.new_assigned',
  'order.sent_to_review',
  'order.sent_back_to_appraiser',
  'order.reassigned',
  'note.admin_added',
  'note.reviewer_added',
  'note.appraiser_added',
  'note.with_attachment',
  'order.resubmitted_to_review',
  'order.ready_for_client',
  'order.completed',
  'order.scheduled',
  'order.in_progress',
  'order.due_today',
  'order.overdue',
  'note.addressed'
);

insert into public.notification_policies (key, rules)
values
  (
    'order.new_assigned',
    jsonb_build_object(
      'category', 'order',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.sent_to_review',
    jsonb_build_object(
      'category', 'workflow',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'optional_on'),
      'roles', jsonb_build_object(
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.sent_back_to_appraiser',
    jsonb_build_object(
      'category', 'workflow',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.reassigned',
    jsonb_build_object(
      'category', 'workflow',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'note.admin_added',
    jsonb_build_object(
      'category', 'communication',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'note.reviewer_added',
    jsonb_build_object(
      'category', 'communication',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'note.appraiser_added',
    jsonb_build_object(
      'category', 'communication',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'note.with_attachment',
    jsonb_build_object(
      'category', 'communication',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.resubmitted_to_review',
    jsonb_build_object(
      'category', 'workflow',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'optional_on'),
      'roles', jsonb_build_object(
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.ready_for_client',
    jsonb_build_object(
      'category', 'workflow',
      'priority', 'normal',
      'email', jsonb_build_object('mode', 'optional_on'),
      'roles', jsonb_build_object(
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.completed',
    jsonb_build_object(
      'category', 'workflow',
      'priority', 'normal',
      'email', jsonb_build_object('mode', 'optional_on'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.scheduled',
    jsonb_build_object(
      'category', 'workflow',
      'priority', 'low',
      'email', jsonb_build_object('mode', 'optional_off'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', false, 'required', false)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.in_progress',
    jsonb_build_object(
      'category', 'workflow',
      'priority', 'low',
      'email', jsonb_build_object('mode', 'optional_off'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', false, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', false, 'required', false))
      )
    )
  ),
  (
    'order.due_today',
    jsonb_build_object(
      'category', 'reminder',
      'priority', 'normal',
      'email', jsonb_build_object('mode', 'optional_off'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', false, 'required', false)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', false, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', false, 'required', false))
      )
    )
  ),
  (
    'order.overdue',
    jsonb_build_object(
      'category', 'reminder',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'optional_off'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', false, 'required', false)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'note.addressed',
    jsonb_build_object(
      'category', 'communication',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'optional_on'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  );

-- Resolve a notification recipient by auth uid so the email queue can keep using
-- the existing public.users-based preference/outbox tables safely.
drop function if exists public._notification_email_target(uuid);
create or replace function public._notification_email_target(p_auth_user_id uuid)
returns table(
  to_user_id uuid,
  email_enabled boolean,
  email_address text
)
language sql
security definer
set search_path = public
as $$
  with matched_user as (
    select
      u.id as app_user_id,
      u.auth_id,
      coalesce(u.email, p.email) as fallback_email
    from public.users u
    left join public.profiles p
      on p.auth_id = u.auth_id
    where u.auth_id = p_auth_user_id
    limit 1
  )
  select
    mu.app_user_id as to_user_id,
    coalesce(np.email_enabled, true) as email_enabled,
    coalesce(np.email_address, mu.fallback_email) as email_address
  from matched_user mu
  left join public.notification_preferences np
    on np.user_id = mu.app_user_id;
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

  v_body := coalesce(NEW.message, NEW.body, NEW.body_text, NEW.title, 'You have a new notification.');

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

commit;
