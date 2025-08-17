-- Drop duplicate indexes and add composite indexes

-- Remove duplicate indexes that provide no additional benefit.
drop index if exists public.activity_log_created_idx;
drop index if exists public.orders_appraiser_idx;
drop index if exists public.orders_client_idx;

-- Composite index for activity logs on (order_id, created_at DESC).
create index if not exists idx_activity_log_order_created_at
  on public.activity_log (order_id, created_at desc);

-- Conditionally create a composite index for calendar events on (order_id, start_at) if the order_id column exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'calendar_events'
      and column_name  = 'order_id'
  ) then
    create index if not exists idx_calendar_events_order_start
      on public.calendar_events (order_id, start_at);
  end if;
end$$;

-- Additional composite index on (event_type, start_at) for calendar events.
create index if not exists idx_calendar_events_type_start
  on public.calendar_events (event_type, start_at);