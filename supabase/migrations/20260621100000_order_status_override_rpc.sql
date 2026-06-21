begin;

drop function if exists public.rpc_order_status_override(uuid, text, text);

create or replace function public.rpc_order_status_override(
  p_order_id uuid,
  p_target_status text,
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
  v_target_status text := lower(btrim(coalesce(p_target_status, '')));
  v_existing public.orders%rowtype;
  v_updated public.orders%rowtype;
  v_activity_id uuid := null;
  v_actor record;
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_legacy_profile_id uuid := null;
  v_detail jsonb;
  v_allowed_statuses text[] := array[
    'new',
    'in_progress',
    'in_review',
    'needs_revisions',
    'review_cleared',
    'pending_final_approval',
    'ready_for_client',
    'completed',
    'cancelled',
    'voided'
  ];
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
    raise exception 'status_override_reason_required'
      using errcode = '22023';
  end if;

  if length(v_reason) > 500 then
    raise exception 'status_override_reason_too_long'
      using errcode = '22023';
  end if;

  if v_target_status is null or v_target_status = '' or not (v_target_status = any(v_allowed_statuses)) then
    raise exception 'status_override_invalid_target'
      using errcode = '22023';
  end if;

  if v_target_status in ('cancelled', 'voided') then
    raise exception 'status_override_terminal_target_not_supported'
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

  if not public.current_app_user_can_update_order_row(
    v_existing.company_id,
    v_existing.appraiser_id,
    v_existing.assigned_to,
    v_existing.reviewer_id,
    v_existing.status
  ) then
    raise exception 'order_not_updateable'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('workflow.override_status') then
    raise exception 'order_status_override_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.is_archived, false) then
    raise exception 'archived_order_cannot_be_status_overridden'
      using errcode = '22023';
  end if;

  if lower(coalesce(v_existing.status, '')) in ('cancelled', 'voided') then
    raise exception 'status_override_terminal_reversal_not_supported'
      using errcode = '22023';
  end if;

  if lower(coalesce(v_existing.status, '')) = v_target_status then
    raise exception 'status_override_noop'
      using errcode = '22023';
  end if;

  update public.orders
     set status = v_target_status,
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
    'from_status', v_existing.status,
    'to_status', v_updated.status,
    'reason', v_reason,
    'source', 'rpc_order_status_override',
    'override', true
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
    'order.status_override',
    'Order status overridden',
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
    'status', 'updated',
    'order_id', v_updated.id,
    'company_id', v_company_id,
    'order_number', v_updated.order_number,
    'from_status', v_existing.status,
    'to_status', v_updated.status,
    'reason', v_reason,
    'activity_id', v_activity_id,
    'updated_at', v_updated.updated_at
  );
end;
$$;

revoke all privileges on function public.rpc_order_status_override(uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.rpc_order_status_override(uuid, text, text) to authenticated;

comment on function public.rpc_order_status_override(uuid, text, text) is
  'Admin/owner workflow-control status override RPC. Authenticated current-company callers require readable/updateable order scope and workflow.override_status. Requires a reason, rejects archived orders, no-op updates, terminal target status shortcuts, and cancelled/voided reversal, updates orders.status, preserves generic status_changed trigger behavior, and writes order.status_override activity with safe reason/from/to payload.';

commit;
