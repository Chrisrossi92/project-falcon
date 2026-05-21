begin;

create table if not exists public.order_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  uploaded_by_user_id uuid not null references public.users(id),
  category text not null,
  title text,
  file_name text not null,
  mime_type text,
  file_size bigint,
  storage_bucket text not null default 'order-documents',
  storage_path text not null,
  visibility_scope text not null default 'internal',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_documents_category_check check (
    category = any (
      array[
        'engagement',
        'source_documents',
        'property_media',
        'review_revisions',
        'final_report',
        'internal_workfile'
      ]
    )
  ),
  constraint order_documents_visibility_scope_check check (
    visibility_scope = any (array['internal', 'assigned', 'client', 'vendor', 'audit'])
  ),
  constraint order_documents_status_check check (
    status = any (array['pending', 'active', 'archived', 'deleted'])
  ),
  constraint order_documents_file_size_check check (
    file_size is null or file_size >= 0
  ),
  constraint order_documents_storage_path_not_blank check (
    length(btrim(storage_path)) > 0
  ),
  constraint order_documents_file_name_not_blank check (
    length(btrim(file_name)) > 0
  )
);

create index if not exists idx_order_documents_company_order_status_created
  on public.order_documents (company_id, order_id, status, created_at desc);

create index if not exists idx_order_documents_order_category_created
  on public.order_documents (order_id, category, created_at desc);

create index if not exists idx_order_documents_company_visibility_status
  on public.order_documents (company_id, visibility_scope, status);

create index if not exists idx_order_documents_uploaded_by_created
  on public.order_documents (uploaded_by_user_id, created_at desc);

create unique index if not exists idx_order_documents_storage_object_unique
  on public.order_documents (storage_bucket, storage_path);

alter table public.order_documents enable row level security;

revoke all on table public.order_documents from public, anon, authenticated;

create or replace function public.current_app_user_can_read_order_document_row(
  p_company_id uuid,
  p_order_id uuid,
  p_visibility_scope text,
  p_status text
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
    and coalesce(p_status, '') <> 'deleted'
    and public.current_app_user_can_read_order(p_order_id)
    and (
      public.current_app_user_has_permission('documents.read.all')
      or (
        public.current_app_user_has_permission('documents.read.assigned')
        and coalesce(p_visibility_scope, 'internal') = any (array['internal', 'assigned', 'audit'])
      )
    );
$$;

grant execute on function public.current_app_user_can_read_order_document_row(uuid, uuid, text, text) to authenticated;

drop policy if exists "order_documents_select_company_order_permission" on public.order_documents;
create policy "order_documents_select_company_order_permission"
on public.order_documents
for select
to authenticated
using (
  public.current_app_user_can_read_order_document_row(
    company_id,
    order_id,
    visibility_scope,
    status
  )
);

drop policy if exists "order_documents_insert_denied" on public.order_documents;
create policy "order_documents_insert_denied"
on public.order_documents
for insert
to authenticated
with check (false);

drop policy if exists "order_documents_update_denied" on public.order_documents;
create policy "order_documents_update_denied"
on public.order_documents
for update
to authenticated
using (false)
with check (false);

drop policy if exists "order_documents_delete_denied" on public.order_documents;
create policy "order_documents_delete_denied"
on public.order_documents
for delete
to authenticated
using (false);

create or replace function public.rpc_order_documents_list(p_order_id uuid)
returns table (
  id uuid,
  order_id uuid,
  company_id uuid,
  uploaded_by_user_id uuid,
  category text,
  title text,
  file_name text,
  mime_type text,
  file_size bigint,
  visibility_scope text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company required'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = p_order_id
   limit 1;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id()
     or not public.current_app_user_can_read_order(p_order_id)
     or not (
       public.current_app_user_has_permission('documents.read.all')
       or public.current_app_user_has_permission('documents.read.assigned')
     ) then
    raise exception 'not authorized to list documents for this order'
      using errcode = '42501';
  end if;

  return query
  select
    od.id,
    od.order_id,
    od.company_id,
    od.uploaded_by_user_id,
    od.category,
    od.title,
    od.file_name,
    od.mime_type,
    od.file_size,
    od.visibility_scope,
    od.status,
    od.created_at,
    od.updated_at
  from public.order_documents od
  where od.order_id = p_order_id
    and public.current_app_user_can_read_order_document_row(
      od.company_id,
      od.order_id,
      od.visibility_scope,
      od.status
    )
  order by od.created_at desc, od.id desc;
end;
$$;

grant execute on function public.rpc_order_documents_list(uuid) to authenticated;

comment on table public.order_documents is
  'Order-level document metadata. Storage paths are operational metadata only and are not authorization tokens.';

comment on function public.current_app_user_can_read_order_document_row(uuid, uuid, text, text) is
  'Checks current company, readable order scope, non-deleted status, and document read permission for order document metadata.';

comment on function public.rpc_order_documents_list(uuid) is
  'Lists safe order document metadata for a readable current-company order. Does not expose raw storage bucket/path or signed URLs.';

commit;
