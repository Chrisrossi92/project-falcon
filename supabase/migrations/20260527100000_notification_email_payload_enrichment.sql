begin;

create or replace function public.notify_order_v1_event(
  p_order_id uuid,
  p_event_type text,
  p_recipient_kinds text[],
  p_payload jsonb default '{}'::jsonb,
  p_actor_user_id uuid default public.current_app_user_id()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_company_id uuid;
  v_policy_rules jsonb;
  v_category text := 'order';
  v_priority text := 'normal';
  v_title text;
  v_body text;
  v_count integer := 0;
  v_recipient record;
  v_client_name text;
  v_appraiser_name text;
  v_reviewer_name text;
  v_property_address text;
  v_payload jsonb;
begin
  select *
    into v_order
    from public.orders
   where id = p_order_id
   limit 1;

  if not found then
    return 0;
  end if;

  v_company_id := coalesce(v_order.company_id, public.default_company_id());

  select coalesce(c.name, v_order.manual_client_name, v_order.manual_client)
    into v_client_name
    from public.clients c
   where c.id = v_order.client_id
   limit 1;

  if v_client_name is null then
    v_client_name := coalesce(v_order.manual_client_name, v_order.manual_client);
  end if;

  select coalesce(nullif(u.display_name, ''), nullif(u.full_name, ''), nullif(u.name, ''), u.email)
    into v_appraiser_name
    from public.users u
   where u.id = coalesce(v_order.appraiser_id, v_order.assigned_to)
   limit 1;

  select coalesce(nullif(u.display_name, ''), nullif(u.full_name, ''), nullif(u.name, ''), u.email)
    into v_reviewer_name
    from public.users u
   where u.id = v_order.reviewer_id
   limit 1;

  v_property_address := coalesce(
    nullif(v_order.property_address, ''),
    nullif(v_order.address, ''),
    array_to_string(
      array_remove(array[
        nullif(v_order.city, ''),
        nullif(v_order.state, ''),
        nullif(coalesce(v_order.postal_code, v_order.zip), '')
      ], null),
      ', '
    )
  );

  select np.rules
    into v_policy_rules
    from public.notification_policies np
   where np.key = p_event_type
   limit 1;

  v_category := coalesce(v_policy_rules->>'category', 'order');
  v_priority := coalesce(v_policy_rules->>'priority', 'normal');
  v_title := public.notification_order_event_title_v1(p_event_type, v_order.order_number, v_order.id);
  v_body := public.notification_order_event_body_v1(p_event_type);
  v_payload := jsonb_strip_nulls(
    coalesce(p_payload, '{}'::jsonb) ||
    jsonb_build_object(
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'property_address', v_property_address,
      'address', v_property_address,
      'city', v_order.city,
      'state', v_order.state,
      'postal_code', coalesce(v_order.postal_code, v_order.zip),
      'client_name', v_client_name,
      'property_contact_name', coalesce(v_order.property_contact_name, v_order.entry_contact_name),
      'property_contact_phone', coalesce(v_order.property_contact_phone, v_order.entry_contact_phone),
      'appraiser_name', v_appraiser_name,
      'reviewer_name', v_reviewer_name,
      'status', v_order.status,
      'report_type', v_order.report_type,
      'property_type', v_order.property_type,
      'site_visit_at', v_order.site_visit_at,
      'review_due_at', v_order.review_due_at,
      'final_due_at', v_order.final_due_at,
      'link_path', '/orders/' || v_order.id::text
    )
  );

  for v_recipient in
    select distinct recipients.user_id, recipients.role_key
      from unnest(coalesce(p_recipient_kinds, array[]::text[])) as kinds(kind)
      cross join lateral public.rpc_notification_recipients_for_order(
        p_order_id,
        kinds.kind
      ) as recipients(user_id, role_key)
     where recipients.user_id is not null
  loop
    if p_actor_user_id is not null and v_recipient.user_id = p_actor_user_id then
      continue;
    end if;

    if p_event_type in (
      'order.assigned_appraiser',
      'order.reassigned_appraiser',
      'order.assigned_reviewer',
      'order.reassigned_reviewer'
    ) and exists (
      select 1
        from public.notifications n
       where n.user_id = v_recipient.user_id
         and n.order_id = v_order.id
         and n.type = p_event_type
         and coalesce(n.payload->>'assigned_user_id', '') = coalesce(p_payload->>'assigned_user_id', '')
         and n.created_at > now() - interval '2 minutes'
       limit 1
    ) then
      continue;
    end if;

    insert into public.notifications (
      user_id,
      company_id,
      type,
      category,
      priority,
      title,
      body,
      message,
      order_id,
      link_path,
      payload
    )
    values (
      v_recipient.user_id,
      v_company_id,
      p_event_type,
      v_category,
      v_priority,
      v_title,
      v_body,
      v_body,
      v_order.id,
      '/orders/' || v_order.id::text,
      v_payload || jsonb_build_object('notification_role', v_recipient.role_key)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
exception
  when others then
    return v_count;
end;
$$;

comment on function public.notify_order_v1_event(uuid, text, text[], jsonb, uuid) is
  'Small V1 order-safe notification fanout helper for backend-owned order events. Payloads include existing order context used by RC1 email rendering while links remain /orders/:id.';

create or replace function public.tg_orders_insert_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_new_appraiser_id uuid;
  v_old_appraiser_id uuid;
begin
  v_new_appraiser_id := coalesce(NEW.appraiser_id, NEW.assigned_to);

  if TG_OP = 'INSERT' then
    if v_new_appraiser_id is not null then
      perform public.notify_order_v1_event(
        NEW.id,
        'order.assigned_appraiser',
        array['appraiser'],
        jsonb_build_object(
          'assignment_role', 'appraiser',
          'assigned_user_id', v_new_appraiser_id
        ),
        v_actor_user_id
      );
    end if;

    if NEW.reviewer_id is not null then
      perform public.notify_order_v1_event(
        NEW.id,
        'order.assigned_reviewer',
        array['reviewer'],
        jsonb_build_object(
          'assignment_role', 'reviewer',
          'assigned_user_id', NEW.reviewer_id
        ),
        v_actor_user_id
      );
    end if;

    return NEW;
  end if;

  v_old_appraiser_id := coalesce(OLD.appraiser_id, OLD.assigned_to);

  if v_new_appraiser_id is not null and v_new_appraiser_id is distinct from v_old_appraiser_id then
    perform public.notify_order_v1_event(
      NEW.id,
      case when v_old_appraiser_id is null then 'order.assigned_appraiser' else 'order.reassigned_appraiser' end,
      array['appraiser'],
      jsonb_build_object(
        'assignment_role', 'appraiser',
        'previous_user_id', v_old_appraiser_id,
        'assigned_user_id', v_new_appraiser_id
      ),
      v_actor_user_id
    );
  end if;

  if NEW.reviewer_id is not null and NEW.reviewer_id is distinct from OLD.reviewer_id then
    perform public.notify_order_v1_event(
      NEW.id,
      case when OLD.reviewer_id is null then 'order.assigned_reviewer' else 'order.reassigned_reviewer' end,
      array['reviewer'],
      jsonb_build_object(
        'assignment_role', 'reviewer',
        'previous_user_id', OLD.reviewer_id,
        'assigned_user_id', NEW.reviewer_id
      ),
      v_actor_user_id
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_orders_insert_assignment_notification on public.orders;
create trigger trg_orders_insert_assignment_notification
after insert or update of appraiser_id, assigned_to, reviewer_id on public.orders
for each row execute function public.tg_orders_insert_assignment_notification();

comment on function public.tg_orders_insert_assignment_notification() is
  'RC1 assignment notification trigger. Covers appraiser_id, assigned_to, and reviewer_id while routing through V1 order-safe enriched notification fanout.';

commit;
