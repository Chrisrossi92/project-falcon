begin;

create or replace function public.rpc_transition_order_status(
  p_order_id uuid,
  p_transition_key text,
  p_note text default null
) returns public.orders
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

  perform public.rpc_log_status_change(p_order_id, v_order.status, v_target_status, p_note);

  return v_updated_order;
end;
$$;

grant execute on function public.rpc_transition_order_status(uuid, text, text) to authenticated;

commit;
