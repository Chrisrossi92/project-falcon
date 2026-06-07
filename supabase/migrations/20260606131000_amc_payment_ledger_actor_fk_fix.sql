begin;

-- AMC-13B.6: payment ledger actor fields must use the same app-user identity model as
-- assignment lifecycle fields and public.current_app_user_id().

update public.amc_vendor_payment_ledger ledger
   set scheduled_by_user_id = app_user.id
  from public.users app_user
 where ledger.scheduled_by_user_id = app_user.auth_id
   and not exists (
     select 1
       from public.users existing_app_user
      where existing_app_user.id = ledger.scheduled_by_user_id
   );

update public.amc_vendor_payment_ledger ledger
   set paid_by_user_id = app_user.id
  from public.users app_user
 where ledger.paid_by_user_id = app_user.auth_id
   and not exists (
     select 1
       from public.users existing_app_user
      where existing_app_user.id = ledger.paid_by_user_id
   );

update public.amc_vendor_payment_ledger ledger
   set scheduled_by_user_id = null
 where scheduled_by_user_id is not null
   and not exists (
     select 1
       from public.users app_user
      where app_user.id = ledger.scheduled_by_user_id
   );

update public.amc_vendor_payment_ledger ledger
   set paid_by_user_id = null
 where paid_by_user_id is not null
   and not exists (
     select 1
       from public.users app_user
      where app_user.id = ledger.paid_by_user_id
   );

do $$
begin
  if exists (
    select 1
      from pg_constraint
     where conname = 'amc_vendor_payment_ledger_scheduled_by_user_id_fkey'
       and conrelid = 'public.amc_vendor_payment_ledger'::regclass
  ) then
    alter table public.amc_vendor_payment_ledger
      drop constraint amc_vendor_payment_ledger_scheduled_by_user_id_fkey;
  end if;

  if exists (
    select 1
      from pg_constraint
     where conname = 'amc_vendor_payment_ledger_paid_by_user_id_fkey'
       and conrelid = 'public.amc_vendor_payment_ledger'::regclass
  ) then
    alter table public.amc_vendor_payment_ledger
      drop constraint amc_vendor_payment_ledger_paid_by_user_id_fkey;
  end if;

  alter table public.amc_vendor_payment_ledger
    add constraint amc_vendor_payment_ledger_scheduled_by_user_id_fkey
    foreign key (scheduled_by_user_id)
    references public.users(id)
    on delete set null
    not valid;

  alter table public.amc_vendor_payment_ledger
    add constraint amc_vendor_payment_ledger_paid_by_user_id_fkey
    foreign key (paid_by_user_id)
    references public.users(id)
    on delete set null
    not valid;

  alter table public.amc_vendor_payment_ledger
    validate constraint amc_vendor_payment_ledger_scheduled_by_user_id_fkey;

  alter table public.amc_vendor_payment_ledger
    validate constraint amc_vendor_payment_ledger_paid_by_user_id_fkey;
end;
$$;

comment on constraint amc_vendor_payment_ledger_scheduled_by_user_id_fkey
  on public.amc_vendor_payment_ledger is
  'AMC-13B.6 aligns payment scheduling actors with public.current_app_user_id(), which returns public.users.id.';

comment on constraint amc_vendor_payment_ledger_paid_by_user_id_fkey
  on public.amc_vendor_payment_ledger is
  'AMC-13B.6 aligns mark-paid actors with public.current_app_user_id(), which returns public.users.id.';

commit;
