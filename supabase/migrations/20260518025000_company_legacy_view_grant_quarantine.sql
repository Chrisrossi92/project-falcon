begin;

-- Slice 7H1: quarantine legacy public views that predate the tenant-safe
-- canonical views/RPCs. These objects remain in place for dependency
-- compatibility, but app roles must not reach them through PostgREST.
revoke select on table
  public.v_orders_unified,
  public.v_orders_frontend,
  public.v_orders_list_v2,
  public.v_orders_list_with_last_activity_v2,
  public.v_orders_unified_list,
  public.v_orders_dashboard_active,
  public.v_admin_dashboard_counts,
  public.v_calendar_events,
  public.v_calendar_unified,
  public.v_admin_calendar_v2,
  public.v_calendar_events_admin,
  public.v_calendar_events_appraiser,
  public.v_amcs,
  public.profiles,
  public.v_email_queue,
  public.v_staging_raw_orders_2025_ord,
  public.v_user_notification_prefs
from anon, authenticated;

comment on view public.v_orders_unified is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_orders_frontend_v4, v_orders_active_frontend_v4, v_orders_list, or v_orders_list_with_last_activity.';
comment on view public.v_orders_frontend is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_orders_frontend_v4.';
comment on view public.v_orders_list_v2 is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_orders_list.';
comment on view public.v_orders_list_with_last_activity_v2 is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_orders_list_with_last_activity.';
comment on view public.v_orders_unified_list is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe order views.';
comment on view public.v_orders_dashboard_active is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe dashboard/order projections.';
comment on view public.v_admin_dashboard_counts is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Rebuild through tenant-safe dashboard RPC/view before app use.';
comment on view public.v_calendar_events is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_admin_calendar or v_admin_calendar_enriched.';
comment on view public.v_calendar_unified is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_admin_calendar or v_admin_calendar_enriched.';
comment on view public.v_admin_calendar_v2 is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_admin_calendar_enriched.';
comment on view public.v_calendar_events_admin is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe calendar views/RPCs.';
comment on view public.v_calendar_events_appraiser is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe calendar views/RPCs.';
comment on view public.v_amcs is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Rebuild through tenant-safe client/AMC hierarchy before app use.';
comment on view public.profiles is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. User/team visibility remains deferred to a dedicated tenant-isolation slice.';
comment on view public.v_email_queue is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Email queue inspection must remain service/operator controlled.';
comment on view public.v_staging_raw_orders_2025_ord is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Import staging data must remain operator controlled.';
comment on view public.v_user_notification_prefs is
  'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Notification preference company semantics remain deferred.';

create or replace view public.v_order_activity_feed
as
select
  a.id,
  a.order_id,
  coalesce(a.event_type, a.action) as event_type,
  coalesce(
    a.message,
    case
      when coalesce(a.event_type, a.action) = 'status_changed'
        and coalesce(a.detail->>'from_status', a.prev_status, a.detail->>'from') is not null
        and coalesce(a.detail->>'to_status', a.new_status, a.detail->>'to') is not null
        then format(
          'Status changed: %s -> %s',
          coalesce(a.detail->>'from_status', a.prev_status, a.detail->>'from'),
          coalesce(a.detail->>'to_status', a.new_status, a.detail->>'to')
        )
      else null::text
    end,
    a.detail->>'text'
  ) as message,
  a.detail,
  a.created_at,
  a.created_by,
  coalesce(a.created_by_name, p.full_name) as created_by_name,
  coalesce(a.created_by_email, p.email) as created_by_email
from public.activity_log a
left join public.profiles_legacy p on p.id = coalesce(a.created_by, a.actor_id)
where a.order_id is not null
  and public.current_app_user_can_read_order(a.order_id);

create or replace view public.v_order_activity_compat
as
select
  al.id,
  al.order_id,
  al.actor_id as user_id,
  al.event_type as event,
  null::text as details,
  al.event_type as action,
  al.message as note,
  al.created_at,
  al.actor_id as created_by
from public.activity_log al
where al.order_id is not null
  and public.current_app_user_can_read_order(al.order_id);

grant select on public.v_order_activity_feed to anon, authenticated;
grant select on public.v_order_activity_compat to anon, authenticated;

comment on view public.v_order_activity_feed is
  'Slice 7H1: tenant-safe compatibility activity feed; order_id-null rows are hidden from app roles and order rows require current_app_user_can_read_order(order_id).';
comment on view public.v_order_activity_compat is
  'Slice 7H1: tenant-safe legacy activity compatibility view; order_id-null rows are hidden from app roles and order rows require current_app_user_can_read_order(order_id).';

-- Future cleanup should replace baseline GRANT ... ON ALL objects/default ACLs
-- with explicit grants after all active PostgREST/RPC surfaces are cataloged.

commit;
