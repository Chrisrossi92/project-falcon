begin;

create or replace function public.current_app_user_has_active_client_portal_membership()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.client_portal_members cpm
      join public.clients c
        on c.id = cpm.client_id
       and coalesce(c.company_id, public.default_company_id()) = cpm.company_id
     where cpm.user_id = public.current_app_user_id()
       and cpm.status = 'active'
       and coalesce(c.status, 'active') <> 'archived'
  );
$$;

create or replace function public.current_app_user_permission_keys()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select distinct resolved.permission_key
    from (
      select k.permission_key
        from public.current_app_user_permission_keys_for_company(public.current_company_id()) k(permission_key)
      union all
      select portal.permission_key
        from (
          values
            ('client_portal.dashboard.view'::text),
            ('client_portal.orders.read'::text),
            ('client_portal.orders.create'::text),
            ('client_portal.reports.read'::text)
        ) as portal(permission_key)
       where public.current_app_user_has_active_client_portal_membership()
    ) resolved
   where resolved.permission_key is not null
   order by resolved.permission_key;
$$;

create or replace function public.current_app_user_has_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_permission_key in (
      'client_portal.dashboard.view',
      'client_portal.orders.read',
      'client_portal.orders.create',
      'client_portal.reports.read'
    ) then public.current_app_user_has_active_client_portal_membership()
    else public.current_app_user_has_permission_for_company(
      public.current_company_id(),
      p_permission_key
    )
  end;
$$;

create or replace function public.current_app_user_has_any_permission(p_permission_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from unnest(coalesce(p_permission_keys, array[]::text[])) as requested(permission_key)
     where public.current_app_user_has_permission(requested.permission_key)
  );
$$;

create or replace function public.current_app_user_has_all_permissions(p_permission_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_length(p_permission_keys, 1), 0) > 0
     and not exists (
       select 1
         from unnest(coalesce(p_permission_keys, array[]::text[])) as requested(permission_key)
        where not public.current_app_user_has_permission(requested.permission_key)
     );
$$;

create or replace function public.current_app_user_can_read_client_portal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_id() is not null
    and (
      public.current_app_user_has_permission('client_portal.dashboard.view')
      or public.current_app_user_has_permission('client_portal.orders.read')
    )
    and exists (
      select 1
        from public.current_app_user_client_portal_client_ids()
    );
$$;

create or replace function public.current_app_user_can_create_client_portal_order_request()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_id() is not null
    and public.current_app_user_has_permission('client_portal.orders.create')
    and exists (
      select 1
        from public.current_app_user_client_portal_client_ids()
    );
$$;

revoke all on function public.current_app_user_has_active_client_portal_membership()
  from public, anon;
grant execute on function public.current_app_user_has_active_client_portal_membership()
  to authenticated, service_role;
grant execute on function public.current_app_user_permission_keys()
  to authenticated, service_role;
grant execute on function public.current_app_user_has_permission(text)
  to authenticated, service_role;
grant execute on function public.current_app_user_has_any_permission(text[])
  to authenticated, service_role;
grant execute on function public.current_app_user_has_all_permissions(text[])
  to authenticated, service_role;
grant execute on function public.current_app_user_can_read_client_portal()
  to authenticated, service_role;
grant execute on function public.current_app_user_can_create_client_portal_order_request()
  to authenticated, service_role;

comment on function public.current_app_user_has_active_client_portal_membership() is
  'AMC-19.2 Client Portal access helper. Returns true for active client_portal_members without requiring operational company membership.';

comment on function public.current_app_user_permission_keys() is
  'Compatibility wrapper for active permission checks. Resolves operational permissions through current company membership and grants only Client Portal permission keys from active client_portal_members.';

comment on function public.current_app_user_can_read_client_portal() is
  'Client Portal read gate. Requires authenticated app user plus active client_portal_members access; does not require or grant operational company membership.';

commit;
