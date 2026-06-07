-- AMC-13B.2 local-only full MVP smoke fixture.
--
-- Purpose:
--   Load disposable AMC owner/vendor/order/bid data for local smoke testing.
--
-- Scope:
--   - Local/dev only. Never run against production or staging.
--   - Creates clearly labeled disposable users, companies, vendor coverage, one AMC order,
--     and one open bid request/recipient.
--   - Does not create assignment offers, submitted reports, invoices, payment approvals,
--     or payment ledger rows; those are exercised by the smoke flow.
--
-- Smoke logins:
--   Owner:  amc.smoke.owner@example.test
--   Vendor: amc.smoke.vendor@example.test
--   Wrong vendor: amc.smoke.wrongvendor@example.test
--   Temporary password for both: FalconSmoke123!

begin;

create extension if not exists "pgcrypto";

do $$
begin
  if current_database() <> 'postgres' then
    raise exception 'AMC smoke fixtures must be loaded only into the local postgres database.';
  end if;

  if to_regclass('public.orders') is null
     or to_regclass('public.company_vendor_profiles') is null
     or to_regclass('public.order_vendor_bid_requests') is null
     or to_regclass('public.order_company_assignments') is null then
    raise exception 'AMC smoke fixtures require the full local migration set.';
  end if;

  if not exists (select 1 from public.companies where slug = 'falcon_default') then
    raise exception 'falcon_default company is required for AMC smoke fixtures.';
  end if;
end;
$$;

do $$
declare
  v_owner_company_id uuid;
  v_vendor_company_id uuid;
  v_wrong_vendor_company_id uuid;
  v_owner_auth_id uuid;
  v_vendor_auth_id uuid;
  v_wrong_vendor_auth_id uuid;
  v_owner_user_id uuid;
  v_vendor_user_id uuid;
  v_wrong_vendor_user_id uuid;
  v_owner_role_id uuid;
  v_admin_role_id uuid;
  v_vendor_role_id uuid;
  v_relationship_id uuid;
  v_wrong_relationship_id uuid;
  v_vendor_profile_id uuid;
  v_wrong_vendor_profile_id uuid;
  v_order_id uuid;
  v_bid_request_id uuid;
  v_recipient_id uuid;
  v_work_key text;
begin
  select id into v_owner_company_id
    from public.companies
   where slug = 'falcon_default';

  insert into public.companies (
    slug,
    name,
    status,
    timezone,
    locale,
    settings,
    company_type,
    operating_mode_settings
  )
  values (
    'amc-smoke-disposable-vendor',
    'AMC Smoke Disposable Vendor',
    'active',
    'America/New_York',
    'en-US',
    '{"demo_seed": "amc_13b_2", "disposable": true}'::jsonb,
    'vendor',
    '{}'::jsonb
  )
  on conflict (slug) do update
    set name = excluded.name,
        status = excluded.status,
        timezone = excluded.timezone,
        locale = excluded.locale,
        settings = public.companies.settings || excluded.settings,
        company_type = excluded.company_type,
        updated_at = now()
  returning id into v_vendor_company_id;

  insert into public.companies (
    slug,
    name,
    status,
    timezone,
    locale,
    settings,
    company_type,
    operating_mode_settings
  )
  values (
    'amc-smoke-wrong-vendor',
    'AMC Smoke Wrong Vendor',
    'active',
    'America/New_York',
    'en-US',
    '{"demo_seed": "amc_13b_8", "disposable": true, "fixture_role": "wrong_vendor_denial"}'::jsonb,
    'vendor',
    '{}'::jsonb
  )
  on conflict (slug) do update
    set name = excluded.name,
        status = excluded.status,
        timezone = excluded.timezone,
        locale = excluded.locale,
        settings = public.companies.settings || excluded.settings,
        company_type = excluded.company_type,
        updated_at = now()
  returning id into v_wrong_vendor_company_id;

  select id into v_owner_role_id
    from public.roles
   where company_id is null
     and lower(name) = 'owner'
     and is_template
   limit 1;

  select id into v_admin_role_id
    from public.roles
   where company_id is null
     and lower(name) = 'admin'
     and is_template
   limit 1;

  select id into v_vendor_role_id
    from public.roles
   where company_id is null
     and lower(name) = 'vendor admin'
     and is_template
   limit 1;

  if v_owner_role_id is null or v_admin_role_id is null or v_vendor_role_id is null then
    raise exception 'Owner, Admin, and Vendor Admin role templates are required for AMC smoke fixtures.';
  end if;

  select id into v_owner_auth_id
    from auth.users
   where lower(email) = 'amc.smoke.owner@example.test'
     and deleted_at is null
   limit 1;

  if v_owner_auth_id is null then
    v_owner_auth_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_owner_auth_id,
      'authenticated',
      'authenticated',
      'amc.smoke.owner@example.test',
      crypt('FalconSmoke123!', gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      '',
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email'),
        'active_company_id', v_owner_company_id,
        'current_company_id', v_owner_company_id,
        'amc_smoke_fixture', true
      ),
      '{"full_name": "AMC Smoke Owner", "amc_smoke_fixture": true}'::jsonb,
      now(),
      now(),
      false,
      false
    );
  else
    update auth.users
       set encrypted_password = crypt('FalconSmoke123!', gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           email_change = coalesce(email_change, ''),
           raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
             'provider', 'email',
             'providers', jsonb_build_array('email'),
             'active_company_id', v_owner_company_id,
             'current_company_id', v_owner_company_id,
             'amc_smoke_fixture', true
           ),
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"full_name": "AMC Smoke Owner", "amc_smoke_fixture": true}'::jsonb,
           updated_at = now()
     where id = v_owner_auth_id;
  end if;

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_owner_auth_id::text,
    v_owner_auth_id,
    jsonb_build_object('sub', v_owner_auth_id::text, 'email', 'amc.smoke.owner@example.test', 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do update
    set identity_data = excluded.identity_data,
        updated_at = now();

  insert into public.users (
    name,
    email,
    role,
    display_name,
    full_name,
    status,
    auth_id,
    uid,
    is_admin,
    is_active,
    created_at,
    updated_at
  )
  values (
    'AMC Smoke Owner',
    'amc.smoke.owner@example.test',
    'owner',
    'AMC Smoke Owner',
    'AMC Smoke Owner',
    'active',
    v_owner_auth_id,
    v_owner_auth_id,
    true,
    true,
    now(),
    now()
  )
  on conflict (email) do update
    set name = excluded.name,
        role = excluded.role,
        display_name = excluded.display_name,
        full_name = excluded.full_name,
        status = excluded.status,
        auth_id = excluded.auth_id,
        uid = excluded.uid,
        is_admin = excluded.is_admin,
        is_active = excluded.is_active,
        updated_at = now()
  returning id into v_owner_user_id;

  select id into v_vendor_auth_id
    from auth.users
   where lower(email) = 'amc.smoke.vendor@example.test'
     and deleted_at is null
   limit 1;

  if v_vendor_auth_id is null then
    v_vendor_auth_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_vendor_auth_id,
      'authenticated',
      'authenticated',
      'amc.smoke.vendor@example.test',
      crypt('FalconSmoke123!', gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      '',
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email'),
        'active_company_id', v_vendor_company_id,
        'current_company_id', v_vendor_company_id,
        'amc_smoke_fixture', true
      ),
      '{"full_name": "AMC Smoke Vendor", "amc_smoke_fixture": true}'::jsonb,
      now(),
      now(),
      false,
      false
    );
  else
    update auth.users
       set encrypted_password = crypt('FalconSmoke123!', gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           email_change = coalesce(email_change, ''),
           raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
             'provider', 'email',
             'providers', jsonb_build_array('email'),
             'active_company_id', v_vendor_company_id,
             'current_company_id', v_vendor_company_id,
             'amc_smoke_fixture', true
           ),
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"full_name": "AMC Smoke Vendor", "amc_smoke_fixture": true}'::jsonb,
           updated_at = now()
     where id = v_vendor_auth_id;
  end if;

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_vendor_auth_id::text,
    v_vendor_auth_id,
    jsonb_build_object('sub', v_vendor_auth_id::text, 'email', 'amc.smoke.vendor@example.test', 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do update
    set identity_data = excluded.identity_data,
        updated_at = now();

  insert into public.users (
    name,
    email,
    role,
    display_name,
    full_name,
    status,
    auth_id,
    uid,
    is_admin,
    is_active,
    created_at,
    updated_at
  )
  values (
    'AMC Smoke Vendor',
    'amc.smoke.vendor@example.test',
    'manager',
    'AMC Smoke Vendor',
    'AMC Smoke Vendor',
    'active',
    v_vendor_auth_id,
    v_vendor_auth_id,
    false,
    true,
    now(),
    now()
  )
  on conflict (email) do update
    set name = excluded.name,
        role = excluded.role,
        display_name = excluded.display_name,
        full_name = excluded.full_name,
        status = excluded.status,
        auth_id = excluded.auth_id,
        uid = excluded.uid,
        is_admin = excluded.is_admin,
        is_active = excluded.is_active,
        updated_at = now()
  returning id into v_vendor_user_id;

  select id into v_wrong_vendor_auth_id
    from auth.users
   where lower(email) = 'amc.smoke.wrongvendor@example.test'
     and deleted_at is null
   limit 1;

  if v_wrong_vendor_auth_id is null then
    v_wrong_vendor_auth_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_wrong_vendor_auth_id,
      'authenticated',
      'authenticated',
      'amc.smoke.wrongvendor@example.test',
      crypt('FalconSmoke123!', gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      '',
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email'),
        'active_company_id', v_wrong_vendor_company_id,
        'current_company_id', v_wrong_vendor_company_id,
        'amc_smoke_fixture', true
      ),
      '{"full_name": "AMC Smoke Wrong Vendor", "amc_smoke_fixture": true}'::jsonb,
      now(),
      now(),
      false,
      false
    );
  else
    update auth.users
       set encrypted_password = crypt('FalconSmoke123!', gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           email_change = coalesce(email_change, ''),
           raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
             'provider', 'email',
             'providers', jsonb_build_array('email'),
             'active_company_id', v_wrong_vendor_company_id,
             'current_company_id', v_wrong_vendor_company_id,
             'amc_smoke_fixture', true
           ),
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"full_name": "AMC Smoke Wrong Vendor", "amc_smoke_fixture": true}'::jsonb,
           updated_at = now()
     where id = v_wrong_vendor_auth_id;
  end if;

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_wrong_vendor_auth_id::text,
    v_wrong_vendor_auth_id,
    jsonb_build_object('sub', v_wrong_vendor_auth_id::text, 'email', 'amc.smoke.wrongvendor@example.test', 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do update
    set identity_data = excluded.identity_data,
        updated_at = now();

  insert into public.users (
    name,
    email,
    role,
    display_name,
    full_name,
    status,
    auth_id,
    uid,
    is_admin,
    is_active,
    created_at,
    updated_at
  )
  values (
    'AMC Smoke Wrong Vendor',
    'amc.smoke.wrongvendor@example.test',
    'manager',
    'AMC Smoke Wrong Vendor',
    'AMC Smoke Wrong Vendor',
    'active',
    v_wrong_vendor_auth_id,
    v_wrong_vendor_auth_id,
    false,
    true,
    now(),
    now()
  )
  on conflict (email) do update
    set name = excluded.name,
        role = excluded.role,
        display_name = excluded.display_name,
        full_name = excluded.full_name,
        status = excluded.status,
        auth_id = excluded.auth_id,
        uid = excluded.uid,
        is_admin = excluded.is_admin,
        is_active = excluded.is_active,
        updated_at = now()
  returning id into v_wrong_vendor_user_id;

  insert into public.company_memberships (company_id, user_id, status, membership_type, is_primary, joined_at)
  values
    (v_owner_company_id, v_owner_user_id, 'active', 'amc_smoke_owner', true, now()),
    (v_owner_company_id, v_vendor_user_id, 'active', 'amc_smoke_vendor_shell_compat', true, now()),
    (v_vendor_company_id, v_vendor_user_id, 'active', 'amc_smoke_vendor', true, now()),
    (v_wrong_vendor_company_id, v_wrong_vendor_user_id, 'active', 'amc_smoke_wrong_vendor', true, now())
  on conflict (company_id, user_id) do update
    set status = excluded.status,
        membership_type = excluded.membership_type,
        is_primary = excluded.is_primary,
        joined_at = coalesce(public.company_memberships.joined_at, excluded.joined_at),
        updated_at = now();

  insert into public.user_role_assignments (company_id, user_id, role_id, status, is_primary, assigned_by, assigned_at)
  values
    (v_owner_company_id, v_owner_user_id, v_owner_role_id, 'active', true, v_owner_user_id, now()),
    (v_owner_company_id, v_owner_user_id, v_admin_role_id, 'active', false, v_owner_user_id, now()),
    (v_owner_company_id, v_vendor_user_id, v_vendor_role_id, 'active', true, v_owner_user_id, now()),
    (v_vendor_company_id, v_vendor_user_id, v_vendor_role_id, 'active', true, v_owner_user_id, now()),
    (v_wrong_vendor_company_id, v_wrong_vendor_user_id, v_vendor_role_id, 'active', true, v_owner_user_id, now())
  on conflict (company_id, user_id, role_id) do update
    set status = excluded.status,
        is_primary = excluded.is_primary,
        assigned_by = excluded.assigned_by,
        assigned_at = coalesce(public.user_role_assignments.assigned_at, excluded.assigned_at),
        expires_at = null,
        updated_at = now();

  insert into public.company_relationships (
    source_company_id,
    target_company_id,
    relationship_type,
    status,
    invited_by_user_id,
    approved_by_user_id,
    invited_at,
    approved_at,
    starts_at,
    settings,
    compliance,
    notes
  )
  values (
    v_owner_company_id,
    v_vendor_company_id,
    'amc_vendor',
    'active',
    v_owner_user_id,
    v_owner_user_id,
    now(),
    now(),
    now(),
    '{"demo_seed": "amc_13b_2", "disposable": true}'::jsonb,
    '{"summary": "Disposable AMC smoke compliance summary", "demo_seed": "amc_13b_2"}'::jsonb,
    'AMC-13B.2 disposable smoke vendor relationship.'
  )
  on conflict (source_company_id, target_company_id, relationship_type)
    where status = any (array['invited', 'active', 'suspended'])
  do update
    set status = excluded.status,
        invited_by_user_id = excluded.invited_by_user_id,
        approved_by_user_id = excluded.approved_by_user_id,
        approved_at = excluded.approved_at,
        starts_at = excluded.starts_at,
        settings = public.company_relationships.settings || excluded.settings,
        compliance = public.company_relationships.compliance || excluded.compliance,
        notes = excluded.notes,
        updated_at = now()
  returning id into v_relationship_id;

  insert into public.company_vendor_profiles (
    owner_company_id,
    vendor_company_id,
    relationship_id,
    vendor_status,
    public_phone,
    default_assignment_instructions,
    capabilities,
    product_eligibility,
    internal_notes,
    tags
  )
  values (
    v_owner_company_id,
    v_vendor_company_id,
    v_relationship_id,
    'active',
    '555-0137',
    'Disposable AMC smoke fixture. Use only for local full MVP smoke validation.',
    '{"commercial": true, "residential": true, "default_turn_time_days": 5}'::jsonb,
    '{"commercial_appraisal": true, "residential_appraisal": true, "appraisal": true}'::jsonb,
    'Disposable AMC-13B.2 smoke fixture.',
    array['amc-smoke', 'disposable']
  )
  on conflict (owner_company_id, vendor_company_id) do update
    set relationship_id = excluded.relationship_id,
        vendor_status = excluded.vendor_status,
        public_phone = excluded.public_phone,
        default_assignment_instructions = excluded.default_assignment_instructions,
        capabilities = excluded.capabilities,
        product_eligibility = excluded.product_eligibility,
        internal_notes = excluded.internal_notes,
        tags = excluded.tags,
        updated_at = now()
  returning id into v_vendor_profile_id;

  insert into public.company_relationships (
    source_company_id,
    target_company_id,
    relationship_type,
    status,
    invited_by_user_id,
    approved_by_user_id,
    invited_at,
    approved_at,
    starts_at,
    settings,
    compliance,
    notes
  )
  values (
    v_owner_company_id,
    v_wrong_vendor_company_id,
    'amc_vendor',
    'active',
    v_owner_user_id,
    v_owner_user_id,
    now(),
    now(),
    now(),
    '{"demo_seed": "amc_13b_8", "disposable": true, "fixture_role": "wrong_vendor_denial"}'::jsonb,
    '{"summary": "Wrong-vendor edge smoke relationship", "demo_seed": "amc_13b_8"}'::jsonb,
    'AMC-13B.8 disposable wrong-vendor denial relationship.'
  )
  on conflict (source_company_id, target_company_id, relationship_type)
    where status = any (array['invited', 'active', 'suspended'])
  do update
    set status = excluded.status,
        invited_by_user_id = excluded.invited_by_user_id,
        approved_by_user_id = excluded.approved_by_user_id,
        approved_at = excluded.approved_at,
        starts_at = excluded.starts_at,
        settings = public.company_relationships.settings || excluded.settings,
        compliance = public.company_relationships.compliance || excluded.compliance,
        notes = excluded.notes,
        updated_at = now()
  returning id into v_wrong_relationship_id;

  insert into public.company_vendor_profiles (
    owner_company_id,
    vendor_company_id,
    relationship_id,
    vendor_status,
    public_phone,
    default_assignment_instructions,
    capabilities,
    product_eligibility,
    internal_notes,
    tags
  )
  values (
    v_owner_company_id,
    v_wrong_vendor_company_id,
    v_wrong_relationship_id,
    'active',
    '555-0171',
    'Disposable AMC wrong-vendor fixture. Use only for local edge smoke validation.',
    '{"commercial": true, "residential": true, "default_turn_time_days": 6}'::jsonb,
    '{"commercial_appraisal": true, "residential_appraisal": true, "appraisal": true}'::jsonb,
    'Disposable AMC-13B.8 wrong-vendor edge fixture.',
    array['amc-smoke', 'wrong-vendor']
  )
  on conflict (owner_company_id, vendor_company_id) do update
    set relationship_id = excluded.relationship_id,
        vendor_status = excluded.vendor_status,
        public_phone = excluded.public_phone,
        default_assignment_instructions = excluded.default_assignment_instructions,
        capabilities = excluded.capabilities,
        product_eligibility = excluded.product_eligibility,
        internal_notes = excluded.internal_notes,
        tags = excluded.tags,
        updated_at = now()
  returning id into v_wrong_vendor_profile_id;

  delete from public.vendor_contacts
   where vendor_profile_id = v_vendor_profile_id
     and email = 'amc.smoke.vendor@example.test';

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
  )
  values (
    v_vendor_profile_id,
    v_vendor_user_id,
    'AMC Smoke Vendor',
    'amc.smoke.vendor@example.test',
    '555-0138',
    'Smoke Test Vendor Contact',
    true,
    true,
    'Disposable AMC-13B.2 vendor contact.'
  );

  delete from public.vendor_service_areas
   where vendor_profile_id = v_vendor_profile_id;

  insert into public.vendor_service_areas (vendor_profile_id, state, county, product_type, status)
  values
    (v_vendor_profile_id, 'OH', 'Franklin', 'commercial', 'active'),
    (v_vendor_profile_id, 'OH', 'Franklin', 'commercial_appraisal', 'active'),
    (v_vendor_profile_id, 'OH', 'Franklin', 'residential', 'active'),
    (v_vendor_profile_id, 'OH', 'Franklin', 'residential_appraisal', 'active'),
    (v_vendor_profile_id, 'OH', 'Franklin', 'appraisal', 'active');

  insert into public.orders (
    company_id,
    owner_id,
    order_number,
    external_order_no,
    title,
    status,
    manual_client,
    manual_client_name,
    property_address,
    address,
    city,
    state,
    county,
    postal_code,
    zip,
    property_type,
    report_type,
    date_ordered,
    due_date,
    client_due_at,
    final_due_at,
    review_due_at,
    special_instructions,
    notes,
    operations_scope,
    fee_amount,
    appraiser_fee
  )
  values (
    v_owner_company_id,
    v_owner_user_id,
    'AMC-SMOKE-001',
    'AMC-SMOKE-001',
    'AMC Smoke Disposable Full MVP Order',
    'new',
    'AMC Smoke Demo Lender',
    'AMC Smoke Demo Lender',
    '1313 Smoke Test Lane',
    '1313 Smoke Test Lane',
    'Columbus',
    'OH',
    'Franklin',
    '43215',
    '43215',
    'Commercial',
    'Appraisal',
    current_date,
    current_date + 14,
    now() + interval '14 days',
    now() + interval '14 days',
    now() + interval '12 days',
    'Disposable AMC-13B.2 smoke order. Do not use outside local testing.',
    'AMC-13B.2 disposable local smoke fixture.',
    'amc_operations',
    1200,
    650
  )
  on conflict (order_number) do update
    set company_id = excluded.company_id,
        owner_id = excluded.owner_id,
        external_order_no = excluded.external_order_no,
        title = excluded.title,
        status = excluded.status,
        manual_client = excluded.manual_client,
        manual_client_name = excluded.manual_client_name,
        property_address = excluded.property_address,
        address = excluded.address,
        city = excluded.city,
        state = excluded.state,
        county = excluded.county,
        postal_code = excluded.postal_code,
        zip = excluded.zip,
        property_type = excluded.property_type,
        report_type = excluded.report_type,
        date_ordered = excluded.date_ordered,
        due_date = excluded.due_date,
        client_due_at = excluded.client_due_at,
        final_due_at = excluded.final_due_at,
        review_due_at = excluded.review_due_at,
        special_instructions = excluded.special_instructions,
        notes = excluded.notes,
        operations_scope = excluded.operations_scope,
        fee_amount = excluded.fee_amount,
        appraiser_fee = excluded.appraiser_fee,
        updated_at = now()
  returning id into v_order_id;

  delete from public.order_vendor_bid_responses response
  using public.order_vendor_bid_request_recipients recipient,
        public.order_vendor_bid_requests request
  where response.recipient_id = recipient.id
    and recipient.bid_request_id = request.id
    and request.order_id = v_order_id
    and request.metadata ->> 'demo_seed' = 'amc_13b_2';

  delete from public.order_vendor_bid_request_recipients recipient
  using public.order_vendor_bid_requests request
  where recipient.bid_request_id = request.id
    and request.order_id = v_order_id
    and request.metadata ->> 'demo_seed' = 'amc_13b_2';

  delete from public.order_vendor_bid_requests
   where order_id = v_order_id
     and metadata ->> 'demo_seed' = 'amc_13b_2';

  insert into public.order_vendor_bid_requests (
    company_id,
    order_id,
    requested_by_user_id,
    request_message,
    response_due_at,
    client_due_at,
    desired_vendor_due_at,
    review_due_at,
    status,
    metadata
  )
  values (
    v_owner_company_id,
    v_order_id,
    v_owner_user_id,
    'Disposable AMC smoke bid request. Please submit fee, turn time, and availability.',
    now() + interval '3 days',
    now() + interval '14 days',
    now() + interval '10 days',
    now() + interval '12 days',
    'sent',
    '{"demo_seed": "amc_13b_2", "disposable": true}'::jsonb
  )
  returning id into v_bid_request_id;

  insert into public.order_vendor_bid_request_recipients (
    bid_request_id,
    vendor_profile_id,
    vendor_company_id,
    relationship_id,
    status,
    sent_at,
    metadata
  )
  values (
    v_bid_request_id,
    v_vendor_profile_id,
    v_vendor_company_id,
    v_relationship_id,
    'sent',
    now(),
    '{"demo_seed": "amc_13b_2", "disposable": true}'::jsonb
  )
  returning id into v_recipient_id;

  insert into public.order_documents (
    company_id,
    order_id,
    uploaded_by_user_id,
    category,
    title,
    file_name,
    mime_type,
    file_size,
    storage_bucket,
    storage_path,
    visibility_scope,
    status
  )
  values (
    v_owner_company_id,
    v_order_id,
    v_owner_user_id,
    'source_documents',
    'Disposable Engagement Letter',
    'amc-smoke-engagement.pdf',
    'application/pdf',
    512,
    'order-documents',
    'amc-smoke-fixtures/AMC-SMOKE-001/source/amc-smoke-engagement.pdf',
    'vendor',
    'active'
  )
  on conflict (storage_bucket, storage_path) do update
    set title = excluded.title,
        file_name = excluded.file_name,
        mime_type = excluded.mime_type,
        file_size = excluded.file_size,
        visibility_scope = excluded.visibility_scope,
        status = excluded.status,
        updated_at = now();

  v_work_key := encode(
    extensions.digest(
      concat_ws(':', 'vendor_available_work_v1', v_recipient_id::text, v_vendor_company_id::text),
      'sha256'
    ),
    'hex'
  );

  raise notice 'AMC smoke owner login: amc.smoke.owner@example.test / FalconSmoke123!';
  raise notice 'AMC smoke vendor login: amc.smoke.vendor@example.test / FalconSmoke123!';
  raise notice 'AMC smoke wrong-vendor login: amc.smoke.wrongvendor@example.test / FalconSmoke123!';
  raise notice 'AMC smoke order: AMC-SMOKE-001';
  raise notice 'AMC smoke vendor company: AMC Smoke Disposable Vendor';
  raise notice 'AMC smoke wrong-vendor company: AMC Smoke Wrong Vendor';
  raise notice 'AMC smoke available work key: %', v_work_key;
end;
$$;

commit;

select
  'fixture_records' as check_name,
  (select count(*) from auth.users where email in ('amc.smoke.owner@example.test', 'amc.smoke.vendor@example.test', 'amc.smoke.wrongvendor@example.test')) as auth_users,
  (select count(*) from public.users where email in ('amc.smoke.owner@example.test', 'amc.smoke.vendor@example.test', 'amc.smoke.wrongvendor@example.test')) as app_users,
  (select count(*) from public.companies where slug in ('falcon_default', 'amc-smoke-disposable-vendor', 'amc-smoke-wrong-vendor')) as companies,
  (select count(*) from public.company_vendor_profiles cvp join public.companies c on c.id = cvp.vendor_company_id where c.slug = 'amc-smoke-wrong-vendor') as wrong_vendor_profiles,
  (select count(*) from public.orders where order_number = 'AMC-SMOKE-001' and operations_scope = 'amc_operations') as amc_orders,
  (select count(*) from public.order_vendor_bid_requests br join public.orders o on o.id = br.order_id where o.order_number = 'AMC-SMOKE-001' and br.status = 'sent') as sent_bid_requests,
  (select count(*) from public.order_vendor_bid_request_recipients brr join public.order_vendor_bid_requests br on br.id = brr.bid_request_id join public.orders o on o.id = br.order_id where o.order_number = 'AMC-SMOKE-001' and brr.status = 'sent') as sent_bid_recipients;

select
  'current_company_context' as check_name,
  public.current_company_id() as current_company_id,
  (select slug from public.companies where id = public.current_company_id()) as current_company_slug,
  'Direct SQL sessions without JWT claims still fall back to falcon_default; smoke auth JWTs carry active_company_id for owner/vendor sessions.' as note;
