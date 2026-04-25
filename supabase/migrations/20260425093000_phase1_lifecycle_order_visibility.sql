begin;

-- Phase 1 lifecycle visibility:
-- Global reviewer role does not grant all-order visibility.
-- Reviewers see assigned review work only in active/historical review statuses.

alter table public.orders enable row level security;

create or replace function public.current_is_appraiser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.user_roles ur
     where ur.user_id = public.current_app_user_id()
       and ur.role = 'appraiser'
  );
$$;

grant execute on function public.current_is_appraiser() to authenticated;

drop policy if exists orders_read_all on public.orders;
drop policy if exists orders_select_policy on public.orders;
drop policy if exists orders_select_admin on public.orders;
drop policy if exists orders_select_appraiser on public.orders;
drop policy if exists orders_select_lifecycle_visibility on public.orders;
drop policy if exists orders_update_policy on public.orders;
drop policy if exists allow_reviewer_update_status on public.orders;
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
      'completed'
    )
  )
);

-- Supabase/Postgres 15+ supports security_invoker views so base-table RLS applies
-- when querying frontend views. Older versions cannot set this option.
do $$
begin
  if current_setting('server_version_num')::int >= 150000 then
    if to_regclass('public.v_orders_frontend_v4') is not null then
      execute 'alter view public.v_orders_frontend_v4 set (security_invoker = true)';
    end if;

    if to_regclass('public.v_orders_active_frontend_v4') is not null then
      execute 'alter view public.v_orders_active_frontend_v4 set (security_invoker = true)';
    end if;
  end if;
end;
$$;

commit;
