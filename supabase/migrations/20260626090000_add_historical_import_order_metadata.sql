begin;

alter table public.orders
  add column if not exists import_source text,
  add column if not exists import_batch text;

comment on column public.orders.import_source is
  'Optional source label for approved historical imports. Null for ordinary operational orders.';

comment on column public.orders.import_batch is
  'Optional batch identifier for approved historical imports. Null for ordinary operational orders.';

commit;
