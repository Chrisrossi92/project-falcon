-- Email outbox worker support (locking + RPCs for claiming/sending/failing)
begin;

-- Columns for worker locking + attempts
alter table public.email_outbox
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid,
  add column if not exists attempts int not null default 0;

-- Policies to allow service role/admin to operate
drop policy if exists email_outbox_select_service on public.email_outbox;
create policy email_outbox_select_service on public.email_outbox
  for select using (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('service_role','admin')
  );

drop policy if exists email_outbox_update_service on public.email_outbox;
create policy email_outbox_update_service on public.email_outbox
  for update using (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('service_role','admin')
  ) with check (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('service_role','admin')
  );

-- Helper to identify caller (service/admin)
create or replace function public._ensure_worker_role()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := (current_setting('request.jwt.claims', true)::jsonb ->> 'role');
  v_uid uuid := nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), '')::uuid;
begin
  if v_role not in ('service_role','admin') then
    raise exception 'not authorized to process email outbox';
  end if;
  return v_uid;
end;
$$;

-- Claim queued rows (skip locked)
drop function if exists public.rpc_claim_email_outbox(int);
create or replace function public.rpc_claim_email_outbox(p_limit int default 25)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._ensure_worker_role();
begin
  return query
    with c as (
      select id
        from public.email_outbox
       where status = 'queued'
         and (locked_at is null or locked_at < now() - interval '5 minutes')
       order by created_at asc
       limit coalesce(p_limit, 25)
       for update skip locked
    )
    update public.email_outbox e
       set locked_at = now(),
           locked_by = v_uid,
           status    = 'sending'
      from c
     where e.id = c.id
     returning e.*;
end;
$$;
grant execute on function public.rpc_claim_email_outbox(int) to service_role, authenticated;

-- Mark sent
drop function if exists public.rpc_mark_email_outbox_sent(uuid);
create or replace function public.rpc_mark_email_outbox_sent(p_id uuid)
returns public.email_outbox
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._ensure_worker_role();
  v_row public.email_outbox;
begin
  update public.email_outbox
     set status    = 'sent',
         sent_at   = now(),
         locked_at = null,
         locked_by = null,
         error     = null
   where id = p_id
   returning * into v_row;
  return v_row;
end;
$$;
grant execute on function public.rpc_mark_email_outbox_sent(uuid) to service_role, authenticated;

-- Mark failed
drop function if exists public.rpc_mark_email_outbox_failed(uuid, text);
create or replace function public.rpc_mark_email_outbox_failed(p_id uuid, p_error text)
returns public.email_outbox
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._ensure_worker_role();
  v_row public.email_outbox;
begin
  update public.email_outbox
     set status    = 'failed',
         attempts  = coalesce(attempts,0) + 1,
         error     = left(p_error, 1000),
         locked_at = null,
         locked_by = null
   where id = p_id
   returning * into v_row;
  return v_row;
end;
$$;
grant execute on function public.rpc_mark_email_outbox_failed(uuid, text) to service_role, authenticated;

commit;
