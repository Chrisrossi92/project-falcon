begin;

do $$
begin
  if to_regclass('public.calendar_events') is not null then
    alter table public.calendar_events
      add column if not exists company_id uuid;

    if not exists (
      select 1
        from pg_constraint
       where conname = 'calendar_events_company_id_fkey'
         and conrelid = 'public.calendar_events'::regclass
    ) then
      alter table public.calendar_events
        add constraint calendar_events_company_id_fkey
        foreign key (company_id)
        references public.companies(id)
        on delete restrict
        not valid;
    end if;

    update public.calendar_events e
       set company_id = coalesce(o.company_id, public.default_company_id())
      from public.orders o
     where e.order_id = o.id
       and e.company_id is null;

    update public.calendar_events
       set company_id = public.default_company_id()
     where company_id is null;

    create index if not exists idx_calendar_events_company_start
      on public.calendar_events (company_id, start_at);

    create index if not exists idx_calendar_events_company_order_start
      on public.calendar_events (company_id, order_id, start_at);

    comment on column public.calendar_events.company_id is
      'Additive company scope. Derived from linked order when available; tenant filtering is deferred.';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.calendar_events') is not null then
    drop view if exists public.v_admin_calendar_enriched;
    drop view if exists public.v_admin_calendar;

    execute $view$
      create view public.v_admin_calendar as
      select
        e.id,
        coalesce(e.company_id, o.company_id, public.default_company_id()) as company_id,
        e.event_type,
        e.title,
        e.start_at,
        e.end_at,
        e.order_id,
        e.appraiser_id,
        e.appraiser_user_id,
        o.order_number as order_no,
        o.order_number as order_number,
        coalesce(o.property_address, o.address) as address,
        coalesce(c.name, o.manual_client) as client_name,
        coalesce(o.city, o.state, o.zip) as street_address,
        o.city,
        o.state,
        coalesce(o.postal_code, o.zip) as zip,
        o.status,
        p.display_name as appraiser_name,
        p.color as appraiser_color
      from public.calendar_events e
      left join public.orders o on o.id = e.order_id
      left join public.clients c on c.id = o.client_id
      left join public.user_profiles p on p.user_id = coalesce(o.appraiser_id, o.assigned_to, e.appraiser_id, e.appraiser_user_id)
    $view$;

    execute $view$
      create view public.v_admin_calendar_enriched as
      select
        ac.*,
        case ac.event_type
          when 'site_visit' then 'map-pin'
          when 'due_for_review' then 'alert-triangle'
          when 'due_to_client' then 'send'
          else 'calendar'
        end as event_icon
      from public.v_admin_calendar ac
    $view$;

    grant select on public.v_admin_calendar to authenticated;
    grant select on public.v_admin_calendar to anon;
    grant select on public.v_admin_calendar_enriched to authenticated;
    grant select on public.v_admin_calendar_enriched to anon;

    if current_setting('server_version_num')::int >= 150000 then
      execute 'alter view public.v_admin_calendar set (security_invoker = true)';
      execute 'alter view public.v_admin_calendar_enriched set (security_invoker = true)';
    end if;

    comment on view public.v_admin_calendar is
      'Company-aware calendar projection. Calendar remains a projection layer; order-derived scheduling is canonical.';

    comment on view public.v_admin_calendar_enriched is
      'Company-aware admin calendar projection with UI event icon metadata.';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.calendar_events') is not null then
    drop function if exists public.rpc_create_calendar_event(text, text, timestamptz, timestamptz, uuid, uuid, text, text);

    execute $fn$
      create function public.rpc_create_calendar_event(
        p_event_type text,
        p_title text,
        p_start_at timestamptz,
        p_end_at timestamptz,
        p_order_id uuid default null,
        p_appraiser_id uuid default null,
        p_location text default null,
        p_notes text default null
      ) returns uuid
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        v_id uuid;
        v_company_id uuid;
      begin
        select o.company_id
          into v_company_id
          from public.orders o
         where o.id = p_order_id
         limit 1;

        v_company_id := coalesce(v_company_id, public.default_company_id());

        insert into public.calendar_events (
          event_type,
          title,
          start_at,
          end_at,
          order_id,
          appraiser_id,
          location,
          notes,
          company_id
        ) values (
          p_event_type,
          p_title,
          p_start_at,
          coalesce(p_end_at, p_start_at),
          p_order_id,
          p_appraiser_id,
          p_location,
          p_notes,
          v_company_id
        )
        returning id into v_id;

        return v_id;
      end;
      $body$
    $fn$;

    grant execute on function public.rpc_create_calendar_event(text, text, timestamptz, timestamptz, uuid, uuid, text, text) to authenticated;

    comment on function public.rpc_create_calendar_event(text, text, timestamptz, timestamptz, uuid, uuid, text, text) is
      'Creates calendar projection events with company scope derived server-side from the source order, falling back to falcon_default.';
  end if;
end;
$$;

commit;
