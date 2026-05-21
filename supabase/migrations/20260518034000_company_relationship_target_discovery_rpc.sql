begin;

create or replace function public.rpc_company_relationship_target_search(
  p_query text,
  p_relationship_type text,
  p_limit integer default 10
)
returns table (
  company_id uuid,
  company_name text,
  company_slug text,
  company_type text,
  company_type_label text,
  relationship_type text,
  relationship_type_label text,
  eligible_for_invite boolean,
  current_relationship_status text,
  blocked_reason text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_query text := btrim(coalesce(p_query, ''));
  v_relationship_type text := btrim(coalesce(p_relationship_type, ''));
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 20);
  v_source_company_id uuid := public.current_company_id();
  v_source_company_type text;
  v_query_uuid uuid;
  v_is_uuid boolean := false;
  v_type record;
begin
  if auth.uid() is null or public.current_app_user_id() is null then
    raise exception 'Not authorized to search company relationship targets';
  end if;

  if not public.current_app_user_has_current_company()
     or not public.current_app_user_has_permission('relationships.invite') then
    raise exception 'Not authorized to search company relationship targets';
  end if;

  if v_relationship_type = '' then
    raise exception 'Relationship type is required';
  end if;

  select crt.key,
         crt.label,
         crt.allowed_source_company_types,
         crt.allowed_target_company_types
    into v_type
    from public.company_relationship_types crt
   where crt.key = v_relationship_type
     and crt.is_active;

  if not found then
    raise exception 'Relationship type is not available';
  end if;

  if v_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_query_uuid := v_query::uuid;
    v_is_uuid := true;
  elsif length(v_query) < 3 then
    raise exception 'Company search query must be at least 3 characters';
  end if;

  select c.company_type
    into v_source_company_type
    from public.companies c
   where c.id = v_source_company_id
     and c.status = 'active';

  if not found then
    raise exception 'Not authorized to search company relationship targets';
  end if;

  return query
  with matched_companies as (
    select
      c.id,
      c.name,
      c.slug,
      c.company_type,
      ct.label as company_type_label,
      case
        when v_is_uuid and c.id = v_query_uuid then 0
        when lower(c.slug) = lower(v_query) then 1
        when lower(c.name) = lower(v_query) then 2
        when c.slug ilike ('%' || v_query || '%') then 3
        else 4
      end as match_rank
    from public.companies c
    left join public.company_types ct
      on ct.key = c.company_type
    where c.status = 'active'
      and c.id <> v_source_company_id
      and (
        (v_is_uuid and c.id = v_query_uuid)
        or lower(c.slug) = lower(v_query)
        or c.name ilike ('%' || v_query || '%')
        or c.slug ilike ('%' || v_query || '%')
      )
  ),
  relationship_status as (
    select distinct on (cr.target_company_id)
      cr.target_company_id,
      cr.status
    from public.company_relationships cr
    join matched_companies mc
      on mc.id = cr.target_company_id
    where cr.source_company_id = v_source_company_id
      and cr.relationship_type = v_relationship_type
    order by cr.target_company_id,
      case cr.status
        when 'active' then 1
        when 'invited' then 2
        when 'suspended' then 3
        when 'declined' then 4
        when 'expired' then 5
        when 'archived' then 6
        else 7
      end,
      cr.updated_at desc
  ),
  evaluated as (
    select
      mc.id,
      mc.name,
      mc.slug,
      mc.company_type,
      mc.company_type_label,
      rs.status as current_status,
      case
        when (
          coalesce(array_length(v_type.allowed_source_company_types, 1), 0) > 0
          and not (v_source_company_type = any(v_type.allowed_source_company_types))
        ) or (
          coalesce(array_length(v_type.allowed_target_company_types, 1), 0) > 0
          and not (mc.company_type = any(v_type.allowed_target_company_types))
        )
          then 'incompatible_company_type'
        when rs.status = 'invited' then 'relationship_already_invited'
        when rs.status = 'active' then 'relationship_already_active'
        when rs.status = 'suspended' then 'relationship_suspended'
        else 'none'
      end as safe_blocked_reason,
      mc.match_rank
    from matched_companies mc
    left join relationship_status rs
      on rs.target_company_id = mc.id
  )
  select
    e.id as company_id,
    e.name as company_name,
    e.slug as company_slug,
    e.company_type,
    e.company_type_label,
    v_type.key::text as relationship_type,
    v_type.label::text as relationship_type_label,
    (e.safe_blocked_reason = 'none') as eligible_for_invite,
    e.current_status as current_relationship_status,
    e.safe_blocked_reason as blocked_reason
  from evaluated e
  order by e.match_rank, lower(e.name), e.id
  limit v_limit;
end;
$$;

revoke all on function public.rpc_company_relationship_target_search(text, text, integer) from public, anon;
grant execute on function public.rpc_company_relationship_target_search(text, text, integer) to authenticated, service_role;

comment on function public.rpc_company_relationship_target_search(text, text, integer) is
  'Phase 8C1A safe target-company discovery for relationship invites. Returns minimal active-company identity and invite eligibility for users with relationships.invite; does not grant relationship, assignment, order, client, activity, calendar, notification, membership, user, settings, billing, or operational visibility. Relationship creation remains controlled by rpc_company_relationship_invite.';

commit;
