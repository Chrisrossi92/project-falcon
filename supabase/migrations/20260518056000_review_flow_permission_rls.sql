-- Phase 8C5K2B: remove legacy users.role admin read from review_flow RLS.
--
-- review_flow remains indirectly scoped through its order. Assigned reviewer
-- visibility is preserved by the existing assigned reviewer policy.

drop policy if exists "Admins can read all" on public.review_flow;

create policy "review_flow_order_read_visible"
on public.review_flow
for select
to authenticated
using (
  order_id is not null
  and public.can_read_order(order_id)
);
