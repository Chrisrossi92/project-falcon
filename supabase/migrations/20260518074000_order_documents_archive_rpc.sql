begin;

create or replace function public.rpc_order_document_archive(
  p_document_id uuid,
  p_reason text default null
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
set search_path = public
as $$
declare
  v_document public.order_documents;
  v_order public.orders;
  v_row public.order_documents;
  v_app_user_id uuid := public.current_app_user_id();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_display_name text;
  v_detail jsonb;
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

  if v_reason is not null and length(v_reason) > 1000 then
    raise exception 'archive reason is too long'
      using errcode = '22023';
  end if;

  select *
    into v_document
    from public.order_documents od
   where od.id = p_document_id
   limit 1;

  if not found then
    raise exception 'document not found';
  end if;

  if v_document.status not in ('active', 'pending') then
    raise exception 'document cannot be archived from current status'
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
     or v_document.company_id <> public.current_company_id()
     or not public.current_app_user_can_read_order(v_order.id)
     or not public.current_app_user_has_permission('documents.delete') then
    raise exception 'not authorized to archive this document'
      using errcode = '42501';
  end if;

  update public.order_documents od
     set status = 'archived',
         updated_at = now()
   where od.id = v_document.id
     and od.status in ('active', 'pending')
   returning * into v_row;

  if not found then
    raise exception 'document cannot be archived from current status'
      using errcode = '22023';
  end if;

  v_display_name := coalesce(nullif(v_row.title, ''), v_row.file_name, 'document');

  v_detail := jsonb_build_object(
    'document_id', v_row.id,
    'actor_user_id', v_app_user_id,
    'category', v_row.category,
    'title', v_row.title,
    'file_name', v_row.file_name,
    'visibility_scope', v_row.visibility_scope
  );

  if v_reason is not null then
    v_detail := v_detail || jsonb_build_object('reason', v_reason);
  end if;

  perform public.rpc_log_event(
    v_row.order_id,
    'order_document.archived',
    format('Archived %s', v_display_name),
    v_detail
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

grant execute on function public.rpc_order_document_archive(uuid, text) to authenticated;

comment on function public.rpc_order_document_archive(uuid, text) is
  'Soft-archives an active or pending order document after current-company, readable-order, and documents.delete authorization, then writes an order_document.archived activity event without storage path, bucket, or signed URL data.';

commit;
