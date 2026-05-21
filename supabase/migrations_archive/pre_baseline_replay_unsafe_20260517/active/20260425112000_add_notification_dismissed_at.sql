begin;

-- Add quick-view dismissal without deleting notification history.
-- `read_at` means seen; `dismissed_at` removes the item from the quick view
-- while keeping the row available for future full history/activity views.

alter table public.notifications
  add column if not exists dismissed_at timestamptz;

create index if not exists idx_notifications_user_dismissed_created
  on public.notifications (user_id, dismissed_at, created_at desc);

create or replace function public.rpc_dismiss_notification(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications
     set dismissed_at = coalesce(dismissed_at, now()),
         read_at = coalesce(read_at, now())
   where id = p_notification_id
     and user_id = public.current_app_user_id();

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

grant execute on function public.rpc_dismiss_notification(uuid) to authenticated;

commit;
