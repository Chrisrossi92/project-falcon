begin;

-- Phase 5 optional final approval support.
-- `pending_final_approval` may be used after `review_cleared` for companies
-- that require admin/owner approval before client release.
-- This migration only widens the live status constraint; reviewer visibility
-- is intentionally unchanged.

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
      'pending_final_approval',
      'ready_for_client',
      'completed'
    )
  );

commit;
