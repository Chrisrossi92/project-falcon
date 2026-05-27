begin;

create or replace function public.rpc_company_member_access_save(
  p_user_id uuid,
  p_role_ids uuid[],
  p_primary_role_id uuid default null,
  p_overrides jsonb default '[]'::jsonb,
  p_save_permission_overrides boolean default true,
  p_reason text default null,
  p_request_id text default null
)
returns table (
  user_id uuid,
  membership_id uuid,
  role_changed boolean,
  permission_overrides_changed boolean,
  active_owner_count integer,
  role_assignments jsonb,
  permission_overrides jsonb
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_role_result record;
  v_override_result record;
  v_permission_overrides_changed boolean := false;
  v_permission_overrides jsonb := '[]'::jsonb;
begin
  select *
    into v_role_result
    from public.rpc_company_member_role_update(
      p_user_id,
      p_role_ids,
      p_primary_role_id,
      p_reason,
      p_request_id
    );

  if p_save_permission_overrides then
    select *
      into v_override_result
      from public.rpc_company_member_permission_overrides_save(
        p_user_id,
        coalesce(p_overrides, '[]'::jsonb),
        p_reason,
        case
          when nullif(p_request_id, '') is null then null
          else p_request_id || ':permission-overrides'
        end
      );
    v_permission_overrides_changed := coalesce(v_override_result.changed, false);
    v_permission_overrides := coalesce(v_override_result.overrides, '[]'::jsonb);
  else
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'permission_key', cmpo.permission_key,
          'effect', cmpo.effect
        )
        order by cmpo.permission_key
      ),
      '[]'::jsonb
    )
      into v_permission_overrides
      from public.company_member_permission_overrides cmpo
     where cmpo.membership_id = v_role_result.membership_id
       and cmpo.user_id = p_user_id;
  end if;

  user_id := p_user_id;
  membership_id := v_role_result.membership_id;
  role_changed := coalesce(v_role_result.changed, false);
  permission_overrides_changed := v_permission_overrides_changed;
  active_owner_count := v_role_result.active_owner_count;
  role_assignments := coalesce(v_role_result.role_assignments, '[]'::jsonb);
  permission_overrides := coalesce(v_permission_overrides, '[]'::jsonb);
  return next;
end;
$$;

revoke all privileges on function public.rpc_company_member_access_save(uuid, uuid[], uuid, jsonb, boolean, text, text)
  from public, anon;
grant execute on function public.rpc_company_member_access_save(uuid, uuid[], uuid, jsonb, boolean, text, text)
  to authenticated, service_role;

comment on function public.rpc_company_member_access_save(uuid, uuid[], uuid, jsonb, boolean, text, text) is
  'Atomically saves one current-company member access edit by wrapping role preset persistence and explicit V1-safe permission override persistence in one transaction. Existing role and override RPC validation and audit behavior are preserved.';

commit;
