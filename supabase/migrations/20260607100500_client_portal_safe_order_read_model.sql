begin;

insert into public.permissions (key, category, label, description)
values
  (
    'client_portal.dashboard.view',
    'client_portal',
    'View Client Portal dashboard',
    'Allows authenticated client portal users to view a limited client-facing dashboard for their mapped client account.'
  ),
  (
    'client_portal.orders.read',
    'client_portal',
    'Read Client Portal orders',
    'Allows authenticated client portal users to read limited client-facing order status for their mapped client account.'
  ),
  (
    'client_portal.orders.create',
    'client_portal',
    'Create Client Portal orders',
    'Reserved permission for future guarded client portal appraisal request intake.'
  ),
  (
    'client_portal.reports.read',
    'client_portal',
    'Read Client Portal reports',
    'Reserved permission for future guarded client portal report metadata and signed download access.'
  )
on conflict (key) do update
   set category = excluded.category,
       label = excluded.label,
       description = excluded.description;

create table if not exists public.client_portal_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id bigint not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_portal_members_status_check check (
    status = any (array['active', 'inactive', 'revoked'])
  )
);

create unique index if not exists client_portal_members_company_client_user_unique
  on public.client_portal_members (company_id, client_id, user_id);

create index if not exists idx_client_portal_members_company_user_status
  on public.client_portal_members (company_id, user_id, status);

create index if not exists idx_client_portal_members_company_client_status
  on public.client_portal_members (company_id, client_id, status);

alter table public.client_portal_members enable row level security;

revoke all on table public.client_portal_members from public, anon, authenticated;
grant all on table public.client_portal_members to service_role;

create or replace function public.tg_client_portal_members_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_client_portal_members_touch_updated_at on public.client_portal_members;
create trigger trg_client_portal_members_touch_updated_at
before update on public.client_portal_members
for each row execute function public.tg_client_portal_members_touch_updated_at();

create or replace function public.current_app_user_client_portal_client_ids()
returns table (
  client_id bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct cpm.client_id
    from public.client_portal_members cpm
    join public.clients c
      on c.id = cpm.client_id
     and coalesce(c.company_id, public.default_company_id()) = cpm.company_id
   where cpm.company_id = public.current_company_id()
     and cpm.user_id = public.current_app_user_id()
     and cpm.status = 'active'
     and coalesce(c.status, 'active') <> 'archived';
$$;

grant execute on function public.current_app_user_client_portal_client_ids() to authenticated, service_role;

create or replace function public.current_app_user_can_read_client_portal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and public.current_app_user_id() is not null
    and (
      public.current_app_user_has_permission('client_portal.dashboard.view')
      or public.current_app_user_has_permission('client_portal.orders.read')
    )
    and exists (
      select 1
        from public.current_app_user_client_portal_client_ids()
    );
$$;

grant execute on function public.current_app_user_can_read_client_portal() to authenticated, service_role;

create or replace function public.client_portal_order_key(
  p_order_id uuid,
  p_company_id uuid,
  p_client_id bigint
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select encode(
    extensions.digest(
      concat_ws(
        ':',
        'client_portal_order_v1',
        coalesce(p_order_id::text, ''),
        coalesce(p_company_id::text, ''),
        coalesce(p_client_id::text, '')
      ),
      'sha256'
    ),
    'hex'
  );
$$;

grant execute on function public.client_portal_order_key(uuid, uuid, bigint) to authenticated, service_role;

create or replace view public.v_client_portal_order_status
with (security_invoker = false) as
select
  o.id as order_id,
  coalesce(o.company_id, public.default_company_id()) as company_id,
  o.client_id,
  public.client_portal_order_key(
    o.id,
    coalesce(o.company_id, public.default_company_id()),
    o.client_id
  ) as order_key,
  coalesce(nullif(o.order_number, ''), nullif(o.external_order_no, ''), 'Order') as order_number,
  coalesce(nullif(o.report_type, ''), nullif(o.property_type, ''), 'Appraisal') as order_type,
  coalesce(nullif(o.report_type, ''), 'Appraisal report') as report_type,
  coalesce(nullif(o.property_type, ''), 'Property') as property_type,
  coalesce(nullif(o.property_address, ''), nullif(o.address, ''), 'Property address pending') as property_address,
  o.city,
  o.state,
  o.postal_code,
  o.zip,
  o.status,
  case lower(coalesce(o.status, ''))
    when 'new' then 'Order received'
    when 'in_progress' then 'In progress'
    when 'in_review' then 'In review'
    when 'needs_revisions' then 'In review'
    when 'review_cleared' then 'In review'
    when 'pending_final_approval' then 'In final review'
    when 'ready_for_client' then 'Report ready'
    when 'completed' then 'Completed'
    else 'In progress'
  end as status_label,
  coalesce(o.created_at, o.date_ordered::timestamptz) as ordered_at,
  coalesce(o.site_visit_at::timestamptz, o.inspection_date::timestamptz, o.site_visit_date::timestamptz) as inspection_at,
  coalesce(o.client_due_at, o.final_due_at, o.due_to_client::timestamptz, o.due_date::timestamptz) as due_at,
  case when lower(coalesce(o.status, '')) = 'completed' then o.updated_at else null end as completed_at,
  report.report_available,
  report.report_ready_at,
  report.report_delivered_at,
  report.report_file_name
from public.orders o
left join lateral (
  select
    count(*) > 0 as report_available,
    max(od.created_at) as report_ready_at,
    max(od.updated_at) as report_delivered_at,
    (array_agg(od.file_name order by od.created_at desc, od.id desc))[1] as report_file_name
  from public.order_documents od
  where od.order_id = o.id
    and od.company_id = coalesce(o.company_id, public.default_company_id())
    and od.category = 'final_report'
    and od.visibility_scope = 'client'
    and od.status = 'active'
) report on true
where coalesce(o.is_archived, false) = false
  and coalesce(o.archived, false) = false
  and o.client_id is not null;

revoke all on public.v_client_portal_order_status from public, anon, authenticated;
grant select on public.v_client_portal_order_status to service_role;

create or replace function public.rpc_client_portal_orders()
returns table (
  order_key text,
  order_number text,
  order_type text,
  status text,
  status_label text,
  property_address text,
  city text,
  state text,
  ordered_at timestamptz,
  inspection_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  report_available boolean,
  report_ready_at timestamptz,
  report_delivered_at timestamptz,
  report_file_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.current_app_user_can_read_client_portal() then
    raise exception 'client_portal_access_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('client_portal.orders.read') then
    raise exception 'client_portal_orders_read_required'
      using errcode = '42501';
  end if;

  return query
  select
    v.order_key,
    v.order_number,
    v.order_type,
    v.status,
    v.status_label,
    v.property_address,
    v.city,
    v.state,
    v.ordered_at,
    v.inspection_at,
    v.due_at,
    v.completed_at,
    coalesce(v.report_available, false) as report_available,
    v.report_ready_at,
    v.report_delivered_at,
    v.report_file_name
  from public.v_client_portal_order_status v
  where v.company_id = public.current_company_id()
    and v.client_id in (
      select readable.client_id
      from public.current_app_user_client_portal_client_ids() readable
    )
  order by
    coalesce(v.due_at, v.ordered_at) desc nulls last,
    v.order_number asc,
    v.order_key asc;
end;
$$;

create or replace function public.rpc_client_portal_order_detail(p_order_key text)
returns table (
  order_key text,
  order_number text,
  order_type text,
  report_type text,
  property_type text,
  status text,
  status_label text,
  property_address text,
  city text,
  state text,
  postal_code text,
  ordered_at timestamptz,
  inspection_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  report_available boolean,
  report_ready_at timestamptz,
  report_delivered_at timestamptz,
  report_file_name text,
  milestones jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_order_key text := btrim(coalesce(p_order_key, ''));
begin
  if v_order_key = '' then
    raise exception 'client_portal_order_key_required'
      using errcode = '22023';
  end if;

  if not public.current_app_user_can_read_client_portal() then
    raise exception 'client_portal_access_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('client_portal.orders.read') then
    raise exception 'client_portal_orders_read_required'
      using errcode = '42501';
  end if;

  return query
  select
    v.order_key,
    v.order_number,
    v.order_type,
    v.report_type,
    v.property_type,
    v.status,
    v.status_label,
    v.property_address,
    v.city,
    v.state,
    coalesce(v.postal_code, v.zip) as postal_code,
    v.ordered_at,
    v.inspection_at,
    v.due_at,
    v.completed_at,
    coalesce(v.report_available, false) as report_available,
    v.report_ready_at,
    v.report_delivered_at,
    v.report_file_name,
    jsonb_strip_nulls(
      jsonb_build_array(
        case when v.ordered_at is not null then
          jsonb_build_object('label', 'Order received', 'date', v.ordered_at, 'state', 'complete')
        end,
        case when v.inspection_at is not null then
          jsonb_build_object('label', 'Inspection', 'date', v.inspection_at, 'state', 'scheduled')
        end,
        case when v.due_at is not null then
          jsonb_build_object('label', 'Expected delivery', 'date', v.due_at, 'state', 'pending')
        end,
        case when v.report_ready_at is not null then
          jsonb_build_object('label', 'Report ready', 'date', v.report_ready_at, 'state', 'complete')
        end,
        case when v.completed_at is not null then
          jsonb_build_object('label', 'Completed', 'date', v.completed_at, 'state', 'complete')
        end
      )
    ) as milestones
  from public.v_client_portal_order_status v
  where v.company_id = public.current_company_id()
    and v.order_key = v_order_key
    and v.client_id in (
      select readable.client_id
      from public.current_app_user_client_portal_client_ids() readable
    )
  limit 1;
end;
$$;

create or replace function public.rpc_client_portal_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.current_app_user_can_read_client_portal() then
    raise exception 'client_portal_access_required'
      using errcode = '42501';
  end if;

  with portal_orders as (
    select *
    from public.rpc_client_portal_orders()
  )
  select jsonb_build_object(
    'active_order_count', count(*) filter (
      where lower(coalesce(status, '')) not in ('completed', 'cancelled', 'canceled')
    ),
    'report_available_count', count(*) filter (where report_available),
    'next_due_at', min(due_at) filter (
      where due_at is not null
        and lower(coalesce(status, '')) not in ('completed', 'cancelled', 'canceled')
    ),
    'recent_orders', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'order_key', order_key,
          'order_number', order_number,
          'order_type', order_type,
          'status', status,
          'status_label', status_label,
          'property_address', property_address,
          'due_at', due_at,
          'report_available', report_available,
          'report_ready_at', report_ready_at,
          'report_delivered_at', report_delivered_at
        )
        order by coalesce(due_at, ordered_at) desc nulls last
      ) filter (where order_key is not null),
      '[]'::jsonb
    )
  )
    into v_result
    from portal_orders;

  return coalesce(v_result, jsonb_build_object(
    'active_order_count', 0,
    'report_available_count', 0,
    'next_due_at', null,
    'recent_orders', '[]'::jsonb
  ));
end;
$$;

revoke all on function public.current_app_user_client_portal_client_ids() from public, anon;
revoke all on function public.current_app_user_can_read_client_portal() from public, anon;
revoke all on function public.client_portal_order_key(uuid, uuid, bigint) from public, anon;
revoke all on function public.rpc_client_portal_orders() from public, anon;
revoke all on function public.rpc_client_portal_order_detail(text) from public, anon;
revoke all on function public.rpc_client_portal_dashboard() from public, anon;

grant execute on function public.rpc_client_portal_orders() to authenticated, service_role;
grant execute on function public.rpc_client_portal_order_detail(text) to authenticated, service_role;
grant execute on function public.rpc_client_portal_dashboard() to authenticated, service_role;

comment on table public.client_portal_members is
  'Maps authenticated app users to client accounts for Client Portal read access. Not a public invite/token model.';

comment on view public.v_client_portal_order_status is
  'Client Portal safe order status projection. Excludes raw order ids from RPC payloads, vendor/procurement data, assignments, private notes, fees, margins, storage paths, and signed URLs.';

comment on function public.rpc_client_portal_orders() is
  'Lists Client Portal safe order tracking rows for active client_portal_members in current_company_id(). Returns opaque order_key values and report availability metadata only.';

comment on function public.rpc_client_portal_order_detail(text) is
  'Returns Client Portal safe order detail by opaque order_key for active client_portal_members in current_company_id(). Does not expose vendor, procurement, assignment, fee, margin, internal note, storage path, or signed URL data.';

comment on function public.rpc_client_portal_dashboard() is
  'Returns Client Portal dashboard summary counts and recent client-safe orders for the authenticated mapped client account.';

commit;
