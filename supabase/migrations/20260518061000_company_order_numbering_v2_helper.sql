begin;

create or replace function public.next_order_number_v2(
  p_company_id uuid default public.current_company_id(),
  p_effective_at timestamp with time zone default now()
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_rule public.order_numbering_rules%rowtype;
  v_counter_year integer;
  v_next_value integer;
begin
  v_company_id := p_company_id;

  if v_company_id is null then
    raise exception 'next_order_number_v2 requires a concrete company_id'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.companies c
    where c.id = v_company_id
  ) then
    raise exception 'next_order_number_v2 company_id % does not exist', v_company_id
      using errcode = '22023';
  end if;

  select *
  into v_rule
  from public.order_numbering_rules
  where company_id = v_company_id
    and is_active = true
  order by id
  limit 1;

  if not found then
    raise exception 'No active company-id-backed order numbering rule found for company_id=%', v_company_id
      using errcode = 'P0001';
  end if;

  if v_rule.format_kind <> 'year_seq_3' then
    raise exception 'Unsupported format_kind=%', v_rule.format_kind
      using errcode = '22023';
  end if;

  if v_rule.reset_period <> 'yearly' then
    raise exception 'Unsupported reset_period=%', v_rule.reset_period
      using errcode = '22023';
  end if;

  v_counter_year := extract(year from coalesce(p_effective_at, now()))::integer;

  insert into public.order_number_counters (
    rule_id,
    counter_year,
    last_value,
    company_id
  )
  values (
    v_rule.id,
    v_counter_year,
    1,
    v_company_id
  )
  on conflict (rule_id, counter_year)
  do update
    set last_value = public.order_number_counters.last_value + 1,
        updated_at = now()
  where public.order_number_counters.company_id is not distinct from excluded.company_id
  returning last_value
  into v_next_value;

  if v_next_value is null then
    raise exception 'Existing order number counter for rule_id=% year=% is not company-id-backed for company_id=%',
      v_rule.id,
      v_counter_year,
      v_company_id
      using errcode = 'P0001';
  end if;

  return lpad(v_counter_year::text, v_rule.year_digits, '0')
    || lpad(v_next_value::text, v_rule.sequence_digits, '0');
end;
$$;

comment on function public.next_order_number_v2(uuid, timestamp with time zone) is
  'Phase 10E5 additive company-id-backed order number generation helper. Uses order_numbering_rules.company_id and order_number_counters.company_id only, fails closed when a legacy/null-company counter already owns the rule/year, and is not wired into active order creation or frontend prefetch.';

revoke all privileges on function public.next_order_number_v2(uuid, timestamp with time zone) from public, anon, authenticated;
grant execute on function public.next_order_number_v2(uuid, timestamp with time zone) to service_role;

commit;
