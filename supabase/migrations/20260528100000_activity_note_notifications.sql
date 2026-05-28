begin;

create or replace function public.notification_order_event_title_v1(
  p_event_type text,
  p_order_number text,
  p_order_id uuid
)
returns text
language sql
stable
set search_path = public
as $$
  select case p_event_type
    when 'order.assigned_appraiser' then 'Appraiser assignment: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    when 'order.reassigned_appraiser' then 'Appraiser reassignment: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    when 'order.assigned_reviewer' then 'Reviewer assignment: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    when 'order.reassigned_reviewer' then 'Reviewer reassignment: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    when 'order.dates_updated' then 'Dates updated: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    when 'order.site_visit_updated' then 'Site visit updated: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    when 'note.added' then 'New note on Order ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    else 'Order update: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
  end;
$$;

create or replace function public.notification_order_event_body_v1(p_event_type text)
returns text
language sql
stable
set search_path = public
as $$
  select case p_event_type
    when 'order.assigned_appraiser' then 'You were assigned the appraisal for this order.'
    when 'order.reassigned_appraiser' then 'You were reassigned the appraisal for this order.'
    when 'order.assigned_reviewer' then 'You were assigned review for this order.'
    when 'order.reassigned_reviewer' then 'You were assigned review for this order.'
    when 'order.dates_updated' then 'Review or final due dates changed for this order.'
    when 'order.site_visit_updated' then 'The site visit appointment changed for this order.'
    when 'note.added' then 'A note was added to this order.'
    else 'This order was updated.'
  end;
$$;

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
  v_note_excerpt text;
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

  if p_event_type = 'note.added' then
    v_note_excerpt := nullif(btrim(coalesce(v_payload->>'note_text', v_payload->>'message', '')), '');

    if v_note_excerpt is not null and char_length(v_note_excerpt) > 150 then
      v_note_excerpt := left(v_note_excerpt, 147) || '...';
    end if;

    v_title := coalesce(nullif(v_payload #>> '{actor,name}', ''), 'Someone') || ' added a note';
    v_body := coalesce(v_note_excerpt, 'A note was added to this order.');
  end if;

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
  'Small V1 order-safe notification fanout helper for backend-owned order events. Note events use actor-aware titles and short note excerpts while links remain /orders/:id.';

create or replace function public.tg_activity_note_notification_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_actor_user_id uuid;
  v_note_text text;
  v_actor_name text;
  v_actor_role text := 'other';
  v_recipient_kinds text[];
begin
  if NEW.order_id is null then
    return NEW;
  end if;

  if lower(btrim(coalesce(NEW.event_type, NEW.action, ''))) not in ('note', 'note_added', 'activity_note') then
    return NEW;
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = NEW.order_id
   limit 1;

  if not found then
    return NEW;
  end if;

  v_actor_user_id := coalesce(NEW.actor_user_id, NEW.user_id);
  v_note_text := nullif(btrim(coalesce(
    NEW.detail->>'note',
    NEW.detail->>'message',
    NEW.detail->>'text',
    NEW.message,
    ''
  )), '');
  v_actor_name := nullif(btrim(coalesce(
    NEW.detail #>> '{actor,name}',
    NEW.created_by_name,
    NEW.actor_name,
    'Someone'
  )), '');

  if v_actor_user_id is not null and v_actor_user_id = coalesce(v_order.appraiser_id, v_order.assigned_to) then
    v_actor_role := 'appraiser';
  elsif v_actor_user_id is not null and v_actor_user_id = v_order.reviewer_id then
    v_actor_role := 'reviewer';
  else
    v_actor_role := lower(btrim(coalesce(
      NEW.detail #>> '{actor,role}',
      NEW.role,
      'other'
    )));
  end if;

  if v_actor_role = 'appraiser' then
    v_recipient_kinds := array['admin_owner', 'reviewer'];
  elsif v_actor_role = 'reviewer' then
    v_recipient_kinds := array['appraiser', 'admin_owner'];
  else
    v_recipient_kinds := array['appraiser', 'reviewer'];
  end if;

  perform public.notify_order_v1_event(
    NEW.order_id,
    'note.added',
    v_recipient_kinds,
    jsonb_strip_nulls(jsonb_build_object(
      'note_text', v_note_text,
      'message', v_note_text,
      'activity_id', NEW.id,
      'actor', jsonb_build_object(
        'user_id', v_actor_user_id,
        'name', coalesce(v_actor_name, 'Someone'),
        'role_on_order', v_actor_role
      )
    )),
    v_actor_user_id
  );

  return NEW;
exception
  when others then
    return NEW;
end;
$$;

drop trigger if exists trg_activity_note_notification_v1 on public.activity_log;
create trigger trg_activity_note_notification_v1
after insert on public.activity_log
for each row
execute function public.tg_activity_note_notification_v1();

comment on function public.tg_activity_note_notification_v1() is
  'V1 note notification fanout for activity_log note inserts. Uses public.users.id actor identity, order-safe links, no-self-notify via notify_order_v1_event, and leaves email delivery to notification email preferences.';

commit;
