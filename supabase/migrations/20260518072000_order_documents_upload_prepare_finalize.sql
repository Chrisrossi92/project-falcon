begin;

create or replace function public.order_document_sanitize_file_name(p_file_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select left(
    coalesce(
      nullif(
        regexp_replace(
          regexp_replace(btrim(coalesce(p_file_name, '')), '[\/\\]+', '-', 'g'),
          '[^A-Za-z0-9._ -]+',
          '-',
          'g'
        ),
        ''
      ),
      'document'
    ),
    180
  );
$$;

create or replace function public.current_app_user_can_upload_order_document_row(
  p_company_id uuid,
  p_order_id uuid,
  p_appraiser_id uuid,
  p_assigned_to uuid,
  p_reviewer_id uuid,
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
    and public.current_app_user_can_read_order(p_order_id)
    and public.current_app_user_can_update_order_row(
      p_company_id,
      p_appraiser_id,
      p_assigned_to,
      p_reviewer_id,
      p_status
    )
    and (
      public.current_app_user_has_permission('documents.upload.all')
      or (
        public.current_app_user_has_permission('documents.upload.assigned')
        and public.current_app_user_can_read_order_row(
          p_company_id,
          p_appraiser_id,
          p_assigned_to,
          p_reviewer_id,
          p_status
        )
      )
    );
$$;

grant execute on function public.order_document_sanitize_file_name(text) to authenticated;
grant execute on function public.current_app_user_can_upload_order_document_row(uuid, uuid, uuid, uuid, uuid, text) to authenticated;

create or replace function public.rpc_order_document_prepare_upload(
  p_order_id uuid,
  p_category text,
  p_file_name text,
  p_mime_type text default null,
  p_file_size bigint default null,
  p_visibility_scope text default 'internal',
  p_title text default null
)
returns table (
  id uuid,
  order_id uuid,
  company_id uuid,
  category text,
  title text,
  file_name text,
  mime_type text,
  file_size bigint,
  storage_bucket text,
  storage_path text,
  visibility_scope text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_app_user_id uuid := public.current_app_user_id();
  v_category text := lower(btrim(coalesce(p_category, '')));
  v_visibility_scope text := lower(btrim(coalesce(nullif(p_visibility_scope, ''), 'internal')));
  v_file_name text := public.order_document_sanitize_file_name(p_file_name);
  v_document_id uuid := gen_random_uuid();
  v_storage_bucket text := 'order-documents';
  v_storage_path text;
  v_row public.order_documents;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if v_app_user_id is null then
    raise exception 'current app user required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company required'
      using errcode = '42501';
  end if;

  if not (
    v_category = any (
    array[
      'engagement',
      'source_documents',
      'property_media',
      'review_revisions',
      'final_report',
      'internal_workfile'
    ]
    )
  ) then
    raise exception 'invalid document category'
      using errcode = '22023';
  end if;

  if not (v_visibility_scope = any (array['internal', 'assigned', 'audit'])) then
    raise exception 'invalid upload visibility scope'
      using errcode = '22023';
  end if;

  if p_file_name is null or btrim(p_file_name) = '' then
    raise exception 'file_name required'
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
   where o.id = p_order_id
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
    raise exception 'not authorized to prepare document upload for this order'
      using errcode = '42501';
  end if;

  v_storage_path := format(
    'company/%s/orders/%s/documents/%s/%s',
    coalesce(v_order.company_id, public.default_company_id()),
    v_order.id,
    v_document_id,
    v_file_name
  );

  insert into public.order_documents (
    id,
    company_id,
    order_id,
    uploaded_by_user_id,
    category,
    title,
    file_name,
    mime_type,
    file_size,
    storage_bucket,
    storage_path,
    visibility_scope,
    status
  )
  values (
    v_document_id,
    coalesce(v_order.company_id, public.default_company_id()),
    v_order.id,
    v_app_user_id,
    v_category,
    nullif(btrim(p_title), ''),
    v_file_name,
    nullif(btrim(p_mime_type), ''),
    p_file_size,
    v_storage_bucket,
    v_storage_path,
    v_visibility_scope,
    'pending'
  )
  returning * into v_row;

  return query
  select
    v_row.id,
    v_row.order_id,
    v_row.company_id,
    v_row.category,
    v_row.title,
    v_row.file_name,
    v_row.mime_type,
    v_row.file_size,
    v_row.storage_bucket,
    v_row.storage_path,
    v_row.visibility_scope,
    v_row.status,
    v_row.created_at,
    v_row.updated_at;
end;
$$;

grant execute on function public.rpc_order_document_prepare_upload(uuid, text, text, text, bigint, text, text) to authenticated;

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

comment on function public.order_document_sanitize_file_name(text) is
  'Sanitizes user-provided order document filenames for private storage object paths.';

comment on function public.current_app_user_can_upload_order_document_row(uuid, uuid, uuid, uuid, uuid, text) is
  'Checks current-company order upload authority using readable/updateable order scope plus document upload permissions.';

comment on function public.rpc_order_document_prepare_upload(uuid, text, text, text, bigint, text, text) is
  'Creates pending order document metadata and returns upload path instructions after current-company, order, and document upload authorization.';

comment on function public.rpc_order_document_finalize_upload(uuid, text, bigint) is
  'Finalizes a pending order document after authorization and storage object existence validation. Activity logging is intentionally deferred.';

commit;
