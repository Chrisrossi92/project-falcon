begin;

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
  v_owner_can_read_vendor_report boolean := false;
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

  v_owner_can_read_vendor_report := (
    v_document.status = 'active'
    and v_document.visibility_scope = 'vendor'
    and v_document.category = 'final_report'
    and coalesce(v_document.company_id, public.default_company_id()) = public.current_company_id()
    and public.current_app_user_can_read_order(v_document.order_id)
    and (
      public.current_app_user_has_permission('documents.read.all')
      or public.current_app_user_has_permission('documents.read.assigned')
    )
    and exists (
      select 1
        from public.orders o
        join public.order_company_assignments oca
          on oca.order_id = o.id
         and oca.owner_company_id = coalesce(o.company_id, public.default_company_id())
         and oca.assignment_type = 'vendor_appraisal'
         and oca.status in ('accepted', 'in_progress', 'submitted', 'revision_requested', 'completed')
       where o.id = v_document.order_id
         and coalesce(o.company_id, public.default_company_id()) = public.current_company_id()
         and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
    )
  );

  if v_document.status <> 'active'
     or not (
       public.current_app_user_can_read_order_document_row(
         v_document.company_id,
         v_document.order_id,
         v_document.visibility_scope,
         v_document.status
       )
       or v_owner_can_read_vendor_report
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
    and (
      public.current_app_user_can_read_order_document_row(
        od.company_id,
        od.order_id,
        od.visibility_scope,
        od.status
      )
      or (
        od.status = 'active'
        and od.visibility_scope = 'vendor'
        and od.category = 'final_report'
        and coalesce(od.company_id, public.default_company_id()) = public.current_company_id()
        and coalesce(v_order.operations_scope, 'internal_operations') = 'amc_operations'
        and exists (
          select 1
            from public.order_company_assignments oca
           where oca.order_id = od.order_id
             and oca.owner_company_id = public.current_company_id()
             and oca.assignment_type = 'vendor_appraisal'
             and oca.status in ('accepted', 'in_progress', 'submitted', 'revision_requested', 'completed')
        )
      )
    )
  order by od.created_at desc, od.id desc;
end;
$$;

grant execute on function public.rpc_order_document_authorize_download(uuid) to authenticated;
grant execute on function public.rpc_order_documents_list(uuid) to authenticated;

comment on function public.rpc_order_document_authorize_download(uuid) is
  'Authorizes an order document download for the current caller and returns safe metadata only. AMC owner-company coordinators with document read access may download active vendor-visible final_report submissions tied to vendor_appraisal assignments; storage bucket/path remain backend-only for signed URL creation.';

comment on function public.rpc_order_documents_list(uuid) is
  'Lists safe order document metadata for a readable current-company order, including active AMC vendor final_report submissions for owner-company users with document read access. Does not expose raw storage bucket/path or signed URLs.';

commit;
