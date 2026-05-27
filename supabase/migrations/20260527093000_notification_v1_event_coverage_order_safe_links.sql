begin;

insert into public.notification_policies (key, rules)
values
  (
    'order.assigned_appraiser',
    jsonb_build_object(
      'category', 'order',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.reassigned_appraiser',
    jsonb_build_object(
      'category', 'order',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.assigned_reviewer',
    jsonb_build_object(
      'category', 'order',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.reassigned_reviewer',
    jsonb_build_object(
      'category', 'order',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.dates_updated',
    jsonb_build_object(
      'category', 'workflow',
      'priority', 'normal',
      'email', jsonb_build_object('mode', 'optional_on'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'order.site_visit_updated',
    jsonb_build_object(
      'category', 'workflow',
      'priority', 'normal',
      'email', jsonb_build_object('mode', 'optional_on'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'note.added',
    jsonb_build_object(
      'category', 'communication',
      'priority', 'high',
      'email', jsonb_build_object('mode', 'required'),
      'roles', jsonb_build_object(
        'appraiser', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'reviewer', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', true)),
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'user.invited',
    jsonb_build_object(
      'category', 'user',
      'priority', 'normal',
      'email', jsonb_build_object('mode', 'optional_on'),
      'roles', jsonb_build_object(
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  ),
  (
    'user.access_changed',
    jsonb_build_object(
      'category', 'user',
      'priority', 'normal',
      'email', jsonb_build_object('mode', 'optional_on'),
      'roles', jsonb_build_object(
        'admin', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false)),
        'owner', jsonb_build_object('in_app', jsonb_build_object('default', true, 'required', false))
      )
    )
  )
on conflict (key) do update
set rules = excluded.rules;

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
    when 'order.reassigned_reviewer' then 'You were reassigned review for this order.'
    when 'order.dates_updated' then 'Review or final due dates changed for this order.'
    when 'order.site_visit_updated' then 'The site visit appointment changed for this order.'
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

  select np.rules
    into v_policy_rules
    from public.notification_policies np
   where np.key = p_event_type
   limit 1;

  v_category := coalesce(v_policy_rules->>'category', 'order');
  v_priority := coalesce(v_policy_rules->>'priority', 'normal');
  v_title := public.notification_order_event_title_v1(p_event_type, v_order.order_number, v_order.id);
  v_body := public.notification_order_event_body_v1(p_event_type);

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
      jsonb_strip_nulls(
        coalesce(p_payload, '{}'::jsonb) ||
        jsonb_build_object(
          'order_id', v_order.id,
          'order_number', v_order.order_number,
          'notification_role', v_recipient.role_key,
          'link_path', '/orders/' || v_order.id::text
        )
      )
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
exception
  when others then
    return v_count;
end;
$$;

create or replace function public.tg_orders_insert_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
begin
  if TG_OP = 'INSERT' then
    if NEW.appraiser_id is not null then
      perform public.notify_order_v1_event(
        NEW.id,
        'order.assigned_appraiser',
        array['appraiser'],
        jsonb_build_object('assignment_role', 'appraiser', 'assigned_user_id', NEW.appraiser_id),
        v_actor_user_id
      );
    end if;

    if NEW.reviewer_id is not null then
      perform public.notify_order_v1_event(
        NEW.id,
        'order.assigned_reviewer',
        array['reviewer'],
        jsonb_build_object('assignment_role', 'reviewer', 'assigned_user_id', NEW.reviewer_id),
        v_actor_user_id
      );
    end if;

    return NEW;
  end if;

  if NEW.appraiser_id is not null and NEW.appraiser_id is distinct from OLD.appraiser_id then
    perform public.notify_order_v1_event(
      NEW.id,
      case when OLD.appraiser_id is null then 'order.assigned_appraiser' else 'order.reassigned_appraiser' end,
      array['appraiser'],
      jsonb_build_object(
        'assignment_role', 'appraiser',
        'previous_user_id', OLD.appraiser_id,
        'assigned_user_id', NEW.appraiser_id
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
after insert or update of appraiser_id, reviewer_id on public.orders
for each row execute function public.tg_orders_insert_assignment_notification();

create or replace function public.tg_orders_v1_date_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
begin
  if NEW.site_visit_at is distinct from OLD.site_visit_at then
    perform public.notify_order_v1_event(
      NEW.id,
      'order.site_visit_updated',
      array['appraiser', 'admin_owner'],
      jsonb_build_object(
        'previous_site_visit_at', OLD.site_visit_at,
        'site_visit_at', NEW.site_visit_at
      ),
      v_actor_user_id
    );
  end if;

  if NEW.review_due_at is distinct from OLD.review_due_at
     or NEW.final_due_at is distinct from OLD.final_due_at then
    perform public.notify_order_v1_event(
      NEW.id,
      'order.dates_updated',
      array['appraiser', 'reviewer', 'admin_owner'],
      jsonb_build_object(
        'previous_review_due_at', OLD.review_due_at,
        'review_due_at', NEW.review_due_at,
        'previous_final_due_at', OLD.final_due_at,
        'final_due_at', NEW.final_due_at
      ),
      v_actor_user_id
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_orders_v1_date_notification on public.orders;
create trigger trg_orders_v1_date_notification
after update of site_visit_at, review_due_at, final_due_at on public.orders
for each row execute function public.tg_orders_v1_date_notification();

create or replace function public.tg_notifications_v1_order_safe_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  if NEW.link_path is not null and NEW.link_path like '/assignments/%' then
    v_order_id := NEW.order_id;

    if v_order_id is null
       and NEW.payload ? 'order_id'
       and (NEW.payload->>'order_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_order_id := nullif(NEW.payload->>'order_id', '')::uuid;
    end if;

    if v_order_id is null
       and NEW.payload ? 'assignment_id'
       and (NEW.payload->>'assignment_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select oca.order_id
        into v_order_id
        from public.order_company_assignments oca
       where oca.id = nullif(NEW.payload->>'assignment_id', '')::uuid
       limit 1;
    end if;

    if v_order_id is not null then
      NEW.order_id := v_order_id;
      NEW.link_path := '/orders/' || v_order_id::text;
      NEW.payload := coalesce(NEW.payload, '{}'::jsonb) || jsonb_build_object(
        'order_id', v_order_id,
        'link_path', '/orders/' || v_order_id::text,
        'v1_hidden_surface_link_rerouted', true
      );
    else
      NEW.link_path := null;
      NEW.payload := coalesce(NEW.payload, '{}'::jsonb) || jsonb_build_object(
        'v1_hidden_surface_link_suppressed', true
      );
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_notifications_v1_order_safe_links on public.notifications;
create trigger trg_notifications_v1_order_safe_links
before insert on public.notifications
for each row execute function public.tg_notifications_v1_order_safe_links();

drop trigger if exists trg_notifications_v1_order_safe_links_update on public.notifications;
create trigger trg_notifications_v1_order_safe_links_update
before update of link_path, payload, order_id on public.notifications
for each row execute function public.tg_notifications_v1_order_safe_links();

revoke all privileges on function public.notification_order_event_title_v1(text, text, uuid) from public, anon;
revoke all privileges on function public.notification_order_event_body_v1(text) from public, anon;
revoke all privileges on function public.notify_order_v1_event(uuid, text, text[], jsonb, uuid) from public, anon;
revoke all privileges on function public.tg_notifications_v1_order_safe_links() from public, anon;

grant execute on function public.notification_order_event_title_v1(text, text, uuid) to authenticated, service_role;
grant execute on function public.notification_order_event_body_v1(text) to authenticated, service_role;
grant execute on function public.notify_order_v1_event(uuid, text, text[], jsonb, uuid) to authenticated, service_role;

comment on function public.notify_order_v1_event(uuid, text, text[], jsonb, uuid) is
  'Small V1 order-safe notification fanout helper for backend-owned assignment and date/site-visit events. Recipients resolve through company-scoped public.users.id recipient RPCs and links route to /orders/:id.';

comment on function public.tg_notifications_v1_order_safe_links() is
  'Reroutes hidden assignment-surface notification links to visible order detail routes when an order can be resolved; otherwise suppresses the hidden route link.';

commit;
