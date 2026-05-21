-- Phase 8C5K2A: remove legacy role-string order activity policy paths.
--
-- Keep legacy role tables/helpers in place for other compatibility surfaces,
-- but make order read/activity RLS depend on company-scoped permissions.

create or replace function public.current_app_user_can_read_order_row(
  p_company_id uuid,
  p_appraiser_id uuid,
  p_assigned_to uuid,
  p_reviewer_id uuid,
  p_status text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
    and (
      public.current_app_user_has_permission('orders.read.all')
      or (
        public.current_app_user_has_permission('orders.read.assigned')
        and (
          coalesce(p_appraiser_id, p_assigned_to) = public.current_app_user_id()
          or (
            p_reviewer_id = public.current_app_user_id()
            and lower(coalesce(p_status, '')) = any (
              array['in_review', 'needs_revisions', 'review_cleared', 'completed']
            )
          )
        )
      )
    );
$$;

comment on function public.current_app_user_can_read_order_row(uuid, uuid, uuid, uuid, text) is
  'Company-scoped order row read helper. Uses normalized permission keys orders.read.all and orders.read.assigned; does not use legacy public.user_roles or public.users.role.';

drop policy if exists "order_activity_admin_update" on public.order_activity;
create policy "order_activity_admin_update"
on public.order_activity
for update
to authenticated
using (public.current_app_user_has_permission('activity.moderate'))
with check (public.current_app_user_has_permission('activity.moderate'));

drop policy if exists "order_activity_admin_delete" on public.order_activity;
create policy "order_activity_admin_delete"
on public.order_activity
for delete
to authenticated
using (public.current_app_user_has_permission('activity.moderate'));

-- Superseded by order_activity_select_visible, which delegates to
-- can_read_order(order_id) and the company-scoped order read helper above.
drop policy if exists "read order activity (assigned or admin)" on public.order_activity;
