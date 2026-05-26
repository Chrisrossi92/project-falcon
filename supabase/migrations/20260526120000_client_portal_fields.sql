begin;

alter table public.clients
  add column if not exists portal_url text null,
  add column if not exists portal_notes text null;

do $$
begin
  if to_regprocedure('public.rpc_client_management_list_without_portal(text,text,text)') is null
     and to_regprocedure('public.rpc_client_management_list(text,text,text)') is not null then
    alter function public.rpc_client_management_list(text, text, text)
      rename to rpc_client_management_list_without_portal;
  end if;
end;
$$;

do $$
begin
  if to_regprocedure('public.rpc_client_management_detail_without_portal(bigint)') is null
     and to_regprocedure('public.rpc_client_management_detail(bigint)') is not null then
    alter function public.rpc_client_management_detail(bigint)
      rename to rpc_client_management_detail_without_portal;
  end if;
end;
$$;

do $$
begin
  if to_regprocedure('public.rpc_client_management_create_without_portal(jsonb)') is null
     and to_regprocedure('public.rpc_client_management_create(jsonb)') is not null then
    alter function public.rpc_client_management_create(jsonb)
      rename to rpc_client_management_create_without_portal;
  end if;
end;
$$;

do $$
begin
  if to_regprocedure('public.rpc_client_management_update_without_portal(bigint,jsonb)') is null
     and to_regprocedure('public.rpc_client_management_update(bigint,jsonb)') is not null then
    alter function public.rpc_client_management_update(bigint, jsonb)
      rename to rpc_client_management_update_without_portal;
  end if;
end;
$$;

drop function if exists public.rpc_client_management_list(text, text, text);
create or replace function public.rpc_client_management_list(
  p_search text default '',
  p_category text default 'all',
  p_sort text default 'orders_desc'
)
returns table (
  client_id bigint,
  client_name text,
  status text,
  category text,
  amc_id bigint,
  amc_name text,
  contact_mode text,
  portal_url text,
  portal_notes text,
  contact_name text,
  contact_email text,
  contact_phone text,
  order_count integer,
  avg_fee numeric,
  last_order_date timestamptz,
  is_merged boolean,
  merged_into_id bigint,
  active_order_count integer,
  completed_order_count integer,
  direct_order_count integer,
  managed_order_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    base.client_id,
    base.client_name,
    base.status,
    base.category,
    base.amc_id,
    base.amc_name,
    base.contact_mode,
    c.portal_url,
    c.portal_notes,
    base.contact_name,
    base.contact_email,
    base.contact_phone,
    base.order_count,
    base.avg_fee,
    base.last_order_date,
    base.is_merged,
    base.merged_into_id,
    base.active_order_count,
    base.completed_order_count,
    base.direct_order_count,
    base.managed_order_count
  from public.rpc_client_management_list_without_portal(p_search, p_category, p_sort) base
  left join public.clients c
    on c.id = base.client_id;
$$;

drop function if exists public.rpc_client_management_detail(bigint);
create or replace function public.rpc_client_management_detail(
  p_client_id bigint
)
returns table (
  client_id bigint,
  client_name text,
  status text,
  category text,
  amc_id bigint,
  amc_name text,
  contact_mode text,
  portal_url text,
  portal_notes text,
  notes text,
  contact_name_1 text,
  contact_email_1 text,
  contact_phone_1 text,
  contact_name_2 text,
  contact_email_2 text,
  contact_phone_2 text,
  is_merged boolean,
  merged_into_id bigint,
  order_count integer,
  avg_fee numeric,
  last_order_date timestamptz,
  active_order_count integer,
  completed_order_count integer,
  direct_order_count integer,
  managed_order_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    base.client_id,
    base.client_name,
    base.status,
    base.category,
    base.amc_id,
    base.amc_name,
    base.contact_mode,
    c.portal_url,
    c.portal_notes,
    base.notes,
    base.contact_name_1,
    base.contact_email_1,
    base.contact_phone_1,
    base.contact_name_2,
    base.contact_email_2,
    base.contact_phone_2,
    base.is_merged,
    base.merged_into_id,
    base.order_count,
    base.avg_fee,
    base.last_order_date,
    base.active_order_count,
    base.completed_order_count,
    base.direct_order_count,
    base.managed_order_count
  from public.rpc_client_management_detail_without_portal(p_client_id) base
  left join public.clients c
    on c.id = base.client_id;
$$;

drop function if exists public.rpc_client_management_create(jsonb);
create or replace function public.rpc_client_management_create(
  p_client jsonb
)
returns table (
  client_id bigint,
  client_name text,
  status text,
  category text,
  amc_id bigint,
  amc_name text,
  contact_mode text,
  portal_url text,
  portal_notes text,
  notes text,
  contact_name_1 text,
  contact_email_1 text,
  contact_phone_1 text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
begin
  select created.client_id
    into v_client_id
    from public.rpc_client_management_create_without_portal(p_client) created
   limit 1;

  if v_client_id is null then
    raise exception 'client_create_failed'
      using errcode = 'P0002';
  end if;

  if p_client ? 'portal_url' or p_client ? 'portal_notes' then
    update public.clients c
       set portal_url = case
             when p_client ? 'portal_url' then nullif(trim(coalesce(p_client->>'portal_url', '')), '')
             else c.portal_url
           end,
           portal_notes = case
             when p_client ? 'portal_notes' then nullif(p_client->>'portal_notes', '')
             else c.portal_notes
           end
     where c.id = v_client_id;
  end if;

  return query
  select
    detail.client_id,
    detail.client_name,
    detail.status,
    detail.category,
    detail.amc_id,
    detail.amc_name,
    detail.contact_mode,
    detail.portal_url,
    detail.portal_notes,
    detail.notes,
    detail.contact_name_1,
    detail.contact_email_1,
    detail.contact_phone_1
  from public.rpc_client_management_detail(v_client_id) detail;
end;
$$;

drop function if exists public.rpc_client_management_update(bigint, jsonb);
create or replace function public.rpc_client_management_update(
  p_client_id bigint,
  p_patch jsonb
)
returns table (
  client_id bigint,
  client_name text,
  status text,
  category text,
  amc_id bigint,
  amc_name text,
  contact_mode text,
  portal_url text,
  portal_notes text,
  notes text,
  contact_name_1 text,
  contact_email_1 text,
  contact_phone_1 text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
begin
  select updated.client_id
    into v_client_id
    from public.rpc_client_management_update_without_portal(p_client_id, p_patch) updated
   limit 1;

  if v_client_id is null then
    raise exception 'client_not_found'
      using errcode = 'P0002';
  end if;

  if p_patch ? 'portal_url' or p_patch ? 'portal_notes' then
    update public.clients c
       set portal_url = case
             when p_patch ? 'portal_url' then nullif(trim(coalesce(p_patch->>'portal_url', '')), '')
             else c.portal_url
           end,
           portal_notes = case
             when p_patch ? 'portal_notes' then nullif(p_patch->>'portal_notes', '')
             else c.portal_notes
           end
     where c.id = v_client_id;
  end if;

  return query
  select
    detail.client_id,
    detail.client_name,
    detail.status,
    detail.category,
    detail.amc_id,
    detail.amc_name,
    detail.contact_mode,
    detail.portal_url,
    detail.portal_notes,
    detail.notes,
    detail.contact_name_1,
    detail.contact_email_1,
    detail.contact_phone_1
  from public.rpc_client_management_detail(v_client_id) detail;
end;
$$;

revoke all privileges on function public.rpc_client_management_list(text, text, text) from public, anon;
revoke all privileges on function public.rpc_client_management_detail(bigint) from public, anon;
revoke all privileges on function public.rpc_client_management_create(jsonb) from public, anon;
revoke all privileges on function public.rpc_client_management_update(bigint, jsonb) from public, anon;

grant execute on function public.rpc_client_management_list(text, text, text) to authenticated, service_role;
grant execute on function public.rpc_client_management_detail(bigint) to authenticated, service_role;
grant execute on function public.rpc_client_management_create(jsonb) to authenticated, service_role;
grant execute on function public.rpc_client_management_update(bigint, jsonb) to authenticated, service_role;

revoke all privileges on function public.rpc_client_management_list_without_portal(text, text, text) from public, anon, authenticated;
revoke all privileges on function public.rpc_client_management_detail_without_portal(bigint) from public, anon, authenticated;
revoke all privileges on function public.rpc_client_management_create_without_portal(jsonb) from public, anon, authenticated;
revoke all privileges on function public.rpc_client_management_update_without_portal(bigint, jsonb) from public, anon, authenticated;

comment on column public.clients.portal_url is
  'Optional portal or intake URL for a client/lender/AMC relationship. Does not store credentials.';

comment on column public.clients.portal_notes is
  'Optional operational portal or general intake notes for a client/lender/AMC relationship. Must not contain passwords or secrets.';

comment on function public.rpc_client_management_detail(bigint) is
  'Returns a current-company client relationship detail row, including contact optionality, portal metadata, and AMC/lender rollup metrics.';

commit;
