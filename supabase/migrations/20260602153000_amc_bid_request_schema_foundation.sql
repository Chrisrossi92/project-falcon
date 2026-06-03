begin;

create extension if not exists "pgcrypto";

create table if not exists public.order_vendor_bid_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  order_id uuid not null,
  requested_by_user_id uuid null,
  request_message text null,
  response_due_at timestamptz null,
  client_due_at timestamptz null,
  desired_vendor_due_at timestamptz null,
  review_due_at timestamptz null,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  cancelled_at timestamptz null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_vendor_bid_requests_status_valid
    check (status in ('draft', 'sent', 'partially_responded', 'closed', 'cancelled', 'expired')),
  constraint order_vendor_bid_requests_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.order_vendor_bid_request_recipients (
  id uuid primary key default gen_random_uuid(),
  bid_request_id uuid not null,
  vendor_profile_id uuid not null,
  vendor_company_id uuid not null,
  relationship_id uuid not null,
  status text not null default 'pending',
  sent_at timestamptz null,
  viewed_at timestamptz null,
  responded_at timestamptz null,
  declined_at timestamptz null,
  expired_at timestamptz null,
  cancelled_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_vendor_bid_request_recipients_status_valid
    check (status in ('pending', 'sent', 'viewed', 'responded', 'declined', 'expired', 'cancelled', 'selected', 'not_selected')),
  constraint order_vendor_bid_request_recipients_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.order_vendor_bid_responses (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  fee_amount numeric null,
  currency text not null default 'USD',
  proposed_due_at timestamptz null,
  turn_time_days integer null,
  comments text null,
  submitted_at timestamptz null,
  selected_at timestamptz null,
  selected_by_user_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_vendor_bid_responses_fee_non_negative
    check (fee_amount is null or fee_amount >= 0),
  constraint order_vendor_bid_responses_turn_time_non_negative
    check (turn_time_days is null or turn_time_days >= 0),
  constraint order_vendor_bid_responses_currency_format
    check (currency ~ '^[A-Z]{3}$'),
  constraint order_vendor_bid_responses_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_vendor_bid_requests_company_fkey'
       and conrelid = 'public.order_vendor_bid_requests'::regclass
  ) then
    alter table public.order_vendor_bid_requests
      add constraint order_vendor_bid_requests_company_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_vendor_bid_requests_order_fkey'
       and conrelid = 'public.order_vendor_bid_requests'::regclass
  ) then
    alter table public.order_vendor_bid_requests
      add constraint order_vendor_bid_requests_order_fkey
      foreign key (order_id)
      references public.orders(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_vendor_bid_requests_requested_by_user_fkey'
       and conrelid = 'public.order_vendor_bid_requests'::regclass
  ) then
    alter table public.order_vendor_bid_requests
      add constraint order_vendor_bid_requests_requested_by_user_fkey
      foreign key (requested_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_vendor_bid_request_recipients_request_fkey'
       and conrelid = 'public.order_vendor_bid_request_recipients'::regclass
  ) then
    alter table public.order_vendor_bid_request_recipients
      add constraint order_vendor_bid_request_recipients_request_fkey
      foreign key (bid_request_id)
      references public.order_vendor_bid_requests(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_vendor_bid_request_recipients_profile_fkey'
       and conrelid = 'public.order_vendor_bid_request_recipients'::regclass
  ) then
    alter table public.order_vendor_bid_request_recipients
      add constraint order_vendor_bid_request_recipients_profile_fkey
      foreign key (vendor_profile_id)
      references public.company_vendor_profiles(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_vendor_bid_request_recipients_vendor_company_fkey'
       and conrelid = 'public.order_vendor_bid_request_recipients'::regclass
  ) then
    alter table public.order_vendor_bid_request_recipients
      add constraint order_vendor_bid_request_recipients_vendor_company_fkey
      foreign key (vendor_company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_vendor_bid_request_recipients_relationship_fkey'
       and conrelid = 'public.order_vendor_bid_request_recipients'::regclass
  ) then
    alter table public.order_vendor_bid_request_recipients
      add constraint order_vendor_bid_request_recipients_relationship_fkey
      foreign key (relationship_id)
      references public.company_relationships(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_vendor_bid_responses_recipient_fkey'
       and conrelid = 'public.order_vendor_bid_responses'::regclass
  ) then
    alter table public.order_vendor_bid_responses
      add constraint order_vendor_bid_responses_recipient_fkey
      foreign key (recipient_id)
      references public.order_vendor_bid_request_recipients(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_vendor_bid_responses_selected_by_user_fkey'
       and conrelid = 'public.order_vendor_bid_responses'::regclass
  ) then
    alter table public.order_vendor_bid_responses
      add constraint order_vendor_bid_responses_selected_by_user_fkey
      foreign key (selected_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;
end;
$$;

create or replace function public.tg_order_vendor_bid_requests_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_order_company_id uuid;
begin
  if TG_OP = 'UPDATE' then
    if NEW.company_id is distinct from OLD.company_id then
      raise exception 'order_vendor_bid_requests.company_id is immutable';
    end if;

    if NEW.order_id is distinct from OLD.order_id then
      raise exception 'order_vendor_bid_requests.order_id is immutable';
    end if;
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = NEW.order_id;

  if v_order_company_id is null then
    raise exception 'Bid requests require an order with company ownership';
  end if;

  if v_order_company_id is distinct from NEW.company_id then
    raise exception 'Bid request company must match order company';
  end if;

  return NEW;
end;
$$;

create or replace function public.tg_order_vendor_bid_request_recipients_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_request public.order_vendor_bid_requests%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_relationship public.company_relationships%rowtype;
begin
  if TG_OP = 'UPDATE' then
    if NEW.bid_request_id is distinct from OLD.bid_request_id then
      raise exception 'order_vendor_bid_request_recipients.bid_request_id is immutable';
    end if;

    if NEW.vendor_profile_id is distinct from OLD.vendor_profile_id then
      raise exception 'order_vendor_bid_request_recipients.vendor_profile_id is immutable';
    end if;

    if NEW.vendor_company_id is distinct from OLD.vendor_company_id then
      raise exception 'order_vendor_bid_request_recipients.vendor_company_id is immutable';
    end if;

    if NEW.relationship_id is distinct from OLD.relationship_id then
      raise exception 'order_vendor_bid_request_recipients.relationship_id is immutable';
    end if;
  end if;

  select br.*
    into v_request
    from public.order_vendor_bid_requests br
   where br.id = NEW.bid_request_id;

  if not found then
    raise exception 'Bid request recipient parent does not exist';
  end if;

  select cvp.*
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.id = NEW.vendor_profile_id;

  if not found then
    raise exception 'Bid request recipient vendor profile does not exist';
  end if;

  if v_profile.owner_company_id is distinct from v_request.company_id then
    raise exception 'Bid request recipient vendor profile owner must match bid request company';
  end if;

  if v_profile.vendor_company_id is distinct from NEW.vendor_company_id then
    raise exception 'Bid request recipient vendor company must match vendor profile';
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = NEW.relationship_id;

  if not found then
    raise exception 'Bid request recipient relationship does not exist';
  end if;

  if v_relationship.source_company_id is distinct from v_request.company_id then
    raise exception 'Bid request recipient relationship source must match bid request company';
  end if;

  if v_relationship.target_company_id is distinct from NEW.vendor_company_id then
    raise exception 'Bid request recipient relationship target must match vendor company';
  end if;

  if v_relationship.relationship_type <> 'amc_vendor' then
    raise exception 'Bid request recipients require an amc_vendor relationship';
  end if;

  if v_profile.relationship_id is not null
     and v_profile.relationship_id is distinct from NEW.relationship_id then
    raise exception 'Bid request recipient relationship must match vendor profile relationship when present';
  end if;

  return NEW;
end;
$$;

create or replace function public.tg_order_vendor_bid_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_order_vendor_bid_requests_guard on public.order_vendor_bid_requests;
create trigger trg_order_vendor_bid_requests_guard
before insert or update on public.order_vendor_bid_requests
for each row execute function public.tg_order_vendor_bid_requests_guard();

drop trigger if exists trg_order_vendor_bid_request_recipients_guard on public.order_vendor_bid_request_recipients;
create trigger trg_order_vendor_bid_request_recipients_guard
before insert or update on public.order_vendor_bid_request_recipients
for each row execute function public.tg_order_vendor_bid_request_recipients_guard();

drop trigger if exists trg_order_vendor_bid_requests_touch_updated_at on public.order_vendor_bid_requests;
create trigger trg_order_vendor_bid_requests_touch_updated_at
before update on public.order_vendor_bid_requests
for each row execute function public.tg_order_vendor_bid_touch_updated_at();

drop trigger if exists trg_order_vendor_bid_request_recipients_touch_updated_at on public.order_vendor_bid_request_recipients;
create trigger trg_order_vendor_bid_request_recipients_touch_updated_at
before update on public.order_vendor_bid_request_recipients
for each row execute function public.tg_order_vendor_bid_touch_updated_at();

drop trigger if exists trg_order_vendor_bid_responses_touch_updated_at on public.order_vendor_bid_responses;
create trigger trg_order_vendor_bid_responses_touch_updated_at
before update on public.order_vendor_bid_responses
for each row execute function public.tg_order_vendor_bid_touch_updated_at();

create index if not exists idx_order_vendor_bid_requests_company_order
  on public.order_vendor_bid_requests (company_id, order_id);

create index if not exists idx_order_vendor_bid_requests_company_status
  on public.order_vendor_bid_requests (company_id, status);

create index if not exists idx_order_vendor_bid_requests_order_status
  on public.order_vendor_bid_requests (order_id, status);

create index if not exists idx_order_vendor_bid_requests_response_due
  on public.order_vendor_bid_requests (response_due_at)
  where status in ('sent', 'partially_responded');

create unique index if not exists order_vendor_bid_request_recipients_request_vendor_unique
  on public.order_vendor_bid_request_recipients (bid_request_id, vendor_profile_id);

create index if not exists idx_order_vendor_bid_request_recipients_request_status
  on public.order_vendor_bid_request_recipients (bid_request_id, status);

create index if not exists idx_order_vendor_bid_request_recipients_vendor_profile_status
  on public.order_vendor_bid_request_recipients (vendor_profile_id, status);

create index if not exists idx_order_vendor_bid_request_recipients_vendor_company_status
  on public.order_vendor_bid_request_recipients (vendor_company_id, status);

create index if not exists idx_order_vendor_bid_request_recipients_relationship
  on public.order_vendor_bid_request_recipients (relationship_id);

create unique index if not exists order_vendor_bid_responses_recipient_unique
  on public.order_vendor_bid_responses (recipient_id);

create index if not exists idx_order_vendor_bid_responses_selected
  on public.order_vendor_bid_responses (selected_at)
  where selected_at is not null;

create index if not exists idx_order_vendor_bid_responses_submitted
  on public.order_vendor_bid_responses (submitted_at desc);

alter table public.order_vendor_bid_requests enable row level security;
alter table public.order_vendor_bid_request_recipients enable row level security;
alter table public.order_vendor_bid_responses enable row level security;

revoke all privileges on table public.order_vendor_bid_requests from public, anon, authenticated;
revoke all privileges on table public.order_vendor_bid_request_recipients from public, anon, authenticated;
revoke all privileges on table public.order_vendor_bid_responses from public, anon, authenticated;
revoke all privileges on function public.tg_order_vendor_bid_requests_guard() from public, anon, authenticated;
revoke all privileges on function public.tg_order_vendor_bid_request_recipients_guard() from public, anon, authenticated;
revoke all privileges on function public.tg_order_vendor_bid_touch_updated_at() from public, anon, authenticated;

grant all privileges on table public.order_vendor_bid_requests to service_role;
grant all privileges on table public.order_vendor_bid_request_recipients to service_role;
grant all privileges on table public.order_vendor_bid_responses to service_role;
grant execute on function public.tg_order_vendor_bid_requests_guard() to service_role;
grant execute on function public.tg_order_vendor_bid_request_recipients_guard() to service_role;
grant execute on function public.tg_order_vendor_bid_touch_updated_at() to service_role;

comment on table public.order_vendor_bid_requests is
  'AMC-6M.2 bid request parent table for AMC-scoped vendor outreach cycles. Bid requests are not assignments and do not create order_company_assignments packets.';

comment on column public.order_vendor_bid_requests.company_id is
  'Current owner company for the AMC order. Must match orders.company_id; runtime access remains RPC/permission owned.';

comment on column public.order_vendor_bid_requests.order_id is
  'AMC-scoped order being bid. This schema foundation does not change order visibility, assignment behavior, or order workflow.';

comment on column public.order_vendor_bid_requests.status is
  'Bid request lifecycle status. Bid request status is separate from order_company_assignments lifecycle status.';

comment on column public.order_vendor_bid_requests.metadata is
  'Structured bid request metadata such as candidate snapshots. Metadata does not grant authorization or create assignment behavior.';

comment on table public.order_vendor_bid_request_recipients is
  'AMC-6M.2 bid request recipient table. One row represents vendor outreach for a bid request and is not an assignment offer.';

comment on column public.order_vendor_bid_request_recipients.vendor_profile_id is
  'Vendor Directory profile selected for bid outreach. Assignment eligibility remains enforced by future RPCs and assignment-offer guards.';

comment on column public.order_vendor_bid_request_recipients.relationship_id is
  'Company relationship used to establish vendor identity for bid outreach. Bid recipients do not grant order visibility by themselves.';

comment on column public.order_vendor_bid_request_recipients.status is
  'Recipient lifecycle status for bid outreach only. It is not assignment acceptance or assignment packet status.';

comment on table public.order_vendor_bid_responses is
  'AMC-6M.2 bid response table for vendor fee, due-date, turn-time, and comment responses. Responses are not assignment acceptance.';

comment on column public.order_vendor_bid_responses.fee_amount is
  'Vendor proposed fee amount for comparison. Financial settlement and assignment terms remain deferred.';

comment on column public.order_vendor_bid_responses.selected_at is
  'Timestamp when an owner/admin selected this response for later assignment-offer conversion. Selection alone does not create an assignment packet.';

comment on function public.tg_order_vendor_bid_requests_guard() is
  'AMC-6M.2 structural guard for bid request company/order consistency and immutable company/order identity. Does not create assignments or mutate orders.';

comment on function public.tg_order_vendor_bid_request_recipients_guard() is
  'AMC-6M.2 structural guard for bid recipient profile/company/relationship consistency. Does not require active relationship status or create assignment behavior.';

comment on function public.tg_order_vendor_bid_touch_updated_at() is
  'AMC-6M.2 shared updated_at trigger for bid request foundation tables.';

commit;
