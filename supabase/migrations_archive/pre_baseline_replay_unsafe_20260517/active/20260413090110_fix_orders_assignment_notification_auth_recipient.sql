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
  v_auth_user_id uuid;
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

  select u.auth_id
    into v_auth_user_id
    from public.users u
   where u.id = NEW.appraiser_id
   limit 1;

  if v_auth_user_id is null then
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
    v_auth_user_id,
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

commit;
