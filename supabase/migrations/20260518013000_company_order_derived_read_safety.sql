begin;

create or replace view public.v_admin_calendar
with (security_invoker = true) as
select
  e.id,
  coalesce(e.company_id, o.company_id, public.default_company_id()) as company_id,
  e.event_type,
  e.title,
  e.start_at,
  e.end_at,
  e.order_id,
  e.appraiser_id,
  e.appraiser_user_id,
  o.order_number as order_no,
  o.order_number,
  coalesce(o.property_address, o.address) as address,
  coalesce(c.name, o.manual_client) as client_name,
  coalesce(o.city, o.state, o.zip) as street_address,
  o.city,
  o.state,
  coalesce(o.postal_code, o.zip) as zip,
  o.status,
  p.display_name as appraiser_name,
  p.color as appraiser_color
from public.calendar_events e
left join public.orders o on o.id = e.order_id
left join public.clients c on c.id = o.client_id
left join public.user_profiles p
  on p.user_id = coalesce(o.appraiser_id, o.assigned_to, e.appraiser_id, e.appraiser_user_id)
where e.order_id is null
   or public.current_app_user_can_read_order(e.order_id);

create or replace view public.v_admin_calendar_enriched
with (security_invoker = true) as
select
  id,
  company_id,
  event_type,
  title,
  start_at,
  end_at,
  order_id,
  appraiser_id,
  appraiser_user_id,
  order_no,
  order_number,
  address,
  client_name,
  street_address,
  city,
  state,
  zip,
  status,
  appraiser_name,
  appraiser_color,
  case event_type
    when 'site_visit' then 'map-pin'
    when 'due_for_review' then 'alert-triangle'
    when 'due_to_client' then 'send'
    else 'calendar'
  end as event_icon
from public.v_admin_calendar ac
where ac.order_id is null
   or public.current_app_user_can_read_order(ac.order_id);

grant select on public.v_admin_calendar to anon, authenticated;
grant select on public.v_admin_calendar_enriched to anon, authenticated;

drop function if exists public.get_calendar_events(timestamptz, timestamptz);

create function public.get_calendar_events(
  p_from timestamptz,
  p_to timestamptz
)
returns table(
  order_id uuid,
  kind text,
  at timestamptz,
  assigned_user_id_any uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.order_id,
    case
      when e.event_type = 'site_visit' then 'site_visit'
      else 'due'
    end as kind,
    e.start_at as at,
    e.appraiser_id as assigned_user_id_any
  from public.v_admin_calendar_enriched e
  where (p_from is null or e.start_at >= p_from)
    and (p_to is null or e.start_at < p_to)
    and (
      e.order_id is null
      or public.current_app_user_can_read_order(e.order_id)
    )
  order by e.start_at asc;
$$;

create or replace function public.get_calendar_events()
returns table(
  order_id uuid,
  client_id uuid,
  assigned_appraiser_id uuid,
  kind text,
  starts_at timestamptz,
  ends_at timestamptz,
  title text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.order_id,
    null::uuid as client_id,
    e.appraiser_id as assigned_appraiser_id,
    e.event_type as kind,
    e.start_at as starts_at,
    e.end_at as ends_at,
    e.title
  from public.v_admin_calendar_enriched e
  where e.order_id is null
     or public.current_app_user_can_read_order(e.order_id)
  order by e.start_at asc;
$$;

create or replace function public.get_admin_calendar_events(
  p_from timestamptz default (now() - interval '90 days'),
  p_to timestamptz default (now() + interval '180 days')
)
returns table(
  id uuid,
  event_type text,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  order_id uuid,
  appraiser_id uuid,
  appraiser_name text,
  appraiser_color text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.event_type,
    e.title,
    e.start_at,
    e.end_at,
    e.order_id,
    e.appraiser_id,
    e.appraiser_name,
    e.appraiser_color
  from public.v_admin_calendar_enriched e
  where e.start_at >= p_from
    and e.start_at < p_to
    and (
      e.order_id is null
      or public.current_app_user_can_read_order(e.order_id)
    )
  order by e.start_at asc;
$$;

grant execute on function public.get_calendar_events(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.get_calendar_events() to anon, authenticated;
grant execute on function public.get_admin_calendar_events(timestamptz, timestamptz) to anon, authenticated;

create or replace view public.v_order_activity_feed
as
select
  a.id,
  a.order_id,
  coalesce(a.event_type, a.action) as event_type,
  coalesce(
    a.message,
    case
      when coalesce(a.event_type, a.action) = 'status_changed'
        and coalesce(a.detail->>'from_status', a.prev_status, a.detail->>'from') is not null
        and coalesce(a.detail->>'to_status', a.new_status, a.detail->>'to') is not null
        then format(
          'Status changed: %s -> %s',
          coalesce(a.detail->>'from_status', a.prev_status, a.detail->>'from'),
          coalesce(a.detail->>'to_status', a.new_status, a.detail->>'to')
        )
      else null::text
    end,
    a.detail->>'text'
  ) as message,
  a.detail,
  a.created_at,
  a.created_by,
  coalesce(a.created_by_name, p.full_name) as created_by_name,
  coalesce(a.created_by_email, p.email) as created_by_email
from public.activity_log a
left join public.profiles_legacy p on p.id = coalesce(a.created_by, a.actor_id)
where a.order_id is null
   or public.current_app_user_can_read_order(a.order_id);

create or replace view public.v_order_activity_compat
as
select
  al.id,
  al.order_id,
  al.actor_id as user_id,
  al.event_type as event,
  null::text as details,
  al.event_type as action,
  al.message as note,
  al.created_at,
  al.actor_id as created_by
from public.activity_log al
where al.order_id is null
   or public.current_app_user_can_read_order(al.order_id);

grant select on public.v_order_activity_feed to anon, authenticated;
grant select on public.v_order_activity_compat to anon, authenticated;

create or replace function public.get_order_activity_flexible(p_order_id uuid)
returns table(
  id text,
  order_id uuid,
  user_id text,
  event text,
  details jsonb,
  created_at timestamptz,
  user_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id::text,
    a.order_id,
    coalesce(a.actor_user_id, a.user_id, a.actor_id, a.created_by)::text as user_id,
    coalesce(a.event_type, a.action, 'event')::text as event,
    coalesce(a.detail, a.context, '{}'::jsonb) as details,
    a.created_at,
    coalesce(a.actor_name, a.created_by_name, u.display_name, u.full_name, u.name, u.email, '')::text as user_name
  from public.activity_log a
  left join public.users u on u.id = coalesce(a.actor_user_id, a.user_id)
  where a.order_id = p_order_id
    and public.current_app_user_can_read_order(p_order_id)
  order by a.created_at desc nulls last;
$$;

create or replace function public.get_order_activity_flexible_v3(p_order_id uuid)
returns table(
  id text,
  order_id uuid,
  user_id text,
  event text,
  details jsonb,
  created_at timestamptz,
  user_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.get_order_activity_flexible(p_order_id);
$$;

grant execute on function public.get_order_activity_flexible(uuid) to anon, authenticated;
grant execute on function public.get_order_activity_flexible_v3(uuid) to anon, authenticated;

create or replace function public.rpc_get_notifications(
  p_limit integer default 50,
  p_before timestamptz default null
)
returns setof public.notifications
language sql
security definer
set search_path = public
as $$
  select n.*
  from public.notifications n
  where n.user_id = public.current_app_user_id()
    and (p_before is null or n.created_at < p_before)
    and (
      n.order_id is null
      or public.current_app_user_can_read_order(n.order_id)
    )
  order by n.created_at desc
  limit coalesce(p_limit, 50);
$$;

create or replace function public.rpc_get_unread_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.notifications n
  where n.user_id = public.current_app_user_id()
    and n.read_at is null
    and (
      n.order_id is null
      or public.current_app_user_can_read_order(n.order_id)
    );
$$;

create or replace function public.rpc_notifications_list(
  category text default null,
  is_read boolean default null,
  page_limit integer default 50,
  before timestamptz default null,
  after timestamptz default null
)
returns setof public.notifications
language sql
security definer
set search_path = public
as $$
  select n.*
  from public.notifications n
  where n.user_id = public.current_app_user_id()
    and ($1 is null or n.category = $1)
    and ($2 is null or n.is_read = $2)
    and ($4 is null or n.created_at < $4)
    and ($5 is null or n.created_at > $5)
    and (
      n.order_id is null
      or public.current_app_user_can_read_order(n.order_id)
    )
  order by n.created_at desc
  limit coalesce($3, 50);
$$;

create or replace function public.rpc_notifications_unread_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.notifications n
  where n.user_id = public.current_app_user_id()
    and coalesce(n.is_read, false) = false
    and (
      n.order_id is null
      or public.current_app_user_can_read_order(n.order_id)
    );
$$;

grant execute on function public.rpc_get_notifications(integer, timestamptz) to authenticated;
grant execute on function public.rpc_get_unread_count() to authenticated;
grant execute on function public.rpc_notifications_list(text, boolean, integer, timestamptz, timestamptz) to authenticated;
grant execute on function public.rpc_notifications_unread_count() to authenticated;

comment on view public.v_admin_calendar is
  'Slice 7C: calendar read projection preserves company context and filters order-tied rows through current_app_user_can_read_order.';

comment on view public.v_admin_calendar_enriched is
  'Slice 7C: enriched calendar projection inherits order read safety from v_admin_calendar and keeps explicit order predicate.';

comment on view public.v_order_activity_feed is
  'Slice 7C: activity compatibility feed hides order-tied rows unless the underlying order is readable.';

comment on function public.rpc_get_notifications(integer, timestamptz) is
  'Slice 7C: user notifications remain personal, and order-tied notifications require readable underlying orders.';

commit;
