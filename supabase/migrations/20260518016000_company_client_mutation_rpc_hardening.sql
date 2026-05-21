begin;

create or replace function public.merge_clients(
  p_source_id bigint,
  p_target_id bigint,
  p_strategy jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_source public.clients%rowtype;
  v_target public.clients%rowtype;
  v_orders_client_count integer := 0;
  v_orders_managing_amc_count integer := 0;
  v_child_client_count integer := 0;
  v_drift_count integer := 0;
begin
  if not public.current_app_user_has_current_company() then
    raise exception 'Current company membership is required to merge clients';
  end if;

  if not public.current_app_user_has_permission('clients.update.all') then
    raise exception 'clients.update.all permission is required to merge clients';
  end if;

  if not public.current_app_user_has_permission('clients.archive') then
    raise exception 'clients.archive permission is required to merge clients';
  end if;

  if p_source_id is null or p_target_id is null then
    raise exception 'source and target client ids are required';
  end if;

  if p_source_id = p_target_id then
    raise exception 'source and target clients must be different';
  end if;

  select *
    into v_source
    from public.clients
   where id = p_source_id
   for update;

  if not found then
    raise exception 'source client not found';
  end if;

  select *
    into v_target
    from public.clients
   where id = p_target_id
   for update;

  if not found then
    raise exception 'target client not found';
  end if;

  if v_source.company_id is distinct from v_company_id then
    raise exception 'source client is not in the current company';
  end if;

  if v_target.company_id is distinct from v_company_id then
    raise exception 'target client is not in the current company';
  end if;

  if coalesce(v_source.is_merged, false) then
    raise exception 'source client is already merged';
  end if;

  if coalesce(v_target.is_merged, false) then
    raise exception 'target client is already merged';
  end if;

  if not public.current_app_user_can_read_client_row(v_source.company_id, v_source.id) then
    raise exception 'source client is not readable';
  end if;

  if not public.current_app_user_can_read_client_row(v_target.company_id, v_target.id) then
    raise exception 'target client is not readable';
  end if;

  select count(*)
    into v_drift_count
    from public.orders o
   where (o.client_id in (p_source_id, p_target_id)
       or o.managing_amc_id in (p_source_id, p_target_id))
     and o.company_id is distinct from v_company_id;

  if v_drift_count > 0 then
    raise exception 'cannot merge clients while linked orders exist outside the current company';
  end if;

  select count(*)
    into v_drift_count
    from public.clients c
   where c.amc_id in (p_source_id, p_target_id)
     and c.company_id is distinct from v_company_id;

  if v_drift_count > 0 then
    raise exception 'cannot merge clients while linked child clients exist outside the current company';
  end if;

  update public.orders
     set client_id = p_target_id,
         updated_at = now()
   where client_id = p_source_id
     and company_id = v_company_id;
  get diagnostics v_orders_client_count = row_count;

  update public.orders
     set managing_amc_id = p_target_id,
         updated_at = now()
   where managing_amc_id = p_source_id
     and company_id = v_company_id;
  get diagnostics v_orders_managing_amc_count = row_count;

  update public.clients
     set amc_id = p_target_id
   where amc_id = p_source_id
     and company_id = v_company_id;
  get diagnostics v_child_client_count = row_count;

  update public.clients
     set is_merged = true,
         merged_into_id = p_target_id,
         status = 'inactive'
   where id = p_source_id
     and company_id = v_company_id;

  return jsonb_build_object(
    'source_id', p_source_id,
    'target_id', p_target_id,
    'company_id', v_company_id,
    'orders_client_updated', v_orders_client_count,
    'orders_managing_amc_updated', v_orders_managing_amc_count,
    'child_clients_updated', v_child_client_count,
    'strategy', coalesce(p_strategy, '{}'::jsonb)
  );
end;
$$;

create or replace function public.rpc_client_create(p jsonb)
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.clients;
begin
  if not public.current_app_user_can_create_client() then
    raise exception 'clients.create permission is required to create clients';
  end if;

  insert into public.clients (name, contact_name, contact_email, status, phone, notes)
  values (
    nullif(trim((p->>'name')::text), ''),
    (p->>'contact_name')::text,
    (p->>'contact_email')::text,
    coalesce(nullif(trim((p->>'status')::text), ''), 'active'),
    (p->>'phone')::text,
    (p->>'notes')::text
  )
  returning * into r;

  return r;
end;
$$;

create or replace function public.rpc_client_update(p_client_id text, p_patch jsonb)
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.clients;
  v_client public.clients%rowtype;
begin
  select *
    into v_client
    from public.clients
   where id::text = p_client_id
   for update;

  if not found then
    raise exception 'Client not found';
  end if;

  if not public.current_app_user_can_update_client_row(v_client.company_id, v_client.id) then
    raise exception 'client update permission is required';
  end if;

  update public.clients
     set name          = coalesce(nullif(trim((p_patch->>'name')::text), ''), name),
         contact_name  = coalesce((p_patch->>'contact_name')::text, contact_name),
         contact_email = coalesce((p_patch->>'contact_email')::text, contact_email),
         status        = coalesce(nullif(trim((p_patch->>'status')::text), ''), status),
         phone         = coalesce((p_patch->>'phone')::text, phone),
         notes         = coalesce((p_patch->>'notes')::text, notes)
   where id = v_client.id
  returning * into r;

  return r;
end;
$$;

create or replace function public.rpc_client_delete(p_client_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
begin
  select *
    into v_client
    from public.clients
   where id::text = p_client_id
   for update;

  if not found then
    raise exception 'Client not found';
  end if;

  if not public.current_app_user_can_delete_client_row(v_client.company_id, v_client.id) then
    raise exception 'clients.delete permission is required to delete clients';
  end if;

  delete from public.clients where id = v_client.id;
  return true;
end;
$$;

create or replace function public.rpc_create_client(patch jsonb)
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.clients;
begin
  if not public.current_app_user_can_create_client() then
    raise exception 'clients.create permission is required to create clients';
  end if;

  insert into public.clients (name, status)
  values (
    nullif(patch->>'name', ''),
    coalesce(nullif(patch->>'status', ''), 'active')
  )
  returning * into r;

  return r;
end;
$$;

create or replace function public.rpc_update_client(client_id bigint, patch jsonb)
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.clients;
  v_client public.clients%rowtype;
begin
  select *
    into v_client
    from public.clients c
   where c.id = $1
   for update;

  if not found then
    raise exception 'Client not found';
  end if;

  if not public.current_app_user_can_update_client_row(v_client.company_id, v_client.id) then
    raise exception 'client update permission is required';
  end if;

  update public.clients c
     set name   = coalesce(nullif(patch->>'name', ''), c.name),
         status = coalesce(nullif(patch->>'status', ''), c.status)
   where c.id = v_client.id
  returning * into r;

  return r;
end;
$$;

create or replace function public.rpc_delete_client(client_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
begin
  select *
    into v_client
    from public.clients c
   where c.id = $1
   for update;

  if not found then
    raise exception 'Client not found';
  end if;

  if not public.current_app_user_can_delete_client_row(v_client.company_id, v_client.id) then
    raise exception 'clients.delete permission is required to delete clients';
  end if;

  delete from public.clients where id = v_client.id;
end;
$$;

revoke execute on function public.merge_clients(bigint, bigint, jsonb) from public;
revoke execute on function public.rpc_client_create(jsonb) from public;
revoke execute on function public.rpc_client_update(text, jsonb) from public;
revoke execute on function public.rpc_client_delete(text) from public;
revoke execute on function public.rpc_create_client(jsonb) from public;
revoke execute on function public.rpc_update_client(bigint, jsonb) from public;
revoke execute on function public.rpc_delete_client(bigint) from public;

revoke execute on function public.merge_clients(bigint, bigint, jsonb) from anon;
revoke execute on function public.rpc_client_create(jsonb) from anon;
revoke execute on function public.rpc_client_update(text, jsonb) from anon;
revoke execute on function public.rpc_client_delete(text) from anon;
revoke execute on function public.rpc_create_client(jsonb) from anon;
revoke execute on function public.rpc_update_client(bigint, jsonb) from anon;
revoke execute on function public.rpc_delete_client(bigint) from anon;

grant execute on function public.merge_clients(bigint, bigint, jsonb) to authenticated, service_role;
grant execute on function public.rpc_client_create(jsonb) to authenticated, service_role;
grant execute on function public.rpc_client_update(text, jsonb) to authenticated, service_role;
grant execute on function public.rpc_client_delete(text) to authenticated, service_role;
grant execute on function public.rpc_create_client(jsonb) to authenticated, service_role;
grant execute on function public.rpc_update_client(bigint, jsonb) to authenticated, service_role;
grant execute on function public.rpc_delete_client(bigint) to authenticated, service_role;

comment on function public.merge_clients(bigint, bigint, jsonb) is
  'Slice 7E2 company-aware client merge. Requires current-company membership, readable source/target clients, clients.update.all, clients.archive, and current-company-only linked reassignment.';

comment on function public.rpc_client_create(jsonb) is
  'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_create_client(). Prefer direct table writes for active frontend paths.';

comment on function public.rpc_client_update(text, jsonb) is
  'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_update_client_row(...). Prefer direct table writes for active frontend paths.';

comment on function public.rpc_client_delete(text) is
  'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_delete_client_row(...). Hard-delete semantics are unchanged.';

comment on function public.rpc_create_client(jsonb) is
  'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_create_client(). Prefer direct table writes for active frontend paths.';

comment on function public.rpc_update_client(bigint, jsonb) is
  'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_update_client_row(...). Prefer direct table writes for active frontend paths.';

comment on function public.rpc_delete_client(bigint) is
  'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_delete_client_row(...). Hard-delete semantics are unchanged.';

commit;
