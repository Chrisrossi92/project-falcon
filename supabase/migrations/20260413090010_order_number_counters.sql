create table if not exists public.order_number_counters (
  id bigint generated always as identity primary key,
  rule_id bigint not null references public.order_numbering_rules(id) on delete cascade,
  counter_year integer not null,
  last_value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_number_counters_last_value_check check (last_value >= 0),
  constraint order_number_counters_rule_year_key unique (rule_id, counter_year)
);

