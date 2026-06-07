begin;

create or replace function public.rpc_amc_vendor_profile_update_requests(
  p_status text default 'pending'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_owner_company_id uuid := public.current_company_id();
  v_status text := lower(nullif(btrim(coalesce(p_status, 'pending')), ''));
  v_requests jsonb := '[]'::jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_owner_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendors.read')
     or not public.current_app_user_has_permission('vendors.update') then
    raise exception 'vendor_profile_update_review_permission_required'
      using errcode = '42501';
  end if;

  if v_status is not null
     and v_status not in ('pending', 'reviewing', 'approved', 'rejected', 'cancelled', 'all') then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_profile_update_request_status_invalid',
      'field_errors', jsonb_build_object('status', 'Choose a valid request status.')
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'request_key', vpur.request_key,
        'vendor_company_name', vendor_company.name,
        'status', vpur.status,
        'submitted_at', vpur.created_at,
        'updated_at', vpur.updated_at,
        'reviewed_at', vpur.reviewed_at,
        'reviewer_message', vpur.reviewer_message,
        'current_snapshot', vpur.current_snapshot,
        'proposed_changes', vpur.request_payload
      )
      order by vpur.created_at desc
    ),
    '[]'::jsonb
  )
    into v_requests
    from public.vendor_profile_update_requests vpur
    join public.company_vendor_profiles cvp
      on cvp.id = vpur.vendor_profile_id
     and cvp.owner_company_id = vpur.owner_company_id
     and cvp.vendor_company_id = vpur.vendor_company_id
    join public.company_relationships cr
      on cr.id = vpur.relationship_id
     and cr.source_company_id = vpur.owner_company_id
     and cr.target_company_id = vpur.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    join public.companies vendor_company
      on vendor_company.id = vpur.vendor_company_id
   where vpur.owner_company_id = v_owner_company_id
     and cvp.vendor_status not in ('inactive', 'do_not_use')
     and (v_status is null or v_status = 'all' or vpur.status = v_status);

  return jsonb_build_object(
    'ok', true,
    'requests', coalesce(v_requests, '[]'::jsonb)
  );
end;
$$;

create or replace function public.rpc_amc_review_vendor_profile_update_request(
  p_request_key text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_owner_company_id uuid := public.current_company_id();
  v_request public.vendor_profile_update_requests%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_vendor_company_name text;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_request_key text := nullif(btrim(coalesce(p_request_key, '')), '');
  v_decision text;
  v_reviewer_message text;
  v_field_errors jsonb := '{}'::jsonb;
  v_contact_changes jsonb := '{}'::jsonb;
  v_company_changes jsonb := '{}'::jsonb;
  v_coverage_changes jsonb := '{}'::jsonb;
  v_accepted_work_types jsonb := '{}'::jsonb;
  v_product_eligibility jsonb := '{}'::jsonb;
  v_existing_contact public.vendor_contacts%rowtype;
  v_contact_name text;
  v_contact_email text;
  v_contact_phone text;
  v_contact_role text;
  v_value text;
  v_state text;
  v_county text;
  v_recipient_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_owner_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendors.read')
     or not public.current_app_user_has_permission('vendors.update') then
    raise exception 'vendor_profile_update_review_permission_required'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) is distinct from 'object' then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_profile_update_review_invalid',
      'field_errors', jsonb_build_object('payload', 'Review payload must be an object.')
    );
  end if;

  v_decision := lower(nullif(btrim(coalesce(v_payload ->> 'decision', '')), ''));
  if v_decision not in ('approve', 'reject') then
    v_field_errors := v_field_errors || jsonb_build_object('decision', 'Choose approve or reject.');
  end if;

  v_reviewer_message := nullif(btrim(coalesce(
    v_payload ->> 'reviewer_message',
    v_payload ->> 'reviewer_note',
    v_payload ->> 'decision_note',
    ''
  )), '');
  if v_reviewer_message is not null and length(v_reviewer_message) > 2000 then
    v_field_errors := v_field_errors || jsonb_build_object('reviewer_note', 'Reviewer note must be 2,000 characters or fewer.');
  end if;

  if v_request_key is null then
    v_field_errors := v_field_errors || jsonb_build_object('request_key', 'Request key is required.');
  end if;

  if v_field_errors <> '{}'::jsonb then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_profile_update_review_invalid',
      'field_errors', v_field_errors
    );
  end if;

  select vpur.*
    into v_request
    from public.vendor_profile_update_requests vpur
    join public.company_vendor_profiles cvp
      on cvp.id = vpur.vendor_profile_id
     and cvp.owner_company_id = vpur.owner_company_id
     and cvp.vendor_company_id = vpur.vendor_company_id
    join public.company_relationships cr
      on cr.id = vpur.relationship_id
     and cr.source_company_id = vpur.owner_company_id
     and cr.target_company_id = vpur.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
   where vpur.request_key = v_request_key
     and vpur.owner_company_id = v_owner_company_id
     and cvp.vendor_status not in ('inactive', 'do_not_use')
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'vendor_profile_update_request_unavailable');
  end if;

  select vendor_company.name
    into v_vendor_company_name
    from public.companies vendor_company
   where vendor_company.id = v_request.vendor_company_id
   limit 1;

  if v_request.status not in ('pending', 'reviewing') then
    return jsonb_build_object('ok', false, 'error', 'vendor_profile_update_request_already_reviewed');
  end if;

  select *
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.id = v_request.vendor_profile_id
     and cvp.owner_company_id = v_owner_company_id
     and cvp.vendor_company_id = v_request.vendor_company_id
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'vendor_profile_update_request_unavailable');
  end if;

  if v_decision = 'approve' then
    if not public.current_app_user_has_permission('vendors.contacts.manage')
       or not public.current_app_user_has_permission('vendors.service_areas.manage') then
      raise exception 'vendor_profile_update_review_permission_required'
        using errcode = '42501';
    end if;

    v_contact_changes := coalesce(v_request.request_payload -> 'contact_changes', '{}'::jsonb);
    v_company_changes := coalesce(v_request.request_payload -> 'company_changes', '{}'::jsonb);
    v_coverage_changes := coalesce(v_request.request_payload -> 'coverage_changes', '{}'::jsonb);
    v_accepted_work_types := coalesce(v_request.request_payload -> 'accepted_work_types', '{}'::jsonb);
    v_product_eligibility := coalesce(v_profile.product_eligibility, '{}'::jsonb);

    if jsonb_typeof(v_company_changes) = 'object' then
      update public.company_vendor_profiles
         set website = case when v_company_changes ? 'website'
           then public.amc_vendor_normalized_text(v_company_changes ->> 'website')
           else website end,
             public_phone = case when v_company_changes ? 'public_phone'
           then public.amc_vendor_normalized_text(v_company_changes ->> 'public_phone')
           else public_phone end
       where id = v_profile.id;
    end if;

    if jsonb_typeof(v_accepted_work_types -> 'property_types') = 'array' then
      v_product_eligibility := jsonb_set(
        v_product_eligibility,
        '{property_types}',
        v_accepted_work_types -> 'property_types',
        true
      );
    end if;

    if jsonb_typeof(v_accepted_work_types -> 'report_types') = 'array' then
      v_product_eligibility := jsonb_set(
        v_product_eligibility,
        '{report_types}',
        v_accepted_work_types -> 'report_types',
        true
      );
    end if;

    update public.company_vendor_profiles
       set product_eligibility = coalesce(v_product_eligibility, '{}'::jsonb)
     where id = v_profile.id;

    if jsonb_typeof(v_contact_changes) = 'object' and v_contact_changes <> '{}'::jsonb then
      select *
        into v_existing_contact
        from public.vendor_contacts vc
       where vc.vendor_profile_id = v_profile.id
       order by vc.is_primary desc, vc.updated_at desc, vc.created_at desc
       limit 1;

      v_contact_name := public.amc_vendor_normalized_text(v_contact_changes ->> 'name');
      v_contact_email := public.amc_vendor_normalized_text(v_contact_changes ->> 'email');
      v_contact_phone := public.amc_vendor_normalized_text(v_contact_changes ->> 'phone');
      v_contact_role := public.amc_vendor_normalized_text(v_contact_changes ->> 'role_label');

      if found then
        update public.vendor_contacts
           set name = coalesce(v_contact_name, name),
               email = case when v_contact_changes ? 'email' then v_contact_email else email end,
               phone = case when v_contact_changes ? 'phone' then v_contact_phone else phone end,
               role_label = case when v_contact_changes ? 'role_label' then v_contact_role else role_label end,
               is_primary = true
         where id = v_existing_contact.id;
      elsif v_contact_name is not null then
        insert into public.vendor_contacts (
          vendor_profile_id,
          name,
          email,
          phone,
          role_label,
          is_primary,
          receives_assignment_notifications
        ) values (
          v_profile.id,
          v_contact_name,
          v_contact_email,
          v_contact_phone,
          v_contact_role,
          true,
          true
        );
      end if;
    end if;

    if jsonb_typeof(v_coverage_changes) = 'object' then
      if jsonb_typeof(v_coverage_changes -> 'states') = 'array' then
        for v_value in
          select public.amc_vendor_normalized_text(value)
            from jsonb_array_elements_text(v_coverage_changes -> 'states')
        loop
          if v_value is not null then
            insert into public.vendor_service_areas (vendor_profile_id, state, status)
            values (v_profile.id, upper(v_value), 'active');
          end if;
        end loop;
      end if;

      if jsonb_typeof(v_coverage_changes -> 'counties') = 'array' then
        for v_value in
          select public.amc_vendor_normalized_text(value)
            from jsonb_array_elements_text(v_coverage_changes -> 'counties')
        loop
          if v_value is not null then
            v_county := public.amc_vendor_normalized_text(split_part(v_value, ',', 1));
            v_state := upper(public.amc_vendor_normalized_text(nullif(split_part(v_value, ',', 2), '')));
            insert into public.vendor_service_areas (vendor_profile_id, state, county, status)
            values (v_profile.id, v_state, v_county, 'active');
          end if;
        end loop;
      end if;

      if jsonb_typeof(v_coverage_changes -> 'markets') = 'array' then
        for v_value in
          select public.amc_vendor_normalized_text(value)
            from jsonb_array_elements_text(v_coverage_changes -> 'markets')
        loop
          if v_value is not null then
            insert into public.vendor_service_areas (vendor_profile_id, market, status)
            values (v_profile.id, v_value, 'active');
          end if;
        end loop;
      end if;
    end if;
  end if;

  update public.vendor_profile_update_requests
     set status = case when v_decision = 'approve' then 'approved' else 'rejected' end,
         reviewer_message = v_reviewer_message,
         reviewed_by_user_id = v_actor_user_id,
         reviewed_at = now()
   where id = v_request.id;

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
    v_request.submitted_by_user_id,
    v_request.vendor_company_id,
    'vendor.profile_update_reviewed',
    'vendor_profile',
    case when v_decision = 'approve'
      then 'Vendor profile update approved'
      else 'Vendor profile update rejected'
    end,
    coalesce(v_reviewer_message, ''),
    coalesce(v_reviewer_message, ''),
    false,
    false,
    now(),
    '/vendor-workspace/profile',
    jsonb_build_object(
      'source_type', 'vendor_profile_update_request',
      'event_key', 'vendor.profile_update_reviewed',
      'request_key', v_request.request_key,
      'decision', case when v_decision = 'approve' then 'approved' else 'rejected' end
    ),
    'normal'
  );

  return jsonb_build_object(
    'ok', true,
    'request', jsonb_build_object(
      'request_key', v_request.request_key,
      'vendor_company_name', v_vendor_company_name,
      'status', case when v_decision = 'approve' then 'approved' else 'rejected' end,
      'reviewed_at', now(),
      'reviewer_message', v_reviewer_message
    )
  );
end;
$$;

revoke all on function public.rpc_amc_vendor_profile_update_requests(text) from public, anon;
revoke all on function public.rpc_amc_review_vendor_profile_update_request(text, jsonb) from public, anon;
grant execute on function public.rpc_amc_vendor_profile_update_requests(text) to authenticated, service_role;
grant execute on function public.rpc_amc_review_vendor_profile_update_request(text, jsonb) to authenticated, service_role;

comment on function public.rpc_amc_vendor_profile_update_requests(text) is
  'AMC-11E internal/AMC review queue for vendor profile update requests. Requires vendors.read and vendors.update, scopes to the current owner company and active AMC vendor relationships, and returns opaque request keys plus current/proposed review data only for internal users.';

comment on function public.rpc_amc_review_vendor_profile_update_request(text, jsonb) is
  'AMC-11E internal/AMC approval or rejection RPC for vendor profile update requests. Requires owner-company scope and vendor management permissions. Approval is the only path that mutates live company_vendor_profiles, vendor_contacts, or vendor_service_areas from vendor-submitted profile requests; rejection preserves history without mutation. Vendor notifications include only safe decision copy.';

commit;
