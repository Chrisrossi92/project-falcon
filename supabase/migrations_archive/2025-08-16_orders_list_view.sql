-- === INDEXES (safe, idempotent) ============================================
create index if not exists orders_status_idx                 on public.orders(status);
create index if not exists orders_created_at_idx             on public.orders(created_at desc);
create index if not exists orders_assigned_to_idx            on public.orders(assigned_to);
create index if not exists orders_appraiser_id_idx           on public.orders(appraiser_id);
create index if not exists orders_client_id_idx              on public.orders(client_id);
create index if not exists orders_due_date_idx               on public.orders(due_date);
create index if not exists orders_review_due_date_idx        on public.orders(review_due_date);
create index if not exists orders_active_created_at_idx      on public.orders(created_at desc)
  where not coalesce(is_archived,false);

-- === ORDERS LIST VIEW (tailored to your columns) ============================
drop view if exists public.v_orders_list;

create or replace view public.v_orders_list as
select
  o.id,
  o.order_number,
  o.title,
  o.status,
  o.paid_status,
  o.created_at,
  o.updated_at,
  o.due_date,
  o.review_due_date,
  o.site_visit_at,
  o.appraiser_id,
  o.assigned_to,
  o.client_id,
  o.branch_id,
  o.address,
  o.city,
  o.county,
  o.state,
  o.zip,
  trim(
    concat_ws(
      ', ',
      nullif(o.address,''),
      nullif(o.city,''),
      concat_ws(' ', nullif(o.state,''), nullif(o.zip,''))
    )
  ) as display_address,
  (o.due_date is not null and o.due_date < current_date)               as is_overdue,
  (o.review_due_date is not null and o.review_due_date < current_date) as is_review_overdue,
  (o.site_visit_at is not null or o.site_visit_date is not null)       as has_site_visit,
  coalesce(o.is_archived,false)                                        as is_archived,
  case when o.due_date is null then null else (o.due_date - current_date) end             as due_in_days,
  case when o.review_due_date is null then null else (o.review_due_date - current_date) end as review_due_in_days,
  case
    when o.due_date        is not null and o.due_date        <  current_date then 'overdue'
    when o.review_due_date is not null and o.review_due_date <  current_date then 'review_overdue'
    when o.due_date        is not null and o.due_date        <= current_date + 2 then 'due_soon'
    when o.review_due_date is not null and o.review_due_date <= current_date + 2 then 'review_soon'
    else 'normal'
  end as priority
from public.orders o;
