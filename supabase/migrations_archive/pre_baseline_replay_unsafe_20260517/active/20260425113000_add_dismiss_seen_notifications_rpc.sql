begin;

-- Bulk dismiss only notifications the current user has intentionally seen.
-- Unread notifications remain in the quick view and no notification history is deleted.

create or replace function public.rpc_dismiss_seen_notifications()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications
     set dismissed_at = coalesce(dismissed_at, now())
   where user_id = public.current_app_user_id()
     and read_at is not null
     and dismissed_at is null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.rpc_dismiss_seen_notifications() to authenticated;

commit;
