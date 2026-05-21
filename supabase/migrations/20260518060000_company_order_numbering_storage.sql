begin;

alter table public.order_numbering_rules
  add column if not exists company_id uuid;

alter table public.order_number_counters
  add column if not exists company_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_numbering_rules_company_id_fkey'
  ) then
    alter table public.order_numbering_rules
      add constraint order_numbering_rules_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'order_number_counters_company_id_fkey'
  ) then
    alter table public.order_number_counters
      add constraint order_number_counters_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;
end;
$$;

create index if not exists idx_order_numbering_rules_company_id
  on public.order_numbering_rules (company_id);

create index if not exists idx_order_number_counters_company_id
  on public.order_number_counters (company_id);

create unique index if not exists order_numbering_rules_company_key_company_unique
  on public.order_numbering_rules (company_id, company_key)
  where company_id is not null;

create unique index if not exists order_number_counters_company_rule_year_unique
  on public.order_number_counters (company_id, rule_id, counter_year)
  where company_id is not null;

update public.order_numbering_rules r
   set company_id = public.default_company_id(),
       updated_at = now()
 where r.company_key = 'falcon_default'
   and r.company_id is null
   and public.default_company_id() is not null;

update public.order_number_counters c
   set company_id = r.company_id,
       updated_at = now()
  from public.order_numbering_rules r
 where c.rule_id = r.id
   and c.company_id is null
   and r.company_id is not null;

comment on column public.order_numbering_rules.company_id is
  'Phase 10E4 compatibility/future v2 storage. Nullable company mapping for company-safe order numbering; legacy company_key remains active for current generation until later phases.';

comment on column public.order_number_counters.company_id is
  'Phase 10E4 compatibility/future v2 storage. Nullable company mapping for company-safe counters; active generation still uses existing rule_id/counter_year behavior until later phases.';

comment on index public.idx_order_numbering_rules_company_id is
  'Phase 10E4 lookup index for future company-id-backed order numbering. Does not change active generation behavior.';

comment on index public.idx_order_number_counters_company_id is
  'Phase 10E4 lookup index for future company-id-backed order-number counters. Does not change active generation behavior.';

comment on index public.order_numbering_rules_company_key_company_unique is
  'Phase 10E4 future-safe uniqueness for mapped company/rule keys. Legacy global company_key uniqueness remains active.';

comment on index public.order_number_counters_company_rule_year_unique is
  'Phase 10E4 future-safe uniqueness for mapped company/rule/year counters. Legacy rule/year uniqueness remains active.';

commit;
