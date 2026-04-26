begin;

-- Phase 3 reviewer-to-admin handoff support.
-- `review_cleared` represents reviewer clearance before admin/owner client release.
-- Keep `ready_for_client` as the existing admin/delivery queue status.

alter table public.orders
  drop constraint if exists orders_status_canonical_chk;

alter table public.orders
  add constraint orders_status_canonical_chk
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

drop policy if exists orders_select_lifecycle_visibility on public.orders;
drop policy if exists orders_update_lifecycle_visibility on public.orders;

create policy orders_select_lifecycle_visibility on public.orders
for select
to authenticated
using (
  public.current_is_admin()
  or coalesce(appraiser_id, assigned_to) = public.current_app_user_id()
  or (
    reviewer_id = public.current_app_user_id()
    and lower(coalesce(status::text, '')) in (
      'in_review',
      'needs_revisions',
      'review_cleared',
      'completed'
    )
  )
);

create policy orders_update_lifecycle_visibility on public.orders
for update
to authenticated
using (
  public.current_is_admin()
  or coalesce(appraiser_id, assigned_to) = public.current_app_user_id()
  or (
    reviewer_id = public.current_app_user_id()
    and lower(coalesce(status::text, '')) in (
      'in_review',
      'needs_revisions',
      'review_cleared',
      'completed'
    )
  )
)
with check (
  public.current_is_admin()
  or coalesce(appraiser_id, assigned_to) = public.current_app_user_id()
  or (
    reviewer_id = public.current_app_user_id()
    and lower(coalesce(status::text, '')) in (
      'in_review',
      'needs_revisions',
      'review_cleared',
      'completed'
    )
  )
);

commit;
