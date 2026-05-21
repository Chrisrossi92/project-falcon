begin;

create or replace function public.tg_orders_insert_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
  v_title text;
  v_body text;
begin
  if TG_OP = 'INSERT' then
    if NEW.appraiser_id is null then
      return NEW;
    end if;

    v_event_type := 'order.new_assigned';
    v_title := 'New order assigned';
    v_body := 'You’ve been assigned order #' || coalesce(NEW.order_number, NEW.id::text);
  elsif TG_OP = 'UPDATE' then
    if NEW.appraiser_id is null or NEW.appraiser_id is not distinct from OLD.appraiser_id then
      return NEW;
    end if;

    if OLD.appraiser_id is null then
      v_event_type := 'order.new_assigned';
      v_title := 'New order assigned';
      v_body := 'You’ve been assigned order #' || coalesce(NEW.order_number, NEW.id::text);
    else
      v_event_type := 'order.reassigned';
      v_title := 'Order reassigned';
      v_body := 'You’ve been reassigned order #' || coalesce(NEW.order_number, NEW.id::text);
    end if;
  else
    return NEW;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    order_id,
    link_path,
    payload
  ) values (
    NEW.appraiser_id,
    v_event_type,
    v_title,
    v_body,
    NEW.id,
    '/orders/' || NEW.id::text,
    jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'email_template_key',
        case
          when v_event_type = 'order.new_assigned' then 'APPRAISER_ASSIGNED'
          else null
        end
    )
  );

  return NEW;
end;
$$;

drop trigger if exists trg_orders_insert_assignment_notification on public.orders;
create trigger trg_orders_insert_assignment_notification
after insert or update of appraiser_id on public.orders
for each row
execute function public.tg_orders_insert_assignment_notification();

commit;
