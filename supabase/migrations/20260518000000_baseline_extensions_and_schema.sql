-- Falcon baseline curated from supabase/schema_dumps/20260517_remote_public_schema.sql
-- Source dump date: 2026-05-17
-- Phase 2 baseline curation: schema objects only.
-- Intentionally excludes ownership, dump grants, default privileges, and Supabase platform roles.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."_activity_actor"() RETURNS TABLE("user_id" "uuid", "full_name" "text", "email" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    u.id as user_id,
    coalesce(u.full_name, u.display_name, u.name, p.full_name, p.display_name, p.name, u.email, p.email) as full_name,
    coalesce(u.email, p.email) as email
  from public.users u
  left join public.profiles p
    on p.auth_id = u.auth_id
  where u.id = public.current_app_user_id()
  limit 1;
$$;


CREATE OR REPLACE FUNCTION "public"."_activity_insert"("p_order_id" "uuid", "p_kind" "text", "p_message" "text", "p_meta" "jsonb", "p_created_by" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'falcon_mvp', 'auth', 'extensions'
    AS $_$
declare
  v_id uuid;
  has_kind  boolean := public._col_exists('falcon_mvp','order_activity','kind');
  has_event boolean := public._col_exists('falcon_mvp','order_activity','event_type');
begin
  if has_kind and has_event then
    execute
      'insert into falcon_mvp.order_activity (order_id, kind, event_type, message, meta, created_by)
       values ($1,$2,$2,$3,$4,$5) returning id'
      using p_order_id, p_kind, p_message, p_meta, p_created_by
      into v_id;
  elsif has_kind then
    execute
      'insert into falcon_mvp.order_activity (order_id, kind, message, meta, created_by)
       values ($1,$2,$3,$4,$5) returning id'
      using p_order_id, p_kind, p_message, p_meta, p_created_by
      into v_id;
  elsif has_event then
    execute
      'insert into falcon_mvp.order_activity (order_id, event_type, message, meta, created_by)
       values ($1,$2,$3,$4,$5) returning id'
      using p_order_id, p_kind, p_message, p_meta, p_created_by
      into v_id;
  else
    raise exception 'order_activity needs either "kind" or "event_type" column';
  end if;

  return v_id;
end;
$_$;


CREATE OR REPLACE FUNCTION "public"."_block_deprecated_runtime_writes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_table text := format('%I.%I', tg_table_schema, tg_table_name);
  v_hint text;
begin
  if current_setting('app.allow_deprecated_writes', true) = 'on' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_table_name = 'email_outbox' then
    v_hint := 'Use public.email_queue with rpc_claim_email_batch_v1, rpc_mark_email_sent_v1, rpc_mark_email_failed_v1.';
  elsif tg_table_name = 'notification_preferences' then
    v_hint := 'Use public.notification_prefs + public.user_notification_prefs and rpc_notification_prefs_ensure/get/update.';
  else
    v_hint := 'Deprecated object: writes are blocked by governance.';
  end if;

  raise exception using
    errcode = '55000',
    message = format('Write blocked on deprecated table %s', v_table),
    hint = v_hint;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."_col_exists"("p_schema" "text", "p_table" "text", "p_column" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = p_schema
      and table_name   = p_table
      and column_name  = p_column
  );
$$;


CREATE OR REPLACE FUNCTION "public"."_default_notification_categories"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select jsonb_build_object(
    'assignments', true,
    'reminders',  true,
    'messages',   true
  );
$$;


CREATE OR REPLACE FUNCTION "public"."_ensure_notification_prefs_for"("user_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.notification_prefs (user_id, categories, updated_at)
  values (user_uuid, public._default_notification_categories(), now())
  on conflict (user_id) do nothing;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."_maybe_move_fk"("p_table" "regclass", "p_col" "text", "p_from" bigint, "p_to" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$
declare
  v_sql text;
  v_exists boolean;
begin
  -- ensure column exists on table
  select exists (
    select 1
    from information_schema.columns
    where table_schema = split_part(p_table::text,'.',1)
      and table_name   = split_part(p_table::text,'.',2)
      and column_name  = p_col
  ) into v_exists;

  if not v_exists then
    return;
  end if;

  v_sql := format('update %s set %I = $1 where %I = $2', p_table, p_col, p_col);
  execute v_sql using p_to, p_from;
end
$_$;


CREATE OR REPLACE FUNCTION "public"."_notification_email_pref"("p_user_id" "uuid") RETURNS TABLE("email_enabled" boolean, "email_address" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    coalesce(np.email_enabled, true) as email_enabled,
    u.email::text                    as email_address
  from public.users u
  left join public.notification_prefs np
    on np.user_id = u.id
  where u.id = p_user_id
$$;


CREATE OR REPLACE FUNCTION "public"."_notification_email_target"("p_user_id" "uuid") RETURNS TABLE("to_user_id" "uuid", "email_enabled" boolean, "email_address" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    u.id as to_user_id,
    coalesce(np.email_enabled, true) as email_enabled,
    coalesce(np.email_address, u.email, p.email) as email_address
  from public.users u
  left join public.notification_preferences np
    on np.user_id = u.id
  left join public.profiles p
    on p.auth_id = u.auth_id
  where u.id = p_user_id
  limit 1;
$$;


CREATE OR REPLACE FUNCTION "public"."_notify_user"("p_to_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  if p_to_user_id is null then
    return;
  end if;

  insert into public.notifications (to_user_id, type, order_id, title, body, read)
  values (p_to_user_id, p_type, p_order_id, p_title, p_body, false);
end;
$$;


CREATE OR REPLACE FUNCTION "public"."_notify_user"("p_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_link_path" "text", "p_payload" "jsonb", "p_priority" "text" DEFAULT 'normal'::"text", "p_category" "text" DEFAULT 'orders'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_public_user_id uuid;
begin
  if p_user_id is null then
    return;
  end if;

  /*
    Notifications.user_id is FK'd to public.users.id.
    Keep DB-side notification writes on that contract.
    If caller already passed a public.users.id, keep it.
    If caller somehow passed an auth id, resolve back to public.users.id.
  */
  select coalesce(
    (
      select u.id
      from public.users u
      where u.id = p_user_id
      limit 1
    ),
    (
      select u.id
      from public.users u
      where u.auth_id = p_user_id
      limit 1
    )
  )
  into v_public_user_id;

  if v_public_user_id is null then
    return;
  end if;

  perform public.rpc_system_insert_notification(
    v_public_user_id,
    p_type,
    p_order_id,
    p_title,
    p_body,
    p_link_path,
    coalesce(p_payload, '{}'::jsonb),
    p_priority,
    p_category
  );
end;
$$;


CREATE OR REPLACE FUNCTION "public"."_trg_users_after_insert_prefs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public._ensure_notification_prefs_for(NEW.id);
  return NEW;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."activity_log_compat"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Legacy -> canonical
  if (NEW.action is null) and (NEW.event_type is not null) then
    NEW.action := NEW.event_type;
  end if;

  if (NEW.context is null) and (NEW.event_data is not null) then
    NEW.context := NEW.event_data;
  end if;

  if (NEW.environment is not null) then
    NEW.context := coalesce(NEW.context, '{}'::jsonb)
                 || jsonb_build_object('environment', NEW.environment);
  end if;

  if (NEW.actor is not null) then
    NEW.context := coalesce(NEW.context, '{}'::jsonb)
                 || jsonb_build_object('actor', NEW.actor::text);
  end if;

  -- Canonical -> legacy mirrors (safe for old readers)
  if (NEW.event_type is null) and (NEW.action is not null) then
    NEW.event_type := NEW.action;
  end if;

  if (NEW.event_data is null) and (NEW.context is not null) then
    NEW.event_data := NEW.context;
  end if;

  if (NEW.environment is null) and (NEW.context ? 'environment') then
    NEW.environment := (NEW.context ->> 'environment');
  end if;

  if (NEW.actor is null) and (NEW.context ? 'actor') then
    begin
      NEW.actor := (NEW.context ->> 'actor')::uuid;
    exception when others then
      NEW.actor := null;
    end;
  end if;

  return NEW;
end
$$;


CREATE OR REPLACE FUNCTION "public"."activity_log_event_type_compat"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- If legacy callers send event_type, map it to action
  if (NEW.action is null) and (NEW.event_type is not null) then
    NEW.action := NEW.event_type;
  end if;

  -- Keep event_type mirrored for any readers expecting it
  if (NEW.event_type is null) and (NEW.action is not null) then
    NEW.event_type := NEW.action;
  end if;

  return NEW;
end $$;


CREATE OR REPLACE FUNCTION "public"."add_order_note"("p_order_id" "uuid", "p_body" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'falcon_mvp', 'auth', 'extensions'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  v_id := public._activity_insert(p_order_id, 'note', p_body, null, v_uid);
  return v_id;
end;
$$;

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'appraiser'::"text" NOT NULL,
    "split" numeric,
    "avatar_url" "text",
    "display_name" "text",
    "bio" "text",
    "status" "text",
    "phone" "text",
    "auth_id" "uuid",
    "fee_split" numeric DEFAULT 50.00,
    "display_color" "text",
    "full_name" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "color" "text",
    "uid" "uuid",
    "is_admin" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_role_chk" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'manager'::"text", 'appraiser'::"text", 'reviewer'::"text"])))
);


CREATE OR REPLACE FUNCTION "public"."admin_list_users"() RETURNS SETOF "public"."users"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select *
  from public.users
  order by coalesce(display_name, full_name, name, email);
$$;


CREATE OR REPLACE FUNCTION "public"."assert_role"("roles" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if public.current_user_role() is null then
    raise exception 'Not authenticated';
  end if;
  if not (public.current_user_role() = any(roles)) then
    raise exception 'Permission denied for role %', public.current_user_role();
  end if;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."assign_order"("p_order_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'falcon_mvp', 'auth', 'extensions'
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  update falcon_mvp.orders
  set assigned_to = p_user_id
  where id = p_order_id;

  perform public._activity_insert(
    p_order_id,
    'assignment',
    case when p_user_id is null then 'Order unassigned' else 'Order assigned' end,
    jsonb_build_object('assigned_to', p_user_id),
    v_uid
  );
end;
$$;


CREATE OR REPLACE FUNCTION "public"."can_read_order"("p_order_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  col text;
  ok boolean;
begin
  -- Prefer view column 'id' or 'order_id'
  select case
         when exists (select 1 from information_schema.columns where table_schema='public' and table_name='v_orders_list_with_last_activity' and column_name='id')
           then 'id'
         when exists (select 1 from information_schema.columns where table_schema='public' and table_name='v_orders_list_with_last_activity' and column_name='order_id')
           then 'order_id'
         else null
  end into col;

  if col is not null then
    execute format('select exists (select 1 from public.v_orders_list_with_last_activity where %I = $1)', col)
      into ok using p_order_id;
    return coalesce(ok,false);
  end if;

  -- Fallback to base table id or order_id
  begin
    select exists (select 1 from public.orders o where o.id = p_order_id) into ok;
    return coalesce(ok,false);
  exception when undefined_column then
    select exists (select 1 from public.orders o where o.order_id = p_order_id) into ok;
    return coalesce(ok,false);
  end;
end;
$_$;


CREATE OR REPLACE FUNCTION "public"."client_metrics_rollup"("p_client_ids" bigint[]) RETURNS TABLE("client_id" bigint, "orders_count" integer, "avg_fee" numeric, "last_order_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
  with ids as (
    select unnest(p_client_ids)::bigint as id
  ),
  -- expand each AMC id into itself + its lenders; non-AMC stays as just itself
  members as (
    -- every id includes itself
    select i.id as owner_id, i.id as member_id
    from ids i
    union all
    -- if the id is an AMC, include all clients tied to it
    select i.id as owner_id, c.id as member_id
    from ids i
    join public.clients a on a.id = i.id
    join public.clients c on c.amc_id = a.id
    where lower(coalesce(a.category,'client')) = 'amc'
  )
  select
    m.owner_id as client_id,
    count(o.id)::int as orders_count,
    avg(o.fee_amount) as avg_fee,                                -- uses your v_orders_frontend fee column
    max(coalesce(o.date_ordered, o.created_at)) as last_order_at
  from members m
  left join public.v_orders_frontend o
    on o.client_id = m.member_id
  group by m.owner_id
$$;


CREATE OR REPLACE FUNCTION "public"."client_name_taken"("p_name" "text", "p_ignore_id" bigint DEFAULT NULL::bigint) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.clients c
    where lower(c.name) = lower(p_name)
      and (p_ignore_id is null or c.id <> p_ignore_id)
  );
$$;


CREATE OR REPLACE FUNCTION "public"."current_app_user_has_all_permissions"("p_permission_keys" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select not exists (
    select 1
      from unnest(coalesce(p_permission_keys, '{}'::text[])) requested(permission_key)
     where not exists (
       select 1
         from public.current_app_user_permission_keys() granted(permission_key)
        where granted.permission_key = requested.permission_key
     )
  );
$$;


CREATE OR REPLACE FUNCTION "public"."current_app_user_has_any_permission"("p_permission_keys" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
      from unnest(coalesce(p_permission_keys, '{}'::text[])) requested(permission_key)
      join public.current_app_user_permission_keys() granted(permission_key)
        on granted.permission_key = requested.permission_key
  );
$$;


CREATE OR REPLACE FUNCTION "public"."current_app_user_has_permission"("p_permission_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
      from public.current_app_user_permission_keys() k(permission_key)
     where k.permission_key = p_permission_key
  );
$$;


CREATE OR REPLACE FUNCTION "public"."current_app_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.id
    from public.users u
   where u.auth_id = auth.uid()
   limit 1;
$$;


CREATE OR REPLACE FUNCTION "public"."current_app_user_permission_keys"() RETURNS SETOF "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with current_user_ctx as (
    select public.current_app_user_id() as user_id
  ),
  legacy_roles as (
    select distinct lower(ur.role) as role_name
      from current_user_ctx c
      join public.user_roles ur
        on ur.user_id = c.user_id
     where c.user_id is not null
       and ur.role is not null
  ),
  owner_permissions as (
    select p.key
      from public.permissions p
     where exists (
       select 1
         from legacy_roles lr
        where lr.role_name = 'owner'
     )
  ),
  template_role_permissions as (
    select rp.permission_key as key
      from legacy_roles lr
      join public.roles r
        on r.company_id is null
       and lower(r.name) = lr.role_name
      join public.role_permissions rp
        on rp.role_id = r.id
  )
  select distinct key
    from (
      select key from owner_permissions
      union all
      select key from template_role_permissions
    ) permissions
   where key is not null
   order by key;
$$;


CREATE OR REPLACE FUNCTION "public"."current_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
      from public.user_roles ur
     where ur.user_id = public.current_app_user_id()
       and ur.role in ('owner', 'admin')
  );
$$;


CREATE OR REPLACE FUNCTION "public"."current_is_appraiser"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
      from public.user_roles ur
     where ur.user_id = public.current_app_user_id()
       and ur.role = 'appraiser'
  );
$$;


CREATE OR REPLACE FUNCTION "public"."current_public_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_user_id()
$$;


CREATE OR REPLACE FUNCTION "public"."current_user_has_role"("p_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = public.current_user_id()
      and ur.role = p_role
  )
$$;


CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.id
  from public.users u
  where u.auth_id = auth.uid()
  limit 1
$$;


CREATE OR REPLACE FUNCTION "public"."current_user_public_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_user_id()
$$;


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with ranked as (
    select
      ur.role,
      case ur.role
        when 'owner' then 1
        when 'admin' then 2
        when 'reviewer' then 3
        when 'appraiser' then 4
        when 'manager' then 5
        when 'associate' then 6
        else 100
      end as precedence
    from public.user_roles ur
    where ur.user_id = public.current_user_id()
  )
  select r.role
  from ranked r
  order by r.precedence
  limit 1
$$;


CREATE OR REPLACE FUNCTION "public"."fn_current_user_users_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.id
  from public.users u
  where u.auth_id = auth.uid()
  limit 1
$$;


CREATE OR REPLACE FUNCTION "public"."fn_to_auth_id"("p" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select id from auth.users where id = p),
    (select auth_id from public.users where id = p)
  );
$$;


CREATE OR REPLACE FUNCTION "public"."fn_to_users_id"("p" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select id from public.users where id = p),       -- already users.id
    (select id from public.users where auth_id = p)   -- auth uid supplied
  )
$$;


CREATE OR REPLACE FUNCTION "public"."get_admin_calendar_events"("p_from" timestamp with time zone DEFAULT ("now"() - '90 days'::interval), "p_to" timestamp with time zone DEFAULT ("now"() + '180 days'::interval)) RETURNS TABLE("id" "uuid", "event_type" "text", "title" "text", "start_at" timestamp with time zone, "end_at" timestamp with time zone, "order_id" "uuid", "appraiser_id" "uuid", "appraiser_name" "text", "appraiser_color" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select
    e.id, e.event_type, e.title, e.start_at, e.end_at,
    e.order_id, e.appraiser_id, e.appraiser_name, e.appraiser_color
  from public.v_admin_calendar_enriched e
  where e.start_at >= p_from and e.start_at < p_to
  order by e.start_at asc
$$;


CREATE OR REPLACE FUNCTION "public"."get_calendar_events"() RETURNS TABLE("order_id" "uuid", "client_id" "uuid", "assigned_appraiser_id" "uuid", "kind" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "title" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  -- Admin path
  select * from public.v_calendar_events
  where public.is_admin()
  union all
  -- Appraiser path (only if not admin)
  select * from public.v_calendar_events
  where public.is_appraiser()
    and not public.is_admin()
    and assigned_appraiser_id = auth.uid();
$$;


CREATE OR REPLACE FUNCTION "public"."get_calendar_events"("p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("order_id" "uuid", "kind" "text", "at" timestamp with time zone, "assigned_user_id_any" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select
    e.order_id,
    case
      when e.event_type = 'site_visit' then 'site_visit'
      else 'due'
    end as kind,
    e.start_at as at,
    e.appraiser_id as assigned_user_id_any
  from public.v_admin_calendar_enriched e
  where (p_from is null or e.start_at >= p_from)
    and (p_to   is null or e.start_at <  p_to)
  order by e.start_at asc;
$$;


CREATE OR REPLACE FUNCTION "public"."get_clients_for_user"() RETURNS TABLE("client_id" "text", "client_name" "text", "primary_contact_name" "text", "primary_contact_phone" "text", "total_orders" bigint, "avg_total_fee" numeric, "last_order_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  -- Admin: all clients
  select * from public.v_client_kpis
  where exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  union all
  -- Appraiser (not admin): only clients they’ve worked for
  select * from public.v_client_kpis_appraiser
  where exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'appraiser')
    and not exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin');
$$;


CREATE OR REPLACE FUNCTION "public"."get_order_activity_flexible"("p_order_id" "uuid") RETURNS TABLE("id" "text", "order_id" "uuid", "user_id" "text", "event" "text", "details" "jsonb", "created_at" timestamp with time zone, "user_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
declare
  id_col      text;
  order_col   text;
  user_col    text;
  event_col   text;
  details_col text;
  created_col text;
  sql         text;
begin
  -- detect columns that exist in public.activity_log
  select column_name into id_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('id','activity_id','log_id')
  limit 1;

  select column_name into order_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('order_id','orders_id','fk_order','orderid')
  limit 1;

  if order_col is null then
    raise exception 'activity_log has no order reference column (looked for: order_id, orders_id, fk_order, orderid)';
  end if;

  select column_name into user_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('user_id','actor_id','created_by','author_id')
  limit 1;

  select column_name into event_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('event','action','type','event_type','activity','status','message','label','title')
  limit 1;

  select column_name into details_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('details','meta','payload','data','extra')
  limit 1;

  select column_name into created_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('created_at','createdAt','inserted_at','created_on','timestamp','ts')
  limit 1;

  sql := format($fmt$
    select
      %s as id,
      a.%I::uuid as order_id,
      %s as user_id,
      %s as event,
      %s as details,
      %s as created_at,
      coalesce(up.display_name, up.full_name, u.display_name, u.full_name, u.email, %s) as user_name
    from public.activity_log a
    left join public.user_profiles up on %s
    left join public.users u on %s
    where a.%I = $1
    order by %s desc nulls last
  $fmt$,
    case when id_col is not null then 'a.'||quote_ident(id_col)||'::text' else 'null::text' end,
    order_col,
    case when user_col is not null then 'a.'||quote_ident(user_col)||'::text' else 'null::text' end,
    case when event_col is not null then 'a.'||quote_ident(event_col)||'::text'
         when details_col is not null then '(a.'||quote_ident(details_col)||'->>''event'')'
         else 'null::text' end,
    case when details_col is not null then 'a.'||quote_ident(details_col) else '''{}''::jsonb' end,
    case when created_col is not null then 'a.'||quote_ident(created_col) else 'now()' end,
    case when user_col is not null then 'a.'||quote_ident(user_col)||'::text' else 'null::text' end,
    case when user_col is not null then 'up.user_id = a.'||quote_ident(user_col) else 'false' end,
    case when user_col is not null then 'u.id = a.'||quote_ident(user_col) else 'false' end,
    order_col,
    case when created_col is not null then 'a.'||quote_ident(created_col) else 'now()' end
  );

  return query execute sql using p_order_id;
end;
$_$;


CREATE OR REPLACE FUNCTION "public"."get_order_activity_flexible_v3"("p_order_id" "uuid") RETURNS TABLE("id" "text", "order_id" "uuid", "user_id" "text", "event" "text", "details" "jsonb", "created_at" timestamp with time zone, "user_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
declare
  id_col      text;
  order_col   text;
  user_col    text;
  event_col   text;
  details_col text;
  created_col text;

  has_profiles      boolean;
  profiles_join_col text;

  has_users      boolean;
  users_join_col text;

  joins           text := '';
  user_name_expr  text := '';
  id_expr         text;
  order_expr      text;
  user_expr       text;
  event_expr      text;
  details_expr    text;
  created_expr    text;

  sql text;
begin
  -- Detect ACTIVITY_LOG columns
  select column_name into id_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('id','activity_id','log_id')
  limit 1;

  select column_name into order_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('order_id','orders_id','fk_order','orderid')
  limit 1;
  if order_col is null then
    raise exception 'activity_log has no order reference column (tried order_id, orders_id, fk_order, orderid)';
  end if;

  select column_name into user_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('user_id','actor_id','created_by','author_id')
  limit 1;

  select column_name into event_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('event','action','type','event_type','activity','status','message','label','title')
  limit 1;

  select column_name into details_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('details','meta','payload','data','extra','json')
  limit 1;

  select column_name into created_col
  from information_schema.columns
  where table_schema='public' and table_name='activity_log'
    and column_name in ('created_at','createdat','inserted_at','created_on','timestamp','ts')
  limit 1;

  -- Build base expressions
  id_expr      := case when id_col is not null then 'a.'||quote_ident(id_col)||'::text' else 'null::text' end;
  order_expr   := 'a.'||quote_ident(order_col)||'::uuid';
  user_expr    := case when user_col is not null then 'a.'||quote_ident(user_col)||'::text' else 'null::text' end;
  event_expr   := case
                    when event_col is not null then 'a.'||quote_ident(event_col)||'::text'
                    when details_col is not null then '(a.'||quote_ident(details_col)||'->>''event'')'
                    else 'null::text'
                  end;
  details_expr := case when details_col is not null then 'a.'||quote_ident(details_col) else '''{}''::jsonb' end;
  created_expr := case when created_col is not null then 'a.'||quote_ident(created_col) else 'now()' end;

  -- Optional joins to user_profiles / users (only if they exist + we have a user_col)
  select exists(
    select 1 from information_schema.tables
    where table_schema='public' and table_name='user_profiles'
  ) into has_profiles;

  if has_profiles and user_col is not null then
    select column_name into profiles_join_col
    from information_schema.columns
    where table_schema='public' and table_name='user_profiles'
      and column_name in ('user_id','id')
    limit 1;

    if profiles_join_col is not null then
      joins := joins || format(' left join public.user_profiles up on up.%I = a.%I ', profiles_join_col, user_col);

      -- Candidate name from user_profiles (quote-safe string)
      user_name_expr := 'nullif(trim(coalesce('||
        'row_to_json(up)->>''display_name'','||
        'row_to_json(up)->>''full_name'','||
        '(coalesce(row_to_json(up)->>''first_name'','''') || '' '' || coalesce(row_to_json(up)->>''last_name'','''')),'||
        'row_to_json(up)->>''email'','||
        'row_to_json(up)->>''name'')),'''')';
    end if;
  end if;

  select exists(
    select 1 from information_schema.tables
    where table_schema='public' and table_name='users'
  ) into has_users;

  if has_users and user_col is not null then
    select column_name into users_join_col
    from information_schema.columns
    where table_schema='public' and table_name='users'
      and column_name in ('id','user_id')
    limit 1;

    if users_join_col is not null then
      joins := joins || format(' left join public.users u on u.%I = a.%I ', users_join_col, user_col);

      -- Candidate name from users
      if user_name_expr <> '' then
        user_name_expr := 'coalesce('|| user_name_expr ||', '||
          'nullif(trim(coalesce('||
            'row_to_json(u)->>''display_name'','||
            'row_to_json(u)->>''full_name'','||
            '(coalesce(row_to_json(u)->>''first_name'','''') || '' '' || coalesce(row_to_json(u)->>''last_name'','''')),'||
            'row_to_json(u)->>''email'','||
            'row_to_json(u)->>''name'','||
            'row_to_json(u)->>''username'')),''''))';
      else
        user_name_expr :=
          'nullif(trim(coalesce('||
            'row_to_json(u)->>''display_name'','||
            'row_to_json(u)->>''full_name'','||
            '(coalesce(row_to_json(u)->>''first_name'','''') || '' '' || coalesce(row_to_json(u)->>''last_name'','''')),'||
            'row_to_json(u)->>''email'','||
            'row_to_json(u)->>''name'','||
            'row_to_json(u)->>''username'')),'''')';
      end if;
    end if;
  end if;

  if user_name_expr = '' then
    -- No profile/users table to draw from; fall back to raw user id
    user_name_expr := user_expr;
  else
    -- Fallback to raw user id if name is still null/empty
    user_name_expr := 'coalesce('|| user_name_expr ||', '|| user_expr ||')';
  end if;

  sql := format(
    'select %s as id, %s as order_id, %s as user_id, %s as event, %s as details, %s as created_at, %s as user_name '||
    'from public.activity_log a %s where a.%I = $1 order by %s desc nulls last',
    id_expr, order_expr, user_expr, event_expr, details_expr, created_expr, user_name_expr, joins, order_col, created_expr
  );

  return query execute sql using p_order_id;
end;
$_$;


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."import_orders_from_json"("payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  rec jsonb;
  v_client_id uuid;
  v_appraiser_id uuid;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    -- ensure client
    SELECT id INTO v_client_id FROM public.clients WHERE name = rec->>'client' LIMIT 1;
    IF v_client_id IS NULL AND rec->>'client' IS NOT NULL THEN
      INSERT INTO public.clients (name) VALUES (rec->>'client')
      ON CONFLICT (name) DO NOTHING;
      SELECT id INTO v_client_id FROM public.clients WHERE name = rec->>'client' LIMIT 1;
    END IF;

    -- resolve appraiser by full_name (added in step 1)
    SELECT id INTO v_appraiser_id FROM public.users WHERE full_name = rec->>'appraiser_name' LIMIT 1;

    INSERT INTO public.orders (
      external_order_no,
      address,
      special_instructions,
      client_id,
      appraiser_id,
      property_type,
      fee_amount,
      date_ordered,
      due_for_review,
      due_to_client,
      inspection_date,
      date_billed,
      date_paid
    )
    VALUES (
      NULLIF(rec->>'order_number',''),
      NULLIF(rec->>'address',''),
      NULLIF(rec->>'special_instruction',''),
      v_client_id,
      v_appraiser_id,
      NULLIF(rec->>'property_type',''),
      NULLIF(rec->>'fee','')::numeric,
      CASE WHEN (rec->>'date_ordered') ~ '^\d{4}-\d{2}-\d{2}' THEN (rec->>'date_ordered')::date END,
      CASE WHEN (rec->>'due_for_review') ~ '^\d{4}-\d{2}-\d{2}' THEN (rec->>'due_for_review')::date END,
      CASE WHEN (rec->>'due_to_client') ~ '^\d{4}-\d{2}-\d{2}' THEN (rec->>'due_to_client')::date END,
      CASE WHEN (rec->>'inspection_date') ~ '^\d{4}-\d{2}-\d{2}' THEN (rec->>'inspection_date')::date END,
      CASE WHEN (rec->>'date_billed') ~ '^\d{4}-\d{2}-\d{2}' THEN (rec->>'date_billed')::date END,
      CASE WHEN (rec->>'date_paid') ~ '^\d{4}-\d{2}-\d{2}' THEN (rec->>'date_paid')::date END
    )
    ON CONFLICT (external_order_no) DO UPDATE
    SET
      address = EXCLUDED.address,
      special_instructions = EXCLUDED.special_instructions,
      client_id = COALESCE(EXCLUDED.client_id, client_id),
      appraiser_id = COALESCE(EXCLUDED.appraiser_id, appraiser_id),
      property_type = EXCLUDED.property_type,
      fee_amount = COALESCE(EXCLUDED.fee_amount, fee_amount),
      date_ordered = COALESCE(EXCLUDED.date_ordered, date_ordered),
      due_for_review = COALESCE(EXCLUDED.due_for_review, due_for_review),
      due_to_client = COALESCE(EXCLUDED.due_to_client, due_to_client),
      inspection_date = COALESCE(EXCLUDED.inspection_date, inspection_date),
      date_billed = COALESCE(EXCLUDED.date_billed, date_billed),
      date_paid = COALESCE(EXCLUDED.date_paid, date_paid);
  END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_is_admin()
$$;


CREATE OR REPLACE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_is_admin()
$$;


CREATE OR REPLACE FUNCTION "public"."is_appraiser"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_is_appraiser()
$$;


CREATE OR REPLACE FUNCTION "public"."is_reviewer"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(lower(public.current_user_role()), '') = 'reviewer'
$$;


CREATE OR REPLACE FUNCTION "public"."log_activity"("p_target_type" "text", "p_target_id" "uuid", "p_event" "text", "p_meta" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  insert into public.activity_events (actor_id, target_type, target_id, event, meta)
  values (auth.uid(), p_target_type, p_target_id, p_event, coalesce(p_meta,'{}'::jsonb));
$$;


CREATE OR REPLACE FUNCTION "public"."log_activity"("p_order_id" "uuid", "p_event_type" "text", "p_message" "text", "p_prev_status" "text" DEFAULT NULL::"text", "p_new_status" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.activity_log (
    id, order_id, user_id, event_type, message,
    prev_status, new_status, created_at, actor_id
  ) values (
    v_id, p_order_id, null, p_event_type, p_message,
    p_prev_status, p_new_status, now(), auth.uid()
  );
  return v_id;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."log_order_activity"("p_order_id" "uuid", "p_action" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  has_created_by boolean;
  has_user_id    boolean;
  has_event      boolean;
  has_message    boolean;

  uid uuid := auth.uid();

  raw text := coalesce(nullif(p_action,''), 'note');
  base text := lower(split_part(raw, ':', 1));
  ev   text := regexp_replace(base, '[^a-z_]', '', 'g');  -- sanitize to [a-z_]
  det  text := nullif(split_part(raw, ':', 2), '');
  msg  text := nullif(p_note, '');

begin
  if ev is null or ev = '' then
    ev := 'note';
  end if;

  -- If we have a detail (e.g., set_status:ready_to_send), append to message
  if det is not null then
    msg := coalesce(msg, '');
    if msg <> '' then
      msg := msg || ' ';
    end if;
    msg := msg || '(' || replace(det, '_', ' ') || ')';
  end if;

  -- Discover columns at runtime (schema-aware)
  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='order_activity' and column_name='created_by')
    into has_created_by;

  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='order_activity' and column_name='user_id')
    into has_user_id;

  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='order_activity' and column_name='event')
    into has_event;

  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='order_activity' and column_name='message')
    into has_message;

  -- Insert, choosing columns that exist
  if has_event and has_message and has_created_by then
    insert into public.order_activity(order_id, event, message, action, note, created_by)
    values (p_order_id, ev, coalesce(msg, ''), raw, p_note, uid);

  elsif has_event and has_message and has_user_id then
    insert into public.order_activity(order_id, event, message, action, note, user_id)
    values (p_order_id, ev, coalesce(msg, ''), raw, p_note, uid);

  elsif has_event and has_created_by then
    insert into public.order_activity(order_id, event, action, note, created_by)
    values (p_order_id, ev, raw, p_note, uid);

  elsif has_event and has_user_id then
    insert into public.order_activity(order_id, event, action, note, user_id)
    values (p_order_id, ev, raw, p_note, uid);

  elsif has_created_by then
    insert into public.order_activity(order_id, action, note, created_by)
    values (p_order_id, raw, p_note, uid);

  elsif has_user_id then
    insert into public.order_activity(order_id, action, note, user_id)
    values (p_order_id, raw, p_note, uid);

  else
    -- very unlikely fallback
    insert into public.order_activity(order_id, event, action, note)
    values (p_order_id, ev, raw, p_note);
  end if;
end;
$$;


CREATE TABLE IF NOT EXISTS "public"."order_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "event" "text" DEFAULT 'note'::"text" NOT NULL,
    "details" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "action" "text",
    "note" "text",
    "user_uid" "uuid",
    CONSTRAINT "order_activity_event_check" CHECK ((("event" ~ '^[a-z_]+$'::"text") AND ("length"("event") > 0)))
);


CREATE OR REPLACE FUNCTION "public"."log_order_activity"("p_details" "text", "p_event" "text", "p_order_id" "uuid", "p_user_id" "uuid") RETURNS "public"."order_activity"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  rec public.order_activity;
begin
  insert into public.order_activity(order_id, user_id, event, details)
  values (p_order_id, p_user_id, p_event, nullif(p_details, ''))
  returning * into rec;

  return rec;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."log_order_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor uuid := public.current_app_user_id();
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_log (
      order_id,
      event_type,
      event_data,
      environment,
      actor,
      created_at
    )
    values (
      NEW.id,
      'order_created',
      '{}'::jsonb,
      current_setting('app.environment', true),
      v_actor,
      now()
    );
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.assigned_to is distinct from OLD.assigned_to then
      insert into public.activity_log (
        order_id,
        event_type,
        event_data,
        environment,
        actor,
        created_at
      )
      values (
        NEW.id,
        'assigned_to_appraiser',
        jsonb_build_object(
          'old_assigned_to', coalesce(OLD.assigned_to::text, ''),
          'new_assigned_to', coalesce(NEW.assigned_to::text, '')
        ),
        current_setting('app.environment', true),
        v_actor,
        now()
      );
    end if;

    if NEW.status is distinct from OLD.status then
      insert into public.activity_log (
        order_id,
        event_type,
        event_data,
        environment,
        actor,
        created_at
      )
      values (
        NEW.id,
        'status_changed',
        jsonb_build_object(
          'from', coalesce(OLD.status, ''),
          'to', coalesce(NEW.status, '')
        ),
        current_setting('app.environment', true),
        v_actor,
        now()
      );
    end if;

    return NEW;
  end if;

  return NEW;
end;
$$;


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" bigint NOT NULL,
    "name" "text",
    "company" "text",
    "notes" "text",
    "created_at" timestamp with time zone,
    "company_group" "text",
    "contacts" "jsonb",
    "default_instructions" "text",
    "preferred_delivery" "text",
    "company_address" "text",
    "contact_name_2" "text",
    "contact_phone_2" "text",
    "contact_email_2" "text",
    "parent_id" bigint,
    "contact_name_1" "text",
    "contact_phone_1" "text",
    "contact_email_1" "text",
    "client_type" "text",
    "is_archived" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "kind" "text",
    "amc_legacy_id" "uuid",
    "category" "text",
    "is_merged" boolean DEFAULT false,
    "merged_into_id" bigint,
    "amc_id" bigint,
    CONSTRAINT "clients_category_check" CHECK (("category" = ANY (ARRAY['amc'::"text", 'lender'::"text", 'client'::"text"]))),
    CONSTRAINT "clients_kind_chk" CHECK (("kind" = ANY (ARRAY['client'::"text", 'amc'::"text", 'borrower'::"text", 'lender'::"text"])))
);


CREATE OR REPLACE FUNCTION "public"."merge_clients"("p_source_id" bigint, "p_target_id" bigint, "p_strategy" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."clients"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
declare
  s public.clients;
  t public.clients;
  v_fill boolean := coalesce((p_strategy->>'fill_missing_from_source')::boolean, true);
  v_overwrite text[] := coalesce(string_to_array(coalesce(p_strategy->>'prefer_source_fields',''), ','), array[]::text[]);
  v_col text;
begin
  if p_source_id is null or p_target_id is null or p_source_id = p_target_id then
    raise exception 'Invalid merge ids';
  end if;

  select * into s from public.clients where id = p_source_id;
  if not found then raise exception 'Source client % not found', p_source_id; end if;

  select * into t from public.clients where id = p_target_id;
  if not found then raise exception 'Target client % not found', p_target_id; end if;

  -- 1) Move FKs we actually have
  perform public._maybe_move_fk('public.orders', 'client_id', p_source_id, p_target_id);

  -- 2) If TARGET is an AMC, retarget any clients that were pointing to SOURCE
  if lower(coalesce(t.category, '')) = 'amc' then
    update public.clients
       set amc_id = p_target_id
     where amc_id = p_source_id;
  end if;

  -- 3) Consolidate fields using dynamic SQL
  for v_col in
    select unnest(array[
      'name','status','category','notes',
      'contact_name_1','contact_email_1','contact_phone_1',
      'amc_id'
    ])
  loop
    if v_col = any (v_overwrite) then
      -- Overwrite target with source column value
      execute format(
        'update public.clients set %1$I = (select %1$I from public.clients where id = $1) where id = $2',
        v_col
      ) using p_source_id, p_target_id;

    elsif v_fill then
      -- Fill target nulls from source column value
      execute format(
        'update public.clients set %1$I = coalesce(%1$I, (select %1$I from public.clients where id = $1)) where id = $2',
        v_col
      ) using p_source_id, p_target_id;
    end if;
  end loop;

  -- 4) Mark source merged and (if blank) set inactive
  update public.clients
     set is_merged = true,
         merged_into_id = p_target_id,
         status = coalesce(nullif(status,''), 'inactive')
   where id = p_source_id;

  -- 5) Return the surviving row
  select * into t from public.clients where id = p_target_id;
  return t;
end
$_$;


CREATE OR REPLACE FUNCTION "public"."next_order_number"("p_year" integer) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  seq int;
begin
  insert into public.order_counters(year, last_seq)
  values (p_year, 0)
  on conflict (year) do nothing;

  update public.order_counters
     set last_seq = last_seq + 1
   where year = p_year
  returning last_seq into seq;

  return p_year::text || lpad(seq::text, 3, '0');
end;
$$;


CREATE OR REPLACE FUNCTION "public"."notify_admins"("p_title" "text", "p_body" "text", "p_message" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.rpc_notify_admins(p_title, p_body, p_message);
$$;


CREATE OR REPLACE FUNCTION "public"."notify_safe"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if p_user_id is null then
    return false;
  end if;
  perform public.rpc_notify_user(p_user_id, p_title, p_body, p_message);
  return true;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."remap_user_id"("from_id" "uuid", "to_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.orders            set appraiser_id = to_id where appraiser_id = from_id;
  update public.order_assignments set user_id      = to_id where user_id      = from_id;
  update public.review_flow       set assigned_to  = to_id where assigned_to  = from_id;
  update public.review_flow       set assigned_by  = to_id where assigned_by  = from_id;
  update public.activity_log      set user_id      = to_id where user_id      = from_id;
  update public.notifications     set user_id      = to_id where user_id      = from_id;
  update public.user_settings     set user_id      = to_id where user_id      = from_id;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."replace_view_from_source"("target_view" "text", "source_view" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  cols_target record;
  cols_source text[];
  select_list text := '';
  first boolean := true;
  sql text;
begin
  -- Collect source column names (lowercased) for quick membership checks
  select array_agg(lower(column_name) order by ordinal_position)
  into cols_source
  from information_schema.columns
  where table_schema='public' and table_name=source_view;

  if cols_source is null then
    raise exception 'Source view %.% not found or has no columns', 'public', source_view;
  end if;

  -- Build SELECT list in the exact order of the target view’s columns
  for cols_target in
    select column_name, data_type, udt_name, ordinal_position
    from information_schema.columns
    where table_schema='public' and table_name=target_view
    order by ordinal_position
  loop
    if not first then
      select_list := select_list || ', ';
    else
      first := false;
    end if;

    if lower(cols_target.column_name) = any(cols_source) then
      -- Column exists in source; select it directly
      select_list := select_list
        || format('%I', cols_target.column_name);
    else
      -- Column missing in source; fill with NULL casted to the target column type
      -- Use udt_name for precise type (handles e.g. uuid, timestamptz) when possible
      select_list := select_list
        || format('NULL::%s as %I',
                  -- prefer udt_name (already schema-resolved), fallback to data_type
                  case when cols_target.udt_name is not null then cols_target.udt_name else cols_target.data_type end,
                  cols_target.column_name);
    end if;
  end loop;

  -- Construct and run CREATE OR REPLACE VIEW
  sql := format('create or replace view public.%I as select %s from public.%I;', target_view, select_list, source_view);
  execute sql;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_admin_set_user_active"("p_user_id" "uuid", "p_is_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not public.current_is_admin() then
    raise exception 'Only owner/admin can change active status';
  end if;

  update public.user_profiles
  set is_active = p_is_active,
      status = case when p_is_active then 'active' else 'inactive' end,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_admin_set_user_role"("p_user_id" "uuid", "p_role" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- owner-only
  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'owner'
  ) then
    raise exception 'Only owner can change roles';
  end if;

  if p_role not in ('owner','admin','appraiser','associate','reviewer') then
    raise exception 'Invalid role: %', p_role;
  end if;

  -- Update if exists
  update public.user_roles
  set role = p_role,
      updated_at = now()
  where user_id = p_user_id;

  -- Insert if it didn't exist
  if not found then
    insert into public.user_roles (user_id, role, created_at, updated_at)
    values (p_user_id, p_role, now(), now());
  end if;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_admin_update_user_profile"("p_user_id" "uuid", "p_display_name" "text" DEFAULT NULL::"text", "p_full_name" "text" DEFAULT NULL::"text", "p_name" "text" DEFAULT NULL::"text", "p_color" "text" DEFAULT NULL::"text", "p_display_color" "text" DEFAULT NULL::"text", "p_avatar_url" "text" DEFAULT NULL::"text", "p_fee_split" numeric DEFAULT NULL::numeric, "p_split" numeric DEFAULT NULL::numeric, "p_split_pct" numeric DEFAULT NULL::numeric, "p_phone" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not public.current_is_admin() then
    raise exception 'Only owner/admin can update profiles';
  end if;

  -- Create row if missing (no ON CONFLICT needed)
  if not exists (select 1 from public.user_profiles where user_id = p_user_id) then
    insert into public.user_profiles (user_id, created_at, updated_at)
    values (p_user_id, now(), now());
  end if;

  update public.user_profiles
  set
    display_name  = coalesce(p_display_name, display_name),
    full_name     = coalesce(p_full_name, full_name),
    name          = coalesce(p_name, name),
    color         = coalesce(p_color, color),
    display_color = coalesce(p_display_color, display_color),
    avatar_url    = coalesce(p_avatar_url, avatar_url),
    fee_split     = coalesce(p_fee_split, fee_split),
    split         = coalesce(p_split, split),
    split_pct     = coalesce(p_split_pct, split_pct),
    phone         = coalesce(p_phone, phone),
    status        = coalesce(p_status, status),
    is_active     = coalesce(p_is_active, is_active),
    updated_at    = now()
  where user_id = p_user_id;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_admin_users_set_active"("p_user_id" "uuid", "p_is_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  me_is_admin boolean;
begin
  select (u.role = 'owner' or u.is_admin = true)
    into me_is_admin
  from public.users u
  where u.auth_id = auth.uid()
  limit 1;

  if coalesce(me_is_admin, false) is not true then
    raise exception 'not authorized';
  end if;

  update public.users
  set
    is_active  = p_is_active,
    status     = case when p_is_active then 'active' else 'inactive' end,
    updated_at = now()
  where id = p_user_id;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_admin_users_update"("p_user_id" "uuid", "p_patch" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
begin
  perform public.rpc_admin_update_user_profile(
    p_user_id        => p_user_id,
    p_display_name   => nullif(v_patch->>'display_name', ''),
    p_full_name      => nullif(v_patch->>'full_name', ''),
    p_name           => nullif(v_patch->>'name', ''),
    p_color          => nullif(v_patch->>'color', ''),
    p_display_color  => nullif(v_patch->>'display_color', ''),
    p_avatar_url     => nullif(v_patch->>'avatar_url', ''),
    p_fee_split      => case when v_patch ? 'fee_split' and nullif(v_patch->>'fee_split', '') is not null then (v_patch->>'fee_split')::numeric else null end,
    p_split          => case when v_patch ? 'split' and nullif(v_patch->>'split', '') is not null then (v_patch->>'split')::numeric else null end,
    p_split_pct      => case when v_patch ? 'split_pct' and nullif(v_patch->>'split_pct', '') is not null then (v_patch->>'split_pct')::numeric else null end,
    p_phone          => nullif(v_patch->>'phone', ''),
    p_status         => nullif(v_patch->>'status', ''),
    p_is_active      => case when v_patch ? 'is_active' and nullif(v_patch->>'is_active', '') is not null then (v_patch->>'is_active')::boolean else null end
  );

  update public.users u
     set
       role          = case when v_patch ? 'role' then nullif(v_patch->>'role','') else u.role end,
       fee_split     = case when v_patch ? 'fee_split' and nullif(v_patch->>'fee_split','') is not null then (v_patch->>'fee_split')::numeric else u.fee_split end,
       split         = case when v_patch ? 'split' and nullif(v_patch->>'split','') is not null then (v_patch->>'split')::numeric else u.split end,
       display_name  = case when v_patch ? 'display_name' then nullif(v_patch->>'display_name','') else u.display_name end,
       full_name     = case when v_patch ? 'full_name' then nullif(v_patch->>'full_name','') else u.full_name end,
       name          = case when v_patch ? 'name' then nullif(v_patch->>'name','') else u.name end,
       color         = case when v_patch ? 'color' then nullif(v_patch->>'color','') else u.color end,
       display_color = case when v_patch ? 'display_color' then nullif(v_patch->>'display_color','') else u.display_color end,
       avatar_url    = case when v_patch ? 'avatar_url' then nullif(v_patch->>'avatar_url','') else u.avatar_url end,
       is_active     = case when v_patch ? 'is_active' and nullif(v_patch->>'is_active','') is not null then (v_patch->>'is_active')::boolean else u.is_active end,
       status        = case when v_patch ? 'status' then nullif(v_patch->>'status','') else u.status end,
       phone         = case when v_patch ? 'phone' then nullif(v_patch->>'phone','') else u.phone end,
       updated_at    = now()
   where u.id = p_user_id;

  if v_patch ? 'role' and nullif(v_patch->>'role','') is not null then
    insert into public.user_roles(user_id, role, created_at, updated_at)
    values (p_user_id, lower(trim(v_patch->>'role')), now(), now())
    on conflict (user_id) do update
    set
      role = excluded.role,
      updated_at = now();
  end if;
end;
$$;


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "address" "text",
    "status" "text",
    "due_date" "date",
    "appraiser_split" numeric,
    "base_fee" numeric,
    "manual_client" "text",
    "notes" "text",
    "site_visit_date" "date",
    "client_id" bigint,
    "appraiser_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "client_invoice_amount" numeric,
    "paid_status" "text" DEFAULT 'unpaid'::"text",
    "report_type" "text",
    "property_type" "text",
    "review_due_date" "date",
    "appraiser_fee" numeric,
    "branch_id" bigint,
    "city" "text",
    "county" "text",
    "state" "text",
    "zip" "text",
    "site_visit_at" timestamp without time zone,
    "review_stage" "text" DEFAULT 'not_started'::"text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "title" "text",
    "assigned_to" "uuid",
    "order_number" "text",
    "review_due_at" timestamp with time zone,
    "client_due_at" timestamp with time zone,
    "final_due_at" timestamp with time zone,
    "manual_appraiser" "text",
    "property_address" "text",
    "postal_code" "text",
    "location" "jsonb",
    "client_invoice" "text",
    "paid_at" timestamp with time zone,
    "current_reviewer_id" "uuid",
    "review_route" "jsonb",
    "review_claimed_by" "uuid",
    "review_claimed_at" timestamp with time zone,
    "archived" boolean DEFAULT false,
    "reviewer_id" "uuid",
    "amc_id" "uuid",
    "external_order_no" "text",
    "special_instructions" "text",
    "fee_amount" numeric,
    "date_ordered" "date",
    "due_for_review" "date",
    "due_to_client" "date",
    "inspection_date" "date",
    "date_billed" "date",
    "date_paid" "date",
    "managing_amc_id" bigint,
    "manual_client_name" "text",
    "invoice_number" "text",
    "invoice_paid" boolean DEFAULT false NOT NULL,
    "split_pct" numeric(5,2),
    "entry_contact_name" "text",
    "entry_contact_phone" "text",
    "property_contact_name" "text",
    "property_contact_phone" "text",
    "access_notes" "text",
    "owner_id" "uuid",
    CONSTRAINT "chk_orders_amc_diff" CHECK ((("managing_amc_id" IS NULL) OR ("managing_amc_id" <> "client_id"))),
    CONSTRAINT "orders_status_valid" CHECK ((("status" IS NULL) OR ("status" = ANY (ARRAY['new'::"text", 'in_progress'::"text", 'in_review'::"text", 'needs_revisions'::"text", 'review_cleared'::"text", 'pending_final_approval'::"text", 'ready_for_client'::"text", 'completed'::"text"]))))
);


CREATE OR REPLACE FUNCTION "public"."rpc_assign_next_reviewer"("order_id" "uuid") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r public.orders;
  next_reviewer uuid;
begin
  select (review_route->'steps'->0->>'reviewer_id')::uuid
    into next_reviewer
  from public.orders
  where id = order_id;

  if next_reviewer is null then
    raise exception 'No reviewer in route';
  end if;

  update public.orders
     set current_reviewer_id = next_reviewer,
         updated_at          = now()
   where id = order_id
  returning * into r;

  return r;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_appraiser_id" "uuid") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare v_prev uuid; v_row public.orders; begin
select appraiser_id into v_prev from public.orders where id = p_order_id for update;
update public.orders set appraiser_id = p_appraiser_id, updated_at = now() where id = p_order_id returning * into v_row;
perform public.rpc_log_event(p_order_id, 'assigned_appraiser', 'Assigned to appraiser', null, null,
jsonb_build_object('prev_appraiser_id', v_prev, 'new_appraiser_id', p_appraiser_id));
return v_row;
end $$;


CREATE OR REPLACE FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_assigned_to" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.orders;
  v_actor uuid := public.current_app_user_id();
begin
  if v_actor is null then
    raise exception 'current app user not found';
  end if;

  update public.orders
     set assigned_to = p_assigned_to,
         updated_at = now()
   where id = p_order_id
   returning * into v_row;

  insert into public.activity_log(order_id, actor_user_id, action, message)
  values (p_order_id, v_actor, 'assignment', coalesce(p_note, 'assigned'));
  return v_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_assign_reviewer"("order_id" "uuid", "reviewer_id" "uuid") RETURNS "public"."orders"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.orders
     SET current_reviewer_id = reviewer_id,
         updated_at          = now()
   WHERE id = order_id
  RETURNING *;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_bootstrap_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare has_admin boolean;
begin
  select exists(select 1 from public.user_roles where role='admin') into has_admin;
  if has_admin then return false; end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'admin')
  on conflict do nothing;
  return true;
end $$;


CREATE TABLE IF NOT EXISTS "public"."email_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "to_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "template" "text" NOT NULL,
    "payload" "jsonb",
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "claimed_at" timestamp with time zone,
    "locked_by" "text",
    "error" "text"
);


CREATE OR REPLACE FUNCTION "public"."rpc_claim_email_batch_v1"("p_limit" integer, "p_worker" "text" DEFAULT 'edge'::"text") RETURNS SETOF "public"."email_queue"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  with c as (
    select id
    from public.email_queue
    where status = 'queued'
    order by created_at
    for update skip locked
    limit greatest(p_limit, 1)
  )
  update public.email_queue q
     set status = 'sending',
         attempts = q.attempts + 1,
         claimed_at = now(),
         locked_by = p_worker
   where q.id in (select id from c)
  returning q.*;
end;
$$;


CREATE TABLE IF NOT EXISTS "public"."email_outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "uuid",
    "to_user_id" "uuid" NOT NULL,
    "to_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body_text" "text",
    "body_html" "text",
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone
);


CREATE OR REPLACE FUNCTION "public"."rpc_claim_email_outbox"("p_limit" integer DEFAULT 25) RETURNS SETOF "public"."email_outbox"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception using
    errcode = '55000',
    message = 'rpc_claim_email_outbox is deprecated',
    hint = 'Use public.rpc_claim_email_batch_v1 (canonical email_queue).';
  return query select * from public.email_outbox where false;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_client_create"("p" "jsonb") RETURNS "public"."clients"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r public.clients;
begin
  if lower(public.current_user_role()) <> 'admin' then
    raise exception 'Only admins can create clients';
  end if;

  insert into public.clients (name, contact_name, contact_email, status, phone, notes)
  values (
    nullif(trim((p->>'name')::text), ''),
    (p->>'contact_name')::text,
    (p->>'contact_email')::text,
    coalesce(nullif(trim((p->>'status')::text), ''),'active'),
    (p->>'phone')::text,
    (p->>'notes')::text
  )
  returning * into r;

  return r;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_client_delete"("p_client_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if lower(public.current_user_role()) <> 'admin' then
    raise exception 'Only admins can delete clients';
  end if;

  delete from public.clients where id::text = p_client_id;
  return true;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_client_update"("p_client_id" "text", "p_patch" "jsonb") RETURNS "public"."clients"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r public.clients;
begin
  if lower(public.current_user_role()) <> 'admin' then
    raise exception 'Only admins can update clients';
  end if;

  update public.clients
     set name          = coalesce(nullif(trim((p_patch->>'name')::text),''), name),
         contact_name  = coalesce((p_patch->>'contact_name')::text, contact_name),
         contact_email = coalesce((p_patch->>'contact_email')::text, contact_email),
         status        = coalesce(nullif(trim((p_patch->>'status')::text),''), status),
         phone         = coalesce((p_patch->>'phone')::text, phone),
         notes         = coalesce((p_patch->>'notes')::text, notes)
   where id::text = p_client_id
  returning * into r;

  if not found then
    raise exception 'Client not found';
  end if;

  return r;
end;
$$;


CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "order_id" "uuid",
    "appraiser_id" "uuid",
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "location" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "appraiser_user_id" "uuid",
    CONSTRAINT "calendar_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['site_visit'::"text", 'due_for_review'::"text", 'due_to_client'::"text"])))
);


CREATE OR REPLACE FUNCTION "public"."rpc_create_calendar_event"("p_event_type" "text", "p_title" "text", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_order_id" "uuid" DEFAULT NULL::"uuid", "p_appraiser_id" "uuid" DEFAULT NULL::"uuid", "p_location" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "public"."calendar_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_row public.calendar_events;
begin
  insert into public.calendar_events(event_type,title,start_at,end_at,order_id,appraiser_id,created_by,location,notes)
  values (p_event_type, p_title, p_start_at, p_end_at, p_order_id, p_appraiser_id, auth.uid(), p_location, p_notes)
  returning * into v_row;
  return v_row;
end $$;


CREATE OR REPLACE FUNCTION "public"."rpc_create_client"("patch" "jsonb") RETURNS "public"."clients"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  insert into public.clients (name, status)
  values (nullif(patch->>'name',''), coalesce(nullif(patch->>'status',''), 'active'))
  returning *;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_create_order"("payload" "jsonb") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_client_id   bigint;
  v_manual      text;
  v_appraiser   uuid;
  v_row         public.orders;
begin
  v_client_id := nullif(payload->>'client_id','')::bigint;
  v_manual    := nullif(payload->>'manual_client','');
  v_appraiser := nullif(payload->>'appraiser_id','')::uuid;

  -- If a client_id was passed, ensure it exists (or allow manual-only)
  if v_client_id is not null and not exists (select 1 from public.clients c where c.id = v_client_id) then
    if v_manual is not null then
      v_client_id := null; -- allow manual-only order
    else
      raise exception 'Unknown client_id: %', v_client_id using errcode = '23503';
    end if;
  end if;

  insert into public.orders (
    client_id, manual_client, appraiser_id, order_number,
    property_address, city, state, postal_code,
    base_fee, appraiser_fee, appraiser_split, notes,
    status, created_at, updated_at
  ) values (
    v_client_id, v_manual, v_appraiser, nullif(payload->>'order_number',''),
    nullif(payload->>'property_address',''), nullif(payload->>'city',''), nullif(payload->>'state',''), nullif(payload->>'postal_code',''),
    nullif(payload->>'base_fee','')::numeric,
    nullif(payload->>'appraiser_fee','')::numeric,
    nullif(payload->>'appraiser_split','')::numeric,
    nullif(payload->>'notes',''),
    coalesce(nullif(payload->>'status',''),'new'),
    now(), now()
  )
  returning * into v_row;

  return v_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_debug_notifications_access"() RETURNS TABLE("ok" boolean, "rows_seen" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  select true, (select count(*) from public.notifications n where n.user_id = auth.uid())::int;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_delete_client"("client_id" bigint) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  delete from public.clients where id = client_id;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_dismiss_notification"("p_notification_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count int;
begin
  update public.notifications
     set dismissed_at = coalesce(dismissed_at, now()),
         read_at = coalesce(read_at, now())
   where id = p_notification_id
     and user_id = public.current_app_user_id();

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_dismiss_seen_notifications"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count int;
begin
  update public.notifications
     set dismissed_at = coalesce(dismissed_at, now())
   where user_id = public.current_app_user_id()
     and read_at is not null
     and dismissed_at is null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_enqueue_email_v1"("p_user_id" "uuid", "p_subject" "text", "p_template" "text", "p_to_email" "text" DEFAULT NULL::"text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_email text;
  v_id uuid;
begin
  if p_user_id is null and p_to_email is null then
    raise exception 'Either p_user_id or p_to_email must be provided';
  end if;

  if p_to_email is not null then
    v_email := p_to_email;
  else
    select u.email into v_email from public.users u where u.id = p_user_id;
  end if;

  if v_email is null or length(v_email) < 3 then
    raise exception 'No valid email for user %', p_user_id;
  end if;

  insert into public.email_queue (user_id, to_email, subject, template, payload)
  values (p_user_id, v_email, p_subject, p_template, p_payload)
  returning id into v_id;

  return v_id;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_get_activity_feed"("p_order_id" "uuid") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "event_type" "text", "title" "text", "body" "text", "actor_name" "text", "actor_role" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select
    al.id,
    al.created_at,
    coalesce(al.event_type, al.action, 'event')::text as event_type,
    case
      when coalesce(al.event_type, '') = 'note' then 'Note added'
      when coalesce(al.action, '') = 'status_changed' then 'Status changed'
      when coalesce(al.action, '') = 'order_created' then 'Order created'
      else coalesce(al.action, al.event_type, 'Update')
    end::text as title,
    case
      when al.event_type = 'note' then
        coalesce(
          al.message,
          al.detail->>'note',
          al.detail->>'message',
          al.detail::text,
          ''
        )
      else
        coalesce(al.message, al.detail::text, al.context::text, '')
    end::text as body,
    coalesce(al.actor_name, al.created_by_name, al.created_by_email, '')::text as actor_name,
    coalesce(al.role, '')::text as actor_role
  from public.activity_log al
  where al.order_id = p_order_id
  order by al.created_at desc
  limit 200;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(public.current_user_role(), 'appraiser')
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_get_next_order_number"("p_company_key" "text" DEFAULT 'falcon_default'::"text", "p_effective_at" timestamp with time zone DEFAULT "now"()) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


CREATE OR REPLACE FUNCTION "public"."rpc_get_notification_prefs_v1"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("type" "text", "channel" "text", "enabled" boolean, "meta" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  select up.type, up.channel, up.enabled, up.meta
  from public.user_notification_prefs up
  where up.user_id = coalesce(p_user_id, auth.uid());
end;
$$;


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" "text",
    "message" "text",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "order_id" "uuid",
    "event_id" "uuid",
    "action" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "priority" "text",
    "link_path" "text",
    "payload" "jsonb",
    "read_at" timestamp with time zone,
    "category" "text",
    "title" "text",
    "body" "text",
    "dismissed_at" timestamp with time zone
);


CREATE OR REPLACE FUNCTION "public"."rpc_get_notifications"("p_limit" integer DEFAULT 50, "p_before" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS SETOF "public"."notifications"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select *
    from public.notifications n
   where n.user_id = public.current_app_user_id()
     and (p_before is null or n.created_at < p_before)
   order by n.created_at desc
   limit coalesce(p_limit, 50);
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_get_unread_count"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select count(*)::int
    from public.notifications n
   where n.user_id = public.current_app_user_id()
     and n.read_at is null;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_is_client_name_available"("p_name" "text", "p_ignore_client_id" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with c as (
    select count(*)::int as n
    from public.clients
    where lower(name) = lower(coalesce(p_name,''))
      and (
        p_ignore_client_id is null
        or (id::text <> p_ignore_client_id)
      )
  )
  select (n = 0) from c;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_is_order_number_available"("p_order_number" "text", "p_ignore_order_id" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with c as (
    select count(*)::int as n
    from public.orders
    where coalesce(order_number,'') = coalesce(p_order_number,'')
      and (p_ignore_order_id is null or id::text <> p_ignore_order_id)
  )
  select (n = 0) from c;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_list_admin_events"("p_start_at" timestamp with time zone DEFAULT ("now"() - '14 days'::interval), "p_end_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval), "p_appraiser_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("order_id" "uuid", "event_type" "text", "start_at" timestamp with time zone, "end_at" timestamp with time zone, "appraiser_id" "uuid", "address" "text", "order_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.v_admin_calendar v
  where v.start_at >= p_start_at
    and v.start_at <= p_end_at
    and (p_appraiser_id is null or v.appraiser_id = p_appraiser_id)
  order by v.start_at asc;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_list_orders"("p_appraiser_id" "uuid" DEFAULT NULL::"uuid", "p_status" "text" DEFAULT NULL::"text", "p_q" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0) RETURNS SETOF "public"."orders"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.orders o
  where (p_appraiser_id is null or o.appraiser_id = p_appraiser_id)
    and (p_status is null or o.status = p_status)
    and (
      p_q is null
      or o.address ilike ('%' || p_q || '%')
      or o.order_number ilike ('%' || p_q || '%')
      or coalesce(o.title,'') ilike ('%' || p_q || '%')
    )
  order by o.created_at desc
  limit p_limit offset p_offset;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_list_users_with_roles"() RETURNS TABLE("id" "uuid", "email" "text", "display_name" "text", "role" "text", "fee_split" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  select
    u.id,
    u.email,
    coalesce(u.display_name, u.name, u.email) as display_name,
    coalesce(url.role::text, 'appraiser') as role,
    url.fee_split
  from public.users u
  left join public.user_roles url
    on url.user_id = u.id
  order by coalesce(u.display_name, u.name, u.email);
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id uuid;
  v_actor record;
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
begin
  select * into v_actor from public._activity_actor();

  if v_app_uid is null then
    raise exception 'current app user not found';
  end if;

  insert into public.activity_log (
    order_id,
    event_type,
    detail,
    actor_user_id,
    actor_id,
    created_by,
    created_by_name,
    created_by_email,
    created_at
  )
  values (
    p_order_id,
    p_event_type,
    coalesce(p_details, '{}'::jsonb),
    v_app_uid,
    v_auth_uid,
    v_auth_uid,
    v_actor.full_name,
    v_actor.email,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;


CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text",
    "role" "text",
    "visible_to" "text"[] DEFAULT ARRAY['admin'::"text"],
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "order_id" "uuid",
    "message" "text",
    "event_type" "text",
    "event_data" "jsonb",
    "environment" "text",
    "actor" "uuid",
    "prev_status" "text",
    "new_status" "text",
    "detail" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "actor_id" "uuid",
    "actor_name" "text",
    "created_by" "uuid",
    "created_by_name" "text",
    "created_by_email" "text",
    "actor_user_id" "uuid" DEFAULT "public"."current_app_user_id"()
);


CREATE OR REPLACE FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_message" "text" DEFAULT NULL::"text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."activity_log"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor record;
  v_row public.activity_log;
  v_role text := (current_setting('request.jwt.claims', true)::jsonb ->> 'role');
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_from text := coalesce(p_payload->>'from_status', p_payload->>'from');
  v_to text := coalesce(p_payload->>'to_status', p_payload->>'to');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_msg text;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if v_app_uid is null then
    raise exception 'current app user not found';
  end if;

  if not exists (
    select 1
      from public.orders o
     where o.id = p_order_id
       and (
         v_role in ('admin', 'reviewer')
         or coalesce(o.appraiser_id, o.assigned_to) = v_app_uid
       )
  ) then
    raise exception 'not authorized to log activity for this order';
  end if;

  if p_event_type = 'status_changed' and v_from is not null and v_to is not null and v_from = v_to then
    return null;
  end if;

  if v_from is not null then
    v_payload := v_payload || jsonb_build_object('from_status', v_from);
  end if;
  if v_to is not null then
    v_payload := v_payload || jsonb_build_object('to_status', v_to);
  end if;

  select * into v_actor from public._activity_actor();
  if exists (
    select 1
      from public.activity_log a
     where a.order_id = p_order_id
       and a.event_type = p_event_type
       and (
         a.actor_user_id = v_app_uid
         or coalesce(a.created_by, a.actor_id) = v_auth_uid
       )
       and coalesce(a.detail->>'to_status', a.detail->>'to') = coalesce(v_payload->>'to_status', v_to)
       and a.created_at > now() - interval '10 seconds'
  ) then
    return null;
  end if;

  v_msg := coalesce(
    p_message,
    case
      when p_event_type = 'status_changed' and v_from is not null and v_to is not null
        then format('Status changed: %s -> %s', v_from, v_to)
      else null
    end
  );

  insert into public.activity_log (
    order_id,
    event_type,
    message,
    detail,
    actor_user_id,
    actor_id,
    created_by,
    created_by_name,
    created_by_email
  )
  values (
    p_order_id,
    p_event_type,
    v_msg,
    v_payload,
    v_app_uid,
    v_auth_uid,
    v_auth_uid,
    v_actor.full_name,
    v_actor.email
  )
  returning * into v_row;

  return v_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_log_note"("p_order_id" "uuid", "p_message" "text", "p_context" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."activity_log"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_payload jsonb := coalesce(p_context, '{}'::jsonb);
  v_row public.activity_log;
begin
  select * into v_row from public.rpc_log_event(
    p_order_id => p_order_id,
    p_event_type => 'note_added',
    p_message => p_message,
    p_payload => v_payload
  );
  return v_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_log_status_change"("p_order_id" "uuid", "p_prev_status" "text", "p_new_status" "text", "p_message" "text" DEFAULT NULL::"text") RETURNS "public"."activity_log"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.activity_log;
  v_actor uuid := public.current_app_user_id();
begin
  if v_actor is null then
    raise exception 'current app user not found';
  end if;

  insert into public.activity_log(order_id, actor_user_id, action, prev_status, new_status, message)
  values (p_order_id, v_actor, 'status_change', p_prev_status, p_new_status, p_message)
  returning * into v_row;
  return v_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_mark_all_notifications_read"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count int;
begin
  update public.notifications
     set read_at = coalesce(read_at, now())
   where user_id = public.current_app_user_id()
     and read_at is null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_mark_email_failed_v1"("p_id" "uuid", "p_error" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.email_queue
     set status='failed', error=p_error
   where id = p_id;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_mark_email_outbox_failed"("p_id" "uuid", "p_error" "text") RETURNS "public"."email_outbox"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.email_outbox;
begin
  raise exception using
    errcode = '55000',
    message = 'rpc_mark_email_outbox_failed is deprecated',
    hint = 'Use public.rpc_mark_email_failed_v1 (canonical email_queue).';
  return v_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_mark_email_outbox_sent"("p_id" "uuid") RETURNS "public"."email_outbox"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.email_outbox;
begin
  raise exception using
    errcode = '55000',
    message = 'rpc_mark_email_outbox_sent is deprecated',
    hint = 'Use public.rpc_mark_email_sent_v1 (canonical email_queue).';
  return v_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_mark_email_sent_v1"("p_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.email_queue
     set status='sent', sent_at=now(), error=null
   where id = p_id;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_mark_notification_read"("p_notification_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count int;
begin
  update public.notifications
     set read_at = coalesce(read_at, now())
   where id = p_notification_id
     and user_id = public.current_app_user_id();

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_next_order_no"() RETURNS TABLE("order_no" "text", "seq" integer, "year" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  y int := extract(year from now())::int;
  s int;
begin
  loop
    update public.order_counters
       set last_seq = last_seq + 1
     where year = y
     returning last_seq into s;
    if found then exit; end if;

    -- row didn't exist yet; try to insert it
    begin
      insert into public.order_counters(year, last_seq) values (y, 0);
    exception when unique_violation then
      -- someone else inserted; loop and update again
    end;
  end loop;

  return query
  select lpad(y::text, 4, '0') || lpad(s::text, 3, '0') as order_no, s as seq, y as year;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_notification_create"("patch" "jsonb") RETURNS "public"."notifications"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.notifications;
begin
  insert into public.notifications (
    user_id,
    type,
    category,
    title,
    body,
    order_id,
    is_read,
    created_at,
    link_path,
    payload
  ) values (
    coalesce(nullif(patch->>'user_id', '')::uuid, public.current_app_user_id()),
    coalesce(patch->>'type', patch->>'category'),
    patch->>'category',
    patch->>'title',
    patch->>'body',
    nullif(patch->>'order_id', '')::uuid,
    coalesce(nullif(patch->>'is_read', '')::boolean, false),
    coalesce(nullif(patch->>'created_at', '')::timestamptz, now()),
    patch->>'link_path',
    coalesce(patch->'payload', '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_notification_prefs_ensure"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.notification_prefs(user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;
  return true;
end;
$$;


CREATE TABLE IF NOT EXISTS "public"."notification_prefs" (
    "user_id" "uuid" NOT NULL,
    "dnd_until" timestamp with time zone,
    "snooze_until" timestamp with time zone,
    "email_enabled" boolean,
    "push_enabled" boolean,
    "categories" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


CREATE OR REPLACE FUNCTION "public"."rpc_notification_prefs_get"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."notification_prefs"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid := coalesce(p_user_id,
                       auth.uid(),
                       nullif(current_setting('request.jwt.claim.sub', true), '')::uuid);
  row public.notification_prefs;
begin
  if uid is null then
    -- No auth context; return null instead of error so UI can handle gracefully
    return null;
  end if;

  select * into row
  from public.notification_prefs
  where user_id = uid
  limit 1;

  return row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb") RETURNS "public"."notification_prefs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare _row public.notification_prefs;
begin
  insert into public.notification_prefs (user_id, dnd_until, snooze_until, email_enabled, push_enabled, categories, updated_at)
  values (
    auth.uid(),
    (patch->>'dnd_until')::timestamptz,
    (patch->>'snooze_until')::timestamptz,
    (patch->>'email_enabled')::boolean,
    (patch->>'push_enabled')::boolean,
    patch->'categories',
    now()
  )
  on conflict (user_id)
  do update set
    dnd_until    = coalesce((patch->>'dnd_until')::timestamptz, public.notification_prefs.dnd_until),
    snooze_until = coalesce((patch->>'snooze_until')::timestamptz, public.notification_prefs.snooze_until),
    email_enabled= coalesce((patch->>'email_enabled')::boolean,   public.notification_prefs.email_enabled),
    push_enabled = coalesce((patch->>'push_enabled')::boolean,    public.notification_prefs.push_enabled),
    categories   = coalesce(patch->'categories',                  public.notification_prefs.categories),
    updated_at   = now()
  returning * into _row;

  return _row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."notification_prefs"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid := coalesce(p_user_id,
                       auth.uid(),
                       nullif(current_setting('request.jwt.claim.sub', true), '')::uuid);
  row public.notification_prefs;
begin
  if uid is null then
    raise exception 'rpc_notification_prefs_update: no authenticated user (auth.uid() is null).'
      using errcode = '42501';
  end if;

  insert into public.notification_prefs (
    user_id, dnd_until, snooze_until, email_enabled, push_enabled, categories, updated_at
  )
  values (
    uid,
    (patch->>'dnd_until')::timestamptz,
    (patch->>'snooze_until')::timestamptz,
    (patch->>'email_enabled')::boolean,
    (patch->>'push_enabled')::boolean,
    patch->'categories',
    now()
  )
  on conflict (user_id)
  do update set
    dnd_until    = coalesce((patch->>'dnd_until')::timestamptz, public.notification_prefs.dnd_until),
    snooze_until = coalesce((patch->>'snooze_until')::timestamptz, public.notification_prefs.snooze_until),
    email_enabled= coalesce((patch->>'email_enabled')::boolean,   public.notification_prefs.email_enabled),
    push_enabled = coalesce((patch->>'push_enabled')::boolean,    public.notification_prefs.push_enabled),
    categories   = coalesce(patch->'categories',                  public.notification_prefs.categories),
    updated_at   = now()
  returning * into row;

  return row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_notifications_list"("category" "text" DEFAULT NULL::"text", "is_read" boolean DEFAULT NULL::boolean, "page_limit" integer DEFAULT 50, "before" timestamp with time zone DEFAULT NULL::timestamp with time zone, "after" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS SETOF "public"."notifications"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select *
  from public.notifications
  where user_id = auth.uid()
    and (category is null or category = rpc_notifications_list.category)
    and (is_read is null or is_read = rpc_notifications_list.is_read)
    and (before is null or created_at < before)
    and (after  is null or created_at > after)
  order by created_at desc
  limit coalesce(page_limit, 50);
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_notifications_mark_all_read"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.notifications
     set is_read = true,
         read_at = now()
   where user_id = auth.uid()
     and is_read = false;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_notifications_mark_read"("ids" "uuid"[]) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.notifications
     set is_read = true,
         read_at = now()
   where user_id = auth.uid()
     and id = any(ids);
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_notifications_unread_count"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select count(*)::int
  from public.notifications
  where user_id = auth.uid()
    and is_read = false;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_notify_admins"("p_title" "text", "p_body" "text", "p_message" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r integer := 0;
begin
  insert into public.notifications(user_id, title, body, message)
  select u.auth_id,
         nullif(p_title,''), nullif(p_body,''), nullif(p_message,'')
  from public.users u
  where lower(u.role) = 'admin';

  GET DIAGNOSTICS r = ROW_COUNT;  -- number of rows inserted
  return coalesce(r,0);
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_notify_user"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare nid uuid;
begin
  if public.current_user_role() not in ('admin','reviewer') then
    raise exception 'Only admin/reviewer can notify users';
  end if;

  insert into public.notifications(user_id, title, body, message)
  values (p_user_id, nullif(p_title,''), nullif(p_body,''), nullif(p_message,''))
  returning id into nid;

  return nid;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_archive"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- mark archived
  UPDATE public.orders
  SET is_archived = true
  WHERE id = p_order_id;

  -- optional: add an activity log row if you have such a table
  -- INSERT INTO public.order_activity(order_id, event_type, meta)
  -- VALUES (p_order_id, 'archived', '{}'::jsonb);
END;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_assign"("p_order_id" "uuid", "p_appraiser_id" "uuid" DEFAULT NULL::"uuid", "p_reviewer_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.orders;
  v_app public.orders.appraiser_id%TYPE := null;  -- uuid
  v_rev public.orders.reviewer_id%TYPE  := null;  -- uuid
begin
  if p_appraiser_id is not null then
    v_app := public.fn_to_users_id(p_appraiser_id);
  end if;
  if p_reviewer_id is not null then
    v_rev := public.fn_to_users_id(p_reviewer_id);
  end if;

  update public.orders o
  set appraiser_id = coalesce(v_app, o.appraiser_id),
      reviewer_id  = coalesce(v_rev, o.reviewer_id),
      updated_at   = now()
  where o.id = p_order_id
  returning * into v_row;

  return v_row;
end $$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_assign_appraiser"("p_order_id" "text", "p_appraiser_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare ok boolean; uid uuid; num text;
begin
  if public.current_user_role() not in ('admin','reviewer') then
    raise exception 'Only admin/reviewer can assign appraiser';
  end if;

  update public.orders
     set appraiser_id = nullif(p_appraiser_id,'')::uuid
   where id::text = p_order_id;
  ok := found;

  if ok then
    select order_number into num from public.orders where id::text = p_order_id;
    uid := nullif(p_appraiser_id,'')::uuid;
    perform public.notify_safe(uid, 'New assignment', coalesce('Order #'||num, 'Order')||' assigned to you', null);
  end if;

  return ok;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_create"("p" "jsonb") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare r public.orders;
begin
  if current_user_role() <> 'admin' then
    raise exception 'Only admins can create orders';
  end if;

  insert into public.orders (
    order_number, title, address, client_id, client_name,
    appraiser_id, reviewer_id, status,
    site_visit_at, review_due_at, final_due_at, due_date,
    notes
  ) values (
    nullif((p->>'order_number')::text,''),
    (p->>'title')::text,
    (p->>'address')::text,
    nullif((p->>'client_id')::text,'')::uuid,
    (p->>'client_name')::text,
    nullif((p->>'appraiser_id')::text,'')::uuid,
    nullif((p->>'reviewer_id')::text,'')::uuid,
    coalesce(nullif((p->>'status')::text,''),'new'),
    (p->>'site_visit_at')::timestamptz,
    (p->>'review_due_at')::timestamptz,
    (p->>'final_due_at')::timestamptz,
    (p->>'due_date')::timestamptz,
    (p->>'notes')::text
  ) returning * into r;

  return r;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_delete"("p_order_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if current_user_role() <> 'admin' then
    raise exception 'Only admins can delete orders';
  end if;

  delete from public.orders where id::text = p_order_id;
  return true;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_log_note"("p_order_id" "uuid", "p_note" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.assert_role(array['admin','reviewer','appraiser']);
  perform public.log_order_activity(p_order_id, 'note', p_note);
  return true;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_mark_complete"("p_order_id" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  ok boolean;
  app uuid;
  rev uuid;
  num text;
  cur_status text;
  override boolean;
begin
  perform public.assert_role(array['admin']);

  select appraiser_id, reviewer_id, order_number, status
    into app, rev, num, cur_status
    from public.orders
   where id::text = p_order_id;

  -- override if reviewer is missing OR not in 'ready_to_send'
  override := (rev is null) or (lower(coalesce(cur_status,'')) <> 'ready_to_send');

  ok := public.rpc_order_set_status(p_order_id::text, 'complete');

  if ok then
    if override then
      perform public.log_order_activity(p_order_id::uuid, 'complete_override', p_note);
    else
      perform public.log_order_activity(p_order_id::uuid, 'complete', p_note);
    end if;

    -- Notify parties; suffix '(override)' if applicable
    perform public.notify_safe(
      app,
      'Order completed',
      coalesce('Order #'||num, 'Order')
        || case when override then ' completed (override)' else ' completed' end,
      p_note
    );
    perform public.notify_safe(
      rev,
      'Order completed',
      coalesce('Order #'||num, 'Order')
        || case when override then ' completed (override)' else ' completed' end,
      p_note
    );
  end if;

  return ok;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_ready_to_send"("p_order_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare ok boolean; num text;
begin
  perform public.assert_role(array['reviewer','admin']);
  select order_number into num from public.orders where id::text = p_order_id;
  ok := public.rpc_order_set_status(p_order_id::text, 'ready_to_send');
  if ok then
    perform public.notify_admins('Ready to send', coalesce('Order #'||num, 'Order')||' marked ready to send', null);
  end if;
  return ok;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_send_to_client"("p_order_id" "text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  num text;
  note text := nullif(p_payload->>'note','');  -- optional message
begin
  perform public.assert_role(array['reviewer','admin']);

  -- Grab order number (for friendly notifications; ignore if missing)
  select order_number into num
  from public.orders
  where id::text = p_order_id;

  -- Audit trail (schema-aware logger will populate event/message/actor)
  perform public.log_order_activity(p_order_id::uuid, 'send_to_client', note);

  -- Optional: notify admins that report was sent
  perform public.notify_admins(
    'Report sent',
    coalesce('Order #'||num, 'Order')||' sent to client',
    note
  );

  return true;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_review_due_at" "date" DEFAULT NULL::"date", "p_due_date" "date" DEFAULT NULL::"date") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_row public.orders;
begin
  update public.orders
  set site_visit_at   = coalesce(p_site_visit_at, site_visit_at),
      review_due_date = coalesce(p_review_due_at, review_due_date),
      due_date        = coalesce(p_due_date, due_date),
      updated_at      = now()
  where id = p_order_id
  returning * into v_row;

  return v_row;
end $$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_review_due_at" "date" DEFAULT NULL::"date", "p_final_due_at" "date" DEFAULT NULL::"date", "p_due_date" "date" DEFAULT NULL::"date") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_row public.orders;
begin
  update public.orders
  set site_visit_at   = coalesce(p_site_visit_at, site_visit_at),
      review_due_date = coalesce(p_review_due_at, review_due_date),
      due_date        = coalesce(p_due_date, due_date),
      updated_at      = now()
  where id = p_order_id
  returning * into v_row;

  return v_row;
end $$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_set_status"("p_order_id" "text", "p_status" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r text := public.current_user_role();
  s text := lower(coalesce(trim(p_status), ''));
begin
  if r is null then
    raise exception 'Not authenticated';
  end if;

  if r <> 'admin' then
    -- reviewers limited to normal workflow states
    if s not in ('in_review','revisions','ready_to_send','complete') then
      raise exception 'Permission denied for status: %', s;
    end if;
  else
    -- admin can set any lowercase underscore key (non-empty)
    s := regexp_replace(s, '[^a-z_]', '', 'g');
    if s = '' then
      raise exception 'Invalid empty status';
    end if;
  end if;

  update public.orders
     set status = s
   where id::text = p_order_id;

  if FOUND then
    -- log the change; our logger sanitizes and will handle schema variants
    perform public.log_order_activity(p_order_id::uuid, 'set_status:'||s, null);
    return true;
  end if;

  return false;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_set_status"("p_order_id" "uuid", "p_status" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_row public.orders;
begin
  -- (optional) enforce role here if needed
  update public.orders
  set status = p_status,
      updated_at = now()
  where id = p_order_id
  returning * into v_row;

  -- TODO: write to activity_log if you want (left as existing in your repo)
  return v_row;
end $$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_update"("p_order_id" "text", "p_patch" "jsonb") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare r public.orders;
begin
  if current_user_role() <> 'admin' then
    raise exception 'Only admins can update orders';
  end if;

  update public.orders
     set order_number   = coalesce(nullif((p_patch->>'order_number')::text,''), order_number),
         title          = coalesce((p_patch->>'title')::text, title),
         address        = coalesce((p_patch->>'address')::text, address),
         client_id      = coalesce(nullif((p_patch->>'client_id')::text,'')::uuid, client_id),
         client_name    = coalesce((p_patch->>'client_name')::text, client_name),
         appraiser_id   = coalesce(nullif((p_patch->>'appraiser_id')::text,'')::uuid, appraiser_id),
         reviewer_id    = coalesce(nullif((p_patch->>'reviewer_id')::text,'')::uuid, reviewer_id),
         status         = coalesce(nullif((p_patch->>'status')::text,''), status),
         notes          = coalesce((p_patch->>'notes')::text, notes)
   where id::text = p_order_id
  returning * into r;

  if not found then raise exception 'Order not found'; end if;
  return r;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_update"("p_order_id" "uuid", "p" "jsonb") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_is_admin    boolean := public.user_has_role('admin');
  v_is_reviewer boolean := public.user_has_role('reviewer');

  v_row public.orders;

  -- locals typed to target columns (avoid coalesce type errors)
  v_client_id    public.orders.client_id%TYPE    := null;  -- bigint
  v_appraiser_id public.orders.appraiser_id%TYPE := null;  -- uuid
  v_reviewer_id  public.orders.reviewer_id%TYPE  := null;  -- uuid
begin
  -- Normalize IDs in the payload if present
  if p ? 'client_id' then
    v_client_id := (p->>'client_id')::bigint;
  end if;
  if p ? 'appraiser_id' then
    v_appraiser_id := public.fn_to_users_id((p->>'appraiser_id')::uuid);
  end if;
  if p ? 'reviewer_id' then
    v_reviewer_id := public.fn_to_users_id((p->>'reviewer_id')::uuid);
  end if;

  if v_is_admin or v_is_reviewer then
    update public.orders o
    set
      title            = coalesce(p->>'title', o.title),
      address          = coalesce(p->>'address', o.address),
      city             = coalesce(p->>'city', o.city),
      state            = coalesce(p->>'state', o.state),
      zip              = coalesce(p->>'zip', o.zip),

      client_id        = coalesce(v_client_id, o.client_id),                                          -- bigint
      appraiser_id     = coalesce(v_appraiser_id, o.appraiser_id),                                    -- uuid
      reviewer_id      = coalesce(v_reviewer_id,  o.reviewer_id),                                     -- uuid

      due_date         = coalesce((p->>'due_date')::date, o.due_date),                                -- date
      review_due_date  = coalesce((p->>'review_due_date')::date, o.review_due_date),                  -- date
      site_visit_at    = coalesce((p->>'site_visit_at')::timestamp, o.site_visit_at),                 -- timestamp (w/o tz)

      fee_amount       = coalesce((p->>'fee_amount')::numeric, o.fee_amount),                         -- numeric
      is_archived      = coalesce((p->>'is_archived')::boolean, o.is_archived),

      order_number     = coalesce(nullif(p->>'order_number',''), o.order_number),
      updated_at       = now()
    where o.id = p_order_id
    returning * into v_row;
  else
    -- Appraiser: limited fields & only on their own orders
    update public.orders o
    set
      address          = coalesce(p->>'address', o.address),
      city             = coalesce(p->>'city', o.city),
      state            = coalesce(p->>'state', o.state),
      zip              = coalesce(p->>'zip', o.zip),
      due_date         = coalesce((p->>'due_date')::date, o.due_date),
      review_due_date  = coalesce((p->>'review_due_date')::date, o.review_due_date),
      site_visit_at    = coalesce((p->>'site_visit_at')::timestamp, o.site_visit_at),
      updated_at       = now()
    where o.id = p_order_id
      and o.appraiser_id = public.fn_current_user_users_id()
    returning * into v_row;
  end if;

  if v_row.id is null then
    raise exception 'forbidden or not found';
  end if;

  return v_row;
end $$;


CREATE OR REPLACE FUNCTION "public"."rpc_order_update_dates"("p_order_id" "text", "p_site_visit_at" timestamp with time zone, "p_review_due_at" timestamp with time zone, "p_final_due_at" timestamp with time zone, "p_due_date" timestamp with time zone) RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare r public.orders;
begin
  if current_user_role() not in ('admin','reviewer') then
    raise exception 'Only admin/reviewer can update dates';
  end if;

  update public.orders
     set site_visit_at = coalesce(p_site_visit_at, site_visit_at),
         review_due_at = coalesce(p_review_due_at, review_due_at),
         final_due_at  = coalesce(p_final_due_at, final_due_at),
         due_date      = coalesce(p_due_date, due_date)
   where id::text = p_order_id
  returning * into r;

  if not found then raise exception 'Order not found'; end if;
  return r;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_review_approve"("p_order_id" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare ok boolean; app uuid; num text;
begin
  perform public.assert_role(array['reviewer','admin']);
  select appraiser_id, order_number into app, num
  from public.orders where id::text = p_order_id;
  ok := public.rpc_order_set_status(p_order_id::text, 'ready_to_send');
  if ok then
    perform public.log_order_activity(p_order_id::uuid, 'approve', p_note);
    perform public.notify_safe(
      app,
      'Review approved',
      coalesce('Order #'||num, 'Order')||' approved (ready to send)',
      p_note
    );
  end if;
  return ok;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_review_request_revisions"("p_order_id" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare ok boolean; app uuid; num text;
begin
  perform public.assert_role(array['reviewer','admin']);
  select appraiser_id, order_number into app, num
  from public.orders where id::text = p_order_id;
  ok := public.rpc_order_set_status(p_order_id::text, 'revisions');
  if ok then
    perform public.log_order_activity(p_order_id::uuid, 'request_revisions', p_note);
    perform public.notify_safe(
      app,
      'Revisions requested',
      coalesce('Order #'||num, 'Order')||' needs revisions',
      p_note
    );
  end if;
  return ok;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_review_start"("p_order_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  ok boolean;
  app uuid;
  rev uuid;
  num text;
  has_reviewer boolean;
  my_reviewer_id uuid := null;
begin
  perform public.assert_role(array['reviewer','admin']);

  -- Only claim if orders.reviewer_id exists
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='reviewer_id'
  ) into has_reviewer;

  if has_reviewer then
    -- Find this user's *users.id* (NOT auth_id) to satisfy FK
    select id into my_reviewer_id
    from public.users
    where auth_id = auth.uid();

    if my_reviewer_id is not null then
      update public.orders
         set reviewer_id = coalesce(reviewer_id, my_reviewer_id)
       where id::text = p_order_id;
      -- if no matching users.id, we simply don't claim; no FK break
    end if;
  end if;

  -- For messages
  select appraiser_id, reviewer_id, order_number
    into app, rev, num
  from public.orders
  where id::text = p_order_id;

  ok := public.rpc_order_set_status(p_order_id::text, 'in_review');

  if ok then
    perform public.log_order_activity(p_order_id::uuid, 'review_start', null);
    perform public.notify_safe(
      app,
      'Review started',
      coalesce('Order #'||num, 'Order')||' moved to In Review',
      null
    );
  end if;

  return ok;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_set_admin_status"("p_user_id" "uuid", "p_is_admin" boolean) RETURNS "public"."users"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  current_user_row public.users;
  target_user_row  public.users;
begin
  -- Who is calling this?
  select *
  into current_user_row
  from public.users
  where auth_id = auth.uid();

  if current_user_row.id is null then
    raise exception 'No matching application user for auth.uid()';
  end if;

  -- Only owner can use this
  if current_user_row.role <> 'owner' then
    raise exception 'Only owner can change admin status';
  end if;

  -- Target user
  select *
  into target_user_row
  from public.users
  where id = p_user_id;

  if target_user_row.id is null then
    raise exception 'Target user not found';
  end if;

  update public.users
  set is_admin  = p_is_admin,
      updated_at = now()
  where id = p_user_id
  returning * into target_user_row;

  return target_user_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_set_notification_pref"("p_user_id" "uuid", "p_type" "text", "p_channel" "text", "p_enabled" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.user_notification_prefs (user_id, type, channel, enabled)
  values (p_user_id, p_type, p_channel, p_enabled)
  on conflict (user_id, type, channel)
  do update set enabled = excluded.enabled;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_set_notification_pref_v1"("p_user_id" "uuid", "p_type" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.user_notification_prefs (user_id, type, channel, enabled, meta)
  values (p_user_id, p_type, p_channel, p_enabled, p_meta)
  on conflict (user_id, type, channel)
  do update set
    enabled = excluded.enabled,
    meta = coalesce(excluded.meta, public.user_notification_prefs.meta);
end;
$$;


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "user_id" "uuid" NOT NULL,
    "email_enabled" boolean DEFAULT true NOT NULL,
    "email_address" "text",
    "digest_mode" "text",
    "quiet_hours" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


CREATE OR REPLACE FUNCTION "public"."rpc_set_notification_preferences"("p_email_enabled" boolean, "p_email_address" "text" DEFAULT NULL::"text") RETURNS "public"."notification_preferences"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.notification_preferences;
  v_user_id uuid := public.current_app_user_id();
begin
  if v_user_id is null then
    raise exception 'current app user not found';
  end if;

  insert into public.notification_preferences(user_id, email_enabled, email_address, updated_at)
  values (v_user_id, coalesce(p_email_enabled, true), p_email_address, now())
  on conflict (user_id) do update
    set email_enabled = coalesce(excluded.email_enabled, public.notification_preferences.email_enabled),
        email_address = coalesce(excluded.email_address, public.notification_preferences.email_address),
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_set_review_route"("order_id" "uuid", "route" "jsonb") RETURNS "public"."orders"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.orders
     set review_route = route,
         updated_at   = now()
   where id = order_id
  returning *;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_set_user_role"("p_user_id" "uuid", "p_role" "text") RETURNS "public"."users"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  current_user_row public.users;
  target_user_row  public.users;
begin
  -- caller
  select *
  into current_user_row
  from public.users
  where auth_id = auth.uid();

  if current_user_row.id is null then
    raise exception 'No matching application user for auth.uid()';
  end if;

  -- only owner for now (we can widen this later if needed)
  if current_user_row.role <> 'owner' then
    raise exception 'Only owner can change roles';
  end if;

  if p_role not in ('owner', 'admin', 'appraiser', 'reviewer') then
    raise exception 'Invalid role: %', p_role;
  end if;

  update public.users
  set role       = p_role,
      updated_at = now()
  where id = p_user_id
  returning * into target_user_row;

  return target_user_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_set_user_role"("p_user_id" "uuid", "p_role" "text", "p_grant" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare is_admin boolean;
begin
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
    into is_admin;
  if not is_admin then
    raise exception 'forbidden: admin only';
  end if;

  if p_grant then
    insert into public.user_roles(user_id, role) values (p_user_id, p_role)
    on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = p_role;
  end if;
end $$;


CREATE OR REPLACE FUNCTION "public"."rpc_system_insert_notification"("p_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_link_path" "text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb", "p_priority" "text" DEFAULT 'normal'::"text", "p_category" "text" DEFAULT 'orders'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.notifications (
    user_id,
    type,
    order_id,
    title,
    body,
    message,
    link_path,
    payload,
    priority,
    category,
    is_read,
    read
  ) values (
    p_user_id,
    p_type,
    p_order_id,
    p_title,
    p_body,
    p_body,
    p_link_path,
    coalesce(p_payload, '{}'::jsonb),
    p_priority,
    p_category,
    false,
    false
  );
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_transition_order_status"("p_order_id" "uuid", "p_transition_key" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid;
  v_order public.orders;
  v_updated_order public.orders;
  v_allowed_from text[];
  v_target_status text;
  v_required_permission text;
  v_transition_key text;
  v_current_status text;
begin
  v_actor_user_id := public.current_app_user_id();

  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = 'P0001';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'order not found';
  end if;

  v_transition_key := lower(trim(coalesce(p_transition_key, '')));
  v_current_status := lower(trim(coalesce(v_order.status, '')));

  case v_transition_key
    when 'submit_to_review' then
      v_allowed_from := array['new', 'in_progress', 'needs_revisions'];
      v_target_status := 'in_review';
      v_required_permission := case
        when v_current_status = 'needs_revisions' then 'workflow.status.resubmit'
        else 'workflow.status.submit_to_review'
      end;
    when 'request_revisions' then
      v_allowed_from := array['in_review'];
      v_target_status := 'needs_revisions';
      v_required_permission := 'workflow.status.request_revisions';
    when 'approve_review' then
      v_allowed_from := array['in_review'];
      v_target_status := 'review_cleared';
      v_required_permission := 'workflow.status.approve_review';
    when 'request_final_approval' then
      v_allowed_from := array['review_cleared'];
      v_target_status := 'pending_final_approval';
      v_required_permission := 'workflow.status.ready_for_client';
    when 'ready_for_client' then
      v_allowed_from := array['review_cleared', 'pending_final_approval'];
      v_target_status := 'ready_for_client';
      v_required_permission := 'workflow.status.ready_for_client';
    when 'complete' then
      v_allowed_from := array['ready_for_client'];
      v_target_status := 'completed';
      v_required_permission := 'workflow.status.complete';
    else
      raise exception 'invalid workflow transition: %', v_transition_key;
  end case;

  if not coalesce(v_current_status = any(v_allowed_from), false) then
    raise exception 'transition % is not allowed from status %', p_transition_key, v_order.status;
  end if;

  if not public.current_app_user_has_permission(v_required_permission) then
    raise exception 'missing required permission: %', v_required_permission;
  end if;

  update public.orders
     set status = v_target_status,
         updated_at = now()
   where id = p_order_id
   returning * into v_updated_order;

  -- Existing order update triggers currently log status_changed activity.
  -- The RPC should not also call rpc_log_status_change until activity logging is consolidated.

  return v_updated_order;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_update_client"("client_id" bigint, "patch" "jsonb") RETURNS "public"."clients"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.clients
     set name   = coalesce(nullif(patch->>'name',''), name),
         status = coalesce(nullif(patch->>'status',''), status)
   where id = client_id
  returning *;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_update_due_dates"("p_order_id" "uuid", "p_due_date" "date", "p_review_due_date" "date") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_row public.orders;
begin
  update public.orders
     set due_date = p_due_date,
         review_due_date = p_review_due_date,
         updated_at = now()
   where id = p_order_id
   returning * into v_row;
  return v_row;
end $$;


CREATE OR REPLACE FUNCTION "public"."rpc_update_order"("order_id" "uuid", "patch" "jsonb") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  has_client   boolean := patch ? 'client_id';
  in_client    text    := patch->>'client_id';
  v_client_id  bigint;
  v_manual     text    := nullif(patch->>'manual_client','');

  v_row public.orders;
begin
  -- Validate incoming client_id if present
  if has_client then
    v_client_id := nullif(in_client,'')::bigint;
    if v_client_id is not null and not exists (select 1 from public.clients c where c.id = v_client_id) then
      if v_manual is not null then
        v_client_id := null; -- manual-only
      else
        raise exception 'Unknown client_id: %', v_client_id using errcode = '23503';
      end if;
    end if;
  end if;

  update public.orders
     set client_id        = coalesce(v_client_id, client_id),
         manual_client    = coalesce(v_manual, manual_client),
         appraiser_id     = coalesce(nullif(patch->>'appraiser_id','')::uuid, appraiser_id),
         order_number     = coalesce(nullif(patch->>'order_number',''), order_number),
         property_address = coalesce(nullif(patch->>'property_address',''), property_address),
         city             = coalesce(nullif(patch->>'city',''), city),
         state            = coalesce(nullif(patch->>'state',''), state),
         postal_code      = coalesce(nullif(patch->>'postal_code',''), postal_code),
         base_fee         = coalesce(nullif(patch->>'base_fee','')::numeric, base_fee),
         appraiser_fee    = coalesce(nullif(patch->>'appraiser_fee','')::numeric, appraiser_fee),
         appraiser_split  = coalesce(nullif(patch->>'appraiser_split','')::numeric, appraiser_split),
         notes            = coalesce(nullif(patch->>'notes',''), notes),
         updated_at       = now()
   where id = order_id
  returning * into v_row;

  return v_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_update_order_dates"("order_id" "uuid", "site_visit_at" timestamp with time zone, "review_due_at" timestamp with time zone, "final_due_at" timestamp with time zone) RETURNS "public"."orders"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.orders
     SET site_visit_at = rpc_update_order_dates.site_visit_at,
         review_due_at = rpc_update_order_dates.review_due_at,
         final_due_at  = rpc_update_order_dates.final_due_at,
         updated_at    = now()
   WHERE id = order_id
  RETURNING *;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_update_order_status"("order_id" "uuid", "next_status" "text") RETURNS "public"."orders"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.orders
     SET status     = next_status,
         updated_at = now()
   WHERE id = order_id
  RETURNING *;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_update_order_status_with_note"("order_id" "uuid", "next_status" "text", "note" "text") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  r public.orders;
BEGIN
  -- Do the update via the canonical function
  r := public.rpc_update_order_status(order_id, next_status);

  -- Best-effort log (comment this out if you don’t have rpc_log_event)
  BEGIN
    PERFORM public.rpc_log_event(order_id, 'status_changed',
             COALESCE(note, format('Status → %s', next_status)));
  EXCEPTION WHEN undefined_function THEN
    -- ignore if rpc_log_event doesn't exist
    NULL;
  END;

  RETURN r;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_update_order_v1"("p_order_id" "uuid", "p_status" "text" DEFAULT NULL::"text", "p_appraiser_id" "uuid" DEFAULT NULL::"uuid", "p_site_visit" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_review_due" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_final_due" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_actor" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if p_order_id is null then
    raise exception 'p_order_id required';
  end if;

  update public.orders o
  set
    status = coalesce(p_status, o.status),
    appraiser_id = coalesce(p_appraiser_id, o.appraiser_id),
    site_visit_at = coalesce(p_site_visit, o.site_visit_at),
    review_due_at = coalesce(p_review_due, o.review_due_at),
    final_due_at = coalesce(p_final_due, o.final_due_at),
    updated_at = now()
  where o.id = p_order_id;

  -- Optional: log a generic "order_updated" event for audit
  -- If rpc_log_event doesn't exist in your DB, comment these 6 lines.
  perform public.rpc_log_event(
    p_order_id := p_order_id,
    p_action := 'order_updated',
    p_message := null,
    p_prev_status := null,
    p_new_status := p_status,
    p_context := coalesce(p_actor, '{}'::jsonb)
  );

  -- Optional: create in‑app notifications for meaningful changes
  -- We only fan-out on specific actions. Mirror client intent by inferring action:
  if p_site_visit is not null then
    perform public.rpc_create_notifications_for_order_event(p_order_id, 'site_visit_set');
  end if;

  if p_status is not null then
    perform public.rpc_create_notifications_for_order_event(p_order_id, 'status_changed');
  end if;
end;
$$;


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "color" "text",
    "phone" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "display_color" "text",
    "fee_split" numeric,
    "split" numeric,
    "split_pct" numeric,
    "full_name" "text",
    "name" "text",
    "is_owner" boolean DEFAULT false NOT NULL,
    CONSTRAINT "user_profiles_color_check" CHECK ((("color" ~* '^[#a-z0-9() ,.-]{0,32}$'::"text") OR ("color" IS NULL)))
);


CREATE OR REPLACE FUNCTION "public"."rpc_update_profile"("p_display_name" "text", "p_color" "text", "p_phone" "text", "p_avatar_url" "text") RETURNS "public"."user_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_row public.user_profiles;
begin
  insert into public.user_profiles(user_id, display_name, color, phone, avatar_url)
  values (auth.uid(), p_display_name, p_color, p_phone, p_avatar_url)
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        color        = excluded.color,
        phone        = excluded.phone,
        avatar_url   = excluded.avatar_url,
        updated_at   = now()
  returning * into v_row;
  return v_row;
end $$;


CREATE OR REPLACE FUNCTION "public"."rpc_update_user_profile"("p_user_id" "uuid", "p_display_name" "text", "p_display_color" "text", "p_phone" "text") RETURNS "public"."users"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  current_user_row public.users;
  target_user_row  public.users;
begin
  -- Map auth.uid() → our users row
  select *
  into current_user_row
  from public.users
  where auth_id = auth.uid();

  if current_user_row.id is null then
    raise exception 'No matching application user for auth.uid()';
  end if;

  -- Load target user
  select *
  into target_user_row
  from public.users
  where id = p_user_id;

  if target_user_row.id is null then
    raise exception 'Target user not found';
  end if;

  -- Permissions:
  -- - user can update themselves
  -- - admins and owner can update anyone
  if current_user_row.id != target_user_row.id
     and current_user_row.is_admin = false
     and current_user_row.role <> 'owner' then
    raise exception 'Not allowed to update this profile';
  end if;

  update public.users
  set display_name   = coalesce(p_display_name, display_name),
      display_color  = coalesce(p_display_color, display_color),
      color          = coalesce(p_display_color, color), -- keep in sync for now
      phone          = coalesce(p_phone, phone),
      updated_at     = now()
  where id = p_user_id
  returning * into target_user_row;

  return target_user_row;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_user_set_color"("p_auth_id" "text", "p_color" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can set color';
  end if;
  update public.users
     set display_color = nullif(trim(p_color),'')
   where auth_id::text = p_auth_id;
  return found;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_user_set_fee_split"("p_auth_id" "text", "p_fee" numeric) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can set fee split';
  end if;
  update public.users
     set fee_split = p_fee
   where auth_id::text = p_auth_id;
  return found;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_user_set_role"("p_auth_id" "text", "p_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can set roles';
  end if;
  update public.users
     set role = lower(nullif(trim(p_role),''))::text
   where auth_id::text = p_auth_id;
  return found;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."rpc_user_set_status"("p_auth_id" "text", "p_status" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can set status';
  end if;
  update public.users
     set status = lower(nullif(trim(p_status),''))::text
   where auth_id::text = p_auth_id;
  return found;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."safe_uuid"("p_text" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  out uuid;
begin
  begin
    out := p_text::uuid;
    return out;
  exception when others then
    return null;
  end;
end$$;


CREATE OR REPLACE FUNCTION "public"."set_order_appointment"("p_order_id" "uuid", "p_datetime" timestamp with time zone, "p_note" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare v_id uuid;
begin
  insert into falcon_mvp.order_appointments(order_id, scheduled_at, note)
  values (p_order_id, p_datetime, p_note)
  returning id into v_id;
  return v_id;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."set_order_status"("p_order_id" "uuid", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'falcon_mvp', 'auth', 'extensions'
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  update falcon_mvp.orders
  set status = p_status
  where id = p_order_id;

  perform public._activity_insert(
    p_order_id,
    'status_change',
    format('Status set to %s', p_status),
    jsonb_build_object('new_status', p_status),
    v_uid
  );
end;
$$;


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."team_get_user"("user_id" "uuid") RETURNS "public"."users"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.*
  from public.users u
  where u.id = user_id
  limit 1;
$$;


CREATE OR REPLACE FUNCTION "public"."team_list_users"() RETURNS SETOF "public"."users"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select * from public.admin_list_users();
$$;


CREATE OR REPLACE FUNCTION "public"."team_list_users"("include_inactive" boolean DEFAULT false) RETURNS SETOF "public"."users"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.*
  from public.users u
  where include_inactive
     or (coalesce(u.is_active, true) = true and coalesce(lower(u.status), 'active') <> 'inactive')
  order by coalesce(u.display_name, u.full_name, u.name, u.email), u.email;
$$;


CREATE OR REPLACE FUNCTION "public"."tg_activity_denorm_actor"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.actor_id IS NOT NULL THEN
    SELECT COALESCE(u.display_name, u.full_name, u.email)
      INTO NEW.actor_name
      FROM public.users u
     WHERE u.id = NEW.actor_id;
  ELSE
    NEW.actor_name := NULL;
  END IF;
  RETURN NEW;
END $$;


CREATE OR REPLACE FUNCTION "public"."tg_log_order_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor uuid := public.current_app_user_id();
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_log(order_id, event_type, detail, actor_id, created_at)
    values (
      NEW.id,
      'order_created',
      jsonb_build_object('status', NEW.status, 'client_id', NEW.client_id, 'order_number', NEW.order_number),
      v_actor,
      now()
    );
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.status is distinct from OLD.status then
      insert into public.activity_log(order_id, event_type, detail, actor_id, created_at)
      values (
        NEW.id,
        'status_changed',
        jsonb_build_object('from', OLD.status, 'to', NEW.status),
        v_actor,
        now()
      );
    end if;

    if NEW.appraiser_id is distinct from OLD.appraiser_id then
      insert into public.activity_log(order_id, event_type, detail, actor_id, created_at)
      values (
        NEW.id,
        'assignment_changed',
        jsonb_build_object('field', 'appraiser_id', 'from', OLD.appraiser_id, 'to', NEW.appraiser_id),
        v_actor,
        now()
      );
    end if;

    if NEW.reviewer_id is distinct from OLD.reviewer_id then
      insert into public.activity_log(order_id, event_type, detail, actor_id, created_at)
      values (
        NEW.id,
        'assignment_changed',
        jsonb_build_object('field', 'reviewer_id', 'from', OLD.reviewer_id, 'to', NEW.reviewer_id),
        v_actor,
        now()
      );
    end if;
    return NEW;
  end if;

  return NEW;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."tg_notifications_queue_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_to_user_id uuid;
  v_enabled boolean := true;
  v_email text;
  v_subject text;
  v_body text;
  v_template text;
  v_payload jsonb;
  v_policy_rules jsonb;
  v_email_mode text := 'optional_on';
begin
  begin
    select rules
      into v_policy_rules
      from public.notification_policies
     where key = NEW.type
     limit 1;

    if v_policy_rules is not null then
      v_email_mode := coalesce(v_policy_rules->'email'->>'mode', 'off');
    end if;

    if v_email_mode = 'off' then
      return NEW;
    end if;

    select to_user_id, email_enabled, email_address
      into v_to_user_id, v_enabled, v_email
      from public._notification_email_target(NEW.user_id);

    if v_to_user_id is null or v_email is null then
      return NEW;
    end if;

    if v_email_mode = 'optional_off' then
      return NEW;
    end if;

    if v_email_mode = 'optional_on' and coalesce(v_enabled, true) = false then
      return NEW;
    end if;

    if NEW.order_id is not null then
      v_subject := coalesce(NEW.title, 'New update on your order');
    else
      v_subject := coalesce(NEW.title, 'New notification');
    end if;

    v_body := coalesce(NEW.message, NEW.body, NEW.title, 'You have a new notification.');
    v_template := coalesce(
      NEW.payload->>'email_template_key',
      NEW.payload->>'template_key',
      NEW.payload->>'templateKey',
      case NEW.type
        when 'order.new_assigned' then 'order_assigned'
        else null
      end,
      NEW.type,
      'notification'
    );
    v_payload := coalesce(NEW.payload, '{}'::jsonb) || jsonb_build_object(
      'notification_id', NEW.id,
      'notification_type', NEW.type,
      'category', NEW.category,
      'title', v_subject,
      'body', v_body,
      'message', v_body,
      'order_id', NEW.order_id,
      'link_path', NEW.link_path
    );

    insert into public.email_queue(
      user_id,
      to_email,
      subject,
      template,
      payload
    ) values (
      v_to_user_id,
      v_email,
      v_subject,
      v_template,
      v_payload
    );
  exception
    when others then
      null;
  end;

  return NEW;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."tg_orders_audit_ins"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.activity_log(order_id, event_type, detail, actor_id)
  values (
    NEW.id,
    'order_created',
    jsonb_build_object(
      'status', NEW.status,
      'date_ordered', NEW.date_ordered,
      'client_id', NEW.client_id
    ),
    public.current_app_user_id()
  );
  return NEW;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."tg_orders_audit_upd"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor uuid := public.current_app_user_id();
begin
  if NEW.status is distinct from OLD.status then
    insert into public.activity_log(order_id, event_type, detail, actor_id)
    values (NEW.id, 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status), v_actor);
  end if;

  if NEW.site_visit_at is distinct from OLD.site_visit_at
     or NEW.review_due_at is distinct from OLD.review_due_at
     or NEW.final_due_at is distinct from OLD.final_due_at then
    insert into public.activity_log(order_id, event_type, detail, actor_id)
    values (
      NEW.id,
      'dates_updated',
      jsonb_build_object(
        'site_visit_at', NEW.site_visit_at,
        'review_due_at', NEW.review_due_at,
        'final_due_at', NEW.final_due_at
      ),
      v_actor
    );
  end if;

  if NEW.appraiser_id is distinct from OLD.appraiser_id then
    insert into public.activity_log(order_id, event_type, detail, actor_id)
    values (NEW.id, 'assignee_changed', jsonb_build_object('field', 'appraiser_id', 'from', OLD.appraiser_id, 'to', NEW.appraiser_id), v_actor);
  end if;

  if NEW.reviewer_id is distinct from OLD.reviewer_id then
    insert into public.activity_log(order_id, event_type, detail, actor_id)
    values (NEW.id, 'assignee_changed', jsonb_build_object('field', 'reviewer_id', 'from', OLD.reviewer_id, 'to', NEW.reviewer_id), v_actor);
  end if;

  if NEW.base_fee is distinct from OLD.base_fee or NEW.fee_amount is distinct from OLD.fee_amount then
    insert into public.activity_log(order_id, event_type, detail, actor_id)
    values (NEW.id, 'fee_changed', jsonb_build_object('base_fee', NEW.base_fee, 'fee_amount', NEW.fee_amount), v_actor);
  end if;

  return NEW;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."tg_orders_insert_assignment_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_type text;
  v_title text;
  v_body text;
begin
  if TG_OP = 'INSERT' then
    if NEW.appraiser_id is null then
      return NEW;
    end if;

    v_event_type := 'order.new_assigned';
    v_title := 'New order assigned';
    v_body := 'You''ve been assigned order #' || coalesce(NEW.order_number, NEW.id::text);
  elsif TG_OP = 'UPDATE' then
    if NEW.appraiser_id is null or NEW.appraiser_id is not distinct from OLD.appraiser_id then
      return NEW;
    end if;

    if OLD.appraiser_id is null then
      v_event_type := 'order.new_assigned';
      v_title := 'New order assigned';
      v_body := 'You''ve been assigned order #' || coalesce(NEW.order_number, NEW.id::text);
    else
      v_event_type := 'order.reassigned';
      v_title := 'Order reassigned';
      v_body := 'You''ve been reassigned order #' || coalesce(NEW.order_number, NEW.id::text);
    end if;
  else
    return NEW;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    order_id,
    link_path,
    payload
  ) values (
    NEW.appraiser_id,
    v_event_type,
    v_title,
    v_body,
    NEW.id,
    '/orders/' || NEW.id::text,
    jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'email_template_key',
        case
          when v_event_type = 'order.new_assigned' then 'APPRAISER_ASSIGNED'
          else null
        end
    )
  );

  return NEW;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."tg_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


CREATE OR REPLACE FUNCTION "public"."tg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."trg_orders_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  new_status text := to_jsonb(NEW)->>'status';
  old_status text := to_jsonb(OLD)->>'status';
  new_assignee uuid := coalesce(
    (to_jsonb(NEW)->>'assigned_appraiser_id')::uuid,
    (to_jsonb(NEW)->>'assigned_user_id')::uuid,
    (to_jsonb(NEW)->>'appraiser_id')::uuid
  );
  old_assignee uuid := coalesce(
    (to_jsonb(OLD)->>'assigned_appraiser_id')::uuid,
    (to_jsonb(OLD)->>'assigned_user_id')::uuid,
    (to_jsonb(OLD)->>'appraiser_id')::uuid
  );
  new_appt timestamptz := coalesce(
    (to_jsonb(NEW)->>'appointment_at')::timestamptz,
    (to_jsonb(NEW)->>'appt_at')::timestamptz
  );
  old_appt timestamptz := coalesce(
    (to_jsonb(OLD)->>'appointment_at')::timestamptz,
    (to_jsonb(OLD)->>'appt_at')::timestamptz
  );
  new_due timestamptz := coalesce(
    (to_jsonb(NEW)->>'due_at')::timestamptz,
    (to_jsonb(NEW)->>'due_date')::timestamptz
  );
  old_due timestamptz := coalesce(
    (to_jsonb(OLD)->>'due_at')::timestamptz,
    (to_jsonb(OLD)->>'due_date')::timestamptz
  );
begin
  if TG_OP = 'UPDATE' then
    if new_status is distinct from old_status then
      perform public.log_activity('order', NEW.id, 'order.status_changed', jsonb_build_object('from', old_status, 'to', new_status));
    end if;
    if new_assignee is distinct from old_assignee then
      perform public.log_activity('order', NEW.id, 'order.assigned', jsonb_build_object('from', old_assignee, 'to', new_assignee));
    end if;
    if new_appt is distinct from old_appt then
      perform public.log_activity('order', NEW.id, 'order.appointment_updated', jsonb_build_object('from', old_appt, 'to', new_appt));
    end if;
    if new_due is distinct from old_due then
      perform public.log_activity('order', NEW.id, 'order.due_updated', jsonb_build_object('from', old_due, 'to', new_due));
    end if;
  end if;
  return NEW;
end$$;


CREATE OR REPLACE FUNCTION "public"."trg_orders_notifications"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- This trigger is now deprecated for notifications.
  -- It should only remain if used for non-notification side effects.

  return new;
end;
$$;


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."update_user_profile_basic"("p_user_id" "uuid", "p_name" "text", "p_email" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  update public.users
     set name  = coalesce(p_name, name),
         email = coalesce(p_email, email)
   where id = p_user_id;
$$;


CREATE OR REPLACE FUNCTION "public"."upsert_user_settings"("p_user_id" "uuid", "p_phone" "text", "p_preferences" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.user_settings (user_id, phone, preferences)
  values (p_user_id, p_phone, coalesce(p_preferences, '{}'::jsonb))
  on conflict (user_id) do update
    set phone = excluded.phone,
        preferences = excluded.preferences,
        updated_at = now();
end;
$$;


CREATE OR REPLACE FUNCTION "public"."user_has_role"("p_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.users u
    where u.auth_id = auth.uid()
      and lower(u.role) = lower(p_role)
  );
$$;


CREATE TABLE IF NOT EXISTS "public"."_view_backups" (
    "view_name" "text" NOT NULL,
    "definition" "text" NOT NULL,
    "saved_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


CREATE TABLE IF NOT EXISTS "public"."activity_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "event" "text" NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_events_target_type_check" CHECK (("target_type" = ANY (ARRAY['order'::"text", 'client'::"text", 'user'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."amc_lenders" (
    "amc_id" bigint NOT NULL,
    "lender_id" bigint NOT NULL,
    CONSTRAINT "amc_lenders_check" CHECK (("amc_id" <> "lender_id"))
);


CREATE TABLE IF NOT EXISTS "public"."amcs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "date" "date" NOT NULL,
    "time" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "order_id" "uuid",
    "start_at" timestamp with time zone,
    "end_at" timestamp with time zone
);


CREATE TABLE IF NOT EXISTS "public"."appraiser_licenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "state" "text" NOT NULL,
    "number" "text" NOT NULL,
    "type" "text",
    "expires_at" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clients" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."clients_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" bigint NOT NULL,
    "client_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."contacts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."contacts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."identity_role_backfill_log" (
    "migration_tag" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


CREATE TABLE IF NOT EXISTS "public"."identity_role_review_log" (
    "id" bigint NOT NULL,
    "migration_tag" "text" NOT NULL,
    "issue_type" "text" NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "users_role" "text",
    "canonical_user_roles_role" "text",
    "auth_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


CREATE SEQUENCE IF NOT EXISTS "public"."identity_role_review_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."identity_role_review_log_id_seq" OWNED BY "public"."identity_role_review_log"."id";



CREATE TABLE IF NOT EXISTS "public"."instance_blueprint" (
    "id" bigint NOT NULL,
    "step_key" "text" NOT NULL,
    "phase" "text" NOT NULL,
    "step_order" integer NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "required" boolean DEFAULT true NOT NULL,
    "default_status" "text" DEFAULT 'todo'::"text" NOT NULL,
    "owner_role" "text",
    "evidence_hint" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "instance_blueprint_default_status_check" CHECK (("default_status" = ANY (ARRAY['todo'::"text", 'in_progress'::"text", 'done'::"text", 'n_a'::"text"]))),
    CONSTRAINT "instance_blueprint_phase_check" CHECK (("phase" = ANY (ARRAY['foundation'::"text", 'security'::"text", 'data_model'::"text", 'workflow'::"text", 'notifications'::"text", 'reporting'::"text", 'deprecation'::"text"]))),
    CONSTRAINT "instance_blueprint_step_order_check" CHECK (("step_order" > 0))
);


CREATE TABLE IF NOT EXISTS "public"."instance_blueprint_backup_20260319" (
    "id" bigint,
    "install_phase" integer,
    "domain" "text",
    "artifact_name" "text",
    "artifact_type" "text",
    "requirement_level" "text",
    "purpose" "text",
    "notes" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


CREATE SEQUENCE IF NOT EXISTS "public"."instance_blueprint_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."instance_blueprint_id_seq" OWNED BY "public"."instance_blueprint"."id";



CREATE TABLE IF NOT EXISTS "public"."notification_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "rules" "jsonb" NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


CREATE TABLE IF NOT EXISTS "public"."order_assignments" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "percentage" numeric DEFAULT 0,
    "flat_fee" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "order_id" "uuid",
    "user_uid" "uuid"
);


CREATE SEQUENCE IF NOT EXISTS "public"."order_assignments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_assignments_id_seq" OWNED BY "public"."order_assignments"."id";



CREATE TABLE IF NOT EXISTS "public"."order_counters" (
    "year" integer NOT NULL,
    "last_seq" integer DEFAULT 0 NOT NULL
);


CREATE TABLE IF NOT EXISTS "public"."order_number_counters" (
    "id" bigint NOT NULL,
    "rule_id" bigint NOT NULL,
    "counter_year" integer NOT NULL,
    "last_value" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_number_counters_last_value_check" CHECK (("last_value" >= 0))
);


ALTER TABLE "public"."order_number_counters" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."order_number_counters_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."order_numbering_rules" (
    "id" bigint NOT NULL,
    "company_key" "text" NOT NULL,
    "format_kind" "text" DEFAULT 'year_seq_3'::"text" NOT NULL,
    "year_digits" integer DEFAULT 4 NOT NULL,
    "sequence_digits" integer DEFAULT 3 NOT NULL,
    "reset_period" "text" DEFAULT 'yearly'::"text" NOT NULL,
    "manual_override_allowed" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_numbering_rules_format_kind_check" CHECK (("format_kind" = 'year_seq_3'::"text")),
    CONSTRAINT "order_numbering_rules_reset_period_check" CHECK (("reset_period" = 'yearly'::"text")),
    CONSTRAINT "order_numbering_rules_sequence_digits_check" CHECK (("sequence_digits" > 0)),
    CONSTRAINT "order_numbering_rules_year_digits_check" CHECK (("year_digits" = 4))
);


ALTER TABLE "public"."order_numbering_rules" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."order_numbering_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."order_status_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "old_status" "text" NOT NULL,
    "new_status" "text" NOT NULL,
    "triggered_by" "uuid",
    "trigger_type" "text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "order_id" "uuid",
    CONSTRAINT "order_status_log_trigger_type_check" CHECK (("trigger_type" = ANY (ARRAY['manual'::"text", 'system'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "key" "text" NOT NULL,
    "category" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "is_system" boolean DEFAULT true NOT NULL,
    "is_owner_only" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fee_split" numeric(5,2),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'appraiser'::"text", 'associate'::"text", 'reviewer'::"text"])))
);


CREATE OR REPLACE VIEW "public"."profiles" AS
 SELECT "au"."id",
    "au"."id" AS "uid",
    "au"."id" AS "auth_id",
    "au"."email",
    COALESCE("up"."display_name", ("au"."raw_user_meta_data" ->> 'full_name'::"text"), ("au"."raw_user_meta_data" ->> 'name'::"text"), ("au"."email")::"text") AS "display_name",
    COALESCE("up"."full_name", ("au"."raw_user_meta_data" ->> 'full_name'::"text"), "up"."display_name", ("au"."raw_user_meta_data" ->> 'name'::"text")) AS "full_name",
    COALESCE("up"."name", ("au"."raw_user_meta_data" ->> 'name'::"text"), "up"."display_name") AS "name",
    "ur"."role",
    COALESCE("up"."display_color", "up"."color", "up"."display_name") AS "display_color",
    "up"."color",
    "up"."avatar_url",
    "up"."phone",
    "up"."created_at",
    "up"."updated_at",
    COALESCE("up"."status", 'active'::"text") AS "status",
    "up"."fee_split",
    "up"."split",
    "up"."split_pct",
    COALESCE("up"."is_active", true) AS "is_active"
   FROM (("auth"."users" "au"
     LEFT JOIN "public"."user_profiles" "up" ON (("up"."user_id" = "au"."id")))
     LEFT JOIN LATERAL ( SELECT "ur1"."role"
           FROM "public"."user_roles" "ur1"
          WHERE ("ur1"."user_id" = "au"."id")
          ORDER BY
                CASE "ur1"."role"
                    WHEN 'owner'::"text" THEN 1
                    WHEN 'admin'::"text" THEN 2
                    WHEN 'reviewer'::"text" THEN 3
                    WHEN 'appraiser'::"text" THEN 4
                    ELSE 5
                END
         LIMIT 1) "ur" ON (true));


CREATE TABLE IF NOT EXISTS "public"."profiles_legacy" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."review_flow" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assigned_to" "uuid",
    "assigned_by" "uuid",
    "status" "text" DEFAULT 'queued'::"text",
    "type" "text" DEFAULT 'review'::"text",
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone,
    "order_id" "uuid"
);


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "role_id" "uuid" NOT NULL,
    "permission_key" "text" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "is_template" boolean DEFAULT false NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "is_owner_role" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


CREATE TABLE IF NOT EXISTS "public"."schema_decisions" (
    "id" bigint NOT NULL,
    "decision_key" "text" NOT NULL,
    "title" "text" NOT NULL,
    "decision_status" "text" NOT NULL,
    "category" "text" NOT NULL,
    "rationale" "text" NOT NULL,
    "impact" "text",
    "decided_by" "text" DEFAULT 'falcon-core'::"text" NOT NULL,
    "decided_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "supersedes_decision_key" "text",
    "related_objects" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "schema_decisions_decision_status_check" CHECK (("decision_status" = ANY (ARRAY['proposed'::"text", 'accepted'::"text", 'superseded'::"text", 'rejected'::"text", 'deprecated'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."schema_decisions_backup_20260319" (
    "id" bigint,
    "decision_key" "text",
    "domain" "text",
    "title" "text",
    "status" "text",
    "decision" "text",
    "rationale" "text",
    "consequence" "text",
    "supersedes_key" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


CREATE SEQUENCE IF NOT EXISTS "public"."schema_decisions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."schema_decisions_id_seq" OWNED BY "public"."schema_decisions"."id";



CREATE TABLE IF NOT EXISTS "public"."schema_registry" (
    "id" bigint NOT NULL,
    "schema_name" "text" DEFAULT 'public'::"text" NOT NULL,
    "object_type" "text" NOT NULL,
    "object_name" "text" NOT NULL,
    "domain" "text" NOT NULL,
    "lifecycle" "text" NOT NULL,
    "source_of_truth" boolean DEFAULT false NOT NULL,
    "product_core" boolean DEFAULT true NOT NULL,
    "owner_team" "text",
    "introduced_in_migration" "text",
    "replaced_by" "text",
    "sunset_target_date" "date",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "schema_registry_lifecycle_check" CHECK (("lifecycle" = ANY (ARRAY['canonical'::"text", 'transitional'::"text", 'deprecated'::"text"]))),
    CONSTRAINT "schema_registry_object_type_check" CHECK (("object_type" = ANY (ARRAY['table'::"text", 'view'::"text", 'rpc'::"text", 'trigger'::"text", 'index'::"text", 'policy'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."schema_registry_backup_20260319" (
    "id" bigint,
    "artifact_name" "text",
    "artifact_type" "text",
    "domain" "text",
    "status" "text",
    "source_of_truth" boolean,
    "include_in_new_instances" boolean,
    "app_read_allowed" boolean,
    "app_write_allowed" boolean,
    "replacement_artifact" "text",
    "owned_by_layer" "text",
    "notes" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


CREATE SEQUENCE IF NOT EXISTS "public"."schema_registry_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."schema_registry_id_seq" OWNED BY "public"."schema_registry"."id";



CREATE TABLE IF NOT EXISTS "public"."staging_orders_2025" (
    "order_number" "text",
    "address" "text",
    "special_instruction" "text",
    "client" "text",
    "client_contact" "text",
    "property_type" "text",
    "assigned_appraiser" "text",
    "fee" "text",
    "date_ordered" "text",
    "due_for_review" "text",
    "due_to_client" "text",
    "inspection_date" "text",
    "date_billed" "text",
    "date_paid" "text"
);


CREATE TABLE IF NOT EXISTS "public"."staging_raw_orders_2025_csv" (
    "Order #" "text",
    "Address of Property / 
Approaches to Value" "text",
    "Client
Contact" "text",
    "Property Type /
Assigned Appraiser" "text",
    "Fee" "text",
    "Date Ordered" "text",
    "Due for Review" "text",
    "Due to Client" "text",
    "Inspection" "text",
    "Date Billed" "text",
    "Date Paid" "text"
);


CREATE TABLE IF NOT EXISTS "public"."stg_orders_import" (
    "order_number" "text",
    "appraiser_name" "text",
    "client_name" "text",
    "address_line1" "text",
    "city" "text",
    "state" "text",
    "postal_code" "text",
    "property_type" "text",
    "review_due_at" "date",
    "final_due_at" "date",
    "status" "text",
    "base_fee" numeric,
    "appraiser_fee" numeric
);


CREATE TABLE IF NOT EXISTS "public"."user_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "title" "text",
    "storage_path" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" "date"
);


CREATE TABLE IF NOT EXISTS "public"."user_notification_prefs" (
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "meta" "jsonb"
);


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "phone" "text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "theme_color" "text",
    "timezone" "text",
    "signature" "text",
    "notify_assignments" boolean,
    "notify_reviews" boolean,
    "notify_status_changes" boolean
);


CREATE OR REPLACE VIEW "public"."v_admin_calendar" AS
 SELECT "e"."id",
    "e"."event_type",
    "e"."title",
    "e"."start_at",
    "e"."end_at",
    "e"."order_id",
    "e"."appraiser_id",
    "e"."appraiser_user_id",
    "o"."order_number" AS "order_no",
    "o"."order_number",
    COALESCE("o"."property_address", "o"."address") AS "address",
    COALESCE("c"."name", "o"."manual_client") AS "client_name",
    COALESCE("o"."city", "o"."state", "o"."zip") AS "street_address",
    "o"."city",
    "o"."state",
    COALESCE("o"."postal_code", "o"."zip") AS "zip",
    "o"."status",
    "p"."display_name" AS "appraiser_name",
    "p"."color" AS "appraiser_color"
   FROM ((("public"."calendar_events" "e"
     LEFT JOIN "public"."orders" "o" ON (("o"."id" = "e"."order_id")))
     LEFT JOIN "public"."clients" "c" ON (("c"."id" = "o"."client_id")))
     LEFT JOIN "public"."user_profiles" "p" ON (("p"."user_id" = COALESCE("o"."appraiser_id", "o"."assigned_to", "e"."appraiser_id", "e"."appraiser_user_id"))));


CREATE OR REPLACE VIEW "public"."v_admin_calendar_enriched" AS
 SELECT "id",
    "event_type",
    "title",
    "start_at",
    "end_at",
    "order_id",
    "appraiser_id",
    "appraiser_user_id",
    "order_no",
    "order_number",
    "address",
    "client_name",
    "street_address",
    "city",
    "state",
    "zip",
    "status",
    "appraiser_name",
    "appraiser_color",
        CASE "event_type"
            WHEN 'site_visit'::"text" THEN 'map-pin'::"text"
            WHEN 'due_for_review'::"text" THEN 'alert-triangle'::"text"
            WHEN 'due_to_client'::"text" THEN 'send'::"text"
            ELSE 'calendar'::"text"
        END AS "event_icon"
   FROM "public"."v_admin_calendar" "ac";


CREATE OR REPLACE VIEW "public"."v_calendar_events" AS
 WITH "base" AS (
         SELECT "o"."id" AS "order_id",
            NULL::"uuid" AS "client_id",
            COALESCE("o"."appraiser_id", "o"."assigned_to", "o"."reviewer_id") AS "assigned_appraiser_id",
            COALESCE(("o"."site_visit_at")::timestamp with time zone, ("o"."inspection_date")::timestamp with time zone, ("o"."site_visit_date")::timestamp with time zone) AS "_site_at",
            COALESCE("o"."review_due_at", ("o"."review_due_date")::timestamp with time zone, ("o"."due_for_review")::timestamp with time zone) AS "_review_due_at",
            COALESCE("o"."final_due_at", "o"."client_due_at", ("o"."due_to_client")::timestamp with time zone, ("o"."due_date")::timestamp with time zone) AS "_final_due_at",
            COALESCE("o"."order_number", "substr"(("o"."id")::"text", 1, 8)) AS "order_label"
           FROM "public"."orders" "o"
        )
 SELECT "base"."order_id",
    "base"."client_id",
    "base"."assigned_appraiser_id",
    'appointment'::"text" AS "kind",
    "base"."_site_at" AS "starts_at",
    ("base"."_site_at" + '01:00:00'::interval) AS "ends_at",
    "concat"('Appt: ', "base"."order_label") AS "title"
   FROM "base"
  WHERE ("base"."_site_at" IS NOT NULL)
UNION ALL
 SELECT "base"."order_id",
    "base"."client_id",
    "base"."assigned_appraiser_id",
    'due'::"text" AS "kind",
    "base"."_review_due_at" AS "starts_at",
    "base"."_review_due_at" AS "ends_at",
    "concat"('Review Due: ', "base"."order_label") AS "title"
   FROM "base"
  WHERE ("base"."_review_due_at" IS NOT NULL)
UNION ALL
 SELECT "base"."order_id",
    "base"."client_id",
    "base"."assigned_appraiser_id",
    'due'::"text" AS "kind",
    "base"."_final_due_at" AS "starts_at",
    "base"."_final_due_at" AS "ends_at",
    "concat"('Final Due: ', "base"."order_label") AS "title"
   FROM "base"
  WHERE ("base"."_final_due_at" IS NOT NULL);


CREATE OR REPLACE VIEW "public"."v_calendar_unified" AS
 SELECT "ce"."id",
    "ce"."order_id",
    COALESCE("ce"."appraiser_user_id", "ce"."appraiser_id") AS "user_id",
    "ce"."event_type",
    COALESCE("ce"."title", 'Event'::"text") AS "title",
    "ce"."start_at",
    "ce"."end_at",
    "ce"."location",
    "ce"."notes",
    'calendar_events'::"text" AS "source",
    "ce"."created_at"
   FROM "public"."calendar_events" "ce"
UNION ALL
 SELECT "a"."id",
    "a"."order_id",
    NULL::"uuid" AS "user_id",
    'appointment'::"text" AS "event_type",
    COALESCE("a"."title", 'Appointment'::"text") AS "title",
    "a"."start_at",
    NULL::timestamp with time zone AS "end_at",
    NULL::"text" AS "location",
    "a"."notes",
    'appointments'::"text" AS "source",
    "a"."created_at"
   FROM "public"."appointments" "a"
  WHERE ("a"."start_at" IS NOT NULL)
UNION ALL
 SELECT "gen_random_uuid"() AS "id",
    "v"."order_id",
    "v"."assigned_appraiser_id" AS "user_id",
        CASE
            WHEN ("v"."kind" = 'appointment'::"text") THEN 'site_visit'::"text"
            ELSE 'due'::"text"
        END AS "event_type",
    "v"."title",
    "v"."starts_at" AS "start_at",
    "v"."ends_at" AS "end_at",
    NULL::"text" AS "location",
    NULL::"text" AS "notes",
    'orders'::"text" AS "source",
    "v"."starts_at" AS "created_at"
   FROM "public"."v_calendar_events" "v";


CREATE OR REPLACE VIEW "public"."v_admin_calendar_v2" AS
 SELECT "v"."id",
    "v"."order_id",
    "v"."user_id",
    "v"."event_type",
    "v"."title",
    "v"."start_at",
    "v"."end_at",
    "v"."location",
    "v"."source",
    "v"."created_at",
    "o"."order_number",
    "o"."status",
    "c"."name" AS "client_name",
    "up"."full_name" AS "user_name"
   FROM ((("public"."v_calendar_unified" "v"
     LEFT JOIN "public"."orders" "o" ON (("o"."id" = "v"."order_id")))
     LEFT JOIN "public"."clients" "c" ON (("c"."id" = "o"."client_id")))
     LEFT JOIN "public"."users" "up" ON (("up"."id" = "v"."user_id")));


CREATE OR REPLACE VIEW "public"."v_orders_unified" AS
 SELECT "o"."id",
    COALESCE("o"."order_number", ''::"text") AS "order_number",
    COALESCE("o"."property_address", "o"."address", ''::"text") AS "address",
    "o"."city",
    "o"."state",
    COALESCE("o"."zip", "o"."postal_code") AS "postal_code",
    "o"."county",
    "o"."property_type",
    "o"."report_type",
    "o"."status",
    "o"."review_stage",
    "o"."created_at",
    "o"."updated_at",
    COALESCE("o"."final_due_at", "o"."client_due_at", "o"."review_due_at",
        CASE
            WHEN ("o"."due_date" IS NOT NULL) THEN ("o"."due_date")::timestamp with time zone
            ELSE NULL::timestamp with time zone
        END) AS "due_at",
    "o"."client_id",
    "c"."name" AS "client_name",
    "o"."appraiser_id",
    COALESCE("ua"."full_name", "ua"."name", "ua"."email") AS "appraiser_name",
    "o"."reviewer_id",
    COALESCE("ur"."full_name", "ur"."name", "ur"."email") AS "reviewer_name",
    "la"."last_activity_at",
    "o"."is_archived",
    "o"."archived"
   FROM (((("public"."orders" "o"
     LEFT JOIN "public"."clients" "c" ON (("c"."id" = "o"."client_id")))
     LEFT JOIN "public"."users" "ua" ON (("ua"."id" = "o"."appraiser_id")))
     LEFT JOIN "public"."users" "ur" ON (("ur"."id" = "o"."reviewer_id")))
     LEFT JOIN LATERAL ( WITH "a" AS (
                 SELECT "max"("al"."created_at") AS "t"
                   FROM "public"."activity_log" "al"
                  WHERE ("al"."order_id" = "o"."id")
                ), "s" AS (
                 SELECT "max"("osl"."created_at") AS "t"
                   FROM "public"."order_status_log" "osl"
                  WHERE ("osl"."order_id" = "o"."id")
                )
         SELECT COALESCE("a"."t", "s"."t", "o"."updated_at", "o"."created_at") AS "last_activity_at"
           FROM "a",
            "s") "la" ON (true));


CREATE OR REPLACE VIEW "public"."v_admin_dashboard_counts" AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."v_orders_unified" "u"
          WHERE ((COALESCE("u"."is_archived", false) = false) AND (COALESCE("lower"("u"."status"), ''::"text") <> ALL (ARRAY['complete'::"text", 'completed'::"text", 'cancelled'::"text"])))) AS "total_active",
    ( SELECT "count"(*) AS "count"
           FROM "public"."v_orders_unified" "u"
          WHERE ((COALESCE("u"."is_archived", false) = false) AND ("lower"(COALESCE("u"."status", ''::"text")) = ANY (ARRAY['in review'::"text", 'in_review'::"text"])))) AS "in_review",
    ( SELECT "count"(*) AS "count"
           FROM "public"."v_orders_unified" "u"
          WHERE ((COALESCE("u"."is_archived", false) = false) AND ("lower"(COALESCE("u"."status", ''::"text")) = ANY (ARRAY['ready to send'::"text", 'ready_to_send'::"text"])))) AS "ready_to_send";


CREATE OR REPLACE VIEW "public"."v_amcs" AS
 SELECT "id",
    "name",
    "contact_name_1" AS "contact_name",
    "contact_email_1" AS "contact_email",
    "contact_phone_1" AS "contact_phone",
    "amc_legacy_id",
    "created_at"
   FROM "public"."clients"
  WHERE ("kind" = 'amc'::"text");


CREATE OR REPLACE VIEW "public"."v_calendar_events_admin" AS
 SELECT "order_id",
    "client_id",
    "assigned_appraiser_id",
    "kind",
    "starts_at",
    "ends_at",
    "title"
   FROM "public"."v_calendar_events";


CREATE OR REPLACE VIEW "public"."v_calendar_events_appraiser" AS
 SELECT "order_id",
    "client_id",
    "assigned_appraiser_id",
    "kind",
    "starts_at",
    "ends_at",
    "title"
   FROM "public"."v_calendar_events"
  WHERE ("assigned_appraiser_id" = "auth"."uid"());


CREATE OR REPLACE VIEW "public"."v_client_kpis" AS
SELECT
    NULL::"text" AS "client_id",
    NULL::"text" AS "client_name",
    NULL::"text" AS "primary_contact_name",
    NULL::"text" AS "primary_contact_phone",
    NULL::bigint AS "total_orders",
    NULL::numeric(12,2) AS "avg_total_fee",
    NULL::timestamp with time zone AS "last_order_at";


CREATE OR REPLACE VIEW "public"."v_client_kpis_appraiser" AS
 SELECT "client_id",
    "client_name",
    "primary_contact_name",
    "primary_contact_phone",
    "total_orders",
    "avg_total_fee",
    "last_order_at"
   FROM "public"."v_client_kpis" "k"
  WHERE (EXISTS ( SELECT 1
           FROM "public"."orders" "o"
          WHERE ((("to_jsonb"("o".*) ->> 'client_id'::"text") = "k"."client_id") AND (COALESCE((("to_jsonb"("o".*) ->> 'assigned_appraiser_id'::"text"))::"uuid", (("to_jsonb"("o".*) ->> 'assigned_user_id'::"text"))::"uuid", (("to_jsonb"("o".*) ->> 'appraiser_id'::"text"))::"uuid", NULL::"uuid") = "auth"."uid"()))));


CREATE OR REPLACE VIEW "public"."v_client_metrics" AS
 SELECT "c"."id",
    "c"."name",
    "count"("o"."id") AS "orders_count",
    "max"("o"."date_ordered") AS "last_ordered_at",
    COALESCE("sum"("o"."base_fee"), (0)::numeric) AS "total_base_fee"
   FROM ("public"."clients" "c"
     LEFT JOIN "public"."orders" "o" ON ((("o"."client_id" = "c"."id") AND (COALESCE("o"."is_archived", false) = false))))
  GROUP BY "c"."id", "c"."name";


CREATE OR REPLACE VIEW "public"."v_email_queue" AS
 SELECT "id",
    "user_id",
    "to_email",
    "subject",
    "template",
    "status",
    "attempts",
    "claimed_at",
    "locked_by",
    "created_at",
    "sent_at",
    "error"
   FROM "public"."email_queue";


CREATE OR REPLACE VIEW "public"."v_is_admin" AS
 SELECT "auth"."uid"() AS "uid",
    (EXISTS ( SELECT 1
           FROM "public"."users" "u"
          WHERE (("u"."auth_id" = "auth"."uid"()) AND (COALESCE("u"."role", ''::"text") = ANY (ARRAY['owner'::"text", 'admin'::"text", 'manager'::"text"]))))) AS "is_admin";


CREATE OR REPLACE VIEW "public"."v_order_activity_compat" AS
 SELECT "id",
    "order_id",
    "actor_id" AS "user_id",
    "event_type" AS "event",
    NULL::"text" AS "details",
    "event_type" AS "action",
    "message" AS "note",
    "created_at",
    "actor_id" AS "created_by"
   FROM "public"."activity_log" "al";


CREATE OR REPLACE VIEW "public"."v_order_activity_feed" AS
 SELECT "a"."id",
    "a"."order_id",
    COALESCE("a"."event_type", "a"."action") AS "event_type",
    COALESCE("a"."message",
        CASE
            WHEN ((COALESCE("a"."event_type", "a"."action") = 'status_changed'::"text") AND (COALESCE(("a"."detail" ->> 'from_status'::"text"), "a"."prev_status", ("a"."detail" ->> 'from'::"text")) IS NOT NULL) AND (COALESCE(("a"."detail" ->> 'to_status'::"text"), "a"."new_status", ("a"."detail" ->> 'to'::"text")) IS NOT NULL)) THEN "format"('Status changed: %s → %s'::"text", COALESCE(("a"."detail" ->> 'from_status'::"text"), "a"."prev_status", ("a"."detail" ->> 'from'::"text")), COALESCE(("a"."detail" ->> 'to_status'::"text"), "a"."new_status", ("a"."detail" ->> 'to'::"text")))
            ELSE NULL::"text"
        END, ("a"."detail" ->> 'text'::"text")) AS "message",
    "a"."detail",
    "a"."created_at",
    "a"."created_by",
    COALESCE("a"."created_by_name", "p"."full_name") AS "created_by_name",
    COALESCE("a"."created_by_email", "p"."email") AS "created_by_email"
   FROM ("public"."activity_log" "a"
     LEFT JOIN "public"."profiles_legacy" "p" ON (("p"."id" = COALESCE("a"."created_by", "a"."actor_id"))));


COMMENT ON VIEW "public"."v_order_activity_feed" IS 'Normalized activity feed for orders; source of truth for UI timelines';



CREATE OR REPLACE VIEW "public"."v_orders" WITH ("security_invoker"='on') AS
 SELECT "address",
    "status",
    "due_date",
    "appraiser_split",
    "base_fee",
    "manual_client",
    "notes",
    "site_visit_date",
    "client_id",
    "appraiser_id",
    "created_at",
    "updated_at",
    "client_invoice_amount",
    "paid_status",
    "report_type",
    "property_type",
    "review_due_date",
    "appraiser_fee",
    "branch_id",
    "city",
    "county",
    "state",
    "zip",
    "site_visit_at",
    "review_stage",
    "id",
    "is_archived",
    "title",
    "assigned_to"
   FROM "public"."orders"
  WHERE ("is_archived" = false);


CREATE OR REPLACE VIEW "public"."v_orders_frontend_v4" WITH ("security_invoker"='true') AS
 SELECT "o"."id",
    "o"."id" AS "order_id",
    "o"."order_number",
    "o"."status",
    "o"."client_id",
    COALESCE("c"."name", "o"."manual_client_name") AS "client_name",
    "o"."managing_amc_id" AS "amc_id",
    "amc"."name" AS "amc_name",
    COALESCE("o"."address", "o"."property_address") AS "address_line1",
    COALESCE("o"."address", "o"."property_address") AS "address",
    "o"."city",
    "o"."state",
    "o"."postal_code",
    "o"."postal_code" AS "zip",
    "o"."property_type",
    "o"."report_type",
    "o"."site_visit_at",
    ("o"."site_visit_at")::"date" AS "site_visit_date",
    "o"."review_due_at",
    ("o"."review_due_at")::"date" AS "review_due_date",
    COALESCE("o"."final_due_at", ("o"."due_date")::timestamp with time zone) AS "final_due_at",
    (COALESCE("o"."final_due_at", ("o"."due_date")::timestamp with time zone))::"date" AS "final_due_date",
    (COALESCE("o"."final_due_at", ("o"."due_date")::timestamp with time zone))::"date" AS "due_date",
    "o"."fee_amount",
    "o"."base_fee",
    "o"."appraiser_fee",
    "o"."split_pct",
    "o"."appraiser_id",
    "u_app"."full_name" AS "appraiser_name",
    "o"."reviewer_id",
    "u_rev"."full_name" AS "reviewer_name",
    "o"."owner_id",
    "o"."property_contact_name",
    "o"."property_contact_phone",
    "o"."entry_contact_name",
    "o"."entry_contact_phone",
    "o"."access_notes",
    "o"."notes",
    "o"."is_archived",
    "o"."created_at",
    "o"."updated_at"
   FROM (((("public"."orders" "o"
     LEFT JOIN "public"."clients" "c" ON (("c"."id" = "o"."client_id")))
     LEFT JOIN "public"."clients" "amc" ON (("amc"."id" = "o"."managing_amc_id")))
     LEFT JOIN "public"."users" "u_app" ON (("u_app"."id" = "o"."appraiser_id")))
     LEFT JOIN "public"."users" "u_rev" ON (("u_rev"."id" = "o"."reviewer_id")));


CREATE OR REPLACE VIEW "public"."v_orders_active_frontend_v4" WITH ("security_invoker"='true') AS
 SELECT "id",
    "order_id",
    "order_number",
    "status",
    "client_id",
    "client_name",
    "amc_id",
    "amc_name",
    "address_line1",
    "address",
    "city",
    "state",
    "postal_code",
    "zip",
    "property_type",
    "report_type",
    "site_visit_at",
    "site_visit_date",
    "review_due_at",
    "review_due_date",
    "final_due_at",
    "final_due_date",
    "due_date",
    "fee_amount",
    "base_fee",
    "appraiser_fee",
    "split_pct",
    "appraiser_id",
    "appraiser_name",
    "reviewer_id",
    "reviewer_name",
    "owner_id",
    "property_contact_name",
    "property_contact_phone",
    "entry_contact_name",
    "entry_contact_phone",
    "access_notes",
    "notes",
    "is_archived",
    "created_at",
    "updated_at"
   FROM "public"."v_orders_frontend_v4"
  WHERE ((COALESCE("is_archived", false) = false) AND ("status" <> 'completed'::"text"));


CREATE OR REPLACE VIEW "public"."v_orders_all" WITH ("security_invoker"='on') AS
 SELECT "address",
    "status",
    "due_date",
    "appraiser_split",
    "base_fee",
    "manual_client",
    "notes",
    "site_visit_date",
    "client_id",
    "appraiser_id",
    "created_at",
    "updated_at",
    "client_invoice_amount",
    "paid_status",
    "report_type",
    "property_type",
    "review_due_date",
    "appraiser_fee",
    "branch_id",
    "city",
    "county",
    "state",
    "zip",
    "site_visit_at",
    "review_stage",
    "id",
    "is_archived",
    "title",
    "assigned_to"
   FROM "public"."orders";


CREATE OR REPLACE VIEW "public"."v_orders_dashboard_active" AS
 SELECT "id" AS "order_id",
    "order_number" AS "order_no",
    "address",
    "client_name",
    "appraiser_name",
    "status",
    "due_at" AS "due",
    "last_activity_at"
   FROM "public"."v_orders_unified" "u"
  WHERE ((COALESCE("is_archived", false) = false) AND (COALESCE("lower"("status"), ''::"text") <> ALL (ARRAY['complete'::"text", 'completed'::"text", 'cancelled'::"text"])));


CREATE OR REPLACE VIEW "public"."v_orders_frontend" AS
 SELECT "o"."id",
    "o"."order_number",
    "o"."manual_client" AS "client_name",
    "o"."client_id",
    COALESCE("o"."appraiser_id", "o"."assigned_to") AS "assigned_to",
    "o"."appraiser_id",
    "o"."reviewer_id",
    COALESCE("o"."manual_appraiser", "ua"."display_name", "ua"."full_name", "ua"."name") AS "appraiser_name",
    COALESCE("ur"."display_name", "ur"."full_name", "ur"."name") AS "reviewer_name",
    COALESCE("ua"."color", "ua"."display_color") AS "appraiser_color",
    COALESCE("ur"."color", "ur"."display_color") AS "reviewer_color",
    COALESCE("o"."property_address", "o"."address") AS "address",
    "o"."city",
    "o"."state",
    "o"."zip",
    "o"."property_type",
    "o"."report_type",
    "o"."status",
    COALESCE("o"."fee_amount", "o"."base_fee") AS "fee_amount",
    "o"."base_fee",
    "o"."appraiser_fee",
    COALESCE(("o"."site_visit_at")::timestamp with time zone, ("o"."inspection_date")::timestamp with time zone, ("o"."site_visit_date")::timestamp with time zone) AS "site_visit_at",
    COALESCE("o"."review_due_at", ("o"."due_for_review")::timestamp with time zone, ("o"."review_due_date")::timestamp with time zone) AS "review_due_at",
    COALESCE("o"."final_due_at", "o"."client_due_at", ("o"."due_to_client")::timestamp with time zone, ("o"."due_date")::timestamp with time zone) AS "final_due_at",
    COALESCE("o"."final_due_at", "o"."client_due_at", ("o"."due_to_client")::timestamp with time zone, ("o"."due_date")::timestamp with time zone) AS "due_date",
    "o"."created_at",
    COALESCE("o"."is_archived", "o"."archived", false) AS "is_archived"
   FROM (("public"."orders" "o"
     LEFT JOIN "public"."users" "ua" ON (("ua"."id" = "o"."appraiser_id")))
     LEFT JOIN "public"."users" "ur" ON (("ur"."id" = "o"."reviewer_id")));


CREATE OR REPLACE VIEW "public"."v_orders_list" AS
 SELECT "u"."id" AS "order_id",
    "u"."order_number",
    "u"."status",
    "u"."created_at",
    ("u"."due_at")::"date" AS "due_date",
    "o"."review_due_date",
    "o"."site_visit_at",
    "u"."client_id",
    "u"."appraiser_id",
    "o"."reviewer_id",
    "o"."owner_id",
    "u"."client_name",
    "u"."appraiser_name",
    COALESCE("up_appraiser"."display_name", "u"."appraiser_name") AS "appraiser_display_name",
    COALESCE("up_reviewer"."display_name", "reviewer_user"."full_name", ("reviewer_auth"."email")::"text", 'Reviewer'::"text") AS "reviewer_display_name",
    COALESCE("up_owner"."display_name", "owner_user"."full_name", ("owner_auth"."email")::"text", 'Owner'::"text") AS "owner_display_name",
    "la"."last_action",
    "la"."last_message",
    "u"."last_activity_at"
   FROM ((((((((("public"."v_orders_unified" "u"
     LEFT JOIN "public"."orders" "o" ON (("o"."id" = "u"."id")))
     LEFT JOIN "public"."user_profiles" "up_appraiser" ON (("up_appraiser"."user_id" = "u"."appraiser_id")))
     LEFT JOIN "public"."user_profiles" "up_reviewer" ON (("up_reviewer"."user_id" = "o"."reviewer_id")))
     LEFT JOIN "public"."users" "reviewer_user" ON (("reviewer_user"."id" = "o"."reviewer_id")))
     LEFT JOIN "auth"."users" "reviewer_auth" ON (("reviewer_auth"."id" = "o"."reviewer_id")))
     LEFT JOIN "public"."user_profiles" "up_owner" ON (("up_owner"."user_id" = "o"."owner_id")))
     LEFT JOIN "public"."users" "owner_user" ON (("owner_user"."id" = "o"."owner_id")))
     LEFT JOIN "auth"."users" "owner_auth" ON (("owner_auth"."id" = "o"."owner_id")))
     LEFT JOIN LATERAL ( SELECT "al"."event_type" AS "last_action",
            "al"."message" AS "last_message"
           FROM "public"."activity_log" "al"
          WHERE ("al"."order_id" = "u"."id")
          ORDER BY "al"."created_at" DESC
         LIMIT 1) "la" ON (true));


CREATE OR REPLACE VIEW "public"."v_orders_list_v2" AS
 SELECT "id",
    "order_number",
    "address",
    "city",
    "state",
    "postal_code",
    "status",
    "report_type",
    "property_type",
    "client_id",
    "client_name",
    "appraiser_id",
    "appraiser_name",
    "reviewer_id",
    "reviewer_name",
    "due_at",
    "last_activity_at",
    "created_at",
    "updated_at"
   FROM "public"."v_orders_unified";


CREATE OR REPLACE VIEW "public"."v_orders_list_with_last_activity" AS
 SELECT "order_id",
    "order_number",
    "status",
    "created_at",
    "due_date",
    "review_due_date",
    "site_visit_at",
    "client_id",
    "appraiser_id",
    "reviewer_id",
    "owner_id",
    "client_name",
    "appraiser_name",
    "appraiser_display_name",
    "reviewer_display_name",
    "owner_display_name",
    "last_action",
    "last_message",
    "last_activity_at"
   FROM "public"."v_orders_list";


CREATE OR REPLACE VIEW "public"."v_orders_list_with_last_activity_v2" AS
 SELECT "id",
    "order_number",
    "address",
    "city",
    "state",
    "postal_code",
    "status",
    "report_type",
    "property_type",
    "client_id",
    "client_name",
    "appraiser_id",
    "appraiser_name",
    "reviewer_id",
    "reviewer_name",
    "due_at",
    "last_activity_at",
    "created_at",
    "updated_at"
   FROM "public"."v_orders_unified";


CREATE OR REPLACE VIEW "public"."v_orders_unified_list" AS
 SELECT "id",
    "order_number",
    "address",
    "city",
    "state",
    "postal_code",
    "status",
    "report_type",
    "property_type",
    "client_id",
    "client_name",
    "appraiser_id",
    "appraiser_name",
    "reviewer_id",
    "reviewer_name",
    "due_at",
    "last_activity_at",
    "created_at",
    "updated_at"
   FROM "public"."v_orders_unified";


CREATE OR REPLACE VIEW "public"."v_staging_raw_orders_2025_ord" AS
 SELECT "ctid" AS "_ctid",
    "Order #" AS "col1",
    "Address of Property / 
Approaches to Value" AS "col2",
    "Client
Contact" AS "col3",
    "Property Type /
Assigned Appraiser" AS "col4",
    "Fee" AS "col5",
    "Date Ordered" AS "col6",
    "Due for Review" AS "col7",
    "Due to Client" AS "col8",
    "Inspection" AS "col9",
    "Date Billed" AS "col10",
    "Date Paid" AS "col11",
    NULL::"text" AS "col12",
    NULL::"text" AS "col13",
    NULL::"text" AS "col14",
    NULL::"text" AS "col15",
    NULL::"text" AS "col16",
    NULL::"text" AS "col17",
    NULL::"text" AS "col18",
    NULL::"text" AS "col19",
    NULL::"text" AS "col20",
    NULL::"text" AS "col21"
   FROM "public"."staging_raw_orders_2025_csv";


CREATE OR REPLACE VIEW "public"."v_user_notification_prefs" AS
 WITH "granular" AS (
         SELECT "user_notification_prefs"."user_id",
            "user_notification_prefs"."type",
            "user_notification_prefs"."channel",
            "user_notification_prefs"."enabled",
            "user_notification_prefs"."meta"
           FROM "public"."user_notification_prefs"
        ), "coarse" AS (
         SELECT "np"."user_id",
            "kv"."key" AS "type",
            'email'::"text" AS "channel",
            ("kv"."value")::boolean AS "enabled",
            "jsonb_build_object"('source', 'legacy') AS "meta"
           FROM ("public"."notification_prefs" "np"
             CROSS JOIN LATERAL "jsonb_each"(COALESCE("np"."categories", '{}'::"jsonb")) "kv"("key", "value"))
        )
 SELECT "granular"."user_id",
    "granular"."type",
    "granular"."channel",
    "granular"."enabled",
    "granular"."meta"
   FROM "granular"
UNION ALL
 SELECT "c"."user_id",
    "c"."type",
    "c"."channel",
    "c"."enabled",
    "c"."meta"
   FROM "coarse" "c"
  WHERE (NOT (EXISTS ( SELECT 1
           FROM "granular" "g"
          WHERE (("g"."user_id" = "c"."user_id") AND ("g"."type" = "c"."type") AND ("g"."channel" = "c"."channel")))));


ALTER TABLE ONLY "public"."identity_role_review_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."identity_role_review_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."instance_blueprint" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."instance_blueprint_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."order_assignments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."order_assignments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."schema_decisions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."schema_decisions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."schema_registry" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."schema_registry_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."_view_backups"
    ADD CONSTRAINT "_view_backups_pkey" PRIMARY KEY ("view_name");



ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amc_lenders"
    ADD CONSTRAINT "amc_lenders_pkey" PRIMARY KEY ("amc_id", "lender_id");



ALTER TABLE ONLY "public"."amcs"
    ADD CONSTRAINT "amcs_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."amcs"
    ADD CONSTRAINT "amcs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appraiser_licenses"
    ADD CONSTRAINT "appraiser_licenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_name_uniq" UNIQUE ("name");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_outbox"
    ADD CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_queue"
    ADD CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."identity_role_backfill_log"
    ADD CONSTRAINT "identity_role_backfill_log_pkey" PRIMARY KEY ("migration_tag", "user_id", "role");



ALTER TABLE ONLY "public"."identity_role_review_log"
    ADD CONSTRAINT "identity_role_review_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instance_blueprint"
    ADD CONSTRAINT "instance_blueprint_phase_step_order_key" UNIQUE ("phase", "step_order");



ALTER TABLE ONLY "public"."instance_blueprint"
    ADD CONSTRAINT "instance_blueprint_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instance_blueprint"
    ADD CONSTRAINT "instance_blueprint_step_key_key" UNIQUE ("step_key");



ALTER TABLE ONLY "public"."notification_policies"
    ADD CONSTRAINT "notification_policies_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."notification_policies"
    ADD CONSTRAINT "notification_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."notification_prefs"
    ADD CONSTRAINT "notification_prefs_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_activity"
    ADD CONSTRAINT "order_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_assignments"
    ADD CONSTRAINT "order_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_counters"
    ADD CONSTRAINT "order_counters_pkey" PRIMARY KEY ("year");



ALTER TABLE ONLY "public"."order_number_counters"
    ADD CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_number_counters"
    ADD CONSTRAINT "order_number_counters_rule_year_key" UNIQUE ("rule_id", "counter_year");



ALTER TABLE ONLY "public"."order_numbering_rules"
    ADD CONSTRAINT "order_numbering_rules_company_key_key" UNIQUE ("company_key");



ALTER TABLE ONLY "public"."order_numbering_rules"
    ADD CONSTRAINT "order_numbering_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_log"
    ADD CONSTRAINT "order_status_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_external_order_no_uniq" UNIQUE ("external_order_no");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."profiles_legacy"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_flow"
    ADD CONSTRAINT "review_flow_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_key");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schema_decisions"
    ADD CONSTRAINT "schema_decisions_decision_key_key" UNIQUE ("decision_key");



ALTER TABLE ONLY "public"."schema_decisions"
    ADD CONSTRAINT "schema_decisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schema_registry"
    ADD CONSTRAINT "schema_registry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schema_registry"
    ADD CONSTRAINT "schema_registry_schema_name_object_type_object_name_key" UNIQUE ("schema_name", "object_type", "object_name");



ALTER TABLE ONLY "public"."user_documents"
    ADD CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_prefs"
    ADD CONSTRAINT "user_notification_prefs_pkey" PRIMARY KEY ("user_id", "type", "channel");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pk" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "activity_log_created_at_idx" ON "public"."activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "activity_log_created_idx" ON "public"."activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "activity_log_order_id_idx" ON "public"."activity_log" USING "btree" ("order_id");



CREATE INDEX "cal_events_start_idx" ON "public"."calendar_events" USING "btree" ("start_at");



CREATE INDEX "cal_events_type_idx" ON "public"."calendar_events" USING "btree" ("event_type");



CREATE INDEX "idx_activity_log_created_at" ON "public"."activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_log_created_by" ON "public"."activity_log" USING "btree" ("created_by");



CREATE INDEX "idx_activity_log_order_created" ON "public"."activity_log" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_activity_log_order_created_at" ON "public"."activity_log" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_activity_log_order_id" ON "public"."activity_log" USING "btree" ("order_id");



CREATE INDEX "idx_activity_order_created" ON "public"."activity_log" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_activity_order_id_created_at" ON "public"."activity_log" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_appt_order_start" ON "public"."appointments" USING "btree" ("order_id", "start_at");



CREATE INDEX "idx_calendar_appraiser_start" ON "public"."calendar_events" USING "btree" ("appraiser_id", "start_at");



CREATE INDEX "idx_calendar_events_order_start" ON "public"."calendar_events" USING "btree" ("order_id", "start_at");



CREATE INDEX "idx_clients_category" ON "public"."clients" USING "btree" ("category");



CREATE INDEX "idx_clients_is_merged" ON "public"."clients" USING "btree" ("is_merged");



CREATE INDEX "idx_clients_merged_into_id" ON "public"."clients" USING "btree" ("merged_into_id");



CREATE INDEX "idx_clients_name" ON "public"."clients" USING "btree" ("name");



CREATE INDEX "idx_contacts_client_id" ON "public"."contacts" USING "btree" ("client_id");



CREATE INDEX "idx_email_queue_status_created" ON "public"."email_queue" USING "btree" ("status", "created_at");



CREATE INDEX "idx_emailqueue_status_created" ON "public"."email_queue" USING "btree" ("status", "created_at");



CREATE INDEX "idx_identity_role_review_log_tag_issue" ON "public"."identity_role_review_log" USING "btree" ("migration_tag", "issue_type");



CREATE INDEX "idx_licenses_exp" ON "public"."appraiser_licenses" USING "btree" ("expires_at");



CREATE INDEX "idx_licenses_user" ON "public"."appraiser_licenses" USING "btree" ("user_id");



CREATE INDEX "idx_notification_prefs_updated" ON "public"."notification_prefs" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_notifications_order" ON "public"."notifications" USING "btree" ("order_id");



CREATE INDEX "idx_notifications_priority" ON "public"."notifications" USING "btree" ("priority");



CREATE INDEX "idx_notifications_user_category_created" ON "public"."notifications" USING "btree" ("user_id", "category", "created_at" DESC);



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_dismissed_created" ON "public"."notifications" USING "btree" ("user_id", "dismissed_at", "created_at" DESC);



CREATE INDEX "idx_notifications_user_isread" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_oa_order" ON "public"."order_assignments" USING "btree" ("order_id");



CREATE INDEX "idx_oa_user" ON "public"."order_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_order_activity_created_at" ON "public"."order_activity" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_order_activity_order" ON "public"."order_activity" USING "btree" ("order_id");



CREATE INDEX "idx_order_activity_order_id" ON "public"."order_activity" USING "btree" ("order_id");



CREATE INDEX "idx_orderassign_order" ON "public"."order_assignments" USING "btree" ("order_id");



CREATE INDEX "idx_orders_amc_id" ON "public"."orders" USING "btree" ("amc_id");



CREATE INDEX "idx_orders_appraiser" ON "public"."orders" USING "btree" ("appraiser_id");



CREATE INDEX "idx_orders_appraiser_id" ON "public"."orders" USING "btree" ("appraiser_id");



CREATE INDEX "idx_orders_assigned_to" ON "public"."orders" USING "btree" ("assigned_to");



CREATE INDEX "idx_orders_assigned_to_created_at" ON "public"."orders" USING "btree" ("assigned_to", "created_at" DESC);



CREATE INDEX "idx_orders_client" ON "public"."orders" USING "btree" ("client_id");



CREATE INDEX "idx_orders_client_id" ON "public"."orders" USING "btree" ("client_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_current_reviewer" ON "public"."orders" USING "btree" ("current_reviewer_id");



CREATE INDEX "idx_orders_date_ordered" ON "public"."orders" USING "btree" ("date_ordered");



CREATE INDEX "idx_orders_due_date" ON "public"."orders" USING "btree" ("due_date");



CREATE INDEX "idx_orders_ext_no" ON "public"."orders" USING "btree" ("external_order_no");



CREATE INDEX "idx_orders_final_due" ON "public"."orders" USING "btree" ("final_due_at");



CREATE INDEX "idx_orders_final_due_at" ON "public"."orders" USING "btree" ("final_due_at");



CREATE INDEX "idx_orders_managing_amc" ON "public"."orders" USING "btree" ("managing_amc_id");



CREATE INDEX "idx_orders_order_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_review_due_at" ON "public"."orders" USING "btree" ("review_due_at");



CREATE INDEX "idx_orders_site_visit_at" ON "public"."orders" USING "btree" ("site_visit_at");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_statuslog_order_created" ON "public"."order_status_log" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_unp_user" ON "public"."user_notification_prefs" USING "btree" ("user_id");



CREATE INDEX "idx_unp_user_channel" ON "public"."user_notification_prefs" USING "btree" ("user_id", "channel");



CREATE INDEX "idx_unp_user_type" ON "public"."user_notification_prefs" USING "btree" ("user_id", "type");



CREATE INDEX "idx_user_docs_user" ON "public"."user_documents" USING "btree" ("user_id");



CREATE INDEX "idx_user_settings_user" ON "public"."user_settings" USING "btree" ("user_id");



CREATE INDEX "idx_users_auth_id" ON "public"."users" USING "btree" ("auth_id");



CREATE INDEX "orders_active_created_at_idx" ON "public"."orders" USING "btree" ("created_at" DESC) WHERE (NOT COALESCE("is_archived", false));



CREATE INDEX "orders_appraiser_id_idx" ON "public"."orders" USING "btree" ("appraiser_id");



CREATE INDEX "orders_assigned_to_idx" ON "public"."orders" USING "btree" ("assigned_to");



CREATE INDEX "orders_client_id_idx" ON "public"."orders" USING "btree" ("client_id");



CREATE INDEX "orders_created_at_idx" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "orders_due_date_idx" ON "public"."orders" USING "btree" ("due_date");



CREATE UNIQUE INDEX "orders_order_number_unique_idx" ON "public"."orders" USING "btree" ("order_number") WHERE ("order_number" IS NOT NULL);



CREATE INDEX "orders_owner_id_idx" ON "public"."orders" USING "btree" ("owner_id");



CREATE INDEX "orders_review_due_date_idx" ON "public"."orders" USING "btree" ("review_due_date");



CREATE INDEX "orders_reviewer_id_idx" ON "public"."orders" USING "btree" ("reviewer_id");



CREATE INDEX "orders_status_idx" ON "public"."orders" USING "btree" ("status");



CREATE UNIQUE INDEX "roles_company_name_unique" ON "public"."roles" USING "btree" ("company_id", "lower"("name")) WHERE ("company_id" IS NOT NULL);



CREATE UNIQUE INDEX "roles_template_name_unique" ON "public"."roles" USING "btree" ("lower"("name")) WHERE ("company_id" IS NULL);



CREATE UNIQUE INDEX "uq_users_email" ON "public"."users" USING "btree" ("email");



CREATE UNIQUE INDEX "user_roles_user_id_uidx" ON "public"."user_roles" USING "btree" ("user_id");



CREATE UNIQUE INDEX "users_auth_id_unique" ON "public"."users" USING "btree" ("auth_id");



CREATE UNIQUE INDEX "users_email_unique" ON "public"."users" USING "btree" ("lower"("email"));



CREATE UNIQUE INDEX "users_uid_unique" ON "public"."users" USING "btree" ("uid") WHERE ("uid" IS NOT NULL);



CREATE UNIQUE INDEX "ux_users_email" ON "public"."users" USING "btree" ("lower"("email"));



CREATE OR REPLACE VIEW "public"."v_client_kpis" AS
 WITH "o" AS (
         SELECT "o1"."id",
            ("to_jsonb"("o1".*) ->> 'client_id'::"text") AS "client_id_text",
            NULLIF(COALESCE((("to_jsonb"("o1".*) ->> 'fee_amount'::"text"))::numeric, (("to_jsonb"("o1".*) ->> 'base_fee'::"text"))::numeric, (("to_jsonb"("o1".*) ->> 'appraiser_fee'::"text"))::numeric, (0)::numeric), (0)::numeric) AS "fee_val",
            (("to_jsonb"("o1".*) ->> 'created_at'::"text"))::timestamp with time zone AS "created_at"
           FROM "public"."orders" "o1"
        )
 SELECT ("c"."id")::"text" AS "client_id",
    ("to_jsonb"("c".*) ->> 'name'::"text") AS "client_name",
    ("to_jsonb"("c".*) ->> 'primary_contact_name'::"text") AS "primary_contact_name",
    ("to_jsonb"("c".*) ->> 'primary_contact_phone'::"text") AS "primary_contact_phone",
    "count"("o"."id") AS "total_orders",
    ("avg"("o"."fee_val"))::numeric(12,2) AS "avg_total_fee",
    "max"("o"."created_at") AS "last_order_at"
   FROM ("public"."clients" "c"
     LEFT JOIN "o" ON (("o"."client_id_text" = ("c"."id")::"text")))
  GROUP BY "c"."id";



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles_legacy"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."amc_lenders"
    ADD CONSTRAINT "amc_lenders_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."amc_lenders"
    ADD CONSTRAINT "amc_lenders_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appraiser_licenses"
    ADD CONSTRAINT "appraiser_licenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_appraiser_id_fkey" FOREIGN KEY ("appraiser_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_appraiser_user_fkey" FOREIGN KEY ("appraiser_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_outbox"
    ADD CONSTRAINT "email_outbox_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_outbox"
    ADD CONSTRAINT "email_outbox_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_queue"
    ADD CONSTRAINT "email_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_assignments"
    ADD CONSTRAINT "fk_assign_user" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_branch_id" FOREIGN KEY ("branch_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."notification_prefs"
    ADD CONSTRAINT "fk_notificationprefs_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_orders_appraiser" FOREIGN KEY ("appraiser_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_orders_client" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_orders_current_reviewer" FOREIGN KEY ("current_reviewer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_orders_owner" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_orders_reviewer" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "fk_parent_id" FOREIGN KEY ("parent_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."user_notification_prefs"
    ADD CONSTRAINT "fk_unp_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."order_activity"
    ADD CONSTRAINT "order_activity_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_activity"
    ADD CONSTRAINT "order_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_activity"
    ADD CONSTRAINT "order_activity_user_uid_fkey" FOREIGN KEY ("user_uid") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_assignments"
    ADD CONSTRAINT "order_assignments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_assignments"
    ADD CONSTRAINT "order_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_assignments"
    ADD CONSTRAINT "order_assignments_user_uid_fkey" FOREIGN KEY ("user_uid") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_number_counters"
    ADD CONSTRAINT "order_number_counters_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."order_numbering_rules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_status_log"
    ADD CONSTRAINT "order_status_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_status_log"
    ADD CONSTRAINT "order_status_log_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "public"."amcs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_managing_amc_id_fkey" FOREIGN KEY ("managing_amc_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles_legacy"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_flow"
    ADD CONSTRAINT "review_flow_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."review_flow"
    ADD CONSTRAINT "review_flow_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."review_flow"
    ADD CONSTRAINT "review_flow_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_documents"
    ADD CONSTRAINT "user_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_prefs"
    ADD CONSTRAINT "user_notification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_fk" FOREIGN KEY ("auth_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Manual review notes:
-- - Some preserved legacy compatibility functions reference falcon_mvp.* in their bodies.
--   They are retained for behavior parity, but should be verified before relying on them locally.
-- - Static/reference rows are intentionally not embedded in this schema migration.

RESET ALL;
