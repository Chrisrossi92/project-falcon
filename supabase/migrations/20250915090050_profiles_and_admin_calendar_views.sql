-- Bridging views to align frontend queries with actual schema.

-- Profiles facade (frontend expects "profiles" with auth + display fields)
create or replace view public.profiles as
select
  au.id                              as id,
  au.id                              as uid,
  au.id                              as auth_id,
  au.email                           as email,
  coalesce(up.display_name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email) as display_name,
  coalesce(up.display_name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name')          as full_name,
  coalesce(au.raw_user_meta_data->>'name', up.display_name)                                               as name,
  ur.role                            as role,
  coalesce(up.color, up.display_name) as display_color,
  up.color,
  up.avatar_url,
  up.phone,
  up.created_at,
  up.updated_at,
  'active'::text                     as status,
  null::numeric                      as fee_split,
  null::numeric                      as split,
  null::numeric                      as split_pct,
  coalesce(au.is_anonymous, false)   as is_active
from auth.users au
left join public.user_profiles up on up.user_id = au.id
left join lateral (
  select ur.role
  from public.user_roles ur
  where ur.user_id = au.id
  order by case ur.role when 'owner' then 1 when 'admin' then 2 when 'reviewer' then 3 when 'appraiser' then 4 else 5 end
  limit 1
) ur on true;

grant select on public.profiles to authenticated;

-- Admin calendar view with order/appraiser enrichment expected by UI
create or replace view public.v_admin_calendar as
select
  e.id,
  e.event_type,
  e.title,
  e.start_at,
  e.end_at,
  e.order_id,
  e.appraiser_id,
  e.appraiser_user_id,
  o.order_number     as order_no,
  o.order_number     as order_number,
  coalesce(o.property_address, o.address) as address,
  coalesce(c.name, o.manual_client)       as client_name,
  coalesce(o.city, o.state, o.zip)        as street_address, -- fallback so legacy selects don't 400
  o.city,
  o.state,
  coalesce(o.postal_code, o.zip)          as zip,
  o.status,
  p.display_name    as appraiser_name,
  p.color           as appraiser_color
from public.calendar_events e
left join public.orders o on o.id = e.order_id
left join public.clients c on c.id = o.client_id
left join public.user_profiles p on p.user_id = coalesce(o.appraiser_id, o.assigned_to, e.appraiser_id, e.appraiser_user_id);

grant select on public.v_admin_calendar to authenticated;
grant select on public.v_admin_calendar to anon;

-- Keep enriched view as superset of admin calendar with icon
create or replace view public.v_admin_calendar_enriched as
select
  ac.*,
  case ac.event_type
    when 'site_visit'     then 'map-pin'
    when 'due_for_review' then 'alert-triangle'
    when 'due_to_client'  then 'send'
    else 'calendar'
  end as event_icon
from public.v_admin_calendar ac;

grant select on public.v_admin_calendar_enriched to authenticated;
grant select on public.v_admin_calendar_enriched to anon;
