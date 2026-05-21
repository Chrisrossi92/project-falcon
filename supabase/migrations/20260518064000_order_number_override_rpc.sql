begin;

create or replace function public.rpc_order_number_override(
  p_order_id uuid,
  p_order_number text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_order_number text := btrim(coalesce(p_order_number, ''));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_existing public.orders%rowtype;
  v_updated public.orders%rowtype;
  v_conflicting_order_id uuid := null;
  v_activity_id uuid := null;
  v_actor record;
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_message text;
begin
  if p_order_id is null then
    raise exception 'order_id_required'
      using errcode = '22023';
  end if;

  if auth.role() <> 'service_role'
     and v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if auth.role() <> 'service_role'
     and not public.current_app_user_has_current_company() then
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

  if auth.role() <> 'service_role'
     and not public.current_app_user_has_permission('orders.update.all') then
    raise exception 'order_number_override_not_authorized'
      using errcode = '42501';
  end if;

  if v_order_number = '' then
    raise exception 'order_number_required'
      using errcode = '22023';
  end if;

  if length(v_order_number) > 80 then
    raise exception 'order_number_too_long'
      using errcode = '22023';
  end if;

  if v_order_number !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$' then
    raise exception 'order_number_invalid_format'
      using errcode = '22023';
  end if;

  if coalesce(v_existing.order_number, '') = v_order_number then
    return jsonb_build_object(
      'status', 'unchanged',
      'order_id', p_order_id,
      'company_id', v_company_id,
      'old_order_number', v_existing.order_number,
      'new_order_number', v_order_number,
      'activity_id', null,
      'reason_required', false,
      'reason', v_reason,
      'warnings', jsonb_build_array(
        jsonb_build_object(
          'code', 'global_uniqueness_still_enforced',
          'message', 'Global order-number uniqueness remains active during migration.'
        )
      )
    );
  end if;

  select o.id
    into v_conflicting_order_id
    from public.orders o
   where coalesce(o.company_id, public.default_company_id()) = v_company_id
     and coalesce(o.order_number, '') = v_order_number
     and o.id <> p_order_id
   order by o.created_at asc nulls last, o.id asc
   limit 1;

  if v_conflicting_order_id is not null then
    raise exception 'order_number_unavailable'
      using errcode = '23505';
  end if;

  begin
    update public.orders
       set order_number = v_order_number,
           updated_at = now()
     where id = p_order_id
       and coalesce(company_id, public.default_company_id()) = v_company_id
    returning * into v_updated;
  exception
    when unique_violation then
      raise exception 'order_number_globally_reserved_during_transition'
        using errcode = '23505';
  end;

  select * into v_actor from public._activity_actor();
  v_message := format(
    'Order number changed from %s to %s',
    coalesce(v_existing.order_number, '(none)'),
    v_order_number
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
    'order_number.manual_override',
    v_message,
    jsonb_build_object(
      'old_order_number', v_existing.order_number,
      'new_order_number', v_order_number,
      'reason', v_reason,
      'source', 'rpc_order_number_override',
      'scope', 'company'
    ),
    v_app_uid,
    v_auth_uid,
    v_auth_uid,
    v_actor.full_name,
    v_actor.email,
    now()
  )
  returning id into v_activity_id;

  return jsonb_build_object(
    'status', 'updated',
    'order_id', p_order_id,
    'company_id', v_company_id,
    'old_order_number', v_existing.order_number,
    'new_order_number', v_updated.order_number,
    'activity_id', v_activity_id,
    'reason_required', false,
    'reason', v_reason,
    'warnings', jsonb_build_array(
      jsonb_build_object(
        'code', 'global_uniqueness_still_enforced',
        'message', 'Global order-number uniqueness remains active during migration.'
      )
    )
  );
end;
$$;

revoke all privileges on function public.rpc_order_number_override(uuid, text, text) from public, anon;
grant execute on function public.rpc_order_number_override(uuid, text, text) to authenticated, service_role;

comment on function public.rpc_order_number_override(uuid, text, text) is
  'Phase 10E8E explicit order-number override RPC. Authenticated callers require active current-company context and orders.update.all; service_role is allowed. Updates only orders.order_number, validates company-scoped availability, writes activity_log, and does not change generic order update behavior.';

commit;
