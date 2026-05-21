begin;

create or replace function public.default_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
    from public.companies
   where slug = 'falcon_default'
   limit 1;
$$;

grant execute on function public.default_company_id() to authenticated;

create or replace function public.tg_orders_preserve_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    NEW.company_id := coalesce(NEW.company_id, public.default_company_id());
  elsif TG_OP = 'UPDATE' then
    NEW.company_id := coalesce(OLD.company_id, public.default_company_id());
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_orders_preserve_company_id on public.orders;
create trigger trg_orders_preserve_company_id
before insert or update on public.orders
for each row execute function public.tg_orders_preserve_company_id();

update public.orders
   set company_id = public.default_company_id()
 where company_id is null;

drop view if exists public.v_orders_active_frontend_v4;
drop view if exists public.v_orders_frontend_v4;

create or replace view public.v_orders_frontend_v4 as
select
  o.id,
  o.id as order_id,
  o.company_id,
  o.order_number,
  o.order_number as order_no,

  -- participants
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

  -- address
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
left join public.clients mamc on mamc.id = o.managing_amc_id
left join public.amcs amc on amc.id = o.amc_id
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

drop view if exists public.v_orders_list_with_last_activity;
drop view if exists public.v_orders_list;

create or replace view public.v_orders_list as
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
from public.orders o;

create or replace view public.v_orders_list_with_last_activity as
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

grant select on public.v_orders_frontend_v4 to authenticated;
grant select on public.v_orders_frontend_v4 to anon;
grant select on public.v_orders_active_frontend_v4 to authenticated;
grant select on public.v_orders_active_frontend_v4 to anon;
grant select on public.v_orders_list to authenticated;
grant select on public.v_orders_list to anon;
grant select on public.v_orders_list_with_last_activity to authenticated;
grant select on public.v_orders_list_with_last_activity to anon;

do $$
begin
  if current_setting('server_version_num')::int >= 150000 then
    execute 'alter view public.v_orders_frontend_v4 set (security_invoker = true)';
    execute 'alter view public.v_orders_active_frontend_v4 set (security_invoker = true)';
    execute 'alter view public.v_orders_list set (security_invoker = true)';
    execute 'alter view public.v_orders_list_with_last_activity set (security_invoker = true)';
  end if;
end;
$$;

create or replace function public.tg_orders_audit_ins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
  values (
    NEW.id,
    NEW.company_id,
    'order_created',
    jsonb_build_object(
      'status', NEW.status,
      'date_ordered', NEW.date_ordered,
      'client_id', NEW.client_id
    ),
    public.current_app_user_id()
  );
  return NEW;
end;
$$;

create or replace function public.tg_orders_audit_upd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_app_user_id();
begin
  if NEW.status is distinct from OLD.status then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (NEW.id, NEW.company_id, 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status), v_actor);
  end if;

  if NEW.site_visit_at is distinct from OLD.site_visit_at
     or NEW.review_due_at is distinct from OLD.review_due_at
     or NEW.final_due_at is distinct from OLD.final_due_at then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'dates_updated',
      jsonb_build_object(
        'site_visit_at', NEW.site_visit_at,
        'review_due_at', NEW.review_due_at,
        'final_due_at', NEW.final_due_at
      ),
      v_actor
    );
  end if;

  if NEW.appraiser_id is distinct from OLD.appraiser_id then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'assignee_changed',
      jsonb_build_object('field', 'appraiser_id', 'from', OLD.appraiser_id, 'to', NEW.appraiser_id),
      v_actor
    );
  end if;

  if NEW.reviewer_id is distinct from OLD.reviewer_id then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'assignee_changed',
      jsonb_build_object('field', 'reviewer_id', 'from', OLD.reviewer_id, 'to', NEW.reviewer_id),
      v_actor
    );
  end if;

  if NEW.base_fee is distinct from OLD.base_fee or NEW.fee_amount is distinct from OLD.fee_amount then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'fee_changed',
      jsonb_build_object('base_fee', NEW.base_fee, 'fee_amount', NEW.fee_amount),
      v_actor
    );
  end if;

  return NEW;
end;
$$;

create or replace function public.tg_orders_insert_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
  v_title text;
  v_body text;
begin
  if TG_OP = 'INSERT' then
    if NEW.appraiser_id is null then
      return NEW;
    end if;

    v_event_type := 'order.new_assigned';
    v_title := 'New order assigned';
    v_body := 'You''ve been assigned order #' || coalesce(NEW.order_number, NEW.id::text);
  elsif TG_OP = 'UPDATE' then
    if NEW.appraiser_id is null or NEW.appraiser_id is not distinct from OLD.appraiser_id then
      return NEW;
    end if;

    if OLD.appraiser_id is null then
      v_event_type := 'order.new_assigned';
      v_title := 'New order assigned';
      v_body := 'You''ve been assigned order #' || coalesce(NEW.order_number, NEW.id::text);
    else
      v_event_type := 'order.reassigned';
      v_title := 'Order reassigned';
      v_body := 'You''ve been reassigned order #' || coalesce(NEW.order_number, NEW.id::text);
    end if;
  else
    return NEW;
  end if;

  insert into public.notifications (
    user_id,
    company_id,
    type,
    title,
    body,
    order_id,
    link_path,
    payload
  ) values (
    NEW.appraiser_id,
    NEW.company_id,
    v_event_type,
    v_title,
    v_body,
    NEW.id,
    '/orders/' || NEW.id::text,
    jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'email_template_key',
        case
          when v_event_type = 'order.new_assigned' then 'APPRAISER_ASSIGNED'
          else null
        end
    )
  );

  return NEW;
end;
$$;

comment on function public.default_company_id() is
  'Returns the current default company for single-company compatibility. Not a tenant switching mechanism.';

comment on function public.tg_orders_preserve_company_id() is
  'Keeps order company scope backend-owned. Inserts default to falcon_default; updates preserve existing company ownership.';

commit;
