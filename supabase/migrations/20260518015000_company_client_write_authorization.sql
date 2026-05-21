begin;

create or replace function public.current_app_user_can_create_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and public.current_app_user_has_permission('clients.create');
$$;

grant execute on function public.current_app_user_can_create_client() to authenticated;

create or replace function public.current_app_user_can_update_client_row(
  p_company_id uuid,
  p_client_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
    and (
      public.current_app_user_has_permission('clients.update.all')
      or (
        public.current_app_user_has_permission('clients.update.assigned')
        and exists (
          select 1
          from public.orders o
          where (o.client_id = p_client_id or o.managing_amc_id = p_client_id)
            and public.current_app_user_can_read_order(o.id)
        )
      )
    );
$$;

grant execute on function public.current_app_user_can_update_client_row(uuid, bigint) to authenticated;

create or replace function public.current_app_user_can_delete_client_row(
  p_company_id uuid,
  p_client_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
    and public.current_app_user_has_permission('clients.delete');
$$;

grant execute on function public.current_app_user_can_delete_client_row(uuid, bigint) to authenticated;

create or replace function public.tg_clients_preserve_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    -- Company ownership is backend-owned. Ignore frontend-sent company_id.
    NEW.company_id := public.current_company_id();
  elsif TG_OP = 'UPDATE' then
    -- Client ownership is immutable in compatibility mode.
    NEW.company_id := coalesce(OLD.company_id, public.default_company_id());
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_clients_preserve_company_id on public.clients;
create trigger trg_clients_preserve_company_id
before insert or update on public.clients
for each row execute function public.tg_clients_preserve_company_id();

drop policy if exists "Allow insert for all" on public.clients;
drop policy if exists "Allow update for all users" on public.clients;
drop policy if exists "Allow delete for all" on public.clients;
drop policy if exists "clients_admin_insert" on public.clients;
drop policy if exists "clients_admin_update" on public.clients;
drop policy if exists "clients_admin_delete" on public.clients;
drop policy if exists "clients_owner_admin_insert" on public.clients;
drop policy if exists "clients_owner_admin_update" on public.clients;
drop policy if exists "clients_owner_admin_delete" on public.clients;
drop policy if exists "clients_write_admin_insert" on public.clients;
drop policy if exists "clients_write_admin_update" on public.clients;
drop policy if exists "clients_write_admin_delete" on public.clients;

create policy "clients_insert_company_authorized"
on public.clients
for insert
to authenticated
with check (
  public.current_app_user_can_create_client()
  and coalesce(company_id, public.current_company_id()) = public.current_company_id()
);

create policy "clients_update_company_authorized"
on public.clients
for update
to authenticated
using (
  public.current_app_user_can_update_client_row(company_id, id)
)
with check (
  public.current_app_user_can_update_client_row(company_id, id)
);

create policy "clients_delete_company_authorized"
on public.clients
for delete
to authenticated
using (
  public.current_app_user_can_delete_client_row(company_id, id)
);

comment on function public.current_app_user_can_create_client() is
  'Slice 7E1 client create predicate. Requires current-company membership and clients.create.';

comment on function public.current_app_user_can_update_client_row(uuid, bigint) is
  'Slice 7E1 client update predicate. Requires current-company membership, client company match, and clients.update.all or clients.update.assigned through a readable source order.';

comment on function public.current_app_user_can_delete_client_row(uuid, bigint) is
  'Slice 7E1 client delete predicate. Requires current-company membership, client company match, and clients.delete. Hard-delete semantics are preserved; archive behavior is deferred.';

comment on function public.tg_clients_preserve_company_id() is
  'Keeps client company scope backend-owned. Inserts resolve to current_company_id(); updates preserve existing company ownership.';

commit;
