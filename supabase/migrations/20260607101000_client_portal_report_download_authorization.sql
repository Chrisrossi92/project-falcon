begin;

create or replace function public.rpc_client_portal_report_authorize_download(p_order_key text)
returns table (
  document_id uuid,
  order_key text,
  order_number text,
  file_name text,
  mime_type text,
  file_size bigint,
  report_ready_at timestamptz,
  report_delivered_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_order_key text := btrim(coalesce(p_order_key, ''));
begin
  if v_order_key = '' then
    raise exception 'client_portal_order_key_required'
      using errcode = '22023';
  end if;

  if not public.current_app_user_can_read_client_portal() then
    raise exception 'client_portal_access_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('client_portal.reports.read') then
    raise exception 'client_portal_reports_read_required'
      using errcode = '42501';
  end if;

  return query
  select
    od.id as document_id,
    v.order_key,
    v.order_number,
    od.file_name,
    od.mime_type,
    od.file_size,
    od.created_at as report_ready_at,
    od.updated_at as report_delivered_at
  from public.v_client_portal_order_status v
  join public.order_documents od
    on od.order_id = v.order_id
   and od.company_id = v.company_id
   and od.category = 'final_report'
   and od.visibility_scope = 'client'
   and od.status = 'active'
  where v.company_id = public.current_company_id()
    and v.order_key = v_order_key
    and v.client_id in (
      select readable.client_id
      from public.current_app_user_client_portal_client_ids() readable
    )
  order by od.created_at desc, od.id desc
  limit 1;
end;
$$;

revoke all on function public.rpc_client_portal_report_authorize_download(text) from public, anon;
grant execute on function public.rpc_client_portal_report_authorize_download(text) to authenticated, service_role;

comment on function public.rpc_client_portal_report_authorize_download(text) is
  'Authorizes Client Portal final report download by opaque order_key. Requires current-company client portal membership plus client_portal.reports.read, returns safe final-report metadata and an internal document id for Edge signing only. Does not expose raw order ids, storage internals, signed URLs, drafts, vendor submissions, internal docs, invoices, or procurement documents.';

commit;
