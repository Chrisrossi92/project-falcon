create table if not exists public.order_numbering_rules (
  id bigint generated always as identity primary key,
  company_key text not null unique,
  format_kind text not null default 'year_seq_3',
  year_digits integer not null default 4,
  sequence_digits integer not null default 3,
  reset_period text not null default 'yearly',
  manual_override_allowed boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_numbering_rules_format_kind_check
    check (format_kind = 'year_seq_3'),
  constraint order_numbering_rules_year_digits_check
    check (year_digits = 4),
  constraint order_numbering_rules_sequence_digits_check
    check (sequence_digits > 0),
  constraint order_numbering_rules_reset_period_check
    check (reset_period = 'yearly')
);

insert into public.order_numbering_rules (
  company_key,
  format_kind,
  year_digits,
  sequence_digits,
  reset_period,
  manual_override_allowed,
  is_active
)
values (
  'falcon_default',
  'year_seq_3',
  4,
  3,
  'yearly',
  true,
  true
)
on conflict (company_key) do update
set
  format_kind = excluded.format_kind,
  year_digits = excluded.year_digits,
  sequence_digits = excluded.sequence_digits,
  reset_period = excluded.reset_period,
  manual_override_allowed = excluded.manual_override_allowed,
  is_active = excluded.is_active,
  updated_at = now();

