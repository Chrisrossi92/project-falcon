begin;

create or replace function public.rpc_update_order_status(order_id uuid, next_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_update_order_status(uuid,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_update_order_status_with_note(order_id uuid, next_status text, note text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_update_order_status_with_note(uuid,text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_order_set_status(p_order_id text, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_order_set_status(text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_order_set_status(p_order_id uuid, p_status text, p_note text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_order_set_status(uuid,text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_order_mark_complete(p_order_id text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_order_mark_complete(text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_order_ready_to_send(p_order_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_order_ready_to_send(text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_order_send_to_client(p_order_id text, p_payload jsonb default '{}'::jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_order_send_to_client(text,jsonb) is deprecated and quarantined; workflow send-to-client behavior must use a tenant-safe canonical path'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_review_approve(p_order_id text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_review_approve(text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_review_request_revisions(p_order_id text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_review_request_revisions(text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_review_start(p_order_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_review_start(text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_update_order_v1(
  p_order_id uuid,
  p_status text default null,
  p_appraiser_id uuid default null,
  p_site_visit timestamp with time zone default null,
  p_review_due timestamp with time zone default null,
  p_final_due timestamp with time zone default null,
  p_actor jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_update_order_v1(uuid,text,uuid,timestamptz,timestamptz,timestamptz,jsonb) is deprecated and quarantined; use tenant-safe order update and workflow RPCs'
    using errcode = '0A000';
end;
$$;

create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, falcon_mvp, auth, extensions
as $$
begin
  raise exception 'set_order_status(uuid,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;

revoke execute on function public.rpc_update_order_status(uuid, text) from public;
revoke execute on function public.rpc_update_order_status(uuid, text) from anon;
revoke execute on function public.rpc_update_order_status(uuid, text) from authenticated;
grant execute on function public.rpc_update_order_status(uuid, text) to service_role;

revoke execute on function public.rpc_update_order_status_with_note(uuid, text, text) from public;
revoke execute on function public.rpc_update_order_status_with_note(uuid, text, text) from anon;
revoke execute on function public.rpc_update_order_status_with_note(uuid, text, text) from authenticated;
grant execute on function public.rpc_update_order_status_with_note(uuid, text, text) to service_role;

revoke execute on function public.rpc_order_set_status(text, text) from public;
revoke execute on function public.rpc_order_set_status(text, text) from anon;
revoke execute on function public.rpc_order_set_status(text, text) from authenticated;
grant execute on function public.rpc_order_set_status(text, text) to service_role;

revoke execute on function public.rpc_order_set_status(uuid, text, text) from public;
revoke execute on function public.rpc_order_set_status(uuid, text, text) from anon;
revoke execute on function public.rpc_order_set_status(uuid, text, text) from authenticated;
grant execute on function public.rpc_order_set_status(uuid, text, text) to service_role;

revoke execute on function public.rpc_order_mark_complete(text, text) from public;
revoke execute on function public.rpc_order_mark_complete(text, text) from anon;
revoke execute on function public.rpc_order_mark_complete(text, text) from authenticated;
grant execute on function public.rpc_order_mark_complete(text, text) to service_role;

revoke execute on function public.rpc_order_ready_to_send(text) from public;
revoke execute on function public.rpc_order_ready_to_send(text) from anon;
revoke execute on function public.rpc_order_ready_to_send(text) from authenticated;
grant execute on function public.rpc_order_ready_to_send(text) to service_role;

revoke execute on function public.rpc_order_send_to_client(text, jsonb) from public;
revoke execute on function public.rpc_order_send_to_client(text, jsonb) from anon;
revoke execute on function public.rpc_order_send_to_client(text, jsonb) from authenticated;
grant execute on function public.rpc_order_send_to_client(text, jsonb) to service_role;

revoke execute on function public.rpc_review_approve(text, text) from public;
revoke execute on function public.rpc_review_approve(text, text) from anon;
revoke execute on function public.rpc_review_approve(text, text) from authenticated;
grant execute on function public.rpc_review_approve(text, text) to service_role;

revoke execute on function public.rpc_review_request_revisions(text, text) from public;
revoke execute on function public.rpc_review_request_revisions(text, text) from anon;
revoke execute on function public.rpc_review_request_revisions(text, text) from authenticated;
grant execute on function public.rpc_review_request_revisions(text, text) to service_role;

revoke execute on function public.rpc_review_start(text) from public;
revoke execute on function public.rpc_review_start(text) from anon;
revoke execute on function public.rpc_review_start(text) from authenticated;
grant execute on function public.rpc_review_start(text) to service_role;

revoke execute on function public.rpc_update_order_v1(uuid, text, uuid, timestamp with time zone, timestamp with time zone, timestamp with time zone, jsonb) from public;
revoke execute on function public.rpc_update_order_v1(uuid, text, uuid, timestamp with time zone, timestamp with time zone, timestamp with time zone, jsonb) from anon;
revoke execute on function public.rpc_update_order_v1(uuid, text, uuid, timestamp with time zone, timestamp with time zone, timestamp with time zone, jsonb) from authenticated;
grant execute on function public.rpc_update_order_v1(uuid, text, uuid, timestamp with time zone, timestamp with time zone, timestamp with time zone, jsonb) to service_role;

revoke execute on function public.set_order_status(uuid, text) from public;
revoke execute on function public.set_order_status(uuid, text) from anon;
revoke execute on function public.set_order_status(uuid, text) from authenticated;
grant execute on function public.set_order_status(uuid, text) to service_role;

comment on function public.rpc_update_order_status(uuid, text) is
  'Slice 7F3 quarantine. Deprecated arbitrary status mutation RPC; app roles must use rpc_transition_order_status(uuid,text,text).';

comment on function public.rpc_update_order_status_with_note(uuid, text, text) is
  'Slice 7F3 quarantine. Deprecated arbitrary status mutation RPC with duplicate activity behavior; app roles must use rpc_transition_order_status(uuid,text,text).';

comment on function public.rpc_order_set_status(text, text) is
  'Slice 7F3 quarantine. Deprecated text-id arbitrary status mutation RPC with stale lifecycle semantics; app roles must use rpc_transition_order_status(uuid,text,text).';

comment on function public.rpc_order_set_status(uuid, text, text) is
  'Slice 7F3 quarantine. Deprecated uuid arbitrary status mutation RPC; app roles must use rpc_transition_order_status(uuid,text,text).';

comment on function public.rpc_order_mark_complete(text, text) is
  'Slice 7F3 quarantine. Deprecated completion override workflow RPC; app roles must use rpc_transition_order_status(uuid,text,text).';

comment on function public.rpc_order_ready_to_send(text) is
  'Slice 7F3 quarantine. Deprecated ready-to-send workflow RPC with stale lifecycle semantics; app roles must use rpc_transition_order_status(uuid,text,text).';

comment on function public.rpc_order_send_to_client(text, jsonb) is
  'Slice 7F3 quarantine. Deprecated send-to-client workflow event RPC without tenant-safe lifecycle governance; rewrite before re-enabling.';

comment on function public.rpc_review_approve(text, text) is
  'Slice 7F3 quarantine. Deprecated review approval workflow RPC with stale ready_to_send semantics; app roles must use rpc_transition_order_status(uuid,text,text).';

comment on function public.rpc_review_request_revisions(text, text) is
  'Slice 7F3 quarantine. Deprecated review revisions workflow RPC with stale revisions semantics; app roles must use rpc_transition_order_status(uuid,text,text).';

comment on function public.rpc_review_start(text) is
  'Slice 7F3 quarantine. Deprecated review-start workflow RPC with reviewer-claim side effects; app roles must use rpc_transition_order_status(uuid,text,text).';

comment on function public.rpc_update_order_v1(uuid, text, uuid, timestamp with time zone, timestamp with time zone, timestamp with time zone, jsonb) is
  'Slice 7F3 quarantine. Deprecated mixed order mutation RPC that can change status, assignment, dates, activity, and notifications outside tenant-safe boundaries.';

comment on function public.set_order_status(uuid, text) is
  'Slice 7F3 quarantine. Deprecated falcon_mvp compatibility status mutation RPC; app roles must use rpc_transition_order_status(uuid,text,text).';

commit;
