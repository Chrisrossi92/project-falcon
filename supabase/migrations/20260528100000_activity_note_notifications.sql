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
