-- Phase 8C5J6A: deprecate legacy role-string RPCs.
--
-- These RPCs are no longer used by the frontend after route/nav/action
-- authority moved to company-scoped permissions and app-context projections.
-- Keep the functions and service_role compatibility for now; only remove
-- browser/app-role execute access and document replacement paths.

revoke execute on function public.rpc_get_my_role() from public;
revoke execute on function public.rpc_get_my_role() from anon;
revoke execute on function public.rpc_get_my_role() from authenticated;
grant execute on function public.rpc_get_my_role() to service_role;
comment on function public.rpc_get_my_role() is
  'Deprecated legacy role-string compatibility RPC. Browser callers must use company-member RPCs, permission hooks, and rpc_current_user_app_context instead.';

revoke execute on function public.rpc_list_users_with_roles() from public;
revoke execute on function public.rpc_list_users_with_roles() from anon;
revoke execute on function public.rpc_list_users_with_roles() from authenticated;
grant execute on function public.rpc_list_users_with_roles() to service_role;
comment on function public.rpc_list_users_with_roles() is
  'Deprecated legacy role-string user listing RPC. Browser callers must use company-member read RPCs and invitation/member management RPCs instead.';

revoke execute on function public.rpc_set_user_role(uuid, text) from public;
revoke execute on function public.rpc_set_user_role(uuid, text) from anon;
revoke execute on function public.rpc_set_user_role(uuid, text) from authenticated;
grant execute on function public.rpc_set_user_role(uuid, text) to service_role;
comment on function public.rpc_set_user_role(uuid, text) is
  'Deprecated legacy public.users.role mutation RPC. Browser callers must use company-member role mutation RPCs instead.';

revoke execute on function public.rpc_set_user_role(uuid, text, boolean) from public;
revoke execute on function public.rpc_set_user_role(uuid, text, boolean) from anon;
revoke execute on function public.rpc_set_user_role(uuid, text, boolean) from authenticated;
grant execute on function public.rpc_set_user_role(uuid, text, boolean) to service_role;
comment on function public.rpc_set_user_role(uuid, text, boolean) is
  'Deprecated legacy public.user_roles mutation RPC. Browser callers must use company-member role mutation RPCs instead.';

revoke execute on function public.rpc_admin_set_user_role(uuid, text) from public;
revoke execute on function public.rpc_admin_set_user_role(uuid, text) from anon;
revoke execute on function public.rpc_admin_set_user_role(uuid, text) from authenticated;
grant execute on function public.rpc_admin_set_user_role(uuid, text) to service_role;
comment on function public.rpc_admin_set_user_role(uuid, text) is
  'Deprecated legacy public.user_roles admin mutation RPC. Browser callers must use company-member role mutation RPCs instead.';
