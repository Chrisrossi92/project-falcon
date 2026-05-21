begin;

create or replace function public.current_app_user_can_create_order()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.role() = 'service_role'
    or (
      public.current_app_user_has_current_company()
      and public.current_app_user_has_permission('orders.create')
    );
$$;

grant execute on function public.current_app_user_can_create_order() to authenticated;

create or replace function public.current_app_user_can_update_order_row(
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
    auth.role() = 'service_role'
    or (
      public.current_app_user_has_current_company()
      and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
      and (
        public.current_app_user_has_permission('orders.update.all')
        or (
          public.current_app_user_has_permission('orders.update.assigned')
          and public.current_app_user_can_read_order_row(
            p_company_id,
            p_appraiser_id,
            p_assigned_to,
            p_reviewer_id,
            p_status
          )
        )
      )
    );
$$;

grant execute on function public.current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text) to authenticated;

create or replace function public.current_app_user_can_attach_order_client(
  p_client_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_client_id is null
    or exists (
      select 1
      from public.clients c
      where c.id = p_client_id
        and coalesce(c.company_id, public.default_company_id()) = public.current_company_id()
        and coalesce(c.is_merged, false) = false
        and (
          auth.role() = 'service_role'
          or public.current_app_user_can_read_client_row(c.company_id, c.id)
        )
    );
$$;

grant execute on function public.current_app_user_can_attach_order_client(bigint) to authenticated;

create or replace function public.current_app_user_can_attach_order_amc(
  p_client_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_client_id is null
    or exists (
      select 1
      from public.clients c
      where c.id = p_client_id
        and coalesce(c.company_id, public.default_company_id()) = public.current_company_id()
        and coalesce(c.is_merged, false) = false
        and lower(coalesce(c.category, '')) = 'amc'
        and (
          auth.role() = 'service_role'
          or public.current_app_user_can_read_client_row(c.company_id, c.id)
        )
    );
$$;

grant execute on function public.current_app_user_can_attach_order_amc(bigint) to authenticated;

create or replace function public.tg_orders_preserve_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    -- Company ownership is backend-owned. Ignore frontend-sent company_id.
    NEW.company_id := public.current_company_id();
  elsif TG_OP = 'UPDATE' then
    -- Order ownership is immutable in compatibility mode.
    NEW.company_id := coalesce(OLD.company_id, public.default_company_id());
  end if;

  return NEW;
end;
$$;

create or replace function public.tg_orders_validate_company_client_attachments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Manual-only intake remains valid, but linked client IDs must be real,
  -- readable current-company clients. Invalid linked rows are not converted
  -- to manual-client orders because that would hide tenant boundary errors.
  if NEW.client_id is not null
     and not public.current_app_user_can_attach_order_client(NEW.client_id) then
    raise exception 'client_id % is not attachable to orders in the current company', NEW.client_id
      using errcode = '42501';
  end if;

  if NEW.managing_amc_id is not null
     and not public.current_app_user_can_attach_order_amc(NEW.managing_amc_id) then
    raise exception 'managing_amc_id % is not an attachable current-company AMC client', NEW.managing_amc_id
      using errcode = '42501';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_orders_validate_company_client_attachments on public.orders;
create trigger trg_orders_validate_company_client_attachments
before insert or update of client_id, managing_amc_id, company_id on public.orders
for each row execute function public.tg_orders_validate_company_client_attachments();

create or replace function public.rpc_create_order(payload jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
  v_managing_amc_id bigint;
  v_manual text;
  v_appraiser uuid;
  v_row public.orders;
begin
  if not public.current_app_user_can_create_order() then
    raise exception 'not authorized to create orders'
      using errcode = '42501';
  end if;

  v_client_id := nullif(payload->>'client_id', '')::bigint;
  v_managing_amc_id := nullif(payload->>'managing_amc_id', '')::bigint;
  v_manual := coalesce(
    nullif(payload->>'manual_client', ''),
    nullif(payload->>'manual_client_name', '')
  );
  v_appraiser := nullif(payload->>'appraiser_id', '')::uuid;

  if v_client_id is not null
     and not public.current_app_user_can_attach_order_client(v_client_id) then
    raise exception 'client_id % is not attachable to orders in the current company', v_client_id
      using errcode = '42501';
  end if;

  if v_managing_amc_id is not null
     and not public.current_app_user_can_attach_order_amc(v_managing_amc_id) then
    raise exception 'managing_amc_id % is not an attachable current-company AMC client', v_managing_amc_id
      using errcode = '42501';
  end if;

  insert into public.orders (
    client_id, managing_amc_id, manual_client, manual_client_name, appraiser_id, order_number,
    property_address, city, state, postal_code,
    base_fee, appraiser_fee, appraiser_split, notes,
    status, created_at, updated_at
  ) values (
    v_client_id, v_managing_amc_id, v_manual, v_manual, v_appraiser, nullif(payload->>'order_number',''),
    nullif(payload->>'property_address',''), nullif(payload->>'city',''), nullif(payload->>'state',''), nullif(payload->>'postal_code',''),
    nullif(payload->>'base_fee','')::numeric,
    nullif(payload->>'appraiser_fee','')::numeric,
    nullif(payload->>'appraiser_split','')::numeric,
    nullif(payload->>'notes',''),
    coalesce(nullif(payload->>'status',''),'new'),
    now(), now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.rpc_update_order(order_id uuid, patch jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  has_client boolean := patch ? 'client_id';
  has_managing_amc boolean := patch ? 'managing_amc_id';
  in_client text := patch->>'client_id';
  in_managing_amc text := patch->>'managing_amc_id';
  v_client_id bigint;
  v_managing_amc_id bigint;
  v_manual text := coalesce(
    nullif(patch->>'manual_client', ''),
    nullif(patch->>'manual_client_name', '')
  );
  v_existing public.orders;
  v_row public.orders;
begin
  select *
    into v_existing
    from public.orders
   where id = order_id;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_existing.company_id,
    v_existing.appraiser_id,
    v_existing.assigned_to,
    v_existing.reviewer_id,
    v_existing.status
  ) then
    raise exception 'not authorized to update order %', order_id
      using errcode = '42501';
  end if;

  if has_client then
    v_client_id := nullif(in_client, '')::bigint;
    if v_client_id is not null
       and not public.current_app_user_can_attach_order_client(v_client_id) then
      raise exception 'client_id % is not attachable to orders in the current company', v_client_id
        using errcode = '42501';
    end if;
  end if;

  if has_managing_amc then
    v_managing_amc_id := nullif(in_managing_amc, '')::bigint;
    if v_managing_amc_id is not null
       and not public.current_app_user_can_attach_order_amc(v_managing_amc_id) then
      raise exception 'managing_amc_id % is not an attachable current-company AMC client', v_managing_amc_id
        using errcode = '42501';
    end if;
  end if;

  update public.orders
     set client_id        = case when has_client then v_client_id else client_id end,
         managing_amc_id  = case when has_managing_amc then v_managing_amc_id else managing_amc_id end,
         manual_client    = coalesce(v_manual, manual_client),
         manual_client_name = coalesce(v_manual, manual_client_name),
         appraiser_id     = coalesce(nullif(patch->>'appraiser_id','')::uuid, appraiser_id),
         order_number     = coalesce(nullif(patch->>'order_number',''), order_number),
         property_address = coalesce(nullif(patch->>'property_address',''), property_address),
         city             = coalesce(nullif(patch->>'city',''), city),
         state            = coalesce(nullif(patch->>'state',''), state),
         postal_code      = coalesce(nullif(patch->>'postal_code',''), postal_code),
         base_fee         = coalesce(nullif(patch->>'base_fee','')::numeric, base_fee),
         appraiser_fee    = coalesce(nullif(patch->>'appraiser_fee','')::numeric, appraiser_fee),
         appraiser_split  = coalesce(nullif(patch->>'appraiser_split','')::numeric, appraiser_split),
         notes            = coalesce(nullif(patch->>'notes',''), notes),
         updated_at       = now()
   where id = order_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.rpc_order_update(p_order_id uuid, p jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.orders;
  v_row public.orders;
  v_client_id public.orders.client_id%TYPE := null;
  v_managing_amc_id public.orders.managing_amc_id%TYPE := null;
  v_appraiser_id public.orders.appraiser_id%TYPE := null;
  v_reviewer_id public.orders.reviewer_id%TYPE := null;
begin
  select *
    into v_existing
    from public.orders
   where id = p_order_id;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_existing.company_id,
    v_existing.appraiser_id,
    v_existing.assigned_to,
    v_existing.reviewer_id,
    v_existing.status
  ) then
    raise exception 'not authorized to update order %', p_order_id
      using errcode = '42501';
  end if;

  if p ? 'client_id' then
    v_client_id := nullif(p->>'client_id', '')::bigint;
    if v_client_id is not null
       and not public.current_app_user_can_attach_order_client(v_client_id) then
      raise exception 'client_id % is not attachable to orders in the current company', v_client_id
        using errcode = '42501';
    end if;
  end if;

  if p ? 'managing_amc_id' then
    v_managing_amc_id := nullif(p->>'managing_amc_id', '')::bigint;
    if v_managing_amc_id is not null
       and not public.current_app_user_can_attach_order_amc(v_managing_amc_id) then
      raise exception 'managing_amc_id % is not an attachable current-company AMC client', v_managing_amc_id
        using errcode = '42501';
    end if;
  end if;

  if p ? 'appraiser_id' then
    v_appraiser_id := public.fn_to_users_id((p->>'appraiser_id')::uuid);
  end if;

  if p ? 'reviewer_id' then
    v_reviewer_id := public.fn_to_users_id((p->>'reviewer_id')::uuid);
  end if;

  update public.orders o
  set
    title            = coalesce(p->>'title', o.title),
    address          = coalesce(p->>'address', o.address),
    city             = coalesce(p->>'city', o.city),
    state            = coalesce(p->>'state', o.state),
    zip              = coalesce(p->>'zip', o.zip),
    client_id        = case when p ? 'client_id' then v_client_id else o.client_id end,
    managing_amc_id  = case when p ? 'managing_amc_id' then v_managing_amc_id else o.managing_amc_id end,
    appraiser_id     = coalesce(v_appraiser_id, o.appraiser_id),
    reviewer_id      = coalesce(v_reviewer_id,  o.reviewer_id),
    due_date         = coalesce((p->>'due_date')::date, o.due_date),
    review_due_date  = coalesce((p->>'review_due_date')::date, o.review_due_date),
    site_visit_at    = coalesce((p->>'site_visit_at')::timestamp, o.site_visit_at),
    fee_amount       = coalesce((p->>'fee_amount')::numeric, o.fee_amount),
    is_archived      = coalesce((p->>'is_archived')::boolean, o.is_archived),
    order_number     = coalesce(nullif(p->>'order_number',''), o.order_number),
    updated_at       = now()
  where o.id = p_order_id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.current_app_user_can_create_order() is
  'Slice 7E3A order create predicate. Requires current-company membership and orders.create; service_role is allowed for backend jobs.';

comment on function public.current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text) is
  'Slice 7E3A order update predicate. Requires current-company membership, company match, and orders.update.all or orders.update.assigned through readable order responsibility.';

comment on function public.current_app_user_can_attach_order_client(bigint) is
  'Slice 7E3A order client attachment predicate. Linked client must be readable, current-company, and non-merged. Null is allowed for manual-only intake.';

comment on function public.current_app_user_can_attach_order_amc(bigint) is
  'Slice 7E3A order AMC attachment predicate. Linked AMC must be a readable, current-company, non-merged clients row with category=amc. Null is allowed.';

comment on function public.tg_orders_preserve_company_id() is
  'Keeps order company scope backend-owned. Inserts resolve to current_company_id(); updates preserve existing company ownership.';

comment on function public.tg_orders_validate_company_client_attachments() is
  'Validates order linked client and managing AMC attachments against current-company readable clients. Manual-only orders remain allowed.';

commit;
