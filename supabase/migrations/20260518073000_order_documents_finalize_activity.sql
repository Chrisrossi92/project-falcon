begin;

create or replace function public.rpc_order_document_finalize_upload(
  p_document_id uuid,
  p_mime_type text default null,
  p_file_size bigint default null
)
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
security definer
set search_path = public, storage
as $$
declare
  v_document public.order_documents;
  v_order public.orders;
  v_row public.order_documents;
  v_app_user_id uuid := public.current_app_user_id();
  v_display_name text;
begin
  if p_document_id is null then
    raise exception 'document_id required';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company required'
      using errcode = '42501';
  end if;

  if v_app_user_id is null then
    raise exception 'current app user required'
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

  if v_document.status <> 'pending' then
    raise exception 'document upload is not pending'
      using errcode = '22023';
  end if;

  if p_file_size is not null and (p_file_size < 0 or p_file_size > 52428800) then
    raise exception 'invalid file_size'
      using errcode = '22023';
  end if;

  if p_mime_type is not null and length(btrim(p_mime_type)) > 255 then
    raise exception 'invalid mime_type'
      using errcode = '22023';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = v_document.order_id
   limit 1;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id()
     or not public.current_app_user_can_upload_order_document_row(
       v_order.company_id,
       v_order.id,
       v_order.appraiser_id,
       v_order.assigned_to,
       v_order.reviewer_id,
       v_order.status
     ) then
    raise exception 'not authorized to finalize document upload for this order'
      using errcode = '42501';
  end if;

  if v_document.uploaded_by_user_id <> v_app_user_id
     and not public.current_app_user_has_permission('documents.upload.all') then
    raise exception 'not authorized to finalize this document upload'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
      from storage.objects so
     where so.bucket_id = v_document.storage_bucket
       and so.name = v_document.storage_path
  ) then
    raise exception 'uploaded object not found'
      using errcode = '22023';
  end if;

  update public.order_documents od
     set status = 'active',
         mime_type = coalesce(nullif(btrim(p_mime_type), ''), od.mime_type),
         file_size = coalesce(p_file_size, od.file_size),
         updated_at = now()
   where od.id = v_document.id
   returning * into v_row;

  v_display_name := coalesce(nullif(v_row.title, ''), v_row.file_name, 'document');

  perform public.rpc_log_event(
    v_row.order_id,
    'order_document.uploaded',
    format('Uploaded %s', v_display_name),
    jsonb_build_object(
      'document_id', v_row.id,
      'actor_user_id', v_app_user_id,
      'category', v_row.category,
      'title', v_row.title,
      'file_name', v_row.file_name,
      'visibility_scope', v_row.visibility_scope
    )
  );

  return query
  select
    v_row.id,
    v_row.order_id,
    v_row.company_id,
    v_row.uploaded_by_user_id,
    v_row.category,
    v_row.title,
    v_row.file_name,
    v_row.mime_type,
    v_row.file_size,
    v_row.visibility_scope,
    v_row.status,
    v_row.created_at,
    v_row.updated_at;
end;
$$;

grant execute on function public.rpc_order_document_finalize_upload(uuid, text, bigint) to authenticated;

comment on function public.rpc_order_document_finalize_upload(uuid, text, bigint) is
  'Finalizes a pending order document after authorization and storage object existence validation, then writes an order_document.uploaded activity event without storage path or signed URL data.';

commit;
