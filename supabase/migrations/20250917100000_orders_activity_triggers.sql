-- Auto-log order creation/status/assignment changes into activity_log and align rpc_log_event with table columns.

begin;

-- Recreate rpc_log_event to match current activity_log schema (order_id, event_type, detail, actor_id, created_at)
drop function if exists public.rpc_log_event(uuid, text, jsonb);
create or replace function public.rpc_log_event(p_order_id uuid, p_event_type text, p_detail jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  insert into public.activity_log(order_id, event_type, detail, actor_id, created_at)
  values (p_order_id, p_event_type, coalesce(p_detail,'{}'::jsonb), v_uid, now())
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.rpc_log_event(uuid, text, jsonb) to authenticated;

-- Trigger function to log inserts/updates on orders
create or replace function public.tg_log_order_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
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
        jsonb_build_object('field','appraiser_id','from', OLD.appraiser_id, 'to', NEW.appraiser_id),
        v_actor,
        now()
      );
    end if;

    if NEW.reviewer_id is distinct from OLD.reviewer_id then
      insert into public.activity_log(order_id, event_type, detail, actor_id, created_at)
      values (
        NEW.id,
        'assignment_changed',
        jsonb_build_object('field','reviewer_id','from', OLD.reviewer_id, 'to', NEW.reviewer_id),
        v_actor,
        now()
      );
    end if;
    return NEW;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_log_order_changes on public.orders;
create trigger trg_log_order_changes
after insert or update on public.orders
for each row
execute function public.tg_log_order_changes();

commit;
