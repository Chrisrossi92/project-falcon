begin;

alter table public.order_documents
  add column if not exists upload_expires_at timestamptz null,
  add column if not exists upload_expired_at timestamptz null,
  add column if not exists upload_cleanup_note text null;

do $$
begin
  if exists (
    select 1
      from pg_constraint
     where conname = 'order_documents_status_check'
       and conrelid = 'public.order_documents'::regclass
  ) then
    alter table public.order_documents
      drop constraint order_documents_status_check;
  end if;

  alter table public.order_documents
    add constraint order_documents_status_check check (
      status = any (array['pending', 'active', 'archived', 'deleted', 'expired'])
    );
end;
$$;

create index if not exists idx_order_documents_vendor_report_pending_expiry
  on public.order_documents (upload_expires_at, created_at)
  where status = 'pending'
    and category = 'final_report'
    and visibility_scope = 'vendor';

create or replace function public.tg_vendor_report_upload_set_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if NEW.status = 'pending'
     and NEW.category = 'final_report'
     and NEW.visibility_scope = 'vendor'
     and NEW.storage_path like 'vendor-workspace/assignments/%'
     and NEW.upload_expires_at is null then
    NEW.upload_expires_at := NEW.created_at + interval '24 hours';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_vendor_report_upload_set_expiry on public.order_documents;
create trigger trg_vendor_report_upload_set_expiry
before insert on public.order_documents
for each row execute function public.tg_vendor_report_upload_set_expiry();

update public.order_documents od
   set upload_expires_at = coalesce(od.upload_expires_at, od.created_at + interval '24 hours'),
       updated_at = now()
 where od.status = 'pending'
   and od.category = 'final_report'
   and od.visibility_scope = 'vendor'
   and od.storage_path like 'vendor-workspace/assignments/%'
   and od.upload_expires_at is null;

create or replace function public.rpc_amc_cleanup_abandoned_vendor_report_uploads(
  p_older_than interval default interval '24 hours',
  p_limit integer default 500
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_threshold interval := greatest(coalesce(p_older_than, interval '24 hours'), interval '1 hour');
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 5000);
  v_cutoff timestamptz := now() - v_threshold;
  v_expired_count integer := 0;
begin
  with candidates as (
    select od.id
      from public.order_documents od
     where od.status = 'pending'
       and od.category = 'final_report'
       and od.visibility_scope = 'vendor'
       and od.storage_path like 'vendor-workspace/assignments/%'
       and coalesce(od.upload_expires_at, od.created_at + v_threshold) <= now()
       and od.created_at <= v_cutoff
     order by od.created_at asc, od.id asc
     limit v_limit
     for update skip locked
  ),
  expired as (
    update public.order_documents od
       set status = 'expired',
           upload_expired_at = coalesce(od.upload_expired_at, now()),
           upload_expires_at = coalesce(od.upload_expires_at, od.created_at + v_threshold),
           upload_cleanup_note = 'Expired abandoned pending vendor report upload metadata. Storage object cleanup is intentionally deferred to a storage-aware maintenance worker.',
           updated_at = now()
      from candidates c
     where od.id = c.id
       and od.status = 'pending'
       and od.category = 'final_report'
       and od.visibility_scope = 'vendor'
       and od.storage_path like 'vendor-workspace/assignments/%'
     returning od.id
  )
  select count(*)::integer
    into v_expired_count
    from expired;

  return jsonb_build_object(
    'ok', true,
    'expired_count', v_expired_count,
    'threshold_hours', extract(epoch from v_threshold) / 3600,
    'storage_cleanup', 'metadata_only'
  );
end;
$$;

revoke all on function public.rpc_amc_cleanup_abandoned_vendor_report_uploads(interval, integer) from public, anon, authenticated;
grant execute on function public.rpc_amc_cleanup_abandoned_vendor_report_uploads(interval, integer) to service_role;

comment on column public.order_documents.upload_expires_at is
  'AMC-11B pending upload expiration timestamp. Used for abandoned Vendor Workspace report upload metadata cleanup.';

comment on column public.order_documents.upload_expired_at is
  'AMC-11B timestamp when abandoned pending Vendor Workspace report upload metadata was marked expired.';

comment on column public.order_documents.upload_cleanup_note is
  'AMC-11B internal cleanup note. Must not be returned by Vendor Workspace document payloads.';

comment on function public.rpc_amc_cleanup_abandoned_vendor_report_uploads(interval, integer) is
  'AMC-11B service-role maintenance cleanup for abandoned pending Vendor Workspace report upload metadata. Only pending vendor-visible final_report rows with Vendor Workspace assignment storage targets are marked expired after a conservative threshold. Active/submitted/resubmitted report documents, non-report documents, owner documents, vendor-visible active order documents, assignment lifecycle, order lifecycle, public token routes, notifications, and storage objects are not mutated. Storage object deletion is metadata-only/deferred and no storage paths are returned.';

commit;
