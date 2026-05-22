begin;

drop function if exists public.rpc_order_archive(uuid);

create or replace function public.rpc_order_archive(
  p_order_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_existing public.orders%rowtype;
  v_updated public.orders%rowtype;
  v_activity_id uuid := null;
  v_actor record;
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_legacy_profile_id uuid := null;
  v_detail jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if p_order_id is null then
    raise exception 'order_id_required'
      using errcode = '22023';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if v_reason is not null and length(v_reason) > 500 then
    raise exception 'archive_reason_too_long'
      using errcode = '22023';
  end if;

  select *
    into v_existing
    from public.orders o
   where o.id = p_order_id
   for update;

  if not found then
    raise exception 'order_not_found'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order_not_in_current_company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order_not_readable'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('orders.archive') then
    raise exception 'order_archive_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.is_archived, false) then
    return jsonb_build_object(
      'status', 'already_archived',
      'order_id', v_existing.id,
      'company_id', v_company_id,
      'order_number', v_existing.order_number,
      'order_status', v_existing.status,
      'is_archived', true,
      'updated_at', v_existing.updated_at,
      'activity_id', null
    );
  end if;

  update public.orders
     set is_archived = true,
         updated_at = now()
   where id = p_order_id
     and coalesce(company_id, public.default_company_id()) = v_company_id
  returning * into v_updated;

  select * into v_actor from public._activity_actor();
  select p.id
    into v_legacy_profile_id
    from public.profiles_legacy p
   where p.id = v_auth_uid
   limit 1;

  v_detail := jsonb_strip_nulls(jsonb_build_object(
    'order_id', p_order_id,
    'reason', v_reason
  ));

  insert into public.activity_log (
    order_id,
    company_id,
    event_type,
    message,
    detail,
    actor_user_id,
    actor_id,
    created_by,
    created_by_name,
    created_by_email,
    created_at
  )
  values (
    p_order_id,
    v_company_id,
    'order.archived',
    'Order archived',
    v_detail,
    v_app_uid,
    v_auth_uid,
    v_legacy_profile_id,
    v_actor.full_name,
    v_actor.email,
    now()
  )
  returning id into v_activity_id;

  return jsonb_build_object(
    'status', 'archived',
    'order_id', v_updated.id,
    'company_id', v_company_id,
    'order_number', v_updated.order_number,
    'order_status', v_updated.status,
    'is_archived', v_updated.is_archived,
    'updated_at', v_updated.updated_at,
    'activity_id', v_activity_id
  );
end;
$$;

revoke all privileges on function public.rpc_order_archive(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.rpc_order_archive(uuid, text) to authenticated;

comment on function public.rpc_order_archive(uuid, text) is
  'CRUD Stabilization Sprint 2B guarded order archive RPC. Authenticated current-company callers require readable order scope and orders.archive. Updates only is_archived/updated_at and writes order.archived activity with safe payload.';

commit;
