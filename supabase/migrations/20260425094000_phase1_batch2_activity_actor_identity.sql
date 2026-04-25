begin;

-- Phase 1 Batch 2 Step 2:
-- Activity actors are app-domain users.
-- public.users.id is canonical; auth.uid() must map through users.auth_id.

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'activity_log'
       and column_name = 'actor_user_id'
  ) then
    alter table public.activity_log
      alter column actor_user_id set default public.current_app_user_id();
  end if;
end;
$$;

create or replace function public._activity_actor()
returns table(user_id uuid, full_name text, email text)
language sql
security definer
set search_path = public
as $$
  select
    u.id as user_id,
    coalesce(u.full_name, u.display_name, u.name, p.full_name, p.display_name, p.name, u.email, p.email) as full_name,
    coalesce(u.email, p.email) as email
  from public.users u
  left join public.profiles p
    on p.auth_id = u.auth_id
  where u.id = public.current_app_user_id()
  limit 1;
$$;

grant execute on function public._activity_actor() to authenticated;

drop function if exists public.rpc_log_event(uuid, text, jsonb);
drop function if exists public.rpc_log_event(uuid, text, text, jsonb);

create or replace function public.rpc_log_event(
  p_order_id uuid,
  p_event_type text,
  p_message text default null,
  p_payload jsonb default '{}'::jsonb
) returns public.activity_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor record;
  v_row public.activity_log;
  v_role text := (current_setting('request.jwt.claims', true)::jsonb ->> 'role');
  v_uid uuid := public.current_app_user_id();
  v_from text := coalesce(p_payload->>'from_status', p_payload->>'from');
  v_to text := coalesce(p_payload->>'to_status', p_payload->>'to');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_msg text;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if v_uid is null then
    raise exception 'current app user not found';
  end if;

  if not exists (
    select 1
      from public.orders o
     where o.id = p_order_id
       and (
         v_role in ('admin', 'reviewer')
         or coalesce(o.appraiser_id, o.assigned_to) = v_uid
       )
  ) then
    raise exception 'not authorized to log activity for this order';
  end if;

  if p_event_type = 'status_changed' and v_from is not null and v_to is not null and v_from = v_to then
    return null;
  end if;

  if v_from is not null then
    v_payload := v_payload || jsonb_build_object('from_status', v_from);
  end if;
  if v_to is not null then
    v_payload := v_payload || jsonb_build_object('to_status', v_to);
  end if;

  select * into v_actor from public._activity_actor();
  if exists (
    select 1
      from public.activity_log a
     where a.order_id = p_order_id
       and a.event_type = p_event_type
       and coalesce(a.created_by, a.actor_id) = v_actor.user_id
       and coalesce(a.detail->>'to_status', a.detail->>'to') = coalesce(v_payload->>'to_status', v_to)
       and a.created_at > now() - interval '10 seconds'
  ) then
    return null;
  end if;

  v_msg := coalesce(
    p_message,
    case
      when p_event_type = 'status_changed' and v_from is not null and v_to is not null
        then format('Status changed: %s -> %s', v_from, v_to)
      else null
    end
  );

  insert into public.activity_log (
    order_id,
    event_type,
    message,
    detail,
    actor_id,
    created_by,
    created_by_name,
    created_by_email
  )
  values (
    p_order_id,
    p_event_type,
    v_msg,
    v_payload,
    v_actor.user_id,
    v_actor.user_id,
    v_actor.full_name,
    v_actor.email
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.rpc_log_event(uuid, text, text, jsonb) to authenticated;

create or replace function public.rpc_log_event(
  p_order_id uuid,
  p_event_type text,
  p_details jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor record;
begin
  select * into v_actor from public._activity_actor();

  if v_actor.user_id is null then
    raise exception 'current app user not found';
  end if;

  insert into public.activity_log (order_id, event_type, detail, actor_id, created_by, created_at)
  values (p_order_id, p_event_type, coalesce(p_details, '{}'::jsonb), v_actor.user_id, v_actor.user_id, now())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.rpc_log_event(uuid, text, jsonb) to authenticated;

drop function if exists public.rpc_log_note(uuid, text);
drop function if exists public.rpc_log_note(uuid, text, jsonb);

create or replace function public.rpc_log_note(
  p_order_id uuid,
  p_message text,
  p_context jsonb default '{}'::jsonb
) returns public.activity_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb := coalesce(p_context, '{}'::jsonb);
  v_row public.activity_log;
begin
  select * into v_row from public.rpc_log_event(
    p_order_id => p_order_id,
    p_event_type => 'note_added',
    p_message => p_message,
    p_payload => v_payload
  );
  return v_row;
end;
$$;

revoke all on function public.rpc_log_note(uuid, text, jsonb) from public;
grant execute on function public.rpc_log_note(uuid, text, jsonb) to authenticated;

drop function if exists public.rpc_log_status_change(uuid, text, text, text);

create or replace function public.rpc_log_status_change(
  p_order_id uuid,
  p_prev_status text,
  p_new_status text,
  p_message text default null
) returns public.activity_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.activity_log;
  v_actor uuid := public.current_app_user_id();
begin
  if v_actor is null then
    raise exception 'current app user not found';
  end if;

  insert into public.activity_log(order_id, actor_user_id, action, prev_status, new_status, message)
  values (p_order_id, v_actor, 'status_change', p_prev_status, p_new_status, p_message)
  returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.rpc_log_status_change(uuid, text, text, text) to authenticated;

drop function if exists public.rpc_assign_order(uuid, uuid, text);

create or replace function public.rpc_assign_order(
  p_order_id uuid,
  p_assigned_to uuid,
  p_note text default null
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.orders;
  v_actor uuid := public.current_app_user_id();
begin
  if v_actor is null then
    raise exception 'current app user not found';
  end if;

  update public.orders
     set assigned_to = p_assigned_to,
         updated_at = now()
   where id = p_order_id
   returning * into v_row;

  insert into public.activity_log(order_id, actor_user_id, action, message)
  values (p_order_id, v_actor, 'assignment', coalesce(p_note, 'assigned'));
  return v_row;
end;
$$;

grant execute on function public.rpc_assign_order(uuid, uuid, text) to authenticated;

create or replace function public.tg_log_order_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_app_user_id();
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_log(order_id, event_type, detail, actor_id, created_at)
    values (
      NEW.id,
      'order_created',
      jsonb_build_object('status', NEW.status, 'client_id', NEW.client_id, 'order_number', NEW.order_number),
      v_actor,
      now()
    );
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.status is distinct from OLD.status then
      insert into public.activity_log(order_id, event_type, detail, actor_id, created_at)
      values (
        NEW.id,
        'status_changed',
        jsonb_build_object('from', OLD.status, 'to', NEW.status),
        v_actor,
        now()
      );
    end if;

    if NEW.appraiser_id is distinct from OLD.appraiser_id then
      insert into public.activity_log(order_id, event_type, detail, actor_id, created_at)
      values (
        NEW.id,
        'assignment_changed',
        jsonb_build_object('field', 'appraiser_id', 'from', OLD.appraiser_id, 'to', NEW.appraiser_id),
        v_actor,
        now()
      );
    end if;

    if NEW.reviewer_id is distinct from OLD.reviewer_id then
      insert into public.activity_log(order_id, event_type, detail, actor_id, created_at)
      values (
        NEW.id,
        'assignment_changed',
        jsonb_build_object('field', 'reviewer_id', 'from', OLD.reviewer_id, 'to', NEW.reviewer_id),
        v_actor,
        now()
      );
    end if;
    return NEW;
  end if;

  return NEW;
end;
$$;

create or replace function public.tg_orders_audit_ins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log(order_id, event_type, detail, actor_id)
  values (
    NEW.id,
    'order_created',
    jsonb_build_object(
      'status', NEW.status,
      'date_ordered', NEW.date_ordered,
      'client_id', NEW.client_id
    ),
    public.current_app_user_id()
  );
  return NEW;
end;
$$;

create or replace function public.tg_orders_audit_upd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_app_user_id();
begin
  if NEW.status is distinct from OLD.status then
    insert into public.activity_log(order_id, event_type, detail, actor_id)
    values (NEW.id, 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status), v_actor);
  end if;

  if NEW.site_visit_at is distinct from OLD.site_visit_at
     or NEW.review_due_at is distinct from OLD.review_due_at
     or NEW.final_due_at is distinct from OLD.final_due_at then
    insert into public.activity_log(order_id, event_type, detail, actor_id)
    values (
      NEW.id,
      'dates_updated',
      jsonb_build_object(
        'site_visit_at', NEW.site_visit_at,
        'review_due_at', NEW.review_due_at,
        'final_due_at', NEW.final_due_at
      ),
      v_actor
    );
  end if;

  if NEW.appraiser_id is distinct from OLD.appraiser_id then
    insert into public.activity_log(order_id, event_type, detail, actor_id)
    values (NEW.id, 'assignee_changed', jsonb_build_object('field', 'appraiser_id', 'from', OLD.appraiser_id, 'to', NEW.appraiser_id), v_actor);
  end if;

  if NEW.reviewer_id is distinct from OLD.reviewer_id then
    insert into public.activity_log(order_id, event_type, detail, actor_id)
    values (NEW.id, 'assignee_changed', jsonb_build_object('field', 'reviewer_id', 'from', OLD.reviewer_id, 'to', NEW.reviewer_id), v_actor);
  end if;

  if NEW.base_fee is distinct from OLD.base_fee or NEW.fee_amount is distinct from OLD.fee_amount then
    insert into public.activity_log(order_id, event_type, detail, actor_id)
    values (NEW.id, 'fee_changed', jsonb_build_object('base_fee', NEW.base_fee, 'fee_amount', NEW.fee_amount), v_actor);
  end if;

  return NEW;
end;
$$;

create or replace function public.log_order_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_app_user_id();
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_log (
      order_id,
      event_type,
      event_data,
      environment,
      actor,
      created_at
    )
    values (
      NEW.id,
      'order_created',
      '{}'::jsonb,
      current_setting('app.environment', true),
      v_actor,
      now()
    );
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.assigned_to is distinct from OLD.assigned_to then
      insert into public.activity_log (
        order_id,
        event_type,
        event_data,
        environment,
        actor,
        created_at
      )
      values (
        NEW.id,
        'assigned_to_appraiser',
        jsonb_build_object(
          'old_assigned_to', coalesce(OLD.assigned_to::text, ''),
          'new_assigned_to', coalesce(NEW.assigned_to::text, '')
        ),
        current_setting('app.environment', true),
        v_actor,
        now()
      );
    end if;

    if NEW.status is distinct from OLD.status then
      insert into public.activity_log (
        order_id,
        event_type,
        event_data,
        environment,
        actor,
        created_at
      )
      values (
        NEW.id,
        'status_changed',
        jsonb_build_object(
          'from', coalesce(OLD.status, ''),
          'to', coalesce(NEW.status, '')
        ),
        current_setting('app.environment', true),
        v_actor,
        now()
      );
    end if;

    return NEW;
  end if;

  return NEW;
end;
$$;

commit;
