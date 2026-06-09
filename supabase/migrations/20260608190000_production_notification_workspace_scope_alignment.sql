begin;

create or replace function public.notification_row_matches_operations_scope(
  p_notification public.notifications,
  p_operations_scope text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_operations_scope is null
    or (
      p_operations_scope in ('internal_operations', 'amc_operations')
      and (
        (
          p_notification.order_id is not null
          and exists (
            select 1
              from public.orders o
             where o.id = p_notification.order_id
               and coalesce(o.operations_scope, 'internal_operations') = p_operations_scope
          )
        )
        or (
          p_notification.order_id is null
          and coalesce(
            nullif(p_notification.payload ->> 'operations_scope', ''),
            nullif(p_notification.payload ->> 'operation_scope', ''),
            nullif(p_notification.payload ->> 'workspace_scope', ''),
            nullif(p_notification.payload ->> 'order_operations_scope', '')
          ) = p_operations_scope
        )
        or (
          p_notification.order_id is null
          and coalesce(
            nullif(p_notification.payload ->> 'operations_scope', ''),
            nullif(p_notification.payload ->> 'operation_scope', ''),
            nullif(p_notification.payload ->> 'workspace_scope', ''),
            nullif(p_notification.payload ->> 'order_operations_scope', '')
          ) is null
          and (
            concat_ws(' ',
              p_notification.type,
              p_notification.category,
              p_notification.title,
              p_notification.body,
              p_notification.message,
              p_notification.payload ->> 'event_key',
              p_notification.payload ->> 'source_type'
            ) !~* '(order|assignment|bid|invoice|payment|vendor|procurement)'
            or p_operations_scope = 'internal_operations'
          )
        )
      )
    );
$$;

create or replace function public.rpc_get_notifications(
  p_limit integer default 50,
  p_before timestamptz default null,
  p_operations_scope text default null
)
returns setof public.notifications
language sql
security definer
set search_path = public
as $$
  select n.*
  from public.notifications n
  where n.user_id = public.current_app_user_id()
    and (p_before is null or n.created_at < p_before)
    and (
      n.order_id is null
      or public.current_app_user_can_read_order(n.order_id)
    )
    and public.notification_row_matches_operations_scope(n, p_operations_scope)
  order by n.created_at desc
  limit coalesce(p_limit, 50);
$$;

create or replace function public.rpc_get_unread_count(
  p_operations_scope text default null
)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.notifications n
  where n.user_id = public.current_app_user_id()
    and n.read_at is null
    and n.dismissed_at is null
    and (
      n.order_id is null
      or public.current_app_user_can_read_order(n.order_id)
    )
    and public.notification_row_matches_operations_scope(n, p_operations_scope);
$$;

create or replace function public.rpc_mark_all_notifications_read(
  p_operations_scope text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications n
     set read_at = coalesce(n.read_at, now()),
         is_read = true,
         read = true
   where public.current_app_user_can_access_notification_row(n.user_id, n.order_id)
     and n.read_at is null
     and public.notification_row_matches_operations_scope(n, p_operations_scope);

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

create or replace function public.rpc_dismiss_seen_notifications(
  p_operations_scope text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notifications n
     set dismissed_at = coalesce(n.dismissed_at, now())
   where public.current_app_user_can_access_notification_row(n.user_id, n.order_id)
     and n.read_at is not null
     and n.dismissed_at is null
     and public.notification_row_matches_operations_scope(n, p_operations_scope);

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.notification_row_matches_operations_scope(public.notifications, text)
  from public, anon, authenticated;
revoke all on function public.rpc_get_notifications(integer, timestamptz, text)
  from public, anon;
revoke all on function public.rpc_get_unread_count(text)
  from public, anon;
revoke all on function public.rpc_mark_all_notifications_read(text)
  from public, anon;
revoke all on function public.rpc_dismiss_seen_notifications(text)
  from public, anon;

grant execute on function public.rpc_get_notifications(integer, timestamptz, text)
  to authenticated, service_role;
grant execute on function public.rpc_get_unread_count(text)
  to authenticated, service_role;
grant execute on function public.rpc_mark_all_notifications_read(text)
  to authenticated, service_role;
grant execute on function public.rpc_dismiss_seen_notifications(text)
  to authenticated, service_role;

comment on function public.notification_row_matches_operations_scope(public.notifications, text) is
  'Production notification alignment helper. Order notifications use orders.operations_scope; scoped payload notifications use payload scope fields; unscoped non-order system notifications remain global.';

comment on function public.rpc_get_notifications(integer, timestamptz, text) is
  'Production notification alignment scoped notification list. Optional p_operations_scope prevents Internal/AMC notification bleed while preserving current user and order-read authorization.';

comment on function public.rpc_get_unread_count(text) is
  'Production notification alignment scoped unread notification count for the selected operations workspace.';

comment on function public.rpc_mark_all_notifications_read(text) is
  'Production notification alignment scoped bulk read action. Only notifications visible in the selected operations workspace are marked read.';

comment on function public.rpc_dismiss_seen_notifications(text) is
  'Production notification alignment scoped dismiss-seen action. Only seen notifications visible in the selected operations workspace are dismissed.';

commit;
