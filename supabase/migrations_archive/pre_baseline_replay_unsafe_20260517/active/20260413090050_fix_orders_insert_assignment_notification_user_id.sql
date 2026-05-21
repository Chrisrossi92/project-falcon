begin;

create or replace function public.tg_orders_insert_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.appraiser_id is null then
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
    'order.new_assigned',
    'New order assigned',
    'You’ve been assigned order #' || coalesce(NEW.order_number, NEW.id::text),
    NEW.id,
    '/orders/' || NEW.id::text,
    jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'email_template_key', 'APPRAISER_ASSIGNED'
    )
  );

  return NEW;
end;
$$;

commit;
