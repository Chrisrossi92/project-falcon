begin;

create or replace function public.rpc_company_bootstrap_v1(p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_company jsonb := coalesce(p_payload -> 'company', '{}'::jsonb);
  v_owner jsonb := coalesce(p_payload -> 'owner', '{}'::jsonb);
  v_source jsonb := coalesce(p_payload -> 'source', '{}'::jsonb);
  v_metadata jsonb := coalesce(p_payload -> 'metadata', '{}'::jsonb);
  v_product_intent jsonb := coalesce(p_payload -> 'product_intent', '{}'::jsonb);
  v_branding_seed jsonb := coalesce(p_payload -> 'branding_seed', '{}'::jsonb);
  v_settings_seed jsonb := coalesce(p_payload -> 'settings_seed', '{}'::jsonb);

  v_request_id text;
  v_idempotency_key text;
  v_dry_run boolean := false;

  v_company_slug text;
  v_company_name text;
  v_company_legal_name text;
  v_company_type text;
  v_timezone text;
  v_locale text;

  v_owner_auth_id uuid;
  v_owner_auth_id_raw text;
  v_owner_email text;
  v_owner_name text;
  v_owner_phone text;

  v_existing_completed public.company_audit_events%rowtype;
  v_existing_company public.companies%rowtype;
  v_owner_role_id uuid;
  v_bootstrap_result record;
  v_audit_event_ids jsonb := '[]'::jsonb;
  v_audit_event_count integer := 0;
  v_created jsonb := '[]'::jsonb;
  v_updated jsonb := '[]'::jsonb;
  v_skipped jsonb;
  v_warnings jsonb;
  v_readiness_summary jsonb;
  v_readiness_checks jsonb;
  v_blocking_items jsonb := '[]'::jsonb;
  v_critical_count integer := 0;
  v_warning_count integer := 1;
  v_deferred_count integer := 1;
  v_unknown_count integer := 4;
  v_optional_count integer := 0;
  v_result_status text;
  v_generated_at timestamptz := now();
  v_primitive_metadata jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'payload_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_company) <> 'object' then
    raise exception 'company_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_owner) <> 'object' then
    raise exception 'owner_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_source) <> 'object' then
    raise exception 'source_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'metadata_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_product_intent) <> 'object' then
    raise exception 'product_intent_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_branding_seed) <> 'object' then
    raise exception 'branding_seed_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_settings_seed) <> 'object' then
    raise exception 'settings_seed_must_be_object'
      using errcode = '22023';
  end if;

  if v_payload ? 'dry_run' then
    if jsonb_typeof(v_payload -> 'dry_run') <> 'boolean' then
      raise exception 'dry_run_must_be_boolean'
        using errcode = '22023';
    end if;

    v_dry_run := (v_payload ->> 'dry_run')::boolean;
  end if;

  v_request_id := nullif(btrim(coalesce(
    v_payload ->> 'request_id',
    v_payload ->> 'requestId'
  )), '');

  v_idempotency_key := nullif(btrim(coalesce(
    v_payload ->> 'idempotency_key',
    v_payload ->> 'idempotencyKey',
    v_request_id
  )), '');

  if v_request_id is not null
     and v_idempotency_key is not null
     and v_request_id <> v_idempotency_key then
    raise exception 'request_id_idempotency_key_mismatch'
      using errcode = '22023';
  end if;

  if v_idempotency_key is null then
    raise exception 'idempotency_key_required'
      using errcode = '22023';
  end if;

  v_company_name := btrim(coalesce(
    v_company ->> 'display_name',
    v_company ->> 'name',
    v_payload ->> 'company_display_name',
    v_payload ->> 'company_name'
  ));

  if v_company_name = '' then
    raise exception 'company_name_required'
      using errcode = '22023';
  end if;

  v_company_legal_name := nullif(btrim(coalesce(
    v_company ->> 'legal_name',
    v_payload ->> 'company_legal_name'
  )), '');

  v_company_slug := lower(btrim(coalesce(
    v_company ->> 'slug',
    v_payload ->> 'company_slug',
    v_payload ->> 'slug',
    regexp_replace(regexp_replace(v_company_name, '[^A-Za-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')
  )));

  if v_company_slug = '' or v_company_slug !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'invalid_company_slug'
      using errcode = '22023';
  end if;

  if v_company_slug = 'falcon_default' then
    raise exception 'reserved_company_slug'
      using errcode = '22023';
  end if;

  v_company_type := lower(btrim(coalesce(
    v_company ->> 'company_type',
    v_company ->> 'type',
    v_payload ->> 'company_type',
    'staff_shop'
  )));

  v_timezone := btrim(coalesce(
    v_company ->> 'timezone',
    v_payload ->> 'timezone',
    'America/New_York'
  ));

  v_locale := btrim(coalesce(
    v_company ->> 'locale',
    v_payload ->> 'locale',
    'en-US'
  ));

  if v_timezone = '' then
    raise exception 'timezone_required'
      using errcode = '22023';
  end if;

  if v_locale = '' then
    raise exception 'locale_required'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
      from public.company_types ct
     where ct.key = v_company_type
       and ct.is_active = true
  ) then
    raise exception 'invalid_company_type'
      using errcode = '22023';
  end if;

  v_owner_auth_id_raw := nullif(btrim(coalesce(
    v_owner ->> 'auth_user_id',
    v_owner ->> 'auth_id',
    v_payload ->> 'owner_auth_id',
    v_payload ->> 'owner_auth_user_id'
  )), '');

  if v_owner_auth_id_raw is null then
    raise exception 'owner_auth_id_required'
      using errcode = '22023';
  end if;

  if v_owner_auth_id_raw !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'invalid_owner_auth_id'
      using errcode = '22023';
  end if;

  v_owner_auth_id := v_owner_auth_id_raw::uuid;

  v_owner_email := lower(btrim(coalesce(
    v_owner ->> 'email',
    v_payload ->> 'owner_email'
  )));

  if v_owner_email = '' or v_owner_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_owner_email'
      using errcode = '22023';
  end if;

  v_owner_name := btrim(coalesce(
    v_owner ->> 'display_name',
    v_owner ->> 'name',
    v_payload ->> 'owner_display_name',
    v_payload ->> 'owner_name'
  ));

  if v_owner_name = '' then
    raise exception 'owner_name_required'
      using errcode = '22023';
  end if;

  v_owner_phone := nullif(btrim(coalesce(
    v_owner ->> 'phone',
    v_payload ->> 'owner_phone'
  )), '');

  select r.id
    into v_owner_role_id
    from public.roles r
   where r.company_id is null
     and lower(r.name) = 'owner'
     and r.is_owner_role = true
   order by r.created_at asc
   limit 1;

  if v_owner_role_id is null then
    raise exception 'owner_template_role_missing'
      using errcode = '55000';
  end if;

  select *
    into v_existing_completed
    from public.company_audit_events cae
   where cae.event_type = 'company.bootstrap.completed'
     and cae.idempotency_key = v_idempotency_key
   order by cae.created_at desc
   limit 1;

  if found then
    select *
      into v_existing_company
      from public.companies c
     where c.id = v_existing_completed.company_id;

    if not found then
      raise exception 'bootstrap_partial_state_requires_operator_review'
        using errcode = '55000',
              detail = 'Completed bootstrap audit event references a missing company.';
    end if;

    if v_existing_company.slug <> v_company_slug then
      raise exception 'idempotency_key_company_slug_mismatch'
        using errcode = '23505';
    end if;

    if coalesce(v_existing_completed.metadata ->> 'owner_auth_id', '') <> v_owner_auth_id::text
       or lower(coalesce(v_existing_completed.metadata ->> 'owner_email', '')) <> v_owner_email then
      raise exception 'idempotency_key_owner_mismatch'
        using errcode = '23505';
    end if;
  end if;

  select *
    into v_existing_company
    from public.companies c
   where c.slug = v_company_slug;

  if found
     and v_existing_completed.id is null then
    if exists (
      select 1
        from public.company_audit_events cae
       where cae.company_id = v_existing_company.id
         and cae.event_type = 'company.bootstrap.completed'
    ) then
      raise exception 'duplicate_company_slug'
        using errcode = '23505';
    end if;

    raise exception 'bootstrap_partial_state_requires_operator_review'
      using errcode = '55000',
            detail = 'Company slug exists without a matching completed bootstrap audit event.';
  end if;

  v_skipped := jsonb_build_array(
    'order_numbering_defaults',
    'notification_defaults',
    'onboarding_persistence',
    'module_package_state',
    'vendor_client_activation',
    'owner_setup_ui_wiring',
    'dashboard_prompts',
    'live_setup_context_integration'
  );

  v_warnings := jsonb_build_array(
    jsonb_build_object(
      'code', 'order_numbering_defaults_skipped',
      'severity', 'unknown',
      'message', 'Company-safe order-numbering defaults are not implemented in this wrapper.'
    ),
    jsonb_build_object(
      'code', 'notification_defaults_skipped',
      'severity', 'unknown',
      'message', 'Company-specific notification defaults are not implemented in this wrapper.'
    ),
    jsonb_build_object(
      'code', 'onboarding_persistence_not_configured',
      'severity', 'unknown',
      'message', 'Durable onboarding persistence is intentionally deferred.'
    ),
    jsonb_build_object(
      'code', 'module_package_state_not_persisted',
      'severity', 'unknown',
      'message', 'Product-mode and module intent are metadata only and do not authorize access.'
    ),
    jsonb_build_object(
      'code', 'vendor_client_activation_not_supported',
      'severity', 'deferred',
      'message', 'Vendor and Client live shells are not activated by bootstrap.'
    ),
    jsonb_build_object(
      'code', 'active_company_refresh_required',
      'severity', 'warning',
      'message', 'A caller-owned Edge/server flow must refresh active-company session metadata when needed.'
    )
  );

  if v_dry_run then
    v_readiness_checks := jsonb_build_array(
      jsonb_build_object(
        'key', 'input_validation',
        'label', 'Required bootstrap inputs',
        'severity', 'optional',
        'ready', true,
        'status', 'valid',
        'source', 'wrapper_validation'
      ),
      jsonb_build_object(
        'key', 'owner_template_role',
        'label', 'Owner template role',
        'severity', 'optional',
        'ready', true,
        'status', 'valid',
        'source', 'roles'
      ),
      jsonb_build_object(
        'key', 'records_created',
        'label', 'Bootstrap records created',
        'severity', 'optional',
        'ready', false,
        'status', 'not_run',
        'source', 'dry_run'
      ),
      jsonb_build_object(
        'key', 'setup_context',
        'label', 'Authenticated setup context',
        'severity', 'unknown',
        'ready', null,
        'status', 'not_evaluated',
        'source', 'intentionally_avoided'
      )
    );

    v_readiness_summary := jsonb_build_object(
      'status', 'dry_run_valid',
      'diagnostic_only', true,
      'setup_context_used', false,
      'setup_context_reason', 'rpc_company_setup_context requires an authenticated current-company user/session; dry-run creates no company context.',
      'severity_counts', jsonb_build_object(
        'critical', 0,
        'warning', v_warning_count,
        'optional', 3,
        'deferred', v_deferred_count,
        'unknown', v_unknown_count + 1
      ),
      'checklist_items', v_readiness_checks,
      'blocking_items', '[]'::jsonb,
      'warnings', v_warnings,
      'unknowns', jsonb_build_array(
        'order_numbering',
        'notification_defaults',
        'onboarding_persistence',
        'module_package_state',
        'setup_context'
      ),
      'next_recommended_action', 'run_bootstrap_non_dry_run_through_service_role_operator_boundary'
    );

    return jsonb_strip_nulls(jsonb_build_object(
      'status', 'dry_run_valid',
      'company_id', null,
      'company_slug', v_company_slug,
      'company_name', v_company_name,
      'company_type', v_company_type,
      'owner_user_id', null,
      'owner_auth_id', v_owner_auth_id,
      'owner_membership_id', null,
      'owner_role_assignment_id', null,
      'owner_role_id', v_owner_role_id,
      'active_company_context', null,
      'readiness_summary', v_readiness_summary,
      'created', '[]'::jsonb,
      'updated', '[]'::jsonb,
      'skipped', v_skipped,
      'warnings', v_warnings,
      'audit_event_ids', '[]'::jsonb,
      'idempotency_key', v_idempotency_key,
      'generated_at', v_generated_at,
      'source', jsonb_build_object(
        'name', 'rpc_company_bootstrap_v1',
        'version', '1',
        'mode', 'dry_run',
        'post_validation', 'sql_local',
        'request_source', v_source
      )
    ));
  end if;

  v_primitive_metadata := v_metadata || jsonb_strip_nulls(jsonb_build_object(
    'wrapper', 'rpc_company_bootstrap_v1',
    'wrapper_version', '1',
    'request_id', coalesce(v_request_id, v_idempotency_key),
    'company_legal_name', v_company_legal_name,
    'source', v_source,
    'product_intent', v_product_intent,
    'has_branding_seed', v_branding_seed <> '{}'::jsonb,
    'has_settings_seed', v_settings_seed <> '{}'::jsonb,
    'skipped_domains', v_skipped
  ));

  select *
    into v_bootstrap_result
    from public.rpc_company_bootstrap(
      v_company_slug,
      v_company_name,
      v_company_type,
      v_timezone,
      v_locale,
      v_owner_auth_id,
      v_owner_email,
      v_owner_name,
      v_owner_phone,
      v_idempotency_key,
      v_primitive_metadata
    );

  select
    coalesce(jsonb_agg(cae.id order by cae.created_at), '[]'::jsonb),
    count(*)::integer
    into v_audit_event_ids, v_audit_event_count
    from public.company_audit_events cae
   where cae.company_id = v_bootstrap_result.company_id
     and cae.idempotency_key = v_idempotency_key;

  v_result_status := coalesce(v_bootstrap_result.bootstrap_status, 'created');

  if v_result_status = 'created' then
    v_created := jsonb_build_array(
      'company',
      'owner_user_mapping',
      'owner_membership',
      'owner_role_assignment',
      'bootstrap_audit_events'
    );
  elsif v_result_status = 'idempotent_replay' then
    v_skipped := v_skipped || jsonb_build_array('existing_bootstrap_state_reused');
  end if;

  if v_bootstrap_result.company_id is null then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('company_id_missing');
  end if;

  if v_bootstrap_result.owner_user_id is null then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('owner_user_id_missing');
  end if;

  if v_bootstrap_result.membership_id is null then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('owner_membership_id_missing');
  end if;

  if v_bootstrap_result.owner_role_assignment_id is null then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('owner_role_assignment_id_missing');
  end if;

  if v_result_status not in ('created', 'idempotent_replay') then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('bootstrap_status_not_successful');
  end if;

  if v_audit_event_count < 1 then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('bootstrap_audit_events_missing');
  end if;

  v_readiness_checks := jsonb_build_array(
    jsonb_build_object(
      'key', 'company_record',
      'label', 'Company record',
      'severity', 'critical',
      'ready', v_bootstrap_result.company_id is not null,
      'status', case when v_bootstrap_result.company_id is not null then 'ready' else 'blocked' end,
      'source', 'bootstrap_result'
    ),
    jsonb_build_object(
      'key', 'owner_user',
      'label', 'Owner app user mapping',
      'severity', 'critical',
      'ready', v_bootstrap_result.owner_user_id is not null,
      'status', case when v_bootstrap_result.owner_user_id is not null then 'ready' else 'blocked' end,
      'source', 'bootstrap_result'
    ),
    jsonb_build_object(
      'key', 'owner_membership',
      'label', 'Owner membership',
      'severity', 'critical',
      'ready', v_bootstrap_result.membership_id is not null,
      'status', case when v_bootstrap_result.membership_id is not null then 'ready' else 'blocked' end,
      'source', 'bootstrap_result'
    ),
    jsonb_build_object(
      'key', 'owner_role_assignment',
      'label', 'Owner role assignment',
      'severity', 'critical',
      'ready', v_bootstrap_result.owner_role_assignment_id is not null,
      'status', case when v_bootstrap_result.owner_role_assignment_id is not null then 'ready' else 'blocked' end,
      'source', 'bootstrap_result'
    ),
    jsonb_build_object(
      'key', 'bootstrap_status',
      'label', 'Bootstrap status',
      'severity', 'critical',
      'ready', v_result_status in ('created', 'idempotent_replay'),
      'status', v_result_status,
      'source', 'bootstrap_result'
    ),
    jsonb_build_object(
      'key', 'audit_events',
      'label', 'Bootstrap audit events',
      'severity', 'critical',
      'ready', v_audit_event_count > 0,
      'status', case when v_audit_event_count > 0 then 'ready' else 'blocked' end,
      'count', v_audit_event_count,
      'source', 'company_audit_events'
    ),
    jsonb_build_object(
      'key', 'setup_context',
      'label', 'Authenticated setup context',
      'severity', 'unknown',
      'ready', null,
      'status', 'not_evaluated',
      'source', 'intentionally_avoided'
    ),
    jsonb_build_object(
      'key', 'order_numbering',
      'label', 'Order numbering defaults',
      'severity', 'unknown',
      'ready', null,
      'status', 'not_seeded',
      'source', 'intentionally_skipped'
    ),
    jsonb_build_object(
      'key', 'notification_defaults',
      'label', 'Notification defaults',
      'severity', 'unknown',
      'ready', null,
      'status', 'not_seeded',
      'source', 'intentionally_skipped'
    ),
    jsonb_build_object(
      'key', 'vendor_client_activation',
      'label', 'Vendor/Client live surfaces',
      'severity', 'deferred',
      'ready', false,
      'status', 'not_activated',
      'source', 'intentionally_skipped'
    )
  );

  v_readiness_summary := jsonb_build_object(
    'status', case when v_critical_count = 0 then 'ready_for_orders' else 'blocked' end,
    'diagnostic_only', true,
    'setup_context_used', false,
    'setup_context_reason', 'rpc_company_setup_context requires an authenticated current-company user/session; service-role bootstrap does not mutate session context.',
    'severity_counts', jsonb_build_object(
      'critical', v_critical_count,
      'warning', v_warning_count,
      'optional', v_optional_count,
      'deferred', v_deferred_count,
      'unknown', v_unknown_count + 1
    ),
    'checklist_items', v_readiness_checks,
    'blocking_items', v_blocking_items,
    'warnings', v_warnings,
    'unknowns', jsonb_build_array(
      'order_numbering',
      'notification_defaults',
      'onboarding_persistence',
      'module_package_state',
      'setup_context'
    ),
    'next_recommended_action', case
      when v_critical_count = 0 then 'refresh_owner_active_company_context_then_run_authenticated_setup_context'
      else 'operator_review_required'
    end
  );

  return jsonb_strip_nulls(jsonb_build_object(
    'status', v_result_status,
    'company_id', v_bootstrap_result.company_id,
    'company_slug', v_bootstrap_result.company_slug,
    'company_name', v_bootstrap_result.company_name,
    'company_type', v_bootstrap_result.company_type,
    'company_status', v_bootstrap_result.company_status,
    'owner_user_id', v_bootstrap_result.owner_user_id,
    'owner_auth_id', v_bootstrap_result.owner_auth_id,
    'owner_email', v_bootstrap_result.owner_email,
    'owner_membership_id', v_bootstrap_result.membership_id,
    'owner_role_assignment_id', v_bootstrap_result.owner_role_assignment_id,
    'owner_role_id', v_bootstrap_result.owner_role_id,
    'active_company_context', v_bootstrap_result.active_company_metadata,
    'readiness_summary', v_readiness_summary,
    'created', v_created,
    'updated', v_updated,
    'skipped', v_skipped,
    'warnings', v_warnings,
    'audit_event_ids', v_audit_event_ids,
    'idempotency_key', v_idempotency_key,
    'generated_at', v_generated_at,
    'source', jsonb_build_object(
      'name', 'rpc_company_bootstrap_v1',
      'version', '1',
      'mode', 'mutation',
      'post_validation', 'sql_local',
      'request_source', v_source
    )
  ));
end;
$$;

revoke all privileges on function public.rpc_company_bootstrap_v1(jsonb) from public, anon, authenticated;
grant execute on function public.rpc_company_bootstrap_v1(jsonb) to service_role;

comment on function public.rpc_company_bootstrap_v1(jsonb) is
  'Service-role/operator-only JSON wrapper for company bootstrap. Delegates mutation to rpc_company_bootstrap(...), supports dry-run validation, returns SQL-local diagnostic post-bootstrap readiness, is not browser callable, and does not seed order numbering, notification defaults, onboarding persistence, module/package authority, Vendor/Client shells, UI wiring, or runtime access authority.';

commit;
