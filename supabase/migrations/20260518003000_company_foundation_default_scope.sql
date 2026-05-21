begin;

create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'active',
  timezone text not null default 'America/New_York',
  locale text not null default 'en-US',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.companies (
  slug,
  name,
  status,
  timezone,
  locale,
  settings
) values (
  'falcon_default',
  'Falcon Default Company',
  'active',
  'America/New_York',
  'en-US',
  '{}'::jsonb
)
on conflict (slug) do update
  set name = excluded.name,
      status = excluded.status,
      timezone = excluded.timezone,
      locale = excluded.locale,
      updated_at = now();

alter table public.orders
  add column if not exists company_id uuid;

alter table public.clients
  add column if not exists company_id uuid;

alter table public.notifications
  add column if not exists company_id uuid;

alter table public.activity_log
  add column if not exists company_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'orders_company_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'clients_company_id_fkey'
  ) then
    alter table public.clients
      add constraint clients_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'notifications_company_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'activity_log_company_id_fkey'
  ) then
    alter table public.activity_log
      add constraint activity_log_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;
end;
$$;

with default_company as (
  select id
    from public.companies
   where slug = 'falcon_default'
)
update public.orders o
   set company_id = dc.id
  from default_company dc
 where o.company_id is null;

with default_company as (
  select id
    from public.companies
   where slug = 'falcon_default'
)
update public.clients c
   set company_id = dc.id
  from default_company dc
 where c.company_id is null;

update public.notifications n
   set company_id = o.company_id
  from public.orders o
 where n.order_id = o.id
   and n.company_id is null
   and o.company_id is not null;

with default_company as (
  select id
    from public.companies
   where slug = 'falcon_default'
)
update public.notifications n
   set company_id = dc.id
  from default_company dc
 where n.company_id is null;

update public.activity_log a
   set company_id = o.company_id
  from public.orders o
 where a.order_id = o.id
   and a.company_id is null
   and o.company_id is not null;

with default_company as (
  select id
    from public.companies
   where slug = 'falcon_default'
)
update public.activity_log a
   set company_id = dc.id
  from default_company dc
 where a.company_id is null;

create index if not exists idx_orders_company_id
  on public.orders (company_id);

create index if not exists idx_clients_company_id
  on public.clients (company_id);

create index if not exists idx_notifications_company_user_created
  on public.notifications (company_id, user_id, created_at desc);

create index if not exists idx_activity_log_company_order_created
  on public.activity_log (company_id, order_id, created_at desc);

comment on table public.companies is
  'Canonical company records. Multi-Company Foundation Slice 1 default-company foundation only; no tenant enforcement or org switching yet.';

comment on column public.orders.company_id is
  'Nullable company scope foundation. Backfilled to default company; not yet used for RLS enforcement.';

comment on column public.clients.company_id is
  'Nullable company scope foundation. Backfilled to default company; not yet used for RLS enforcement.';

comment on column public.notifications.company_id is
  'Nullable company scope foundation. Derived from order when possible; not yet used for notification filtering.';

comment on column public.activity_log.company_id is
  'Nullable company scope foundation. Derived from order when possible; not yet used for activity RLS enforcement.';

commit;
