begin;

create or replace function public.current_app_user_can_read_order_row(
  p_company_id uuid,
  p_appraiser_id uuid,
  p_assigned_to uuid,
  p_reviewer_id uuid,
  p_status text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
    and (
      public.current_is_admin()
      or coalesce(p_appraiser_id, p_assigned_to) = public.current_app_user_id()
      or (
        p_reviewer_id = public.current_app_user_id()
        and lower(coalesce(p_status, '')) = any (
          array['in_review', 'needs_revisions', 'review_cleared', 'completed']
        )
      )
    );
$$;

grant execute on function public.current_app_user_can_read_order_row(uuid, uuid, uuid, uuid, text) to authenticated;

create or replace function public.current_app_user_can_read_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and public.current_app_user_can_read_order_row(
        o.company_id,
        o.appraiser_id,
        o.assigned_to,
        o.reviewer_id,
        o.status
      )
  );
$$;

grant execute on function public.current_app_user_can_read_order(uuid) to authenticated;

create or replace function public.can_read_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_user_can_read_order(p_order_id);
$$;

grant execute on function public.can_read_order(uuid) to authenticated;

drop policy if exists "orders_appraiser_read_own" on public.orders;
drop policy if exists "orders_select_lifecycle_visibility" on public.orders;
drop policy if exists "orders_owner_admin_full_access" on public.orders;

create policy "orders_select_company_lifecycle_visibility"
on public.orders
for select
to authenticated
using (
  public.current_app_user_can_read_order_row(
    company_id,
    appraiser_id,
    assigned_to,
    reviewer_id,
    status
  )
);

create or replace view public.v_orders_frontend_v4
with (security_invoker = true) as
select
  o.id,
  o.id as order_id,
  o.company_id,
  o.order_number,
  o.order_number as order_no,

  coalesce(c.name, o.manual_client, o.manual_client_name) as client_name,
  o.client_id,
  o.amc_id,
  o.managing_amc_id,
  coalesce(mamc.name, amc.name) as amc_name,
  coalesce(o.appraiser_id, o.assigned_to) as assigned_appraiser_id,
  coalesce(o.manual_appraiser, ua.display_name, ua.full_name, ua.name) as assigned_appraiser_name,
  o.assigned_to,
  o.appraiser_id,
  o.reviewer_id,
  coalesce(o.manual_appraiser, ua.display_name, ua.full_name, ua.name) as appraiser_name,
  coalesce(ur.display_name, ur.full_name, ur.name) as reviewer_name,
  coalesce(ua.color, ua.display_color) as appraiser_color,
  coalesce(ur.color, ur.display_color) as reviewer_color,

  coalesce(o.property_address, o.address) as address_line1,
  coalesce(o.property_address, o.address) as address,
  coalesce(o.order_number, o.title) as display_title,
  coalesce(o.property_address, o.address) as display_subtitle,
  o.city,
  o.state,
  coalesce(o.postal_code, o.zip) as postal_code,
  coalesce(o.postal_code, o.zip) as zip,
  o.property_type,
  o.report_type,

  coalesce(o.fee_amount, o.base_fee) as fee_amount,
  coalesce(o.fee_amount, o.base_fee) as fee,
  o.base_fee,
  o.appraiser_fee,
  coalesce(o.split_pct, o.appraiser_split) as split_pct,

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
left join public.clients mamc on mamc.id = o.managing_amc_id
left join public.amcs amc on amc.id = o.amc_id
left join public.users ua on ua.id = o.appraiser_id
left join public.users ur on ur.id = o.reviewer_id
left join lateral (
  select max(al.created_at) as last_activity_at
    from public.activity_log al
   where al.order_id = o.id
) a on true
where public.current_app_user_can_read_order_row(
  o.company_id,
  o.appraiser_id,
  o.assigned_to,
  o.reviewer_id,
  o.status
);

create or replace view public.v_orders_active_frontend_v4
with (security_invoker = true) as
select *
from public.v_orders_frontend_v4
where lower(coalesce(status::text, '')) not in ('completed', 'complete', 'cancelled', 'canceled');

create or replace view public.v_orders_list
with (security_invoker = true) as
select
  o.id as order_id,
  o.company_id,
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
  (o.due_date is not null and o.due_date < current_date) as is_overdue,
  (o.review_due_date is not null and o.review_due_date < current_date) as is_review_overdue,
  (o.site_visit_at is not null or o.site_visit_date is not null) as has_site_visit,
  coalesce(o.is_archived,false) as is_archived,
  case when o.due_date is null then null else (o.due_date - current_date) end as due_in_days,
  case when o.review_due_date is null then null else (o.review_due_date - current_date) end as review_due_in_days,
  case
    when o.due_date is not null and o.due_date < current_date then 'overdue'
    when o.review_due_date is not null and o.review_due_date < current_date then 'review_overdue'
    when o.due_date is not null and o.due_date <= current_date + 2 then 'due_soon'
    when o.review_due_date is not null and o.review_due_date <= current_date + 2 then 'review_soon'
    else 'normal'
  end as priority
from public.orders o
where public.current_app_user_can_read_order_row(
  o.company_id,
  o.appraiser_id,
  o.assigned_to,
  o.reviewer_id,
  o.status
);

create or replace view public.v_orders_list_with_last_activity
with (security_invoker = true) as
select
  l.*,
  a.action as last_action,
  a.message as last_message,
  a.created_at as last_activity_at
from public.v_orders_list l
left join lateral (
  select action, message, created_at
    from public.activity_log
   where order_id = l.order_id
   order by created_at desc
   limit 1
) a on true;

grant select on public.v_orders_frontend_v4 to anon, authenticated;
grant select on public.v_orders_active_frontend_v4 to anon, authenticated;
grant select on public.v_orders_list to anon, authenticated;
grant select on public.v_orders_list_with_last_activity to anon, authenticated;

create or replace function public.rpc_get_activity_feed(p_order_id uuid)
returns table(
  id uuid,
  created_at timestamptz,
  event_type text,
  title text,
  body text,
  actor_name text,
  actor_role text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    al.id,
    al.created_at,
    coalesce(al.event_type, al.action, 'event')::text as event_type,
    case
      when coalesce(al.event_type, '') = 'note' then 'Note added'
      when coalesce(al.action, '') = 'status_changed' then 'Status changed'
      when coalesce(al.action, '') = 'order_created' then 'Order created'
      else coalesce(al.action, al.event_type, 'Update')
    end::text as title,
    case
      when al.event_type = 'note' then
        coalesce(
          al.message,
          al.detail->>'note',
          al.detail->>'message',
          al.detail::text,
          ''
        )
      else
        coalesce(al.message, al.detail::text, al.context::text, '')
    end::text as body,
    coalesce(al.actor_name, al.created_by_name, al.created_by_email, '')::text as actor_name,
    coalesce(al.role, '')::text as actor_role
  from public.activity_log al
  where al.order_id = p_order_id
    and public.current_app_user_can_read_order(p_order_id)
  order by al.created_at desc
  limit 200;
$$;

grant execute on function public.rpc_get_activity_feed(uuid) to authenticated;

create or replace function public.rpc_list_orders(
  p_appraiser_id uuid default null,
  p_status text default null,
  p_q text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns setof public.orders
language sql
stable
set search_path = public
as $$
  select *
  from public.orders o
  where public.current_app_user_can_read_order_row(
      o.company_id,
      o.appraiser_id,
      o.assigned_to,
      o.reviewer_id,
      o.status
    )
    and (p_appraiser_id is null or o.appraiser_id = p_appraiser_id)
    and (p_status is null or o.status = p_status)
    and (
      p_q is null
      or o.address ilike ('%' || p_q || '%')
      or o.order_number ilike ('%' || p_q || '%')
      or coalesce(o.title,'') ilike ('%' || p_q || '%')
    )
  order by o.created_at desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.rpc_list_orders(uuid, text, text, integer, integer) to authenticated;

comment on function public.current_app_user_can_read_order_row(uuid, uuid, uuid, uuid, text) is
  'Slice 7B order read predicate. Requires current-company membership, order company match, and existing lifecycle/responsibility visibility.';

comment on function public.current_app_user_can_read_order(uuid) is
  'Slice 7B order read predicate by id for RPCs and derived read surfaces.';

comment on function public.can_read_order(uuid) is
  'Compatibility wrapper delegated to current_app_user_can_read_order(uuid).';

comment on policy "orders_select_company_lifecycle_visibility" on public.orders is
  'Slice 7B order read isolation: current company plus existing lifecycle/responsibility visibility. Writes remain unchanged.';

commit;
