begin;

create or replace function public.rpc_notification_create(patch jsonb)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notifications;
begin
  insert into public.notifications (
    user_id,
    type,
    category,
    title,
    body,
    order_id,
    is_read,
    created_at,
    link_path,
    payload
  ) values (
    coalesce(nullif(patch->>'user_id', '')::uuid, auth.uid()),
    coalesce(patch->>'type', patch->>'category'),
    patch->>'category',
    patch->>'title',
    patch->>'body',
    nullif(patch->>'order_id', '')::uuid,
    coalesce(nullif(patch->>'is_read', '')::boolean, false),
    coalesce(nullif(patch->>'created_at', '')::timestamptz, now()),
    patch->>'link_path',
    coalesce(patch->'payload', '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.rpc_notification_create(jsonb) to authenticated;

commit;
