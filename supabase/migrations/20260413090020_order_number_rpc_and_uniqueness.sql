create unique index if not exists orders_order_number_unique_idx
  on public.orders (order_number)
  where order_number is not null;

drop function if exists public.rpc_get_next_order_number(text, timestamptz);

create or replace function public.rpc_get_next_order_number(
  p_company_key text default 'falcon_default',
  p_effective_at timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.order_numbering_rules%rowtype;
  v_counter_year integer;
  v_next_value integer;
begin
  select *
  into v_rule
  from public.order_numbering_rules
  where company_key = coalesce(p_company_key, 'falcon_default')
    and is_active = true
  limit 1;

  if not found then
    raise exception 'No active order numbering rule found for company_key=%', coalesce(p_company_key, 'falcon_default');
  end if;

  if v_rule.format_kind <> 'year_seq_3' then
    raise exception 'Unsupported format_kind=%', v_rule.format_kind;
  end if;

  if v_rule.reset_period <> 'yearly' then
    raise exception 'Unsupported reset_period=%', v_rule.reset_period;
  end if;

  v_counter_year := extract(year from coalesce(p_effective_at, now()))::integer;

  insert into public.order_number_counters (rule_id, counter_year, last_value)
  values (v_rule.id, v_counter_year, 1)
  on conflict (rule_id, counter_year)
  do update
    set last_value = public.order_number_counters.last_value + 1,
        updated_at = now()
  returning last_value
  into v_next_value;

  return lpad(v_counter_year::text, v_rule.year_digits, '0')
    || lpad(v_next_value::text, v_rule.sequence_digits, '0');
end;
$$;

grant execute on function public.rpc_get_next_order_number(text, timestamptz) to authenticated;

