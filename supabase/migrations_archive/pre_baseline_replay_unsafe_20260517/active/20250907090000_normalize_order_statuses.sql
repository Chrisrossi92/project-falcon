-- Normalize orders.status to canonical lowercase values and enforce via CHECK.

update public.orders
set status = case
  when status is null then null
  when lower(status) in ('new') then 'new'
  when lower(status) in ('in_progress','in progress') then 'in_progress'
  when lower(status) in ('in_review','in review','review') then 'in_review'
  when lower(status) in ('needs_revisions','needs revisions','needs revision','revisions','revision') then 'needs_revisions'
  when lower(status) in ('ready_to_send','ready to send') then 'in_review'
  when lower(status) in ('complete','completed') then 'completed'
  when lower(status) in ('cancelled','canceled') then 'completed'
  else 'in_progress'
end;

alter table public.orders
  drop constraint if exists orders_status_canonical_chk;

alter table public.orders
  add constraint orders_status_canonical_chk
  check (status is null or status in ('new','in_progress','in_review','needs_revisions','completed'));
