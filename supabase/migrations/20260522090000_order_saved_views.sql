begin;

create extension if not exists "pgcrypto";

create table if not exists public.order_saved_views (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  filters jsonb not null,
  sort_order integer,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_saved_views_name_not_blank check (length(btrim(name)) > 0),
  constraint order_saved_views_filters_object check (jsonb_typeof(filters) = 'object')
);

create index if not exists idx_order_saved_views_company_user_order
  on public.order_saved_views (company_id, user_id, sort_order, created_at);

create unique index if not exists order_saved_views_one_default_per_user_company
  on public.order_saved_views (company_id, user_id)
  where is_default = true;

alter table public.order_saved_views enable row level security;

revoke all on table public.order_saved_views from public, anon, authenticated;
grant all privileges on table public.order_saved_views to service_role;

create or replace function public.order_saved_view_validate_filters(p_filters jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_filters jsonb := p_filters;
  v_allowed_keys text[] := array[
    'status',
    'q',
    'clientId',
    'appraiserId',
    'reviewerId',
    'due',
    'queue',
    'pageSize'
  ];
  v_status_values text[] := array[
    'new',
    'in_progress',
    'in_review',
    'needs_revisions',
    'review_cleared',
    'pending_final_approval',
    'ready_for_client',
    'completed'
  ];
  v_due_values text[] := array[
    'overdue',
    'this_week',
    'next_week'
  ];
  v_queue_values text[] := array[
    'due_soon',
    'overdue',
    'stuck_orders',
    'waiting_on_reviewer',
    'waiting_on_appraiser',
    'inspection_complete_report_not_started',
    'final_approval_queue',
    'ready_for_delivery',
    'reviewer_overload',
    'appraiser_overload',
    'unassigned_orders',
    'revision_loop_risk'
  ];
  v_key text;
  v_value jsonb;
  v_text text;
  v_int integer;
  v_normalized jsonb := '{}'::jsonb;
begin
  if v_filters is null or jsonb_typeof(v_filters) <> 'object' then
    raise exception 'saved_view_filters_must_be_object'
      using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(v_filters)
  loop
    if v_key = 'page' then
      raise exception 'saved_view_filter_page_not_allowed'
        using errcode = '22023';
    end if;

    if v_key in (
      'includeArchived',
      'includeRetiredLifecycle',
      'includeCancelled',
      'includeCanceled',
      'includeVoided',
      'archived',
      'isArchived',
      'historical',
      'admin',
      'adminMode',
      'assignedAppraiserId',
      'inspectedAwaitingReport',
      'finalDueWithinDays',
      'from',
      'to',
      'mode',
      'scope',
      'rowsOverride',
      'priority'
    ) then
      raise exception 'saved_view_filter_not_allowed: %', v_key
        using errcode = '22023';
    end if;

    if not (v_key = any(v_allowed_keys)) then
      raise exception 'saved_view_filter_unknown_key: %', v_key
        using errcode = '22023';
    end if;

    v_value := v_filters -> v_key;
    if v_value = 'null'::jsonb then
      continue;
    end if;

    case v_key
      when 'status' then
        if jsonb_typeof(v_value) <> 'string' then
          raise exception 'saved_view_status_must_be_string'
            using errcode = '22023';
        end if;
        v_text := lower(btrim(v_value #>> '{}'));
        if v_text = '' then
          continue;
        end if;
        if not (v_text = any(v_status_values)) then
          raise exception 'saved_view_status_not_allowed'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'q' then
        if jsonb_typeof(v_value) <> 'string' then
          raise exception 'saved_view_q_must_be_string'
            using errcode = '22023';
        end if;
        v_text := btrim(v_value #>> '{}');
        if v_text = '' then
          continue;
        end if;
        if length(v_text) > 200 then
          raise exception 'saved_view_q_too_long'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'clientId' then
        if jsonb_typeof(v_value) not in ('string', 'number') then
          raise exception 'saved_view_client_id_must_be_scalar'
            using errcode = '22023';
        end if;
        v_text := btrim(v_value #>> '{}');
        if v_text = '' then
          continue;
        end if;
        if v_text !~ '^[0-9]+$' then
          raise exception 'saved_view_client_id_must_be_numeric'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'appraiserId', 'reviewerId' then
        if jsonb_typeof(v_value) <> 'string' then
          raise exception 'saved_view_user_filter_must_be_uuid_string'
            using errcode = '22023';
        end if;
        v_text := lower(btrim(v_value #>> '{}'));
        if v_text = '' then
          continue;
        end if;
        if v_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          raise exception 'saved_view_user_filter_must_be_uuid_string'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'due' then
        if jsonb_typeof(v_value) not in ('string', 'number') then
          raise exception 'saved_view_due_must_be_scalar'
            using errcode = '22023';
        end if;
        v_text := lower(btrim(v_value #>> '{}'));
        if v_text = '' then
          continue;
        end if;
        if not (v_text = any(v_due_values)) and v_text !~ '^[0-9]+$' then
          raise exception 'saved_view_due_not_allowed'
            using errcode = '22023';
        end if;
        if v_text ~ '^[0-9]+$' then
          v_int := v_text::integer;
          if v_int < 1 or v_int > 365 then
            raise exception 'saved_view_due_window_out_of_range'
              using errcode = '22023';
          end if;
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'queue' then
        if jsonb_typeof(v_value) <> 'string' then
          raise exception 'saved_view_queue_must_be_string'
            using errcode = '22023';
        end if;
        v_text := lower(btrim(v_value #>> '{}'));
        if v_text = '' then
          continue;
        end if;
        if not (v_text = any(v_queue_values)) then
          raise exception 'saved_view_queue_not_allowed'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'pageSize' then
        if jsonb_typeof(v_value) not in ('string', 'number') then
          raise exception 'saved_view_page_size_must_be_scalar'
            using errcode = '22023';
        end if;
        v_text := btrim(v_value #>> '{}');
        if v_text = '' then
          continue;
        end if;
        if v_text !~ '^[0-9]+$' then
          raise exception 'saved_view_page_size_must_be_integer'
            using errcode = '22023';
        end if;
        v_int := v_text::integer;
        if v_int < 1 or v_int > 200 then
          raise exception 'saved_view_page_size_out_of_range'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_int);
    end case;
  end loop;

  return v_normalized;
end;
$$;

create or replace function public.order_saved_view_trim_name(p_name text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_name = '' then
    raise exception 'saved_view_name_required'
      using errcode = '22023';
  end if;

  if length(v_name) > 80 then
    raise exception 'saved_view_name_too_long'
      using errcode = '22023';
  end if;

  return v_name;
end;
$$;

create or replace function public.rpc_order_saved_views_list()
returns table (
  id uuid,
  company_id uuid,
  user_id uuid,
  name text,
  filters jsonb,
  sort_order integer,
  is_default boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_app_uid uuid := public.current_app_user_id();
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  return query
  select
    osv.id,
    osv.company_id,
    osv.user_id,
    osv.name,
    osv.filters,
    osv.sort_order,
    osv.is_default,
    osv.created_at,
    osv.updated_at
  from public.order_saved_views osv
  where osv.company_id = v_company_id
    and osv.user_id = v_app_uid
  order by
    osv.sort_order nulls last,
    osv.created_at,
    osv.name,
    osv.id;
end;
$$;

create or replace function public.rpc_order_saved_view_create(
  p_name text,
  p_filters jsonb
)
returns table (
  id uuid,
  company_id uuid,
  user_id uuid,
  name text,
  filters jsonb,
  sort_order integer,
  is_default boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_app_uid uuid := public.current_app_user_id();
  v_name text;
  v_filters jsonb;
  v_sort_order integer;
  v_row public.order_saved_views%rowtype;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  v_name := public.order_saved_view_trim_name(p_name);
  v_filters := public.order_saved_view_validate_filters(p_filters);

  select coalesce(max(osv.sort_order), 0) + 1
    into v_sort_order
    from public.order_saved_views osv
   where osv.company_id = v_company_id
     and osv.user_id = v_app_uid;

  insert into public.order_saved_views (
    company_id,
    user_id,
    name,
    filters,
    sort_order
  )
  values (
    v_company_id,
    v_app_uid,
    v_name,
    v_filters,
    v_sort_order
  )
  returning * into v_row;

  return query
  select
    v_row.id,
    v_row.company_id,
    v_row.user_id,
    v_row.name,
    v_row.filters,
    v_row.sort_order,
    v_row.is_default,
    v_row.created_at,
    v_row.updated_at;
end;
$$;

create or replace function public.rpc_order_saved_view_update(
  p_view_id uuid,
  p_name text,
  p_filters jsonb
)
returns table (
  id uuid,
  company_id uuid,
  user_id uuid,
  name text,
  filters jsonb,
  sort_order integer,
  is_default boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_app_uid uuid := public.current_app_user_id();
  v_name text;
  v_filters jsonb;
  v_row public.order_saved_views%rowtype;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if p_view_id is null then
    raise exception 'saved_view_id_required'
      using errcode = '22023';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  v_name := public.order_saved_view_trim_name(p_name);
  v_filters := public.order_saved_view_validate_filters(p_filters);

  update public.order_saved_views osv
     set name = v_name,
         filters = v_filters,
         updated_at = now()
   where osv.id = p_view_id
     and osv.company_id = v_company_id
     and osv.user_id = v_app_uid
  returning * into v_row;

  if not found then
    raise exception 'saved_view_not_found'
      using errcode = '42501';
  end if;

  return query
  select
    v_row.id,
    v_row.company_id,
    v_row.user_id,
    v_row.name,
    v_row.filters,
    v_row.sort_order,
    v_row.is_default,
    v_row.created_at,
    v_row.updated_at;
end;
$$;

create or replace function public.rpc_order_saved_view_delete(
  p_view_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_app_uid uuid := public.current_app_user_id();
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if p_view_id is null then
    raise exception 'saved_view_id_required'
      using errcode = '22023';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  delete from public.order_saved_views osv
   where osv.id = p_view_id
     and osv.company_id = v_company_id
     and osv.user_id = v_app_uid;

  if not found then
    raise exception 'saved_view_not_found'
      using errcode = '42501';
  end if;

  return true;
end;
$$;

revoke all privileges on function public.order_saved_view_validate_filters(jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.order_saved_view_trim_name(text) from public, anon, authenticated, service_role;

revoke all privileges on function public.rpc_order_saved_views_list() from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_order_saved_view_create(text, jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_order_saved_view_update(uuid, text, jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_order_saved_view_delete(uuid) from public, anon, authenticated, service_role;

grant execute on function public.rpc_order_saved_views_list() to authenticated;
grant execute on function public.rpc_order_saved_view_create(text, jsonb) to authenticated;
grant execute on function public.rpc_order_saved_view_update(uuid, text, jsonb) to authenticated;
grant execute on function public.rpc_order_saved_view_delete(uuid) to authenticated;

comment on table public.order_saved_views is
  'Saved Views Slice 1D backend-owned personal Orders saved views. Browser access is RPC-owned only; rows are scoped to current company and current app user.';

comment on function public.order_saved_view_validate_filters(jsonb) is
  'Saved Views Slice 1D internal validation helper. Accepts only allowlisted active Orders filter keys and rejects hidden, historical/admin, mutation, and query-fragment state.';

comment on function public.rpc_order_saved_views_list() is
  'Saved Views Slice 1D list RPC. Returns current-company, current-app-user saved Orders views with allowlisted filter payloads only.';

comment on function public.rpc_order_saved_view_create(text, jsonb) is
  'Saved Views Slice 1D create RPC. Creates a current-company, current-app-user saved Orders view after name and filter allowlist validation.';

comment on function public.rpc_order_saved_view_update(uuid, text, jsonb) is
  'Saved Views Slice 1D update RPC. Updates name and filters only for a saved Orders view owned by the current app user in the current company.';

comment on function public.rpc_order_saved_view_delete(uuid) is
  'Saved Views Slice 1D delete RPC. Deletes a saved Orders view owned by the current app user in the current company.';

commit;
