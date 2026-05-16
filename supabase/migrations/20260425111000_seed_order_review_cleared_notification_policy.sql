begin;

-- Seed policy for the Phase 5 clear-review handoff notification.
-- `emitNotification` requires a notification_policies row for each event key.
-- `fetchAdminRecipients` currently maps admin and owner recipients to role `admin`,
-- so the admin in-app rule is required for delivery.

insert into public.notification_policies (key, rules)
values (
  'order.review_cleared',
  jsonb_build_object(
    'category', 'workflow',
    'priority', 'normal',
    'email', jsonb_build_object('mode', 'optional_on'),
    'roles', jsonb_build_object(
      'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
      'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
    )
  )
)
on conflict (key) do update
set rules = excluded.rules;

commit;
