begin;

create or replace function public.rpc_notification_recipients_for_order(
  p_order_id uuid default null,
  p_recipient_kind text default 'admin_owner'
)
returns table (
  user_id uuid,
  role_key text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_is_service_role boolean := auth.role() = 'service_role';
  v_order public.orders%rowtype;
  v_company_id uuid;
  v_kind text := lower(btrim(coalesce(p_recipient_kind, 'admin_owner')));
begin
  if v_kind not in ('admin_owner', 'appraiser', 'reviewer') then
    raise exception 'invalid_notification_recipient_kind'
      using errcode = '22023';
  end if;

  if p_order_id is not null then
    select *
      into v_order
      from public.orders o
     where o.id = p_order_id
     limit 1;

    if not found then
      raise exception 'notification_source_order_not_found'
        using errcode = '23503';
    end if;

    v_company_id := coalesce(v_order.company_id, public.default_company_id());

    if not v_is_service_role then
      if v_actor_user_id is null then
        raise exception 'app_user_not_found'
          using errcode = '42501';
      end if;

      if not public.current_app_user_has_current_company()
         or v_company_id <> public.current_company_id()
         or not public.current_app_user_can_read_order(p_order_id) then
        raise exception 'notification_recipient_resolution_denied'
          using errcode = '42501';
      end if;
    end if;
  else
    if v_kind <> 'admin_owner' then
      raise exception 'order_id_required_for_assigned_recipient_resolution'
        using errcode = '22023';
    end if;

    v_company_id := public.current_company_id();

    if v_company_id is null then
      v_company_id := public.default_company_id();
    end if;

    if not v_is_service_role then
      if v_actor_user_id is null
         or v_company_id is null
         or not public.current_app_user_has_current_company()
         or v_company_id <> public.current_company_id() then
        raise exception 'current_company_required'
          using errcode = '42501';
      end if;

      if not public.current_app_user_has_permission('users.manage_company_access') then
        raise exception 'notification_recipient_admin_resolution_denied'
          using errcode = '42501';
      end if;
    end if;
  end if;

  if v_kind = 'admin_owner' then
    return query
    with candidates as (
      select distinct
        u.id as user_id,
        case
          when r.is_owner_role or lower(btrim(r.name)) = 'owner' then 'owner'
          else 'admin'
        end as role_key,
        case
          when r.is_owner_role or lower(btrim(r.name)) = 'owner' then 1
          else 2
        end as sort_key
        from public.company_memberships cm
        join public.users u
          on u.id = cm.user_id
        join public.user_role_assignments ura
          on ura.user_id = cm.user_id
         and ura.company_id = cm.company_id
         and ura.status = 'active'
         and (ura.expires_at is null or ura.expires_at > now())
        join public.roles r
          on r.id = ura.role_id
       where cm.company_id = v_company_id
         and cm.status = 'active'
         and coalesce(u.is_active, true)
         and coalesce(lower(btrim(u.status)), 'active') = 'active'
         and (
           r.is_owner_role
           or lower(btrim(r.name)) in ('owner', 'admin')
         )
    )
    select distinct on (c.user_id)
      c.user_id,
      c.role_key
      from candidates c
     order by c.user_id, c.sort_key;
    return;
  end if;

  if v_kind = 'appraiser' then
    return query
    with assigned as (
      select v_order.appraiser_id as user_id
      union all
      select v_order.assigned_to
       where v_order.appraiser_id is null
    )
    select distinct
      u.id as user_id,
      'appraiser'::text as role_key
      from assigned a
      join public.company_memberships cm
        on cm.user_id = a.user_id
       and cm.company_id = v_company_id
       and cm.status = 'active'
      join public.users u
        on u.id = cm.user_id
     where a.user_id is not null
       and coalesce(u.is_active, true)
       and coalesce(lower(btrim(u.status)), 'active') = 'active';
    return;
  end if;

  return query
  with assigned as (
    select v_order.reviewer_id as user_id
  )
  select distinct
    u.id as user_id,
    'reviewer'::text as role_key
    from assigned a
    join public.company_memberships cm
      on cm.user_id = a.user_id
     and cm.company_id = v_company_id
     and cm.status = 'active'
    join public.users u
      on u.id = cm.user_id
   where a.user_id is not null
     and coalesce(u.is_active, true)
     and coalesce(lower(btrim(u.status)), 'active') = 'active';
end;
$$;

revoke all privileges on function public.rpc_notification_recipients_for_order(uuid, text)
  from public, anon;
grant execute on function public.rpc_notification_recipients_for_order(uuid, text)
  to authenticated, service_role;

comment on function public.rpc_notification_recipients_for_order(uuid, text) is
  'Company-scoped V1 notification recipient resolver. Owner/admin recipients come from active company role assignments; assigned appraiser/reviewer recipients come from the source order and require active company membership.';

commit;
