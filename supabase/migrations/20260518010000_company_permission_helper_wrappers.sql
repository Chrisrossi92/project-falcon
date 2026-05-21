begin;

create or replace function public.current_app_user_permission_keys()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select k.permission_key
    from public.current_app_user_permission_keys_for_company(public.current_company_id()) k(permission_key)
   order by k.permission_key;
$$;

create or replace function public.current_app_user_has_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_user_has_permission_for_company(
    public.current_company_id(),
    p_permission_key
  );
$$;

create or replace function public.current_app_user_has_any_permission(p_permission_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_user_has_any_permission_for_company(
    public.current_company_id(),
    p_permission_keys
  );
$$;

create or replace function public.current_app_user_has_all_permissions(p_permission_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_user_has_all_permissions_for_company(
    public.current_company_id(),
    p_permission_keys
  );
$$;

comment on function public.current_app_user_permission_keys() is
  'Compatibility wrapper for active permission checks. Resolves permissions through the current company context.';

comment on function public.current_app_user_has_permission(text) is
  'Compatibility wrapper for active permission checks. Resolves permissions through the current company context.';

comment on function public.current_app_user_has_any_permission(text[]) is
  'Compatibility wrapper for active permission checks. Resolves permissions through the current company context.';

comment on function public.current_app_user_has_all_permissions(text[]) is
  'Compatibility wrapper for active permission checks. Resolves permissions through the current company context.';

commit;
