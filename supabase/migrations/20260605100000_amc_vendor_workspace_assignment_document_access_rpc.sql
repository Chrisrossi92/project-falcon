begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_authorize_assignment_document_access(
  p_assignment_work_key text,
  p_document_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_assignment_work_key text := lower(btrim(coalesce(p_assignment_work_key, '')));
  v_document_key text := lower(btrim(coalesce(p_document_key, '')));
  v_document jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_vendor_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_documents.read') then
    raise exception 'vendor_documents_read_permission_required'
      using errcode = '42501';
  end if;

  if v_assignment_work_key !~ '^[0-9a-f]{64}$'
     or v_document_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_document_unavailable'
    );
  end if;

  with authorized_rows as (
    select
      encode(
        extensions.digest(
          concat_ws(
            ':',
            'vendor_assignment_work_v1',
            oca.id::text,
            oca.assigned_company_id::text
          ),
          'sha256'
        ),
        'hex'
      ) as assignment_work_key,
      encode(
        extensions.digest(
          concat_ws(
            ':',
            'vendor_assignment_document_v1',
            od.id::text,
            encode(
              extensions.digest(
                concat_ws(
                  ':',
                  'vendor_assignment_work_v1',
                  oca.id::text,
                  oca.assigned_company_id::text
                ),
                'sha256'
              ),
              'hex'
            )
          ),
          'sha256'
        ),
        'hex'
      ) as document_key,
      od.category,
      coalesce(nullif(od.title, ''), od.file_name) as title,
      od.file_name,
      od.mime_type,
      od.file_size,
      od.created_at
    from public.order_company_assignments oca
    join public.orders o
      on o.id = oca.order_id
    join public.company_relationships cr
      on cr.id = oca.relationship_id
     and cr.source_company_id = oca.owner_company_id
     and cr.target_company_id = oca.assigned_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    join public.company_vendor_profiles cvp
      on cvp.owner_company_id = oca.owner_company_id
     and cvp.vendor_company_id = oca.assigned_company_id
     and (
       cvp.relationship_id is null
       or cvp.relationship_id = oca.relationship_id
     )
     and cvp.vendor_status not in ('inactive', 'do_not_use')
    join public.order_documents od
      on od.order_id = o.id
     and od.company_id = oca.owner_company_id
     and od.status = 'active'
     and od.visibility_scope = 'vendor'
    where oca.assigned_company_id = v_vendor_company_id
      and oca.assignment_type = 'vendor_appraisal'
      and oca.status in ('accepted', 'in_progress', 'submitted', 'revision_requested', 'completed')
      and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id
      and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
  )
  select jsonb_build_object(
    'document_key', ar.document_key,
    'category', ar.category,
    'title', ar.title,
    'file_name', ar.file_name,
    'mime_type', ar.mime_type,
    'file_size', ar.file_size,
    'created_at', ar.created_at
  )
    into v_document
    from authorized_rows ar
   where ar.assignment_work_key = v_assignment_work_key
     and ar.document_key = v_document_key
   limit 1;

  if v_document is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_document_unavailable'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'document', v_document
  );
end;
$$;

create or replace function public.rpc_vendor_workspace_assignment_document_storage_lookup(
  p_assignment_work_key text,
  p_document_key text
)
returns table (
  storage_bucket text,
  storage_path text,
  file_name text,
  mime_type text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_assignment_work_key text := lower(btrim(coalesce(p_assignment_work_key, '')));
  v_document_key text := lower(btrim(coalesce(p_document_key, '')));
begin
  if v_assignment_work_key !~ '^[0-9a-f]{64}$'
     or v_document_key !~ '^[0-9a-f]{64}$' then
    return;
  end if;

  return query
  with document_rows as (
    select
      encode(
        extensions.digest(
          concat_ws(
            ':',
            'vendor_assignment_work_v1',
            oca.id::text,
            oca.assigned_company_id::text
          ),
          'sha256'
        ),
        'hex'
      ) as assignment_work_key,
      encode(
        extensions.digest(
          concat_ws(
            ':',
            'vendor_assignment_document_v1',
            od.id::text,
            encode(
              extensions.digest(
                concat_ws(
                  ':',
                  'vendor_assignment_work_v1',
                  oca.id::text,
                  oca.assigned_company_id::text
                ),
                'sha256'
              ),
              'hex'
            )
          ),
          'sha256'
        ),
        'hex'
      ) as document_key,
      od.storage_bucket,
      od.storage_path,
      od.file_name,
      od.mime_type
    from public.order_company_assignments oca
    join public.orders o
      on o.id = oca.order_id
    join public.company_relationships cr
      on cr.id = oca.relationship_id
     and cr.source_company_id = oca.owner_company_id
     and cr.target_company_id = oca.assigned_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    join public.company_vendor_profiles cvp
      on cvp.owner_company_id = oca.owner_company_id
     and cvp.vendor_company_id = oca.assigned_company_id
     and (
       cvp.relationship_id is null
       or cvp.relationship_id = oca.relationship_id
     )
     and cvp.vendor_status not in ('inactive', 'do_not_use')
    join public.order_documents od
      on od.order_id = o.id
     and od.company_id = oca.owner_company_id
     and od.status = 'active'
     and od.visibility_scope = 'vendor'
    where oca.assignment_type = 'vendor_appraisal'
      and oca.status in ('accepted', 'in_progress', 'submitted', 'revision_requested', 'completed')
      and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id
      and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
  )
  select
    dr.storage_bucket,
    dr.storage_path,
    dr.file_name,
    dr.mime_type
    from document_rows dr
   where dr.assignment_work_key = v_assignment_work_key
     and dr.document_key = v_document_key
   limit 1;
end;
$$;

revoke all on function public.rpc_vendor_workspace_authorize_assignment_document_access(text, text) from public, anon;
grant execute on function public.rpc_vendor_workspace_authorize_assignment_document_access(text, text) to authenticated, service_role;

revoke all on function public.rpc_vendor_workspace_assignment_document_storage_lookup(text, text) from public, anon, authenticated;
grant execute on function public.rpc_vendor_workspace_assignment_document_storage_lookup(text, text) to service_role;

comment on function public.rpc_vendor_workspace_authorize_assignment_document_access(text, text) is
  'AMC-10E authenticated Vendor Workspace assignment document access authorization. Requires vendor_documents.read, resolves opaque assignment/document keys only inside the current vendor company, active AMC vendor relationship/profile, AMC order scope, assigned vendor assignment scope, and vendor-visible document scope, returns vendor-safe document metadata only, and does not expose raw ids, storage paths, internal documents, shared order APIs, or owner-side document APIs.';

comment on function public.rpc_vendor_workspace_assignment_document_storage_lookup(text, text) is
  'AMC-10E service-role-only storage lookup for assignment-scoped Vendor Workspace document downloads. Uses opaque assignment/document keys and vendor-visible AMC assignment document scope to fetch backend-only storage bucket/path after the caller-facing authorization RPC succeeds.';

commit;
