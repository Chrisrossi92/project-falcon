begin;

alter table public.orders
  drop constraint if exists orders_status_valid;

alter table public.orders
  add constraint orders_status_valid
  check (
    status is null
    or status = any (array[
      'new'::text,
      'in_progress'::text,
      'in_review'::text,
      'needs_revisions'::text,
      'review_cleared'::text,
      'pending_final_approval'::text,
      'ready_for_client'::text,
      'completed'::text,
      'cancelled'::text,
      'voided'::text
    ])
  );

drop function if exists public.rpc_order_cancel(uuid, text);
drop function if exists public.rpc_order_void(uuid, text);

create or replace function public.rpc_order_cancel(
  p_order_id uuid,
  p_reason text
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

  if v_reason is null then
    raise exception 'cancel_reason_required'
      using errcode = '22023';
  end if;

  if length(v_reason) > 500 then
    raise exception 'cancel_reason_too_long'
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

  if not public.current_app_user_has_permission('orders.cancel') then
    raise exception 'order_cancel_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.is_archived, false) then
    raise exception 'archived_order_cannot_be_cancelled'
      using errcode = '22023';
  end if;

  update public.orders
     set status = 'cancelled',
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

  v_detail := jsonb_build_object(
    'order_id', p_order_id,
    'reason', v_reason
  );

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
    'order.cancelled',
    'Order cancelled',
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
    'status', 'cancelled',
    'order_id', v_updated.id,
    'company_id', v_company_id,
    'order_number', v_updated.order_number,
    'order_status', v_updated.status,
    'is_archived', coalesce(v_updated.is_archived, false),
    'updated_at', v_updated.updated_at,
    'activity_id', v_activity_id
  );
end;
$$;

create or replace function public.rpc_order_void(
  p_order_id uuid,
  p_reason text
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

  if v_reason is null then
    raise exception 'void_reason_required'
      using errcode = '22023';
  end if;

  if length(v_reason) > 500 then
    raise exception 'void_reason_too_long'
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

  if not public.current_app_user_has_permission('orders.void') then
    raise exception 'order_void_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.is_archived, false) then
    raise exception 'archived_order_cannot_be_voided'
      using errcode = '22023';
  end if;

  update public.orders
     set status = 'voided',
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

  v_detail := jsonb_build_object(
    'order_id', p_order_id,
    'reason', v_reason
  );

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
    'order.voided',
    'Order voided',
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
    'status', 'voided',
    'order_id', v_updated.id,
    'company_id', v_company_id,
    'order_number', v_updated.order_number,
    'order_status', v_updated.status,
    'is_archived', coalesce(v_updated.is_archived, false),
    'updated_at', v_updated.updated_at,
    'activity_id', v_activity_id
  );
end;
$$;

revoke all privileges on function public.rpc_order_cancel(uuid, text) from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_order_void(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.rpc_order_cancel(uuid, text) to authenticated;
grant execute on function public.rpc_order_void(uuid, text) to authenticated;

comment on function public.rpc_order_cancel(uuid, text) is
  'CRUD Stabilization Sprint 2O guarded order cancel RPC. Authenticated current-company callers require readable order scope and orders.cancel. Requires a reason, rejects archived orders, sets status=cancelled/updated_at, and writes order.cancelled activity with safe payload.';

comment on function public.rpc_order_void(uuid, text) is
  'CRUD Stabilization Sprint 2O guarded order void RPC. Authenticated current-company callers require readable order scope and orders.void. Requires a reason, rejects archived orders, sets status=voided/updated_at, and writes order.voided activity with safe payload.';

commit;
