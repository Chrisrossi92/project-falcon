begin;

-- Fix live constraint-name drift for Phase 3 reviewer-to-admin handoff.
-- Some environments enforce order status through `orders_status_valid`
-- instead of the older `orders_status_canonical_chk` name.
-- Keep one canonical live constraint name and allow `review_cleared`.

alter table public.orders
  drop constraint if exists orders_status_canonical_chk;

alter table public.orders
  drop constraint if exists orders_status_valid;

alter table public.orders
  add constraint orders_status_valid
  check (
    status is null
    or status in (
      'new',
      'in_progress',
      'in_review',
      'needs_revisions',
      'review_cleared',
      'ready_for_client',
      'completed'
    )
  );

commit;
