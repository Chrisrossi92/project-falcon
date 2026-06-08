begin;

create or replace function public.rpc_client_portal_pending_order_requests()
returns table (
  request_key text,
  status text,
  status_label text,
  property_address text,
  property_type text,
  report_type text,
  requested_due_date date,
  submitted_at timestamptz,
  status_copy text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.current_app_user_can_read_client_portal() then
    raise exception 'client_portal_membership_required'
      using errcode = '42501';
  end if;

  return query
  select
    public.client_portal_order_request_key(cpor.id, cpor.company_id, cpor.client_id) as request_key,
    cpor.status,
    case cpor.status
      when 'submitted' then 'Submitted'
      when 'under_review' then 'Awaiting review'
      when 'accepted' then 'Accepted'
      when 'declined' then 'Declined'
      else initcap(replace(coalesce(cpor.status, 'submitted'), '_', ' '))
    end as status_label,
    cpor.property_address,
    cpor.property_type,
    cpor.report_type,
    cpor.requested_due_date,
    cpor.created_at as submitted_at,
    case
      when cpor.status in ('submitted', 'under_review') then
        'Your appraisal team is reviewing this request.'
      when cpor.status = 'accepted' then
        'Your appraisal team accepted this request.'
      when cpor.status = 'declined' then
        'Your appraisal team could not accept this request.'
      else
        'Your appraisal team is reviewing this request.'
    end as status_copy
  from public.client_portal_order_requests cpor
  join public.current_app_user_client_portal_memberships() readable
    on readable.company_id = cpor.company_id
   and readable.client_id = cpor.client_id
  where cpor.accepted_order_id is null
    and cpor.status in ('submitted', 'under_review')
  order by cpor.created_at desc, cpor.id desc;
end;
$$;

revoke all on function public.rpc_client_portal_pending_order_requests()
  from public, anon;
grant execute on function public.rpc_client_portal_pending_order_requests()
  to authenticated, service_role;

comment on function public.rpc_client_portal_pending_order_requests() is
  'Returns client-safe pending Client Portal intake requests for active client_portal_members. Shows property, requested due date, submitted date, and safe status copy only; does not expose staff notes, conversion ids, internal review details, vendor procurement, assignments, fees, or documents.';

commit;
