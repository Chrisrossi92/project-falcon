-- Restore order_id alias on frontend views so FE can select order_id/id interchangeably.

drop view if exists public.v_orders_active_frontend_v4;
drop view if exists public.v_orders_frontend_v4;

create or replace view public.v_orders_frontend_v4 as
select
  o.id,
  o.id as order_id,
  o.order_number,
  o.order_number as order_no,

  -- participants
  coalesce(c.name, o.manual_client, o.manual_client_name) as client_name,
  o.client_id,
  o.amc_id,
  o.managing_amc_id,
  amc.name as amc_name,
  coalesce(o.appraiser_id, o.assigned_to) as assigned_appraiser_id,
  coalesce(o.manual_appraiser, ua.display_name, ua.full_name, ua.name) as assigned_appraiser_name,
  o.assigned_to,
  o.appraiser_id,
  o.reviewer_id,
  coalesce(o.manual_appraiser, ua.display_name, ua.full_name, ua.name) as appraiser_name,
  coalesce(o.manual_reviewer, ur.display_name, ur.full_name, ur.name) as reviewer_name,
  coalesce(ua.color, ua.display_color) as appraiser_color,
  coalesce(ur.color, ur.display_color) as reviewer_color,

  -- address
  coalesce(o.property_address, o.address) as address_line1,
  coalesce(o.property_address, o.address) as address,
  coalesce(o.order_number, o.title)        as display_title,
  coalesce(o.property_address, o.address)  as display_subtitle,
  o.city,
  o.state,
  coalesce(o.postal_code, o.zip) as postal_code,
  coalesce(o.postal_code, o.zip) as zip,
  o.property_type,
  o.report_type,

  -- fees
  coalesce(o.fee_amount, o.base_fee) as fee_amount,
  coalesce(o.fee_amount, o.base_fee) as fee,
  o.base_fee,
  o.appraiser_fee,
  coalesce(o.split_pct, o.appraiser_split) as split_pct,

  -- dates
  coalesce(
    o.site_visit_at,
    (o.site_visit_date)::timestamptz,
    (o.inspection_date)::timestamptz
  ) as site_visit_at,
  coalesce(
    o.site_visit_at,
    (o.site_visit_date)::timestamptz,
    (o.inspection_date)::timestamptz
  ) as site_visit_date,
  coalesce(
    o.review_due_at,
    (o.due_for_review)::timestamptz,
    (o.review_due_date)::timestamptz
  ) as review_due_at,
  coalesce(
    o.review_due_at,
    (o.due_for_review)::timestamptz,
    (o.review_due_date)::timestamptz
  ) as review_due_date,
  coalesce(
    o.final_due_at,
    o.client_due_at,
    (o.due_to_client)::timestamptz,
    (o.due_date)::timestamptz
  ) as final_due_at,
  coalesce(
    o.final_due_at,
    o.client_due_at,
    (o.due_to_client)::timestamptz,
    (o.due_date)::timestamptz
  ) as final_due_date,
  coalesce(
    o.final_due_at,
    o.client_due_at,
    (o.due_to_client)::timestamptz,
    (o.due_date)::timestamptz
  ) as due_date,

  -- status/bookkeeping
  o.status,
  o.created_at,
  o.updated_at,
  o.date_ordered,
  coalesce(o.is_archived, o.archived, false) as is_archived,
  o.property_contact_name,
  o.property_contact_phone,
  o.entry_contact_name,
  o.entry_contact_phone,
  o.access_notes,
  o.notes,
  a.last_activity_at
from public.orders o
left join public.clients c on c.id = o.client_id
left join public.clients amc on amc.id = o.amc_id
left join public.users ua on ua.id = o.appraiser_id
left join public.users ur on ur.id = o.reviewer_id
left join lateral (
  select max(al.created_at) as last_activity_at
  from public.activity_log al
  where al.order_id = o.id
) a on true;

create or replace view public.v_orders_active_frontend_v4 as
select *
from public.v_orders_frontend_v4
where lower(coalesce(status::text, '')) not in ('completed', 'complete', 'cancelled', 'canceled');

grant select on public.v_orders_frontend_v4 to authenticated;
grant select on public.v_orders_frontend_v4 to anon;
grant select on public.v_orders_active_frontend_v4 to authenticated;
grant select on public.v_orders_active_frontend_v4 to anon;

