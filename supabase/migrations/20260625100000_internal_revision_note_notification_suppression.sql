begin;

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
  v_notification_suppressed text;
  v_workflow_event text;
begin
  if NEW.order_id is null then
    return NEW;
  end if;

  if lower(btrim(coalesce(NEW.event_type, NEW.action, ''))) not in ('note', 'note_added', 'activity_note') then
    return NEW;
  end if;

  v_notification_suppressed := lower(btrim(coalesce(
    NEW.detail->>'notification_suppressed',
    NEW.detail #>> '{metadata,notification_suppressed}',
    ''
  )));
  v_workflow_event := lower(btrim(coalesce(
    NEW.detail->>'workflow_event',
    NEW.detail #>> '{metadata,workflow_event}',
    ''
  )));

  if v_notification_suppressed in ('true', 't', '1', 'yes', 'on')
     or v_workflow_event in ('request_revisions', 'workflow.request_revisions') then
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

comment on function public.tg_activity_note_notification_v1() is
  'V1 note notification fanout for activity_log note inserts. Skips generic note fanout only for metadata-suppressed workflow notes such as request_revisions; ordinary manual notes still emit note.added.';

commit;
