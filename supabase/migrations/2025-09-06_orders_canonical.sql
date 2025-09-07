-- Public frontend view normalized to stable, UI-friendly names.
-- Built ONLY from columns you confirmed exist on public.orders.

create or replace view public.v_orders_frontend as
select
  o.id,

  -- order number & client/appraiser
  o.order_number                         as order_no,
  o.manual_client                        as client_name,
  o.manual_appraiser                     as assigned_appraiser_name,
  coalesce(o.appraiser_id, o.assigned_to) as assigned_appraiser_id,

  -- display fields for list rows
  coalesce(nullif(o.manual_client, ''),'—')                              as display_title,
  coalesce(nullif(o.property_address, ''), nullif(o.address, ''), '—')   as display_subtitle,

  -- raw address (prefer property_address if present)
  coalesce(o.property_address, o.address)  as address,

  -- status
  o.status,

  -- fees (prefer fee_amount, else base_fee)
  coalesce(o.fee_amount, o.base_fee)       as fee_amount,

  -- ordering / dates
  o.date_ordered,
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
  o.updated_at,
  coalesce(o.is_archived, o.archived, false) as is_archived

from public.orders o;

-- Grant read to app roles (adjust to your model)
grant select on public.v_orders_frontend to anon, authenticated;


