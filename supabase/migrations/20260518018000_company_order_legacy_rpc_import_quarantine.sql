begin;

create or replace function public.rpc_order_create(p jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_order_create(jsonb) is deprecated and quarantined; use rpc_create_order(jsonb) or direct authorized orders writes'
    using errcode = '0A000';
end;
$$;

create or replace function public.rpc_order_update(p_order_id text, p_patch jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'rpc_order_update(text,jsonb) is deprecated and quarantined; use rpc_order_update(uuid,jsonb), rpc_update_order(uuid,jsonb), or direct authorized orders writes'
    using errcode = '0A000';
end;
$$;

revoke execute on function public.rpc_order_create(jsonb) from public;
revoke execute on function public.rpc_order_create(jsonb) from anon;
revoke execute on function public.rpc_order_create(jsonb) from authenticated;
grant execute on function public.rpc_order_create(jsonb) to service_role;

revoke execute on function public.rpc_order_update(text, jsonb) from public;
revoke execute on function public.rpc_order_update(text, jsonb) from anon;
revoke execute on function public.rpc_order_update(text, jsonb) from authenticated;
grant execute on function public.rpc_order_update(text, jsonb) to service_role;

revoke execute on function public.import_orders_from_json(jsonb) from public;
revoke execute on function public.import_orders_from_json(jsonb) from anon;
revoke execute on function public.import_orders_from_json(jsonb) from authenticated;
grant execute on function public.import_orders_from_json(jsonb) to service_role;

comment on function public.rpc_order_create(jsonb) is
  'Slice 7E3B quarantine. Deprecated legacy order create RPC used stale uuid client_id semantics; preserved only as a service_role-callable exception for compatibility discovery.';

comment on function public.rpc_order_update(text, jsonb) is
  'Slice 7E3B quarantine. Deprecated legacy order update RPC used stale uuid client_id semantics; preserved only as a service_role-callable exception for compatibility discovery.';

comment on function public.import_orders_from_json(jsonb) is
  'Slice 7E3B quarantine. Deprecated importer is unsafe for multi-company imports: SECURITY DEFINER, stale uuid client assumptions, global client lookup/create, and global external_order_no upsert. Service_role-only for operator-controlled backfill compatibility; scripts/backfill/import_orders.cjs is the only known repo caller. Rewrite before tenant onboarding.';

commit;
