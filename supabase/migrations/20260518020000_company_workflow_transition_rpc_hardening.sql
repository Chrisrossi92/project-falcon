begin;

create or replace function public.rpc_transition_order_status(
  p_order_id uuid,
  p_transition_key text,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_order public.orders;
  v_updated_order public.orders;
  v_allowed_from text[];
  v_target_status text;
  v_required_permission text;
  v_transition_key text;
  v_current_status text;
begin
  v_actor_user_id := public.current_app_user_id();

  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = 'P0001';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id() then
    raise exception 'order is not in the current company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order is not updateable by current user'
      using errcode = '42501';
  end if;

  v_transition_key := lower(trim(coalesce(p_transition_key, '')));
  v_current_status := lower(trim(coalesce(v_order.status, '')));

  case v_transition_key
    when 'submit_to_review' then
      v_allowed_from := array['new', 'in_progress', 'needs_revisions'];
      v_target_status := 'in_review';
      v_required_permission := case
        when v_current_status = 'needs_revisions' then 'workflow.status.resubmit'
        else 'workflow.status.submit_to_review'
      end;
    when 'request_revisions' then
      v_allowed_from := array['in_review'];
      v_target_status := 'needs_revisions';
      v_required_permission := 'workflow.status.request_revisions';
    when 'approve_review' then
      v_allowed_from := array['in_review'];
      v_target_status := 'review_cleared';
      v_required_permission := 'workflow.status.approve_review';
    when 'request_final_approval' then
      v_allowed_from := array['review_cleared'];
      v_target_status := 'pending_final_approval';
      v_required_permission := 'workflow.status.ready_for_client';
    when 'ready_for_client' then
      v_allowed_from := array['review_cleared', 'pending_final_approval'];
      v_target_status := 'ready_for_client';
      v_required_permission := 'workflow.status.ready_for_client';
    when 'complete' then
      v_allowed_from := array['ready_for_client'];
      v_target_status := 'completed';
      v_required_permission := 'workflow.status.complete';
    else
      raise exception 'invalid workflow transition: %', v_transition_key;
  end case;

  if not coalesce(v_current_status = any(v_allowed_from), false) then
    raise exception 'transition % is not allowed from status %', p_transition_key, v_order.status;
  end if;

  if not public.current_app_user_has_permission(v_required_permission) then
    raise exception 'missing required permission: %', v_required_permission;
  end if;

  update public.orders
     set status = v_target_status,
         updated_at = now()
   where id = p_order_id
   returning * into v_updated_order;

  -- Existing order update triggers currently log status_changed activity.
  -- The RPC should not also call rpc_log_status_change until activity logging is consolidated.

  return v_updated_order;
end;
$$;

comment on function public.rpc_transition_order_status(uuid, text, text) is
  'Slice 7F2 canonical workflow transition boundary. Preserves transition semantics while requiring current-company membership, readable order, updateable order, and current-company order ownership before mutation.';

commit;
