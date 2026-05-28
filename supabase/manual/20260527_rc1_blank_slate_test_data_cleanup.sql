-- Falcon V1 RC1 internal pilot blank-slate cleanup.
--
-- Purpose:
--   Remove only obvious staging/production test order junk and order-tied
--   operational rows. Preserve users, roles, permissions, clients,
--   notification preferences/policies, email/cron configuration, app settings,
--   migrations, and schema.
--
-- Run flow:
--   1. Run the DRY RUN section first.
--   2. Review every row returned by "exact target orders".
--   3. If every targeted order is confirmed test junk, run the DELETE section
--      in the same privileged SQL environment.
--
-- Safety:
--   - This script never deletes clients, users, roles, permissions, app
--     settings, notification preferences, notification policies, or schema.
--   - This script does not wipe all orders. The delete section refuses to run
--     if no target orders are found or if more than 50 target orders match.
--   - Uploaded storage objects are not removed here. Only order_documents
--     metadata tied to removed test orders is deleted. Use the returned
--     storage_bucket/storage_path rows for a separate reviewed storage cleanup.
--   - Run from a service-role/admin SQL session. Normal app RLS policies block
--     direct deletes on some operational tables by design.

-- ---------------------------------------------------------------------------
-- DRY RUN ONLY
-- ---------------------------------------------------------------------------

begin;

drop table if exists pg_temp.falcon_rc1_cleanup_target_orders;

create temp table falcon_rc1_cleanup_target_orders on commit drop as
with candidate_orders as (
  select
    o.id,
    o.order_number,
    o.external_order_no,
    o.title,
    o.property_address,
    o.address,
    o.city,
    o.state,
    o.postal_code,
    o.zip,
    o.manual_client_name,
    o.manual_client,
    o.created_at,
    o.updated_at,
    array_remove(array[
      case
        when coalesce(o.order_number, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|qa|rc1|rc-1|rc_1)([^a-z0-9]|$)'
          then 'order_number'
      end,
      case
        when coalesce(o.external_order_no, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|qa|rc1|rc-1|rc_1)([^a-z0-9]|$)'
          then 'external_order_no'
      end,
      case
        when coalesce(o.title, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|asdf|qwerty|rc1|rc-1|rc_1)([^a-z0-9]|$)'
          then 'title'
      end,
      case
        when coalesce(o.property_address, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|asdf|qwerty)([^a-z0-9]|$)'
          then 'property_address'
      end,
      case
        when coalesce(o.address, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|asdf|qwerty)([^a-z0-9]|$)'
          then 'address'
      end,
      case
        when coalesce(o.manual_client_name, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|asdf|qwerty)([^a-z0-9]|$)'
          then 'manual_client_name'
      end,
      case
        when coalesce(o.manual_client, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|asdf|qwerty)([^a-z0-9]|$)'
          then 'manual_client'
      end
    ], null) as matched_reasons
  from public.orders o
)
select *
from candidate_orders
where cardinality(matched_reasons) > 0;

-- Exact records targeted. Review this output before running the DELETE section.
select
  id,
  order_number,
  external_order_no,
  title,
  coalesce(property_address, address) as target_address,
  city,
  state,
  coalesce(postal_code, zip) as postal_code,
  coalesce(manual_client_name, manual_client) as manual_client,
  matched_reasons,
  created_at,
  updated_at
from falcon_rc1_cleanup_target_orders
order by created_at desc nulls last, order_number nulls last;

-- Dry-run counts for rows that would be removed.
select 'orders' as table_name, count(*)::bigint as rows_targeted
from falcon_rc1_cleanup_target_orders
union all
select 'order_activity', count(*)::bigint
from public.order_activity oa
where oa.order_id in (select id from falcon_rc1_cleanup_target_orders)
union all
select 'order_operational_inputs', count(*)::bigint
from public.order_operational_inputs oi
where oi.order_id in (select id from falcon_rc1_cleanup_target_orders)
union all
select 'notifications', count(*)::bigint
from public.notifications n
where n.order_id in (select id from falcon_rc1_cleanup_target_orders)
   or n.payload->>'order_id' in (select id::text from falcon_rc1_cleanup_target_orders)
   or n.event_id in (
     select oa.id
     from public.order_activity oa
     where oa.order_id in (select id from falcon_rc1_cleanup_target_orders)
   )
union all
select 'email_queue', count(*)::bigint
from public.email_queue eq
where eq.payload->>'order_id' in (select id::text from falcon_rc1_cleanup_target_orders)
   or eq.payload->>'order_number' in (
     select order_number
     from falcon_rc1_cleanup_target_orders
     where order_number is not null
   )
   or eq.payload->>'notification_id' in (
     select n.id::text
     from public.notifications n
     where n.order_id in (select id from falcon_rc1_cleanup_target_orders)
        or n.payload->>'order_id' in (select id::text from falcon_rc1_cleanup_target_orders)
        or n.event_id in (
          select oa.id
          from public.order_activity oa
          where oa.order_id in (select id from falcon_rc1_cleanup_target_orders)
        )
   )
union all
select 'order_documents_metadata', count(*)::bigint
from public.order_documents od
where od.order_id in (select id from falcon_rc1_cleanup_target_orders);

-- Uploaded document metadata that would be deleted. Use this output for a
-- separate reviewed storage-object cleanup if desired.
select
  od.id,
  od.order_id,
  t.order_number,
  od.file_name,
  od.storage_bucket,
  od.storage_path,
  od.status,
  od.created_at
from public.order_documents od
join falcon_rc1_cleanup_target_orders t on t.id = od.order_id
order by od.created_at desc;

rollback;

-- ---------------------------------------------------------------------------
-- DELETE SECTION
-- ---------------------------------------------------------------------------
-- Run only after the dry-run target list has been reviewed.
-- Keep this in one transaction. Replace "rollback;" with "commit;" only after
-- reviewing the returned delete counts and deleted document metadata.

/*
begin;

drop table if exists pg_temp.falcon_rc1_cleanup_target_orders;

create temp table falcon_rc1_cleanup_target_orders on commit drop as
with candidate_orders as (
  select
    o.id,
    o.order_number,
    o.external_order_no,
    o.title,
    o.property_address,
    o.address,
    o.city,
    o.state,
    o.postal_code,
    o.zip,
    o.manual_client_name,
    o.manual_client,
    o.created_at,
    o.updated_at,
    array_remove(array[
      case
        when coalesce(o.order_number, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|qa|rc1|rc-1|rc_1)([^a-z0-9]|$)'
          then 'order_number'
      end,
      case
        when coalesce(o.external_order_no, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|qa|rc1|rc-1|rc_1)([^a-z0-9]|$)'
          then 'external_order_no'
      end,
      case
        when coalesce(o.title, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|asdf|qwerty|rc1|rc-1|rc_1)([^a-z0-9]|$)'
          then 'title'
      end,
      case
        when coalesce(o.property_address, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|asdf|qwerty)([^a-z0-9]|$)'
          then 'property_address'
      end,
      case
        when coalesce(o.address, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|asdf|qwerty)([^a-z0-9]|$)'
          then 'address'
      end,
      case
        when coalesce(o.manual_client_name, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|asdf|qwerty)([^a-z0-9]|$)'
          then 'manual_client_name'
      end,
      case
        when coalesce(o.manual_client, '') ~* '(^|[^a-z0-9])(test|demo|sample|smoke|fake|asdf|qwerty)([^a-z0-9]|$)'
          then 'manual_client'
      end
    ], null) as matched_reasons
  from public.orders o
)
select *
from candidate_orders
where cardinality(matched_reasons) > 0;

do $$
declare
  v_target_count integer;
begin
  select count(*) into v_target_count
  from falcon_rc1_cleanup_target_orders;

  if v_target_count = 0 then
    raise exception 'RC1 cleanup stopped: no target orders matched.';
  end if;

  if v_target_count > 50 then
    raise exception 'RC1 cleanup stopped: % target orders matched; review filters before deleting.', v_target_count;
  end if;
end $$;

drop table if exists pg_temp.falcon_rc1_cleanup_delete_counts;
create temp table falcon_rc1_cleanup_delete_counts (
  table_name text primary key,
  rows_deleted bigint not null
) on commit drop;

drop table if exists pg_temp.falcon_rc1_cleanup_document_metadata;
create temp table falcon_rc1_cleanup_document_metadata on commit drop as
select
  od.id,
  od.order_id,
  t.order_number,
  od.file_name,
  od.storage_bucket,
  od.storage_path,
  od.status,
  od.created_at
from public.order_documents od
join falcon_rc1_cleanup_target_orders t on t.id = od.order_id
order by od.created_at desc;

with deleted as (
  delete from public.order_documents od
  where od.order_id in (select id from falcon_rc1_cleanup_target_orders)
  returning 1
)
insert into falcon_rc1_cleanup_delete_counts (table_name, rows_deleted)
select 'order_documents_metadata', count(*)::bigint from deleted;

with deleted as (
  delete from public.order_operational_inputs oi
  where oi.order_id in (select id from falcon_rc1_cleanup_target_orders)
  returning 1
)
insert into falcon_rc1_cleanup_delete_counts (table_name, rows_deleted)
select 'order_operational_inputs', count(*)::bigint from deleted;

with deleted as (
  delete from public.email_queue eq
  where eq.payload->>'order_id' in (select id::text from falcon_rc1_cleanup_target_orders)
     or eq.payload->>'order_number' in (
       select order_number
       from falcon_rc1_cleanup_target_orders
       where order_number is not null
     )
     or eq.payload->>'notification_id' in (
       select n.id::text
       from public.notifications n
       where n.order_id in (select id from falcon_rc1_cleanup_target_orders)
          or n.payload->>'order_id' in (select id::text from falcon_rc1_cleanup_target_orders)
          or n.event_id in (
            select oa.id
            from public.order_activity oa
            where oa.order_id in (select id from falcon_rc1_cleanup_target_orders)
          )
     )
  returning 1
)
insert into falcon_rc1_cleanup_delete_counts (table_name, rows_deleted)
select 'email_queue', count(*)::bigint from deleted;

with deleted as (
  delete from public.notifications n
  where n.order_id in (select id from falcon_rc1_cleanup_target_orders)
     or n.payload->>'order_id' in (select id::text from falcon_rc1_cleanup_target_orders)
     or n.event_id in (
       select oa.id
       from public.order_activity oa
       where oa.order_id in (select id from falcon_rc1_cleanup_target_orders)
     )
  returning 1
)
insert into falcon_rc1_cleanup_delete_counts (table_name, rows_deleted)
select 'notifications', count(*)::bigint from deleted;

with deleted as (
  delete from public.order_activity oa
  where oa.order_id in (select id from falcon_rc1_cleanup_target_orders)
  returning 1
)
insert into falcon_rc1_cleanup_delete_counts (table_name, rows_deleted)
select 'order_activity', count(*)::bigint from deleted;

with deleted as (
  delete from public.orders o
  where o.id in (select id from falcon_rc1_cleanup_target_orders)
  returning 1
)
insert into falcon_rc1_cleanup_delete_counts (table_name, rows_deleted)
select 'orders', count(*)::bigint from deleted;

-- Review these counts before committing.
select *
from falcon_rc1_cleanup_delete_counts
order by table_name;

-- Review deleted document metadata before committing. If storage cleanup is
-- needed, remove these storage paths separately after the DB cleanup is
-- committed and verified.
select *
from falcon_rc1_cleanup_document_metadata
order by created_at desc;

-- Use rollback for a final rehearsal. Change to commit only when approved.
rollback;
-- commit;
*/
