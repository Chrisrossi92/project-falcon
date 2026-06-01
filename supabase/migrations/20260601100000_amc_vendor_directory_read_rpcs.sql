begin;

drop function if exists public.rpc_vendor_directory_list(text, text);
create or replace function public.rpc_vendor_directory_list(
  p_status text default null,
  p_query text default null
)
returns table (
  vendor_profile_id uuid,
  vendor_company_id uuid,
  vendor_company_name text,
  vendor_status text,
  relationship_id uuid,
  relationship_status text,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  service_area_summary jsonb,
  product_eligibility jsonb,
  tags text[],
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_query text := lower(nullif(btrim(coalesce(p_query, '')), ''));
begin
  if v_actor_user_id is null then
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

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('relationships.read') then
    raise exception 'vendor_directory_read_permission_required'
      using errcode = '42501';
  end if;

  return query
  with vendor_rows as (
    select
      cvp.id as row_vendor_profile_id,
      cvp.vendor_company_id as row_vendor_company_id,
      vc.name as row_vendor_company_name,
      cvp.vendor_status as row_vendor_status,
      cvp.relationship_id as row_relationship_id,
      cr.status as row_relationship_status,
      pc.name as row_primary_contact_name,
      pc.email as row_primary_contact_email,
      pc.phone as row_primary_contact_phone,
      jsonb_build_object(
        'active_count', coalesce(sa.active_count, 0),
        'states', coalesce(sa.states, '[]'::jsonb),
        'counties', coalesce(sa.counties, '[]'::jsonb),
        'zips', coalesce(sa.zips, '[]'::jsonb),
        'markets', coalesce(sa.markets, '[]'::jsonb),
        'product_types', coalesce(sa.product_types, '[]'::jsonb)
      ) as row_service_area_summary,
      cvp.product_eligibility as row_product_eligibility,
      cvp.tags as row_tags,
      greatest(
        cvp.updated_at,
        coalesce(pc.updated_at, cvp.updated_at),
        coalesce(sa.max_updated_at, cvp.updated_at)
      ) as row_updated_at
    from public.company_vendor_profiles cvp
    join public.companies vc
      on vc.id = cvp.vendor_company_id
    left join public.company_relationships cr
      on cr.id = cvp.relationship_id
     and cr.source_company_id = cvp.owner_company_id
     and cr.target_company_id = cvp.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
    left join lateral (
      select
        vcon.name,
        vcon.email,
        vcon.phone,
        vcon.updated_at
      from public.vendor_contacts vcon
      where vcon.vendor_profile_id = cvp.id
        and vcon.is_primary is true
      order by vcon.updated_at desc, vcon.name asc
      limit 1
    ) pc on true
    left join lateral (
      select
        count(*)::integer as active_count,
        max(vsa.updated_at) as max_updated_at,
        coalesce(
          (
            select jsonb_agg(s.state order by s.state)
            from (
              select distinct vsa_state.state
              from public.vendor_service_areas vsa_state
              where vsa_state.vendor_profile_id = cvp.id
                and vsa_state.status = 'active'
                and nullif(btrim(vsa_state.state), '') is not null
            ) s
          ),
          '[]'::jsonb
        ) as states,
        coalesce(
          (
            select jsonb_agg(c.county order by c.county)
            from (
              select distinct vsa_county.county
              from public.vendor_service_areas vsa_county
              where vsa_county.vendor_profile_id = cvp.id
                and vsa_county.status = 'active'
                and nullif(btrim(vsa_county.county), '') is not null
            ) c
          ),
          '[]'::jsonb
        ) as counties,
        coalesce(
          (
            select jsonb_agg(z.zip order by z.zip)
            from (
              select distinct vsa_zip.zip
              from public.vendor_service_areas vsa_zip
              where vsa_zip.vendor_profile_id = cvp.id
                and vsa_zip.status = 'active'
                and nullif(btrim(vsa_zip.zip), '') is not null
            ) z
          ),
          '[]'::jsonb
        ) as zips,
        coalesce(
          (
            select jsonb_agg(m.market order by m.market)
            from (
              select distinct vsa_market.market
              from public.vendor_service_areas vsa_market
              where vsa_market.vendor_profile_id = cvp.id
                and vsa_market.status = 'active'
                and nullif(btrim(vsa_market.market), '') is not null
            ) m
          ),
          '[]'::jsonb
        ) as markets,
        coalesce(
          (
            select jsonb_agg(p.product_type order by p.product_type)
            from (
              select distinct vsa_product.product_type
              from public.vendor_service_areas vsa_product
              where vsa_product.vendor_profile_id = cvp.id
                and vsa_product.status = 'active'
                and nullif(btrim(vsa_product.product_type), '') is not null
            ) p
          ),
          '[]'::jsonb
        ) as product_types
      from public.vendor_service_areas vsa
      where vsa.vendor_profile_id = cvp.id
        and vsa.status = 'active'
    ) sa on true
    where cvp.owner_company_id = v_company_id
      and (v_status is null or lower(cvp.vendor_status) = v_status)
      and (
        v_query is null
        or lower(vc.name) like '%' || v_query || '%'
        or lower(coalesce(pc.name, '')) like '%' || v_query || '%'
        or lower(coalesce(pc.email, '')) like '%' || v_query || '%'
        or exists (
          select 1
            from unnest(cvp.tags) tag
           where lower(tag) like '%' || v_query || '%'
        )
        or exists (
          select 1
            from public.vendor_service_areas vsa_query
           where vsa_query.vendor_profile_id = cvp.id
             and (
               lower(coalesce(vsa_query.county, '')) like '%' || v_query || '%'
               or lower(coalesce(vsa_query.zip, '')) like '%' || v_query || '%'
               or lower(coalesce(vsa_query.market, '')) like '%' || v_query || '%'
               or lower(coalesce(vsa_query.product_type, '')) like '%' || v_query || '%'
             )
        )
      )
  )
  select
    vr.row_vendor_profile_id,
    vr.row_vendor_company_id,
    vr.row_vendor_company_name,
    vr.row_vendor_status,
    vr.row_relationship_id,
    vr.row_relationship_status,
    vr.row_primary_contact_name,
    vr.row_primary_contact_email,
    vr.row_primary_contact_phone,
    vr.row_service_area_summary,
    vr.row_product_eligibility,
    vr.row_tags,
    vr.row_updated_at
  from vendor_rows vr
  order by vr.row_vendor_company_name asc, vr.row_updated_at desc;
end;
$$;

drop function if exists public.rpc_vendor_profile_detail(uuid);
create or replace function public.rpc_vendor_profile_detail(
  p_vendor_profile_id uuid
)
returns table (
  vendor_profile_id uuid,
  owner_company_id uuid,
  vendor_company_id uuid,
  vendor_company_name text,
  vendor_company_type text,
  relationship_id uuid,
  relationship_status text,
  relationship_type text,
  vendor_status text,
  website text,
  primary_address jsonb,
  public_phone text,
  default_assignment_instructions text,
  capabilities jsonb,
  product_eligibility jsonb,
  internal_notes text,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
begin
  if v_actor_user_id is null then
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

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('relationships.read') then
    raise exception 'vendor_directory_read_permission_required'
      using errcode = '42501';
  end if;

  return query
  select
    cvp.id,
    cvp.owner_company_id,
    cvp.vendor_company_id,
    vc.name,
    vc.company_type,
    cvp.relationship_id,
    cr.status,
    cr.relationship_type,
    cvp.vendor_status,
    cvp.website,
    cvp.primary_address,
    cvp.public_phone,
    cvp.default_assignment_instructions,
    cvp.capabilities,
    cvp.product_eligibility,
    cvp.internal_notes,
    cvp.tags,
    cvp.created_at,
    cvp.updated_at
  from public.company_vendor_profiles cvp
  join public.companies vc
    on vc.id = cvp.vendor_company_id
  left join public.company_relationships cr
    on cr.id = cvp.relationship_id
   and cr.source_company_id = cvp.owner_company_id
   and cr.target_company_id = cvp.vendor_company_id
   and cr.relationship_type = 'amc_vendor'
  where cvp.id = p_vendor_profile_id
    and cvp.owner_company_id = v_company_id;

  if not found then
    raise exception 'vendor_profile_not_found_or_not_authorized'
      using errcode = '42501';
  end if;
end;
$$;

drop function if exists public.rpc_vendor_profile_contacts(uuid);
create or replace function public.rpc_vendor_profile_contacts(
  p_vendor_profile_id uuid
)
returns table (
  vendor_contact_id uuid,
  vendor_profile_id uuid,
  user_id uuid,
  linked_user_display_name text,
  name text,
  email text,
  phone text,
  role_label text,
  is_primary boolean,
  receives_assignment_notifications boolean,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
begin
  if v_actor_user_id is null then
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

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('relationships.read') then
    raise exception 'vendor_directory_read_permission_required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.company_vendor_profiles cvp
     where cvp.id = p_vendor_profile_id
       and cvp.owner_company_id = v_company_id
  ) then
    raise exception 'vendor_profile_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  return query
  select
    vc.id,
    vc.vendor_profile_id,
    vc.user_id,
    coalesce(
      nullif(up.display_name, ''),
      nullif(up.full_name, ''),
      nullif(up.name, ''),
      nullif(u.display_name, ''),
      nullif(u.full_name, ''),
      nullif(u.name, ''),
      u.email
    ) as linked_user_display_name,
    vc.name,
    vc.email,
    vc.phone,
    vc.role_label,
    vc.is_primary,
    vc.receives_assignment_notifications,
    vc.notes,
    vc.created_at,
    vc.updated_at
  from public.vendor_contacts vc
  left join public.user_profiles up
    on up.user_id = vc.user_id
  left join public.users u
    on u.id = vc.user_id
  where vc.vendor_profile_id = p_vendor_profile_id
  order by vc.is_primary desc, vc.name asc;
end;
$$;

drop function if exists public.rpc_vendor_profile_service_areas(uuid);
create or replace function public.rpc_vendor_profile_service_areas(
  p_vendor_profile_id uuid
)
returns table (
  vendor_service_area_id uuid,
  vendor_profile_id uuid,
  state text,
  county text,
  zip text,
  market text,
  radius_miles numeric,
  product_type text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
begin
  if v_actor_user_id is null then
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

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('relationships.read') then
    raise exception 'vendor_directory_read_permission_required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.company_vendor_profiles cvp
     where cvp.id = p_vendor_profile_id
       and cvp.owner_company_id = v_company_id
  ) then
    raise exception 'vendor_profile_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  return query
  select
    vsa.id,
    vsa.vendor_profile_id,
    vsa.state,
    vsa.county,
    vsa.zip,
    vsa.market,
    vsa.radius_miles,
    vsa.product_type,
    vsa.status,
    vsa.created_at,
    vsa.updated_at
  from public.vendor_service_areas vsa
  where vsa.vendor_profile_id = p_vendor_profile_id
  order by
    case when vsa.status = 'active' then 0 else 1 end,
    vsa.state asc nulls last,
    vsa.county asc nulls last,
    vsa.zip asc nulls last,
    vsa.market asc nulls last,
    vsa.product_type asc nulls last;
end;
$$;

revoke all on function public.rpc_vendor_directory_list(text, text) from public, anon;
revoke all on function public.rpc_vendor_profile_detail(uuid) from public, anon;
revoke all on function public.rpc_vendor_profile_contacts(uuid) from public, anon;
revoke all on function public.rpc_vendor_profile_service_areas(uuid) from public, anon;

grant execute on function public.rpc_vendor_directory_list(text, text) to authenticated, service_role;
grant execute on function public.rpc_vendor_profile_detail(uuid) to authenticated, service_role;
grant execute on function public.rpc_vendor_profile_contacts(uuid) to authenticated, service_role;
grant execute on function public.rpc_vendor_profile_service_areas(uuid) to authenticated, service_role;

comment on function public.rpc_vendor_directory_list(text, text) is
  'AMC-2H read-only Vendor Directory list RPC. Uses current_company_id(), active current-company membership, and temporary relationships.read authorization until vendors.read is approved. Operations mode, product mode, and company_type are not authorization. Does not grant order, client, assignment, notification, or workflow visibility.';

comment on function public.rpc_vendor_profile_detail(uuid) is
  'AMC-2H read-only Vendor Directory profile detail RPC. Scoped to current_company_id() and temporary relationships.read authorization until vendors.read is approved. Staged profiles without relationship_id can be read by authorized current-company users. Does not return assignment packets or order data.';

comment on function public.rpc_vendor_profile_contacts(uuid) is
  'AMC-2H read-only Vendor Directory contacts RPC. Scoped through the parent vendor profile and temporary relationships.read authorization until vendors.read is approved. Contact user_id linkage does not grant vendor portal access or assignment notification routing.';

comment on function public.rpc_vendor_profile_service_areas(uuid) is
  'AMC-2H read-only Vendor Directory service areas RPC. Scoped through the parent vendor profile and temporary relationships.read authorization until vendors.read is approved. Service areas do not create assignments; vendor assignment remains in order_company_assignments.';

commit;
