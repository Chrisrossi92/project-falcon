begin;

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
  v_actor_user_id uuid;
  v_owner_company_id uuid;
  v_owner_timezone text;
  v_owner_locale text;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_vendor_company_payload jsonb := coalesce(p_payload -> 'vendor_company', '{}'::jsonb);
  v_vendor_company_id uuid;
  v_vendor_company_name text;
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
  select ctx.actor_user_id, ctx.company_id
    into v_actor_user_id, v_owner_company_id
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

revoke all on function public.rpc_vendor_profile_create(jsonb) from public, anon;
grant execute on function public.rpc_vendor_profile_create(jsonb) to authenticated, service_role;

comment on function public.rpc_vendor_profile_create(jsonb) is
  'AMC-2V patch. Vendor Directory mutation RPC with actor user id correctly carried from amc_vendor_require_mutation_context. Creates or attaches a vendor company, optionally creates/attaches an active amc_vendor relationship, creates a vendor profile, and optionally creates initial primary contact/service areas. Requires vendors.create. Does not create assignments, vendor roles, UI, or order changes.';

commit;
