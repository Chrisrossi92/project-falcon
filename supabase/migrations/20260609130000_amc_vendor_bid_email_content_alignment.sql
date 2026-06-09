begin;

create or replace function public.rpc_order_vendor_bid_request_create(
  p_order_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_order public.orders%rowtype;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_recipients jsonb;
  v_send_now boolean := true;
  v_request_status text;
  v_recipient_status text;
  v_bid_request public.order_vendor_bid_requests%rowtype;
  v_bid_request_id uuid;
  v_recipient jsonb;
  v_vendor_profile_id uuid;
  v_vendor_company_id uuid;
  v_relationship_id uuid;
  v_profile public.company_vendor_profiles%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_vendor_company_name text;
  v_recipient_id uuid;
  v_contact public.vendor_contacts%rowtype;
  v_contact_id uuid;
  v_sent_to_email text;
  v_expires_at timestamptz;
  v_token text;
  v_token_hash text;
  v_token_last_four text;
  v_invitation_id uuid;
  v_invitation_path text;
  v_email_queue_id uuid;
  v_email_delivery_status text;
  v_email_warning text;
  v_email_subject text;
  v_email_message text;
  v_recipient_count integer := 0;
  v_result jsonb;
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

  if not public.current_app_user_has_permission('bid_requests.create') then
    raise exception 'bid_request_create_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendors.read') then
    raise exception 'vendor_read_permission_required'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id;

  if not found
     or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id
     or not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'bid_request_order_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    raise exception 'order_scope_not_amc_operations'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'bid_request_payload_invalid'
      using errcode = '22023';
  end if;

  v_recipients := v_payload -> 'recipients';

  if v_recipients is null
     or jsonb_typeof(v_recipients) <> 'array'
     or jsonb_array_length(v_recipients) = 0 then
    raise exception 'bid_request_recipients_required'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_recipients) as recipient(value)
     group by recipient.value ->> 'vendor_profile_id'
    having count(*) > 1
       and recipient.value ->> 'vendor_profile_id' is not null
  ) then
    raise exception 'bid_request_recipient_duplicate'
      using errcode = '23505';
  end if;

  if v_payload ? 'send_now' then
    v_send_now := coalesce((v_payload ->> 'send_now')::boolean, true);
  end if;

  v_request_status := case when v_send_now then 'sent' else 'draft' end;
  v_recipient_status := case when v_send_now then 'sent' else 'pending' end;

  for v_recipient in
    select value from jsonb_array_elements(v_recipients) as recipients(value)
  loop
    if jsonb_typeof(v_recipient) <> 'object' then
      raise exception 'bid_request_payload_invalid'
        using errcode = '22023';
    end if;

    v_vendor_profile_id := nullif(v_recipient ->> 'vendor_profile_id', '')::uuid;
    v_vendor_company_id := nullif(v_recipient ->> 'vendor_company_id', '')::uuid;
    v_relationship_id := nullif(v_recipient ->> 'relationship_id', '')::uuid;

    if v_vendor_profile_id is null
       or v_vendor_company_id is null
       or v_relationship_id is null then
      raise exception 'bid_request_payload_invalid'
        using errcode = '22023';
    end if;

    select *
      into v_profile
      from public.company_vendor_profiles
     where id = v_vendor_profile_id;

    if not found
       or v_profile.owner_company_id <> v_company_id
       or v_profile.vendor_company_id <> v_vendor_company_id then
      raise exception 'bid_request_vendor_not_found_or_not_authorized'
        using errcode = '42501';
    end if;

    if v_profile.vendor_status in ('inactive', 'do_not_use') then
      raise exception 'bid_request_vendor_ineligible'
        using errcode = '42501';
    end if;

    select *
      into v_relationship
      from public.company_relationships
     where id = v_relationship_id;

    if not found
       or v_relationship.source_company_id <> v_company_id
       or v_relationship.target_company_id <> v_vendor_company_id
       or v_relationship.relationship_type <> 'amc_vendor'
       or v_relationship.status <> 'active' then
      raise exception 'bid_request_vendor_ineligible'
        using errcode = '42501';
    end if;

    if v_profile.relationship_id is not null
       and v_profile.relationship_id <> v_relationship_id then
      raise exception 'bid_request_vendor_not_found_or_not_authorized'
        using errcode = '42501';
    end if;
  end loop;

  if exists (
    select 1
      from public.order_vendor_bid_requests br
      join public.order_vendor_bid_request_recipients brr
        on brr.bid_request_id = br.id
      join jsonb_array_elements(v_recipients) as recipient(value)
        on brr.vendor_profile_id = (recipient.value ->> 'vendor_profile_id')::uuid
     where br.company_id = v_company_id
       and br.order_id = p_order_id
       and br.status in ('draft', 'sent', 'partially_responded')
       and brr.status in ('pending', 'sent', 'viewed', 'responded')
  ) then
    raise exception 'bid_request_open_recipient_exists'
      using errcode = '23505';
  end if;

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
  ) values (
    v_company_id,
    p_order_id,
    v_actor_user_id,
    nullif(btrim(v_payload ->> 'request_message'), ''),
    nullif(v_payload ->> 'response_due_at', '')::timestamptz,
    nullif(v_payload ->> 'client_due_at', '')::timestamptz,
    nullif(v_payload ->> 'desired_vendor_due_at', '')::timestamptz,
    nullif(v_payload ->> 'review_due_at', '')::timestamptz,
    v_request_status,
    jsonb_build_object(
      'candidate_snapshot',
      coalesce(v_payload -> 'candidate_snapshot', '{}'::jsonb)
    )
  )
  returning *
    into v_bid_request;

  v_bid_request_id := v_bid_request.id;

  for v_recipient in
    select value from jsonb_array_elements(v_recipients) as recipients(value)
  loop
    v_vendor_profile_id := (v_recipient ->> 'vendor_profile_id')::uuid;
    v_vendor_company_id := (v_recipient ->> 'vendor_company_id')::uuid;
    v_relationship_id := (v_recipient ->> 'relationship_id')::uuid;
    v_vendor_company_name := null;
    v_contact := null;
    v_contact_id := null;
    v_sent_to_email := null;
    v_invitation_id := null;
    v_invitation_path := null;
    v_email_queue_id := null;
    v_email_delivery_status := case when v_send_now then 'not_queued' else 'draft' end;
    v_email_warning := null;

    insert into public.order_vendor_bid_request_recipients (
      bid_request_id,
      vendor_profile_id,
      vendor_company_id,
      relationship_id,
      status,
      sent_at,
      metadata
    ) values (
      v_bid_request_id,
      v_vendor_profile_id,
      v_vendor_company_id,
      v_relationship_id,
      v_recipient_status,
      case when v_send_now then now() else null end,
      jsonb_build_object(
        'candidate_snapshot',
        coalesce(v_recipient -> 'candidate_snapshot', '{}'::jsonb)
      )
    )
    returning id into v_recipient_id;

    if v_send_now then
      select c.name
        into v_vendor_company_name
        from public.companies c
       where c.id = v_vendor_company_id
       limit 1;

      select vc.*
        into v_contact
        from public.vendor_contacts vc
       where vc.vendor_profile_id = v_vendor_profile_id
         and nullif(btrim(vc.email), '') is not null
       order by vc.is_primary desc, vc.receives_assignment_notifications desc, vc.created_at, vc.id
       limit 1;

      if found then
        v_contact_id := v_contact.id;
        v_sent_to_email := lower(btrim(v_contact.email));
      end if;

      if v_sent_to_email is null
         or v_sent_to_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
        v_email_delivery_status := 'missing_email';
        v_email_warning := 'vendor_contact_email_missing';
      else
        v_expires_at := coalesce(
          case
            when v_bid_request.response_due_at is not null
             and v_bid_request.response_due_at > now() then v_bid_request.response_due_at
            else null
          end,
          now() + interval '7 days'
        );
        v_token := encode(extensions.gen_random_bytes(32), 'hex');
        v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
        v_token_last_four := right(v_token, 4);
        v_invitation_path := '/vendor/bid-invitations/' || v_token;
        v_email_subject := concat('Bid request: ', coalesce(nullif(v_order.property_address, ''), nullif(v_order.address, ''), 'Appraisal assignment'));
        v_email_message := concat_ws(
          E'\n',
          'You have been invited to bid on this appraisal assignment.',
          nullif(v_bid_request.request_message, ''),
          '',
          'Property: ' || coalesce(nullif(v_order.property_address, ''), nullif(v_order.address, ''), 'Not provided'),
          'Location: ' || nullif(concat_ws(
            ', ',
            nullif(v_order.city, ''),
            concat_ws(' ', nullif(v_order.state, ''), coalesce(nullif(v_order.postal_code, ''), nullif(v_order.zip, '')))
          ), ''),
          'Property type: ' || coalesce(nullif(v_order.property_type, ''), 'Not provided'),
          'Report type: ' || coalesce(nullif(v_order.report_type, ''), 'Not provided'),
          'Client due: ' || coalesce(coalesce(v_bid_request.client_due_at, v_order.client_due_at, v_order.final_due_at, v_order.due_date::timestamptz)::text, 'Not set'),
          'Vendor due: ' || coalesce(v_bid_request.desired_vendor_due_at::text, 'Not set'),
          'Response due: ' || coalesce(v_bid_request.response_due_at::text, 'Not set'),
          '',
          'Open the secure bid invitation:',
          v_invitation_path,
          '',
          'Please submit your fee, turn time, proposed due date, and comments through the secure link.'
        );

        update public.order_vendor_bid_request_recipient_invitations
           set revoked_at = coalesce(revoked_at, now()),
               metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
                 'revoked_by_bid_request_email_delivery', true,
                 'revoked_by_user_id', v_actor_user_id
               ),
               updated_at = now()
         where recipient_id = v_recipient_id
           and revoked_at is null
           and submitted_at is null;

        insert into public.order_vendor_bid_request_recipient_invitations (
          recipient_id,
          bid_request_id,
          order_id,
          vendor_profile_id,
          vendor_company_id,
          vendor_contact_id,
          token_hash,
          token_last_four,
          sent_to_email,
          expires_at,
          metadata,
          created_by_user_id
        ) values (
          v_recipient_id,
          v_bid_request.id,
          v_bid_request.order_id,
          v_vendor_profile_id,
          v_vendor_company_id,
          v_contact_id,
          v_token_hash,
          v_token_last_four,
          v_sent_to_email,
          v_expires_at,
          jsonb_build_object(
            'created_via', 'rpc_order_vendor_bid_request_create_email_delivery',
            'email_delivery_status', 'queued'
          ),
          v_actor_user_id
        )
        returning id into v_invitation_id;

        insert into public.email_queue (
          user_id,
          to_email,
          subject,
          template,
          payload
        ) values (
          null,
          v_sent_to_email,
          v_email_subject,
          'VENDOR_BID_INVITATION',
          jsonb_strip_nulls(jsonb_build_object(
            'email_template_key', 'VENDOR_BID_INVITATION',
            'message', v_email_message,
            'body', v_email_message,
            'bid_invitation_path', v_invitation_path,
            'vendor_company_name', nullif(v_vendor_company_name, ''),
            'vendor_contact_name', nullif(v_contact.name, ''),
            'property_address', coalesce(nullif(v_order.property_address, ''), nullif(v_order.address, '')),
            'city', nullif(v_order.city, ''),
            'state', nullif(v_order.state, ''),
            'postal_code', coalesce(nullif(v_order.postal_code, ''), nullif(v_order.zip, '')),
            'county', nullif(v_order.county, ''),
            'property_location', concat_ws(
              ', ',
              nullif(v_order.city, ''),
              concat_ws(' ', nullif(v_order.state, ''), coalesce(nullif(v_order.postal_code, ''), nullif(v_order.zip, '')))
            ),
            'property_type', nullif(v_order.property_type, ''),
            'report_type', nullif(v_order.report_type, ''),
            'client_due_at', coalesce(v_bid_request.client_due_at, v_order.client_due_at, v_order.final_due_at, v_order.due_date::timestamptz),
            'final_due_at', coalesce(v_order.final_due_at, v_order.due_date::timestamptz),
            'response_due_at', v_bid_request.response_due_at,
            'desired_vendor_due_at', v_bid_request.desired_vendor_due_at,
            'request_message', nullif(v_bid_request.request_message, ''),
            'coordinator_message', nullif(v_bid_request.request_message, ''),
            'safe_notes', null::text,
            'documents_status', 'Bid documents can be added to this packet in a future release.'
          ))
        )
        returning id into v_email_queue_id;

        update public.order_vendor_bid_request_recipient_invitations inv
           set metadata = coalesce(inv.metadata, '{}'::jsonb) || jsonb_build_object(
                 'email_queue_id', v_email_queue_id,
                 'email_delivery_status', 'queued'
               ),
               updated_at = now()
         where inv.id = v_invitation_id;

        update public.order_vendor_bid_request_recipients brr
           set metadata = coalesce(brr.metadata, '{}'::jsonb) || jsonb_build_object(
                 'email_delivery', jsonb_build_object(
                   'status', 'queued',
                   'sent_to_email', v_sent_to_email,
                   'invitation_id', v_invitation_id,
                   'email_queue_id', v_email_queue_id
                 )
               )
         where brr.id = v_recipient_id;

        v_email_delivery_status := 'queued';
      end if;

      if v_email_warning is not null then
        update public.order_vendor_bid_request_recipients brr
           set metadata = coalesce(brr.metadata, '{}'::jsonb) || jsonb_build_object(
                 'email_delivery', jsonb_build_object(
                   'status', v_email_delivery_status,
                   'warning', v_email_warning
                 )
               )
         where brr.id = v_recipient_id;
      end if;
    end if;

    v_recipient_count := v_recipient_count + 1;
  end loop;

  select jsonb_build_object(
    'bid_request_id', br.id,
    'order_id', br.order_id,
    'status', br.status,
    'recipient_count', v_recipient_count,
    'recipients', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'recipient_id', brr.id,
          'vendor_profile_id', brr.vendor_profile_id,
          'vendor_company_id', brr.vendor_company_id,
          'relationship_id', brr.relationship_id,
          'status', brr.status,
          'email_delivery_status', brr.metadata #>> '{email_delivery,status}',
          'email_warning', brr.metadata #>> '{email_delivery,warning}',
          'sent_to_email', brr.metadata #>> '{email_delivery,sent_to_email}'
        )
        order by brr.created_at, brr.id
      ),
      '[]'::jsonb
    )
  )
    into v_result
    from public.order_vendor_bid_requests br
    left join public.order_vendor_bid_request_recipients brr
      on brr.bid_request_id = br.id
   where br.id = v_bid_request_id
   group by br.id, br.order_id, br.status;

  return v_result;
end;
$$;

revoke all on function public.rpc_order_vendor_bid_request_create(uuid, jsonb) from public, anon;
grant execute on function public.rpc_order_vendor_bid_request_create(uuid, jsonb) to authenticated, service_role;

comment on function public.rpc_order_vendor_bid_request_create(uuid, jsonb) is
  'AMC-11B bid request create RPC alignment. Requires amc_operations order scope, bid_requests.create, vendors.read, current-company order read authority, active amc_vendor relationships, eligible vendor profiles, and no duplicate open recipient. Creates bid request/recipient rows, queues vendor-safe bid invitation emails with tokenized public links, coordinator message, structured VENDOR_BID_INVITATION payload, and message/body fallback content when recipient email exists; preserves manual link fallback when email is missing; does not create assignments, mutate orders, expose fees/margins/internal notes, or send email directly.';

commit;
