begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'order-documents',
  'order-documents',
  false,
  52428800,
  null
)
on conflict (id) do update
  set name = excluded.name,
      public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.rpc_order_document_authorize_download(p_document_id uuid)
returns table (
  id uuid,
  order_id uuid,
  company_id uuid,
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
  v_document public.order_documents;
begin
  if p_document_id is null then
    raise exception 'document_id required';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company required'
      using errcode = '42501';
  end if;

  select *
    into v_document
    from public.order_documents od
   where od.id = p_document_id
   limit 1;

  if not found then
    raise exception 'document not found';
  end if;

  if v_document.status <> 'active'
     or not public.current_app_user_can_read_order_document_row(
       v_document.company_id,
       v_document.order_id,
       v_document.visibility_scope,
       v_document.status
     ) then
    raise exception 'not authorized to download this document'
      using errcode = '42501';
  end if;

  return query
  select
    v_document.id,
    v_document.order_id,
    v_document.company_id,
    v_document.category,
    v_document.title,
    v_document.file_name,
    v_document.mime_type,
    v_document.file_size,
    v_document.visibility_scope,
    v_document.status,
    v_document.created_at,
    v_document.updated_at;
end;
$$;

grant execute on function public.rpc_order_document_authorize_download(uuid) to authenticated;

comment on function public.rpc_order_document_authorize_download(uuid) is
  'Authorizes an order document download for the current caller and returns safe metadata only. Storage bucket/path remain backend-only for signed URL creation.';

commit;
