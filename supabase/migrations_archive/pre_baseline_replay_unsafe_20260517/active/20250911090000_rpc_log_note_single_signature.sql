-- Normalize rpc_log_note to a single canonical signature (order_id, message, context)
begin;

drop function if exists public.rpc_log_note(p_order_id uuid, p_message text);
drop function if exists public.rpc_log_note(uuid, text);

create or replace function public.rpc_log_note(
  p_order_id uuid,
  p_message text,
  p_context jsonb default '{}'::jsonb
) returns public.activity_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb := coalesce(p_context, '{}'::jsonb);
  v_row public.activity_log;
begin
  -- Reuse rpc_log_event for consistency (includes access checks + dedupe where relevant)
  select * into v_row from public.rpc_log_event(
    p_order_id => p_order_id,
    p_event_type => 'note_added',
    p_message => p_message,
    p_payload => v_payload
  );
  return v_row;
end;
$$;

revoke all on function public.rpc_log_note(uuid, text, jsonb) from public;
grant execute on function public.rpc_log_note(uuid, text, jsonb) to authenticated;

commit;
