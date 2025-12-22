-- Public frontend view normalized to stable, UI-friendly names.
-- Built ONLY from columns you confirmed exist on public.orders.

create or replace view public.v_orders_frontend as
select
  o.id,

  -- order number & client/appraiser/reviewer
  o.order_number                          as order_number,
  coalesce(c.name, o.manual_client)       as client_name,
  o.client_id,
  coalesce(o.appraiser_id, o.assigned_to) as assigned_to,
  o.appraiser_id,
  o.reviewer_id,
  coalesce(o.manual_appraiser, ua.display_name, ua.full_name, ua.name) as appraiser_name,
  coalesce(o.manual_reviewer, ur.display_name, ur.full_name, ur.name)  as reviewer_name,

  -- colors from users
  coalesce(ua.color, ua.display_color) as appraiser_color,
  coalesce(ur.color, ur.display_color) as reviewer_color,

  -- raw address (prefer property_address if present)
  coalesce(o.property_address, o.address)  as address,
  o.city,
  o.state,
  o.zip,
  o.property_type,
  o.report_type,

  -- status
  o.status,

  -- fees (prefer fee_amount, else base_fee)
  coalesce(o.fee_amount, o.base_fee)       as fee_amount,
  o.base_fee,
  o.appraiser_fee,

  -- ordering / dates
  -- site visit: prefer timestamp, else cast known dates
  coalesce(
    o.site_visit_at,
    (o.inspection_date)::timestamptz,
    (o.site_visit_date)::timestamptz
  )                                        as site_visit_at,

  -- review due: prefer tz, else cast legacy date columns
  coalesce(
    o.review_due_at,
    (o.due_for_review)::timestamptz,
    (o.review_due_date)::timestamptz
  )                                        as review_due_at,

  -- final due (client): prefer tz, else cast legacy
  coalesce(
    o.final_due_at,
    o.client_due_at,
    (o.due_to_client)::timestamptz,
    (o.due_date)::timestamptz
  )                                        as final_due_at,

  -- legacy alias some UI paths still read
  coalesce(
    o.final_due_at,
    o.client_due_at,
    (o.due_to_client)::timestamptz,
    (o.due_date)::timestamptz
  )                                        as due_date,

  -- bookkeeping
  o.created_at,
  coalesce(o.is_archived, o.archived, false) as is_archived

from public.orders o
left join public.clients c on c.id = o.client_id
left join public.users ua on ua.id = o.appraiser_id
left join public.users ur on ur.id = o.reviewer_id;

-- Grant read to app roles (adjust to your model)
grant select on public.v_orders_frontend to anon, authenticated;
