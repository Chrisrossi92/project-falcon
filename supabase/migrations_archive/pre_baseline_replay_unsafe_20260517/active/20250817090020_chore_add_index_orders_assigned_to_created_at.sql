-- Add composite index on (assigned_to, created_at DESC) to improve queries that list orders
-- for a given assignee in reverse chronological order.

create index if not exists idx_orders_assigned_to_created_at
  on public.orders (assigned_to, created_at desc);