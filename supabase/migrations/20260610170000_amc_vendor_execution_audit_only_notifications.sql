begin;

create or replace function public.notify_order_company_assignment_event(
  p_assignment_id uuid,
  p_event_type text,
  p_actor_user_id uuid default public.current_app_user_id(),
  p_actor_company_id uuid default public.current_company_id(),
  p_payload jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_owner_company public.companies%rowtype;
  v_assigned_company public.companies%rowtype;
  v_recipient_id uuid;
  v_recipient_company_id uuid;
  v_notification_payload jsonb;
  v_title text;
  v_body text;
  v_count integer := 0;
  v_link_path text;
  v_priority text := 'normal';
begin
  if p_event_type = 'assignment.started' then
    return 0;
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  select *
    into v_order
    from public.orders
   where id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type = 'vendor_appraisal'
     and coalesce(v_order.operations_scope, 'internal_operations') = 'amc_operations'
     and p_event_type in (
       'assignment.submitted',
       'assignment.revision_requested',
       'assignment.resubmitted',
       'assignment.completed'
     ) then
    return 0;
  end if;

  select *
    into v_owner_company
    from public.companies
   where id = v_assignment.owner_company_id;

  select *
    into v_assigned_company
    from public.companies
   where id = v_assignment.assigned_company_id;

  v_link_path := '/assignments/' || v_assignment.id::text;
  v_title := case p_event_type
    when 'assignment.offered' then 'Assignment offered'
    when 'assignment.accepted' then 'Assignment accepted'
    when 'assignment.declined' then 'Assignment declined'
    when 'assignment.submitted' then 'Assignment submitted'
    when 'assignment.completed' then 'Assignment completed'
    when 'assignment.cancelled' then 'Assignment cancelled'
    when 'assignment.revoked' then 'Assignment revoked'
    else 'Assignment update'
  end;
  v_priority := case p_event_type
    when 'assignment.offered' then 'high'
    when 'assignment.submitted' then 'high'
    when 'assignment.cancelled' then 'high'
    when 'assignment.revoked' then 'high'
    else 'normal'
  end;

  for v_recipient_id in
    select recipient.user_id
      from public.order_company_assignment_assigned_notification_recipients(
        p_assignment_id,
        p_event_type,
        p_actor_user_id
      ) as recipient(user_id)
    union
    select recipient.user_id
      from public.order_company_assignment_owner_notification_recipients(
        p_assignment_id,
        p_event_type,
        p_actor_user_id
      ) as recipient(user_id)
  loop
    if exists (
      select 1
        from public.company_memberships cm
       where cm.user_id = v_recipient_id
         and cm.company_id = v_assignment.assigned_company_id
         and cm.status = 'active'
    ) then
      v_recipient_company_id := v_assignment.assigned_company_id;
      v_notification_payload := jsonb_build_object(
        'source_type', 'order_company_assignment',
        'event_key', p_event_type,
        'assignment_id', v_assignment.id,
        'assignment_type', v_assignment.assignment_type,
        'assignment_status', v_assignment.status,
        'owner_company_id', v_assignment.owner_company_id,
        'assigned_company_id', v_assignment.assigned_company_id,
        'relationship_id', v_assignment.relationship_id,
        'order_number', v_order.order_number,
        'order_status', v_order.status,
        'city', v_order.city,
        'state', v_order.state,
        'property_type', v_order.property_type,
        'report_type', v_order.report_type,
        'due_at', v_assignment.due_at,
        'review_due_at', v_assignment.review_due_at
      );
      v_body := trim(both ' ' from concat_ws(
        ' ',
        nullif(v_order.order_number, ''),
        nullif(concat_ws(', ', nullif(v_order.city, ''), nullif(v_order.state, '')), '')
      ));
    else
      v_recipient_company_id := v_assignment.owner_company_id;
      v_notification_payload := jsonb_build_object(
        'source_type', 'order_company_assignment',
        'event_key', p_event_type,
        'assignment_id', v_assignment.id,
        'assignment_type', v_assignment.assignment_type,
        'assignment_status', v_assignment.status,
        'owner_company_id', v_assignment.owner_company_id,
        'assigned_company_id', v_assignment.assigned_company_id,
        'relationship_id', v_assignment.relationship_id,
        'order_id', v_assignment.order_id,
        'order_number', v_order.order_number,
        'order_status', v_order.status,
        'assigned_company_name', v_assigned_company.name,
        'city', v_order.city,
        'state', v_order.state,
        'property_type', v_order.property_type,
        'report_type', v_order.report_type,
        'due_at', v_assignment.due_at,
        'review_due_at', v_assignment.review_due_at
      );
      v_body := trim(both ' ' from concat_ws(
        ' ',
        nullif(v_assigned_company.name, ''),
        nullif(v_order.order_number, '')
      ));
    end if;

    insert into public.notifications (
      user_id,
      company_id,
      type,
      category,
      title,
      body,
      message,
      order_id,
      is_read,
      read,
      created_at,
      link_path,
      payload,
      priority
    ) values (
      v_recipient_id,
      v_recipient_company_id,
      p_event_type,
      'assignment',
      v_title,
      nullif(v_body, ''),
      nullif(v_body, ''),
      null,
      false,
      false,
      now(),
      v_link_path,
      case
        when v_recipient_company_id = v_assignment.owner_company_id
          then v_notification_payload || coalesce(p_payload, '{}'::jsonb)
        else v_notification_payload
      end,
      v_priority
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.notify_order_company_assignment_event(uuid, text, uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.notify_order_company_assignment_event(uuid, text, uuid, uuid, jsonb)
  to service_role;

comment on function public.notify_order_company_assignment_event(uuid, text, uuid, uuid, jsonb) is
  'AMC-13B assignment notification writer alignment. Preserves existing assignment notification behavior except AMC vendor_appraisal execution review events submitted, revision_requested, resubmitted, and completed return 0 so the validated vendor execution lifecycle writes Activity Log audit entries only and does not create notification or email fanout.';

commit;
