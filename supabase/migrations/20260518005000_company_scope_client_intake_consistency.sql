begin;

create or replace function public.tg_clients_preserve_company_id()
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

drop trigger if exists trg_clients_preserve_company_id on public.clients;
create trigger trg_clients_preserve_company_id
before insert or update on public.clients
for each row execute function public.tg_clients_preserve_company_id();

update public.clients
   set company_id = public.default_company_id()
 where company_id is null;

drop view if exists public.v_client_metrics;
drop view if exists public.v_client_kpis_appraiser;
drop view if exists public.v_client_kpis;

create or replace view public.v_client_kpis as
select
  c.company_id,
  c.id as client_id,
  c.name as client_name,
  c.name,
  c.status,
  c.category,
  c.client_type,
  c.kind,
  c.contact_name_1 as primary_contact_name,
  c.contact_phone_1 as primary_contact_phone,
  c.contact_email_1 as primary_contact_email,
  count(o.id)::integer as total_orders,
  count(o.id)::integer as orders_count,
  count(o.id) filter (
    where lower(coalesce(o.status::text, '')) not in ('completed', 'complete', 'cancelled', 'canceled')
  )::integer as active_orders,
  count(o.id) filter (
    where lower(coalesce(o.status::text, '')) in ('completed', 'complete')
  )::integer as completed_orders,
  avg(coalesce(o.fee_amount, o.base_fee)) as avg_total_fee,
  max(o.created_at) as last_order_date
from public.clients c
left join public.orders o
  on o.client_id = c.id
 and o.company_id = c.company_id
group by
  c.company_id,
  c.id,
  c.name,
  c.status,
  c.category,
  c.client_type,
  c.kind,
  c.contact_name_1,
  c.contact_phone_1,
  c.contact_email_1;

create or replace view public.v_client_metrics as
select *
from public.v_client_kpis;

create or replace view public.v_client_kpis_appraiser as
select
  k.client_id,
  k.client_name,
  k.primary_contact_name,
  k.primary_contact_phone,
  k.total_orders::bigint as total_orders,
  k.avg_total_fee,
  k.last_order_date as last_order_at,
  k.company_id
from public.v_client_kpis k
where exists (
  select 1
    from public.orders o
   where o.client_id = k.client_id
     and coalesce(o.appraiser_id, o.assigned_to) = public.current_app_user_id()
);

grant select on public.v_client_kpis to authenticated;
grant select on public.v_client_kpis to anon;
grant select on public.v_client_kpis_appraiser to authenticated;
grant select on public.v_client_kpis_appraiser to anon;
grant select on public.v_client_metrics to authenticated;
grant select on public.v_client_metrics to anon;

do $$
begin
  if current_setting('server_version_num')::int >= 150000 then
    execute 'alter view public.v_client_kpis set (security_invoker = true)';
    execute 'alter view public.v_client_kpis_appraiser set (security_invoker = true)';
    execute 'alter view public.v_client_metrics set (security_invoker = true)';
  end if;
end;
$$;

drop function if exists public.client_name_taken(text, bigint);
create or replace function public.client_name_taken(
  p_name text,
  p_ignore_id bigint default null
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.clients c
     where c.company_id = public.default_company_id()
       and lower(trim(coalesce(c.name, ''))) = lower(trim(coalesce(p_name, '')))
       and (p_ignore_id is null or c.id <> p_ignore_id)
       and coalesce(c.is_merged, false) = false
  );
$$;

grant execute on function public.client_name_taken(text, bigint) to authenticated;

drop function if exists public.merge_clients(bigint, bigint, jsonb);
create or replace function public.merge_clients(
  p_source_id bigint,
  p_target_id bigint,
  p_strategy jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.clients%rowtype;
  v_target public.clients%rowtype;
  v_orders_client_count integer := 0;
  v_orders_managing_amc_count integer := 0;
  v_child_client_count integer := 0;
begin
  if p_source_id is null or p_target_id is null then
    raise exception 'source and target client ids are required';
  end if;

  if p_source_id = p_target_id then
    raise exception 'source and target clients must be different';
  end if;

  select *
    into v_source
    from public.clients
   where id = p_source_id
   for update;

  if not found then
    raise exception 'source client not found';
  end if;

  select *
    into v_target
    from public.clients
   where id = p_target_id
   for update;

  if not found then
    raise exception 'target client not found';
  end if;

  if v_source.company_id is null or v_target.company_id is null then
    raise exception 'clients must have company_id before merge';
  end if;

  if v_source.company_id is distinct from v_target.company_id then
    raise exception 'cannot merge clients across companies';
  end if;

  update public.orders
     set client_id = p_target_id,
         updated_at = now()
   where client_id = p_source_id
     and company_id = v_source.company_id;
  get diagnostics v_orders_client_count = row_count;

  update public.orders
     set managing_amc_id = p_target_id,
         updated_at = now()
   where managing_amc_id = p_source_id
     and company_id = v_source.company_id;
  get diagnostics v_orders_managing_amc_count = row_count;

  update public.clients
     set amc_id = p_target_id
   where amc_id = p_source_id
     and company_id = v_source.company_id;
  get diagnostics v_child_client_count = row_count;

  update public.clients
     set is_merged = true,
         merged_into_id = p_target_id,
         status = coalesce(status, 'inactive')
   where id = p_source_id
     and company_id = v_source.company_id;

  return jsonb_build_object(
    'source_id', p_source_id,
    'target_id', p_target_id,
    'company_id', v_source.company_id,
    'orders_client_updated', v_orders_client_count,
    'orders_managing_amc_updated', v_orders_managing_amc_count,
    'child_clients_updated', v_child_client_count,
    'strategy', coalesce(p_strategy, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.merge_clients(bigint, bigint, jsonb) to authenticated;

do $$
declare
  v_client_mismatch_count integer := 0;
  v_managing_amc_mismatch_count integer := 0;
begin
  select count(*)
    into v_client_mismatch_count
    from public.orders o
    join public.clients c on c.id = o.client_id
   where o.client_id is not null
     and o.company_id is distinct from c.company_id;

  select count(*)
    into v_managing_amc_mismatch_count
    from public.orders o
    join public.clients c on c.id = o.managing_amc_id
   where o.managing_amc_id is not null
     and o.company_id is distinct from c.company_id;

  raise notice 'Order/client company mismatch counts: client_id=%, managing_amc_id=%',
    v_client_mismatch_count,
    v_managing_amc_mismatch_count;
end;
$$;

comment on function public.tg_clients_preserve_company_id() is
  'Keeps client company scope backend-owned. Inserts default to falcon_default; updates preserve existing company ownership.';

comment on view public.v_client_kpis is
  'Company-aware client KPI projection. Slice 3 exposes company_id without tenant enforcement.';

comment on view public.v_client_metrics is
  'Compatibility alias for company-aware client KPI metrics.';

commit;
