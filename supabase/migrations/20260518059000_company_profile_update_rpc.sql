begin;

create or replace function public.rpc_company_profile_update(
  p_patch jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_patch jsonb := p_patch;
  v_company public.companies%rowtype;
  v_old_name text;
  v_old_timezone text;
  v_old_locale text;
  v_new_name text;
  v_new_timezone text;
  v_new_locale text;
  v_changed_fields text[] := '{}'::text[];
  v_changed boolean := false;
  v_audit_event_id uuid := null;
  v_profile_complete boolean;
  v_unsupported_key text;
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

  if v_patch is null or jsonb_typeof(v_patch) <> 'object' then
    raise exception 'company_profile_patch_required'
      using errcode = '22023';
  end if;

  select key
    into v_unsupported_key
    from jsonb_object_keys(v_patch) as keys(key)
   where key not in ('name', 'timezone', 'locale')
   order by key
   limit 1;

  if v_unsupported_key is not null then
    raise exception 'unsupported_company_profile_field: %', v_unsupported_key
      using errcode = '22023';
  end if;

  select *
    into v_company
    from public.companies c
   where c.id = v_company_id
   for update;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company.status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('company.update_profile') then
    raise exception 'company_update_profile_permission_required'
      using errcode = '42501';
  end if;

  v_old_name := v_company.name;
  v_old_timezone := v_company.timezone;
  v_old_locale := v_company.locale;
  v_new_name := v_old_name;
  v_new_timezone := v_old_timezone;
  v_new_locale := v_old_locale;

  if v_patch ? 'name' then
    v_new_name := trim(coalesce(v_patch->>'name', ''));

    if v_new_name = '' then
      raise exception 'company_name_required'
        using errcode = '22023';
    end if;

    if length(v_new_name) > 160 then
      raise exception 'company_name_too_long'
        using errcode = '22023';
    end if;
  end if;

  if v_patch ? 'timezone' then
    v_new_timezone := trim(coalesce(v_patch->>'timezone', ''));

    if v_new_timezone = '' then
      raise exception 'company_timezone_required'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
        from pg_timezone_names t
       where t.name = v_new_timezone
    ) then
      raise exception 'invalid_company_timezone'
        using errcode = '22023';
    end if;
  end if;

  if v_patch ? 'locale' then
    v_new_locale := trim(coalesce(v_patch->>'locale', ''));

    if v_new_locale = '' then
      raise exception 'company_locale_required'
        using errcode = '22023';
    end if;

    if v_new_locale <> 'en-US' then
      raise exception 'invalid_company_locale'
        using errcode = '22023';
    end if;
  end if;

  if v_new_name is distinct from v_old_name then
    v_changed_fields := array_append(v_changed_fields, 'name');
  end if;

  if v_new_timezone is distinct from v_old_timezone then
    v_changed_fields := array_append(v_changed_fields, 'timezone');
  end if;

  if v_new_locale is distinct from v_old_locale then
    v_changed_fields := array_append(v_changed_fields, 'locale');
  end if;

  v_changed := coalesce(array_length(v_changed_fields, 1), 0) > 0;

  if v_changed then
    update public.companies c
       set name = v_new_name,
           timezone = v_new_timezone,
           locale = v_new_locale,
           updated_at = now()
     where c.id = v_company_id
     returning *
      into v_company;

    insert into public.company_audit_events (
      company_id,
      actor_user_id,
      actor_auth_id,
      actor_kind,
      event_type,
      target_type,
      target_id,
      metadata
    )
    values (
      v_company_id,
      v_actor_user_id,
      v_actor_auth_id,
      'operator',
      'company.profile_updated',
      'company',
      v_company_id,
      jsonb_build_object(
        'changed_fields', to_jsonb(v_changed_fields),
        'previous', jsonb_build_object(
          'name', case when 'name' = any(v_changed_fields) then v_old_name else null end,
          'timezone', case when 'timezone' = any(v_changed_fields) then v_old_timezone else null end,
          'locale', case when 'locale' = any(v_changed_fields) then v_old_locale else null end
        ) - (
          select coalesce(array_agg(key), '{}'::text[])
          from jsonb_each_text(jsonb_build_object(
            'name', case when 'name' = any(v_changed_fields) then v_old_name else null end,
            'timezone', case when 'timezone' = any(v_changed_fields) then v_old_timezone else null end,
            'locale', case when 'locale' = any(v_changed_fields) then v_old_locale else null end
          )) as entries(key, value)
          where value is null
        ),
        'current', jsonb_build_object(
          'name', case when 'name' = any(v_changed_fields) then v_new_name else null end,
          'timezone', case when 'timezone' = any(v_changed_fields) then v_new_timezone else null end,
          'locale', case when 'locale' = any(v_changed_fields) then v_new_locale else null end
        ) - (
          select coalesce(array_agg(key), '{}'::text[])
          from jsonb_each_text(jsonb_build_object(
            'name', case when 'name' = any(v_changed_fields) then v_new_name else null end,
            'timezone', case when 'timezone' = any(v_changed_fields) then v_new_timezone else null end,
            'locale', case when 'locale' = any(v_changed_fields) then v_new_locale else null end
          )) as entries(key, value)
          where value is null
        )
      )
    )
    returning id into v_audit_event_id;
  end if;

  v_profile_complete :=
    nullif(trim(v_company.slug), '') is not null
    and nullif(trim(v_company.name), '') is not null
    and nullif(trim(v_company.company_type), '') is not null
    and nullif(trim(v_company.timezone), '') is not null
    and nullif(trim(v_company.locale), '') is not null;

  return jsonb_build_object(
    'status', case when v_changed then 'updated' else 'unchanged' end,
    'company_id', v_company.id,
    'profile', jsonb_build_object(
      'name', v_company.name,
      'timezone', v_company.timezone,
      'locale', v_company.locale,
      'profile_complete', v_profile_complete,
      'updated_at', v_company.updated_at
    ),
    'changed_fields', to_jsonb(v_changed_fields),
    'audit_event_id', v_audit_event_id,
    'warnings', '[]'::jsonb,
    'setup_context_refresh_recommended', true,
    'source', jsonb_build_object(
      'rpc', 'rpc_company_profile_update',
      'version', 'v1'
    )
  );
end;
$$;

revoke all privileges on function public.rpc_company_profile_update(jsonb) from public, anon;
grant execute on function public.rpc_company_profile_update(jsonb) to authenticated, service_role;

comment on function public.rpc_company_profile_update(jsonb) is
  'Phase 10D3 guarded current-company profile update RPC. Updates only name, timezone, and locale; rejects broad settings and authority fields; readiness/onboarding/product-mode/module metadata remain non-authoritative.';

commit;
