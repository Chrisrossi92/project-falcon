begin;

create table if not exists public.vendor_profile_update_requests (
  id uuid primary key default gen_random_uuid(),
  request_key text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  owner_company_id uuid not null references public.companies(id) on delete cascade,
  vendor_company_id uuid not null references public.companies(id) on delete cascade,
  relationship_id uuid not null references public.company_relationships(id) on delete cascade,
  vendor_profile_id uuid not null references public.company_vendor_profiles(id) on delete cascade,
  submitted_by_user_id uuid not null references public.users(id) on delete restrict,
  status text not null default 'pending',
  request_payload jsonb not null default '{}'::jsonb,
  current_snapshot jsonb not null default '{}'::jsonb,
  reviewer_message text null,
  reviewed_by_user_id uuid null references public.users(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_profile_update_requests_request_key_unique unique (request_key),
  constraint vendor_profile_update_requests_status_check
    check (status in ('pending', 'reviewing', 'approved', 'rejected', 'cancelled')),
  constraint vendor_profile_update_requests_payload_object
    check (jsonb_typeof(request_payload) = 'object'),
  constraint vendor_profile_update_requests_snapshot_object
    check (jsonb_typeof(current_snapshot) = 'object')
);

create index if not exists idx_vendor_profile_update_requests_vendor_status
  on public.vendor_profile_update_requests (vendor_company_id, status, created_at desc);

create index if not exists idx_vendor_profile_update_requests_owner_status
  on public.vendor_profile_update_requests (owner_company_id, status, created_at desc);

create index if not exists idx_vendor_profile_update_requests_profile
  on public.vendor_profile_update_requests (vendor_profile_id, created_at desc);

create or replace function public.tg_vendor_profile_update_requests_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_vendor_profile_update_requests_touch_updated_at
  on public.vendor_profile_update_requests;
create trigger trg_vendor_profile_update_requests_touch_updated_at
before update on public.vendor_profile_update_requests
for each row execute function public.tg_vendor_profile_update_requests_touch_updated_at();

alter table public.vendor_profile_update_requests enable row level security;
revoke all privileges on table public.vendor_profile_update_requests from public, anon, authenticated;
grant all privileges on table public.vendor_profile_update_requests to service_role;

comment on table public.vendor_profile_update_requests is
  'AMC-11D internal review queue for vendor-submitted profile and coverage update requests. Vendor Workspace inserts pending requests only; live vendor profile, contact, coverage, relationship, pricing, and compliance document rows are not mutated by this table.';

comment on column public.vendor_profile_update_requests.request_key is
  'Opaque request key safe for Vendor Workspace display. Raw request id, vendor_profile_id, relationship_id, and company ids are never returned to vendors.';

create or replace function public.rpc_vendor_workspace_submit_profile_update_request(
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_vendor_company public.companies%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_field_errors jsonb := '{}'::jsonb;
  v_contact_changes jsonb := '{}'::jsonb;
  v_company_changes jsonb := '{}'::jsonb;
  v_coverage_changes jsonb := '{}'::jsonb;
  v_accepted_work_types jsonb := '{}'::jsonb;
  v_comments text := null;
  v_request_payload jsonb;
  v_snapshot jsonb;
  v_request_key text;
  v_recipient_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_vendor_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_profile.update') then
    raise exception 'vendor_profile_update_permission_required'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) is distinct from 'object' then
    return jsonb_build_object(
      'ok', false,
      'error', 'profile_update_request_invalid',
      'field_errors', jsonb_build_object('payload', 'Request payload must be an object.')
    );
  end if;

  select *
    into v_vendor_company
    from public.companies c
   where c.id = v_vendor_company_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'vendor_profile_unavailable');
  end if;

  select cvp.*
    into v_profile
    from public.company_vendor_profiles cvp
    join public.company_relationships cr
      on cr.id = cvp.relationship_id
     and cr.source_company_id = cvp.owner_company_id
     and cr.target_company_id = cvp.vendor_company_id
   where cvp.vendor_company_id = v_vendor_company_id
     and cvp.vendor_status not in ('inactive', 'do_not_use')
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
   order by cvp.updated_at desc, cvp.created_at desc
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'vendor_profile_unavailable');
  end if;

  select *
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_profile.relationship_id
     and cr.source_company_id = v_profile.owner_company_id
     and cr.target_company_id = v_profile.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'vendor_profile_unavailable');
  end if;

  if v_payload ? 'contact_changes' then
    if jsonb_typeof(v_payload -> 'contact_changes') = 'object' then
      v_contact_changes := v_payload -> 'contact_changes';
    else
      v_field_errors := v_field_errors || jsonb_build_object('contact_changes', 'Contact changes must be an object.');
    end if;
  end if;

  if v_payload ? 'company_changes' then
    if jsonb_typeof(v_payload -> 'company_changes') = 'object' then
      v_company_changes := v_payload -> 'company_changes';
    else
      v_field_errors := v_field_errors || jsonb_build_object('company_changes', 'Company changes must be an object.');
    end if;
  end if;

  if v_payload ? 'coverage_changes' then
    if jsonb_typeof(v_payload -> 'coverage_changes') = 'object' then
      v_coverage_changes := v_payload -> 'coverage_changes';
    else
      v_field_errors := v_field_errors || jsonb_build_object('coverage_changes', 'Coverage changes must be an object.');
    end if;
  end if;

  if v_payload ? 'accepted_work_types' then
    if jsonb_typeof(v_payload -> 'accepted_work_types') = 'object' then
      v_accepted_work_types := v_payload -> 'accepted_work_types';
    else
      v_field_errors := v_field_errors || jsonb_build_object('accepted_work_types', 'Accepted work types must be an object.');
    end if;
  end if;

  v_comments := nullif(btrim(coalesce(v_payload ->> 'comments', v_payload ->> 'explanation', '')), '');
  if v_comments is not null and length(v_comments) > 2000 then
    v_field_errors := v_field_errors || jsonb_build_object('comments', 'Comments must be 2,000 characters or fewer.');
  end if;

  if v_field_errors <> '{}'::jsonb then
    return jsonb_build_object(
      'ok', false,
      'error', 'profile_update_request_invalid',
      'field_errors', v_field_errors
    );
  end if;

  v_request_payload := jsonb_strip_nulls(jsonb_build_object(
    'contact_changes', case when v_contact_changes = '{}'::jsonb then null else v_contact_changes end,
    'company_changes', case when v_company_changes = '{}'::jsonb then null else v_company_changes end,
    'coverage_changes', case when v_coverage_changes = '{}'::jsonb then null else v_coverage_changes end,
    'accepted_work_types', case when v_accepted_work_types = '{}'::jsonb then null else v_accepted_work_types end,
    'comments', v_comments
  ));

  if v_request_payload = '{}'::jsonb then
    return jsonb_build_object(
      'ok', false,
      'error', 'profile_update_request_invalid',
      'field_errors', jsonb_build_object('request', 'Add at least one proposed change or explanation.')
    );
  end if;

  v_snapshot := jsonb_build_object(
    'company', jsonb_build_object(
      'name', v_vendor_company.name,
      'public_phone', v_profile.public_phone,
      'website', v_profile.website
    ),
    'status', jsonb_build_object(
      'vendor_status', v_profile.vendor_status,
      'relationship_status', v_relationship.status
    ),
    'default_turn_time_days', coalesce(
      nullif(v_profile.capabilities ->> 'default_turn_time_days', ''),
      nullif(v_profile.capabilities ->> 'defaultTurnTimeDays', ''),
      nullif(v_profile.product_eligibility ->> 'default_turn_time_days', ''),
      nullif(v_profile.product_eligibility ->> 'defaultTurnTimeDays', '')
    )
  );

  insert into public.vendor_profile_update_requests (
    owner_company_id,
    vendor_company_id,
    relationship_id,
    vendor_profile_id,
    submitted_by_user_id,
    status,
    request_payload,
    current_snapshot
  ) values (
    v_profile.owner_company_id,
    v_profile.vendor_company_id,
    v_profile.relationship_id,
    v_profile.id,
    v_actor_user_id,
    'pending',
    v_request_payload,
    v_snapshot
  )
  returning request_key into v_request_key;

  for v_recipient_id in
    select distinct cm.user_id
      from public.company_memberships cm
      join public.user_roles ur
        on ur.user_id = cm.user_id
       and lower(ur.role) in ('owner', 'admin')
     where cm.company_id = v_profile.owner_company_id
       and cm.status = 'active'
       and cm.user_id is distinct from v_actor_user_id
  loop
    insert into public.notifications (
      user_id,
      company_id,
      type,
      category,
      title,
      body,
      message,
      is_read,
      read,
      created_at,
      link_path,
      payload,
      priority
    ) values (
      v_recipient_id,
      v_profile.owner_company_id,
      'vendor.profile_update_requested',
      'vendor_profile',
      'Vendor profile update requested',
      v_vendor_company.name,
      v_vendor_company.name,
      false,
      false,
      now(),
      '/vendors',
      jsonb_build_object(
        'source_type', 'vendor_profile_update_request',
        'event_key', 'vendor.profile_update_requested',
        'vendor_company_name', v_vendor_company.name,
        'request_key', v_request_key
      ),
      'normal'
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'request', jsonb_build_object(
      'request_key', v_request_key,
      'status', 'pending',
      'submitted_at', now(),
      'proposed_changes', v_request_payload
    )
  );
end;
$$;

create or replace function public.rpc_vendor_workspace_profile_update_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_requests jsonb := '[]'::jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_vendor_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_profile.update') then
    raise exception 'vendor_profile_update_permission_required'
      using errcode = '42501';
  end if;

  with scoped_profile as (
    select cvp.id as vendor_profile_id
      from public.company_vendor_profiles cvp
      join public.company_relationships cr
        on cr.id = cvp.relationship_id
       and cr.source_company_id = cvp.owner_company_id
       and cr.target_company_id = cvp.vendor_company_id
     where cvp.vendor_company_id = v_vendor_company_id
       and cvp.vendor_status not in ('inactive', 'do_not_use')
       and cr.relationship_type = 'amc_vendor'
       and cr.status = 'active'
     order by cvp.updated_at desc, cvp.created_at desc
     limit 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'request_key', vpur.request_key,
        'status', vpur.status,
        'submitted_at', vpur.created_at,
        'updated_at', vpur.updated_at,
        'reviewed_at', vpur.reviewed_at,
        'reviewer_message', vpur.reviewer_message,
        'proposed_changes', vpur.request_payload
      )
      order by vpur.created_at desc
    ),
    '[]'::jsonb
  )
    into v_requests
    from public.vendor_profile_update_requests vpur
    join scoped_profile sp
      on sp.vendor_profile_id = vpur.vendor_profile_id
   where vpur.vendor_company_id = v_vendor_company_id
   limit 20;

  return jsonb_build_object(
    'ok', true,
    'requests', coalesce(v_requests, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_submit_profile_update_request(jsonb) from public, anon;
revoke all on function public.rpc_vendor_workspace_profile_update_requests() from public, anon;
grant execute on function public.rpc_vendor_workspace_submit_profile_update_request(jsonb) to authenticated, service_role;
grant execute on function public.rpc_vendor_workspace_profile_update_requests() to authenticated, service_role;

comment on function public.rpc_vendor_workspace_submit_profile_update_request(jsonb) is
  'AMC-11D authenticated Vendor Workspace profile/coverage update request submit RPC. Requires vendor_profile.update, current-company vendor scope, and an active AMC vendor relationship/profile. Inserts a pending review request and notifies internal owner/admin users. It does not mutate live company_vendor_profiles, vendor_contacts, vendor_service_areas, company_relationships, pricing, margins, compliance documents, owner-side APIs, or internal notes.';

comment on function public.rpc_vendor_workspace_profile_update_requests() is
  'AMC-11D authenticated Vendor Workspace profile/coverage update request history RPC. Requires vendor_profile.update, current-company vendor scope, and an active AMC vendor relationship/profile. Returns opaque request keys and vendor-safe status/proposed change summaries only; no raw ids, internal notes, pricing, margins, owner-side APIs, or compliance document data.';

commit;
