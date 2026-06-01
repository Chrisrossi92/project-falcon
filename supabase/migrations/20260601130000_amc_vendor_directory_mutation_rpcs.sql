begin;

create extension if not exists "pgcrypto";

drop function if exists public.amc_vendor_normalized_text(text);
create or replace function public.amc_vendor_normalized_text(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(btrim(coalesce(p_value, '')), '');
$$;

drop function if exists public.amc_vendor_normalized_email(text);
create or replace function public.amc_vendor_normalized_email(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(public.amc_vendor_normalized_text(p_value));
$$;

drop function if exists public.amc_vendor_raise_if_unknown_keys(jsonb, text[], text);
create or replace function public.amc_vendor_raise_if_unknown_keys(
  p_payload jsonb,
  p_allowed_keys text[],
  p_error text
)
returns void
language plpgsql
immutable
set search_path = public
as $$
declare
  v_unknown_key text;
begin
  if p_payload is null then
    return;
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    raise exception '%', coalesce(p_error, 'vendor_payload_invalid')
      using errcode = '22023';
  end if;

  select key
    into v_unknown_key
    from jsonb_object_keys(p_payload) as keys(key)
   where not (key = any(coalesce(p_allowed_keys, '{}'::text[])))
   order by key
   limit 1;

  if v_unknown_key is not null then
    raise exception '%', coalesce(p_error, 'vendor_payload_invalid')
      using errcode = '22023',
            detail = format('Unknown key: %s', v_unknown_key);
  end if;
end;
$$;

drop function if exists public.amc_vendor_normalized_tags(jsonb);
create or replace function public.amc_vendor_normalized_tags(p_tags jsonb)
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  v_tags text[];
begin
  if p_tags is null or p_tags = 'null'::jsonb then
    return '{}'::text[];
  end if;

  if jsonb_typeof(p_tags) <> 'array' then
    raise exception 'vendor_payload_invalid'
      using errcode = '22023',
            detail = 'tags must be an array';
  end if;

  select coalesce(array_agg(tag order by tag), '{}'::text[])
    into v_tags
    from (
      select distinct public.amc_vendor_normalized_text(value) as tag
        from jsonb_array_elements_text(p_tags) as tag_values(value)
    ) normalized
   where tag is not null;

  return v_tags;
end;
$$;

drop function if exists public.amc_vendor_slug_base(text);
create or replace function public.amc_vendor_slug_base(p_value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_slug text;
begin
  v_slug := lower(public.amc_vendor_normalized_text(p_value));
  v_slug := regexp_replace(coalesce(v_slug, ''), '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');
  v_slug := left(v_slug, 54);
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');

  if v_slug = '' then
    v_slug := 'vendor';
  end if;

  return v_slug;
end;
$$;

drop function if exists public.amc_vendor_require_mutation_context(text, text);
create or replace function public.amc_vendor_require_mutation_context(
  p_permission_key text,
  p_error text
)
returns table (
  actor_user_id uuid,
  company_id uuid
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

  if not public.current_app_user_has_permission(p_permission_key) then
    raise exception '%', p_error
      using errcode = '42501';
  end if;

  return query select v_actor_user_id, v_company_id;
end;
$$;

drop function if exists public.amc_vendor_insert_contact(uuid, jsonb);
create or replace function public.amc_vendor_insert_contact(
  p_vendor_profile_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
  v_user_id uuid;
  v_name text;
  v_email text;
  v_phone text;
  v_role_label text;
  v_is_primary boolean := false;
  v_receives_assignment_notifications boolean := false;
  v_notes text;
begin
  if p_payload is null or p_payload = 'null'::jsonb then
    return null;
  end if;

  perform public.amc_vendor_raise_if_unknown_keys(
    p_payload,
    array[
      'user_id',
      'name',
      'email',
      'phone',
      'role_label',
      'is_primary',
      'receives_assignment_notifications',
      'notes'
    ],
    'vendor_payload_invalid'
  );

  v_name := public.amc_vendor_normalized_text(p_payload ->> 'name');

  if v_name is null then
    raise exception 'vendor_payload_invalid'
      using errcode = '22023',
            detail = 'contact name is required';
  end if;

  if p_payload ? 'user_id' then
    v_user_id := nullif(p_payload ->> 'user_id', '')::uuid;
  end if;

  if p_payload ? 'is_primary' then
    if jsonb_typeof(p_payload -> 'is_primary') <> 'boolean' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'is_primary must be boolean';
    end if;
    v_is_primary := (p_payload ->> 'is_primary')::boolean;
  end if;

  if p_payload ? 'receives_assignment_notifications' then
    if jsonb_typeof(p_payload -> 'receives_assignment_notifications') <> 'boolean' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'receives_assignment_notifications must be boolean';
    end if;
    v_receives_assignment_notifications :=
      (p_payload ->> 'receives_assignment_notifications')::boolean;
  end if;

  v_email := public.amc_vendor_normalized_email(p_payload ->> 'email');
  v_phone := public.amc_vendor_normalized_text(p_payload ->> 'phone');
  v_role_label := public.amc_vendor_normalized_text(p_payload ->> 'role_label');
  v_notes := public.amc_vendor_normalized_text(p_payload ->> 'notes');

  if v_is_primary then
    update public.vendor_contacts
       set is_primary = false
     where vendor_profile_id = p_vendor_profile_id
       and is_primary is true;
  end if;

  insert into public.vendor_contacts (
    vendor_profile_id,
    user_id,
    name,
    email,
    phone,
    role_label,
    is_primary,
    receives_assignment_notifications,
    notes
  ) values (
    p_vendor_profile_id,
    v_user_id,
    v_name,
    v_email,
    v_phone,
    v_role_label,
    v_is_primary,
    v_receives_assignment_notifications,
    v_notes
  )
  returning id into v_contact_id;

  return v_contact_id;
end;
$$;

drop function if exists public.amc_vendor_insert_service_area(uuid, jsonb);
create or replace function public.amc_vendor_insert_service_area(
  p_vendor_profile_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_area_id uuid;
  v_state text;
  v_county text;
  v_zip text;
  v_market text;
  v_radius_miles numeric;
  v_product_type text;
  v_status text := 'active';
begin
  perform public.amc_vendor_raise_if_unknown_keys(
    p_payload,
    array[
      'state',
      'county',
      'zip',
      'market',
      'radius_miles',
      'product_type',
      'status'
    ],
    'vendor_payload_invalid'
  );

  v_state := upper(public.amc_vendor_normalized_text(p_payload ->> 'state'));
  v_county := public.amc_vendor_normalized_text(p_payload ->> 'county');
  v_zip := public.amc_vendor_normalized_text(p_payload ->> 'zip');
  v_market := public.amc_vendor_normalized_text(p_payload ->> 'market');
  v_product_type := public.amc_vendor_normalized_text(p_payload ->> 'product_type');

  if p_payload ? 'radius_miles'
     and p_payload -> 'radius_miles' <> 'null'::jsonb
     and public.amc_vendor_normalized_text(p_payload ->> 'radius_miles') is not null then
    v_radius_miles := (p_payload ->> 'radius_miles')::numeric;
  end if;

  if p_payload ? 'status' then
    v_status := lower(coalesce(public.amc_vendor_normalized_text(p_payload ->> 'status'), 'active'));
  end if;

  if v_status not in ('active', 'inactive') then
    raise exception 'vendor_service_area_status_invalid'
      using errcode = '22023';
  end if;

  if v_radius_miles is not null and v_radius_miles < 0 then
    raise exception 'vendor_payload_invalid'
      using errcode = '22023',
            detail = 'radius_miles must be non-negative';
  end if;

  if v_state is null
     and v_county is null
     and v_zip is null
     and v_market is null
     and v_radius_miles is null
     and v_product_type is null then
    raise exception 'vendor_payload_invalid'
      using errcode = '22023',
            detail = 'service area requires at least one coverage or product field';
  end if;

  insert into public.vendor_service_areas (
    vendor_profile_id,
    state,
    county,
    zip,
    market,
    radius_miles,
    product_type,
    status
  ) values (
    p_vendor_profile_id,
    v_state,
    v_county,
    v_zip,
    v_market,
    v_radius_miles,
    v_product_type,
    v_status
  )
  returning id into v_service_area_id;

  return v_service_area_id;
end;
$$;

drop function if exists public.rpc_vendor_profile_create(jsonb);
create or replace function public.rpc_vendor_profile_create(p_payload jsonb)
returns table (
  vendor_profile_id uuid,
  vendor_company_id uuid,
  relationship_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_company_id uuid;
  v_owner_timezone text;
  v_owner_locale text;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_vendor_company_payload jsonb := coalesce(p_payload -> 'vendor_company', '{}'::jsonb);
  v_vendor_company_id uuid;
  v_vendor_company_name text;
  v_vendor_company_slug text;
  v_slug_base text;
  v_slug_candidate text;
  v_slug_suffix integer := 1;
  v_create_relationship boolean := true;
  v_relationship_id uuid;
  v_existing_relationship_status text;
  v_vendor_profile_id uuid;
  v_vendor_status text := 'active';
  v_website text;
  v_primary_address jsonb := '{}'::jsonb;
  v_public_phone text;
  v_default_assignment_instructions text;
  v_capabilities jsonb := '{}'::jsonb;
  v_product_eligibility jsonb := '{}'::jsonb;
  v_internal_notes text;
  v_tags text[] := '{}'::text[];
  v_contact_payload jsonb;
  v_service_area_payload jsonb;
begin
  select ctx.company_id
    into v_owner_company_id
    from public.amc_vendor_require_mutation_context(
      'vendors.create',
      'vendor_create_permission_required'
    ) as ctx;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'vendor_payload_invalid'
      using errcode = '22023';
  end if;

  perform public.amc_vendor_raise_if_unknown_keys(
    v_payload,
    array[
      'vendor_company_id',
      'vendor_company',
      'vendor_status',
      'create_relationship',
      'website',
      'primary_address',
      'public_phone',
      'default_assignment_instructions',
      'capabilities',
      'product_eligibility',
      'internal_notes',
      'tags',
      'primary_contact',
      'service_areas'
    ],
    'vendor_payload_invalid'
  );

  perform public.amc_vendor_raise_if_unknown_keys(
    v_vendor_company_payload,
    array['name', 'slug'],
    'vendor_payload_invalid'
  );

  if v_payload ? 'vendor_company_id'
     and public.amc_vendor_normalized_text(v_payload ->> 'vendor_company_id') is not null then
    v_vendor_company_id := (v_payload ->> 'vendor_company_id')::uuid;

    select c.id
      into v_vendor_company_id
      from public.companies c
     where c.id = v_vendor_company_id
       and c.status = 'active';

    if not found then
      raise exception 'vendor_company_required'
        using errcode = '22023';
    end if;
  else
    v_vendor_company_name := public.amc_vendor_normalized_text(v_vendor_company_payload ->> 'name');

    if v_vendor_company_name is null then
      raise exception 'vendor_company_name_required'
        using errcode = '22023';
    end if;

    select c.timezone, c.locale
      into v_owner_timezone, v_owner_locale
      from public.companies c
     where c.id = v_owner_company_id;

    v_slug_base := public.amc_vendor_slug_base(
      coalesce(v_vendor_company_payload ->> 'slug', v_vendor_company_name)
    );
    v_slug_candidate := v_slug_base;

    while exists (
      select 1 from public.companies c where c.slug = v_slug_candidate
    ) loop
      v_slug_suffix := v_slug_suffix + 1;
      v_slug_candidate := left(v_slug_base, 54) || '-' || v_slug_suffix::text;
    end loop;

    insert into public.companies (
      slug,
      name,
      status,
      timezone,
      locale,
      settings,
      company_type,
      operating_mode_settings
    ) values (
      v_slug_candidate,
      v_vendor_company_name,
      'active',
      coalesce(v_owner_timezone, 'America/New_York'),
      coalesce(v_owner_locale, 'en-US'),
      '{}'::jsonb,
      'vendor',
      '{}'::jsonb
    )
    returning id into v_vendor_company_id;
  end if;

  if v_vendor_company_id is null then
    raise exception 'vendor_company_required'
      using errcode = '22023';
  end if;

  if v_vendor_company_id = v_owner_company_id then
    raise exception 'vendor_relationship_invalid'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from public.company_vendor_profiles cvp
     where cvp.owner_company_id = v_owner_company_id
       and cvp.vendor_company_id = v_vendor_company_id
  ) then
    raise exception 'vendor_profile_duplicate'
      using errcode = '23505';
  end if;

  if v_payload ? 'create_relationship' then
    if jsonb_typeof(v_payload -> 'create_relationship') <> 'boolean' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'create_relationship must be boolean';
    end if;
    v_create_relationship := (v_payload ->> 'create_relationship')::boolean;
  end if;

  if v_payload ? 'vendor_status' then
    v_vendor_status := lower(coalesce(public.amc_vendor_normalized_text(v_payload ->> 'vendor_status'), 'active'));
  end if;

  if v_vendor_status not in ('active', 'inactive', 'pending', 'preferred', 'do_not_use', 'probation') then
    raise exception 'vendor_status_invalid'
      using errcode = '22023';
  end if;

  if v_payload ? 'primary_address' then
    v_primary_address := coalesce(v_payload -> 'primary_address', '{}'::jsonb);
    if v_primary_address = 'null'::jsonb then
      v_primary_address := '{}'::jsonb;
    end if;
    if jsonb_typeof(v_primary_address) <> 'object' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'primary_address must be an object';
    end if;
  end if;

  if v_payload ? 'capabilities' then
    v_capabilities := coalesce(v_payload -> 'capabilities', '{}'::jsonb);
    if v_capabilities = 'null'::jsonb then
      v_capabilities := '{}'::jsonb;
    end if;
    if jsonb_typeof(v_capabilities) <> 'object' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'capabilities must be an object';
    end if;
  end if;

  if v_payload ? 'product_eligibility' then
    v_product_eligibility := coalesce(v_payload -> 'product_eligibility', '{}'::jsonb);
    if v_product_eligibility = 'null'::jsonb then
      v_product_eligibility := '{}'::jsonb;
    end if;
    if jsonb_typeof(v_product_eligibility) <> 'object' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'product_eligibility must be an object';
    end if;
  end if;

  if v_payload ? 'tags' then
    v_tags := public.amc_vendor_normalized_tags(v_payload -> 'tags');
  end if;

  v_website := public.amc_vendor_normalized_text(v_payload ->> 'website');
  v_public_phone := public.amc_vendor_normalized_text(v_payload ->> 'public_phone');
  v_default_assignment_instructions :=
    public.amc_vendor_normalized_text(v_payload ->> 'default_assignment_instructions');
  v_internal_notes := public.amc_vendor_normalized_text(v_payload ->> 'internal_notes');

  if v_create_relationship then
    select cr.id, cr.status
      into v_relationship_id, v_existing_relationship_status
      from public.company_relationships cr
     where cr.source_company_id = v_owner_company_id
       and cr.target_company_id = v_vendor_company_id
       and cr.relationship_type = 'amc_vendor'
       and cr.status in ('active', 'invited', 'suspended')
     order by case cr.status when 'active' then 0 when 'invited' then 1 else 2 end,
              cr.created_at desc
     limit 1
     for update;

    if found then
      if v_existing_relationship_status <> 'active' then
        update public.company_relationships
           set status = 'active',
               approved_by_user_id = v_actor_user_id,
               approved_at = coalesce(approved_at, now()),
               suspended_by_user_id = null,
               suspended_at = null
         where id = v_relationship_id;
      end if;
    else
      insert into public.company_relationships (
        source_company_id,
        target_company_id,
        relationship_type,
        status,
        invited_by_user_id,
        approved_by_user_id,
        invited_at,
        approved_at,
        settings,
        compliance,
        notes
      ) values (
        v_owner_company_id,
        v_vendor_company_id,
        'amc_vendor',
        'active',
        v_actor_user_id,
        v_actor_user_id,
        now(),
        now(),
        '{}'::jsonb,
        '{}'::jsonb,
        null
      )
      returning id into v_relationship_id;
    end if;
  end if;

  begin
    insert into public.company_vendor_profiles (
      owner_company_id,
      vendor_company_id,
      relationship_id,
      vendor_status,
      website,
      primary_address,
      public_phone,
      default_assignment_instructions,
      capabilities,
      product_eligibility,
      internal_notes,
      tags
    ) values (
      v_owner_company_id,
      v_vendor_company_id,
      v_relationship_id,
      v_vendor_status,
      v_website,
      v_primary_address,
      v_public_phone,
      v_default_assignment_instructions,
      v_capabilities,
      v_product_eligibility,
      v_internal_notes,
      v_tags
    )
    returning id into v_vendor_profile_id;
  exception
    when unique_violation then
      raise exception 'vendor_profile_duplicate'
        using errcode = '23505';
  end;

  if v_payload ? 'primary_contact'
     and v_payload -> 'primary_contact' is not null
     and v_payload -> 'primary_contact' <> 'null'::jsonb then
    v_contact_payload := v_payload -> 'primary_contact';
    if jsonb_typeof(v_contact_payload) <> 'object' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'primary_contact must be an object';
    end if;
    v_contact_payload := v_contact_payload || '{"is_primary": true}'::jsonb;
    perform public.amc_vendor_insert_contact(v_vendor_profile_id, v_contact_payload);
  end if;

  if v_payload ? 'service_areas'
     and v_payload -> 'service_areas' is not null
     and v_payload -> 'service_areas' <> 'null'::jsonb then
    if jsonb_typeof(v_payload -> 'service_areas') <> 'array' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'service_areas must be an array';
    end if;

    for v_service_area_payload in
      select value from jsonb_array_elements(v_payload -> 'service_areas') as areas(value)
    loop
      perform public.amc_vendor_insert_service_area(v_vendor_profile_id, v_service_area_payload);
    end loop;
  end if;

  return query select v_vendor_profile_id, v_vendor_company_id, v_relationship_id;
end;
$$;

drop function if exists public.rpc_vendor_profile_update(uuid, jsonb);
create or replace function public.rpc_vendor_profile_update(
  p_vendor_profile_id uuid,
  p_patch jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_company_id uuid;
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_profile public.company_vendor_profiles%rowtype;
  v_vendor_status text;
  v_primary_address jsonb;
  v_capabilities jsonb;
  v_product_eligibility jsonb;
  v_tags text[];
begin
  select ctx.company_id
    into v_owner_company_id
    from public.amc_vendor_require_mutation_context(
      'vendors.update',
      'vendor_update_permission_required'
    ) as ctx;

  perform public.amc_vendor_raise_if_unknown_keys(
    v_patch,
    array[
      'vendor_status',
      'website',
      'primary_address',
      'public_phone',
      'default_assignment_instructions',
      'capabilities',
      'product_eligibility',
      'internal_notes',
      'tags'
    ],
    'vendor_patch_contains_forbidden_fields'
  );

  select *
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.id = p_vendor_profile_id
     and cvp.owner_company_id = v_owner_company_id
   for update;

  if not found then
    raise exception 'vendor_profile_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  v_vendor_status := v_profile.vendor_status;
  if v_patch ? 'vendor_status' then
    v_vendor_status := lower(coalesce(public.amc_vendor_normalized_text(v_patch ->> 'vendor_status'), ''));
    if v_vendor_status not in ('active', 'inactive', 'pending', 'preferred', 'do_not_use', 'probation') then
      raise exception 'vendor_status_invalid'
        using errcode = '22023';
    end if;
  end if;

  v_primary_address := v_profile.primary_address;
  if v_patch ? 'primary_address' then
    v_primary_address := coalesce(v_patch -> 'primary_address', '{}'::jsonb);
    if v_primary_address = 'null'::jsonb then
      v_primary_address := '{}'::jsonb;
    end if;
    if jsonb_typeof(v_primary_address) <> 'object' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'primary_address must be an object';
    end if;
  end if;

  v_capabilities := v_profile.capabilities;
  if v_patch ? 'capabilities' then
    v_capabilities := coalesce(v_patch -> 'capabilities', '{}'::jsonb);
    if v_capabilities = 'null'::jsonb then
      v_capabilities := '{}'::jsonb;
    end if;
    if jsonb_typeof(v_capabilities) <> 'object' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'capabilities must be an object';
    end if;
  end if;

  v_product_eligibility := v_profile.product_eligibility;
  if v_patch ? 'product_eligibility' then
    v_product_eligibility := coalesce(v_patch -> 'product_eligibility', '{}'::jsonb);
    if v_product_eligibility = 'null'::jsonb then
      v_product_eligibility := '{}'::jsonb;
    end if;
    if jsonb_typeof(v_product_eligibility) <> 'object' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'product_eligibility must be an object';
    end if;
  end if;

  v_tags := v_profile.tags;
  if v_patch ? 'tags' then
    v_tags := public.amc_vendor_normalized_tags(v_patch -> 'tags');
  end if;

  update public.company_vendor_profiles
     set vendor_status = v_vendor_status,
         website = case when v_patch ? 'website'
           then public.amc_vendor_normalized_text(v_patch ->> 'website')
           else website end,
         primary_address = v_primary_address,
         public_phone = case when v_patch ? 'public_phone'
           then public.amc_vendor_normalized_text(v_patch ->> 'public_phone')
           else public_phone end,
         default_assignment_instructions = case when v_patch ? 'default_assignment_instructions'
           then public.amc_vendor_normalized_text(v_patch ->> 'default_assignment_instructions')
           else default_assignment_instructions end,
         capabilities = v_capabilities,
         product_eligibility = v_product_eligibility,
         internal_notes = case when v_patch ? 'internal_notes'
           then public.amc_vendor_normalized_text(v_patch ->> 'internal_notes')
           else internal_notes end,
         tags = v_tags
   where id = p_vendor_profile_id;

  return p_vendor_profile_id;
end;
$$;

drop function if exists public.rpc_vendor_contact_create(uuid, jsonb);
create or replace function public.rpc_vendor_contact_create(
  p_vendor_profile_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_company_id uuid;
  v_contact_id uuid;
begin
  select ctx.company_id
    into v_owner_company_id
    from public.amc_vendor_require_mutation_context(
      'vendors.contacts.manage',
      'vendor_contacts_manage_permission_required'
    ) as ctx;

  if not exists (
    select 1
      from public.company_vendor_profiles cvp
     where cvp.id = p_vendor_profile_id
       and cvp.owner_company_id = v_owner_company_id
  ) then
    raise exception 'vendor_profile_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  v_contact_id := public.amc_vendor_insert_contact(p_vendor_profile_id, p_payload);

  return v_contact_id;
end;
$$;

drop function if exists public.rpc_vendor_contact_update(uuid, jsonb);
create or replace function public.rpc_vendor_contact_update(
  p_contact_id uuid,
  p_patch jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_company_id uuid;
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_contact public.vendor_contacts%rowtype;
  v_name text;
  v_user_id uuid;
  v_email text;
  v_phone text;
  v_role_label text;
  v_is_primary boolean;
  v_receives_assignment_notifications boolean;
  v_notes text;
begin
  select ctx.company_id
    into v_owner_company_id
    from public.amc_vendor_require_mutation_context(
      'vendors.contacts.manage',
      'vendor_contacts_manage_permission_required'
    ) as ctx;

  perform public.amc_vendor_raise_if_unknown_keys(
    v_patch,
    array[
      'user_id',
      'name',
      'email',
      'phone',
      'role_label',
      'is_primary',
      'receives_assignment_notifications',
      'notes'
    ],
    'vendor_patch_contains_forbidden_fields'
  );

  select vc.*
    into v_contact
    from public.vendor_contacts vc
    join public.company_vendor_profiles cvp
      on cvp.id = vc.vendor_profile_id
   where vc.id = p_contact_id
     and cvp.owner_company_id = v_owner_company_id
   for update;

  if not found then
    raise exception 'vendor_contact_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  v_name := v_contact.name;
  if v_patch ? 'name' then
    v_name := public.amc_vendor_normalized_text(v_patch ->> 'name');
    if v_name is null then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'contact name is required';
    end if;
  end if;

  v_user_id := v_contact.user_id;
  if v_patch ? 'user_id' then
    v_user_id := nullif(v_patch ->> 'user_id', '')::uuid;
  end if;

  v_email := v_contact.email;
  if v_patch ? 'email' then
    v_email := public.amc_vendor_normalized_email(v_patch ->> 'email');
  end if;

  v_phone := v_contact.phone;
  if v_patch ? 'phone' then
    v_phone := public.amc_vendor_normalized_text(v_patch ->> 'phone');
  end if;

  v_role_label := v_contact.role_label;
  if v_patch ? 'role_label' then
    v_role_label := public.amc_vendor_normalized_text(v_patch ->> 'role_label');
  end if;

  v_is_primary := v_contact.is_primary;
  if v_patch ? 'is_primary' then
    if jsonb_typeof(v_patch -> 'is_primary') <> 'boolean' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'is_primary must be boolean';
    end if;
    v_is_primary := (v_patch ->> 'is_primary')::boolean;
  end if;

  v_receives_assignment_notifications := v_contact.receives_assignment_notifications;
  if v_patch ? 'receives_assignment_notifications' then
    if jsonb_typeof(v_patch -> 'receives_assignment_notifications') <> 'boolean' then
      raise exception 'vendor_payload_invalid'
        using errcode = '22023',
              detail = 'receives_assignment_notifications must be boolean';
    end if;
    v_receives_assignment_notifications :=
      (v_patch ->> 'receives_assignment_notifications')::boolean;
  end if;

  v_notes := v_contact.notes;
  if v_patch ? 'notes' then
    v_notes := public.amc_vendor_normalized_text(v_patch ->> 'notes');
  end if;

  if v_is_primary then
    update public.vendor_contacts
       set is_primary = false
     where vendor_profile_id = v_contact.vendor_profile_id
       and id <> p_contact_id
       and is_primary is true;
  end if;

  update public.vendor_contacts
     set user_id = v_user_id,
         name = v_name,
         email = v_email,
         phone = v_phone,
         role_label = v_role_label,
         is_primary = v_is_primary,
         receives_assignment_notifications = v_receives_assignment_notifications,
         notes = v_notes
   where id = p_contact_id;

  return p_contact_id;
end;
$$;

drop function if exists public.rpc_vendor_service_area_create(uuid, jsonb);
create or replace function public.rpc_vendor_service_area_create(
  p_vendor_profile_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_company_id uuid;
  v_service_area_id uuid;
begin
  select ctx.company_id
    into v_owner_company_id
    from public.amc_vendor_require_mutation_context(
      'vendors.service_areas.manage',
      'vendor_service_areas_manage_permission_required'
    ) as ctx;

  if not exists (
    select 1
      from public.company_vendor_profiles cvp
     where cvp.id = p_vendor_profile_id
       and cvp.owner_company_id = v_owner_company_id
  ) then
    raise exception 'vendor_profile_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  v_service_area_id := public.amc_vendor_insert_service_area(p_vendor_profile_id, p_payload);

  return v_service_area_id;
end;
$$;

drop function if exists public.rpc_vendor_service_area_update(uuid, jsonb);
create or replace function public.rpc_vendor_service_area_update(
  p_service_area_id uuid,
  p_patch jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_company_id uuid;
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_service_area public.vendor_service_areas%rowtype;
  v_state text;
  v_county text;
  v_zip text;
  v_market text;
  v_radius_miles numeric;
  v_product_type text;
  v_status text;
begin
  select ctx.company_id
    into v_owner_company_id
    from public.amc_vendor_require_mutation_context(
      'vendors.service_areas.manage',
      'vendor_service_areas_manage_permission_required'
    ) as ctx;

  perform public.amc_vendor_raise_if_unknown_keys(
    v_patch,
    array[
      'state',
      'county',
      'zip',
      'market',
      'radius_miles',
      'product_type',
      'status'
    ],
    'vendor_patch_contains_forbidden_fields'
  );

  select vsa.*
    into v_service_area
    from public.vendor_service_areas vsa
    join public.company_vendor_profiles cvp
      on cvp.id = vsa.vendor_profile_id
   where vsa.id = p_service_area_id
     and cvp.owner_company_id = v_owner_company_id
   for update;

  if not found then
    raise exception 'vendor_service_area_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  v_state := v_service_area.state;
  if v_patch ? 'state' then
    v_state := upper(public.amc_vendor_normalized_text(v_patch ->> 'state'));
  end if;

  v_county := v_service_area.county;
  if v_patch ? 'county' then
    v_county := public.amc_vendor_normalized_text(v_patch ->> 'county');
  end if;

  v_zip := v_service_area.zip;
  if v_patch ? 'zip' then
    v_zip := public.amc_vendor_normalized_text(v_patch ->> 'zip');
  end if;

  v_market := v_service_area.market;
  if v_patch ? 'market' then
    v_market := public.amc_vendor_normalized_text(v_patch ->> 'market');
  end if;

  v_radius_miles := v_service_area.radius_miles;
  if v_patch ? 'radius_miles' then
    if v_patch -> 'radius_miles' is null
       or v_patch -> 'radius_miles' = 'null'::jsonb
       or public.amc_vendor_normalized_text(v_patch ->> 'radius_miles') is null then
      v_radius_miles := null;
    else
      v_radius_miles := (v_patch ->> 'radius_miles')::numeric;
    end if;
  end if;

  v_product_type := v_service_area.product_type;
  if v_patch ? 'product_type' then
    v_product_type := public.amc_vendor_normalized_text(v_patch ->> 'product_type');
  end if;

  v_status := v_service_area.status;
  if v_patch ? 'status' then
    v_status := lower(coalesce(public.amc_vendor_normalized_text(v_patch ->> 'status'), ''));
  end if;

  if v_status not in ('active', 'inactive') then
    raise exception 'vendor_service_area_status_invalid'
      using errcode = '22023';
  end if;

  if v_radius_miles is not null and v_radius_miles < 0 then
    raise exception 'vendor_payload_invalid'
      using errcode = '22023',
            detail = 'radius_miles must be non-negative';
  end if;

  if v_state is null
     and v_county is null
     and v_zip is null
     and v_market is null
     and v_radius_miles is null
     and v_product_type is null then
    raise exception 'vendor_payload_invalid'
      using errcode = '22023',
            detail = 'service area requires at least one coverage or product field';
  end if;

  update public.vendor_service_areas
     set state = v_state,
         county = v_county,
         zip = v_zip,
         market = v_market,
         radius_miles = v_radius_miles,
         product_type = v_product_type,
         status = v_status
   where id = p_service_area_id;

  return p_service_area_id;
end;
$$;

revoke all on function public.amc_vendor_normalized_text(text) from public, anon, authenticated;
revoke all on function public.amc_vendor_normalized_email(text) from public, anon, authenticated;
revoke all on function public.amc_vendor_raise_if_unknown_keys(jsonb, text[], text) from public, anon, authenticated;
revoke all on function public.amc_vendor_normalized_tags(jsonb) from public, anon, authenticated;
revoke all on function public.amc_vendor_slug_base(text) from public, anon, authenticated;
revoke all on function public.amc_vendor_require_mutation_context(text, text) from public, anon, authenticated;
revoke all on function public.amc_vendor_insert_contact(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.amc_vendor_insert_service_area(uuid, jsonb) from public, anon, authenticated;

revoke all on function public.rpc_vendor_profile_create(jsonb) from public, anon;
revoke all on function public.rpc_vendor_profile_update(uuid, jsonb) from public, anon;
revoke all on function public.rpc_vendor_contact_create(uuid, jsonb) from public, anon;
revoke all on function public.rpc_vendor_contact_update(uuid, jsonb) from public, anon;
revoke all on function public.rpc_vendor_service_area_create(uuid, jsonb) from public, anon;
revoke all on function public.rpc_vendor_service_area_update(uuid, jsonb) from public, anon;

grant execute on function public.rpc_vendor_profile_create(jsonb) to authenticated, service_role;
grant execute on function public.rpc_vendor_profile_update(uuid, jsonb) to authenticated, service_role;
grant execute on function public.rpc_vendor_contact_create(uuid, jsonb) to authenticated, service_role;
grant execute on function public.rpc_vendor_contact_update(uuid, jsonb) to authenticated, service_role;
grant execute on function public.rpc_vendor_service_area_create(uuid, jsonb) to authenticated, service_role;
grant execute on function public.rpc_vendor_service_area_update(uuid, jsonb) to authenticated, service_role;

comment on function public.rpc_vendor_profile_create(jsonb) is
  'AMC-2V Vendor Directory mutation RPC. Creates or attaches a vendor company, optionally creates/attaches an active amc_vendor relationship, creates a vendor profile, and optionally creates initial primary contact/service areas. Requires vendors.create. Does not create assignments, vendor roles, UI, or order changes.';

comment on function public.rpc_vendor_profile_update(uuid, jsonb) is
  'AMC-2V Vendor Directory mutation RPC. Updates allowlisted company_vendor_profiles metadata only. Requires vendors.update. Does not mutate owner/vendor company ids, relationship id, assignments, orders, clients, financials, compliance documents, or performance data.';

comment on function public.rpc_vendor_contact_create(uuid, jsonb) is
  'AMC-2V Vendor Directory mutation RPC. Creates a vendor contact for a current-company vendor profile. Requires vendors.contacts.manage. Contact user_id linkage does not grant vendor portal access or assignment notifications.';

comment on function public.rpc_vendor_contact_update(uuid, jsonb) is
  'AMC-2V Vendor Directory mutation RPC. Updates allowlisted vendor contact fields and maintains one-primary-contact semantics when is_primary is true. Requires vendors.contacts.manage.';

comment on function public.rpc_vendor_service_area_create(uuid, jsonb) is
  'AMC-2V Vendor Directory mutation RPC. Creates searchable vendor coverage rows. Requires vendors.service_areas.manage. Does not create assignment candidates or assignments.';

comment on function public.rpc_vendor_service_area_update(uuid, jsonb) is
  'AMC-2V Vendor Directory mutation RPC. Updates allowlisted service-area fields and supports active/inactive status. Requires vendors.service_areas.manage. No hard delete behavior is introduced.';

commit;
