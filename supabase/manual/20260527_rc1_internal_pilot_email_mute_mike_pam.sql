-- Falcon V1 RC1 temporary internal pilot email mute.
--
-- Purpose:
--   Prevent Mike and Pam from receiving email notifications during the
--   internal pilot while preserving in-app notifications, accounts, recipient
--   resolution, roles, permissions, policies, and all notification logic.
--
-- Target users:
--   - mstout@continentalres.net
--   - pcasper@continentalres.net
--
-- Scope:
--   - Uses public.users.id, not auth.uid.
--   - Writes only public.user_notification_prefs rows where channel = 'email'.
--   - Covers all current public.notification_policies keys except internal
--     locks/defaults rows.
--   - Does not touch in_app preferences.
--   - Does not change notification_policies.
--
-- Reversibility:
--   The apply query stores RC1 metadata on each touched preference row:
--     rc1_internal_pilot_email_mute
--     rc1_internal_pilot_email_mute_applied_at
--     rc1_internal_pilot_email_mute_previous_row_exists
--     rc1_internal_pilot_email_mute_previous_enabled
--
--   The rollback query uses that metadata to restore previous enabled values
--   or delete rows that were created only for this temporary mute.

-- ---------------------------------------------------------------------------
-- DRY RUN
-- ---------------------------------------------------------------------------
-- Shows targeted public.users rows and every email policy key that would be
-- muted. Review this output before running APPLY.

with target_users as (
  select
    u.id as user_id,
    u.email,
    coalesce(u.display_name, u.full_name, u.name, u.email) as display_name,
    u.role,
    u.is_active
  from public.users u
  where lower(u.email) in (
    'mstout@continentalres.net',
    'pcasper@continentalres.net'
  )
),
policy_keys as (
  select np.key as event_key
  from public.notification_policies np
  where np.key not like 'locks.%'
    and np.key not like 'defaults.%'
)
select
  tu.user_id,
  tu.email,
  tu.display_name,
  tu.role,
  tu.is_active,
  pk.event_key,
  'email' as channel,
  coalesce(up.enabled, true) as current_user_pref_enabled,
  up.enabled is not null as existing_user_pref_row,
  up.meta as current_meta
from target_users tu
cross join policy_keys pk
left join public.user_notification_prefs up
  on up.user_id = tu.user_id
 and up.type = pk.event_key
 and up.channel = 'email'
order by tu.email, pk.event_key;

-- Count summary for quick review.
with target_users as (
  select u.id as user_id, u.email
  from public.users u
  where lower(u.email) in (
    'mstout@continentalres.net',
    'pcasper@continentalres.net'
  )
),
policy_keys as (
  select np.key as event_key
  from public.notification_policies np
  where np.key not like 'locks.%'
    and np.key not like 'defaults.%'
)
select
  count(distinct tu.user_id) as targeted_users,
  count(distinct pk.event_key) as current_policy_keys,
  count(*) as email_preferences_to_mute
from target_users tu
cross join policy_keys pk;

-- ---------------------------------------------------------------------------
-- APPLY
-- ---------------------------------------------------------------------------
-- Run after reviewing DRY RUN. This is intentionally a direct preference
-- override so recipient logic and in-app notifications remain unchanged.

/*
begin;

with target_users as (
  select u.id as user_id, u.email
  from public.users u
  where lower(u.email) in (
    'mstout@continentalres.net',
    'pcasper@continentalres.net'
  )
),
policy_keys as (
  select np.key as event_key
  from public.notification_policies np
  where np.key not like 'locks.%'
    and np.key not like 'defaults.%'
),
targets as (
  select
    tu.user_id,
    tu.email,
    pk.event_key,
    up.enabled as previous_enabled,
    up.user_id is not null as previous_row_exists
  from target_users tu
  cross join policy_keys pk
  left join public.user_notification_prefs up
    on up.user_id = tu.user_id
   and up.type = pk.event_key
   and up.channel = 'email'
),
upserted as (
  insert into public.user_notification_prefs (
    user_id,
    type,
    channel,
    enabled,
    meta
  )
  select
    t.user_id,
    t.event_key,
    'email',
    false,
    jsonb_build_object(
      'rc1_internal_pilot_email_mute', true,
      'rc1_internal_pilot_email_mute_applied_at', now(),
      'rc1_internal_pilot_email_mute_previous_row_exists', t.previous_row_exists,
      'rc1_internal_pilot_email_mute_previous_enabled', t.previous_enabled
    )
  from targets t
  on conflict (user_id, type, channel)
  do update set
    enabled = false,
    meta = coalesce(public.user_notification_prefs.meta, '{}'::jsonb)
      || jsonb_build_object(
        'rc1_internal_pilot_email_mute', true,
        'rc1_internal_pilot_email_mute_applied_at', now(),
        'rc1_internal_pilot_email_mute_previous_row_exists', true,
        'rc1_internal_pilot_email_mute_previous_enabled', public.user_notification_prefs.enabled
      )
  returning user_id, type as event_key, channel, enabled, meta
)
select
  u.email,
  upserted.user_id,
  upserted.event_key,
  upserted.channel,
  upserted.enabled,
  upserted.meta
from upserted
join public.users u on u.id = upserted.user_id
order by u.email, upserted.event_key;

commit;
*/

-- ---------------------------------------------------------------------------
-- ROLLBACK / RE-ENABLE
-- ---------------------------------------------------------------------------
-- Restores rows touched by APPLY:
--   - rows that existed before the mute get their previous enabled value back
--   - rows created only for this mute are deleted, returning to policy defaults

/*
begin;

with target_users as (
  select u.id as user_id, u.email
  from public.users u
  where lower(u.email) in (
    'mstout@continentalres.net',
    'pcasper@continentalres.net'
  )
),
marked as (
  select
    up.user_id,
    up.type,
    up.channel,
    up.enabled,
    up.meta,
    coalesce(
      (up.meta->>'rc1_internal_pilot_email_mute_previous_row_exists')::boolean,
      true
    ) as previous_row_exists,
    (up.meta->>'rc1_internal_pilot_email_mute_previous_enabled')::boolean as previous_enabled
  from public.user_notification_prefs up
  join target_users tu on tu.user_id = up.user_id
  where up.channel = 'email'
    and up.meta->>'rc1_internal_pilot_email_mute' = 'true'
),
deleted_inserted_only as (
  delete from public.user_notification_prefs up
  using marked m
  where up.user_id = m.user_id
    and up.type = m.type
    and up.channel = m.channel
    and m.previous_row_exists = false
  returning up.user_id, up.type as event_key, up.channel, 'deleted_inserted_only'::text as action
),
restored_existing as (
  update public.user_notification_prefs up
     set enabled = coalesce(m.previous_enabled, true),
         meta = coalesce(up.meta, '{}'::jsonb)
           - 'rc1_internal_pilot_email_mute'
           - 'rc1_internal_pilot_email_mute_applied_at'
           - 'rc1_internal_pilot_email_mute_previous_row_exists'
           - 'rc1_internal_pilot_email_mute_previous_enabled'
    from marked m
   where up.user_id = m.user_id
     and up.type = m.type
     and up.channel = m.channel
     and m.previous_row_exists = true
  returning up.user_id, up.type as event_key, up.channel, 'restored_existing'::text as action, up.enabled
)
select
  u.email,
  r.user_id,
  r.event_key,
  r.channel,
  r.action,
  r.enabled
from restored_existing r
join public.users u on u.id = r.user_id
union all
select
  u.email,
  d.user_id,
  d.event_key,
  d.channel,
  d.action,
  null::boolean as enabled
from deleted_inserted_only d
join public.users u on u.id = d.user_id
order by email, event_key;

commit;
*/

-- ---------------------------------------------------------------------------
-- SIMPLE RE-ENABLE OVERRIDE
-- ---------------------------------------------------------------------------
-- Use this only if the pilot goal is to force email back on for all current
-- policy keys, regardless of prior per-event user preference values.

/*
begin;

insert into public.user_notification_prefs (user_id, type, channel, enabled, meta)
select
  u.id,
  np.key,
  'email',
  true,
  jsonb_build_object('rc1_internal_pilot_email_mute_force_reenabled_at', now())
from public.users u
cross join public.notification_policies np
where lower(u.email) in (
    'mstout@continentalres.net',
    'pcasper@continentalres.net'
  )
  and np.key not like 'locks.%'
  and np.key not like 'defaults.%'
on conflict (user_id, type, channel)
do update set
  enabled = true,
  meta = coalesce(public.user_notification_prefs.meta, '{}'::jsonb)
    || jsonb_build_object('rc1_internal_pilot_email_mute_force_reenabled_at', now());

commit;
*/
