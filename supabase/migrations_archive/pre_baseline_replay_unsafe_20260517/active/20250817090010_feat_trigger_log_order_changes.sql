-- Create or replace function and trigger to automatically log order inserts and updates.

create or replace function public.log_order_changes()
returns trigger language plpgsql as $$
begin
  -- Log a new order insertion.
  if (TG_OP = 'INSERT') then
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
      auth.uid(),
      now()
    );
    return NEW;
  end if;

  -- Log updates to assignment and status.
  if (TG_OP = 'UPDATE') then
    -- When assigned_to changes, record the change.
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
          'old_assigned_to', coalesce(OLD.assigned_to::text,''),
          'new_assigned_to', coalesce(NEW.assigned_to::text,'')
        ),
        current_setting('app.environment', true),
        auth.uid(),
        now()
      );
    end if;

    -- When status changes, record the change.
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
          'from', coalesce(OLD.status,''),
          'to', coalesce(NEW.status,'')
        ),
        current_setting('app.environment', true),
        auth.uid(),
        now()
      );
    end if;

    return NEW;
  end if;

  return NEW;
end$$;

-- Drop any existing trigger and create a new one to use the log_order_changes function.
drop trigger if exists trg_orders_log on public.orders;
create trigger trg_orders_log
after insert or update on public.orders
for each row execute function public.log_order_changes();