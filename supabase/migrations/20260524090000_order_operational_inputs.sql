begin;

create extension if not exists "pgcrypto";

create table if not exists public.order_operational_inputs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  input_type text not null,
  actor_user_id uuid not null references public.users(id) on delete restrict,
  actor_role text null,
  actor_context jsonb not null default '{}'::jsonb,
  note text null,
  payload jsonb not null default '{}'::jsonb,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  cleared_at timestamptz null,
  cleared_by_user_id uuid null references public.users(id) on delete set null,
  constraint order_operational_inputs_input_type_check
    check (input_type in ('inspection_scheduled', 'report_on_track', 'waiting_on_client')),
  constraint order_operational_inputs_source_check
    check (source = 'manual'),
  constraint order_operational_inputs_expires_after_created_check
    check (expires_at > created_at),
  constraint order_operational_inputs_clear_consistency_check
    check (
      (cleared_at is null and cleared_by_user_id is null)
      or (cleared_at is not null and cleared_by_user_id is not null)
    ),
  constraint order_operational_inputs_payload_object_check
    check (jsonb_typeof(payload) = 'object'),
  constraint order_operational_inputs_actor_context_object_check
    check (jsonb_typeof(actor_context) = 'object'),
  constraint order_operational_inputs_note_length_check
    check (note is null or char_length(note) <= 500)
);

comment on table public.order_operational_inputs is
  'Append-friendly, non-authoritative operational evidence records for orders.';
comment on column public.order_operational_inputs.input_type is
  'First-wave operational evidence type. This does not mutate lifecycle state.';
comment on column public.order_operational_inputs.expires_at is
  'Freshness boundary used by resolvers. Expired records remain audit evidence.';
comment on column public.order_operational_inputs.cleared_at is
  'Manual clear timestamp. Clearing does not delete evidence.';

create index if not exists idx_order_operational_inputs_order_created
  on public.order_operational_inputs (order_id, created_at desc);

create index if not exists idx_order_operational_inputs_company_order
  on public.order_operational_inputs (company_id, order_id);

create index if not exists idx_order_operational_inputs_active_fresh
  on public.order_operational_inputs (order_id, input_type, expires_at desc)
  where cleared_at is null;

create index if not exists idx_order_operational_inputs_actor
  on public.order_operational_inputs (actor_user_id, created_at desc);

alter table public.order_operational_inputs enable row level security;

drop policy if exists "order_operational_inputs_select_readable_order"
  on public.order_operational_inputs;
create policy "order_operational_inputs_select_readable_order"
  on public.order_operational_inputs
  for select
  to authenticated
  using (
    public.current_app_user_has_current_company()
    and company_id = public.current_company_id()
    and public.current_app_user_can_read_order(order_id)
  );

drop policy if exists "order_operational_inputs_no_direct_insert"
  on public.order_operational_inputs;
create policy "order_operational_inputs_no_direct_insert"
  on public.order_operational_inputs
  for insert
  to authenticated
  with check (false);

drop policy if exists "order_operational_inputs_no_direct_update"
  on public.order_operational_inputs;
create policy "order_operational_inputs_no_direct_update"
  on public.order_operational_inputs
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists "order_operational_inputs_no_direct_delete"
  on public.order_operational_inputs;
create policy "order_operational_inputs_no_direct_delete"
  on public.order_operational_inputs
  for delete
  to authenticated
  using (false);

revoke all on table public.order_operational_inputs from public, anon, authenticated;
grant select on table public.order_operational_inputs to authenticated;

drop function if exists public.rpc_order_operational_input_create(uuid, text, text, jsonb, text);

create or replace function public.rpc_order_operational_input_create(
  p_order_id uuid,
  p_input_type text,
  p_note text default null,
  p_payload jsonb default '{}'::jsonb,
  p_source text default 'manual'
)
returns public.order_operational_inputs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_auth_uid uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_order public.orders;
  v_input_type text := lower(btrim(coalesce(p_input_type, '')));
  v_source text := lower(btrim(coalesce(p_source, 'manual')));
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_created_at timestamptz := now();
  v_expires_at timestamptz;
  v_actor_role text;
  v_actor record;
  v_legacy_profile_id uuid;
  v_row public.order_operational_inputs;
  v_message text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found' using errcode = 'P0001';
  end if;

  if p_order_id is null then
    raise exception 'order_id_required' using errcode = '22023';
  end if;

  if v_input_type not in ('inspection_scheduled', 'report_on_track', 'waiting_on_client') then
    raise exception 'invalid_operational_input_type' using errcode = '22023';
  end if;

  if v_source <> 'manual' then
    raise exception 'invalid_operational_input_source' using errcode = '22023';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'operational_input_payload_must_be_object' using errcode = '22023';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'operational_input_note_too_long' using errcode = '22023';
  end if;

  select *
    into v_order
  from public.orders
  where id = p_order_id
  limit 1;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if not public.current_app_user_has_current_company()
    or v_company_id is null
    or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order_operational_input_company_scope_denied' using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(v_order.id) then
    raise exception 'order_operational_input_read_denied' using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order_operational_input_create_denied' using errcode = '42501';
  end if;

  v_expires_at := case v_input_type
    when 'inspection_scheduled' then v_created_at + interval '7 days'
    when 'report_on_track' then v_created_at + interval '48 hours'
    when 'waiting_on_client' then v_created_at + interval '72 hours'
  end;

  select r.name
    into v_actor_role
  from public.user_role_assignments ura
  join public.roles r on r.id = ura.role_id
  where ura.user_id = v_actor_user_id
    and ura.company_id = v_company_id
    and ura.status = 'active'
    and (ura.expires_at is null or ura.expires_at > now())
  order by
    ura.is_primary desc,
    case lower(btrim(r.name))
      when 'owner' then 1
      when 'admin' then 2
      when 'reviewer' then 3
      when 'appraiser' then 4
      else 99
    end,
    r.name
  limit 1;

  insert into public.order_operational_inputs (
    company_id,
    order_id,
    input_type,
    actor_user_id,
    actor_role,
    actor_context,
    note,
    payload,
    source,
    created_at,
    expires_at
  )
  values (
    v_company_id,
    v_order.id,
    v_input_type,
    v_actor_user_id,
    v_actor_role,
    jsonb_build_object('role', v_actor_role),
    v_note,
    v_payload,
    v_source,
    v_created_at,
    v_expires_at
  )
  returning * into v_row;

  select * into v_actor from public._activity_actor();

  if v_auth_uid is not null then
    select p.id
      into v_legacy_profile_id
    from public.profiles_legacy p
    where p.id = v_auth_uid
    limit 1;
  end if;

  v_message := case v_input_type
    when 'inspection_scheduled' then 'Inspection scheduled.'
    when 'report_on_track' then 'Report marked on track.'
    when 'waiting_on_client' then 'Waiting on client response.'
  end;

  insert into public.activity_log (
    order_id,
    company_id,
    event_type,
    message,
    detail,
    actor_user_id,
    actor_id,
    created_by,
    created_by_name,
    created_by_email
  )
  values (
    v_order.id,
    v_company_id,
    'order_operational_input.created',
    v_message,
    jsonb_build_object(
      'operational_input_id', v_row.id,
      'input_type', v_input_type,
      'source', v_source,
      'expires_at', v_expires_at,
      'note', v_note,
      'payload', v_payload
    ),
    v_actor_user_id,
    v_auth_uid,
    v_legacy_profile_id,
    v_actor.full_name,
    v_actor.email
  );

  return v_row;
end;
$$;

comment on function public.rpc_order_operational_input_create(uuid, text, text, jsonb, text) is
  'Creates manual, non-authoritative operational evidence for an order and logs activity.';

drop function if exists public.rpc_order_operational_input_clear(uuid, text);

create or replace function public.rpc_order_operational_input_clear(
  p_input_id uuid,
  p_note text default null
)
returns public.order_operational_inputs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_auth_uid uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_input public.order_operational_inputs;
  v_order public.orders;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_actor record;
  v_legacy_profile_id uuid;
  v_row public.order_operational_inputs;
  v_can_update_order boolean := false;
  v_label text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found' using errcode = 'P0001';
  end if;

  if p_input_id is null then
    raise exception 'operational_input_id_required' using errcode = '22023';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'operational_input_note_too_long' using errcode = '22023';
  end if;

  select *
    into v_input
  from public.order_operational_inputs
  where id = p_input_id
  for update;

  if not found then
    raise exception 'operational_input_not_found' using errcode = 'P0002';
  end if;

  select *
    into v_order
  from public.orders
  where id = v_input.order_id
  limit 1;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if not public.current_app_user_has_current_company()
    or v_company_id is null
    or v_input.company_id <> v_company_id
    or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order_operational_input_company_scope_denied' using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(v_order.id) then
    raise exception 'order_operational_input_read_denied' using errcode = '42501';
  end if;

  v_can_update_order := public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  );

  if v_input.actor_user_id <> v_actor_user_id and not v_can_update_order then
    raise exception 'order_operational_input_clear_denied' using errcode = '42501';
  end if;

  if v_input.cleared_at is not null then
    raise exception 'operational_input_already_cleared' using errcode = '22023';
  end if;

  update public.order_operational_inputs
  set
    cleared_at = now(),
    cleared_by_user_id = v_actor_user_id
  where id = v_input.id
  returning * into v_row;

  select * into v_actor from public._activity_actor();

  if v_auth_uid is not null then
    select p.id
      into v_legacy_profile_id
    from public.profiles_legacy p
    where p.id = v_auth_uid
    limit 1;
  end if;

  v_label := case v_input.input_type
    when 'inspection_scheduled' then 'Inspection scheduled'
    when 'report_on_track' then 'Report on track'
    when 'waiting_on_client' then 'Waiting on client response'
    else v_input.input_type
  end;

  insert into public.activity_log (
    order_id,
    company_id,
    event_type,
    message,
    detail,
    actor_user_id,
    actor_id,
    created_by,
    created_by_name,
    created_by_email
  )
  values (
    v_order.id,
    v_company_id,
    'order_operational_input.cleared',
    'Operational status cleared: ' || v_label || '.',
    jsonb_build_object(
      'operational_input_id', v_row.id,
      'input_type', v_row.input_type,
      'cleared_at', v_row.cleared_at,
      'clear_note', v_note
    ),
    v_actor_user_id,
    v_auth_uid,
    v_legacy_profile_id,
    v_actor.full_name,
    v_actor.email
  );

  return v_row;
end;
$$;

comment on function public.rpc_order_operational_input_clear(uuid, text) is
  'Clears manual operational evidence without deleting evidence or mutating order lifecycle state.';

revoke all privileges on function public.rpc_order_operational_input_create(uuid, text, text, jsonb, text)
  from public, anon, authenticated, service_role;
grant execute on function public.rpc_order_operational_input_create(uuid, text, text, jsonb, text)
  to authenticated;

revoke all privileges on function public.rpc_order_operational_input_clear(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.rpc_order_operational_input_clear(uuid, text)
  to authenticated;

commit;
