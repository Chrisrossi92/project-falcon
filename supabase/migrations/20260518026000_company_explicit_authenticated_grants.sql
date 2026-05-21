-- Slice 7H2A: replace broad anon/authenticated grants with an explicit
-- authenticated allowlist. Service-role broad access is intentionally
-- preserved for operator/backfill compatibility and will be tightened later.

revoke all privileges on all tables in schema public from public;
revoke all privileges on all sequences in schema public from public;
revoke all privileges on all functions in schema public from public;

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke all privileges on all functions in schema public from anon;

revoke all privileges on all tables in schema public from authenticated;
revoke all privileges on all sequences in schema public from authenticated;
revoke all privileges on all functions in schema public from authenticated;

grant usage on schema public to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on functions from public, anon, authenticated;

alter default privileges in schema public
  revoke all privileges on tables from public, anon, authenticated;
alter default privileges in schema public
  revoke all privileges on sequences from public, anon, authenticated;
alter default privileges in schema public
  revoke all privileges on functions from public, anon, authenticated;

do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on tables from public, anon, authenticated';
  execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on sequences from public, anon, authenticated';
  execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on functions from public, anon, authenticated';
exception
  when insufficient_privilege then
    raise notice 'Skipping supabase_admin default ACL cleanup; migration role cannot alter default privileges for supabase_admin in this environment.';
end
$$;

-- Canonical hardened views remain the PostgREST read surface for the tenant
-- hardened operational domains.
grant select on table
  public.v_orders_frontend_v4,
  public.v_orders_active_frontend_v4,
  public.v_orders_list,
  public.v_orders_list_with_last_activity,
  public.v_admin_calendar,
  public.v_admin_calendar_enriched,
  public.v_client_kpis,
  public.v_client_metrics,
  public.v_client_kpis_appraiser,
  public.v_order_activity_feed,
  public.v_order_activity_compat
to authenticated;

-- Direct table access is kept only where current frontend flows still depend
-- on table writes/reads protected by RLS and tenant-aware triggers.
grant select, insert, update, delete on table
  public.orders,
  public.clients
to authenticated;

grant select, insert, update on table
  public.users
to authenticated;

grant select on table
  public.user_profiles,
  public.user_roles,
  public.notification_policies
to authenticated;

grant select, insert, update on table
  public.notification_prefs
to authenticated;

grant usage, select on sequence public.clients_id_seq to authenticated;

-- Context, permission, and policy/view predicate helpers.
grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.current_public_user_id() to authenticated;
grant execute on function public.current_user_id() to authenticated;
grant execute on function public.current_user_public_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_has_role(text) to authenticated;
grant execute on function public.current_is_admin() to authenticated;
grant execute on function public.current_is_appraiser() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_appraiser() to authenticated;
grant execute on function public.is_reviewer() to authenticated;
grant execute on function public.default_company_id() to authenticated;
grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_app_user_company_ids() to authenticated;
grant execute on function public.current_app_user_has_company(uuid) to authenticated;
grant execute on function public.current_app_user_has_current_company() to authenticated;
grant execute on function public.current_app_user_permission_keys() to authenticated;
grant execute on function public.current_app_user_permission_keys_for_company(uuid) to authenticated;
grant execute on function public.current_app_user_has_permission(text) to authenticated;
grant execute on function public.current_app_user_has_permission_for_company(uuid, text) to authenticated;
grant execute on function public.current_app_user_has_any_permission(text[]) to authenticated;
grant execute on function public.current_app_user_has_any_permission_for_company(uuid, text[]) to authenticated;
grant execute on function public.current_app_user_has_all_permissions(text[]) to authenticated;
grant execute on function public.current_app_user_has_all_permissions_for_company(uuid, text[]) to authenticated;

grant execute on function public.current_app_user_can_read_order_row(uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.current_app_user_can_read_order(uuid) to authenticated;
grant execute on function public.can_read_order(uuid) to authenticated;
grant execute on function public.current_app_user_can_create_order() to authenticated;
grant execute on function public.current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.current_app_user_can_attach_order_client(bigint) to authenticated;
grant execute on function public.current_app_user_can_attach_order_amc(bigint) to authenticated;
grant execute on function public.current_app_user_can_assign_order_target(uuid, uuid, text) to authenticated;
grant execute on function public.current_app_user_can_write_order_activity(uuid) to authenticated;

grant execute on function public.current_app_user_can_read_client_row(uuid, bigint) to authenticated;
grant execute on function public.current_app_user_can_create_client() to authenticated;
grant execute on function public.current_app_user_can_update_client_row(uuid, bigint) to authenticated;
grant execute on function public.current_app_user_can_delete_client_row(uuid, bigint) to authenticated;

grant execute on function public.current_app_user_can_access_notification_row(uuid, uuid) to authenticated;

-- Active frontend/canonical operational RPC allowlist.
grant execute on function public.rpc_current_company_context() to authenticated;
grant execute on function public.client_name_taken(text, bigint) to authenticated;
grant execute on function public.get_clients_for_user() to authenticated;
grant execute on function public.merge_clients(bigint, bigint, jsonb) to authenticated;

grant execute on function public.rpc_client_create(jsonb) to authenticated;
grant execute on function public.rpc_client_update(text, jsonb) to authenticated;
grant execute on function public.rpc_client_delete(text) to authenticated;
grant execute on function public.rpc_create_client(jsonb) to authenticated;
grant execute on function public.rpc_update_client(bigint, jsonb) to authenticated;
grant execute on function public.rpc_delete_client(bigint) to authenticated;

grant execute on function public.rpc_create_order(jsonb) to authenticated;
grant execute on function public.rpc_update_order(uuid, jsonb) to authenticated;
grant execute on function public.rpc_order_update(uuid, jsonb) to authenticated;
grant execute on function public.rpc_list_orders(uuid, text, text, integer, integer) to authenticated;
grant execute on function public.rpc_get_activity_feed(uuid) to authenticated;
grant execute on function public.rpc_transition_order_status(uuid, text, text) to authenticated;
grant execute on function public.rpc_assign_order(uuid, uuid, text) to authenticated;
grant execute on function public.rpc_update_due_dates(uuid, date, date) to authenticated;
grant execute on function public.rpc_update_order_dates(uuid, timestamp with time zone, timestamp with time zone, timestamp with time zone) to authenticated;

grant execute on function public.get_calendar_events() to authenticated;
grant execute on function public.get_calendar_events(timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.rpc_create_calendar_event(text, text, timestamp with time zone, timestamp with time zone, uuid, uuid, text, text) to authenticated;

grant execute on function public.rpc_log_event(uuid, text, jsonb) to authenticated;
grant execute on function public.rpc_log_event(uuid, text, text, jsonb) to authenticated;
grant execute on function public.rpc_log_note(uuid, text, jsonb) to authenticated;
grant execute on function public.rpc_log_status_change(uuid, text, text, text) to authenticated;

grant execute on function public.rpc_notification_create(jsonb) to authenticated;
grant execute on function public.rpc_get_notifications(integer, timestamp with time zone) to authenticated;
grant execute on function public.rpc_get_unread_count() to authenticated;
grant execute on function public.rpc_mark_notification_read(uuid) to authenticated;
grant execute on function public.rpc_mark_all_notifications_read() to authenticated;
grant execute on function public.rpc_dismiss_notification(uuid) to authenticated;
grant execute on function public.rpc_dismiss_seen_notifications() to authenticated;
grant execute on function public.rpc_notification_prefs_ensure() to authenticated;
grant execute on function public.rpc_notification_prefs_get(uuid) to authenticated;
grant execute on function public.rpc_notification_prefs_update(jsonb) to authenticated;
grant execute on function public.rpc_notification_prefs_update(jsonb, uuid) to authenticated;
grant execute on function public.rpc_set_notification_pref_v1(uuid, text, text, boolean, jsonb) to authenticated;
grant execute on function public.rpc_get_notification_prefs_v1(uuid) to authenticated;

grant execute on function public.rpc_get_my_role() to authenticated;
grant execute on function public.rpc_list_users_with_roles() to authenticated;
grant execute on function public.rpc_set_user_role(uuid, text) to authenticated;
grant execute on function public.rpc_set_user_role(uuid, text, boolean) to authenticated;
grant execute on function public.rpc_admin_users_update(uuid, jsonb) to authenticated;
grant execute on function public.rpc_admin_users_set_active(uuid, boolean) to authenticated;
grant execute on function public.rpc_update_profile(text, text, text, text) to authenticated;
grant execute on function public.team_list_users() to authenticated;
grant execute on function public.team_list_users(boolean) to authenticated;
grant execute on function public.team_get_user(uuid) to authenticated;

comment on schema public is
  'Slice 7H2A: anon/authenticated broad object grants removed. Authenticated access is explicit allowlist only; service_role broad access is temporarily preserved pending operator-path cleanup.';
