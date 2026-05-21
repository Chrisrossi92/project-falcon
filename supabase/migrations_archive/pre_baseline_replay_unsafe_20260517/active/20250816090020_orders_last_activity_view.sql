-- Helper view: last activity per order for lists/drawer
create or replace view public.v_orders_list_with_last_activity as
select
  l.*, 
  a.action     as last_action,
  a.message    as last_message,
  a.created_at as last_activity_at
from public.v_orders_list l
left join lateral (
  select action, message, created_at
  from public.activity_log
  where order_id = l.id
  order by created_at desc
  limit 1
) a on true;
