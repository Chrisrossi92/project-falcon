begin;

create or replace function public.tg_orders_insert_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
begin
  if NEW.appraiser_id is null then
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
    'order.new_assigned',
    'New order assigned',
    'You’ve been assigned order #' || coalesce(NEW.order_number, NEW.id::text) || '.',
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

drop trigger if exists trg_orders_insert_assignment_notification on public.orders;
create trigger trg_orders_insert_assignment_notification
after insert on public.orders
for each row
when (NEW.appraiser_id is not null)
execute function public.tg_orders_insert_assignment_notification();

commit;
