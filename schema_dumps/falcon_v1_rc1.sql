


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


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'Slice 7H2A: anon/authenticated broad object grants removed. Authenticated access is explicit allowlist only; service_role broad access is temporarily preserved pending operator-path cleanup.';



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


ALTER FUNCTION "public"."_activity_actor"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."_activity_insert"("p_order_id" "uuid", "p_kind" "text", "p_message" "text", "p_meta" "jsonb", "p_created_by" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."_block_deprecated_runtime_writes"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."_col_exists"("p_schema" "text", "p_table" "text", "p_column" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_default_notification_categories"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select jsonb_build_object(
    'assignments', true,
    'reminders',  true,
    'messages',   true
  );
$$;


ALTER FUNCTION "public"."_default_notification_categories"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."_ensure_notification_prefs_for"("user_uuid" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."_maybe_move_fk"("p_table" "regclass", "p_col" "text", "p_from" bigint, "p_to" bigint) OWNER TO "postgres";


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


ALTER FUNCTION "public"."_notification_email_pref"("p_user_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."_notification_email_target"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_notification_email_target_v1"("p_user_id" "uuid") RETURNS TABLE("to_user_id" "uuid", "email_address" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    u.id as to_user_id,
    nullif(btrim(u.email), '') as email_address
    from public.users u
   where u.id = p_user_id
   limit 1;
$$;


ALTER FUNCTION "public"."_notification_email_target_v1"("p_user_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."_notify_user"("p_to_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."_notify_user"("p_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_link_path" "text", "p_payload" "jsonb", "p_priority" "text", "p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_trg_users_after_insert_prefs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public._ensure_notification_prefs_for(NEW.id);
  return NEW;
end;
$$;


ALTER FUNCTION "public"."_trg_users_after_insert_prefs"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."activity_log_compat"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."activity_log_event_type_compat"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."add_order_note"("p_order_id" "uuid", "p_body" "text") OWNER TO "postgres";

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


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_users"() RETURNS SETOF "public"."users"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select *
  from public.users
  order by coalesce(display_name, full_name, name, email);
$$;


ALTER FUNCTION "public"."admin_list_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_user_has_company_role"("p_user_id" "uuid", "p_company_id" "uuid", "p_role_names" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with normalized as (
    select
      p_user_id as user_id,
      coalesce(p_company_id, public.default_company_id()) as company_id,
      array(
        select lower(trim(role_name))
        from unnest(coalesce(p_role_names, array[]::text[])) as role_name
        where nullif(trim(role_name), '') is not null
      ) as role_names
  )
  select exists (
    select 1
    from normalized n
    join public.company_memberships cm
      on cm.user_id = n.user_id
     and cm.company_id = n.company_id
     and cm.status = 'active'
    join public.user_role_assignments ura
      on ura.user_id = n.user_id
     and ura.company_id = n.company_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
    join public.roles r
      on r.id = ura.role_id
    where lower(r.name) = any(n.role_names)
  )
  or exists (
    select 1
    from normalized n
    join public.company_memberships cm
      on cm.user_id = n.user_id
     and cm.company_id = n.company_id
     and cm.status = 'active'
    join public.user_roles ur
      on ur.user_id = n.user_id
    where n.company_id = public.default_company_id()
      and lower(ur.role) = any(n.role_names)
  );
$$;


ALTER FUNCTION "public"."app_user_has_company_role"("p_user_id" "uuid", "p_company_id" "uuid", "p_role_names" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."app_user_has_company_role"("p_user_id" "uuid", "p_company_id" "uuid", "p_role_names" "text"[]) IS 'Slice 7F4A helper. Checks active company membership plus current-company role assignment, with default-company legacy role fallback for compatibility.';



CREATE OR REPLACE FUNCTION "public"."app_user_permission_keys_for_company"("p_user_id" "uuid", "p_company_id" "uuid") RETURNS SETOF "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with ctx as (
    select
      p_user_id as user_id,
      p_company_id as company_id,
      public.default_company_id() as default_company_id
  ),
  membership as (
    select cm.id as membership_id
      from ctx
      join public.company_memberships cm
        on cm.user_id = ctx.user_id
       and cm.company_id = ctx.company_id
       and cm.status = 'active'
     where ctx.user_id is not null
       and ctx.company_id is not null
  ),
  assigned_roles as (
    select r.id, r.name, r.is_owner_role
      from ctx
      join membership on true
      join public.user_role_assignments ura
        on ura.user_id = ctx.user_id
       and ura.company_id = ctx.company_id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
      join public.roles r
        on r.id = ura.role_id
  ),
  legacy_roles as (
    select distinct lower(trim(ur.role)) as role_name
      from ctx
      join membership on true
      left join public.users u
        on u.id = ctx.user_id
      join public.user_roles ur
        on ur.user_id = ctx.user_id
        or ur.user_id = u.auth_id
     where ctx.company_id = ctx.default_company_id
       and ur.role is not null
  ),
  owner_permissions as (
    select p.key
      from public.permissions p
     where exists (
       select 1
         from assigned_roles ar
        where ar.is_owner_role
           or lower(ar.name) = 'owner'
     )
        or exists (
       select 1
         from legacy_roles lr
        where lr.role_name = 'owner'
     )
  ),
  assigned_role_permissions as (
    select rp.permission_key as key
      from assigned_roles ar
      join public.role_permissions rp
        on rp.role_id = ar.id
  ),
  legacy_template_role_permissions as (
    select rp.permission_key as key
      from legacy_roles lr
      join public.roles r
        on r.company_id is null
       and lower(r.name) = lr.role_name
      join public.role_permissions rp
        on rp.role_id = r.id
  ),
  role_derived_permissions as (
    select key from owner_permissions
    union
    select key from assigned_role_permissions
    union
    select key from legacy_template_role_permissions
  ),
  explicit_grants as (
    select cmpo.permission_key as key
      from ctx
      join membership m on true
      join public.company_member_permission_overrides cmpo
        on cmpo.company_id = ctx.company_id
       and cmpo.membership_id = m.membership_id
       and cmpo.user_id = ctx.user_id
       and cmpo.effect = 'grant'
  ),
  explicit_revokes as (
    select cmpo.permission_key as key
      from ctx
      join membership m on true
      join public.company_member_permission_overrides cmpo
        on cmpo.company_id = ctx.company_id
       and cmpo.membership_id = m.membership_id
       and cmpo.user_id = ctx.user_id
       and cmpo.effect = 'revoke'
  )
  select distinct key
    from (
      select key from role_derived_permissions
      union
      select key from explicit_grants
    ) permissions
   where key is not null
     and not exists (
       select 1
         from explicit_revokes er
        where er.key = permissions.key
     )
   order by key;
$$;


ALTER FUNCTION "public"."app_user_permission_keys_for_company"("p_user_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."app_user_permission_keys_for_company"("p_user_id" "uuid", "p_company_id" "uuid") IS 'Target-user company-aware effective permission resolver. Effective permissions are active role permissions plus explicit grants minus explicit revokes.';



CREATE OR REPLACE FUNCTION "public"."assert_company_will_have_owner"("p_company_id" "uuid", "p_excluding_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_owner_count integer;
begin
  select count(distinct ura.user_id)::integer
    into v_owner_count
    from public.user_role_assignments ura
    join public.company_memberships cm
      on cm.company_id = ura.company_id
     and cm.user_id = ura.user_id
     and cm.status = 'active'
    join public.roles r
      on r.id = ura.role_id
   where ura.company_id = p_company_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
     and (r.is_owner_role = true or lower(r.name) = 'owner')
     and (p_excluding_user_id is null or ura.user_id <> p_excluding_user_id);

  if coalesce(v_owner_count, 0) < 1 then
    raise exception 'company_owner_required'
      using errcode = '23514',
            detail = 'A company must retain at least one active owner.';
  end if;

  return true;
end;
$$;


ALTER FUNCTION "public"."assert_company_will_have_owner"("p_company_id" "uuid", "p_excluding_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."assert_company_will_have_owner"("p_company_id" "uuid", "p_excluding_user_id" "uuid") IS 'Raises company_owner_required when excluding a user would leave a company with no active owner.';



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


ALTER FUNCTION "public"."assert_role"("roles" "text"[]) OWNER TO "postgres";


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


ALTER FUNCTION "public"."assign_order"("p_order_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_order"("p_order_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_app_user_can_read_order(p_order_id);
$$;


ALTER FUNCTION "public"."can_read_order"("p_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_read_order"("p_order_id" "uuid") IS 'Compatibility wrapper delegated to current_app_user_can_read_order(uuid).';



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


ALTER FUNCTION "public"."client_metrics_rollup"("p_client_ids" bigint[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."client_name_taken"("p_name" "text", "p_ignore_id" bigint DEFAULT NULL::bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
      from public.clients c
     where coalesce(c.company_id, public.default_company_id()) = public.current_company_id()
       and public.current_app_user_can_read_client_row(c.company_id, c.id)
       and lower(trim(coalesce(c.name, ''))) = lower(trim(coalesce(p_name, '')))
       and (p_ignore_id is null or c.id <> p_ignore_id)
       and coalesce(c.is_merged, false) = false
  );
$$;


ALTER FUNCTION "public"."client_name_taken"("p_name" "text", "p_ignore_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."client_name_taken"("p_name" "text", "p_ignore_id" bigint) IS 'Slice 7D duplicate-name check scoped to current_company_id() and readable clients.';



CREATE OR REPLACE FUNCTION "public"."company_active_owner_count"("p_company_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select count(distinct ura.user_id)::integer
    from public.user_role_assignments ura
    join public.company_memberships cm
      on cm.company_id = ura.company_id
     and cm.user_id = ura.user_id
     and cm.status = 'active'
    join public.roles r
      on r.id = ura.role_id
   where ura.company_id = p_company_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
     and (r.is_owner_role = true or lower(r.name) = 'owner');
$$;


ALTER FUNCTION "public"."company_active_owner_count"("p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."company_active_owner_count"("p_company_id" "uuid") IS 'Counts active owner-role assignments for active members of a company. Service-role helper for owner invariants.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_access_notification_row"("p_user_id" "uuid", "p_order_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    auth.role() = 'service_role'
    or (
      p_user_id = public.current_app_user_id()
      and (
        p_order_id is null
        or public.current_app_user_can_read_order(p_order_id)
      )
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_access_notification_row"("p_user_id" "uuid", "p_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_access_notification_row"("p_user_id" "uuid", "p_order_id" "uuid") IS 'Slice 7G2A notification row predicate. Personal notifications require current_app_user_id(); order-tied notifications additionally require readable source orders.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_approve_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and public.current_company_id() = p_target_company_id
    and public.current_company_id() <> p_source_company_id
    and public.current_app_user_has_permission('relationships.approve');
$$;


ALTER FUNCTION "public"."current_app_user_can_approve_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_approve_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") IS 'Phase 8B3 relationship helper. Allows target-company users with relationships.approve to accept or decline incoming invitations.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_archive_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and public.current_company_id() = p_source_company_id
    and public.current_company_id() <> p_target_company_id
    and public.current_app_user_has_permission('relationships.archive');
$$;


ALTER FUNCTION "public"."current_app_user_can_archive_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_archive_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") IS 'Phase 8B3 relationship helper. Allows source-company users with relationships.archive to archive a relationship.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_assign_order_target"("p_target_user_id" "uuid", "p_company_id" "uuid", "p_assignment_kind" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with normalized as (
    select
      p_target_user_id as target_user_id,
      coalesce(p_company_id, public.default_company_id()) as company_id,
      lower(trim(coalesce(p_assignment_kind, ''))) as assignment_kind
  ),
  required_permission as (
    select
      n.target_user_id,
      n.company_id,
      case
        when n.assignment_kind in ('appraiser', 'assigned_to') then 'orders.assignable_as_appraiser'
        when n.assignment_kind in ('reviewer', 'current_reviewer') then 'orders.assignable_as_reviewer'
        else null
      end as permission_key
    from normalized n
  )
  select
    p_target_user_id is null
    or auth.role() = 'service_role'
    or exists (
      select 1
        from required_permission rp
        join public.company_memberships cm
          on cm.user_id = rp.target_user_id
         and cm.company_id = rp.company_id
         and cm.status = 'active'
        join public.app_user_permission_keys_for_company(rp.target_user_id, rp.company_id) granted(permission_key)
          on granted.permission_key = rp.permission_key
       where rp.company_id = public.current_company_id()
         and rp.permission_key is not null
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_assign_order_target"("p_target_user_id" "uuid", "p_company_id" "uuid", "p_assignment_kind" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_assign_order_target"("p_target_user_id" "uuid", "p_company_id" "uuid", "p_assignment_kind" "text") IS 'Validates appraiser/reviewer assignment targets using explicit work eligibility permissions instead of role labels.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_attach_order_amc"("p_client_id" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    p_client_id is null
    or exists (
      select 1
      from public.clients c
      where c.id = p_client_id
        and coalesce(c.company_id, public.default_company_id()) = public.current_company_id()
        and coalesce(c.is_merged, false) = false
        and lower(coalesce(c.category, '')) = 'amc'
        and (
          auth.role() = 'service_role'
          or public.current_app_user_can_read_client_row(c.company_id, c.id)
        )
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_attach_order_amc"("p_client_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_attach_order_amc"("p_client_id" bigint) IS 'Slice 7E3A order AMC attachment predicate. Linked AMC must be a readable, current-company, non-merged clients row with category=amc. Null is allowed.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_attach_order_client"("p_client_id" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    p_client_id is null
    or exists (
      select 1
      from public.clients c
      where c.id = p_client_id
        and coalesce(c.company_id, public.default_company_id()) = public.current_company_id()
        and coalesce(c.is_merged, false) = false
        and (
          auth.role() = 'service_role'
          or public.current_app_user_can_read_client_row(c.company_id, c.id)
        )
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_attach_order_client"("p_client_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_attach_order_client"("p_client_id" bigint) IS 'Slice 7E3A order client attachment predicate. Linked client must be readable, current-company, and non-merged. Null is allowed for manual-only intake.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_create_client"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and public.current_app_user_has_permission('clients.create');
$$;


ALTER FUNCTION "public"."current_app_user_can_create_client"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_create_client"() IS 'Slice 7E1 client create predicate. Requires current-company membership and clients.create.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_create_order"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    auth.role() = 'service_role'
    or (
      public.current_app_user_has_current_company()
      and public.current_app_user_has_permission('orders.create')
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_create_order"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_create_order"() IS 'Slice 7E3A order create predicate. Requires current-company membership and orders.create; service_role is allowed for backend jobs.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_delete_client_row"("p_company_id" "uuid", "p_client_id" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
    and public.current_app_user_has_permission('clients.delete');
$$;


ALTER FUNCTION "public"."current_app_user_can_delete_client_row"("p_company_id" "uuid", "p_client_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_delete_client_row"("p_company_id" "uuid", "p_client_id" bigint) IS 'Slice 7E1 client delete predicate. Requires current-company membership, client company match, and clients.delete. Hard-delete semantics are preserved; archive behavior is deferred.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_invite_company_relationship"("p_target_company_id" "uuid", "p_relationship_type" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with ctx as (
    select public.current_company_id() as source_company_id
  ),
  relationship_type as (
    select crt.*
      from public.company_relationship_types crt
     where crt.key = p_relationship_type
       and crt.is_active
  ),
  source_company as (
    select c.*
      from public.companies c
      join ctx on ctx.source_company_id = c.id
     where c.status = 'active'
  ),
  target_company as (
    select c.*
      from public.companies c
     where c.id = p_target_company_id
       and c.status = 'active'
  )
  select exists (
    select 1
      from ctx
      join relationship_type rt on true
      join source_company sc on true
      join target_company tc on true
     where public.current_app_user_has_current_company()
       and public.current_app_user_has_permission('relationships.invite')
       and ctx.source_company_id <> p_target_company_id
       and (
         coalesce(array_length(rt.allowed_source_company_types, 1), 0) = 0
         or sc.company_type = any(rt.allowed_source_company_types)
       )
       and (
         coalesce(array_length(rt.allowed_target_company_types, 1), 0) = 0
         or tc.company_type = any(rt.allowed_target_company_types)
       )
       and not exists (
         select 1
           from public.company_relationships cr
          where cr.source_company_id = ctx.source_company_id
            and cr.target_company_id = p_target_company_id
            and cr.relationship_type = p_relationship_type
            and cr.status in ('invited', 'active', 'suspended')
       )
  );
$$;


ALTER FUNCTION "public"."current_app_user_can_invite_company_relationship"("p_target_company_id" "uuid", "p_relationship_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_invite_company_relationship"("p_target_company_id" "uuid", "p_relationship_type" "text") IS 'Phase 8B3 relationship helper. Allows current-company users with relationships.invite to invite active target companies into valid directional relationship types. Relationship existence does not grant order visibility.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_manage_company_relationship_compliance"("p_source_company_id" "uuid", "p_target_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and public.current_company_id() in (p_source_company_id, p_target_company_id)
    and public.current_app_user_has_permission('relationships.manage_compliance');
$$;


ALTER FUNCTION "public"."current_app_user_can_manage_company_relationship_compliance"("p_source_company_id" "uuid", "p_target_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_manage_company_relationship_compliance"("p_source_company_id" "uuid", "p_target_company_id" "uuid") IS 'Phase 8B3 relationship helper reserved for future compliance update RPCs. It does not grant relationship visibility or operational visibility by itself.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_read_client_row"("p_company_id" "uuid", "p_client_id" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
    and (
      public.current_app_user_has_permission('clients.read.all')
      or (
        public.current_app_user_has_permission('clients.read.assigned')
        and exists (
          select 1
          from public.orders o
          where (o.client_id = p_client_id or o.managing_amc_id = p_client_id)
            and public.current_app_user_can_read_order(o.id)
        )
      )
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_read_client_row"("p_company_id" "uuid", "p_client_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_read_client_row"("p_company_id" "uuid", "p_client_id" bigint) IS 'Slice 7D client read predicate. Requires current-company membership, client company match, and either clients.read.all or clients.read.assigned through a readable source order.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_read_company_relationship_row"("p_source_company_id" "uuid", "p_target_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and public.current_company_id() in (p_source_company_id, p_target_company_id)
    and public.current_app_user_has_permission('relationships.read');
$$;


ALTER FUNCTION "public"."current_app_user_can_read_company_relationship_row"("p_source_company_id" "uuid", "p_target_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_read_company_relationship_row"("p_source_company_id" "uuid", "p_target_company_id" "uuid") IS 'Phase 8B3 relationship helper. Allows reading relationship rows involving current_company_id() only when the user has relationships.read. Relationship reads do not grant order or operational visibility.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_read_order"("p_order_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and public.current_app_user_can_read_order_row(
        o.company_id,
        o.appraiser_id,
        o.assigned_to,
        o.reviewer_id,
        o.status
      )
  );
$$;


ALTER FUNCTION "public"."current_app_user_can_read_order"("p_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_read_order"("p_order_id" "uuid") IS 'Slice 7B order read predicate by id for RPCs and derived read surfaces.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_read_order_document_row"("p_company_id" "uuid", "p_order_id" "uuid", "p_visibility_scope" "text", "p_status" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
    and coalesce(p_status, '') <> 'deleted'
    and public.current_app_user_can_read_order(p_order_id)
    and (
      public.current_app_user_has_permission('documents.read.all')
      or (
        public.current_app_user_has_permission('documents.read.assigned')
        and coalesce(p_visibility_scope, 'internal') = any (array['internal', 'assigned', 'audit'])
      )
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_read_order_document_row"("p_company_id" "uuid", "p_order_id" "uuid", "p_visibility_scope" "text", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_read_order_document_row"("p_company_id" "uuid", "p_order_id" "uuid", "p_visibility_scope" "text", "p_status" "text") IS 'Checks current company, readable order scope, non-deleted status, and document read permission for order document metadata.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_read_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
    and (
      public.current_app_user_has_permission('orders.read.all')
      or (
        public.current_app_user_has_permission('orders.read.assigned')
        and (
          coalesce(p_appraiser_id, p_assigned_to) = public.current_app_user_id()
          or (
            p_reviewer_id = public.current_app_user_id()
            and lower(coalesce(p_status, '')) = any (
              array['in_review', 'needs_revisions', 'review_cleared', 'completed']
            )
          )
        )
      )
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_read_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_read_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") IS 'Company-scoped order row read helper. Uses normalized permission keys orders.read.all and orders.read.assigned; does not use legacy public.user_roles or public.users.role.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_suspend_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and public.current_company_id() in (p_source_company_id, p_target_company_id)
    and public.current_app_user_has_permission('relationships.suspend');
$$;


ALTER FUNCTION "public"."current_app_user_can_suspend_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_suspend_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") IS 'Phase 8B3 relationship helper. Allows source or target participants with relationships.suspend to suspend/reactivate a relationship without changing operational visibility.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_update_client_row"("p_company_id" "uuid", "p_client_id" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
    and (
      public.current_app_user_has_permission('clients.update.all')
      or (
        public.current_app_user_has_permission('clients.update.assigned')
        and exists (
          select 1
          from public.orders o
          where (o.client_id = p_client_id or o.managing_amc_id = p_client_id)
            and public.current_app_user_can_read_order(o.id)
        )
      )
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_update_client_row"("p_company_id" "uuid", "p_client_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_update_client_row"("p_company_id" "uuid", "p_client_id" bigint) IS 'Slice 7E1 client update predicate. Requires current-company membership, client company match, and clients.update.all or clients.update.assigned through a readable source order.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_update_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    auth.role() = 'service_role'
    or (
      public.current_app_user_has_current_company()
      and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
      and (
        public.current_app_user_has_permission('orders.update.all')
        or (
          public.current_app_user_has_permission('orders.update.assigned')
          and public.current_app_user_can_read_order_row(
            p_company_id,
            p_appraiser_id,
            p_assigned_to,
            p_reviewer_id,
            p_status
          )
        )
      )
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_update_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_update_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") IS 'Slice 7E3A order update predicate. Requires current-company membership, company match, and orders.update.all or orders.update.assigned through readable order responsibility.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_upload_order_document_row"("p_company_id" "uuid", "p_order_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
    and public.current_app_user_can_read_order(p_order_id)
    and public.current_app_user_can_update_order_row(
      p_company_id,
      p_appraiser_id,
      p_assigned_to,
      p_reviewer_id,
      p_status
    )
    and (
      public.current_app_user_has_permission('documents.upload.all')
      or (
        public.current_app_user_has_permission('documents.upload.assigned')
        and public.current_app_user_can_read_order_row(
          p_company_id,
          p_appraiser_id,
          p_assigned_to,
          p_reviewer_id,
          p_status
        )
      )
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_upload_order_document_row"("p_company_id" "uuid", "p_order_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_upload_order_document_row"("p_company_id" "uuid", "p_order_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") IS 'Checks current-company order upload authority using readable/updateable order scope plus document upload permissions.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_use_order_form_client_options"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_user_has_current_company()
    and (
      public.current_app_user_has_permission('orders.create')
      or public.current_app_user_has_permission('orders.update.all')
      or public.current_app_user_has_permission('clients.create')
      or public.current_app_user_has_permission('clients.update.all')
      or public.current_app_user_has_permission('clients.read.all')
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_use_order_form_client_options"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_use_order_form_client_options"() IS 'Phase 8C5G4C1 helper for order form client/AMC picker projections. Requires current-company membership and order/client write/read capability.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_can_write_order_activity"("p_order_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.orders o
      where o.id = p_order_id
        and public.current_app_user_has_current_company()
        and coalesce(o.company_id, public.default_company_id()) = public.current_company_id()
        and public.current_app_user_can_read_order(o.id)
        and public.current_app_user_can_update_order_row(
          o.company_id,
          o.appraiser_id,
          o.assigned_to,
          o.reviewer_id,
          o.status
        )
    );
$$;


ALTER FUNCTION "public"."current_app_user_can_write_order_activity"("p_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_can_write_order_activity"("p_order_id" "uuid") IS 'Slice 7G1 activity write predicate. Authenticated app writes require current-company membership plus readable and updateable source order; order_id-null system rows are hidden/blocked from app roles.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_company_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select cm.company_id
    from public.company_memberships cm
   where cm.user_id = public.current_app_user_id()
     and cm.status = 'active'
   order by cm.is_primary desc, cm.joined_at nulls last, cm.created_at;
$$;


ALTER FUNCTION "public"."current_app_user_company_ids"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_company_ids"() IS 'Returns active company memberships for the current app user. Not yet used for RLS enforcement.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_has_all_permissions"("p_permission_keys" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_app_user_has_all_permissions_for_company(
    public.current_company_id(),
    p_permission_keys
  );
$$;


ALTER FUNCTION "public"."current_app_user_has_all_permissions"("p_permission_keys" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_has_all_permissions"("p_permission_keys" "text"[]) IS 'Compatibility wrapper for active permission checks. Resolves permissions through the current company context.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_has_all_permissions_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select not exists (
    select 1
      from unnest(coalesce(p_permission_keys, '{}'::text[])) requested(permission_key)
     where not exists (
       select 1
         from public.current_app_user_permission_keys_for_company(p_company_id) granted(permission_key)
        where granted.permission_key = requested.permission_key
     )
  );
$$;


ALTER FUNCTION "public"."current_app_user_has_all_permissions_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_has_all_permissions_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) IS 'Additive company-aware all-permissions predicate successor for future wrapper/RLS migration.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_has_any_permission"("p_permission_keys" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_app_user_has_any_permission_for_company(
    public.current_company_id(),
    p_permission_keys
  );
$$;


ALTER FUNCTION "public"."current_app_user_has_any_permission"("p_permission_keys" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_has_any_permission"("p_permission_keys" "text"[]) IS 'Compatibility wrapper for active permission checks. Resolves permissions through the current company context.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_has_any_permission_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
      from unnest(coalesce(p_permission_keys, '{}'::text[])) requested(permission_key)
      join public.current_app_user_permission_keys_for_company(p_company_id) granted(permission_key)
        on granted.permission_key = requested.permission_key
  );
$$;


ALTER FUNCTION "public"."current_app_user_has_any_permission_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_has_any_permission_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) IS 'Additive company-aware any-permission predicate successor for future wrapper/RLS migration.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_has_company"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
      from public.company_memberships cm
     where cm.user_id = public.current_app_user_id()
       and cm.company_id = p_company_id
       and cm.status = 'active'
  );
$$;


ALTER FUNCTION "public"."current_app_user_has_company"("p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_has_company"("p_company_id" "uuid") IS 'Membership predicate for future company-aware authorization. Current RLS remains compatibility/global-mode.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_has_current_company"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_app_user_has_company(public.current_company_id());
$$;


ALTER FUNCTION "public"."current_app_user_has_current_company"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_has_current_company"() IS 'Returns whether the current app user has active membership in the resolved current_company_id(). Compatibility fallback still resolves to falcon_default until org switching is introduced.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_has_permission"("p_permission_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_app_user_has_permission_for_company(
    public.current_company_id(),
    p_permission_key
  );
$$;


ALTER FUNCTION "public"."current_app_user_has_permission"("p_permission_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_has_permission"("p_permission_key" "text") IS 'Compatibility wrapper for active permission checks. Resolves permissions through the current company context.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_has_permission_for_company"("p_company_id" "uuid", "p_permission_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
      from public.current_app_user_permission_keys_for_company(p_company_id) k(permission_key)
     where k.permission_key = p_permission_key
  );
$$;


ALTER FUNCTION "public"."current_app_user_has_permission_for_company"("p_company_id" "uuid", "p_permission_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_has_permission_for_company"("p_company_id" "uuid", "p_permission_key" "text") IS 'Additive company-aware permission predicate successor for future wrapper/RLS migration.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.id
    from public.users u
   where u.auth_id = auth.uid()
   limit 1;
$$;


ALTER FUNCTION "public"."current_app_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_user_notification_role_keys"() RETURNS "text"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with ctx as (
    select public.current_app_user_id() as user_id,
           public.current_company_id() as company_id
  ),
  assigned as (
    select distinct lower(btrim(r.name)) as role_key
      from ctx
      join public.user_role_assignments ura
        on ura.user_id = ctx.user_id
       and ura.company_id = ctx.company_id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
      join public.roles r
        on r.id = ura.role_id
     where ctx.user_id is not null
       and ctx.company_id is not null
  ),
  legacy as (
    select distinct lower(btrim(ur.role)) as role_key
      from ctx
      left join public.users u
        on u.id = ctx.user_id
      join public.user_roles ur
        on ur.user_id = ctx.user_id
        or ur.user_id = u.auth_id
     where ctx.company_id = public.default_company_id()
       and ur.role is not null
  )
  select coalesce(array_agg(distinct role_key order by role_key), array[]::text[])
    from (
      select role_key from assigned
      union
      select role_key from legacy
    ) roles
   where role_key is not null
     and role_key <> '';
$$;


ALTER FUNCTION "public"."current_app_user_notification_role_keys"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_user_permission_keys"() RETURNS SETOF "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select k.permission_key
    from public.current_app_user_permission_keys_for_company(public.current_company_id()) k(permission_key)
   order by k.permission_key;
$$;


ALTER FUNCTION "public"."current_app_user_permission_keys"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_permission_keys"() IS 'Compatibility wrapper for active permission checks. Resolves permissions through the current company context.';



CREATE OR REPLACE FUNCTION "public"."current_app_user_permission_keys_for_company"("p_company_id" "uuid") RETURNS SETOF "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select permission_key
    from public.app_user_permission_keys_for_company(
      public.current_app_user_id(),
      p_company_id
    ) as resolved(permission_key)
   where public.current_app_user_id() is not null
     and p_company_id is not null
     and public.current_app_user_has_company(p_company_id)
   order by permission_key;
$$;


ALTER FUNCTION "public"."current_app_user_permission_keys_for_company"("p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_app_user_permission_keys_for_company"("p_company_id" "uuid") IS 'Current-user company-aware effective permission resolver. Effective permissions are active role permissions plus explicit grants minus explicit revokes.';



CREATE OR REPLACE FUNCTION "public"."current_company_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  with jwt_claims as (
    select coalesce(auth.jwt(), '{}'::jsonb) as claims
  ),
  raw_claim as (
    select coalesce(
      claims #>> '{app_metadata,active_company_id}',
      claims #>> '{app_metadata,current_company_id}',
      claims ->> 'active_company_id',
      claims ->> 'current_company_id'
    ) as value
    from jwt_claims
  ),
  claimed_company as (
    select case
      when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then value::uuid
      else null::uuid
    end as company_id
    from raw_claim
  ),
  current_context as (
    select public.current_app_user_id() as user_id
  ),
  valid_claim as (
    select cc.company_id
    from claimed_company cc
    join current_context ctx on true
    where cc.company_id is not null
      and ctx.user_id is not null
      and exists (
        select 1
        from public.company_memberships cm
        where cm.user_id = ctx.user_id
          and cm.company_id = cc.company_id
          and cm.status = 'active'
      )
  )
  select coalesce(
    (select company_id from valid_claim limit 1),
    public.default_company_id()
  );
$_$;


ALTER FUNCTION "public"."current_company_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_company_id"() IS 'Slice 7A active-company contract. Uses a JWT/app_metadata active_company_id/current_company_id only when the current app user has active membership; otherwise falls back to falcon_default for compatibility mode. Future org switching should set the JWT claim, and future tenant enforcement should validate all sensitive writes server-side instead of trusting frontend company_id values.';



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


ALTER FUNCTION "public"."current_is_admin"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."current_is_appraiser"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_public_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_user_id()
$$;


ALTER FUNCTION "public"."current_public_user_id"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."current_user_has_role"("p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.id
  from public.users u
  where u.auth_id = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_public_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_user_id()
$$;


ALTER FUNCTION "public"."current_user_public_id"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."default_company_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select id
    from public.companies
   where slug = 'falcon_default'
   limit 1;
$$;


ALTER FUNCTION "public"."default_company_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."default_company_id"() IS 'Returns the current default company for single-company compatibility. Not a tenant switching mechanism.';



CREATE OR REPLACE FUNCTION "public"."fn_current_user_users_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.id
  from public.users u
  where u.auth_id = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."fn_current_user_users_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_to_auth_id"("p" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select id from auth.users where id = p),
    (select auth_id from public.users where id = p)
  );
$$;


ALTER FUNCTION "public"."fn_to_auth_id"("p" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_to_users_id"("p" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select id from public.users where id = p),       -- already users.id
    (select id from public.users where auth_id = p)   -- auth uid supplied
  )
$$;


ALTER FUNCTION "public"."fn_to_users_id"("p" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_calendar_events"("p_from" timestamp with time zone DEFAULT ("now"() - '90 days'::interval), "p_to" timestamp with time zone DEFAULT ("now"() + '180 days'::interval)) RETURNS TABLE("id" "uuid", "event_type" "text", "title" "text", "start_at" timestamp with time zone, "end_at" timestamp with time zone, "order_id" "uuid", "appraiser_id" "uuid", "appraiser_name" "text", "appraiser_color" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    e.id,
    e.event_type,
    e.title,
    e.start_at,
    e.end_at,
    e.order_id,
    e.appraiser_id,
    e.appraiser_name,
    e.appraiser_color
  from public.v_admin_calendar_enriched e
  where e.start_at >= p_from
    and e.start_at < p_to
    and (
      e.order_id is null
      or public.current_app_user_can_read_order(e.order_id)
    )
  order by e.start_at asc;
$$;


ALTER FUNCTION "public"."get_admin_calendar_events"("p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_calendar_events"() RETURNS TABLE("order_id" "uuid", "client_id" "uuid", "assigned_appraiser_id" "uuid", "kind" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "title" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    e.order_id,
    null::uuid as client_id,
    e.appraiser_id as assigned_appraiser_id,
    e.event_type as kind,
    e.start_at as starts_at,
    e.end_at as ends_at,
    e.title
  from public.v_admin_calendar_enriched e
  where e.order_id is null
     or public.current_app_user_can_read_order(e.order_id)
  order by e.start_at asc;
$$;


ALTER FUNCTION "public"."get_calendar_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_calendar_events"("p_from" timestamp with time zone, "p_to" timestamp with time zone) RETURNS TABLE("order_id" "uuid", "kind" "text", "at" timestamp with time zone, "assigned_user_id_any" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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
    and (p_to is null or e.start_at < p_to)
    and (
      e.order_id is null
      or public.current_app_user_can_read_order(e.order_id)
    )
  order by e.start_at asc;
$$;


ALTER FUNCTION "public"."get_calendar_events"("p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_clients_for_user"() RETURNS TABLE("client_id" "text", "client_name" "text", "primary_contact_name" "text", "primary_contact_phone" "text", "total_orders" bigint, "avg_total_fee" numeric, "last_order_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    k.client_id::text,
    k.client_name,
    k.primary_contact_name,
    k.primary_contact_phone,
    k.total_orders::bigint,
    k.avg_total_fee,
    k.last_order_date as last_order_at
  from public.v_client_kpis k
  where public.current_app_user_can_read_client_row(k.company_id, k.client_id)
  order by k.client_name;
$$;


ALTER FUNCTION "public"."get_clients_for_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_clients_for_user"() IS 'Slice 7D compatibility RPC returning readable clients for the active company.';



CREATE OR REPLACE FUNCTION "public"."get_order_activity_flexible"("p_order_id" "uuid") RETURNS TABLE("id" "text", "order_id" "uuid", "user_id" "text", "event" "text", "details" "jsonb", "created_at" timestamp with time zone, "user_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    a.id::text,
    a.order_id,
    coalesce(a.actor_user_id, a.user_id, a.actor_id, a.created_by)::text as user_id,
    coalesce(a.event_type, a.action, 'event')::text as event,
    coalesce(a.detail, a.context, '{}'::jsonb) as details,
    a.created_at,
    coalesce(a.actor_name, a.created_by_name, u.display_name, u.full_name, u.name, u.email, '')::text as user_name
  from public.activity_log a
  left join public.users u on u.id = coalesce(a.actor_user_id, a.user_id)
  where a.order_id = p_order_id
    and public.current_app_user_can_read_order(p_order_id)
  order by a.created_at desc nulls last;
$$;


ALTER FUNCTION "public"."get_order_activity_flexible"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_order_activity_flexible_v3"("p_order_id" "uuid") RETURNS TABLE("id" "text", "order_id" "uuid", "user_id" "text", "event" "text", "details" "jsonb", "created_at" timestamp with time zone, "user_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select *
  from public.get_order_activity_flexible(p_order_id);
$$;


ALTER FUNCTION "public"."get_order_activity_flexible_v3"("p_order_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."import_orders_from_json"("payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."import_orders_from_json"("payload" "jsonb") IS 'Slice 7E3B quarantine. Deprecated importer is unsafe for multi-company imports: SECURITY DEFINER, stale uuid client assumptions, global client lookup/create, and global external_order_no upsert. Service_role-only for operator-controlled backfill compatibility; scripts/backfill/import_orders.cjs is the only known repo caller. Rewrite before tenant onboarding.';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_is_admin()
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_is_admin()
$$;


ALTER FUNCTION "public"."is_admin_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_appraiser"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_is_appraiser()
$$;


ALTER FUNCTION "public"."is_appraiser"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_reviewer"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(lower(public.current_user_role()), '') = 'reviewer'
$$;


ALTER FUNCTION "public"."is_reviewer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity"("p_target_type" "text", "p_target_id" "uuid", "p_event" "text", "p_meta" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  insert into public.activity_events (actor_id, target_type, target_id, event, meta)
  values (auth.uid(), p_target_type, p_target_id, p_event, coalesce(p_meta,'{}'::jsonb));
$$;


ALTER FUNCTION "public"."log_activity"("p_target_type" "text", "p_target_id" "uuid", "p_event" "text", "p_meta" "jsonb") OWNER TO "postgres";


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


ALTER FUNCTION "public"."log_activity"("p_order_id" "uuid", "p_event_type" "text", "p_message" "text", "p_prev_status" "text", "p_new_status" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."log_order_activity"("p_order_id" "uuid", "p_action" "text", "p_note" "text") OWNER TO "postgres";


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


ALTER TABLE "public"."order_activity" OWNER TO "postgres";


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


ALTER FUNCTION "public"."log_order_activity"("p_details" "text", "p_event" "text", "p_order_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."log_order_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_order_company_assignment_event"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid" DEFAULT "public"."current_app_user_id"(), "p_actor_company_id" "uuid" DEFAULT "public"."current_company_id"(), "p_message" "text" DEFAULT NULL::"text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_assignment public.order_company_assignments%rowtype;
  v_activity_id uuid;
  v_actor_side text := 'system';
begin
  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if p_actor_company_id = v_assignment.owner_company_id then
    v_actor_side := 'owner';
  elsif p_actor_company_id = v_assignment.assigned_company_id then
    v_actor_side := 'assigned';
  end if;

  insert into public.order_company_assignment_activity (
    assignment_id,
    order_id,
    owner_company_id,
    assigned_company_id,
    relationship_id,
    event_type,
    actor_user_id,
    actor_company_id,
    actor_side,
    message,
    payload
  ) values (
    v_assignment.id,
    v_assignment.order_id,
    v_assignment.owner_company_id,
    v_assignment.assigned_company_id,
    v_assignment.relationship_id,
    p_event_type,
    p_actor_user_id,
    p_actor_company_id,
    v_actor_side,
    p_message,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_activity_id;

  return v_activity_id;
end;
$$;


ALTER FUNCTION "public"."log_order_company_assignment_event"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid", "p_actor_company_id" "uuid", "p_message" "text", "p_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_order_company_assignment_event"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid", "p_actor_company_id" "uuid", "p_message" "text", "p_payload" "jsonb") IS 'Phase 8B4E internal assignment activity writer. Assignment activity is separate from activity_log and does not expose owner-company order activity to assigned companies.';



CREATE OR REPLACE FUNCTION "public"."merge_clients"("p_source_id" bigint, "p_target_id" bigint, "p_strategy" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.current_company_id();
  v_source public.clients%rowtype;
  v_target public.clients%rowtype;
  v_orders_client_count integer := 0;
  v_orders_managing_amc_count integer := 0;
  v_child_client_count integer := 0;
  v_drift_count integer := 0;
begin
  if not public.current_app_user_has_current_company() then
    raise exception 'Current company membership is required to merge clients';
  end if;

  if not public.current_app_user_has_permission('clients.update.all') then
    raise exception 'clients.update.all permission is required to merge clients';
  end if;

  if not public.current_app_user_has_permission('clients.archive') then
    raise exception 'clients.archive permission is required to merge clients';
  end if;

  if p_source_id is null or p_target_id is null then
    raise exception 'source and target client ids are required';
  end if;

  if p_source_id = p_target_id then
    raise exception 'source and target clients must be different';
  end if;

  select *
    into v_source
    from public.clients
   where id = p_source_id
   for update;

  if not found then
    raise exception 'source client not found';
  end if;

  select *
    into v_target
    from public.clients
   where id = p_target_id
   for update;

  if not found then
    raise exception 'target client not found';
  end if;

  if v_source.company_id is distinct from v_company_id then
    raise exception 'source client is not in the current company';
  end if;

  if v_target.company_id is distinct from v_company_id then
    raise exception 'target client is not in the current company';
  end if;

  if coalesce(v_source.is_merged, false) then
    raise exception 'source client is already merged';
  end if;

  if coalesce(v_target.is_merged, false) then
    raise exception 'target client is already merged';
  end if;

  if not public.current_app_user_can_read_client_row(v_source.company_id, v_source.id) then
    raise exception 'source client is not readable';
  end if;

  if not public.current_app_user_can_read_client_row(v_target.company_id, v_target.id) then
    raise exception 'target client is not readable';
  end if;

  select count(*)
    into v_drift_count
    from public.orders o
   where (o.client_id in (p_source_id, p_target_id)
       or o.managing_amc_id in (p_source_id, p_target_id))
     and o.company_id is distinct from v_company_id;

  if v_drift_count > 0 then
    raise exception 'cannot merge clients while linked orders exist outside the current company';
  end if;

  select count(*)
    into v_drift_count
    from public.clients c
   where c.amc_id in (p_source_id, p_target_id)
     and c.company_id is distinct from v_company_id;

  if v_drift_count > 0 then
    raise exception 'cannot merge clients while linked child clients exist outside the current company';
  end if;

  update public.orders
     set client_id = p_target_id,
         updated_at = now()
   where client_id = p_source_id
     and company_id = v_company_id;
  get diagnostics v_orders_client_count = row_count;

  update public.orders
     set managing_amc_id = p_target_id,
         updated_at = now()
   where managing_amc_id = p_source_id
     and company_id = v_company_id;
  get diagnostics v_orders_managing_amc_count = row_count;

  update public.clients
     set amc_id = p_target_id
   where amc_id = p_source_id
     and company_id = v_company_id;
  get diagnostics v_child_client_count = row_count;

  update public.clients
     set is_merged = true,
         merged_into_id = p_target_id,
         status = 'inactive'
   where id = p_source_id
     and company_id = v_company_id;

  return jsonb_build_object(
    'source_id', p_source_id,
    'target_id', p_target_id,
    'company_id', v_company_id,
    'orders_client_updated', v_orders_client_count,
    'orders_managing_amc_updated', v_orders_managing_amc_count,
    'child_clients_updated', v_child_client_count,
    'strategy', coalesce(p_strategy, '{}'::jsonb)
  );
end;
$$;


ALTER FUNCTION "public"."merge_clients"("p_source_id" bigint, "p_target_id" bigint, "p_strategy" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."merge_clients"("p_source_id" bigint, "p_target_id" bigint, "p_strategy" "jsonb") IS 'Slice 7E2 company-aware client merge. Requires current-company membership, readable source/target clients, clients.update.all, clients.archive, and current-company-only linked reassignment.';



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


ALTER FUNCTION "public"."next_order_number"("p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_order_number_v2"("p_company_id" "uuid" DEFAULT "public"."current_company_id"(), "p_effective_at" timestamp with time zone DEFAULT "now"()) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."next_order_number_v2"("p_company_id" "uuid", "p_effective_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."next_order_number_v2"("p_company_id" "uuid", "p_effective_at" timestamp with time zone) IS 'Phase 10E5 additive company-id-backed order number generation helper. Uses order_numbering_rules.company_id and order_number_counters.company_id only, fails closed when a legacy/null-company counter already owns the rule/year, and is not wired into active order creation or frontend prefetch.';



CREATE OR REPLACE FUNCTION "public"."notification_order_event_body_v1"("p_event_type" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select case p_event_type
    when 'order.assigned_appraiser' then 'You were assigned the appraisal for this order.'
    when 'order.reassigned_appraiser' then 'You were reassigned the appraisal for this order.'
    when 'order.assigned_reviewer' then 'You were assigned review for this order.'
    when 'order.reassigned_reviewer' then 'You were reassigned review for this order.'
    when 'order.dates_updated' then 'Review or final due dates changed for this order.'
    when 'order.site_visit_updated' then 'The site visit appointment changed for this order.'
    else 'This order was updated.'
  end;
$$;


ALTER FUNCTION "public"."notification_order_event_body_v1"("p_event_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notification_order_event_title_v1"("p_event_type" "text", "p_order_number" "text", "p_order_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select case p_event_type
    when 'order.assigned_appraiser' then 'Appraiser assignment: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    when 'order.reassigned_appraiser' then 'Appraiser reassignment: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    when 'order.assigned_reviewer' then 'Reviewer assignment: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    when 'order.reassigned_reviewer' then 'Reviewer reassignment: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    when 'order.dates_updated' then 'Dates updated: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    when 'order.site_visit_updated' then 'Site visit updated: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
    else 'Order update: ' || coalesce(nullif(p_order_number, ''), p_order_id::text)
  end;
$$;


ALTER FUNCTION "public"."notification_order_event_title_v1"("p_event_type" "text", "p_order_number" "text", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notification_policy_channel_state"("p_rules" "jsonb", "p_roles" "text"[], "p_channel" "text") RETURNS TABLE("default_enabled" boolean, "locked" boolean, "lock_reason" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_role text;
  v_role_channel jsonb;
  v_email_mode text;
  v_default boolean := false;
  v_locked boolean := false;
  v_lock_reason text := null;
begin
  p_rules := coalesce(p_rules, '{}'::jsonb);
  p_channel := lower(btrim(coalesce(p_channel, '')));
  v_email_mode := lower(coalesce(p_rules #>> '{email,mode}', 'optional_off'));

  if p_channel = 'email' then
    v_default := v_email_mode in ('required', 'optional_on');
    v_locked := v_email_mode = 'required';
    if v_locked then
      v_lock_reason := coalesce(p_rules #>> '{email,lock_reason}', 'Required by notification policy.');
    end if;
  end if;

  foreach v_role in array coalesce(p_roles, array[]::text[]) loop
    v_role := lower(btrim(coalesce(v_role, '')));
    if v_role = '' then
      continue;
    end if;

    v_role_channel := p_rules #> array['roles', v_role, p_channel];
    if v_role_channel is null and p_channel = 'email' then
      v_role_channel := p_rules #> array['roles', v_role, 'email'];
    end if;

    if v_role_channel is not null then
      if v_role_channel ? 'default' then
        v_default := v_default or coalesce((v_role_channel->>'default')::boolean, false);
      end if;

      if coalesce((v_role_channel->>'required')::boolean, false) then
        v_locked := true;
        v_lock_reason := coalesce(
          nullif(v_role_channel->>'lock_reason', ''),
          nullif(v_lock_reason, ''),
          'Required by company policy.'
        );
      end if;
    end if;

    if p_channel = 'email'
       and exists (
         select 1
           from public.notification_policies np
          where np.key = 'locks.' || v_role
            and coalesce(np.rules->'email_required', '[]'::jsonb) ? (p_rules->>'event_key')
       ) then
      v_locked := true;
      v_default := true;
      v_lock_reason := coalesce(nullif(v_lock_reason, ''), 'Required by company policy.');
    end if;
  end loop;

  return query select v_default, v_locked, v_lock_reason;
end;
$$;


ALTER FUNCTION "public"."notification_policy_channel_state"("p_rules" "jsonb", "p_roles" "text"[], "p_channel" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notification_user_effective_preference"("p_user_id" "uuid", "p_event_key" "text", "p_channel" "text", "p_company_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("effective_enabled" boolean, "locked" boolean, "lock_reason" "text", "default_enabled" boolean, "user_override" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with policy_row as (
    select jsonb_set(coalesce(np.rules, '{}'::jsonb), '{event_key}', to_jsonb(np.key), true) as rules
      from public.notification_policies np
     where np.key = p_event_key
       and np.key not like 'locks.%'
       and np.key not like 'defaults.%'
     limit 1
  ),
  state as (
    select s.*
      from policy_row pr
      cross join lateral public.notification_policy_channel_state(
        pr.rules,
        public.notification_user_role_keys(p_user_id, p_company_id),
        p_channel
      ) s
  ),
  user_pref as (
    select up.enabled
      from public.user_notification_prefs up
     where up.user_id = p_user_id
       and up.type = p_event_key
       and up.channel = lower(btrim(coalesce(p_channel, '')))
     limit 1
  )
  select
    case
      when state.locked then true
      else coalesce(user_pref.enabled, state.default_enabled)
    end as effective_enabled,
    state.locked,
    state.lock_reason,
    state.default_enabled,
    user_pref.enabled as user_override
    from state
    left join user_pref on true;
$$;


ALTER FUNCTION "public"."notification_user_effective_preference"("p_user_id" "uuid", "p_event_key" "text", "p_channel" "text", "p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notification_user_effective_preference"("p_user_id" "uuid", "p_event_key" "text", "p_channel" "text", "p_company_id" "uuid") IS 'Resolves one user event/channel notification preference using public.users.id, notification_policies defaults/locks, and user_notification_prefs overrides. Used by email queue fanout.';



CREATE OR REPLACE FUNCTION "public"."notification_user_role_keys"("p_user_id" "uuid", "p_company_id" "uuid" DEFAULT NULL::"uuid") RETURNS "text"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with target_company as (
    select coalesce(p_company_id, public.default_company_id()) as company_id
  ),
  assigned as (
    select distinct lower(btrim(r.name)) as role_key
      from target_company tc
      join public.user_role_assignments ura
        on ura.user_id = p_user_id
       and ura.company_id = tc.company_id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
      join public.roles r
        on r.id = ura.role_id
     where p_user_id is not null
       and tc.company_id is not null
  ),
  legacy as (
    select distinct lower(btrim(ur.role)) as role_key
      from public.users u
      join public.user_roles ur
        on ur.user_id = p_user_id
        or ur.user_id = u.auth_id
     where u.id = p_user_id
       and coalesce(p_company_id, public.default_company_id()) = public.default_company_id()
       and ur.role is not null
  ),
  user_fallback as (
    select lower(btrim(u.role)) as role_key
      from public.users u
     where u.id = p_user_id
       and u.role is not null
  )
  select coalesce(array_agg(distinct role_key order by role_key), array[]::text[])
    from (
      select role_key from assigned
      union
      select role_key from legacy
      union
      select role_key from user_fallback
    ) roles
   where role_key is not null
     and role_key <> '';
$$;


ALTER FUNCTION "public"."notification_user_role_keys"("p_user_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_admins"("p_title" "text", "p_body" "text", "p_message" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception using
    errcode = '55000',
    message = 'notify_admins is deprecated/quarantined',
    hint = 'Use tenant-safe order-tied notification creation paths.';
end;
$$;


ALTER FUNCTION "public"."notify_admins"("p_title" "text", "p_body" "text", "p_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_admins"("p_title" "text", "p_body" "text", "p_message" "text") IS 'Slice 7G2A quarantine. Deprecated manual notification wrapper; app-role execute revoked and body raises an exception.';



CREATE OR REPLACE FUNCTION "public"."notify_order_company_assignment_event"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid" DEFAULT "public"."current_app_user_id"(), "p_actor_company_id" "uuid" DEFAULT "public"."current_company_id"(), "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_owner_company public.companies%rowtype;
  v_assigned_company public.companies%rowtype;
  v_recipient_id uuid;
  v_recipient_company_id uuid;
  v_notification_payload jsonb;
  v_title text;
  v_body text;
  v_count integer := 0;
  v_link_path text;
  v_priority text := 'normal';
begin
  if p_event_type = 'assignment.started' then
    return 0;
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  select *
    into v_order
    from public.orders
   where id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  select *
    into v_owner_company
    from public.companies
   where id = v_assignment.owner_company_id;

  select *
    into v_assigned_company
    from public.companies
   where id = v_assignment.assigned_company_id;

  v_link_path := '/assignments/' || v_assignment.id::text;
  v_title := case p_event_type
    when 'assignment.offered' then 'Assignment offered'
    when 'assignment.accepted' then 'Assignment accepted'
    when 'assignment.declined' then 'Assignment declined'
    when 'assignment.submitted' then 'Assignment submitted'
    when 'assignment.completed' then 'Assignment completed'
    when 'assignment.cancelled' then 'Assignment cancelled'
    when 'assignment.revoked' then 'Assignment revoked'
    else 'Assignment update'
  end;
  v_priority := case p_event_type
    when 'assignment.offered' then 'high'
    when 'assignment.submitted' then 'high'
    when 'assignment.cancelled' then 'high'
    when 'assignment.revoked' then 'high'
    else 'normal'
  end;

  for v_recipient_id in
    select recipient.user_id
      from public.order_company_assignment_assigned_notification_recipients(
        p_assignment_id,
        p_event_type,
        p_actor_user_id
      ) as recipient(user_id)
    union
    select recipient.user_id
      from public.order_company_assignment_owner_notification_recipients(
        p_assignment_id,
        p_event_type,
        p_actor_user_id
      ) as recipient(user_id)
  loop
    if exists (
      select 1
        from public.company_memberships cm
       where cm.user_id = v_recipient_id
         and cm.company_id = v_assignment.assigned_company_id
         and cm.status = 'active'
    ) then
      v_recipient_company_id := v_assignment.assigned_company_id;
      v_notification_payload := jsonb_build_object(
        'source_type', 'order_company_assignment',
        'event_key', p_event_type,
        'assignment_id', v_assignment.id,
        'assignment_type', v_assignment.assignment_type,
        'assignment_status', v_assignment.status,
        'owner_company_id', v_assignment.owner_company_id,
        'assigned_company_id', v_assignment.assigned_company_id,
        'relationship_id', v_assignment.relationship_id,
        'order_number', v_order.order_number,
        'order_status', v_order.status,
        'city', v_order.city,
        'state', v_order.state,
        'property_type', v_order.property_type,
        'report_type', v_order.report_type,
        'due_at', v_assignment.due_at,
        'review_due_at', v_assignment.review_due_at
      );
      v_body := trim(both ' ' from concat_ws(
        ' ',
        nullif(v_order.order_number, ''),
        nullif(concat_ws(', ', nullif(v_order.city, ''), nullif(v_order.state, '')), '')
      ));
    else
      v_recipient_company_id := v_assignment.owner_company_id;
      v_notification_payload := jsonb_build_object(
        'source_type', 'order_company_assignment',
        'event_key', p_event_type,
        'assignment_id', v_assignment.id,
        'assignment_type', v_assignment.assignment_type,
        'assignment_status', v_assignment.status,
        'owner_company_id', v_assignment.owner_company_id,
        'assigned_company_id', v_assignment.assigned_company_id,
        'relationship_id', v_assignment.relationship_id,
        'order_id', v_assignment.order_id,
        'order_number', v_order.order_number,
        'order_status', v_order.status,
        'assigned_company_name', v_assigned_company.name,
        'city', v_order.city,
        'state', v_order.state,
        'property_type', v_order.property_type,
        'report_type', v_order.report_type,
        'due_at', v_assignment.due_at,
        'review_due_at', v_assignment.review_due_at
      );
      v_body := trim(both ' ' from concat_ws(
        ' ',
        nullif(v_assigned_company.name, ''),
        nullif(v_order.order_number, '')
      ));
    end if;

    insert into public.notifications (
      user_id,
      company_id,
      type,
      category,
      title,
      body,
      message,
      order_id,
      is_read,
      read,
      created_at,
      link_path,
      payload,
      priority
    ) values (
      v_recipient_id,
      v_recipient_company_id,
      p_event_type,
      'assignment',
      v_title,
      nullif(v_body, ''),
      nullif(v_body, ''),
      null,
      false,
      false,
      now(),
      v_link_path,
      case
        when v_recipient_company_id = v_assignment.owner_company_id
          then v_notification_payload || coalesce(p_payload, '{}'::jsonb)
        else v_notification_payload
      end,
      v_priority
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;


ALTER FUNCTION "public"."notify_order_company_assignment_event"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid", "p_actor_company_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_order_company_assignment_event"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid", "p_actor_company_id" "uuid", "p_payload" "jsonb") IS 'Phase 8B4E internal assignment notification writer. Vendor notifications use notifications.order_id = null and /assignments/:assignment_id links, preserving current order-read boundaries.';



CREATE OR REPLACE FUNCTION "public"."notify_order_v1_event"("p_order_id" "uuid", "p_event_type" "text", "p_recipient_kinds" "text"[], "p_payload" "jsonb" DEFAULT '{}'::"jsonb", "p_actor_user_id" "uuid" DEFAULT "public"."current_app_user_id"()) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order public.orders%rowtype;
  v_company_id uuid;
  v_policy_rules jsonb;
  v_category text := 'order';
  v_priority text := 'normal';
  v_title text;
  v_body text;
  v_count integer := 0;
  v_recipient record;
  v_client_name text;
  v_appraiser_name text;
  v_reviewer_name text;
  v_property_address text;
  v_payload jsonb;
begin
  select *
    into v_order
    from public.orders
   where id = p_order_id
   limit 1;

  if not found then
    return 0;
  end if;

  v_company_id := coalesce(v_order.company_id, public.default_company_id());

  select coalesce(c.name, v_order.manual_client_name, v_order.manual_client)
    into v_client_name
    from public.clients c
   where c.id = v_order.client_id
   limit 1;

  if v_client_name is null then
    v_client_name := coalesce(v_order.manual_client_name, v_order.manual_client);
  end if;

  select coalesce(nullif(u.display_name, ''), nullif(u.full_name, ''), nullif(u.name, ''), u.email)
    into v_appraiser_name
    from public.users u
   where u.id = coalesce(v_order.appraiser_id, v_order.assigned_to)
   limit 1;

  select coalesce(nullif(u.display_name, ''), nullif(u.full_name, ''), nullif(u.name, ''), u.email)
    into v_reviewer_name
    from public.users u
   where u.id = v_order.reviewer_id
   limit 1;

  v_property_address := coalesce(
    nullif(v_order.property_address, ''),
    nullif(v_order.address, ''),
    array_to_string(
      array_remove(array[
        nullif(v_order.city, ''),
        nullif(v_order.state, ''),
        nullif(coalesce(v_order.postal_code, v_order.zip), '')
      ], null),
      ', '
    )
  );

  select np.rules
    into v_policy_rules
    from public.notification_policies np
   where np.key = p_event_type
   limit 1;

  v_category := coalesce(v_policy_rules->>'category', 'order');
  v_priority := coalesce(v_policy_rules->>'priority', 'normal');
  v_title := public.notification_order_event_title_v1(p_event_type, v_order.order_number, v_order.id);
  v_body := public.notification_order_event_body_v1(p_event_type);
  v_payload := jsonb_strip_nulls(
    coalesce(p_payload, '{}'::jsonb) ||
    jsonb_build_object(
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'property_address', v_property_address,
      'address', v_property_address,
      'city', v_order.city,
      'state', v_order.state,
      'postal_code', coalesce(v_order.postal_code, v_order.zip),
      'client_name', v_client_name,
      'property_contact_name', coalesce(v_order.property_contact_name, v_order.entry_contact_name),
      'property_contact_phone', coalesce(v_order.property_contact_phone, v_order.entry_contact_phone),
      'appraiser_name', v_appraiser_name,
      'reviewer_name', v_reviewer_name,
      'status', v_order.status,
      'report_type', v_order.report_type,
      'property_type', v_order.property_type,
      'site_visit_at', v_order.site_visit_at,
      'review_due_at', v_order.review_due_at,
      'final_due_at', v_order.final_due_at,
      'link_path', '/orders/' || v_order.id::text
    )
  );

  for v_recipient in
    select distinct recipients.user_id, recipients.role_key
      from unnest(coalesce(p_recipient_kinds, array[]::text[])) as kinds(kind)
      cross join lateral public.rpc_notification_recipients_for_order(
        p_order_id,
        kinds.kind
      ) as recipients(user_id, role_key)
     where recipients.user_id is not null
  loop
    if p_actor_user_id is not null and v_recipient.user_id = p_actor_user_id then
      continue;
    end if;

    insert into public.notifications (
      user_id,
      company_id,
      type,
      category,
      priority,
      title,
      body,
      message,
      order_id,
      link_path,
      payload
    )
    values (
      v_recipient.user_id,
      v_company_id,
      p_event_type,
      v_category,
      v_priority,
      v_title,
      v_body,
      v_body,
      v_order.id,
      '/orders/' || v_order.id::text,
      v_payload || jsonb_build_object('notification_role', v_recipient.role_key)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
exception
  when others then
    return v_count;
end;
$$;


ALTER FUNCTION "public"."notify_order_v1_event"("p_order_id" "uuid", "p_event_type" "text", "p_recipient_kinds" "text"[], "p_payload" "jsonb", "p_actor_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_order_v1_event"("p_order_id" "uuid", "p_event_type" "text", "p_recipient_kinds" "text"[], "p_payload" "jsonb", "p_actor_user_id" "uuid") IS 'Small V1 order-safe notification fanout helper for backend-owned order events. Payloads include existing order context used by RC1 email rendering while links remain /orders/:id.';



CREATE OR REPLACE FUNCTION "public"."notify_safe"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception using
    errcode = '55000',
    message = 'notify_safe is deprecated/quarantined',
    hint = 'Use tenant-safe order-tied notification creation paths.';
end;
$$;


ALTER FUNCTION "public"."notify_safe"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_safe"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text") IS 'Slice 7G2A quarantine. Deprecated manual notification wrapper; app-role execute revoked and body raises an exception.';



CREATE OR REPLACE FUNCTION "public"."order_company_assignment_assigned_notification_recipients"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with assignment as (
    select *
      from public.order_company_assignments
     where id = p_assignment_id
  ),
  read_assigned as (
    select cm.user_id
      from assignment a
      join public.company_memberships cm
        on cm.company_id = a.assigned_company_id
       and cm.status = 'active'
     where cm.user_id is distinct from p_actor_user_id
       and public.order_company_assignment_user_has_permission(
         cm.user_id,
         a.assigned_company_id,
         'order_company_assignments.read_assigned'
       )
  ),
  respond_preferred as (
    select ra.user_id
      from read_assigned ra
      join assignment a on true
     where public.order_company_assignment_user_has_permission(
       ra.user_id,
       a.assigned_company_id,
       'order_company_assignments.respond'
     )
  )
  select user_id
    from respond_preferred
   where p_event_type = 'assignment.offered'
  union
  select user_id
    from read_assigned
   where p_event_type = 'assignment.offered'
     and not exists (select 1 from respond_preferred)
  union
  select user_id
    from read_assigned
   where p_event_type in (
     'assignment.completed',
     'assignment.cancelled',
     'assignment.revoked'
   );
$$;


ALTER FUNCTION "public"."order_company_assignment_assigned_notification_recipients"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."order_company_assignment_assigned_notification_recipients"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid") IS 'Phase 8B4E internal assigned-company recipient resolver. Relationship existence alone grants nothing; active membership and assignment permissions are required.';



CREATE OR REPLACE FUNCTION "public"."order_company_assignment_expected_type"("p_relationship_type" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select case p_relationship_type
    when 'amc_vendor' then 'vendor_appraisal'
    when 'staff_overflow_vendor' then 'staff_overflow'
    when 'review_provider' then 'review_provider'
    when 'enterprise_child' then 'enterprise_delegated'
    when 'billing_managed' then 'billing_managed'
    when 'support_managed' then 'support_managed'
    else null
  end;
$$;


ALTER FUNCTION "public"."order_company_assignment_expected_type"("p_relationship_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."order_company_assignment_expected_type"("p_relationship_type" "text") IS 'Phase 8B4B internal helper mapping relationship types to compatible order-company assignment types. This helper does not grant order/client visibility.';



CREATE OR REPLACE FUNCTION "public"."order_company_assignment_owner_notification_recipients"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with assignment as (
    select *
      from public.order_company_assignments
     where id = p_assignment_id
  ),
  active_owner_members as (
    select cm.user_id, a.owner_company_id
      from assignment a
      join public.company_memberships cm
        on cm.company_id = a.owner_company_id
       and cm.status = 'active'
     where cm.user_id is distinct from p_actor_user_id
  )
  select user_id
    from active_owner_members
   where p_event_type = 'assignment.accepted'
     and public.order_company_assignment_user_has_permission(
       user_id,
       owner_company_id,
       'order_company_assignments.read_owner'
     )
  union
  select user_id
    from active_owner_members
   where p_event_type = 'assignment.declined'
     and (
       public.order_company_assignment_user_has_permission(
         user_id,
         owner_company_id,
         'order_company_assignments.read_owner'
       )
       or public.order_company_assignment_user_has_permission(
         user_id,
         owner_company_id,
         'order_company_assignments.offer'
       )
     )
  union
  select user_id
    from active_owner_members
   where p_event_type = 'assignment.submitted'
     and public.order_company_assignment_user_has_permission(
       user_id,
       owner_company_id,
       'order_company_assignments.read_owner'
     )
     and public.order_company_assignment_user_has_permission(
       user_id,
       owner_company_id,
       'order_company_assignments.complete'
     );
$$;


ALTER FUNCTION "public"."order_company_assignment_owner_notification_recipients"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."order_company_assignment_owner_notification_recipients"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid") IS 'Phase 8B4E internal owner-company recipient resolver for assignment lifecycle notifications.';



CREATE OR REPLACE FUNCTION "public"."order_company_assignment_user_has_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_permission_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with ctx as (
    select
      p_user_id as user_id,
      p_company_id as company_id,
      p_permission_key as permission_key,
      public.default_company_id() as default_company_id
  ),
  active_membership as (
    select 1
      from ctx
      join public.company_memberships cm
        on cm.user_id = ctx.user_id
       and cm.company_id = ctx.company_id
       and cm.status = 'active'
  ),
  assigned_roles as (
    select r.id, r.name, r.is_owner_role
      from ctx
      join active_membership on true
      join public.user_role_assignments ura
        on ura.user_id = ctx.user_id
       and ura.company_id = ctx.company_id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
      join public.roles r
        on r.id = ura.role_id
  ),
  legacy_roles as (
    select distinct lower(trim(ur.role)) as role_name
      from ctx
      join active_membership on true
      left join public.users u
        on u.id = ctx.user_id
      join public.user_roles ur
        on ur.user_id = ctx.user_id
        or ur.user_id = u.auth_id
     where ctx.company_id = ctx.default_company_id
       and ur.role is not null
  )
  select exists (
    select 1
      from ctx
      join active_membership on true
     where exists (
       select 1
         from assigned_roles ar
        where ar.is_owner_role
           or lower(ar.name) = 'owner'
     )
        or exists (
       select 1
         from legacy_roles lr
        where lr.role_name = 'owner'
     )
        or exists (
       select 1
         from assigned_roles ar
         join public.role_permissions rp
           on rp.role_id = ar.id
        where rp.permission_key = ctx.permission_key
     )
        or exists (
       select 1
         from legacy_roles lr
         join public.roles r
           on r.company_id is null
          and lower(r.name) = lr.role_name
         join public.role_permissions rp
           on rp.role_id = r.id
        where rp.permission_key = ctx.permission_key
     )
  );
$$;


ALTER FUNCTION "public"."order_company_assignment_user_has_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_permission_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."order_company_assignment_user_has_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_permission_key" "text") IS 'Phase 8B4E internal permission predicate for assignment notification recipient resolution. Not an app-facing authorization surface.';



CREATE OR REPLACE FUNCTION "public"."order_document_sanitize_file_name"("p_file_name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select left(
    coalesce(
      nullif(
        regexp_replace(
          regexp_replace(btrim(coalesce(p_file_name, '')), '[\/\\]+', '-', 'g'),
          '[^A-Za-z0-9._ -]+',
          '-',
          'g'
        ),
        ''
      ),
      'document'
    ),
    180
  );
$$;


ALTER FUNCTION "public"."order_document_sanitize_file_name"("p_file_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."order_document_sanitize_file_name"("p_file_name" "text") IS 'Sanitizes user-provided order document filenames for private storage object paths.';



CREATE OR REPLACE FUNCTION "public"."order_saved_view_trim_name"("p_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_name = '' then
    raise exception 'saved_view_name_required'
      using errcode = '22023';
  end if;

  if length(v_name) > 80 then
    raise exception 'saved_view_name_too_long'
      using errcode = '22023';
  end if;

  return v_name;
end;
$$;


ALTER FUNCTION "public"."order_saved_view_trim_name"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_saved_view_validate_filters"("p_filters" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_filters jsonb := p_filters;
  v_allowed_keys text[] := array[
    'status',
    'q',
    'clientId',
    'appraiserId',
    'reviewerId',
    'due',
    'queue',
    'pageSize'
  ];
  v_status_values text[] := array[
    'new',
    'in_progress',
    'in_review',
    'needs_revisions',
    'review_cleared',
    'pending_final_approval',
    'ready_for_client',
    'completed'
  ];
  v_due_values text[] := array[
    'overdue',
    'this_week',
    'next_week'
  ];
  v_queue_values text[] := array[
    'due_soon',
    'overdue',
    'stuck_orders',
    'waiting_on_reviewer',
    'waiting_on_appraiser',
    'inspection_complete_report_not_started',
    'final_approval_queue',
    'ready_for_delivery',
    'reviewer_overload',
    'appraiser_overload',
    'unassigned_orders',
    'revision_loop_risk'
  ];
  v_key text;
  v_value jsonb;
  v_text text;
  v_int integer;
  v_normalized jsonb := '{}'::jsonb;
begin
  if v_filters is null or jsonb_typeof(v_filters) <> 'object' then
    raise exception 'saved_view_filters_must_be_object'
      using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(v_filters)
  loop
    if v_key = 'page' then
      raise exception 'saved_view_filter_page_not_allowed'
        using errcode = '22023';
    end if;

    if v_key in (
      'includeArchived',
      'includeRetiredLifecycle',
      'includeCancelled',
      'includeCanceled',
      'includeVoided',
      'archived',
      'isArchived',
      'historical',
      'admin',
      'adminMode',
      'assignedAppraiserId',
      'inspectedAwaitingReport',
      'finalDueWithinDays',
      'from',
      'to',
      'mode',
      'scope',
      'rowsOverride',
      'priority'
    ) then
      raise exception 'saved_view_filter_not_allowed: %', v_key
        using errcode = '22023';
    end if;

    if not (v_key = any(v_allowed_keys)) then
      raise exception 'saved_view_filter_unknown_key: %', v_key
        using errcode = '22023';
    end if;

    v_value := v_filters -> v_key;
    if v_value = 'null'::jsonb then
      continue;
    end if;

    case v_key
      when 'status' then
        if jsonb_typeof(v_value) <> 'string' then
          raise exception 'saved_view_status_must_be_string'
            using errcode = '22023';
        end if;
        v_text := lower(btrim(v_value #>> '{}'));
        if v_text = '' then
          continue;
        end if;
        if not (v_text = any(v_status_values)) then
          raise exception 'saved_view_status_not_allowed'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'q' then
        if jsonb_typeof(v_value) <> 'string' then
          raise exception 'saved_view_q_must_be_string'
            using errcode = '22023';
        end if;
        v_text := btrim(v_value #>> '{}');
        if v_text = '' then
          continue;
        end if;
        if length(v_text) > 200 then
          raise exception 'saved_view_q_too_long'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'clientId' then
        if jsonb_typeof(v_value) not in ('string', 'number') then
          raise exception 'saved_view_client_id_must_be_scalar'
            using errcode = '22023';
        end if;
        v_text := btrim(v_value #>> '{}');
        if v_text = '' then
          continue;
        end if;
        if v_text !~ '^[0-9]+$' then
          raise exception 'saved_view_client_id_must_be_numeric'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'appraiserId', 'reviewerId' then
        if jsonb_typeof(v_value) <> 'string' then
          raise exception 'saved_view_user_filter_must_be_uuid_string'
            using errcode = '22023';
        end if;
        v_text := lower(btrim(v_value #>> '{}'));
        if v_text = '' then
          continue;
        end if;
        if v_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          raise exception 'saved_view_user_filter_must_be_uuid_string'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'due' then
        if jsonb_typeof(v_value) not in ('string', 'number') then
          raise exception 'saved_view_due_must_be_scalar'
            using errcode = '22023';
        end if;
        v_text := lower(btrim(v_value #>> '{}'));
        if v_text = '' then
          continue;
        end if;
        if not (v_text = any(v_due_values)) and v_text !~ '^[0-9]+$' then
          raise exception 'saved_view_due_not_allowed'
            using errcode = '22023';
        end if;
        if v_text ~ '^[0-9]+$' then
          v_int := v_text::integer;
          if v_int < 1 or v_int > 365 then
            raise exception 'saved_view_due_window_out_of_range'
              using errcode = '22023';
          end if;
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'queue' then
        if jsonb_typeof(v_value) <> 'string' then
          raise exception 'saved_view_queue_must_be_string'
            using errcode = '22023';
        end if;
        v_text := lower(btrim(v_value #>> '{}'));
        if v_text = '' then
          continue;
        end if;
        if not (v_text = any(v_queue_values)) then
          raise exception 'saved_view_queue_not_allowed'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_text);

      when 'pageSize' then
        if jsonb_typeof(v_value) not in ('string', 'number') then
          raise exception 'saved_view_page_size_must_be_scalar'
            using errcode = '22023';
        end if;
        v_text := btrim(v_value #>> '{}');
        if v_text = '' then
          continue;
        end if;
        if v_text !~ '^[0-9]+$' then
          raise exception 'saved_view_page_size_must_be_integer'
            using errcode = '22023';
        end if;
        v_int := v_text::integer;
        if v_int < 1 or v_int > 200 then
          raise exception 'saved_view_page_size_out_of_range'
            using errcode = '22023';
        end if;
        v_normalized := v_normalized || jsonb_build_object(v_key, v_int);
    end case;
  end loop;

  return v_normalized;
end;
$_$;


ALTER FUNCTION "public"."order_saved_view_validate_filters"("p_filters" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."order_saved_view_validate_filters"("p_filters" "jsonb") IS 'Saved Views Slice 1D internal validation helper. Accepts only allowlisted active Orders filter keys and rejects hidden, historical/admin, mutation, and query-fragment state.';



CREATE OR REPLACE FUNCTION "public"."permission_override_is_v1_safe"("p_permission_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    p_permission_key in (
      'orders.assignable_as_appraiser',
      'orders.assignable_as_reviewer'
    )
    or exists (
      select 1
        from public.permissions p
       where p.key = p_permission_key
         and p.category in (
           'orders',
           'clients',
           'users',
           'roles',
           'workflow',
           'billing',
           'settings'
         )
    );
$$;


ALTER FUNCTION "public"."permission_override_is_v1_safe"("p_permission_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."permission_override_is_v1_safe"("p_permission_key" "text") IS 'Returns true for explicit V1-safe permission override keys. Work eligibility permissions are explicitly allowed and do not unlock hidden AMC, Assignments, Relationships, or vendor surfaces.';



CREATE OR REPLACE FUNCTION "public"."permission_override_is_v1_ui_visible"("p_permission_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
      from public.permissions p
     where p.key = trim(coalesce(p_permission_key, ''))
       and p.key not in (
         'orders.assignable_as_appraiser',
         'orders.assignable_as_reviewer'
       )
       and p.category in (
         'orders',
         'clients',
         'users',
         'roles',
         'workflow',
         'billing',
         'settings'
       )
  );
$$;


ALTER FUNCTION "public"."permission_override_is_v1_ui_visible"("p_permission_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."permission_override_is_v1_ui_visible"("p_permission_key" "text") IS 'Returns true for permission override keys that the active V1 Users/Edit Access UI may read and mutate. Work eligibility and hidden enterprise surfaces remain preserved but outside the active override editing scope.';



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


ALTER FUNCTION "public"."remap_user_id"("from_id" "uuid", "to_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."replace_view_from_source"("target_view" "text", "source_view" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_admin_set_user_active"("p_user_id" "uuid", "p_is_active" boolean) OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_admin_set_user_role"("p_user_id" "uuid", "p_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_admin_set_user_role"("p_user_id" "uuid", "p_role" "text") IS 'Deprecated legacy public.user_roles admin mutation RPC. Browser callers must use company-member role mutation RPCs instead.';



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


ALTER FUNCTION "public"."rpc_admin_update_user_profile"("p_user_id" "uuid", "p_display_name" "text", "p_full_name" "text", "p_name" "text", "p_color" "text", "p_display_color" "text", "p_avatar_url" "text", "p_fee_split" numeric, "p_split" numeric, "p_split_pct" numeric, "p_phone" "text", "p_status" "text", "p_is_active" boolean) OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_admin_users_set_active"("p_user_id" "uuid", "p_is_active" boolean) OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_admin_users_update"("p_user_id" "uuid", "p_patch" "jsonb") OWNER TO "postgres";


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
    "company_id" "uuid",
    "client_contact_id" bigint,
    "client_contact_name" "text",
    "client_contact_title" "text",
    "client_contact_email" "text",
    "client_contact_phone" "text",
    CONSTRAINT "chk_orders_amc_diff" CHECK ((("managing_amc_id" IS NULL) OR ("managing_amc_id" <> "client_id"))),
    CONSTRAINT "orders_status_valid" CHECK ((("status" IS NULL) OR ("status" = ANY (ARRAY['new'::"text", 'in_progress'::"text", 'in_review'::"text", 'needs_revisions'::"text", 'review_cleared'::"text", 'pending_final_approval'::"text", 'ready_for_client'::"text", 'completed'::"text", 'cancelled'::"text", 'voided'::"text"]))))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."company_id" IS 'Nullable company scope foundation. Backfilled to default company; not yet used for RLS enforcement.';



COMMENT ON COLUMN "public"."orders"."client_contact_id" IS 'Selected reusable client relationship contact for this order, if any.';



COMMENT ON COLUMN "public"."orders"."client_contact_name" IS 'Server-side snapshot of the selected client relationship contact name at order create/update time.';



COMMENT ON COLUMN "public"."orders"."client_contact_title" IS 'Server-side snapshot of the selected client relationship contact title at order create/update time.';



COMMENT ON COLUMN "public"."orders"."client_contact_email" IS 'Server-side snapshot of the selected client relationship contact email at order create/update time.';



COMMENT ON COLUMN "public"."orders"."client_contact_phone" IS 'Server-side snapshot of the selected client relationship contact phone at order create/update time.';



CREATE OR REPLACE FUNCTION "public"."rpc_assign_next_reviewer"("order_id" "uuid") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_assign_next_reviewer(uuid) is deprecated and quarantined; review routing requires a tenant-safe redesign'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_assign_next_reviewer"("order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_assign_next_reviewer"("order_id" "uuid") IS 'Slice 7F4A quarantine. Deprecated review_route helper; review routing requires tenant-safe redesign before re-enabling.';



CREATE OR REPLACE FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_appraiser_id" "uuid") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_assign_order(uuid,uuid) is deprecated and quarantined; use tenant-safe direct orders updates or rpc_assign_order(uuid,uuid,text)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_appraiser_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_appraiser_id" "uuid") IS 'Slice 7F4A quarantine. Deprecated appraiser assignment RPC without tenant-safe target validation; preserved only as a service_role-callable exception.';



CREATE OR REPLACE FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_assigned_to" "uuid", "p_note" "text") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order public.orders;
  v_row public.orders;
  v_actor uuid := public.current_app_user_id();
begin
  if v_actor is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id() then
    raise exception 'order is not in the current company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order is not updateable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_any_permission(array[
    'assignments.assign_appraiser',
    'assignments.reassign'
  ]) then
    raise exception 'missing required assignment permission'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_assign_order_target(
    p_assigned_to,
    v_order.company_id,
    'assigned_to'
  ) then
    raise exception 'assigned_to % is not an assignable current-company appraiser', p_assigned_to
      using errcode = '42501';
  end if;

  update public.orders
     set assigned_to = p_assigned_to,
         updated_at = now()
   where id = p_order_id
   returning * into v_row;

  insert into public.activity_log(order_id, company_id, actor_user_id, action, message)
  values (p_order_id, v_row.company_id, v_actor, 'assignment', coalesce(p_note, 'assigned'));

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_assigned_to" "uuid", "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_assigned_to" "uuid", "p_note" "text") IS 'Slice 7F4A guarded compatibility RPC. Requires current-company membership, readable/updateable order, assignment permission, and an assignable current-company appraiser target.';



CREATE OR REPLACE FUNCTION "public"."rpc_assign_reviewer"("order_id" "uuid", "reviewer_id" "uuid") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_assign_reviewer(uuid,uuid) is deprecated and quarantined; use tenant-safe direct orders updates after review routing is redesigned'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_assign_reviewer"("order_id" "uuid", "reviewer_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_assign_reviewer"("order_id" "uuid", "reviewer_id" "uuid") IS 'Slice 7F4A quarantine. Deprecated current_reviewer_id assignment RPC without tenant-safe review routing semantics; preserved only as a service_role-callable exception.';



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


ALTER FUNCTION "public"."rpc_bootstrap_admin"() OWNER TO "postgres";


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


ALTER TABLE "public"."email_queue" OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_claim_email_batch_v1"("p_limit" integer, "p_worker" "text") OWNER TO "postgres";


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


ALTER TABLE "public"."email_outbox" OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_claim_email_outbox"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_client_contact_create"("p_client_id" bigint, "p_contact" "jsonb") RETURNS TABLE("contact_id" bigint, "company_id" "uuid", "client_id" bigint, "name" "text", "title" "text", "email" "text", "phone" "text", "notes" "text", "status" "text", "is_default" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by_user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_client_company_id uuid;
  v_name text := trim(coalesce(p_contact->>'name', ''));
  v_status text := lower(trim(coalesce(p_contact->>'status', 'active')));
  v_is_default boolean := coalesce((p_contact->>'is_default')::boolean, false);
  v_contact_id bigint;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null or not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select coalesce(c.company_id, public.default_company_id())
    into v_client_company_id
    from public.clients c
   where c.id = p_client_id;

  if not found or v_client_company_id <> v_company_id then
    raise exception 'client_not_found'
      using errcode = 'P0002';
  end if;

  if not public.current_app_user_can_update_client_row(v_client_company_id, p_client_id) then
    raise exception 'client_contact_write_permission_required'
      using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'client_contact_name_required'
      using errcode = '22023';
  end if;

  if v_status not in ('active', 'inactive') then
    raise exception 'invalid_client_contact_status'
      using errcode = '22023';
  end if;

  if v_is_default and v_status = 'active' then
    update public.client_contacts
       set is_default = false
     where company_id = v_company_id
       and client_id = p_client_id
       and is_default is true;
  end if;

  insert into public.client_contacts (
    company_id,
    client_id,
    name,
    title,
    email,
    phone,
    notes,
    status,
    is_default,
    created_by_user_id
  )
  values (
    v_company_id,
    p_client_id,
    v_name,
    nullif(p_contact->>'title', ''),
    nullif(p_contact->>'email', ''),
    nullif(p_contact->>'phone', ''),
    nullif(p_contact->>'notes', ''),
    v_status,
    case when v_status = 'active' then v_is_default else false end,
    v_actor_user_id
  )
  returning id into v_contact_id;

  return query
  select *
    from public.rpc_client_contact_list(p_client_id) listed
   where listed.contact_id = v_contact_id;
end;
$$;


ALTER FUNCTION "public"."rpc_client_contact_create"("p_client_id" bigint, "p_contact" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_contact_create"("p_client_id" bigint, "p_contact" "jsonb") IS 'Creates a reusable client relationship contact for a current-company client the caller can update.';



CREATE OR REPLACE FUNCTION "public"."rpc_client_contact_list"("p_client_id" bigint) RETURNS TABLE("contact_id" bigint, "company_id" "uuid", "client_id" bigint, "name" "text", "title" "text", "email" "text", "phone" "text", "notes" "text", "status" "text", "is_default" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by_user_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_client_company_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null or not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select coalesce(c.company_id, public.default_company_id())
    into v_client_company_id
    from public.clients c
   where c.id = p_client_id;

  if not found or v_client_company_id <> v_company_id then
    raise exception 'client_not_found'
      using errcode = 'P0002';
  end if;

  if not public.current_app_user_can_read_client_row(v_client_company_id, p_client_id) then
    raise exception 'client_contact_read_permission_required'
      using errcode = '42501';
  end if;

  return query
  select
    cc.id as contact_id,
    cc.company_id,
    cc.client_id,
    cc.name,
    cc.title,
    cc.email,
    cc.phone,
    cc.notes,
    cc.status,
    cc.is_default,
    cc.created_at,
    cc.updated_at,
    cc.created_by_user_id
  from public.client_contacts cc
  where cc.company_id = v_company_id
    and cc.client_id = p_client_id
  order by
    case when cc.status = 'active' then 0 else 1 end,
    cc.is_default desc,
    cc.name asc,
    cc.id asc;
end;
$$;


ALTER FUNCTION "public"."rpc_client_contact_list"("p_client_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_contact_list"("p_client_id" bigint) IS 'Lists reusable client relationship contacts for a readable current-company client.';



CREATE OR REPLACE FUNCTION "public"."rpc_client_contact_set_default"("p_contact_id" bigint) RETURNS TABLE("contact_id" bigint, "company_id" "uuid", "client_id" bigint, "name" "text", "title" "text", "email" "text", "phone" "text", "notes" "text", "status" "text", "is_default" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by_user_id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select *
    from public.rpc_client_contact_update(
      p_contact_id,
      jsonb_build_object('status', 'active', 'is_default', true)
    );
$$;


ALTER FUNCTION "public"."rpc_client_contact_set_default"("p_contact_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_contact_set_default"("p_contact_id" bigint) IS 'Marks one active reusable client relationship contact as the default for its client.';



CREATE OR REPLACE FUNCTION "public"."rpc_client_contact_set_status"("p_contact_id" bigint, "p_status" "text") RETURNS TABLE("contact_id" bigint, "company_id" "uuid", "client_id" bigint, "name" "text", "title" "text", "email" "text", "phone" "text", "notes" "text", "status" "text", "is_default" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by_user_id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select *
    from public.rpc_client_contact_update(
      p_contact_id,
      jsonb_build_object('status', lower(trim(coalesce(p_status, ''))))
    );
$$;


ALTER FUNCTION "public"."rpc_client_contact_set_status"("p_contact_id" bigint, "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_contact_set_status"("p_contact_id" bigint, "p_status" "text") IS 'Activates or deactivates a reusable client relationship contact.';



CREATE OR REPLACE FUNCTION "public"."rpc_client_contact_update"("p_contact_id" bigint, "p_patch" "jsonb") RETURNS TABLE("contact_id" bigint, "company_id" "uuid", "client_id" bigint, "name" "text", "title" "text", "email" "text", "phone" "text", "notes" "text", "status" "text", "is_default" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by_user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_contact public.client_contacts%rowtype;
  v_name text;
  v_status text;
  v_is_default boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null or not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select *
    into v_contact
    from public.client_contacts cc
   where cc.id = p_contact_id
     and cc.company_id = v_company_id
   for update;

  if not found then
    raise exception 'client_contact_not_found'
      using errcode = 'P0002';
  end if;

  if not public.current_app_user_can_update_client_row(v_contact.company_id, v_contact.client_id) then
    raise exception 'client_contact_write_permission_required'
      using errcode = '42501';
  end if;

  v_name := case
    when p_patch ? 'name' then trim(coalesce(p_patch->>'name', ''))
    else v_contact.name
  end;

  if v_name = '' then
    raise exception 'client_contact_name_required'
      using errcode = '22023';
  end if;

  v_status := case
    when p_patch ? 'status' then lower(trim(coalesce(p_patch->>'status', '')))
    else v_contact.status
  end;

  if v_status not in ('active', 'inactive') then
    raise exception 'invalid_client_contact_status'
      using errcode = '22023';
  end if;

  v_is_default := case
    when p_patch ? 'is_default' then coalesce((p_patch->>'is_default')::boolean, false)
    else v_contact.is_default
  end;

  if v_status <> 'active' then
    v_is_default := false;
  end if;

  if v_is_default then
    update public.client_contacts
       set is_default = false
     where company_id = v_contact.company_id
       and client_id = v_contact.client_id
       and id <> v_contact.id
       and is_default is true;
  end if;

  update public.client_contacts cc
     set name = v_name,
         title = case when p_patch ? 'title' then nullif(p_patch->>'title', '') else cc.title end,
         email = case when p_patch ? 'email' then nullif(p_patch->>'email', '') else cc.email end,
         phone = case when p_patch ? 'phone' then nullif(p_patch->>'phone', '') else cc.phone end,
         notes = case when p_patch ? 'notes' then nullif(p_patch->>'notes', '') else cc.notes end,
         status = v_status,
         is_default = v_is_default
   where cc.id = v_contact.id;

  return query
  select *
    from public.rpc_client_contact_list(v_contact.client_id) listed
   where listed.contact_id = v_contact.id;
end;
$$;


ALTER FUNCTION "public"."rpc_client_contact_update"("p_contact_id" bigint, "p_patch" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_contact_update"("p_contact_id" bigint, "p_patch" "jsonb") IS 'Updates reusable client relationship contact metadata for a client the caller can update.';



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
    "company_id" "uuid",
    "contact_mode" "text" DEFAULT 'contacts'::"text" NOT NULL,
    "portal_url" "text",
    "portal_notes" "text",
    CONSTRAINT "clients_category_check" CHECK (("category" = ANY (ARRAY['amc'::"text", 'lender'::"text", 'client'::"text"]))),
    CONSTRAINT "clients_contact_mode_check" CHECK (("contact_mode" = ANY (ARRAY['contacts'::"text", 'no_specific_contact'::"text"]))),
    CONSTRAINT "clients_kind_chk" CHECK (("kind" = ANY (ARRAY['client'::"text", 'amc'::"text", 'borrower'::"text", 'lender'::"text"])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clients"."company_id" IS 'Nullable company scope foundation. Backfilled to default company; not yet used for RLS enforcement.';



COMMENT ON COLUMN "public"."clients"."contact_mode" IS 'Routine relationship contact mode. contacts means specific contacts may be recorded; no_specific_contact means portal or general intake only.';



COMMENT ON COLUMN "public"."clients"."portal_url" IS 'Optional portal or intake URL for a client/lender/AMC relationship. Does not store credentials.';



COMMENT ON COLUMN "public"."clients"."portal_notes" IS 'Optional operational portal or general intake notes for a client/lender/AMC relationship. Must not contain passwords or secrets.';



CREATE OR REPLACE FUNCTION "public"."rpc_client_create"("p" "jsonb") RETURNS "public"."clients"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r public.clients;
begin
  if not public.current_app_user_can_create_client() then
    raise exception 'clients.create permission is required to create clients';
  end if;

  insert into public.clients (name, contact_name, contact_email, status, phone, notes)
  values (
    nullif(trim((p->>'name')::text), ''),
    (p->>'contact_name')::text,
    (p->>'contact_email')::text,
    coalesce(nullif(trim((p->>'status')::text), ''), 'active'),
    (p->>'phone')::text,
    (p->>'notes')::text
  )
  returning * into r;

  return r;
end;
$$;


ALTER FUNCTION "public"."rpc_client_create"("p" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_create"("p" "jsonb") IS 'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_create_client(). Prefer direct table writes for active frontend paths.';



CREATE OR REPLACE FUNCTION "public"."rpc_client_delete"("p_client_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_client public.clients%rowtype;
begin
  select *
    into v_client
    from public.clients
   where id::text = p_client_id
   for update;

  if not found then
    raise exception 'Client not found';
  end if;

  if not public.current_app_user_can_delete_client_row(v_client.company_id, v_client.id) then
    raise exception 'clients.delete permission is required to delete clients';
  end if;

  delete from public.clients where id = v_client.id;
  return true;
end;
$$;


ALTER FUNCTION "public"."rpc_client_delete"("p_client_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_delete"("p_client_id" "text") IS 'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_delete_client_row(...). Hard-delete semantics are unchanged.';



CREATE OR REPLACE FUNCTION "public"."rpc_client_management_amc_options"() RETURNS TABLE("amc_id" bigint, "amc_name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not (
    public.current_app_user_has_permission('clients.read.all')
    or public.current_app_user_has_permission('clients.read.assigned')
    or public.current_app_user_has_permission('clients.create')
    or public.current_app_user_has_permission('clients.update.all')
    or public.current_app_user_has_permission('clients.update.assigned')
    or public.current_app_user_has_permission('orders.create')
    or public.current_app_user_has_permission('orders.update.all')
  ) then
    raise exception 'client_management_amc_options_permission_required'
      using errcode = '42501';
  end if;

  return query
  select
    c.id as amc_id,
    c.name as amc_name
  from public.clients c
  where coalesce(c.company_id, public.default_company_id()) = v_company_id
    and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
    and coalesce(c.is_merged, false) = false
    and lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) = 'amc'
    and (
      public.current_app_user_has_permission('clients.read.all')
      or public.current_app_user_has_permission('clients.create')
      or public.current_app_user_has_permission('clients.update.all')
      or public.current_app_user_has_permission('orders.create')
      or public.current_app_user_has_permission('orders.update.all')
      or public.current_app_user_can_read_client_row(c.company_id, c.id)
    )
  order by c.name asc, c.id asc;
end;
$$;


ALTER FUNCTION "public"."rpc_client_management_amc_options"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_management_amc_options"() IS 'Phase 8C5H1A safe broad client management AMC option projection. Returns active current-company non-merged AMC id/name pairs only.';



CREATE OR REPLACE FUNCTION "public"."rpc_client_management_archive"("p_client_id" bigint, "p_reason" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text") RETURNS TABLE("client_id" bigint, "status" "text", "is_archived" boolean, "changed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_client public.clients%rowtype;
  v_changed boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  select *
    into v_client
    from public.clients c
   where c.id = p_client_id
     and coalesce(c.company_id, public.default_company_id()) = v_company_id
   for update;

  if not found then
    raise exception 'client_not_found'
      using errcode = 'P0002';
  end if;

  if not public.current_app_user_has_permission('clients.archive') then
    raise exception 'client_archive_permission_required'
      using errcode = '42501';
  end if;

  v_changed := lower(coalesce(nullif(v_client.status, ''), 'active')) <> 'inactive'
    or coalesce(v_client.is_archived, false) = false;

  if v_changed then
    update public.clients c
       set status = 'inactive',
           is_archived = true
     where c.id = v_client.id;
  end if;

  return query
  select
    c.id as client_id,
    coalesce(nullif(c.status, ''), 'active') as status,
    coalesce(c.is_archived, false) as is_archived,
    v_changed as changed
  from public.clients c
  where c.id = v_client.id
    and coalesce(c.company_id, public.default_company_id()) = v_company_id;
end;
$$;


ALTER FUNCTION "public"."rpc_client_management_archive"("p_client_id" bigint, "p_reason" "text", "p_request_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_management_archive"("p_client_id" bigint, "p_reason" "text", "p_request_id" "text") IS 'Phase 8C5H2B safe broad client management archive RPC. Marks current-company clients inactive/archived without hard delete.';



CREATE OR REPLACE FUNCTION "public"."rpc_client_management_create"("p_client" "jsonb") RETURNS TABLE("client_id" bigint, "client_name" "text", "status" "text", "category" "text", "amc_id" bigint, "amc_name" "text", "contact_mode" "text", "portal_url" "text", "portal_notes" "text", "notes" "text", "contact_name_1" "text", "contact_email_1" "text", "contact_phone_1" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_client_id bigint;
begin
  select created.client_id
    into v_client_id
    from public.rpc_client_management_create_without_portal(p_client) created
   limit 1;

  if v_client_id is null then
    raise exception 'client_create_failed'
      using errcode = 'P0002';
  end if;

  if p_client ? 'portal_url' or p_client ? 'portal_notes' then
    update public.clients c
       set portal_url = case
             when p_client ? 'portal_url' then nullif(trim(coalesce(p_client->>'portal_url', '')), '')
             else c.portal_url
           end,
           portal_notes = case
             when p_client ? 'portal_notes' then nullif(p_client->>'portal_notes', '')
             else c.portal_notes
           end
     where c.id = v_client_id;
  end if;

  return query
  select
    detail.client_id,
    detail.client_name,
    detail.status,
    detail.category,
    detail.amc_id,
    detail.amc_name,
    detail.contact_mode,
    detail.portal_url,
    detail.portal_notes,
    detail.notes,
    detail.contact_name_1,
    detail.contact_email_1,
    detail.contact_phone_1
  from public.rpc_client_management_detail(v_client_id) detail;
end;
$$;


ALTER FUNCTION "public"."rpc_client_management_create"("p_client" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_client_management_create_without_portal"("p_client" "jsonb") RETURNS TABLE("client_id" bigint, "client_name" "text", "status" "text", "category" "text", "amc_id" bigint, "amc_name" "text", "contact_mode" "text", "notes" "text", "contact_name_1" "text", "contact_email_1" "text", "contact_phone_1" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_name text := trim(coalesce(p_client->>'name', ''));
  v_status text := lower(trim(coalesce(p_client->>'status', 'active')));
  v_category text := lower(trim(coalesce(p_client->>'category', 'client')));
  v_contact_mode text := lower(trim(coalesce(p_client->>'contact_mode', 'contacts')));
  v_amc_id bigint := null;
  v_new_client_id bigint;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('clients.create') then
    raise exception 'client_create_permission_required'
      using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'client_name_required'
      using errcode = '22023';
  end if;

  if v_status not in ('active', 'inactive') then
    raise exception 'invalid_client_status'
      using errcode = '22023';
  end if;

  if v_category not in ('client', 'lender', 'amc') then
    raise exception 'invalid_client_category'
      using errcode = '22023';
  end if;

  if v_contact_mode not in ('contacts', 'no_specific_contact') then
    raise exception 'invalid_client_contact_mode'
      using errcode = '22023';
  end if;

  if v_category <> 'amc'
     and p_client ? 'amc_id'
     and nullif(trim(coalesce(p_client->>'amc_id', '')), '') is not null then
    if not trim(coalesce(p_client->>'amc_id', '')) ~ '^[0-9]+$' then
      raise exception 'invalid_amc'
        using errcode = '22023';
    end if;

    v_amc_id := (p_client->>'amc_id')::bigint;

    if not exists (
      select 1
        from public.clients a
       where a.id = v_amc_id
         and coalesce(a.company_id, public.default_company_id()) = v_company_id
         and lower(coalesce(nullif(a.status, ''), 'active')) = 'active'
         and coalesce(a.is_merged, false) = false
         and lower(coalesce(nullif(a.category, ''), nullif(a.client_type, ''), nullif(a.kind, ''), 'client')) = 'amc'
    ) then
      raise exception 'invalid_amc'
        using errcode = '22023';
    end if;
  end if;

  if exists (
    select 1
      from public.clients c
     where coalesce(c.company_id, public.default_company_id()) = v_company_id
       and lower(trim(coalesce(c.name, ''))) = lower(v_name)
       and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
       and coalesce(c.is_merged, false) = false
  ) then
    raise exception 'client_name_already_exists'
      using errcode = '23505';
  end if;

  insert into public.clients (
    name,
    status,
    category,
    amc_id,
    contact_mode,
    notes,
    contact_name_1,
    contact_email_1,
    contact_phone_1,
    created_at
  )
  values (
    v_name,
    v_status,
    v_category,
    case when v_category = 'amc' then null else v_amc_id end,
    v_contact_mode,
    nullif(p_client->>'notes', ''),
    nullif(p_client->>'contact_name_1', ''),
    nullif(p_client->>'contact_email_1', ''),
    nullif(p_client->>'contact_phone_1', ''),
    now()
  )
  returning id into v_new_client_id;

  return query
  select
    c.id as client_id,
    c.name as client_name,
    coalesce(nullif(c.status, ''), 'active') as status,
    lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as category,
    c.amc_id,
    a.name as amc_name,
    coalesce(nullif(c.contact_mode, ''), 'contacts') as contact_mode,
    c.notes,
    c.contact_name_1,
    c.contact_email_1,
    c.contact_phone_1
  from public.clients c
  left join public.clients a
    on a.id = c.amc_id
   and coalesce(a.company_id, public.default_company_id()) = v_company_id
  where c.id = v_new_client_id
    and coalesce(c.company_id, public.default_company_id()) = v_company_id;
end;
$_$;


ALTER FUNCTION "public"."rpc_client_management_create_without_portal"("p_client" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_client_management_detail"("p_client_id" bigint) RETURNS TABLE("client_id" bigint, "client_name" "text", "status" "text", "category" "text", "amc_id" bigint, "amc_name" "text", "contact_mode" "text", "portal_url" "text", "portal_notes" "text", "notes" "text", "contact_name_1" "text", "contact_email_1" "text", "contact_phone_1" "text", "contact_name_2" "text", "contact_email_2" "text", "contact_phone_2" "text", "is_merged" boolean, "merged_into_id" bigint, "order_count" integer, "avg_fee" numeric, "last_order_date" timestamp with time zone, "active_order_count" integer, "completed_order_count" integer, "direct_order_count" integer, "managed_order_count" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    base.client_id,
    base.client_name,
    base.status,
    base.category,
    base.amc_id,
    base.amc_name,
    base.contact_mode,
    c.portal_url,
    c.portal_notes,
    base.notes,
    base.contact_name_1,
    base.contact_email_1,
    base.contact_phone_1,
    base.contact_name_2,
    base.contact_email_2,
    base.contact_phone_2,
    base.is_merged,
    base.merged_into_id,
    base.order_count,
    base.avg_fee,
    base.last_order_date,
    base.active_order_count,
    base.completed_order_count,
    base.direct_order_count,
    base.managed_order_count
  from public.rpc_client_management_detail_without_portal(p_client_id) base
  left join public.clients c
    on c.id = base.client_id;
$$;


ALTER FUNCTION "public"."rpc_client_management_detail"("p_client_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_management_detail"("p_client_id" bigint) IS 'Returns a current-company client relationship detail row, including contact optionality, portal metadata, and AMC/lender rollup metrics.';



CREATE OR REPLACE FUNCTION "public"."rpc_client_management_detail_without_portal"("p_client_id" bigint) RETURNS TABLE("client_id" bigint, "client_name" "text", "status" "text", "category" "text", "amc_id" bigint, "amc_name" "text", "contact_mode" "text", "notes" "text", "contact_name_1" "text", "contact_email_1" "text", "contact_phone_1" "text", "contact_name_2" "text", "contact_email_2" "text", "contact_phone_2" "text", "is_merged" boolean, "merged_into_id" bigint, "order_count" integer, "avg_fee" numeric, "last_order_date" timestamp with time zone, "active_order_count" integer, "completed_order_count" integer, "direct_order_count" integer, "managed_order_count" integer)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not (
    public.current_app_user_has_permission('clients.read.all')
    or public.current_app_user_has_permission('clients.read.assigned')
  ) then
    raise exception 'client_management_read_permission_required'
      using errcode = '42501';
  end if;

  return query
  with target_client as (
    select
      c.id,
      c.name,
      coalesce(nullif(c.status, ''), 'active') as client_status,
      lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as client_category,
      c.amc_id,
      coalesce(nullif(c.contact_mode, ''), 'contacts') as contact_mode,
      c.notes,
      c.contact_name_1,
      c.contact_email_1,
      c.contact_phone_1,
      c.contact_name_2,
      c.contact_email_2,
      c.contact_phone_2,
      coalesce(c.is_merged, false) as client_is_merged,
      c.merged_into_id
    from public.clients c
    where c.id = p_client_id
      and coalesce(c.company_id, public.default_company_id()) = v_company_id
      and public.current_app_user_can_read_client_row(c.company_id, c.id)
  ),
  metric_orders as (
    select distinct
      tc.id as metric_client_id,
      o.id as order_id,
      o.status,
      coalesce(o.fee_amount, o.base_fee, o.appraiser_fee) as fee,
      o.created_at,
      (o.client_id = tc.id) as is_direct_order,
      (
        tc.client_category = 'amc'
        and (
          o.managing_amc_id = tc.id
          or (
            o.managing_amc_id is null
            and exists (
              select 1
                from public.clients linked
               where linked.id = o.client_id
                 and linked.amc_id = tc.id
                 and coalesce(linked.company_id, public.default_company_id()) = v_company_id
            )
          )
        )
      ) as is_managed_order
    from target_client tc
    left join public.orders o
      on coalesce(o.company_id, public.default_company_id()) = v_company_id
     and public.current_app_user_can_read_order(o.id)
     and (
       (
         tc.client_category = 'amc'
         and (
           o.managing_amc_id = tc.id
           or (
             o.managing_amc_id is null
             and exists (
               select 1
                 from public.clients linked
                where linked.id = o.client_id
                  and linked.amc_id = tc.id
                  and coalesce(linked.company_id, public.default_company_id()) = v_company_id
             )
           )
         )
       )
       or (
         tc.client_category <> 'amc'
         and o.client_id = tc.id
       )
     )
  ),
  metrics as (
    select
      mo.metric_client_id,
      count(mo.order_id)::integer as order_count,
      avg(mo.fee) as avg_fee,
      max(mo.created_at) as last_order_date,
      count(mo.order_id) filter (
        where lower(coalesce(mo.status::text, '')) not in ('completed', 'complete', 'cancelled', 'canceled', 'voided')
      )::integer as active_order_count,
      count(mo.order_id) filter (
        where lower(coalesce(mo.status::text, '')) in ('completed', 'complete')
      )::integer as completed_order_count,
      count(mo.order_id) filter (where mo.is_direct_order)::integer as direct_order_count,
      count(mo.order_id) filter (where mo.is_managed_order)::integer as managed_order_count
    from metric_orders mo
    group by mo.metric_client_id
  )
  select
    tc.id as client_id,
    tc.name as client_name,
    tc.client_status as status,
    tc.client_category as category,
    tc.amc_id,
    amc.name as amc_name,
    tc.contact_mode,
    tc.notes,
    tc.contact_name_1,
    tc.contact_email_1,
    tc.contact_phone_1,
    tc.contact_name_2,
    tc.contact_email_2,
    tc.contact_phone_2,
    tc.client_is_merged as is_merged,
    tc.merged_into_id,
    coalesce(m.order_count, 0) as order_count,
    m.avg_fee,
    m.last_order_date,
    coalesce(m.active_order_count, 0) as active_order_count,
    coalesce(m.completed_order_count, 0) as completed_order_count,
    coalesce(m.direct_order_count, 0) as direct_order_count,
    coalesce(m.managed_order_count, 0) as managed_order_count
  from target_client tc
  left join metrics m
    on m.metric_client_id = tc.id
  left join public.clients amc
    on amc.id = tc.amc_id
   and coalesce(amc.company_id, public.default_company_id()) = v_company_id;
end;
$$;


ALTER FUNCTION "public"."rpc_client_management_detail_without_portal"("p_client_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_management_detail_without_portal"("p_client_id" bigint) IS 'Returns a current-company client relationship detail row, including contact optionality and AMC/lender rollup metrics.';



CREATE OR REPLACE FUNCTION "public"."rpc_client_management_list"("p_search" "text" DEFAULT ''::"text", "p_category" "text" DEFAULT 'all'::"text", "p_sort" "text" DEFAULT 'orders_desc'::"text") RETURNS TABLE("client_id" bigint, "client_name" "text", "status" "text", "category" "text", "amc_id" bigint, "amc_name" "text", "contact_mode" "text", "portal_url" "text", "portal_notes" "text", "contact_name" "text", "contact_email" "text", "contact_phone" "text", "order_count" integer, "avg_fee" numeric, "last_order_date" timestamp with time zone, "is_merged" boolean, "merged_into_id" bigint, "active_order_count" integer, "completed_order_count" integer, "direct_order_count" integer, "managed_order_count" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    base.client_id,
    base.client_name,
    base.status,
    base.category,
    base.amc_id,
    base.amc_name,
    base.contact_mode,
    c.portal_url,
    c.portal_notes,
    base.contact_name,
    base.contact_email,
    base.contact_phone,
    base.order_count,
    base.avg_fee,
    base.last_order_date,
    base.is_merged,
    base.merged_into_id,
    base.active_order_count,
    base.completed_order_count,
    base.direct_order_count,
    base.managed_order_count
  from public.rpc_client_management_list_without_portal(p_search, p_category, p_sort) base
  left join public.clients c
    on c.id = base.client_id;
$$;


ALTER FUNCTION "public"."rpc_client_management_list"("p_search" "text", "p_category" "text", "p_sort" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_client_management_list_without_portal"("p_search" "text" DEFAULT ''::"text", "p_category" "text" DEFAULT 'all'::"text", "p_sort" "text" DEFAULT 'orders_desc'::"text") RETURNS TABLE("client_id" bigint, "client_name" "text", "status" "text", "category" "text", "amc_id" bigint, "amc_name" "text", "contact_mode" "text", "contact_name" "text", "contact_email" "text", "contact_phone" "text", "order_count" integer, "avg_fee" numeric, "last_order_date" timestamp with time zone, "is_merged" boolean, "merged_into_id" bigint, "active_order_count" integer, "completed_order_count" integer, "direct_order_count" integer, "managed_order_count" integer)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_search text := trim(coalesce(p_search, ''));
  v_category text := lower(trim(coalesce(p_category, 'all')));
  v_sort text := lower(trim(coalesce(p_sort, 'orders_desc')));
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not (
    public.current_app_user_has_permission('clients.read.all')
    or public.current_app_user_has_permission('clients.read.assigned')
  ) then
    raise exception 'client_management_read_permission_required'
      using errcode = '42501';
  end if;

  if v_sort not in ('orders_desc', 'name_asc', 'name_desc', 'last_order_desc') then
    raise exception 'invalid_client_management_sort'
      using errcode = '22023';
  end if;

  if v_category <> 'all'
     and v_category not in ('client', 'amc', 'lender', 'bank', 'private')
     and not exists (
       select 1
         from public.clients c
        where coalesce(c.company_id, public.default_company_id()) = v_company_id
          and lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) = v_category
     ) then
    raise exception 'invalid_client_management_category'
      using errcode = '22023';
  end if;

  return query
  with readable_clients as (
    select
      c.id,
      c.name,
      coalesce(nullif(c.status, ''), 'active') as client_status,
      lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as client_category,
      c.amc_id,
      coalesce(nullif(c.contact_mode, ''), 'contacts') as contact_mode,
      c.contact_name_1,
      c.contact_email_1,
      c.contact_phone_1,
      coalesce(c.is_merged, false) as client_is_merged,
      c.merged_into_id
    from public.clients c
    where coalesce(c.company_id, public.default_company_id()) = v_company_id
      and public.current_app_user_can_read_client_row(c.company_id, c.id)
      and (v_search = '' or c.name ilike ('%' || v_search || '%'))
  ),
  metric_orders as (
    select distinct
      rc.id as metric_client_id,
      o.id as order_id,
      o.status,
      coalesce(o.fee_amount, o.base_fee, o.appraiser_fee) as fee,
      o.created_at,
      (o.client_id = rc.id) as is_direct_order,
      (
        rc.client_category = 'amc'
        and (
          o.managing_amc_id = rc.id
          or (
            o.managing_amc_id is null
            and exists (
              select 1
                from public.clients linked
               where linked.id = o.client_id
                 and linked.amc_id = rc.id
                 and coalesce(linked.company_id, public.default_company_id()) = v_company_id
            )
          )
        )
      ) as is_managed_order
    from readable_clients rc
    left join public.orders o
      on coalesce(o.company_id, public.default_company_id()) = v_company_id
     and public.current_app_user_can_read_order(o.id)
     and (
       (
         rc.client_category = 'amc'
         and (
           o.managing_amc_id = rc.id
           or (
             o.managing_amc_id is null
             and exists (
               select 1
                 from public.clients linked
                where linked.id = o.client_id
                  and linked.amc_id = rc.id
                  and coalesce(linked.company_id, public.default_company_id()) = v_company_id
             )
           )
         )
       )
       or (
         rc.client_category <> 'amc'
         and o.client_id = rc.id
       )
     )
  ),
  metrics as (
    select
      mo.metric_client_id,
      count(mo.order_id)::integer as order_count,
      avg(mo.fee) as avg_fee,
      max(mo.created_at) as last_order_date,
      count(mo.order_id) filter (
        where lower(coalesce(mo.status::text, '')) not in ('completed', 'complete', 'cancelled', 'canceled', 'voided')
      )::integer as active_order_count,
      count(mo.order_id) filter (
        where lower(coalesce(mo.status::text, '')) in ('completed', 'complete')
      )::integer as completed_order_count,
      count(mo.order_id) filter (where mo.is_direct_order)::integer as direct_order_count,
      count(mo.order_id) filter (where mo.is_managed_order)::integer as managed_order_count
    from metric_orders mo
    group by mo.metric_client_id
  )
  select
    rc.id as client_id,
    rc.name as client_name,
    rc.client_status as status,
    rc.client_category as category,
    rc.amc_id,
    amc.name as amc_name,
    rc.contact_mode,
    rc.contact_name_1 as contact_name,
    rc.contact_email_1 as contact_email,
    rc.contact_phone_1 as contact_phone,
    coalesce(m.order_count, 0) as order_count,
    m.avg_fee,
    m.last_order_date,
    rc.client_is_merged as is_merged,
    rc.merged_into_id,
    coalesce(m.active_order_count, 0) as active_order_count,
    coalesce(m.completed_order_count, 0) as completed_order_count,
    coalesce(m.direct_order_count, 0) as direct_order_count,
    coalesce(m.managed_order_count, 0) as managed_order_count
  from readable_clients rc
  left join metrics m
    on m.metric_client_id = rc.id
  left join public.clients amc
    on amc.id = rc.amc_id
   and coalesce(amc.company_id, public.default_company_id()) = v_company_id
  where v_category = 'all'
     or rc.client_category = v_category
  order by
    case when v_sort = 'orders_desc' then coalesce(m.order_count, 0) end desc,
    case when v_sort = 'last_order_desc' then m.last_order_date end desc nulls last,
    case when v_sort = 'name_asc' then rc.name end asc,
    case when v_sort = 'name_desc' then rc.name end desc,
    rc.name asc,
    rc.id asc;
end;
$$;


ALTER FUNCTION "public"."rpc_client_management_list_without_portal"("p_search" "text", "p_category" "text", "p_sort" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_client_management_update"("p_client_id" bigint, "p_patch" "jsonb") RETURNS TABLE("client_id" bigint, "client_name" "text", "status" "text", "category" "text", "amc_id" bigint, "amc_name" "text", "contact_mode" "text", "portal_url" "text", "portal_notes" "text", "notes" "text", "contact_name_1" "text", "contact_email_1" "text", "contact_phone_1" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_client_id bigint;
begin
  select updated.client_id
    into v_client_id
    from public.rpc_client_management_update_without_portal(p_client_id, p_patch) updated
   limit 1;

  if v_client_id is null then
    raise exception 'client_not_found'
      using errcode = 'P0002';
  end if;

  if p_patch ? 'portal_url' or p_patch ? 'portal_notes' then
    update public.clients c
       set portal_url = case
             when p_patch ? 'portal_url' then nullif(trim(coalesce(p_patch->>'portal_url', '')), '')
             else c.portal_url
           end,
           portal_notes = case
             when p_patch ? 'portal_notes' then nullif(p_patch->>'portal_notes', '')
             else c.portal_notes
           end
     where c.id = v_client_id;
  end if;

  return query
  select
    detail.client_id,
    detail.client_name,
    detail.status,
    detail.category,
    detail.amc_id,
    detail.amc_name,
    detail.contact_mode,
    detail.portal_url,
    detail.portal_notes,
    detail.notes,
    detail.contact_name_1,
    detail.contact_email_1,
    detail.contact_phone_1
  from public.rpc_client_management_detail(v_client_id) detail;
end;
$$;


ALTER FUNCTION "public"."rpc_client_management_update"("p_client_id" bigint, "p_patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_client_management_update_without_portal"("p_client_id" bigint, "p_patch" "jsonb") RETURNS TABLE("client_id" bigint, "client_name" "text", "status" "text", "category" "text", "amc_id" bigint, "amc_name" "text", "contact_mode" "text", "notes" "text", "contact_name_1" "text", "contact_email_1" "text", "contact_phone_1" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_client public.clients%rowtype;
  v_name text;
  v_status text;
  v_category text;
  v_contact_mode text;
  v_amc_id bigint;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  select *
    into v_client
    from public.clients c
   where c.id = p_client_id
     and coalesce(c.company_id, public.default_company_id()) = v_company_id
   for update;

  if not found then
    raise exception 'client_not_found'
      using errcode = 'P0002';
  end if;

  if not public.current_app_user_can_update_client_row(v_client.company_id, v_client.id) then
    raise exception 'client_update_permission_required'
      using errcode = '42501';
  end if;

  if coalesce(v_client.is_merged, false) then
    raise exception 'client_merged'
      using errcode = '22023';
  end if;

  v_name := case
    when p_patch ? 'name' then trim(coalesce(p_patch->>'name', ''))
    else v_client.name
  end;

  if v_name is null or trim(v_name) = '' then
    raise exception 'client_name_required'
      using errcode = '22023';
  end if;

  v_status := case
    when p_patch ? 'status' then lower(trim(coalesce(p_patch->>'status', '')))
    else lower(coalesce(nullif(v_client.status, ''), 'active'))
  end;

  if v_status not in ('active', 'inactive') then
    raise exception 'invalid_client_status'
      using errcode = '22023';
  end if;

  v_category := case
    when p_patch ? 'category' then lower(trim(coalesce(p_patch->>'category', '')))
    else lower(coalesce(nullif(v_client.category, ''), nullif(v_client.client_type, ''), nullif(v_client.kind, ''), 'client'))
  end;

  if v_category not in ('client', 'lender', 'amc') then
    raise exception 'invalid_client_category'
      using errcode = '22023';
  end if;

  v_contact_mode := case
    when p_patch ? 'contact_mode' then lower(trim(coalesce(p_patch->>'contact_mode', '')))
    else lower(coalesce(nullif(v_client.contact_mode, ''), 'contacts'))
  end;

  if v_contact_mode not in ('contacts', 'no_specific_contact') then
    raise exception 'invalid_client_contact_mode'
      using errcode = '22023';
  end if;

  v_amc_id := v_client.amc_id;

  if v_category = 'amc' then
    v_amc_id := null;
  elsif p_patch ? 'amc_id' then
    if nullif(trim(coalesce(p_patch->>'amc_id', '')), '') is null then
      v_amc_id := null;
    else
      if not trim(coalesce(p_patch->>'amc_id', '')) ~ '^[0-9]+$' then
        raise exception 'invalid_amc'
          using errcode = '22023';
      end if;

      v_amc_id := (p_patch->>'amc_id')::bigint;
    end if;
  end if;

  if v_amc_id is not null then
    if not exists (
      select 1
        from public.clients a
       where a.id = v_amc_id
         and a.id <> v_client.id
         and coalesce(a.company_id, public.default_company_id()) = v_company_id
         and lower(coalesce(nullif(a.status, ''), 'active')) = 'active'
         and coalesce(a.is_merged, false) = false
         and lower(coalesce(nullif(a.category, ''), nullif(a.client_type, ''), nullif(a.kind, ''), 'client')) = 'amc'
    ) then
      raise exception 'invalid_amc'
        using errcode = '22023';
    end if;
  end if;

  if lower(trim(coalesce(v_client.name, ''))) is distinct from lower(v_name)
     and exists (
       select 1
         from public.clients c
        where c.id <> v_client.id
          and coalesce(c.company_id, public.default_company_id()) = v_company_id
          and lower(trim(coalesce(c.name, ''))) = lower(v_name)
          and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
          and coalesce(c.is_merged, false) = false
     ) then
    raise exception 'client_name_already_exists'
      using errcode = '23505';
  end if;

  update public.clients c
     set name = v_name,
         status = v_status,
         category = v_category,
         amc_id = v_amc_id,
         contact_mode = v_contact_mode,
         notes = case when p_patch ? 'notes' then nullif(p_patch->>'notes', '') else c.notes end,
         contact_name_1 = case when p_patch ? 'contact_name_1' then nullif(p_patch->>'contact_name_1', '') else c.contact_name_1 end,
         contact_email_1 = case when p_patch ? 'contact_email_1' then nullif(p_patch->>'contact_email_1', '') else c.contact_email_1 end,
         contact_phone_1 = case when p_patch ? 'contact_phone_1' then nullif(p_patch->>'contact_phone_1', '') else c.contact_phone_1 end
   where c.id = v_client.id;

  return query
  select
    c.id as client_id,
    c.name as client_name,
    coalesce(nullif(c.status, ''), 'active') as status,
    lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as category,
    c.amc_id,
    a.name as amc_name,
    coalesce(nullif(c.contact_mode, ''), 'contacts') as contact_mode,
    c.notes,
    c.contact_name_1,
    c.contact_email_1,
    c.contact_phone_1
  from public.clients c
  left join public.clients a
    on a.id = c.amc_id
   and coalesce(a.company_id, public.default_company_id()) = v_company_id
  where c.id = v_client.id
    and coalesce(c.company_id, public.default_company_id()) = v_company_id;
end;
$_$;


ALTER FUNCTION "public"."rpc_client_management_update_without_portal"("p_client_id" bigint, "p_patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_client_update"("p_client_id" "text", "p_patch" "jsonb") RETURNS "public"."clients"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r public.clients;
  v_client public.clients%rowtype;
begin
  select *
    into v_client
    from public.clients
   where id::text = p_client_id
   for update;

  if not found then
    raise exception 'Client not found';
  end if;

  if not public.current_app_user_can_update_client_row(v_client.company_id, v_client.id) then
    raise exception 'client update permission is required';
  end if;

  update public.clients
     set name          = coalesce(nullif(trim((p_patch->>'name')::text), ''), name),
         contact_name  = coalesce((p_patch->>'contact_name')::text, contact_name),
         contact_email = coalesce((p_patch->>'contact_email')::text, contact_email),
         status        = coalesce(nullif(trim((p_patch->>'status')::text), ''), status),
         phone         = coalesce((p_patch->>'phone')::text, phone),
         notes         = coalesce((p_patch->>'notes')::text, notes)
   where id = v_client.id
  returning * into r;

  return r;
end;
$$;


ALTER FUNCTION "public"."rpc_client_update"("p_client_id" "text", "p_patch" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_client_update"("p_client_id" "text", "p_patch" "jsonb") IS 'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_update_client_row(...). Prefer direct table writes for active frontend paths.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_assignable_users"("p_purpose" "text" DEFAULT 'all'::"text") RETURNS TABLE("user_id" "uuid", "display_name" "text", "full_name" "text", "name" "text", "email" "text", "avatar_url" "text", "display_color" "text", "membership_status" "text", "role_assignments" "jsonb", "role_keys" "text"[], "can_be_appraiser" boolean, "can_be_reviewer" boolean, "default_split_pct" numeric, "is_active" boolean, "status" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_purpose text := lower(trim(coalesce(p_purpose, 'all')));
  v_company_status text;
  v_authorized boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_purpose not in ('all', 'order_assignment', 'appraiser', 'reviewer') then
    raise exception 'invalid_assignable_user_purpose'
      using errcode = '22023';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  v_authorized :=
    public.current_app_user_has_permission('users.read')
    or public.current_app_user_has_permission('orders.create')
    or public.current_app_user_has_permission('orders.update.all')
    or public.current_app_user_has_permission('orders.read.all')
    or public.current_app_user_has_permission('orders.read.assigned');

  if not v_authorized then
    raise exception 'assignable_users_permission_required'
      using errcode = '42501';
  end if;

  return query
  with active_member_users as (
    select
      cm.user_id,
      cm.status as membership_status,
      u.display_name,
      u.full_name,
      u.name,
      u.email,
      u.avatar_url,
      coalesce(nullif(u.display_color, ''), nullif(u.color, '')) as display_color,
      coalesce(u.fee_split, u.split) as default_split_pct,
      coalesce(u.is_active, true) as is_active,
      coalesce(nullif(u.status, ''), 'active') as status
    from public.company_memberships cm
    join public.users u
      on u.id = cm.user_id
   where cm.company_id = v_company_id
     and cm.status = 'active'
     and coalesce(u.is_active, true) = true
     and lower(coalesce(nullif(u.status, ''), 'active')) = 'active'
  ),
  active_roles as (
    select
      ura.user_id,
      ura.id as role_assignment_id,
      r.id as role_id,
      r.name as role_name,
      trim(both '_' from regexp_replace(lower(trim(r.name)), '[^a-z0-9]+', '_', 'g')) as role_key,
      ura.is_primary
    from public.user_role_assignments ura
    join public.roles r
      on r.id = ura.role_id
   where ura.company_id = v_company_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
     and r.company_id is null
     and r.is_template = true
     and r.is_system = true
  ),
  role_summary as (
    select
      amu.user_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'role_assignment_id', ar.role_assignment_id,
            'role_id', ar.role_id,
            'role_key', ar.role_key,
            'role_name', ar.role_name,
            'display_name', ar.role_name,
            'is_primary', ar.is_primary
          )
          order by
            ar.is_primary desc,
            case ar.role_key
              when 'owner' then 1
              when 'admin' then 2
              when 'appraiser' then 3
              when 'reviewer' then 4
              when 'billing' then 5
              else 99
            end,
            ar.role_name
        ) filter (where ar.role_id is not null),
        '[]'::jsonb
      ) as role_assignments,
      coalesce(
        array_agg(distinct ar.role_key order by ar.role_key)
          filter (where ar.role_key is not null),
        array[]::text[]
      ) as role_keys
    from active_member_users amu
    left join active_roles ar
      on ar.user_id = amu.user_id
   group by amu.user_id
  ),
  permission_summary as (
    select
      amu.user_id,
      coalesce(bool_or(k.permission_key = 'orders.assignable_as_appraiser'), false) as can_be_appraiser,
      coalesce(bool_or(k.permission_key = 'orders.assignable_as_reviewer'), false) as can_be_reviewer
    from active_member_users amu
    left join lateral public.app_user_permission_keys_for_company(amu.user_id, v_company_id) k(permission_key)
      on true
   group by amu.user_id
  )
  select
    amu.user_id,
    coalesce(nullif(amu.display_name, ''), nullif(amu.full_name, ''), nullif(amu.name, ''), amu.email) as display_name,
    coalesce(nullif(amu.full_name, ''), nullif(amu.name, ''), nullif(amu.display_name, '')) as full_name,
    amu.name,
    amu.email,
    amu.avatar_url,
    amu.display_color,
    amu.membership_status,
    coalesce(rs.role_assignments, '[]'::jsonb) as role_assignments,
    coalesce(rs.role_keys, array[]::text[]) as role_keys,
    coalesce(ps.can_be_appraiser, false) as can_be_appraiser,
    coalesce(ps.can_be_reviewer, false) as can_be_reviewer,
    amu.default_split_pct,
    amu.is_active,
    amu.status
  from active_member_users amu
  left join role_summary rs
    on rs.user_id = amu.user_id
  left join permission_summary ps
    on ps.user_id = amu.user_id
  where case
    when v_purpose = 'appraiser' then coalesce(ps.can_be_appraiser, false)
    when v_purpose = 'reviewer' then coalesce(ps.can_be_reviewer, false)
    when v_purpose = 'order_assignment' then coalesce(ps.can_be_appraiser, false) or coalesce(ps.can_be_reviewer, false)
    else true
  end
  order by
    coalesce(nullif(amu.display_name, ''), nullif(amu.full_name, ''), nullif(amu.name, ''), amu.email),
    amu.user_id;
end;
$$;


ALTER FUNCTION "public"."rpc_company_assignable_users"("p_purpose" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_assignable_users"("p_purpose" "text") IS 'Safe current-company assignable user projection. Returns active current-company members with Appraiser/Reviewer eligibility derived from effective permissions, including explicit grants and revokes.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_bootstrap"("p_company_slug" "text", "p_company_name" "text", "p_company_type" "text" DEFAULT 'staff_shop'::"text", "p_timezone" "text" DEFAULT 'America/New_York'::"text", "p_locale" "text" DEFAULT 'en-US'::"text", "p_owner_auth_id" "uuid" DEFAULT NULL::"uuid", "p_owner_email" "text" DEFAULT NULL::"text", "p_owner_name" "text" DEFAULT NULL::"text", "p_owner_phone" "text" DEFAULT NULL::"text", "p_idempotency_key" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("company_id" "uuid", "company_slug" "text", "company_name" "text", "company_type" "text", "company_status" "text", "owner_user_id" "uuid", "owner_auth_id" "uuid", "owner_email" "text", "membership_id" "uuid", "owner_role_assignment_id" "uuid", "owner_role_id" "uuid", "active_company_metadata" "jsonb", "bootstrap_status" "text", "idempotency_key" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $_$
declare
  v_company_slug text := lower(btrim(coalesce(p_company_slug, '')));
  v_company_name text := btrim(coalesce(p_company_name, ''));
  v_company_type text := lower(btrim(coalesce(p_company_type, 'staff_shop')));
  v_timezone text := btrim(coalesce(p_timezone, 'America/New_York'));
  v_locale text := btrim(coalesce(p_locale, 'en-US'));
  v_owner_email text := lower(btrim(coalesce(p_owner_email, '')));
  v_owner_name text := btrim(coalesce(p_owner_name, ''));
  v_owner_phone text := nullif(btrim(coalesce(p_owner_phone, '')), '');
  v_idempotency_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_company_id uuid;
  v_owner_user_id uuid;
  v_membership_id uuid;
  v_owner_role_assignment_id uuid;
  v_owner_role_id uuid;
  v_active_company_metadata jsonb;
  v_existing_company public.companies%rowtype;
  v_completed_event public.company_audit_events%rowtype;
  v_existing_user_by_auth public.users%rowtype;
  v_existing_user_by_email public.users%rowtype;
  v_active_membership_count integer;
begin
  if v_idempotency_key is null then
    raise exception 'idempotency_key_required' using errcode = '22023';
  end if;

  if v_company_slug = '' or v_company_slug !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'invalid_company_slug' using errcode = '22023';
  end if;

  if v_company_slug = 'falcon_default' then
    raise exception 'reserved_company_slug' using errcode = '22023';
  end if;

  if v_company_name = '' then
    raise exception 'company_name_required' using errcode = '22023';
  end if;

  if p_owner_auth_id is null then
    raise exception 'owner_auth_id_required' using errcode = '22023';
  end if;

  if v_owner_email = '' or v_owner_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_owner_email' using errcode = '22023';
  end if;

  if v_owner_name = '' then
    raise exception 'owner_name_required' using errcode = '22023';
  end if;

  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'metadata_must_be_object' using errcode = '22023';
  end if;

  if not exists (
    select 1
      from public.company_types ct
     where ct.key = v_company_type
       and ct.is_active = true
  ) then
    raise exception 'invalid_company_type' using errcode = '22023';
  end if;

  select *
    into v_completed_event
    from public.company_audit_events cae
   where cae.event_type = 'company.bootstrap.completed'
     and cae.idempotency_key = v_idempotency_key
   order by cae.created_at desc
   limit 1;

  if found then
    select *
      into v_existing_company
      from public.companies c
     where c.id = v_completed_event.company_id;

    if not found then
      raise exception 'bootstrap_partial_state_requires_operator_review'
        using errcode = '55000',
              detail = 'Completed bootstrap audit event references a missing company.';
    end if;

    if v_existing_company.slug <> v_company_slug then
      raise exception 'idempotency_key_company_slug_mismatch' using errcode = '23505';
    end if;

    select u.*
      into v_existing_user_by_auth
      from public.users u
     where u.auth_id = p_owner_auth_id;

    if not found
       or v_existing_user_by_auth.id::text <> coalesce(v_completed_event.metadata ->> 'owner_user_id', '')
       or lower(v_existing_user_by_auth.email) <> v_owner_email then
      raise exception 'idempotency_key_owner_mismatch' using errcode = '23505';
    end if;

    select cm.id
      into v_membership_id
      from public.company_memberships cm
     where cm.company_id = v_existing_company.id
       and cm.user_id = v_existing_user_by_auth.id
       and cm.status = 'active'
     limit 1;

    select ura.id, ura.role_id
      into v_owner_role_assignment_id, v_owner_role_id
      from public.user_role_assignments ura
      join public.roles r
        on r.id = ura.role_id
       and (r.is_owner_role = true or lower(r.name) = 'owner')
     where ura.company_id = v_existing_company.id
       and ura.user_id = v_existing_user_by_auth.id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
     limit 1;

    if v_membership_id is null
       or v_owner_role_assignment_id is null
       or public.company_active_owner_count(v_existing_company.id) <> 1 then
      raise exception 'bootstrap_partial_state_requires_operator_review'
        using errcode = '55000',
              detail = 'Completed bootstrap state no longer has exactly one active owner.';
    end if;

    v_active_company_metadata := jsonb_build_object(
      'company_id', v_existing_company.id,
      'active_company_id', v_existing_company.id,
      'current_company_id', v_existing_company.id
    );

    return query
    select
      v_existing_company.id,
      v_existing_company.slug,
      v_existing_company.name,
      v_existing_company.company_type,
      v_existing_company.status,
      v_existing_user_by_auth.id,
      v_existing_user_by_auth.auth_id,
      lower(v_existing_user_by_auth.email),
      v_membership_id,
      v_owner_role_assignment_id,
      v_owner_role_id,
      v_active_company_metadata,
      'idempotent_replay'::text,
      v_idempotency_key;
    return;
  end if;

  select *
    into v_existing_company
    from public.companies c
   where c.slug = v_company_slug;

  if found then
    if exists (
      select 1
        from public.company_audit_events cae
       where cae.company_id = v_existing_company.id
         and cae.event_type = 'company.bootstrap.completed'
    ) then
      raise exception 'duplicate_company_slug' using errcode = '23505';
    end if;

    raise exception 'bootstrap_partial_state_requires_operator_review'
      using errcode = '55000',
            detail = 'Company slug exists without a matching completed bootstrap audit event.';
  end if;

  select r.id
    into v_owner_role_id
    from public.roles r
   where r.company_id is null
     and lower(r.name) = 'owner'
     and r.is_owner_role = true
   order by r.created_at asc
   limit 1;

  if v_owner_role_id is null then
    raise exception 'owner_template_role_missing' using errcode = '55000';
  end if;

  insert into public.company_audit_events (
    actor_kind,
    event_type,
    target_type,
    metadata,
    idempotency_key
  ) values (
    'service_role',
    'company.bootstrap.started',
    'bootstrap',
    jsonb_build_object(
      'company_slug', v_company_slug,
      'company_type', v_company_type,
      'owner_auth_id', p_owner_auth_id,
      'owner_email', v_owner_email,
      'metadata', v_metadata
    ),
    v_idempotency_key
  );

  insert into public.companies (
    slug,
    name,
    status,
    timezone,
    locale,
    settings,
    company_type,
    operating_mode_settings
  ) values (
    v_company_slug,
    v_company_name,
    'active',
    v_timezone,
    v_locale,
    '{}'::jsonb,
    v_company_type,
    '{}'::jsonb
  )
  returning id into v_company_id;

  insert into public.company_audit_events (
    company_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  ) values (
    v_company_id,
    'service_role',
    'company.created',
    'company',
    v_company_id,
    jsonb_build_object(
      'company_slug', v_company_slug,
      'company_name', v_company_name,
      'company_type', v_company_type,
      'timezone', v_timezone,
      'locale', v_locale
    ),
    v_idempotency_key
  );

  select u.*
    into v_existing_user_by_auth
    from public.users u
   where u.auth_id = p_owner_auth_id;

  if found then
    if lower(v_existing_user_by_auth.email) <> v_owner_email then
      raise exception 'owner_auth_id_email_mismatch' using errcode = '23505';
    end if;

    update public.users u
       set name = case when btrim(coalesce(u.name, '')) = '' then v_owner_name else u.name end,
           display_name = coalesce(nullif(btrim(u.display_name), ''), v_owner_name),
           full_name = coalesce(nullif(btrim(u.full_name), ''), v_owner_name),
           phone = coalesce(nullif(btrim(u.phone), ''), v_owner_phone),
           status = coalesce(nullif(btrim(u.status), ''), 'active'),
           is_active = true,
           updated_at = now()
     where u.id = v_existing_user_by_auth.id
     returning u.id into v_owner_user_id;
  else
    select u.*
      into v_existing_user_by_email
      from public.users u
     where lower(u.email) = v_owner_email;

    if found then
      if v_existing_user_by_email.auth_id is not null
         and v_existing_user_by_email.auth_id <> p_owner_auth_id then
        raise exception 'owner_email_already_linked_to_different_auth_user'
          using errcode = '23505';
      end if;

      update public.users u
         set auth_id = p_owner_auth_id,
             name = case when btrim(coalesce(u.name, '')) = '' then v_owner_name else u.name end,
             display_name = coalesce(nullif(btrim(u.display_name), ''), v_owner_name),
             full_name = coalesce(nullif(btrim(u.full_name), ''), v_owner_name),
             phone = coalesce(nullif(btrim(u.phone), ''), v_owner_phone),
             role = 'owner',
             status = coalesce(nullif(btrim(u.status), ''), 'active'),
             is_active = true,
             is_admin = true,
             updated_at = now()
       where u.id = v_existing_user_by_email.id
       returning u.id into v_owner_user_id;
    else
      insert into public.users (
        name,
        email,
        role,
        display_name,
        full_name,
        phone,
        auth_id,
        status,
        is_active,
        is_admin
      ) values (
        v_owner_name,
        v_owner_email,
        'owner',
        v_owner_name,
        v_owner_name,
        v_owner_phone,
        p_owner_auth_id,
        'active',
        true,
        true
      )
      returning id into v_owner_user_id;
    end if;
  end if;

  insert into public.company_audit_events (
    company_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  ) values (
    v_company_id,
    'service_role',
    'company.owner_user_linked',
    'user',
    v_owner_user_id,
    jsonb_build_object(
      'owner_user_id', v_owner_user_id,
      'owner_auth_id', p_owner_auth_id,
      'owner_email', v_owner_email
    ),
    v_idempotency_key
  );

  insert into public.company_memberships (
    company_id,
    user_id,
    status,
    membership_type,
    is_primary,
    joined_at
  ) values (
    v_company_id,
    v_owner_user_id,
    'active',
    'bootstrap_owner',
    true,
    now()
  )
  returning id into v_membership_id;

  select count(*)::integer
    into v_active_membership_count
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.status = 'active';

  if v_active_membership_count <> 1 then
    raise exception 'bootstrap_partial_state_requires_operator_review'
      using errcode = '55000',
            detail = 'Bootstrap company must have exactly one active membership.';
  end if;

  insert into public.company_audit_events (
    company_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  ) values (
    v_company_id,
    'service_role',
    'company.membership_created',
    'membership',
    v_membership_id,
    jsonb_build_object(
      'membership_id', v_membership_id,
      'owner_user_id', v_owner_user_id,
      'membership_type', 'bootstrap_owner'
    ),
    v_idempotency_key
  );

  insert into public.user_role_assignments (
    company_id,
    user_id,
    role_id,
    status,
    is_primary,
    assigned_by,
    assigned_at,
    expires_at
  ) values (
    v_company_id,
    v_owner_user_id,
    v_owner_role_id,
    'active',
    true,
    null,
    now(),
    null
  )
  returning id into v_owner_role_assignment_id;

  if public.company_active_owner_count(v_company_id) <> 1
     or not public.user_has_owner_role_in_company(v_owner_user_id, v_company_id) then
    raise exception 'bootstrap_partial_state_requires_operator_review'
      using errcode = '55000',
            detail = 'Bootstrap company must have exactly one active owner.';
  end if;

  insert into public.company_audit_events (
    company_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  ) values (
    v_company_id,
    'service_role',
    'company.owner_role_assigned',
    'role_assignment',
    v_owner_role_assignment_id,
    jsonb_build_object(
      'role_assignment_id', v_owner_role_assignment_id,
      'owner_role_id', v_owner_role_id,
      'owner_user_id', v_owner_user_id
    ),
    v_idempotency_key
  );

  v_active_company_metadata := jsonb_build_object(
    'company_id', v_company_id,
    'active_company_id', v_company_id,
    'current_company_id', v_company_id
  );

  insert into public.company_audit_events (
    company_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  ) values (
    v_company_id,
    'service_role',
    'company.bootstrap.completed',
    'bootstrap',
    v_company_id,
    jsonb_build_object(
      'company_id', v_company_id,
      'company_slug', v_company_slug,
      'owner_user_id', v_owner_user_id,
      'owner_auth_id', p_owner_auth_id,
      'owner_email', v_owner_email,
      'membership_id', v_membership_id,
      'owner_role_assignment_id', v_owner_role_assignment_id,
      'owner_role_id', v_owner_role_id,
      'active_company_metadata', v_active_company_metadata
    ),
    v_idempotency_key
  );

  return query
  select
    v_company_id,
    v_company_slug,
    v_company_name,
    v_company_type,
    'active'::text,
    v_owner_user_id,
    p_owner_auth_id,
    v_owner_email,
    v_membership_id,
    v_owner_role_assignment_id,
    v_owner_role_id,
    v_active_company_metadata,
    'created'::text,
    v_idempotency_key;
end;
$_$;


ALTER FUNCTION "public"."rpc_company_bootstrap"("p_company_slug" "text", "p_company_name" "text", "p_company_type" "text", "p_timezone" "text", "p_locale" "text", "p_owner_auth_id" "uuid", "p_owner_email" "text", "p_owner_name" "text", "p_owner_phone" "text", "p_idempotency_key" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_bootstrap"("p_company_slug" "text", "p_company_name" "text", "p_company_type" "text", "p_timezone" "text", "p_locale" "text", "p_owner_auth_id" "uuid", "p_owner_email" "text", "p_owner_name" "text", "p_owner_phone" "text", "p_idempotency_key" "text", "p_metadata" "jsonb") IS 'Service-role/operator-only company bootstrap. Creates one company, one first-owner app user mapping, one active membership, one owner role assignment, and company audit events. Does not create operational visibility.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_bootstrap_v1"("p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $_$
declare
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_company jsonb := coalesce(p_payload -> 'company', '{}'::jsonb);
  v_owner jsonb := coalesce(p_payload -> 'owner', '{}'::jsonb);
  v_source jsonb := coalesce(p_payload -> 'source', '{}'::jsonb);
  v_metadata jsonb := coalesce(p_payload -> 'metadata', '{}'::jsonb);
  v_product_intent jsonb := coalesce(p_payload -> 'product_intent', '{}'::jsonb);
  v_branding_seed jsonb := coalesce(p_payload -> 'branding_seed', '{}'::jsonb);
  v_settings_seed jsonb := coalesce(p_payload -> 'settings_seed', '{}'::jsonb);

  v_request_id text;
  v_idempotency_key text;
  v_dry_run boolean := false;

  v_company_slug text;
  v_company_name text;
  v_company_legal_name text;
  v_company_type text;
  v_timezone text;
  v_locale text;

  v_owner_auth_id uuid;
  v_owner_auth_id_raw text;
  v_owner_email text;
  v_owner_name text;
  v_owner_phone text;

  v_existing_completed public.company_audit_events%rowtype;
  v_existing_company public.companies%rowtype;
  v_owner_role_id uuid;
  v_bootstrap_result record;
  v_audit_event_ids jsonb := '[]'::jsonb;
  v_audit_event_count integer := 0;
  v_created jsonb := '[]'::jsonb;
  v_updated jsonb := '[]'::jsonb;
  v_skipped jsonb;
  v_warnings jsonb;
  v_readiness_summary jsonb;
  v_readiness_checks jsonb;
  v_blocking_items jsonb := '[]'::jsonb;
  v_critical_count integer := 0;
  v_warning_count integer := 1;
  v_deferred_count integer := 1;
  v_unknown_count integer := 4;
  v_optional_count integer := 0;
  v_result_status text;
  v_generated_at timestamptz := now();
  v_primitive_metadata jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'payload_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_company) <> 'object' then
    raise exception 'company_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_owner) <> 'object' then
    raise exception 'owner_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_source) <> 'object' then
    raise exception 'source_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'metadata_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_product_intent) <> 'object' then
    raise exception 'product_intent_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_branding_seed) <> 'object' then
    raise exception 'branding_seed_must_be_object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_settings_seed) <> 'object' then
    raise exception 'settings_seed_must_be_object'
      using errcode = '22023';
  end if;

  if v_payload ? 'dry_run' then
    if jsonb_typeof(v_payload -> 'dry_run') <> 'boolean' then
      raise exception 'dry_run_must_be_boolean'
        using errcode = '22023';
    end if;

    v_dry_run := (v_payload ->> 'dry_run')::boolean;
  end if;

  v_request_id := nullif(btrim(coalesce(
    v_payload ->> 'request_id',
    v_payload ->> 'requestId'
  )), '');

  v_idempotency_key := nullif(btrim(coalesce(
    v_payload ->> 'idempotency_key',
    v_payload ->> 'idempotencyKey',
    v_request_id
  )), '');

  if v_request_id is not null
     and v_idempotency_key is not null
     and v_request_id <> v_idempotency_key then
    raise exception 'request_id_idempotency_key_mismatch'
      using errcode = '22023';
  end if;

  if v_idempotency_key is null then
    raise exception 'idempotency_key_required'
      using errcode = '22023';
  end if;

  v_company_name := btrim(coalesce(
    v_company ->> 'display_name',
    v_company ->> 'name',
    v_payload ->> 'company_display_name',
    v_payload ->> 'company_name'
  ));

  if v_company_name = '' then
    raise exception 'company_name_required'
      using errcode = '22023';
  end if;

  v_company_legal_name := nullif(btrim(coalesce(
    v_company ->> 'legal_name',
    v_payload ->> 'company_legal_name'
  )), '');

  v_company_slug := lower(btrim(coalesce(
    v_company ->> 'slug',
    v_payload ->> 'company_slug',
    v_payload ->> 'slug',
    regexp_replace(regexp_replace(v_company_name, '[^A-Za-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')
  )));

  if v_company_slug = '' or v_company_slug !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'invalid_company_slug'
      using errcode = '22023';
  end if;

  if v_company_slug = 'falcon_default' then
    raise exception 'reserved_company_slug'
      using errcode = '22023';
  end if;

  v_company_type := lower(btrim(coalesce(
    v_company ->> 'company_type',
    v_company ->> 'type',
    v_payload ->> 'company_type',
    'staff_shop'
  )));

  v_timezone := btrim(coalesce(
    v_company ->> 'timezone',
    v_payload ->> 'timezone',
    'America/New_York'
  ));

  v_locale := btrim(coalesce(
    v_company ->> 'locale',
    v_payload ->> 'locale',
    'en-US'
  ));

  if v_timezone = '' then
    raise exception 'timezone_required'
      using errcode = '22023';
  end if;

  if v_locale = '' then
    raise exception 'locale_required'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
      from public.company_types ct
     where ct.key = v_company_type
       and ct.is_active = true
  ) then
    raise exception 'invalid_company_type'
      using errcode = '22023';
  end if;

  v_owner_auth_id_raw := nullif(btrim(coalesce(
    v_owner ->> 'auth_user_id',
    v_owner ->> 'auth_id',
    v_payload ->> 'owner_auth_id',
    v_payload ->> 'owner_auth_user_id'
  )), '');

  if v_owner_auth_id_raw is null then
    raise exception 'owner_auth_id_required'
      using errcode = '22023';
  end if;

  if v_owner_auth_id_raw !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'invalid_owner_auth_id'
      using errcode = '22023';
  end if;

  v_owner_auth_id := v_owner_auth_id_raw::uuid;

  v_owner_email := lower(btrim(coalesce(
    v_owner ->> 'email',
    v_payload ->> 'owner_email'
  )));

  if v_owner_email = '' or v_owner_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_owner_email'
      using errcode = '22023';
  end if;

  v_owner_name := btrim(coalesce(
    v_owner ->> 'display_name',
    v_owner ->> 'name',
    v_payload ->> 'owner_display_name',
    v_payload ->> 'owner_name'
  ));

  if v_owner_name = '' then
    raise exception 'owner_name_required'
      using errcode = '22023';
  end if;

  v_owner_phone := nullif(btrim(coalesce(
    v_owner ->> 'phone',
    v_payload ->> 'owner_phone'
  )), '');

  select r.id
    into v_owner_role_id
    from public.roles r
   where r.company_id is null
     and lower(r.name) = 'owner'
     and r.is_owner_role = true
   order by r.created_at asc
   limit 1;

  if v_owner_role_id is null then
    raise exception 'owner_template_role_missing'
      using errcode = '55000';
  end if;

  select *
    into v_existing_completed
    from public.company_audit_events cae
   where cae.event_type = 'company.bootstrap.completed'
     and cae.idempotency_key = v_idempotency_key
   order by cae.created_at desc
   limit 1;

  if found then
    select *
      into v_existing_company
      from public.companies c
     where c.id = v_existing_completed.company_id;

    if not found then
      raise exception 'bootstrap_partial_state_requires_operator_review'
        using errcode = '55000',
              detail = 'Completed bootstrap audit event references a missing company.';
    end if;

    if v_existing_company.slug <> v_company_slug then
      raise exception 'idempotency_key_company_slug_mismatch'
        using errcode = '23505';
    end if;

    if coalesce(v_existing_completed.metadata ->> 'owner_auth_id', '') <> v_owner_auth_id::text
       or lower(coalesce(v_existing_completed.metadata ->> 'owner_email', '')) <> v_owner_email then
      raise exception 'idempotency_key_owner_mismatch'
        using errcode = '23505';
    end if;
  end if;

  select *
    into v_existing_company
    from public.companies c
   where c.slug = v_company_slug;

  if found
     and v_existing_completed.id is null then
    if exists (
      select 1
        from public.company_audit_events cae
       where cae.company_id = v_existing_company.id
         and cae.event_type = 'company.bootstrap.completed'
    ) then
      raise exception 'duplicate_company_slug'
        using errcode = '23505';
    end if;

    raise exception 'bootstrap_partial_state_requires_operator_review'
      using errcode = '55000',
            detail = 'Company slug exists without a matching completed bootstrap audit event.';
  end if;

  v_skipped := jsonb_build_array(
    'order_numbering_defaults',
    'notification_defaults',
    'onboarding_persistence',
    'module_package_state',
    'vendor_client_activation',
    'owner_setup_ui_wiring',
    'dashboard_prompts',
    'live_setup_context_integration'
  );

  v_warnings := jsonb_build_array(
    jsonb_build_object(
      'code', 'order_numbering_defaults_skipped',
      'severity', 'unknown',
      'message', 'Company-safe order-numbering defaults are not implemented in this wrapper.'
    ),
    jsonb_build_object(
      'code', 'notification_defaults_skipped',
      'severity', 'unknown',
      'message', 'Company-specific notification defaults are not implemented in this wrapper.'
    ),
    jsonb_build_object(
      'code', 'onboarding_persistence_not_configured',
      'severity', 'unknown',
      'message', 'Durable onboarding persistence is intentionally deferred.'
    ),
    jsonb_build_object(
      'code', 'module_package_state_not_persisted',
      'severity', 'unknown',
      'message', 'Product-mode and module intent are metadata only and do not authorize access.'
    ),
    jsonb_build_object(
      'code', 'vendor_client_activation_not_supported',
      'severity', 'deferred',
      'message', 'Vendor and Client live shells are not activated by bootstrap.'
    ),
    jsonb_build_object(
      'code', 'active_company_refresh_required',
      'severity', 'warning',
      'message', 'A caller-owned Edge/server flow must refresh active-company session metadata when needed.'
    )
  );

  if v_dry_run then
    v_readiness_checks := jsonb_build_array(
      jsonb_build_object(
        'key', 'input_validation',
        'label', 'Required bootstrap inputs',
        'severity', 'optional',
        'ready', true,
        'status', 'valid',
        'source', 'wrapper_validation'
      ),
      jsonb_build_object(
        'key', 'owner_template_role',
        'label', 'Owner template role',
        'severity', 'optional',
        'ready', true,
        'status', 'valid',
        'source', 'roles'
      ),
      jsonb_build_object(
        'key', 'records_created',
        'label', 'Bootstrap records created',
        'severity', 'optional',
        'ready', false,
        'status', 'not_run',
        'source', 'dry_run'
      ),
      jsonb_build_object(
        'key', 'setup_context',
        'label', 'Authenticated setup context',
        'severity', 'unknown',
        'ready', null,
        'status', 'not_evaluated',
        'source', 'intentionally_avoided'
      )
    );

    v_readiness_summary := jsonb_build_object(
      'status', 'dry_run_valid',
      'diagnostic_only', true,
      'setup_context_used', false,
      'setup_context_reason', 'rpc_company_setup_context requires an authenticated current-company user/session; dry-run creates no company context.',
      'severity_counts', jsonb_build_object(
        'critical', 0,
        'warning', v_warning_count,
        'optional', 3,
        'deferred', v_deferred_count,
        'unknown', v_unknown_count + 1
      ),
      'checklist_items', v_readiness_checks,
      'blocking_items', '[]'::jsonb,
      'warnings', v_warnings,
      'unknowns', jsonb_build_array(
        'order_numbering',
        'notification_defaults',
        'onboarding_persistence',
        'module_package_state',
        'setup_context'
      ),
      'next_recommended_action', 'run_bootstrap_non_dry_run_through_service_role_operator_boundary'
    );

    return jsonb_strip_nulls(jsonb_build_object(
      'status', 'dry_run_valid',
      'company_id', null,
      'company_slug', v_company_slug,
      'company_name', v_company_name,
      'company_type', v_company_type,
      'owner_user_id', null,
      'owner_auth_id', v_owner_auth_id,
      'owner_membership_id', null,
      'owner_role_assignment_id', null,
      'owner_role_id', v_owner_role_id,
      'active_company_context', null,
      'readiness_summary', v_readiness_summary,
      'created', '[]'::jsonb,
      'updated', '[]'::jsonb,
      'skipped', v_skipped,
      'warnings', v_warnings,
      'audit_event_ids', '[]'::jsonb,
      'idempotency_key', v_idempotency_key,
      'generated_at', v_generated_at,
      'source', jsonb_build_object(
        'name', 'rpc_company_bootstrap_v1',
        'version', '1',
        'mode', 'dry_run',
        'post_validation', 'sql_local',
        'request_source', v_source
      )
    ));
  end if;

  v_primitive_metadata := v_metadata || jsonb_strip_nulls(jsonb_build_object(
    'wrapper', 'rpc_company_bootstrap_v1',
    'wrapper_version', '1',
    'request_id', coalesce(v_request_id, v_idempotency_key),
    'company_legal_name', v_company_legal_name,
    'source', v_source,
    'product_intent', v_product_intent,
    'has_branding_seed', v_branding_seed <> '{}'::jsonb,
    'has_settings_seed', v_settings_seed <> '{}'::jsonb,
    'skipped_domains', v_skipped
  ));

  select *
    into v_bootstrap_result
    from public.rpc_company_bootstrap(
      v_company_slug,
      v_company_name,
      v_company_type,
      v_timezone,
      v_locale,
      v_owner_auth_id,
      v_owner_email,
      v_owner_name,
      v_owner_phone,
      v_idempotency_key,
      v_primitive_metadata
    );

  select
    coalesce(jsonb_agg(cae.id order by cae.created_at), '[]'::jsonb),
    count(*)::integer
    into v_audit_event_ids, v_audit_event_count
    from public.company_audit_events cae
   where cae.company_id = v_bootstrap_result.company_id
     and cae.idempotency_key = v_idempotency_key;

  v_result_status := coalesce(v_bootstrap_result.bootstrap_status, 'created');

  if v_result_status = 'created' then
    v_created := jsonb_build_array(
      'company',
      'owner_user_mapping',
      'owner_membership',
      'owner_role_assignment',
      'bootstrap_audit_events'
    );
  elsif v_result_status = 'idempotent_replay' then
    v_skipped := v_skipped || jsonb_build_array('existing_bootstrap_state_reused');
  end if;

  if v_bootstrap_result.company_id is null then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('company_id_missing');
  end if;

  if v_bootstrap_result.owner_user_id is null then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('owner_user_id_missing');
  end if;

  if v_bootstrap_result.membership_id is null then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('owner_membership_id_missing');
  end if;

  if v_bootstrap_result.owner_role_assignment_id is null then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('owner_role_assignment_id_missing');
  end if;

  if v_result_status not in ('created', 'idempotent_replay') then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('bootstrap_status_not_successful');
  end if;

  if v_audit_event_count < 1 then
    v_critical_count := v_critical_count + 1;
    v_blocking_items := v_blocking_items || jsonb_build_array('bootstrap_audit_events_missing');
  end if;

  v_readiness_checks := jsonb_build_array(
    jsonb_build_object(
      'key', 'company_record',
      'label', 'Company record',
      'severity', 'critical',
      'ready', v_bootstrap_result.company_id is not null,
      'status', case when v_bootstrap_result.company_id is not null then 'ready' else 'blocked' end,
      'source', 'bootstrap_result'
    ),
    jsonb_build_object(
      'key', 'owner_user',
      'label', 'Owner app user mapping',
      'severity', 'critical',
      'ready', v_bootstrap_result.owner_user_id is not null,
      'status', case when v_bootstrap_result.owner_user_id is not null then 'ready' else 'blocked' end,
      'source', 'bootstrap_result'
    ),
    jsonb_build_object(
      'key', 'owner_membership',
      'label', 'Owner membership',
      'severity', 'critical',
      'ready', v_bootstrap_result.membership_id is not null,
      'status', case when v_bootstrap_result.membership_id is not null then 'ready' else 'blocked' end,
      'source', 'bootstrap_result'
    ),
    jsonb_build_object(
      'key', 'owner_role_assignment',
      'label', 'Owner role assignment',
      'severity', 'critical',
      'ready', v_bootstrap_result.owner_role_assignment_id is not null,
      'status', case when v_bootstrap_result.owner_role_assignment_id is not null then 'ready' else 'blocked' end,
      'source', 'bootstrap_result'
    ),
    jsonb_build_object(
      'key', 'bootstrap_status',
      'label', 'Bootstrap status',
      'severity', 'critical',
      'ready', v_result_status in ('created', 'idempotent_replay'),
      'status', v_result_status,
      'source', 'bootstrap_result'
    ),
    jsonb_build_object(
      'key', 'audit_events',
      'label', 'Bootstrap audit events',
      'severity', 'critical',
      'ready', v_audit_event_count > 0,
      'status', case when v_audit_event_count > 0 then 'ready' else 'blocked' end,
      'count', v_audit_event_count,
      'source', 'company_audit_events'
    ),
    jsonb_build_object(
      'key', 'setup_context',
      'label', 'Authenticated setup context',
      'severity', 'unknown',
      'ready', null,
      'status', 'not_evaluated',
      'source', 'intentionally_avoided'
    ),
    jsonb_build_object(
      'key', 'order_numbering',
      'label', 'Order numbering defaults',
      'severity', 'unknown',
      'ready', null,
      'status', 'not_seeded',
      'source', 'intentionally_skipped'
    ),
    jsonb_build_object(
      'key', 'notification_defaults',
      'label', 'Notification defaults',
      'severity', 'unknown',
      'ready', null,
      'status', 'not_seeded',
      'source', 'intentionally_skipped'
    ),
    jsonb_build_object(
      'key', 'vendor_client_activation',
      'label', 'Vendor/Client live surfaces',
      'severity', 'deferred',
      'ready', false,
      'status', 'not_activated',
      'source', 'intentionally_skipped'
    )
  );

  v_readiness_summary := jsonb_build_object(
    'status', case when v_critical_count = 0 then 'ready_for_orders' else 'blocked' end,
    'diagnostic_only', true,
    'setup_context_used', false,
    'setup_context_reason', 'rpc_company_setup_context requires an authenticated current-company user/session; service-role bootstrap does not mutate session context.',
    'severity_counts', jsonb_build_object(
      'critical', v_critical_count,
      'warning', v_warning_count,
      'optional', v_optional_count,
      'deferred', v_deferred_count,
      'unknown', v_unknown_count + 1
    ),
    'checklist_items', v_readiness_checks,
    'blocking_items', v_blocking_items,
    'warnings', v_warnings,
    'unknowns', jsonb_build_array(
      'order_numbering',
      'notification_defaults',
      'onboarding_persistence',
      'module_package_state',
      'setup_context'
    ),
    'next_recommended_action', case
      when v_critical_count = 0 then 'refresh_owner_active_company_context_then_run_authenticated_setup_context'
      else 'operator_review_required'
    end
  );

  return jsonb_strip_nulls(jsonb_build_object(
    'status', v_result_status,
    'company_id', v_bootstrap_result.company_id,
    'company_slug', v_bootstrap_result.company_slug,
    'company_name', v_bootstrap_result.company_name,
    'company_type', v_bootstrap_result.company_type,
    'company_status', v_bootstrap_result.company_status,
    'owner_user_id', v_bootstrap_result.owner_user_id,
    'owner_auth_id', v_bootstrap_result.owner_auth_id,
    'owner_email', v_bootstrap_result.owner_email,
    'owner_membership_id', v_bootstrap_result.membership_id,
    'owner_role_assignment_id', v_bootstrap_result.owner_role_assignment_id,
    'owner_role_id', v_bootstrap_result.owner_role_id,
    'active_company_context', v_bootstrap_result.active_company_metadata,
    'readiness_summary', v_readiness_summary,
    'created', v_created,
    'updated', v_updated,
    'skipped', v_skipped,
    'warnings', v_warnings,
    'audit_event_ids', v_audit_event_ids,
    'idempotency_key', v_idempotency_key,
    'generated_at', v_generated_at,
    'source', jsonb_build_object(
      'name', 'rpc_company_bootstrap_v1',
      'version', '1',
      'mode', 'mutation',
      'post_validation', 'sql_local',
      'request_source', v_source
    )
  ));
end;
$_$;


ALTER FUNCTION "public"."rpc_company_bootstrap_v1"("p_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_bootstrap_v1"("p_payload" "jsonb") IS 'Service-role/operator-only JSON wrapper for company bootstrap. Delegates mutation to rpc_company_bootstrap(...), supports dry-run validation, returns SQL-local diagnostic post-bootstrap readiness, is not browser callable, and does not seed order numbering, notification defaults, onboarding persistence, module/package authority, Vendor/Client shells, UI wiring, or runtime access authority.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_access_save"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid" DEFAULT NULL::"uuid", "p_overrides" "jsonb" DEFAULT '[]'::"jsonb", "p_save_permission_overrides" boolean DEFAULT true, "p_reason" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text") RETURNS TABLE("user_id" "uuid", "membership_id" "uuid", "role_changed" boolean, "permission_overrides_changed" boolean, "active_owner_count" integer, "role_assignments" "jsonb", "permission_overrides" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_role_result record;
  v_override_result record;
  v_permission_overrides_changed boolean := false;
  v_permission_overrides jsonb := '[]'::jsonb;
begin
  select *
    into v_role_result
    from public.rpc_company_member_role_update(
      p_user_id,
      p_role_ids,
      p_primary_role_id,
      p_reason,
      p_request_id
    );

  if p_save_permission_overrides then
    select *
      into v_override_result
      from public.rpc_company_member_permission_overrides_save(
        p_user_id,
        coalesce(p_overrides, '[]'::jsonb),
        p_reason,
        case
          when nullif(p_request_id, '') is null then null
          else p_request_id || ':permission-overrides'
        end
      );
    v_permission_overrides_changed := coalesce(v_override_result.changed, false);
    v_permission_overrides := coalesce(v_override_result.overrides, '[]'::jsonb);
  else
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'permission_key', cmpo.permission_key,
          'effect', cmpo.effect
        )
        order by cmpo.permission_key
      ),
      '[]'::jsonb
    )
      into v_permission_overrides
      from public.company_member_permission_overrides cmpo
     where cmpo.membership_id = v_role_result.membership_id
       and cmpo.user_id = p_user_id;
  end if;

  user_id := p_user_id;
  membership_id := v_role_result.membership_id;
  role_changed := coalesce(v_role_result.changed, false);
  permission_overrides_changed := v_permission_overrides_changed;
  active_owner_count := v_role_result.active_owner_count;
  role_assignments := coalesce(v_role_result.role_assignments, '[]'::jsonb);
  permission_overrides := coalesce(v_permission_overrides, '[]'::jsonb);
  return next;
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_access_save"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_overrides" "jsonb", "p_save_permission_overrides" boolean, "p_reason" "text", "p_request_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_access_save"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_overrides" "jsonb", "p_save_permission_overrides" boolean, "p_reason" "text", "p_request_id" "text") IS 'Atomically saves one current-company member access edit by wrapping role preset persistence and explicit V1-safe permission override persistence in one transaction. Existing role and override RPC validation and audit behavior are preserved.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_invitation_cancel"("p_invitation_id" "uuid", "p_reason" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text") RETURNS TABLE("invitation_id" "uuid", "invitation_status" "text", "cancelled_at" timestamp with time zone, "changed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_invitation public.company_member_invitations%rowtype;
  v_has_owner_role boolean;
  v_cancelled_at timestamptz;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.invite') then
    raise exception 'invite_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.manage_company_access') then
    raise exception 'users_manage_company_access_required'
      using errcode = '42501';
  end if;

  select *
    into v_invitation
    from public.company_member_invitations cmi
   where cmi.id = p_invitation_id
     and cmi.company_id = v_company_id
   for update;

  if v_invitation.id is null then
    raise exception 'invitation_not_found'
      using errcode = '22023';
  end if;

  if v_invitation.status = 'cancelled' then
    return query
    select
      v_invitation.id,
      v_invitation.status,
      v_invitation.cancelled_at,
      false;
    return;
  end if;

  if v_invitation.status in ('accepted', 'expired') then
    raise exception 'invitation_not_cancelable'
      using errcode = '22023';
  end if;

  if v_invitation.status not in ('prepared', 'sent', 'auth_failed') then
    raise exception 'invitation_not_cancelable'
      using errcode = '22023';
  end if;

  select coalesce(bool_or(r.is_owner_role = true or lower(r.name) = 'owner'), false)
    into v_has_owner_role
    from unnest(v_invitation.role_ids) requested(role_id)
    join public.roles r
      on r.id = requested.role_id;

  if v_has_owner_role
     and not public.current_app_user_has_permission('users.grant_owner') then
    raise exception 'owner_grant_permission_required'
      using errcode = '42501';
  end if;

  update public.company_member_invitations cmi
     set status = 'cancelled',
         cancelled_at = coalesce(cmi.cancelled_at, now()),
         metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'cancel_reason', nullif(p_reason, ''),
           'cancel_request_id', nullif(p_request_id, ''),
           'cancelled_by_user_id', v_actor_user_id
         ))
   where cmi.id = v_invitation.id
   returning cmi.cancelled_at into v_cancelled_at;

  update public.user_role_assignments ura
     set status = 'inactive',
         is_primary = false,
         expires_at = coalesce(ura.expires_at, now()),
         updated_at = now()
   where v_invitation.membership_id is not null
     and ura.company_id = v_invitation.company_id
     and ura.user_id = v_invitation.invited_user_id
     and ura.role_id = any(v_invitation.role_ids)
     and ura.status = 'inactive';

  insert into public.company_audit_events (
    company_id,
    actor_user_id,
    actor_auth_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  )
  values (
    v_company_id,
    v_actor_user_id,
    v_actor_auth_id,
    'service_role',
    'company.member_invite_cancelled',
    'invitation',
    v_invitation.id,
    jsonb_strip_nulls(jsonb_build_object(
      'normalized_email', v_invitation.normalized_email,
      'role_ids', to_jsonb(v_invitation.role_ids),
      'primary_role_id', v_invitation.primary_role_id,
      'reason', nullif(p_reason, ''),
      'request_id', nullif(p_request_id, '')
    )),
    nullif(p_request_id, '')
  );

  return query
  select
    v_invitation.id,
    'cancelled'::text,
    v_cancelled_at,
    true;
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_invitation_cancel"("p_invitation_id" "uuid", "p_reason" "text", "p_request_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_invitation_cancel"("p_invitation_id" "uuid", "p_reason" "text", "p_request_id" "text") IS 'Phase 8C5F1 guarded current-company invitation cancellation RPC. Cancels prepared, sent, or auth-failed invitations only, writes audit, and does not mutate legacy user_roles or active accepted memberships.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_invitation_resend_finalize"("p_invitation_id" "uuid", "p_auth_invite_sent" boolean, "p_auth_error" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text", "p_auth_user_id" "uuid" DEFAULT NULL::"uuid", "p_auth_email" "text" DEFAULT NULL::"text", "p_provider_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("invitation_id" "uuid", "company_id" "uuid", "invite_email" "text", "invitation_status" "text", "invited_user_id" "uuid", "membership_id" "uuid", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
declare
  v_invitation public.company_member_invitations%rowtype;
  v_company_status text;
  v_auth_email text := lower(trim(coalesce(p_auth_email, '')));
  v_auth_error text := left(nullif(trim(coalesce(p_auth_error, '')), ''), 500);
  v_user_id uuid;
  v_membership_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required'
      using errcode = '42501';
  end if;

  select *
    into v_invitation
    from public.company_member_invitations cmi
   where cmi.id = p_invitation_id
   for update;

  if v_invitation.id is null then
    raise exception 'invitation_not_found'
      using errcode = '22023';
  end if;

  if v_invitation.status <> 'prepared' then
    raise exception 'invitation_not_prepared'
      using errcode = '22023';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_invitation.company_id;

  if v_company_status is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if v_invitation.expires_at <= now() then
    update public.company_member_invitations cmi
       set status = 'expired',
           finalized_at = now(),
           updated_at = now()
     where cmi.id = v_invitation.id;

    raise exception 'invitation_expired'
      using errcode = '22023';
  end if;

  if not coalesce(p_auth_invite_sent, false)
     or v_auth_error is not null then
    update public.company_member_invitations cmi
       set status = 'auth_failed',
           auth_error_code = 'auth_invite_failed',
           auth_error_message = v_auth_error,
           finalized_at = now(),
           metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
             'resend_auth_invite_sent', coalesce(p_auth_invite_sent, false),
             'resend_auth_error', v_auth_error,
             'provider_metadata', coalesce(p_provider_metadata, '{}'::jsonb),
             'resend_finalize_request_id', nullif(p_request_id, '')
           ))
     where cmi.id = v_invitation.id;

    insert into public.company_audit_events (
      company_id,
      actor_user_id,
      actor_auth_id,
      actor_kind,
      event_type,
      target_type,
      target_id,
      metadata,
      idempotency_key
    )
    values (
      v_invitation.company_id,
      v_invitation.invited_by_user_id,
      p_auth_user_id,
      'service_role',
      'company.member_invite_resent_auth_failed',
      'invitation',
      v_invitation.id,
      jsonb_strip_nulls(jsonb_build_object(
        'normalized_email', v_invitation.normalized_email,
        'auth_error', v_auth_error,
        'request_id', nullif(p_request_id, '')
      )),
      coalesce(nullif(p_request_id, ''), v_invitation.request_id)
    );

    return query
    select
      v_invitation.id,
      v_invitation.company_id,
      v_invitation.normalized_email,
      'auth_failed'::text,
      null::uuid,
      null::uuid,
      v_invitation.expires_at;
    return;
  end if;

  if p_auth_user_id is null then
    raise exception 'auth_user_required'
      using errcode = '22023';
  end if;

  if v_auth_email <> ''
     and v_auth_email <> v_invitation.normalized_email then
    raise exception 'auth_email_mismatch'
      using errcode = '22023';
  end if;

  select u.id
    into v_user_id
    from public.users u
   where u.auth_id = p_auth_user_id
   limit 1;

  if v_user_id is null then
    select u.id
      into v_user_id
      from public.users u
     where lower(u.email) = v_invitation.normalized_email
     order by u.auth_id is null, u.created_at
     limit 1;
  end if;

  if v_user_id is null then
    insert into public.users (
      name,
      email,
      auth_id,
      status,
      is_active,
      created_at,
      updated_at
    )
    values (
      split_part(v_invitation.normalized_email, '@', 1),
      v_invitation.normalized_email,
      p_auth_user_id,
      'active',
      true,
      now(),
      now()
    )
    returning id into v_user_id;
  else
    update public.users u
       set auth_id = coalesce(u.auth_id, p_auth_user_id),
           updated_at = now()
     where u.id = v_user_id
       and u.auth_id is null;
  end if;

  if exists (
    select 1
      from public.company_memberships cm
     where cm.company_id = v_invitation.company_id
       and cm.user_id = v_user_id
       and cm.status = 'active'
  ) then
    raise exception 'member_already_active'
      using errcode = '23505';
  end if;

  insert into public.company_memberships (
    company_id,
    user_id,
    status,
    membership_type,
    is_primary,
    invited_by,
    joined_at,
    created_at,
    updated_at
  )
  values (
    v_invitation.company_id,
    v_user_id,
    'invited',
    'invited',
    false,
    v_invitation.invited_by_user_id,
    null,
    now(),
    now()
  )
  on conflict (company_id, user_id) do update
    set status = 'invited',
        membership_type = 'invited',
        invited_by = excluded.invited_by,
        updated_at = now()
    where public.company_memberships.status <> 'active'
  returning id into v_membership_id;

  if v_membership_id is null then
    raise exception 'member_already_active'
      using errcode = '23505';
  end if;

  insert into public.user_role_assignments (
    company_id,
    user_id,
    role_id,
    status,
    is_primary,
    assigned_by,
    assigned_at,
    expires_at,
    created_at,
    updated_at
  )
  select
    v_invitation.company_id,
    v_user_id,
    requested.role_id,
    'inactive',
    requested.role_id = v_invitation.primary_role_id,
    v_invitation.invited_by_user_id,
    now(),
    null,
    now(),
    now()
  from unnest(v_invitation.role_ids) requested(role_id)
  on conflict (company_id, user_id, role_id) do update
    set status = 'inactive',
        is_primary = excluded.is_primary,
        assigned_by = excluded.assigned_by,
        assigned_at = excluded.assigned_at,
        expires_at = null,
        updated_at = now();

  update public.user_role_assignments ura
     set is_primary = false,
         updated_at = now()
   where ura.company_id = v_invitation.company_id
     and ura.user_id = v_user_id
     and not (ura.role_id = any(v_invitation.role_ids))
     and ura.is_primary = true;

  update public.company_member_invitations cmi
     set status = 'sent',
         invited_auth_id = p_auth_user_id,
         invited_user_id = v_user_id,
         membership_id = v_membership_id,
         finalized_at = now(),
         auth_invite_sent_at = now(),
         auth_error_code = null,
         auth_error_message = null,
         metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'resend_auth_invite_sent', true,
           'provider_metadata', coalesce(p_provider_metadata, '{}'::jsonb),
           'resend_finalize_request_id', nullif(p_request_id, '')
         ))
   where cmi.id = v_invitation.id;

  insert into public.company_audit_events (
    company_id,
    actor_user_id,
    actor_auth_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  )
  values (
    v_invitation.company_id,
    v_invitation.invited_by_user_id,
    p_auth_user_id,
    'service_role',
    'company.member_invite_resent_sent',
    'invitation',
    v_invitation.id,
      jsonb_strip_nulls(jsonb_build_object(
        'normalized_email', v_invitation.normalized_email,
        'target_user_id', v_user_id,
        'role_ids', to_jsonb(v_invitation.role_ids),
        'primary_role_id', v_invitation.primary_role_id,
        'request_id', nullif(p_request_id, '')
      )),
    coalesce(nullif(p_request_id, ''), v_invitation.request_id)
  );

  return query
  select
    v_invitation.id,
    v_invitation.company_id,
    v_invitation.normalized_email,
    'sent'::text,
    v_user_id,
    v_membership_id,
    v_invitation.expires_at;
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_invitation_resend_finalize"("p_invitation_id" "uuid", "p_auth_invite_sent" boolean, "p_auth_error" "text", "p_request_id" "text", "p_auth_user_id" "uuid", "p_auth_email" "text", "p_provider_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_invitation_resend_finalize"("p_invitation_id" "uuid", "p_auth_invite_sent" boolean, "p_auth_error" "text", "p_request_id" "text", "p_auth_user_id" "uuid", "p_auth_email" "text", "p_provider_metadata" "jsonb") IS 'Phase 8C5F2 service-role-only resend finalize RPC. Records the fresh Auth Admin resend result, stages invited membership and inactive preset role assignments when needed, and never returns provider tokens or links.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_invitation_resend_prepare"("p_invitation_id" "uuid", "p_expires_in" interval DEFAULT '7 days'::interval, "p_reason" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text") RETURNS TABLE("invitation_id" "uuid", "prior_invitation_id" "uuid", "company_id" "uuid", "company_slug" "text", "company_name" "text", "invite_email" "text", "invitation_status" "text", "expires_at" timestamp with time zone, "role_assignments" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_company_slug text;
  v_company_name text;
  v_company_status text;
  v_original public.company_member_invitations%rowtype;
  v_new_invitation_id uuid;
  v_expires_at timestamptz;
  v_role_count integer;
  v_valid_role_count integer;
  v_role_snapshot jsonb;
  v_has_owner_role boolean;
  v_reuse_membership_id uuid;
  v_reuse_membership_status text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.invite') then
    raise exception 'invite_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.manage_company_access') then
    raise exception 'users_manage_company_access_required'
      using errcode = '42501';
  end if;

  select c.slug, c.name, c.status
    into v_company_slug, v_company_name, v_company_status
    from public.companies c
   where c.id = v_company_id;

  if v_company_status is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  select *
    into v_original
    from public.company_member_invitations cmi
   where cmi.id = p_invitation_id
     and cmi.company_id = v_company_id
   for update;

  if v_original.id is null then
    raise exception 'invitation_not_found'
      using errcode = '22023';
  end if;

  if v_original.status = 'accepted' then
    raise exception 'invitation_not_resendable'
      using errcode = '22023';
  end if;

  if v_original.status not in ('prepared', 'sent', 'expired', 'cancelled', 'auth_failed') then
    raise exception 'invitation_not_resendable'
      using errcode = '22023';
  end if;

  select count(*)
    into v_role_count
    from unnest(v_original.role_ids) requested(role_id);

  select
    count(*),
    coalesce(bool_or(r.is_owner_role = true or lower(r.name) = 'owner'), false),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'role_id', r.id,
          'role_name', r.name,
          'is_owner_role', r.is_owner_role,
          'is_primary', r.id = v_original.primary_role_id,
          'status', 'inactive'
        )
        order by
          case when r.id = v_original.primary_role_id then 0 else 1 end,
          case lower(r.name)
            when 'owner' then 1
            when 'admin' then 2
            when 'reviewer' then 3
            when 'appraiser' then 4
            when 'billing' then 5
            else 99
          end,
          r.name
      ),
      '[]'::jsonb
    )
    into v_valid_role_count, v_has_owner_role, v_role_snapshot
    from public.roles r
   where r.id = any(v_original.role_ids)
     and r.company_id is null
     and r.is_template = true
     and r.is_system = true;

  if coalesce(v_role_count, 0) = 0
     or v_valid_role_count <> v_role_count then
    raise exception 'role_preset_invalid'
      using errcode = '22023';
  end if;

  if v_has_owner_role
     and not public.current_app_user_has_permission('users.grant_owner') then
    raise exception 'owner_grant_permission_required'
      using errcode = '42501';
  end if;

  if v_original.membership_id is not null then
    select cm.id, cm.status
      into v_reuse_membership_id, v_reuse_membership_status
      from public.company_memberships cm
     where cm.id = v_original.membership_id
       and cm.company_id = v_company_id
       and cm.user_id = v_original.invited_user_id
     for update;

    if v_reuse_membership_id is not null
       and v_reuse_membership_status = 'active' then
      raise exception 'member_already_active'
        using errcode = '23505';
    end if;
  end if;

  if v_original.invited_user_id is not null
     and exists (
       select 1
         from public.company_memberships cm
        where cm.company_id = v_company_id
          and cm.user_id = v_original.invited_user_id
          and cm.status = 'active'
     ) then
    raise exception 'member_already_active'
      using errcode = '23505';
  end if;

  if v_original.status in ('prepared', 'sent') then
    update public.company_member_invitations cmi
       set status = 'cancelled',
           cancelled_at = coalesce(cmi.cancelled_at, now()),
           metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
             'replaced_by_resend', true,
             'resend_request_id', nullif(p_request_id, '')
           ))
     where cmi.id = v_original.id;
  end if;

  v_expires_at := now() + greatest(coalesce(p_expires_in, interval '7 days'), interval '1 hour');

  insert into public.company_member_invitations (
    company_id,
    email,
    normalized_email,
    status,
    invited_by_user_id,
    invited_auth_id,
    invited_user_id,
    membership_id,
    role_ids,
    primary_role_id,
    role_snapshot,
    reason,
    request_id,
    expires_at,
    metadata
  )
  values (
    v_company_id,
    v_original.email,
    v_original.normalized_email,
    'prepared',
    v_actor_user_id,
    v_original.invited_auth_id,
    v_original.invited_user_id,
    v_reuse_membership_id,
    v_original.role_ids,
    v_original.primary_role_id,
    v_role_snapshot,
    nullif(p_reason, ''),
    nullif(p_request_id, ''),
    v_expires_at,
    jsonb_strip_nulls(jsonb_build_object(
      'prior_invitation_id', v_original.id,
      'resend_prepared_by_user_id', v_actor_user_id,
      'reused_membership_id', v_reuse_membership_id
    ))
  )
  returning id into v_new_invitation_id;

  if v_reuse_membership_id is not null
     and v_original.invited_user_id is not null then
    update public.company_memberships cm
       set status = case
             when cm.status = 'active' then cm.status
             else 'invited'
           end,
           membership_type = coalesce(nullif(cm.membership_type, ''), 'invited'),
           invited_by = v_actor_user_id,
           updated_at = now()
     where cm.id = v_reuse_membership_id
       and cm.status <> 'active';

    insert into public.user_role_assignments (
      company_id,
      user_id,
      role_id,
      status,
      is_primary,
      assigned_by,
      assigned_at,
      expires_at,
      created_at,
      updated_at
    )
    select
      v_company_id,
      v_original.invited_user_id,
      requested.role_id,
      'inactive',
      requested.role_id = v_original.primary_role_id,
      v_actor_user_id,
      now(),
      null,
      now(),
      now()
    from unnest(v_original.role_ids) requested(role_id)
    on conflict (company_id, user_id, role_id) do update
      set status = 'inactive',
          is_primary = excluded.is_primary,
          assigned_by = excluded.assigned_by,
          assigned_at = excluded.assigned_at,
          expires_at = null,
          updated_at = now();

    update public.user_role_assignments ura
       set is_primary = false,
           updated_at = now()
     where ura.company_id = v_company_id
       and ura.user_id = v_original.invited_user_id
       and not (ura.role_id = any(v_original.role_ids))
       and ura.is_primary = true;
  end if;

  if v_original.status in ('prepared', 'sent') then
    update public.company_member_invitations cmi
       set metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_build_object(
             'replaced_by_invitation_id', v_new_invitation_id
           )
     where cmi.id = v_original.id;
  end if;

  insert into public.company_audit_events (
    company_id,
    actor_user_id,
    actor_auth_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  )
  values (
    v_company_id,
    v_actor_user_id,
    v_actor_auth_id,
    'service_role',
    'company.member_invite_resent_prepared',
    'invitation',
    v_new_invitation_id,
    jsonb_strip_nulls(jsonb_build_object(
      'prior_invitation_id', v_original.id,
      'normalized_email', v_original.normalized_email,
      'role_ids', to_jsonb(v_original.role_ids),
      'primary_role_id', v_original.primary_role_id,
      'reason', nullif(p_reason, ''),
      'request_id', nullif(p_request_id, '')
    )),
    nullif(p_request_id, '')
  );

  return query
  select
    v_new_invitation_id,
    v_original.id,
    v_company_id,
    v_company_slug,
    v_company_name,
    v_original.normalized_email,
    'prepared'::text,
    v_expires_at,
    v_role_snapshot;
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_invitation_resend_prepare"("p_invitation_id" "uuid", "p_expires_in" interval, "p_reason" "text", "p_request_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_invitation_resend_prepare"("p_invitation_id" "uuid", "p_expires_in" interval, "p_reason" "text", "p_request_id" "text") IS 'Phase 8C5F2 authenticated resend prepare RPC. Revalidates current-company invite authority and preset role guardrails, preserves the prior invitation as history, and creates a new prepared invitation row.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_invitations_list"("p_status" "text" DEFAULT 'open'::"text", "p_limit" integer DEFAULT 100) RETURNS TABLE("invitation_id" "uuid", "invite_email" "text", "invitation_status" "text", "role_assignments" "jsonb", "primary_role_id" "uuid", "invited_by_display_name" "text", "created_at" timestamp with time zone, "expires_at" timestamp with time zone, "auth_invite_sent_at" timestamp with time zone, "accepted_at" timestamp with time zone, "cancelled_at" timestamp with time zone, "can_cancel" boolean, "can_resend" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_status_filter text := lower(trim(coalesce(p_status, 'open')));
  v_statuses text[];
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 250);
  v_can_manage_invites boolean;
  v_can_grant_owner boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not (
    public.current_app_user_has_permission('users.read')
    or (
      public.current_app_user_has_permission('users.invite')
      and public.current_app_user_has_permission('users.manage_company_access')
    )
  ) then
    raise exception 'company_invitation_read_permission_required'
      using errcode = '42501';
  end if;

  v_can_manage_invites :=
    public.current_app_user_has_permission('users.invite')
    and public.current_app_user_has_permission('users.manage_company_access');
  v_can_grant_owner := public.current_app_user_has_permission('users.grant_owner');

  v_statuses := case
    when v_status_filter = 'open' then array['prepared', 'sent', 'auth_failed']::text[]
    when v_status_filter = 'terminal' then array['accepted', 'cancelled', 'expired']::text[]
    when v_status_filter = 'all' then array['prepared', 'sent', 'auth_failed', 'accepted', 'cancelled', 'expired']::text[]
    when v_status_filter in ('prepared', 'sent', 'accepted', 'cancelled', 'expired', 'auth_failed') then array[v_status_filter]::text[]
    else null
  end;

  if v_statuses is null then
    raise exception 'invalid_invitation_status_filter'
      using errcode = '22023';
  end if;

  return query
  select
    cmi.id as invitation_id,
    cmi.normalized_email as invite_email,
    cmi.status as invitation_status,
    coalesce(role_projection.role_assignments, '[]'::jsonb) as role_assignments,
    cmi.primary_role_id,
    coalesce(
      nullif(inviter.display_name, ''),
      nullif(inviter.full_name, ''),
      nullif(inviter.name, ''),
      inviter.email
    ) as invited_by_display_name,
    cmi.created_at,
    cmi.expires_at,
    cmi.auth_invite_sent_at,
    cmi.accepted_at,
    cmi.cancelled_at,
    (
      v_can_manage_invites
      and cmi.status in ('prepared', 'sent', 'auth_failed')
      and (
        not coalesce(role_projection.has_owner_role, false)
        or v_can_grant_owner
      )
    ) as can_cancel,
    (
      v_can_manage_invites
      and cmi.status in ('prepared', 'sent', 'auth_failed', 'cancelled', 'expired')
      and (
        not coalesce(role_projection.has_owner_role, false)
        or v_can_grant_owner
      )
    ) as can_resend
  from public.company_member_invitations cmi
  left join public.users inviter
    on inviter.id = cmi.invited_by_user_id
  left join lateral (
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'role_id', r.id,
            'role_key', trim(both '_' from regexp_replace(lower(trim(r.name)), '[^a-z0-9]+', '_', 'g')),
            'role_name', r.name,
            'display_name', r.name,
            'is_primary', r.id = cmi.primary_role_id
          )
          order by
            case when r.id = cmi.primary_role_id then 0 else 1 end,
            case lower(r.name)
              when 'owner' then 1
              when 'admin' then 2
              when 'reviewer' then 3
              when 'appraiser' then 4
              when 'billing' then 5
              else 99
            end,
            r.name
        ) filter (where r.id is not null),
        '[]'::jsonb
      ) as role_assignments,
      coalesce(bool_or(r.is_owner_role = true or lower(r.name) = 'owner'), false) as has_owner_role
    from unnest(cmi.role_ids) requested(role_id)
    left join public.roles r
      on r.id = requested.role_id
  ) role_projection on true
  where cmi.company_id = v_company_id
    and cmi.status = any(v_statuses)
  order by
    case cmi.status
      when 'sent' then 1
      when 'prepared' then 2
      when 'auth_failed' then 3
      when 'expired' then 4
      when 'cancelled' then 5
      when 'accepted' then 6
      else 99
    end,
    cmi.created_at desc
  limit v_limit;
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_invitations_list"("p_status" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_invitations_list"("p_status" "text", "p_limit" integer) IS 'Phase 8C5F1 safe current-company invitation management projection. Returns invitation lifecycle summaries and safe role labels only; no auth ids, provider tokens, raw permissions, or operational data.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_invite_accept"("p_invitation_id" "uuid", "p_request_id" "text" DEFAULT NULL::"text") RETURNS TABLE("invitation_id" "uuid", "company_id" "uuid", "company_slug" "text", "company_name" "text", "invite_email" "text", "invitation_status" "text", "membership_id" "uuid", "user_id" "uuid", "accepted_at" timestamp with time zone, "active_company_context_valid" boolean, "session_refresh_required" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_auth_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_invitation public.company_member_invitations%rowtype;
  v_company_slug text;
  v_company_name text;
  v_company_status text;
  v_membership public.company_memberships%rowtype;
  v_role_count integer;
  v_valid_role_count integer;
  v_updated_role_count integer;
  v_accepted_at timestamptz := now();
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  select *
    into v_invitation
    from public.company_member_invitations cmi
   where cmi.id = p_invitation_id
   for update;

  if v_invitation.id is null then
    raise exception 'invitation_not_found'
      using errcode = '22023';
  end if;

  if v_invitation.status <> 'sent' then
    raise exception 'invitation_not_sent'
      using errcode = '22023';
  end if;

  if v_invitation.expires_at <= now() then
    update public.company_member_invitations cmi
       set status = 'expired',
           updated_at = now()
     where cmi.id = v_invitation.id;

    raise exception 'invitation_expired'
      using errcode = '22023';
  end if;

  if not (
    v_invitation.invited_auth_id = v_actor_auth_id
    or (
      v_auth_email <> ''
      and v_auth_email = v_invitation.normalized_email
    )
  ) then
    raise exception 'invitation_identity_mismatch'
      using errcode = '42501';
  end if;

  if v_invitation.invited_user_id is not null
     and v_invitation.invited_user_id <> v_actor_user_id then
    raise exception 'invitation_user_mismatch'
      using errcode = '42501';
  end if;

  select c.slug, c.name, c.status
    into v_company_slug, v_company_name, v_company_status
    from public.companies c
   where c.id = v_invitation.company_id;

  if v_company_status is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if v_invitation.membership_id is null then
    raise exception 'invitation_membership_required'
      using errcode = '22023';
  end if;

  select *
    into v_membership
    from public.company_memberships cm
   where cm.id = v_invitation.membership_id
     and cm.company_id = v_invitation.company_id
     and cm.user_id = v_actor_user_id
   for update;

  if v_membership.id is null then
    raise exception 'invitation_membership_mismatch'
      using errcode = '42501';
  end if;

  select count(*)
    into v_role_count
    from unnest(v_invitation.role_ids) requested(role_id);

  select count(*)
    into v_valid_role_count
    from public.roles r
   where r.id = any(v_invitation.role_ids)
     and r.company_id is null
     and r.is_template = true
     and r.is_system = true;

  if coalesce(v_role_count, 0) = 0
     or v_valid_role_count <> v_role_count then
    raise exception 'role_preset_invalid'
      using errcode = '22023';
  end if;

  update public.company_memberships cm
     set status = 'active',
         joined_at = coalesce(cm.joined_at, v_accepted_at),
         updated_at = now()
   where cm.id = v_membership.id;

  update public.user_role_assignments ura
     set status = 'inactive',
         is_primary = false,
         updated_at = now()
   where ura.company_id = v_invitation.company_id
     and ura.user_id = v_actor_user_id
     and not (ura.role_id = any(v_invitation.role_ids))
     and (
       ura.status <> 'inactive'
       or ura.is_primary is distinct from false
     );

  update public.user_role_assignments ura
     set status = 'active',
         expires_at = null,
         is_primary = (ura.role_id = v_invitation.primary_role_id),
         updated_at = now()
   where ura.company_id = v_invitation.company_id
     and ura.user_id = v_actor_user_id
     and ura.role_id = any(v_invitation.role_ids);

  get diagnostics v_updated_role_count = row_count;

  if v_updated_role_count <> v_role_count then
    raise exception 'invitation_role_assignments_missing'
      using errcode = '22023';
  end if;

  update public.company_member_invitations cmi
     set status = 'accepted',
         accepted_at = v_accepted_at,
         invited_user_id = coalesce(cmi.invited_user_id, v_actor_user_id),
         membership_id = v_membership.id,
         metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'accept_request_id', nullif(p_request_id, '')
         )),
         updated_at = now()
   where cmi.id = v_invitation.id;

  insert into public.company_audit_events (
    company_id,
    actor_user_id,
    actor_auth_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  )
  values (
    v_invitation.company_id,
    v_actor_user_id,
    v_actor_auth_id,
    'service_role',
    'company.member_invite_accepted',
    'invitation',
    v_invitation.id,
    jsonb_strip_nulls(jsonb_build_object(
      'target_user_id', v_actor_user_id,
      'membership_id', v_membership.id,
      'role_ids', to_jsonb(v_invitation.role_ids),
      'primary_role_id', v_invitation.primary_role_id,
      'request_id', nullif(p_request_id, '')
    )),
    nullif(p_request_id, '')
  );

  return query
  select
    v_invitation.id,
    v_invitation.company_id,
    v_company_slug,
    v_company_name,
    v_invitation.normalized_email,
    'accepted'::text,
    v_membership.id,
    v_actor_user_id,
    v_accepted_at,
    public.current_company_id() = v_invitation.company_id,
    true;
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_invite_accept"("p_invitation_id" "uuid", "p_request_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_invite_accept"("p_invitation_id" "uuid", "p_request_id" "text") IS 'Phase 8C5E4 authenticated invite acceptance RPC. Activates a sent invitation only for the matching auth user/email, turns invited membership and staged role assignments active, writes audit, and does not switch active company metadata.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_invite_finalize"("p_invitation_id" "uuid", "p_auth_user_id" "uuid", "p_auth_email" "text", "p_auth_invite_sent" boolean DEFAULT true, "p_auth_error_code" "text" DEFAULT NULL::"text", "p_auth_error_message" "text" DEFAULT NULL::"text", "p_provider_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("invitation_id" "uuid", "company_id" "uuid", "invite_email" "text", "invitation_status" "text", "invited_user_id" "uuid", "membership_id" "uuid", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
declare
  v_invitation public.company_member_invitations%rowtype;
  v_company_status text;
  v_auth_email text := lower(trim(coalesce(p_auth_email, '')));
  v_auth_error_code text := left(nullif(trim(coalesce(p_auth_error_code, '')), ''), 120);
  v_auth_error_message text := left(nullif(trim(coalesce(p_auth_error_message, '')), ''), 500);
  v_user_id uuid;
  v_membership_id uuid;
  v_primary_role_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required'
      using errcode = '42501';
  end if;

  select *
    into v_invitation
    from public.company_member_invitations cmi
   where cmi.id = p_invitation_id
   for update;

  if v_invitation.id is null then
    raise exception 'invitation_not_found'
      using errcode = '22023';
  end if;

  if v_invitation.status <> 'prepared' then
    raise exception 'invitation_not_prepared'
      using errcode = '22023';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_invitation.company_id;

  if v_company_status is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if v_invitation.expires_at <= now() then
    update public.company_member_invitations
       set status = 'expired',
           finalized_at = now()
     where id = v_invitation.id;

    raise exception 'invitation_expired'
      using errcode = '22023';
  end if;

  if v_auth_email <> v_invitation.normalized_email then
    raise exception 'auth_email_mismatch'
      using errcode = '22023';
  end if;

  if v_auth_error_code is not null then
    update public.company_member_invitations
       set status = 'auth_failed',
           auth_error_code = v_auth_error_code,
           auth_error_message = v_auth_error_message,
           finalized_at = now(),
           metadata = coalesce(metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
             'auth_invite_sent', p_auth_invite_sent,
             'provider_metadata', coalesce(p_provider_metadata, '{}'::jsonb)
           ))
     where id = v_invitation.id;

    insert into public.company_audit_events (
      company_id,
      actor_user_id,
      actor_auth_id,
      actor_kind,
      event_type,
      target_type,
      target_id,
      metadata,
      idempotency_key
    )
    values (
      v_invitation.company_id,
      v_invitation.invited_by_user_id,
      null,
      'service_role',
      'company.member_invite_auth_failed',
      'invitation',
      v_invitation.id,
      jsonb_strip_nulls(jsonb_build_object(
        'normalized_email', v_invitation.normalized_email,
        'auth_error_code', v_auth_error_code,
        'auth_error_message', v_auth_error_message,
        'request_id', v_invitation.request_id
      )),
      v_invitation.request_id
    );

    return query
    select
      v_invitation.id,
      v_invitation.company_id,
      v_invitation.normalized_email,
      'auth_failed'::text,
      null::uuid,
      null::uuid,
      v_invitation.expires_at;
    return;
  end if;

  if p_auth_user_id is null then
    raise exception 'auth_user_required'
      using errcode = '22023';
  end if;

  select u.id
    into v_user_id
    from public.users u
   where u.auth_id = p_auth_user_id
   limit 1;

  if v_user_id is null then
    select u.id
      into v_user_id
      from public.users u
     where lower(u.email) = v_invitation.normalized_email
     order by u.auth_id is null, u.created_at
     limit 1;
  end if;

  if v_user_id is null then
    insert into public.users (
      name,
      email,
      role,
      auth_id,
      status,
      is_active,
      created_at,
      updated_at
    )
    values (
      split_part(v_invitation.normalized_email, '@', 1),
      v_invitation.normalized_email,
      'appraiser',
      p_auth_user_id,
      'active',
      true,
      now(),
      now()
    )
    returning id into v_user_id;
  else
    update public.users u
       set auth_id = coalesce(u.auth_id, p_auth_user_id),
           updated_at = now()
     where u.id = v_user_id
       and u.auth_id is null;
  end if;

  insert into public.company_memberships (
    company_id,
    user_id,
    status,
    membership_type,
    is_primary,
    invited_by,
    joined_at,
    created_at,
    updated_at
  )
  values (
    v_invitation.company_id,
    v_user_id,
    'invited',
    'invited',
    false,
    v_invitation.invited_by_user_id,
    null,
    now(),
    now()
  )
  on conflict (company_id, user_id) do update
    set status = 'invited',
        membership_type = 'invited',
        invited_by = excluded.invited_by,
        updated_at = now()
  returning id into v_membership_id;

  v_primary_role_id := v_invitation.primary_role_id;

  insert into public.user_role_assignments (
    company_id,
    user_id,
    role_id,
    status,
    is_primary,
    assigned_by,
    assigned_at,
    expires_at,
    created_at,
    updated_at
  )
  select
    v_invitation.company_id,
    v_user_id,
    requested.role_id,
    'inactive',
    requested.role_id = v_primary_role_id,
    v_invitation.invited_by_user_id,
    now(),
    null,
    now(),
    now()
  from unnest(v_invitation.role_ids) requested(role_id)
  on conflict (company_id, user_id, role_id) do update
    set status = 'inactive',
        is_primary = excluded.is_primary,
        assigned_by = excluded.assigned_by,
        assigned_at = excluded.assigned_at,
        expires_at = null,
        updated_at = now();

  update public.user_role_assignments ura
     set is_primary = false,
         updated_at = now()
   where ura.company_id = v_invitation.company_id
     and ura.user_id = v_user_id
     and not (ura.role_id = any(v_invitation.role_ids))
     and ura.is_primary = true;

  update public.company_member_invitations
     set status = 'sent',
         invited_auth_id = p_auth_user_id,
         invited_user_id = v_user_id,
         membership_id = v_membership_id,
         finalized_at = now(),
         auth_invite_sent_at = case when p_auth_invite_sent then now() else auth_invite_sent_at end,
         auth_error_code = null,
         auth_error_message = null,
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'auth_invite_sent', p_auth_invite_sent,
           'provider_metadata', coalesce(p_provider_metadata, '{}'::jsonb)
         ))
   where id = v_invitation.id;

  insert into public.company_audit_events (
    company_id,
    actor_user_id,
    actor_auth_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  )
  values (
    v_invitation.company_id,
    v_invitation.invited_by_user_id,
    p_auth_user_id,
    'service_role',
    'company.member_invite_sent',
    'invitation',
    v_invitation.id,
    jsonb_strip_nulls(jsonb_build_object(
      'normalized_email', v_invitation.normalized_email,
      'target_user_id', v_user_id,
      'invited_auth_id', p_auth_user_id,
      'role_ids', to_jsonb(v_invitation.role_ids),
      'primary_role_id', v_invitation.primary_role_id,
      'request_id', v_invitation.request_id
    )),
    v_invitation.request_id
  );

  return query
  select
    v_invitation.id,
    v_invitation.company_id,
    v_invitation.normalized_email,
    'sent'::text,
    v_user_id,
    v_membership_id,
    v_invitation.expires_at;
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_invite_finalize"("p_invitation_id" "uuid", "p_auth_user_id" "uuid", "p_auth_email" "text", "p_auth_invite_sent" boolean, "p_auth_error_code" "text", "p_auth_error_message" "text", "p_provider_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_invite_finalize"("p_invitation_id" "uuid", "p_auth_user_id" "uuid", "p_auth_email" "text", "p_auth_invite_sent" boolean, "p_auth_error_code" "text", "p_auth_error_message" "text", "p_provider_metadata" "jsonb") IS 'Phase 8C5E3 service-role-only invite finalize RPC. Records Auth Admin result, creates invited inactive membership and inactive preset role assignments, and does not activate access.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_invite_prepare"("p_email" "text", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid" DEFAULT NULL::"uuid", "p_expires_in" interval DEFAULT '7 days'::interval, "p_reason" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text") RETURNS TABLE("invitation_id" "uuid", "company_id" "uuid", "company_slug" "text", "company_name" "text", "invite_email" "text", "invitation_status" "text", "expires_at" timestamp with time zone, "role_assignments" "jsonb", "requires_auth_invite" boolean, "existing_app_user_id" "uuid", "existing_auth_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
#variable_conflict use_column
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_slug text;
  v_company_name text;
  v_company_status text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_display_email text := trim(coalesce(p_email, ''));
  v_role_ids uuid[] := coalesce(p_role_ids, '{}'::uuid[]);
  v_role_ids_sorted uuid[];
  v_role_count integer;
  v_valid_role_count integer;
  v_primary_role_id uuid;
  v_role_snapshot jsonb;
  v_existing_user_id uuid;
  v_existing_auth_id uuid;
  v_existing_membership_status text;
  v_existing_invitation public.company_member_invitations%rowtype;
  v_invitation_id uuid;
  v_expires_at timestamptz;
  v_requested_has_owner boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'invalid_email'
      using errcode = '22023';
  end if;

  if not public.current_app_user_has_permission('users.invite') then
    raise exception 'invite_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.manage_company_access') then
    raise exception 'users_manage_company_access_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('roles.assign') then
    raise exception 'role_assign_permission_required'
      using errcode = '42501';
  end if;

  select c.slug, c.name, c.status
    into v_company_slug, v_company_name, v_company_status
    from public.companies c
   where c.id = v_company_id;

  if v_company_status is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from unnest(v_role_ids) requested(role_id)
     where requested.role_id is null
  ) then
    raise exception 'invalid_role_ids'
      using errcode = '22023';
  end if;

  select count(*), coalesce(array_agg(requested.role_id order by requested.role_id), '{}'::uuid[])
    into v_role_count, v_role_ids_sorted
    from unnest(v_role_ids) requested(role_id);

  if coalesce(v_role_count, 0) = 0 then
    raise exception 'invalid_role_ids'
      using errcode = '22023';
  end if;

  if v_role_count <> (
    select count(distinct requested.role_id)
      from unnest(v_role_ids) requested(role_id)
  ) then
    raise exception 'duplicate_role_ids'
      using errcode = '22023';
  end if;

  if p_primary_role_id is not null
     and not (p_primary_role_id = any(v_role_ids)) then
    raise exception 'primary_role_not_in_submitted_roles'
      using errcode = '22023';
  end if;

  select count(*)
    into v_valid_role_count
    from public.roles r
   where r.id = any(v_role_ids);

  if v_valid_role_count <> v_role_count then
    raise exception 'unknown_role_id'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from public.roles r
     where r.id = any(v_role_ids)
       and (
         r.company_id is not null
         or r.is_template is not true
         or r.is_system is not true
       )
  ) then
    raise exception 'role_preset_required'
      using errcode = '22023';
  end if;

  select coalesce(bool_or(r.is_owner_role = true or lower(r.name) = 'owner'), false)
    into v_requested_has_owner
    from public.roles r
   where r.id = any(v_role_ids);

  if v_requested_has_owner
     and not public.current_app_user_has_permission('users.grant_owner') then
    raise exception 'owner_grant_permission_required'
      using errcode = '42501';
  end if;

  select coalesce(p_primary_role_id, r.id)
    into v_primary_role_id
    from public.roles r
   where r.id = any(v_role_ids)
   order by
     case when r.id = p_primary_role_id then 0 else 1 end,
     case lower(r.name)
       when 'owner' then 1
       when 'admin' then 2
       when 'reviewer' then 3
       when 'appraiser' then 4
       when 'billing' then 5
       else 99
     end,
     r.name
   limit 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'role_id', r.id,
        'role_name', r.name,
        'is_owner_role', r.is_owner_role,
        'is_primary', r.id = v_primary_role_id,
        'status', 'inactive'
      )
      order by
        case when r.id = v_primary_role_id then 0 else 1 end,
        case lower(r.name)
          when 'owner' then 1
          when 'admin' then 2
          when 'reviewer' then 3
          when 'appraiser' then 4
          when 'billing' then 5
          else 99
        end,
        r.name
    ),
    '[]'::jsonb
  )
    into v_role_snapshot
    from public.roles r
   where r.id = any(v_role_ids);

  select u.id, u.auth_id
    into v_existing_user_id, v_existing_auth_id
    from public.users u
   where lower(u.email) = v_email
   order by u.auth_id is null, u.created_at
   limit 1;

  if v_existing_user_id is not null then
    select cm.status
      into v_existing_membership_status
      from public.company_memberships cm
     where cm.company_id = v_company_id
       and cm.user_id = v_existing_user_id;

    if v_existing_membership_status = 'active' then
      raise exception 'member_already_active'
        using errcode = '23505';
    elsif v_existing_membership_status is not null then
      raise exception 'member_exists_inactive'
        using errcode = '23505';
    end if;
  end if;

  update public.company_member_invitations cmi
     set status = 'expired',
         updated_at = now()
   where cmi.company_id = v_company_id
     and cmi.status in ('prepared', 'sent')
     and cmi.expires_at <= now();

  select *
    into v_existing_invitation
    from public.company_member_invitations cmi
   where cmi.company_id = v_company_id
     and cmi.normalized_email = v_email
     and cmi.status in ('prepared', 'sent')
   order by cmi.created_at desc
   limit 1
   for update;

  if v_existing_invitation.id is not null then
    if (
      nullif(p_request_id, '') is not null
      and v_existing_invitation.request_id = nullif(p_request_id, '')
    ) or (
      v_existing_invitation.role_ids = v_role_ids_sorted
      and v_existing_invitation.primary_role_id is not distinct from v_primary_role_id
    ) then
      return query
      select
        v_existing_invitation.id,
        v_company_id,
        v_company_slug,
        v_company_name,
        v_existing_invitation.normalized_email,
        v_existing_invitation.status,
        v_existing_invitation.expires_at,
        v_existing_invitation.role_snapshot,
        (v_existing_auth_id is null),
        v_existing_user_id,
        v_existing_auth_id;
      return;
    end if;

    raise exception 'invite_already_pending'
      using errcode = '23505';
  end if;

  v_expires_at := now() + greatest(coalesce(p_expires_in, interval '7 days'), interval '1 hour');

  insert into public.company_member_invitations (
    company_id,
    email,
    normalized_email,
    status,
    invited_by_user_id,
    role_ids,
    primary_role_id,
    role_snapshot,
    reason,
    request_id,
    expires_at,
    metadata
  )
  values (
    v_company_id,
    v_display_email,
    v_email,
    'prepared',
    v_actor_user_id,
    v_role_ids_sorted,
    v_primary_role_id,
    v_role_snapshot,
    nullif(p_reason, ''),
    nullif(p_request_id, ''),
    v_expires_at,
    jsonb_strip_nulls(jsonb_build_object(
      'existing_app_user_id', v_existing_user_id,
      'has_existing_auth_identity', v_existing_auth_id is not null
    ))
  )
  returning id into v_invitation_id;

  insert into public.company_audit_events (
    company_id,
    actor_user_id,
    actor_auth_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  )
  values (
    v_company_id,
    v_actor_user_id,
    auth.uid(),
    'service_role',
    'company.member_invite_prepared',
    'invitation',
    v_invitation_id,
    jsonb_strip_nulls(jsonb_build_object(
      'normalized_email', v_email,
      'target_user_id', v_existing_user_id,
      'role_ids', to_jsonb(v_role_ids_sorted),
      'primary_role_id', v_primary_role_id,
      'reason', nullif(p_reason, ''),
      'request_id', nullif(p_request_id, '')
    )),
    nullif(p_request_id, '')
  );

  return query
  select
    v_invitation_id,
    v_company_id,
    v_company_slug,
    v_company_name,
    v_email,
    'prepared'::text,
    v_expires_at,
    v_role_snapshot,
    (v_existing_auth_id is null),
    v_existing_user_id,
    v_existing_auth_id;
end;
$_$;


ALTER FUNCTION "public"."rpc_company_member_invite_prepare"("p_email" "text", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_expires_in" interval, "p_reason" "text", "p_request_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_invite_prepare"("p_email" "text", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_expires_in" interval, "p_reason" "text", "p_request_id" "text") IS 'Phase 8C5E3 authenticated invite prepare RPC. Validates current-company invite authority and preset role guardrails, creates a prepared invitation, and does not create membership or role assignment rows.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_list"("p_include_inactive" boolean DEFAULT false) RETURNS TABLE("user_id" "uuid", "membership_id" "uuid", "display_name" "text", "full_name" "text", "email" "text", "phone" "text", "avatar_url" "text", "display_color" "text", "membership_status" "text", "membership_type" "text", "is_primary" boolean, "joined_at" timestamp with time zone, "auth_linked" boolean, "is_owner" boolean, "role_assignments" "jsonb", "can_update_roles" boolean, "can_deactivate" boolean, "can_reactivate" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_can_read_users boolean;
  v_can_update_roles boolean;
  v_can_deactivate_users boolean;
  v_can_reactivate_users boolean;
  v_owner_count integer;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  v_can_read_users := public.current_app_user_has_permission('users.read');
  if not v_can_read_users then
    raise exception 'users_read_permission_required'
      using errcode = '42501';
  end if;

  v_can_update_roles :=
    public.current_app_user_has_permission('users.manage_company_access')
    and public.current_app_user_has_permission('roles.assign');
  v_can_deactivate_users := public.current_app_user_has_permission('users.deactivate');
  v_can_reactivate_users :=
    public.current_app_user_has_permission('users.manage_company_access')
    or public.current_app_user_has_permission('users.update');

  select public.company_active_owner_count(v_company_id)
    into v_owner_count;

  return query
  with member_roles as (
    select
      cm.user_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'role_assignment_id', ura.id,
            'role_id', r.id,
            'role_name', r.name,
            'is_owner_role', r.is_owner_role,
            'is_primary', ura.is_primary,
            'status', ura.status
          )
          order by
            case when ura.status = 'active' then 0 else 1 end,
            ura.is_primary desc,
            r.is_owner_role desc,
            r.name
        ) filter (where ura.id is not null),
        '[]'::jsonb
      ) as role_assignments,
      coalesce(
        bool_or(
          ura.status = 'active'
          and (ura.expires_at is null or ura.expires_at > now())
          and (r.is_owner_role = true or lower(r.name) = 'owner')
        ),
        false
      ) as is_owner
    from public.company_memberships cm
    left join public.user_role_assignments ura
      on ura.company_id = cm.company_id
     and ura.user_id = cm.user_id
    left join public.roles r
      on r.id = ura.role_id
   where cm.company_id = v_company_id
   group by cm.user_id
  )
  select
    u.id as user_id,
    cm.id as membership_id,
    coalesce(nullif(u.display_name, ''), nullif(u.full_name, ''), nullif(u.name, ''), u.email) as display_name,
    coalesce(nullif(u.full_name, ''), nullif(u.name, ''), nullif(u.display_name, '')) as full_name,
    u.email,
    u.phone,
    u.avatar_url,
    coalesce(nullif(u.display_color, ''), nullif(u.color, '')) as display_color,
    cm.status as membership_status,
    cm.membership_type,
    cm.is_primary,
    cm.joined_at,
    u.auth_id is not null as auth_linked,
    coalesce(mr.is_owner, false) as is_owner,
    coalesce(mr.role_assignments, '[]'::jsonb) as role_assignments,
    v_can_update_roles as can_update_roles,
    (
      v_can_deactivate_users
      and cm.status = 'active'
      and not (coalesce(mr.is_owner, false) and v_owner_count <= 1)
    ) as can_deactivate,
    (
      v_can_reactivate_users
      and cm.status <> 'active'
    ) as can_reactivate
  from public.company_memberships cm
  join public.users u
    on u.id = cm.user_id
  left join member_roles mr
    on mr.user_id = cm.user_id
  where cm.company_id = v_company_id
    and (p_include_inactive or cm.status = 'active')
  order by
    case when cm.status = 'active' then 0 else 1 end,
    coalesce(nullif(u.display_name, ''), nullif(u.full_name, ''), nullif(u.name, ''), u.email);
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_list"("p_include_inactive" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_list"("p_include_inactive" boolean) IS 'Phase 8C5E1 safe current-company member projection. Returns current-company membership rows and safe role labels only; no auth ids, raw permission keys, operational data, or cross-company members.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_permission_overrides"("p_user_id" "uuid") RETURNS TABLE("override_id" "uuid", "membership_id" "uuid", "user_id" "uuid", "permission_key" "text", "permission_category" "text", "permission_label" "text", "permission_description" "text", "effect" "text", "reason" "text", "created_by_user_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_membership_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('roles.read') then
    raise exception 'roles_read_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.read') then
    raise exception 'users_read_permission_required'
      using errcode = '42501';
  end if;

  select cm.id
    into v_membership_id
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.user_id = p_user_id;

  if v_membership_id is null then
    raise exception 'target_company_membership_required'
      using errcode = '42501';
  end if;

  return query
  select
    cmpo.id as override_id,
    cmpo.membership_id,
    cmpo.user_id,
    cmpo.permission_key,
    p.category as permission_category,
    p.label as permission_label,
    p.description as permission_description,
    cmpo.effect,
    cmpo.reason,
    cmpo.created_by_user_id,
    cmpo.created_at,
    cmpo.updated_at
  from public.company_member_permission_overrides cmpo
  join public.permissions p
    on p.key = cmpo.permission_key
  where cmpo.company_id = v_company_id
    and cmpo.membership_id = v_membership_id
    and cmpo.user_id = p_user_id
    and public.permission_override_is_v1_ui_visible(cmpo.permission_key)
  order by p.category, p.label, cmpo.permission_key;
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_permission_overrides"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_permission_overrides"("p_user_id" "uuid") IS 'Reads active V1-visible explicit permission overrides for one current-company member. Hidden or deferred override categories are intentionally excluded from the active Users/Edit Access flow.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_permission_overrides_save"("p_user_id" "uuid", "p_overrides" "jsonb", "p_reason" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text") RETURNS TABLE("user_id" "uuid", "membership_id" "uuid", "changed" boolean, "overrides" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_membership_id uuid;
  v_previous jsonb;
  v_next jsonb;
  v_payload jsonb := coalesce(p_overrides, '[]'::jsonb);
  v_visible_payload jsonb := '[]'::jsonb;
  v_target_has_owner boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) <> 'array' then
    raise exception 'permission_overrides_array_required'
      using errcode = '22023';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.manage_company_access') then
    raise exception 'users_manage_company_access_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('roles.manage_permissions') then
    raise exception 'roles_manage_permissions_required'
      using errcode = '42501';
  end if;

  select cm.id
    into v_membership_id
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.user_id = p_user_id
   for update;

  if v_membership_id is null then
    raise exception 'target_company_membership_required'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_payload) item
     where not (item ? 'permission_key')
        or nullif(trim(item->>'permission_key'), '') is null
  ) then
    raise exception 'invalid_permission_override_payload'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_payload) item
      left join public.permissions p
        on p.key = trim(item->>'permission_key')
     where p.key is null
  ) then
    raise exception 'unknown_permission_key'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_payload) item
     where public.permission_override_is_v1_ui_visible(trim(item->>'permission_key'))
       and (
         not (item ? 'effect')
         or lower(trim(item->>'effect')) not in ('grant', 'revoke')
       )
  ) then
    raise exception 'invalid_permission_override_payload'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from (
        select trim(item->>'permission_key') as permission_key
          from jsonb_array_elements(v_payload) item
         where public.permission_override_is_v1_ui_visible(trim(item->>'permission_key'))
      ) parsed
     group by parsed.permission_key
    having count(*) > 1
  ) then
    raise exception 'duplicate_permission_override'
      using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'permission_key', parsed.permission_key,
        'effect', parsed.effect
      )
      order by parsed.permission_key
    ),
    '[]'::jsonb
  )
    into v_visible_payload
    from (
      select
        trim(item->>'permission_key') as permission_key,
        lower(trim(item->>'effect')) as effect
        from jsonb_array_elements(v_payload) item
       where public.permission_override_is_v1_ui_visible(trim(item->>'permission_key'))
    ) parsed;

  v_target_has_owner := public.user_has_owner_role_in_company(p_user_id, v_company_id);

  if p_user_id = v_actor_user_id
     and v_target_has_owner
     and exists (
       select 1
         from jsonb_array_elements(v_visible_payload) item
         join public.permissions p
           on p.key = trim(item->>'permission_key')
        where lower(trim(item->>'effect')) = 'revoke'
          and (
            p.is_owner_only
            or p.key in (
              'users.grant_owner',
              'users.revoke_owner',
              'roles.manage_owner_role',
              'company.transfer_ownership',
              'company.manage_security'
            )
          )
     ) then
    raise exception 'owner_self_protection_override_blocked'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'permission_key', cmpo.permission_key,
        'effect', cmpo.effect
      )
      order by cmpo.permission_key
    ),
    '[]'::jsonb
  )
    into v_previous
    from public.company_member_permission_overrides cmpo
   where cmpo.company_id = v_company_id
     and cmpo.membership_id = v_membership_id
     and cmpo.user_id = p_user_id
     and public.permission_override_is_v1_ui_visible(cmpo.permission_key);

  delete from public.company_member_permission_overrides cmpo
   where cmpo.company_id = v_company_id
     and cmpo.membership_id = v_membership_id
     and cmpo.user_id = p_user_id
     and public.permission_override_is_v1_ui_visible(cmpo.permission_key)
     and not exists (
       select 1
         from jsonb_array_elements(v_visible_payload) item
        where trim(item->>'permission_key') = cmpo.permission_key
     );

  insert into public.company_member_permission_overrides (
    company_id,
    membership_id,
    user_id,
    permission_key,
    effect,
    created_by_user_id,
    reason,
    created_at,
    updated_at
  )
  select
    v_company_id,
    v_membership_id,
    p_user_id,
    trim(item->>'permission_key'),
    lower(trim(item->>'effect')),
    v_actor_user_id,
    nullif(p_reason, ''),
    now(),
    now()
  from jsonb_array_elements(v_visible_payload) item
  on conflict (company_id, membership_id, permission_key) do update
    set effect = excluded.effect,
        created_by_user_id = excluded.created_by_user_id,
        reason = excluded.reason,
        updated_at = now();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'permission_key', cmpo.permission_key,
        'effect', cmpo.effect
      )
      order by cmpo.permission_key
    ),
    '[]'::jsonb
  )
    into v_next
    from public.company_member_permission_overrides cmpo
   where cmpo.company_id = v_company_id
     and cmpo.membership_id = v_membership_id
     and cmpo.user_id = p_user_id
     and public.permission_override_is_v1_ui_visible(cmpo.permission_key);

  changed := v_previous is distinct from v_next;

  if changed then
    insert into public.company_audit_events (
      company_id,
      actor_user_id,
      actor_auth_id,
      actor_kind,
      event_type,
      target_type,
      target_id,
      metadata,
      idempotency_key
    )
    values (
      v_company_id,
      v_actor_user_id,
      v_actor_auth_id,
      'service_role',
      'company.member_permission_overrides_updated',
      'membership',
      v_membership_id,
      jsonb_strip_nulls(jsonb_build_object(
        'target_user_id', p_user_id,
        'previous_overrides', v_previous,
        'new_overrides', v_next,
        'reason', nullif(p_reason, ''),
        'request_id', nullif(p_request_id, '')
      )),
      nullif(p_request_id, '')
    );
  end if;

  user_id := p_user_id;
  membership_id := v_membership_id;
  overrides := v_next;
  return next;
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_permission_overrides_save"("p_user_id" "uuid", "p_overrides" "jsonb", "p_reason" "text", "p_request_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_permission_overrides_save"("p_user_id" "uuid", "p_overrides" "jsonb", "p_reason" "text", "p_request_id" "text") IS 'Replaces only active V1-visible explicit permission overrides for one current-company member. Hidden/deferred override rows are preserved and ignored by this UI-scoped save path.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_role_update"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text") RETURNS TABLE("user_id" "uuid", "membership_id" "uuid", "changed" boolean, "active_owner_count" integer, "role_assignments" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_membership_id uuid;
  v_membership_status text;
  v_requested_role_ids uuid[] := coalesce(p_role_ids, '{}'::uuid[]);
  v_requested_sorted uuid[];
  v_requested_count integer;
  v_valid_count integer;
  v_previous_active_role_ids uuid[];
  v_new_active_role_ids uuid[];
  v_previous_primary_role_id uuid;
  v_new_primary_role_id uuid;
  v_previous_has_owner boolean;
  v_requested_has_owner boolean;
  v_can_grant_owner boolean;
  v_can_revoke_owner boolean;
  v_changed boolean := false;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.manage_company_access') then
    raise exception 'users_manage_company_access_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('roles.assign') then
    raise exception 'roles_assign_permission_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if v_company_status is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_company_id::text, 0));

  select cm.id, cm.status
    into v_membership_id, v_membership_status
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.user_id = p_user_id
   for update;

  if v_membership_id is null then
    raise exception 'target_company_membership_required'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from unnest(v_requested_role_ids) requested(role_id)
     where requested.role_id is null
  ) then
    raise exception 'role_id_required'
      using errcode = '22023';
  end if;

  select count(*), coalesce(array_agg(requested.role_id order by requested.role_id), '{}'::uuid[])
    into v_requested_count, v_requested_sorted
    from unnest(v_requested_role_ids) requested(role_id);

  if v_requested_count <> (
    select count(distinct requested.role_id)
      from unnest(v_requested_role_ids) requested(role_id)
  ) then
    raise exception 'duplicate_role_ids'
      using errcode = '22023';
  end if;

  if p_primary_role_id is not null
     and not (p_primary_role_id = any(v_requested_role_ids)) then
    raise exception 'primary_role_not_in_submitted_roles'
      using errcode = '22023';
  end if;

  if v_requested_count > 0 then
    select count(*)
      into v_valid_count
      from public.roles r
     where r.id = any(v_requested_role_ids);

    if v_valid_count <> v_requested_count then
      raise exception 'unknown_role_id'
        using errcode = '22023';
    end if;

    if exists (
      select 1
        from public.roles r
       where r.id = any(v_requested_role_ids)
         and (
           r.company_id is not null
           or r.is_template is not true
           or r.is_system is not true
         )
    ) then
      raise exception 'role_preset_required'
        using errcode = '22023';
    end if;

    select coalesce(
      bool_or(r.is_owner_role = true or lower(r.name) = 'owner'),
      false
    )
      into v_requested_has_owner
      from public.roles r
     where r.id = any(v_requested_role_ids);
  else
    v_requested_has_owner := false;
  end if;

  select coalesce(array_agg(ura.role_id order by ura.role_id), '{}'::uuid[])
    into v_previous_active_role_ids
    from public.user_role_assignments ura
   where ura.company_id = v_company_id
     and ura.user_id = p_user_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now());

  select ura.role_id
    into v_previous_primary_role_id
    from public.user_role_assignments ura
    join public.roles r
      on r.id = ura.role_id
   where ura.company_id = v_company_id
     and ura.user_id = p_user_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
     and ura.is_primary = true
   order by
     case lower(r.name)
       when 'owner' then 1
       when 'admin' then 2
       when 'reviewer' then 3
       when 'appraiser' then 4
       when 'billing' then 5
       else 99
     end,
     r.name,
     ura.assigned_at
   limit 1;

  v_previous_has_owner := public.user_has_owner_role_in_company(p_user_id, v_company_id);

  if v_requested_count > 0 then
    select coalesce(p_primary_role_id, r.id)
      into v_new_primary_role_id
      from public.roles r
     where r.id = any(v_requested_role_ids)
     order by
       case when r.id = p_primary_role_id then 0 else 1 end,
       case lower(r.name)
         when 'owner' then 1
         when 'admin' then 2
         when 'reviewer' then 3
         when 'appraiser' then 4
         when 'billing' then 5
         else 99
       end,
       r.name
     limit 1;
  else
    v_new_primary_role_id := null;
  end if;

  v_can_grant_owner := public.current_app_user_has_permission('users.grant_owner');
  v_can_revoke_owner := public.current_app_user_has_permission('users.revoke_owner');

  if v_requested_has_owner and not v_previous_has_owner and not v_can_grant_owner then
    raise exception 'users_grant_owner_permission_required'
      using errcode = '42501';
  end if;

  if v_previous_has_owner and not v_requested_has_owner then
    if not v_can_revoke_owner then
      raise exception 'users_revoke_owner_permission_required'
        using errcode = '42501';
    end if;

    perform public.assert_company_will_have_owner(v_company_id, p_user_id);
  end if;

  v_changed :=
    coalesce(v_previous_active_role_ids, '{}'::uuid[]) <> coalesce(v_requested_sorted, '{}'::uuid[])
    or v_previous_primary_role_id is distinct from v_new_primary_role_id;

  update public.user_role_assignments ura
     set status = 'inactive',
         is_primary = false,
         updated_at = now()
   where ura.company_id = v_company_id
     and ura.user_id = p_user_id
     and not (ura.role_id = any(v_requested_role_ids));

  insert into public.user_role_assignments (
    company_id,
    user_id,
    role_id,
    status,
    is_primary,
    assigned_by,
    assigned_at,
    expires_at,
    created_at,
    updated_at
  )
  select
    v_company_id,
    p_user_id,
    requested.role_id,
    'active',
    requested.role_id = v_new_primary_role_id,
    v_actor_user_id,
    now(),
    null,
    now(),
    now()
  from unnest(v_requested_role_ids) requested(role_id)
  on conflict (company_id, user_id, role_id) do update
    set status = 'active',
        is_primary = excluded.is_primary,
        assigned_by = excluded.assigned_by,
        assigned_at = excluded.assigned_at,
        expires_at = null,
        updated_at = now();

  update public.user_role_assignments ura
     set is_primary = (ura.role_id = v_new_primary_role_id),
         updated_at = now()
   where ura.company_id = v_company_id
     and ura.user_id = p_user_id
     and ura.role_id = any(v_requested_role_ids)
     and (
       ura.is_primary is distinct from (ura.role_id = v_new_primary_role_id)
       or ura.status <> 'active'
     );

  active_owner_count := public.company_active_owner_count(v_company_id);
  if active_owner_count < 1 then
    raise exception 'company_owner_required'
      using errcode = '23514',
            detail = 'A company must retain at least one active owner.';
  end if;

  select coalesce(array_agg(ura.role_id order by ura.role_id), '{}'::uuid[])
    into v_new_active_role_ids
    from public.user_role_assignments ura
   where ura.company_id = v_company_id
     and ura.user_id = p_user_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now());

  if v_changed then
    insert into public.company_audit_events (
      company_id,
      actor_user_id,
      actor_auth_id,
      actor_kind,
      event_type,
      target_type,
      target_id,
      metadata,
      idempotency_key
    )
    values (
      v_company_id,
      v_actor_user_id,
      v_actor_auth_id,
      'service_role',
      'company.member_roles_updated',
      'membership',
      v_membership_id,
      jsonb_strip_nulls(jsonb_build_object(
        'target_user_id', p_user_id,
        'previous_role_ids', to_jsonb(v_previous_active_role_ids),
        'new_role_ids', to_jsonb(v_new_active_role_ids),
        'previous_primary_role_id', v_previous_primary_role_id,
        'new_primary_role_id', v_new_primary_role_id,
        'reason', nullif(p_reason, ''),
        'request_id', nullif(p_request_id, '')
      )),
      nullif(p_request_id, '')
    );
  end if;

  return query
  select
    p_user_id,
    v_membership_id,
    v_changed,
    active_owner_count,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'role_assignment_id', ura.id,
          'role_id', r.id,
          'role_name', r.name,
          'is_owner_role', r.is_owner_role,
          'is_primary', ura.is_primary,
          'status', ura.status
        )
        order by
          case when ura.status = 'active' then 0 else 1 end,
          ura.is_primary desc,
          r.is_owner_role desc,
          r.name
      ) filter (where ura.id is not null),
      '[]'::jsonb
    ) as role_assignments
  from public.company_memberships cm
  left join public.user_role_assignments ura
    on ura.company_id = cm.company_id
   and ura.user_id = cm.user_id
  left join public.roles r
    on r.id = ura.role_id
 where cm.id = v_membership_id
 group by cm.user_id, cm.id;
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_role_update"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_reason" "text", "p_request_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_role_update"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_reason" "text", "p_request_id" "text") IS 'Phase 8C5E2 guarded current-company role assignment mutation. Uses template preset roles only, preserves owner invariant, writes company audit events, and does not sync legacy user_roles.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_member_set_status"("p_user_id" "uuid", "p_status" "text", "p_reason" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text") RETURNS TABLE("user_id" "uuid", "membership_id" "uuid", "previous_status" "text", "membership_status" "text", "changed" boolean, "active_owner_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_membership_id uuid;
  v_previous_status text;
  v_new_status text := lower(trim(coalesce(p_status, '')));
  v_target_has_owner boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if v_new_status not in ('active', 'inactive') then
    raise exception 'invalid_membership_status'
      using errcode = '22023';
  end if;

  if v_new_status = 'inactive' then
    if not public.current_app_user_has_permission('users.deactivate') then
      raise exception 'users_deactivate_permission_required'
        using errcode = '42501';
    end if;
  elsif not (
    public.current_app_user_has_permission('users.manage_company_access')
    or public.current_app_user_has_permission('users.update')
  ) then
    raise exception 'users_reactivate_permission_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if v_company_status is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_company_id::text, 0));

  select cm.id, cm.status
    into v_membership_id, v_previous_status
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.user_id = p_user_id
   for update;

  if v_membership_id is null then
    raise exception 'target_company_membership_required'
      using errcode = '42501';
  end if;

  v_target_has_owner := public.user_has_owner_role_in_company(p_user_id, v_company_id);

  if v_new_status = 'inactive'
     and v_previous_status = 'active'
     and v_target_has_owner then
    perform public.assert_company_will_have_owner(v_company_id, p_user_id);
  end if;

  changed := v_previous_status is distinct from v_new_status;

  if changed then
    update public.company_memberships cm
       set status = v_new_status,
           joined_at = case
             when v_new_status = 'active' then coalesce(cm.joined_at, now())
             else cm.joined_at
           end,
           updated_at = now()
     where cm.id = v_membership_id;
  end if;

  active_owner_count := public.company_active_owner_count(v_company_id);
  if active_owner_count < 1 then
    raise exception 'company_owner_required'
      using errcode = '23514',
            detail = 'A company must retain at least one active owner.';
  end if;

  if changed then
    insert into public.company_audit_events (
      company_id,
      actor_user_id,
      actor_auth_id,
      actor_kind,
      event_type,
      target_type,
      target_id,
      metadata,
      idempotency_key
    )
    values (
      v_company_id,
      v_actor_user_id,
      v_actor_auth_id,
      'service_role',
      case
        when v_new_status = 'active' then 'company.member_reactivated'
        else 'company.member_deactivated'
      end,
      'membership',
      v_membership_id,
      jsonb_strip_nulls(jsonb_build_object(
        'target_user_id', p_user_id,
        'previous_status', v_previous_status,
        'new_status', v_new_status,
        'reason', nullif(p_reason, ''),
        'request_id', nullif(p_request_id, '')
      )),
      nullif(p_request_id, '')
    );
  end if;

  return query
  select
    p_user_id,
    v_membership_id,
    v_previous_status,
    v_new_status,
    changed,
    active_owner_count;
end;
$$;


ALTER FUNCTION "public"."rpc_company_member_set_status"("p_user_id" "uuid", "p_status" "text", "p_reason" "text", "p_request_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_member_set_status"("p_user_id" "uuid", "p_status" "text", "p_reason" "text", "p_request_id" "text") IS 'Phase 8C5E2 guarded current-company membership activation/deactivation mutation. Preserves owner invariant, writes company audit events, and does not mutate role assignments.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_profile_update"("p_patch" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_patch jsonb := p_patch;
  v_company public.companies%rowtype;
  v_old_name text;
  v_old_timezone text;
  v_old_locale text;
  v_new_name text;
  v_new_timezone text;
  v_new_locale text;
  v_changed_fields text[] := '{}'::text[];
  v_changed boolean := false;
  v_audit_event_id uuid := null;
  v_profile_complete boolean;
  v_unsupported_key text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if v_patch is null or jsonb_typeof(v_patch) <> 'object' then
    raise exception 'company_profile_patch_required'
      using errcode = '22023';
  end if;

  select key
    into v_unsupported_key
    from jsonb_object_keys(v_patch) as keys(key)
   where key not in ('name', 'timezone', 'locale')
   order by key
   limit 1;

  if v_unsupported_key is not null then
    raise exception 'unsupported_company_profile_field: %', v_unsupported_key
      using errcode = '22023';
  end if;

  select *
    into v_company
    from public.companies c
   where c.id = v_company_id
   for update;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company.status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('company.update_profile') then
    raise exception 'company_update_profile_permission_required'
      using errcode = '42501';
  end if;

  v_old_name := v_company.name;
  v_old_timezone := v_company.timezone;
  v_old_locale := v_company.locale;
  v_new_name := v_old_name;
  v_new_timezone := v_old_timezone;
  v_new_locale := v_old_locale;

  if v_patch ? 'name' then
    v_new_name := trim(coalesce(v_patch->>'name', ''));

    if v_new_name = '' then
      raise exception 'company_name_required'
        using errcode = '22023';
    end if;

    if length(v_new_name) > 160 then
      raise exception 'company_name_too_long'
        using errcode = '22023';
    end if;
  end if;

  if v_patch ? 'timezone' then
    v_new_timezone := trim(coalesce(v_patch->>'timezone', ''));

    if v_new_timezone = '' then
      raise exception 'company_timezone_required'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
        from pg_timezone_names t
       where t.name = v_new_timezone
    ) then
      raise exception 'invalid_company_timezone'
        using errcode = '22023';
    end if;
  end if;

  if v_patch ? 'locale' then
    v_new_locale := trim(coalesce(v_patch->>'locale', ''));

    if v_new_locale = '' then
      raise exception 'company_locale_required'
        using errcode = '22023';
    end if;

    if v_new_locale <> 'en-US' then
      raise exception 'invalid_company_locale'
        using errcode = '22023';
    end if;
  end if;

  if v_new_name is distinct from v_old_name then
    v_changed_fields := array_append(v_changed_fields, 'name');
  end if;

  if v_new_timezone is distinct from v_old_timezone then
    v_changed_fields := array_append(v_changed_fields, 'timezone');
  end if;

  if v_new_locale is distinct from v_old_locale then
    v_changed_fields := array_append(v_changed_fields, 'locale');
  end if;

  v_changed := coalesce(array_length(v_changed_fields, 1), 0) > 0;

  if v_changed then
    update public.companies c
       set name = v_new_name,
           timezone = v_new_timezone,
           locale = v_new_locale,
           updated_at = now()
     where c.id = v_company_id
     returning *
      into v_company;

    insert into public.company_audit_events (
      company_id,
      actor_user_id,
      actor_auth_id,
      actor_kind,
      event_type,
      target_type,
      target_id,
      metadata
    )
    values (
      v_company_id,
      v_actor_user_id,
      v_actor_auth_id,
      'operator',
      'company.profile_updated',
      'company',
      v_company_id,
      jsonb_build_object(
        'changed_fields', to_jsonb(v_changed_fields),
        'previous', jsonb_build_object(
          'name', case when 'name' = any(v_changed_fields) then v_old_name else null end,
          'timezone', case when 'timezone' = any(v_changed_fields) then v_old_timezone else null end,
          'locale', case when 'locale' = any(v_changed_fields) then v_old_locale else null end
        ) - (
          select coalesce(array_agg(key), '{}'::text[])
          from jsonb_each_text(jsonb_build_object(
            'name', case when 'name' = any(v_changed_fields) then v_old_name else null end,
            'timezone', case when 'timezone' = any(v_changed_fields) then v_old_timezone else null end,
            'locale', case when 'locale' = any(v_changed_fields) then v_old_locale else null end
          )) as entries(key, value)
          where value is null
        ),
        'current', jsonb_build_object(
          'name', case when 'name' = any(v_changed_fields) then v_new_name else null end,
          'timezone', case when 'timezone' = any(v_changed_fields) then v_new_timezone else null end,
          'locale', case when 'locale' = any(v_changed_fields) then v_new_locale else null end
        ) - (
          select coalesce(array_agg(key), '{}'::text[])
          from jsonb_each_text(jsonb_build_object(
            'name', case when 'name' = any(v_changed_fields) then v_new_name else null end,
            'timezone', case when 'timezone' = any(v_changed_fields) then v_new_timezone else null end,
            'locale', case when 'locale' = any(v_changed_fields) then v_new_locale else null end
          )) as entries(key, value)
          where value is null
        )
      )
    )
    returning id into v_audit_event_id;
  end if;

  v_profile_complete :=
    nullif(trim(v_company.slug), '') is not null
    and nullif(trim(v_company.name), '') is not null
    and nullif(trim(v_company.company_type), '') is not null
    and nullif(trim(v_company.timezone), '') is not null
    and nullif(trim(v_company.locale), '') is not null;

  return jsonb_build_object(
    'status', case when v_changed then 'updated' else 'unchanged' end,
    'company_id', v_company.id,
    'profile', jsonb_build_object(
      'name', v_company.name,
      'timezone', v_company.timezone,
      'locale', v_company.locale,
      'profile_complete', v_profile_complete,
      'updated_at', v_company.updated_at
    ),
    'changed_fields', to_jsonb(v_changed_fields),
    'audit_event_id', v_audit_event_id,
    'warnings', '[]'::jsonb,
    'setup_context_refresh_recommended', true,
    'source', jsonb_build_object(
      'rpc', 'rpc_company_profile_update',
      'version', 'v1'
    )
  );
end;
$$;


ALTER FUNCTION "public"."rpc_company_profile_update"("p_patch" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_profile_update"("p_patch" "jsonb") IS 'Phase 10D3 guarded current-company profile update RPC. Updates only name, timezone, and locale; rejects broad settings and authority fields; readiness/onboarding/product-mode/module metadata remain non-authoritative.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_relationship_accept"("p_relationship_id" "uuid", "p_compliance" "jsonb" DEFAULT '{}'::"jsonb", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_relationship public.company_relationships%rowtype;
  v_actor_user_id uuid := public.current_app_user_id();
begin
  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id
   for update;

  if not found then
    raise exception 'Company relationship not found';
  end if;

  if v_relationship.status <> 'invited' then
    raise exception 'Only invited company relationships can be accepted';
  end if;

  if not public.current_app_user_can_approve_company_relationship(v_relationship.source_company_id, v_relationship.target_company_id) then
    raise exception 'Not authorized to accept company relationship';
  end if;

  update public.company_relationships
     set status = 'active',
         approved_by_user_id = v_actor_user_id,
         approved_at = now(),
         compliance = coalesce(p_compliance, v_relationship.compliance, '{}'::jsonb),
         notes = coalesce(p_notes, notes)
   where id = p_relationship_id;

  return p_relationship_id;
end;
$$;


ALTER FUNCTION "public"."rpc_company_relationship_accept"("p_relationship_id" "uuid", "p_compliance" "jsonb", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_relationship_accept"("p_relationship_id" "uuid", "p_compliance" "jsonb", "p_notes" "text") IS 'Phase 8B3 RPC-only target-company accept action. Accepting a relationship grants no operational visibility until future assignment-backed visibility exists.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_relationship_archive"("p_relationship_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_relationship public.company_relationships%rowtype;
  v_actor_user_id uuid := public.current_app_user_id();
begin
  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id
   for update;

  if not found then
    raise exception 'Company relationship not found';
  end if;

  if v_relationship.status = 'archived' then
    raise exception 'Company relationship is already archived';
  end if;

  if not public.current_app_user_can_archive_company_relationship(v_relationship.source_company_id, v_relationship.target_company_id) then
    raise exception 'Not authorized to archive company relationship';
  end if;

  update public.company_relationships
     set status = 'archived',
         archived_by_user_id = v_actor_user_id,
         archived_at = now(),
         notes = coalesce(p_notes, notes)
   where id = p_relationship_id;

  return p_relationship_id;
end;
$$;


ALTER FUNCTION "public"."rpc_company_relationship_archive"("p_relationship_id" "uuid", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_relationship_archive"("p_relationship_id" "uuid", "p_notes" "text") IS 'Phase 8B3 RPC-only archive action. Archived relationships are terminal and grant no operational visibility.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_relationship_decline"("p_relationship_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_relationship public.company_relationships%rowtype;
  v_actor_user_id uuid := public.current_app_user_id();
begin
  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id
   for update;

  if not found then
    raise exception 'Company relationship not found';
  end if;

  if v_relationship.status <> 'invited' then
    raise exception 'Only invited company relationships can be declined';
  end if;

  if not public.current_app_user_can_approve_company_relationship(v_relationship.source_company_id, v_relationship.target_company_id) then
    raise exception 'Not authorized to decline company relationship';
  end if;

  update public.company_relationships
     set status = 'declined',
         declined_by_user_id = v_actor_user_id,
         declined_at = now(),
         notes = coalesce(p_notes, notes)
   where id = p_relationship_id;

  return p_relationship_id;
end;
$$;


ALTER FUNCTION "public"."rpc_company_relationship_decline"("p_relationship_id" "uuid", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_relationship_decline"("p_relationship_id" "uuid", "p_notes" "text") IS 'Phase 8B3 RPC-only target-company decline action.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_relationship_detail"("p_relationship_id" "uuid") RETURNS TABLE("id" "uuid", "source_company_id" "uuid", "source_company_name" "text", "target_company_id" "uuid", "target_company_name" "text", "relationship_type" "text", "relationship_type_label" "text", "status" "text", "settings" "jsonb", "compliance" "jsonb", "notes" "text", "invited_at" timestamp with time zone, "approved_at" timestamp with time zone, "suspended_at" timestamp with time zone, "archived_at" timestamp with time zone, "declined_at" timestamp with time zone, "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  select *
    from public.rpc_company_relationship_list('all', null) listed
   where listed.id = p_relationship_id;

  if not found then
    raise exception 'Company relationship not found or not authorized';
  end if;
end;
$$;


ALTER FUNCTION "public"."rpc_company_relationship_detail"("p_relationship_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_relationship_detail"("p_relationship_id" "uuid") IS 'Phase 8B3 RPC-only relationship detail. Requires current company participation and relationships.read. Relationships do not grant operational visibility.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_relationship_invite"("p_target_company_id" "uuid", "p_relationship_type" "text", "p_settings" "jsonb" DEFAULT '{}'::"jsonb", "p_compliance" "jsonb" DEFAULT '{}'::"jsonb", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_relationship_id uuid;
  v_source_company_id uuid := public.current_company_id();
  v_actor_user_id uuid := public.current_app_user_id();
begin
  if not public.current_app_user_can_invite_company_relationship(p_target_company_id, p_relationship_type) then
    raise exception 'Not authorized to invite company relationship';
  end if;

  insert into public.company_relationships (
    source_company_id,
    target_company_id,
    relationship_type,
    status,
    invited_by_user_id,
    invited_at,
    settings,
    compliance,
    notes
  ) values (
    v_source_company_id,
    p_target_company_id,
    p_relationship_type,
    'invited',
    v_actor_user_id,
    now(),
    coalesce(p_settings, '{}'::jsonb),
    coalesce(p_compliance, '{}'::jsonb),
    p_notes
  )
  returning id into v_relationship_id;

  return v_relationship_id;
end;
$$;


ALTER FUNCTION "public"."rpc_company_relationship_invite"("p_target_company_id" "uuid", "p_relationship_type" "text", "p_settings" "jsonb", "p_compliance" "jsonb", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_relationship_invite"("p_target_company_id" "uuid", "p_relationship_type" "text", "p_settings" "jsonb", "p_compliance" "jsonb", "p_notes" "text") IS 'Phase 8B3 RPC-only invitation entrypoint. Creates an invited directional relationship from current_company_id() to the target company. No order visibility is granted.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_relationship_list"("p_scope" "text" DEFAULT 'all'::"text", "p_status" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "source_company_id" "uuid", "source_company_name" "text", "target_company_id" "uuid", "target_company_name" "text", "relationship_type" "text", "relationship_type_label" "text", "status" "text", "settings" "jsonb", "compliance" "jsonb", "notes" "text", "invited_at" timestamp with time zone, "approved_at" timestamp with time zone, "suspended_at" timestamp with time zone, "archived_at" timestamp with time zone, "declined_at" timestamp with time zone, "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'all'));
  v_company_id uuid := public.current_company_id();
begin
  if v_scope not in ('all', 'incoming', 'outgoing') then
    raise exception 'Invalid relationship list scope: %', p_scope;
  end if;

  if not public.current_app_user_has_current_company()
     or not public.current_app_user_has_permission('relationships.read') then
    raise exception 'Not authorized to list company relationships';
  end if;

  return query
  select
    cr.id,
    cr.source_company_id,
    sc.name as source_company_name,
    cr.target_company_id,
    tc.name as target_company_name,
    cr.relationship_type,
    crt.label as relationship_type_label,
    cr.status,
    cr.settings,
    cr.compliance,
    cr.notes,
    cr.invited_at,
    cr.approved_at,
    cr.suspended_at,
    cr.archived_at,
    cr.declined_at,
    cr.starts_at,
    cr.ends_at,
    cr.created_at,
    cr.updated_at
  from public.company_relationships cr
  join public.companies sc
    on sc.id = cr.source_company_id
  join public.companies tc
    on tc.id = cr.target_company_id
  join public.company_relationship_types crt
    on crt.key = cr.relationship_type
  where public.current_app_user_can_read_company_relationship_row(cr.source_company_id, cr.target_company_id)
    and (p_status is null or cr.status = p_status)
    and (
      v_scope = 'all'
      or (v_scope = 'incoming' and cr.target_company_id = v_company_id)
      or (v_scope = 'outgoing' and cr.source_company_id = v_company_id)
    )
  order by cr.updated_at desc, cr.created_at desc;
end;
$$;


ALTER FUNCTION "public"."rpc_company_relationship_list"("p_scope" "text", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_relationship_list"("p_scope" "text", "p_status" "text") IS 'Phase 8B3 RPC-only relationship list. Returns relationships involving current_company_id() for users with relationships.read. Relationships do not grant order/client/workflow visibility.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_relationship_reactivate"("p_relationship_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_relationship public.company_relationships%rowtype;
begin
  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id
   for update;

  if not found then
    raise exception 'Company relationship not found';
  end if;

  if v_relationship.status <> 'suspended' then
    raise exception 'Only suspended company relationships can be reactivated';
  end if;

  if not public.current_app_user_can_suspend_company_relationship(v_relationship.source_company_id, v_relationship.target_company_id) then
    raise exception 'Not authorized to reactivate company relationship';
  end if;

  update public.company_relationships
     set status = 'active',
         suspended_by_user_id = null,
         suspended_at = null,
         notes = coalesce(p_notes, notes)
   where id = p_relationship_id;

  return p_relationship_id;
end;
$$;


ALTER FUNCTION "public"."rpc_company_relationship_reactivate"("p_relationship_id" "uuid", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_relationship_reactivate"("p_relationship_id" "uuid", "p_notes" "text") IS 'Phase 8B3 RPC-only reactivate action. Reactivation changes relationship lifecycle only and does not alter order/client visibility.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_relationship_suspend"("p_relationship_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_relationship public.company_relationships%rowtype;
  v_actor_user_id uuid := public.current_app_user_id();
begin
  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id
   for update;

  if not found then
    raise exception 'Company relationship not found';
  end if;

  if v_relationship.status <> 'active' then
    raise exception 'Only active company relationships can be suspended';
  end if;

  if not public.current_app_user_can_suspend_company_relationship(v_relationship.source_company_id, v_relationship.target_company_id) then
    raise exception 'Not authorized to suspend company relationship';
  end if;

  update public.company_relationships
     set status = 'suspended',
         suspended_by_user_id = v_actor_user_id,
         suspended_at = now(),
         notes = coalesce(p_notes, notes)
   where id = p_relationship_id;

  return p_relationship_id;
end;
$$;


ALTER FUNCTION "public"."rpc_company_relationship_suspend"("p_relationship_id" "uuid", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_relationship_suspend"("p_relationship_id" "uuid", "p_notes" "text") IS 'Phase 8B3 RPC-only suspend action. Suspension changes relationship lifecycle only and does not alter order/client visibility.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_relationship_target_search"("p_query" "text", "p_relationship_type" "text", "p_limit" integer DEFAULT 10) RETURNS TABLE("company_id" "uuid", "company_name" "text", "company_slug" "text", "company_type" "text", "company_type_label" "text", "relationship_type" "text", "relationship_type_label" "text", "eligible_for_invite" boolean, "current_relationship_status" "text", "blocked_reason" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_query text := btrim(coalesce(p_query, ''));
  v_relationship_type text := btrim(coalesce(p_relationship_type, ''));
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 20);
  v_source_company_id uuid := public.current_company_id();
  v_source_company_type text;
  v_query_uuid uuid;
  v_is_uuid boolean := false;
  v_type record;
begin
  if auth.uid() is null or public.current_app_user_id() is null then
    raise exception 'Not authorized to search company relationship targets';
  end if;

  if not public.current_app_user_has_current_company()
     or not public.current_app_user_has_permission('relationships.invite') then
    raise exception 'Not authorized to search company relationship targets';
  end if;

  if v_relationship_type = '' then
    raise exception 'Relationship type is required';
  end if;

  select crt.key,
         crt.label,
         crt.allowed_source_company_types,
         crt.allowed_target_company_types
    into v_type
    from public.company_relationship_types crt
   where crt.key = v_relationship_type
     and crt.is_active;

  if not found then
    raise exception 'Relationship type is not available';
  end if;

  if v_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_query_uuid := v_query::uuid;
    v_is_uuid := true;
  elsif length(v_query) < 3 then
    raise exception 'Company search query must be at least 3 characters';
  end if;

  select c.company_type
    into v_source_company_type
    from public.companies c
   where c.id = v_source_company_id
     and c.status = 'active';

  if not found then
    raise exception 'Not authorized to search company relationship targets';
  end if;

  return query
  with matched_companies as (
    select
      c.id,
      c.name,
      c.slug,
      c.company_type,
      ct.label as company_type_label,
      case
        when v_is_uuid and c.id = v_query_uuid then 0
        when lower(c.slug) = lower(v_query) then 1
        when lower(c.name) = lower(v_query) then 2
        when c.slug ilike ('%' || v_query || '%') then 3
        else 4
      end as match_rank
    from public.companies c
    left join public.company_types ct
      on ct.key = c.company_type
    where c.status = 'active'
      and c.id <> v_source_company_id
      and (
        (v_is_uuid and c.id = v_query_uuid)
        or lower(c.slug) = lower(v_query)
        or c.name ilike ('%' || v_query || '%')
        or c.slug ilike ('%' || v_query || '%')
      )
  ),
  relationship_status as (
    select distinct on (cr.target_company_id)
      cr.target_company_id,
      cr.status
    from public.company_relationships cr
    join matched_companies mc
      on mc.id = cr.target_company_id
    where cr.source_company_id = v_source_company_id
      and cr.relationship_type = v_relationship_type
    order by cr.target_company_id,
      case cr.status
        when 'active' then 1
        when 'invited' then 2
        when 'suspended' then 3
        when 'declined' then 4
        when 'expired' then 5
        when 'archived' then 6
        else 7
      end,
      cr.updated_at desc
  ),
  evaluated as (
    select
      mc.id,
      mc.name,
      mc.slug,
      mc.company_type,
      mc.company_type_label,
      rs.status as current_status,
      case
        when (
          coalesce(array_length(v_type.allowed_source_company_types, 1), 0) > 0
          and not (v_source_company_type = any(v_type.allowed_source_company_types))
        ) or (
          coalesce(array_length(v_type.allowed_target_company_types, 1), 0) > 0
          and not (mc.company_type = any(v_type.allowed_target_company_types))
        )
          then 'incompatible_company_type'
        when rs.status = 'invited' then 'relationship_already_invited'
        when rs.status = 'active' then 'relationship_already_active'
        when rs.status = 'suspended' then 'relationship_suspended'
        else 'none'
      end as safe_blocked_reason,
      mc.match_rank
    from matched_companies mc
    left join relationship_status rs
      on rs.target_company_id = mc.id
  )
  select
    e.id as company_id,
    e.name as company_name,
    e.slug as company_slug,
    e.company_type,
    e.company_type_label,
    v_type.key::text as relationship_type,
    v_type.label::text as relationship_type_label,
    (e.safe_blocked_reason = 'none') as eligible_for_invite,
    e.current_status as current_relationship_status,
    e.safe_blocked_reason as blocked_reason
  from evaluated e
  order by e.match_rank, lower(e.name), e.id
  limit v_limit;
end;
$_$;


ALTER FUNCTION "public"."rpc_company_relationship_target_search"("p_query" "text", "p_relationship_type" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_relationship_target_search"("p_query" "text", "p_relationship_type" "text", "p_limit" integer) IS 'Phase 8C1A safe target-company discovery for relationship invites. Returns minimal active-company identity and invite eligibility for users with relationships.invite; does not grant relationship, assignment, order, client, activity, calendar, notification, membership, user, settings, billing, or operational visibility. Relationship creation remains controlled by rpc_company_relationship_invite.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_role_permission_preview"() RETURNS TABLE("role_id" "uuid", "role_key" "text", "role_name" "text", "permission_key" "text", "permission_category" "text", "permission_label" "text", "permission_description" "text", "is_owner_only" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_can_read_roles boolean;
  v_can_assign_roles boolean;
  v_can_grant_owner boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  v_can_read_roles := public.current_app_user_has_permission('roles.read');
  if not v_can_read_roles then
    raise exception 'roles_read_permission_required'
      using errcode = '42501';
  end if;

  v_can_assign_roles :=
    public.current_app_user_has_permission('roles.assign')
    and public.current_app_user_has_permission('users.manage_company_access');
  v_can_grant_owner := public.current_app_user_has_permission('users.grant_owner');

  return query
  select
    r.id as role_id,
    trim(both '_' from regexp_replace(lower(trim(r.name)), '[^a-z0-9]+', '_', 'g')) as role_key,
    r.name as role_name,
    p.key as permission_key,
    p.category as permission_category,
    p.label as permission_label,
    p.description as permission_description,
    p.is_owner_only
  from public.roles r
  join public.role_permissions rp
    on rp.role_id = r.id
  join public.permissions p
    on p.key = rp.permission_key
  where r.company_id is null
    and r.is_template = true
    and r.is_system = true
    and (
      case
        when r.is_owner_role or lower(r.name) = 'owner' then v_can_grant_owner
        else v_can_assign_roles
      end
    )
  order by
    case lower(r.name)
      when 'owner' then 1
      when 'admin' then 2
      when 'appraiser' then 3
      when 'reviewer' then 4
      when 'billing' then 5
      else 99
    end,
    r.name,
    p.category,
    p.label;
end;
$$;


ALTER FUNCTION "public"."rpc_company_role_permission_preview"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_role_permission_preview"() IS 'Read-only current-company role preset permission preview for access editing. Returns human-readable template role permission labels only; does not expose member-specific overrides or mutate access.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_role_preset_list"() RETURNS TABLE("role_id" "uuid", "role_key" "text", "role_name" "text", "description" "text", "is_owner_role" boolean, "is_system" boolean, "is_template" boolean, "active_assignment_count" integer, "permission_count" integer, "owner_only_permission_count" integer, "assignable_by_current_user" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_can_read_roles boolean;
  v_can_assign_roles boolean;
  v_can_grant_owner boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  v_can_read_roles := public.current_app_user_has_permission('roles.read');
  if not v_can_read_roles then
    raise exception 'roles_read_permission_required'
      using errcode = '42501';
  end if;

  v_can_assign_roles :=
    public.current_app_user_has_permission('roles.assign')
    and public.current_app_user_has_permission('users.manage_company_access');
  v_can_grant_owner := public.current_app_user_has_permission('users.grant_owner');

  return query
  select
    r.id as role_id,
    trim(both '_' from regexp_replace(lower(trim(r.name)), '[^a-z0-9]+', '_', 'g')) as role_key,
    r.name as role_name,
    r.description,
    r.is_owner_role,
    r.is_system,
    r.is_template,
    coalesce(assignment_counts.active_assignment_count, 0)::integer as active_assignment_count,
    coalesce(permission_counts.permission_count, 0)::integer as permission_count,
    coalesce(permission_counts.owner_only_permission_count, 0)::integer as owner_only_permission_count,
    case
      when r.is_owner_role or lower(r.name) = 'owner' then v_can_grant_owner
      else v_can_assign_roles
    end as assignable_by_current_user
  from public.roles r
  left join lateral (
    select count(*)::integer as active_assignment_count
      from public.user_role_assignments ura
     where ura.company_id = v_company_id
       and ura.role_id = r.id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
  ) assignment_counts on true
  left join lateral (
    select
      count(*)::integer as permission_count,
      count(*) filter (where p.is_owner_only)::integer as owner_only_permission_count
      from public.role_permissions rp
      join public.permissions p
        on p.key = rp.permission_key
     where rp.role_id = r.id
  ) permission_counts on true
  where r.company_id is null
    and r.is_template = true
    and r.is_system = true
  order by
    case lower(r.name)
      when 'owner' then 1
      when 'admin' then 2
      when 'appraiser' then 3
      when 'reviewer' then 4
      when 'billing' then 5
      else 99
    end,
    r.name;
end;
$$;


ALTER FUNCTION "public"."rpc_company_role_preset_list"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_role_preset_list"() IS 'Phase 8C5E1 safe template role preset projection. Returns template role summaries and aggregate counts only; no raw permission arrays or custom role editing.';



CREATE OR REPLACE FUNCTION "public"."rpc_company_setup_context"() RETURNS TABLE("company_id" "uuid", "company_slug" "text", "company_name" "text", "company_type" "text", "company_status" "text", "timezone" "text", "locale" "text", "active_company_claim_id" "uuid", "active_company_context_valid" boolean, "profile_complete" boolean, "owner_invariant_ok" boolean, "active_owner_count" integer, "active_member_count" integer, "active_role_assignment_count" integer, "role_presets_ready" boolean, "owner_role_ready" boolean, "relationship_readiness" "jsonb", "assignment_readiness" "jsonb", "dashboard_readiness" "jsonb", "audit_readiness" "jsonb", "setup_complete" boolean, "setup_blockers" "jsonb", "checklist" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_app_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company public.companies%rowtype;
  v_claim_company_id uuid;
  v_has_current_membership boolean;
  v_has_setup_read boolean;
  v_profile_complete boolean;
  v_owner_count integer;
  v_member_count integer;
  v_role_assignment_count integer;
  v_owner_role_ready boolean;
  v_role_presets_ready boolean;
  v_relationship_readiness jsonb;
  v_assignment_readiness jsonb;
  v_dashboard_readiness jsonb;
  v_audit_readiness jsonb;
  v_owner_invariant_ok boolean;
  v_setup_complete boolean;
  v_blockers text[] := array[]::text[];
  v_checklist jsonb;
  v_active_relationship_count integer;
  v_can_relationship_read boolean;
  v_can_relationship_invite boolean;
  v_can_relationship_assign_work boolean;
  v_can_assignment_read_owner boolean;
  v_can_assignment_read_assigned boolean;
  v_can_assignment_offer boolean;
  v_can_assignment_respond boolean;
  v_order_dashboard_ready boolean;
  v_assignment_dashboard_ready boolean;
  v_has_bootstrap_audit boolean;
  v_has_active_company_switch_audit boolean;
begin
  if v_app_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.*
    into v_company
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company.status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  v_has_setup_read := public.current_app_user_has_permission('company.setup.read');
  if not v_has_setup_read then
    raise exception 'setup_read_permission_missing'
      using errcode = '42501';
  end if;

  with jwt_claims as (
    select coalesce(auth.jwt(), '{}'::jsonb) as claims
  ),
  raw_claim as (
    select coalesce(
      claims #>> '{app_metadata,active_company_id}',
      claims #>> '{app_metadata,current_company_id}',
      claims ->> 'active_company_id',
      claims ->> 'current_company_id'
    ) as value
    from jwt_claims
  )
  select case
    when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then value::uuid
    else null::uuid
  end
    into v_claim_company_id
    from raw_claim;

  v_has_current_membership := public.current_app_user_has_company(v_company_id);
  v_profile_complete :=
    nullif(trim(v_company.slug), '') is not null
    and nullif(trim(v_company.name), '') is not null
    and nullif(trim(v_company.company_type), '') is not null
    and nullif(trim(v_company.timezone), '') is not null
    and nullif(trim(v_company.locale), '') is not null;

  select public.company_active_owner_count(v_company_id)
    into v_owner_count;

  select count(*)::integer
    into v_member_count
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.status = 'active';

  select count(*)::integer
    into v_role_assignment_count
    from public.user_role_assignments ura
   where ura.company_id = v_company_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now());

  select exists (
    select 1
      from public.roles r
      join public.role_permissions rp
        on rp.role_id = r.id
       and rp.permission_key = 'company.setup.read'
     where r.company_id is null
       and lower(r.name) = 'owner'
       and r.is_owner_role = true
  )
    into v_owner_role_ready;

  with expected_roles(role_name) as (
    values ('owner'), ('admin'), ('appraiser'), ('reviewer'), ('billing')
  )
  select not exists (
    select 1
      from expected_roles er
     where not exists (
       select 1
         from public.roles r
        where r.company_id is null
          and lower(r.name) = er.role_name
          and r.is_template = true
          and r.is_system = true
     )
  )
  and exists (
    select 1
      from public.roles r
      join public.role_permissions rp
        on rp.role_id = r.id
     where r.company_id is null
       and lower(r.name) = 'admin'
       and rp.permission_key = 'company.setup.read'
  )
    into v_role_presets_ready;

  v_can_relationship_read := public.current_app_user_has_permission('relationships.read');
  v_can_relationship_invite := public.current_app_user_has_permission('relationships.invite');
  v_can_relationship_assign_work := public.current_app_user_has_permission('relationships.assign_work');

  select count(*)::integer
    into v_active_relationship_count
    from public.company_relationships cr
   where cr.status = 'active'
     and v_company_id in (cr.source_company_id, cr.target_company_id);

  v_relationship_readiness := jsonb_build_object(
    'enabled', to_regclass('public.company_relationships') is not null,
    'can_read', v_can_relationship_read,
    'can_invite', v_can_relationship_invite,
    'can_assign_work', v_can_relationship_assign_work,
    'active_relationship_count', v_active_relationship_count
  );

  v_can_assignment_read_owner := public.current_app_user_has_permission('order_company_assignments.read_owner');
  v_can_assignment_read_assigned := public.current_app_user_has_permission('order_company_assignments.read_assigned');
  v_can_assignment_offer := public.current_app_user_has_permission('order_company_assignments.offer');
  v_can_assignment_respond := public.current_app_user_has_permission('order_company_assignments.respond');

  v_assignment_readiness := jsonb_build_object(
    'enabled', to_regclass('public.order_company_assignments') is not null,
    'can_read_owner_packets', v_can_assignment_read_owner,
    'can_read_assigned_packets', v_can_assignment_read_assigned,
    'can_offer', v_can_assignment_offer,
    'can_respond', v_can_assignment_respond,
    'requires_active_relationship', true
  );

  v_order_dashboard_ready :=
    public.current_app_user_has_permission('navigation.dashboard.view')
    and (
      public.current_app_user_has_permission('orders.read.all')
      or public.current_app_user_has_permission('orders.read.assigned')
    );

  v_assignment_dashboard_ready :=
    v_can_assignment_read_owner
    or v_can_assignment_read_assigned;

  v_dashboard_readiness := jsonb_build_object(
    'order_dashboard_ready', v_order_dashboard_ready,
    'assignment_dashboard_ready', v_assignment_dashboard_ready,
    'has_any_dashboard', v_order_dashboard_ready or v_assignment_dashboard_ready
  );

  select exists (
    select 1
      from public.company_audit_events cae
     where cae.company_id = v_company_id
       and cae.event_type = 'company.bootstrap.completed'
  )
    into v_has_bootstrap_audit;

  select exists (
    select 1
      from public.company_audit_events cae
     where cae.company_id = v_company_id
       and cae.event_type = 'company.active_company_changed'
  )
    into v_has_active_company_switch_audit;

  v_audit_readiness := jsonb_build_object(
    'enabled', to_regclass('public.company_audit_events') is not null,
    'has_bootstrap_audit', v_has_bootstrap_audit,
    'has_active_company_switch_audit', v_has_active_company_switch_audit
  );

  v_owner_invariant_ok := v_owner_count > 0;

  if not v_profile_complete then
    v_blockers := array_append(v_blockers, 'company_profile_incomplete');
  end if;

  if v_owner_count < 1 then
    v_blockers := array_append(v_blockers, 'active_owner_missing');
  end if;

  if not v_owner_role_ready then
    v_blockers := array_append(v_blockers, 'owner_role_template_missing');
  end if;

  if v_owner_count < 1 or not v_owner_role_ready then
    v_blockers := array_append(v_blockers, 'owner_role_assignment_missing');
  end if;

  if not v_role_presets_ready then
    v_blockers := array_append(v_blockers, 'role_presets_incomplete');
  end if;

  if not (v_order_dashboard_ready or v_assignment_dashboard_ready) then
    v_blockers := array_append(v_blockers, 'dashboard_unavailable');
  end if;

  v_setup_complete :=
    v_profile_complete
    and v_owner_invariant_ok
    and v_owner_role_ready
    and v_role_presets_ready
    and (v_order_dashboard_ready or v_assignment_dashboard_ready);

  v_checklist := jsonb_build_array(
    jsonb_build_object(
      'key', 'active_company_context',
      'label', 'Active company context',
      'required', true,
      'ready', v_has_current_membership,
      'status', case when v_has_current_membership then 'complete' else 'blocked' end,
      'blockers', case when v_has_current_membership then '[]'::jsonb else jsonb_build_array('current_company_membership_required') end
    ),
    jsonb_build_object(
      'key', 'company_profile',
      'label', 'Company profile',
      'required', true,
      'ready', v_profile_complete,
      'status', case when v_profile_complete then 'complete' else 'blocked' end,
      'blockers', case when v_profile_complete then '[]'::jsonb else jsonb_build_array('company_profile_incomplete') end
    ),
    jsonb_build_object(
      'key', 'owner_protection',
      'label', 'Owner protection',
      'required', true,
      'ready', v_owner_invariant_ok,
      'status', case when v_owner_invariant_ok then 'complete' else 'blocked' end,
      'blockers', case when v_owner_invariant_ok then '[]'::jsonb else jsonb_build_array('active_owner_missing') end
    ),
    jsonb_build_object(
      'key', 'team_foundation',
      'label', 'Team foundation',
      'required', true,
      'ready', v_member_count > 0,
      'status', case when v_member_count > 0 then 'complete' else 'blocked' end,
      'blockers', case when v_member_count > 0 then '[]'::jsonb else jsonb_build_array('current_company_membership_required') end
    ),
    jsonb_build_object(
      'key', 'role_presets',
      'label', 'Role presets',
      'required', true,
      'ready', v_role_presets_ready,
      'status', case when v_role_presets_ready then 'complete' else 'blocked' end,
      'blockers', case when v_role_presets_ready then '[]'::jsonb else jsonb_build_array('role_presets_incomplete') end
    ),
    jsonb_build_object(
      'key', 'relationship_readiness',
      'label', 'Relationship readiness',
      'required', false,
      'ready', (v_relationship_readiness ->> 'enabled')::boolean,
      'status', case when (v_relationship_readiness ->> 'enabled')::boolean then 'complete' else 'blocked' end,
      'blockers', '[]'::jsonb
    ),
    jsonb_build_object(
      'key', 'assignment_readiness',
      'label', 'Assignment readiness',
      'required', false,
      'ready', (v_assignment_readiness ->> 'enabled')::boolean,
      'status', case when (v_assignment_readiness ->> 'enabled')::boolean then 'complete' else 'blocked' end,
      'blockers', '[]'::jsonb
    ),
    jsonb_build_object(
      'key', 'dashboard_readiness',
      'label', 'Dashboard readiness',
      'required', true,
      'ready', v_order_dashboard_ready or v_assignment_dashboard_ready,
      'status', case when v_order_dashboard_ready or v_assignment_dashboard_ready then 'complete' else 'blocked' end,
      'blockers', case when v_order_dashboard_ready or v_assignment_dashboard_ready then '[]'::jsonb else jsonb_build_array('dashboard_unavailable') end
    ),
    jsonb_build_object(
      'key', 'audit_readiness',
      'label', 'Audit readiness',
      'required', true,
      'ready', (v_audit_readiness ->> 'enabled')::boolean,
      'status', case when (v_audit_readiness ->> 'enabled')::boolean then 'complete' else 'blocked' end,
      'blockers', '[]'::jsonb
    )
  );

  return query
  select
    v_company.id,
    v_company.slug,
    v_company.name,
    v_company.company_type,
    v_company.status,
    v_company.timezone,
    v_company.locale,
    v_claim_company_id,
    v_has_current_membership and v_company.status = 'active',
    v_profile_complete,
    v_owner_invariant_ok,
    v_owner_count,
    v_member_count,
    v_role_assignment_count,
    v_role_presets_ready,
    v_owner_role_ready,
    v_relationship_readiness,
    v_assignment_readiness,
    v_dashboard_readiness,
    v_audit_readiness,
    v_setup_complete,
    to_jsonb(v_blockers),
    v_checklist;
end;
$_$;


ALTER FUNCTION "public"."rpc_company_setup_context"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_company_setup_context"() IS 'Phase 8C5D safe active-company setup checklist context. Returns current-company aggregates and readiness booleans only; does not expose raw company membership, roles, permissions, operational orders, clients, assignments, relationship details, or audit rows.';



CREATE OR REPLACE FUNCTION "public"."rpc_create_calendar_event"("p_event_type" "text", "p_title" "text", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_order_id" "uuid" DEFAULT NULL::"uuid", "p_appraiser_id" "uuid" DEFAULT NULL::"uuid", "p_location" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
      declare
        v_id uuid;
        v_company_id uuid;
      begin
        select o.company_id
          into v_company_id
          from public.orders o
         where o.id = p_order_id
         limit 1;

        v_company_id := coalesce(v_company_id, public.default_company_id());

        insert into public.calendar_events (
          event_type,
          title,
          start_at,
          end_at,
          order_id,
          appraiser_id,
          location,
          notes,
          company_id
        ) values (
          p_event_type,
          p_title,
          p_start_at,
          coalesce(p_end_at, p_start_at),
          p_order_id,
          p_appraiser_id,
          p_location,
          p_notes,
          v_company_id
        )
        returning id into v_id;

        return v_id;
      end;
      $$;


ALTER FUNCTION "public"."rpc_create_calendar_event"("p_event_type" "text", "p_title" "text", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_order_id" "uuid", "p_appraiser_id" "uuid", "p_location" "text", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_create_calendar_event"("p_event_type" "text", "p_title" "text", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_order_id" "uuid", "p_appraiser_id" "uuid", "p_location" "text", "p_notes" "text") IS 'Creates calendar projection events with company scope derived server-side from the source order, falling back to falcon_default.';



CREATE OR REPLACE FUNCTION "public"."rpc_create_client"("patch" "jsonb") RETURNS "public"."clients"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r public.clients;
begin
  if not public.current_app_user_can_create_client() then
    raise exception 'clients.create permission is required to create clients';
  end if;

  insert into public.clients (name, status)
  values (
    nullif(patch->>'name', ''),
    coalesce(nullif(patch->>'status', ''), 'active')
  )
  returning * into r;

  return r;
end;
$$;


ALTER FUNCTION "public"."rpc_create_client"("patch" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_create_client"("patch" "jsonb") IS 'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_create_client(). Prefer direct table writes for active frontend paths.';



CREATE OR REPLACE FUNCTION "public"."rpc_create_order"("payload" "jsonb") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_client_id bigint;
  v_managing_amc_id bigint;
  v_client_contact_id bigint;
  v_client_contact public.client_contacts%rowtype;
  v_manual text;
  v_appraiser uuid;
  v_reviewer uuid;
  v_split numeric;
  v_entry_contact_name text;
  v_entry_contact_phone text;
  v_property_contact_name text;
  v_property_contact_phone text;
  v_company_id uuid;
  v_order_number text;
  v_row public.orders;
begin
  if not public.current_app_user_can_create_order() then
    raise exception 'not authorized to create orders'
      using errcode = '42501';
  end if;

  v_client_id := nullif(payload->>'client_id', '')::bigint;
  v_managing_amc_id := nullif(payload->>'managing_amc_id', '')::bigint;
  v_client_contact_id := nullif(payload->>'client_contact_id', '')::bigint;
  v_manual := coalesce(
    nullif(payload->>'manual_client', ''),
    nullif(payload->>'manual_client_name', '')
  );
  v_appraiser := nullif(payload->>'appraiser_id', '')::uuid;
  v_reviewer := nullif(payload->>'reviewer_id', '')::uuid;
  v_split := nullif(coalesce(payload->>'split_pct', payload->>'split_percent', payload->>'appraiser_split'), '')::numeric;
  v_entry_contact_name := nullif(coalesce(payload->>'entry_contact_name', payload->>'property_contact_name'), '');
  v_entry_contact_phone := nullif(coalesce(payload->>'entry_contact_phone', payload->>'property_contact_phone'), '');
  v_property_contact_name := nullif(coalesce(payload->>'property_contact_name', payload->>'entry_contact_name'), '');
  v_property_contact_phone := nullif(coalesce(payload->>'property_contact_phone', payload->>'entry_contact_phone'), '');
  v_company_id := public.current_company_id();

  if v_client_id is not null
     and not public.current_app_user_can_attach_order_client(v_client_id) then
    raise exception 'client_id % is not attachable to orders in the current company', v_client_id
      using errcode = '42501';
  end if;

  if v_managing_amc_id is not null
     and not public.current_app_user_can_attach_order_amc(v_managing_amc_id) then
    raise exception 'managing_amc_id % is not an attachable current-company AMC client', v_managing_amc_id
      using errcode = '42501';
  end if;

  if v_client_contact_id is not null then
    if v_client_id is null then
      raise exception 'client_contact_requires_client'
        using errcode = '22023';
    end if;

    select *
      into v_client_contact
      from public.client_contacts cc
     where cc.id = v_client_contact_id
       and cc.company_id = v_company_id
       and cc.client_id = v_client_id
       and cc.status = 'active';

    if not found then
      raise exception 'client_contact_not_found'
        using errcode = 'P0002';
    end if;
  end if;

  v_order_number := public.next_order_number_v2(v_company_id, now());

  insert into public.orders (
    client_id, managing_amc_id, client_contact_id,
    client_contact_name, client_contact_title, client_contact_email, client_contact_phone,
    manual_client, manual_client_name, appraiser_id, reviewer_id, order_number,
    property_address, city, state, postal_code, property_type, report_type,
    base_fee, appraiser_fee, split_pct, appraiser_split,
    entry_contact_name, entry_contact_phone, property_contact_name, property_contact_phone,
    access_notes, special_instructions, notes,
    site_visit_at, review_due_at, final_due_at,
    status, created_at, updated_at
  ) values (
    v_client_id, v_managing_amc_id, v_client_contact_id,
    v_client_contact.name, v_client_contact.title, v_client_contact.email, v_client_contact.phone,
    v_manual, v_manual, v_appraiser, v_reviewer, v_order_number,
    nullif(payload->>'property_address',''), nullif(payload->>'city',''), nullif(payload->>'state',''), nullif(payload->>'postal_code',''),
    nullif(payload->>'property_type',''), nullif(payload->>'report_type',''),
    nullif(payload->>'base_fee','')::numeric,
    nullif(payload->>'appraiser_fee','')::numeric,
    v_split,
    v_split,
    v_entry_contact_name,
    v_entry_contact_phone,
    v_property_contact_name,
    v_property_contact_phone,
    nullif(payload->>'access_notes',''),
    nullif(coalesce(payload->>'special_instructions', payload->>'notes'), ''),
    nullif(payload->>'notes',''),
    nullif(payload->>'site_visit_at','')::timestamp,
    nullif(coalesce(payload->>'review_due_at', payload->>'review_due_date'),'')::timestamptz,
    nullif(coalesce(payload->>'final_due_at', payload->>'final_due_date'),'')::timestamptz,
    coalesce(nullif(payload->>'status',''),'new'),
    now(), now()
  )
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_create_order"("payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_create_order"("payload" "jsonb") IS 'Guarded order creation RPC. Generates order number server-side, snapshots selected client relationship contact fields, and persists order intake/report/due date fields from payload.';



CREATE OR REPLACE FUNCTION "public"."rpc_current_company_context"() RETURNS TABLE("auth_user_id" "uuid", "app_user_id" "uuid", "active_company_claim_id" "uuid", "current_company_id" "uuid", "has_current_company_membership" boolean, "permission_count" integer, "role_assignments" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  with jwt_claims as (
    select coalesce(auth.jwt(), '{}'::jsonb) as claims
  ),
  raw_claim as (
    select coalesce(
      claims #>> '{app_metadata,active_company_id}',
      claims #>> '{app_metadata,current_company_id}',
      claims ->> 'active_company_id',
      claims ->> 'current_company_id'
    ) as value
    from jwt_claims
  ),
  claimed_company as (
    select case
      when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then value::uuid
      else null::uuid
    end as company_id
    from raw_claim
  ),
  ctx as (
    select
      auth.uid() as auth_user_id,
      public.current_app_user_id() as app_user_id,
      (select company_id from claimed_company limit 1) as active_company_claim_id,
      public.current_company_id() as current_company_id
  ),
  permissions as (
    select count(*)::integer as permission_count
    from public.current_app_user_permission_keys() p(permission_key)
  ),
  roles as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'assignment_id', ura.id,
          'role_id', r.id,
          'role_name', r.name,
          'status', ura.status,
          'is_primary', ura.is_primary,
          'expires_at', ura.expires_at
        )
        order by ura.is_primary desc, r.name
      ),
      '[]'::jsonb
    ) as role_assignments
    from ctx
    join public.user_role_assignments ura
      on ura.user_id = ctx.app_user_id
     and ura.company_id = ctx.current_company_id
    join public.roles r
      on r.id = ura.role_id
  )
  select
    ctx.auth_user_id,
    ctx.app_user_id,
    ctx.active_company_claim_id,
    ctx.current_company_id,
    public.current_app_user_has_company(ctx.current_company_id) as has_current_company_membership,
    permissions.permission_count,
    roles.role_assignments
  from ctx
  cross join permissions
  cross join roles;
$_$;


ALTER FUNCTION "public"."rpc_current_company_context"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_current_company_context"() IS 'Diagnostic Slice 7A RPC for explaining active-company resolution, membership, permission count, and role assignments. This is observability only and does not enforce tenant isolation.';



CREATE OR REPLACE FUNCTION "public"."rpc_current_user_app_context"() RETURNS TABLE("user_id" "uuid", "current_company_id" "uuid", "company_name" "text", "company_slug" "text", "has_current_company_membership" boolean, "display_name" "text", "full_name" "text", "email" "text", "avatar_url" "text", "display_color" "text", "role_assignments" "jsonb", "role_keys" "text"[], "primary_role_key" "text", "is_owner" boolean, "is_admin_role" boolean, "is_reviewer_role" boolean, "is_appraiser_role" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := public.current_app_user_id();
begin
  if v_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = 'P0001',
            hint = 'An authenticated app user is required.';
  end if;

  return query
  with ctx as (
    select
      v_user_id as app_user_id,
      public.current_company_id() as resolved_company_id
  ),
  app_user as (
    select
      u.id,
      u.email,
      coalesce(nullif(trim(u.display_name), ''), nullif(trim(u.full_name), ''), nullif(trim(u.name), ''), u.email) as display_name,
      nullif(trim(u.full_name), '') as full_name,
      u.avatar_url,
      coalesce(nullif(trim(u.display_color), ''), nullif(trim(u.color), '')) as display_color
    from public.users u
    join ctx on ctx.app_user_id = u.id
  ),
  active_company as (
    select
      c.id,
      c.name,
      c.slug
    from ctx
    join public.companies c
      on c.id = ctx.resolved_company_id
     and c.status = 'active'
    where public.current_app_user_has_company(ctx.resolved_company_id)
  ),
  active_roles as (
    select
      ura.id as role_assignment_id,
      r.id as role_id,
      regexp_replace(lower(trim(r.name)), '[^a-z0-9]+', '_', 'g') as role_key,
      r.name as role_name,
      r.name as role_display_name,
      ura.is_primary,
      r.is_owner_role,
      case lower(trim(r.name))
        when 'owner' then 1
        when 'admin' then 2
        when 'reviewer' then 3
        when 'appraiser' then 4
        when 'billing' then 5
        else 99
      end as role_order
    from ctx
    join active_company ac on true
    join public.user_role_assignments ura
      on ura.user_id = ctx.app_user_id
     and ura.company_id = ac.id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
    join public.roles r
      on r.id = ura.role_id
     and r.company_id is null
     and r.is_template = true
     and r.is_system = true
  ),
  ordered_role_keys as (
    select array_agg(role_key order by role_order, role_key) as keys
    from (
      select distinct role_key, role_order
      from active_roles
      where role_key is not null and role_key <> ''
    ) roles
  ),
  role_summary as (
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'role_assignment_id', ar.role_assignment_id,
            'role_id', ar.role_id,
            'role_key', ar.role_key,
            'role_name', ar.role_name,
            'display_name', ar.role_display_name,
            'is_primary', ar.is_primary
          )
          order by ar.is_primary desc, ar.role_order, ar.role_name
        ),
        '[]'::jsonb
      ) as assignments,
      coalesce((select keys from ordered_role_keys), array[]::text[]) as keys,
      (
        select ar.role_key
        from active_roles ar
        order by ar.is_primary desc, ar.role_order, ar.role_name
        limit 1
      ) as primary_key,
      coalesce(bool_or(ar.is_owner_role or ar.role_key = 'owner'), false) as has_owner,
      coalesce(bool_or(ar.role_key = any (array['owner', 'admin'])), false) as has_admin,
      coalesce(bool_or(ar.role_key = 'reviewer'), false) as has_reviewer,
      coalesce(bool_or(ar.role_key = 'appraiser'), false) as has_appraiser
    from active_roles ar
  )
  select
    au.id as user_id,
    ac.id as current_company_id,
    ac.name as company_name,
    ac.slug as company_slug,
    (ac.id is not null) as has_current_company_membership,
    au.display_name,
    au.full_name,
    au.email,
    au.avatar_url,
    au.display_color,
    coalesce(rs.assignments, '[]'::jsonb) as role_assignments,
    coalesce(rs.keys, array[]::text[]) as role_keys,
    rs.primary_key as primary_role_key,
    coalesce(rs.has_owner, false) as is_owner,
    coalesce(rs.has_admin, false) as is_admin_role,
    coalesce(rs.has_reviewer, false) as is_reviewer_role,
    coalesce(rs.has_appraiser, false) as is_appraiser_role
  from app_user au
  left join active_company ac on true
  left join role_summary rs on true;
end;
$$;


ALTER FUNCTION "public"."rpc_current_user_app_context"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_current_user_app_context"() IS 'Phase 8C5J1 stable UI context for the current app user and active company. Returns safe profile fields and display-only normalized role labels for the resolved current company; does not expose permission keys, auth ids, legacy public.users.role, or public.user_roles.';



CREATE OR REPLACE FUNCTION "public"."rpc_current_user_notification_preference_update"("p_event_key" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("event_key" "text", "channel" "text", "effective_enabled" boolean, "locked" boolean, "lock_reason" "text", "default_enabled" boolean, "user_override" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := public.current_app_user_id();
  v_event_key text := btrim(coalesce(p_event_key, ''));
  v_channel text := lower(btrim(coalesce(p_channel, '')));
  v_locked boolean;
begin
  if v_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_event_key = '' or not exists (
    select 1 from public.notification_policies np
     where np.key = v_event_key
       and np.key not like 'locks.%'
       and np.key not like 'defaults.%'
  ) then
    raise exception 'unknown_notification_event'
      using errcode = '22023';
  end if;

  if v_channel not in ('in_app', 'email') then
    raise exception 'invalid_notification_channel'
      using errcode = '22023';
  end if;

  select prefs.locked
    into v_locked
    from public.rpc_current_user_notification_preferences_get() prefs
   where prefs.event_key = v_event_key
     and prefs.channel = v_channel;

  if coalesce(v_locked, false) and not coalesce(p_enabled, false) then
    raise exception 'notification_preference_locked'
      using errcode = '42501';
  end if;

  insert into public.user_notification_prefs (user_id, type, channel, enabled, meta)
  values (v_user_id, v_event_key, v_channel, coalesce(p_enabled, false), p_meta)
  on conflict (user_id, type, channel)
  do update set
    enabled = excluded.enabled,
    meta = coalesce(excluded.meta, public.user_notification_prefs.meta);

  return query
  select *
    from public.rpc_current_user_notification_preferences_get() prefs
   where prefs.event_key = v_event_key
     and prefs.channel = v_channel;
end;
$$;


ALTER FUNCTION "public"."rpc_current_user_notification_preference_update"("p_event_key" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_current_user_notification_preference_update"("p_event_key" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb") IS 'Updates the current public.users.id-scoped event/channel notification preference. Disabling locked policy-required preferences is rejected.';



CREATE OR REPLACE FUNCTION "public"."rpc_current_user_notification_preferences_get"() RETURNS TABLE("event_key" "text", "channel" "text", "effective_enabled" boolean, "locked" boolean, "lock_reason" "text", "default_enabled" boolean, "user_override" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with ctx as (
    select
      public.current_app_user_id() as user_id,
      public.current_app_user_notification_role_keys() as role_keys
  ),
  policy_rows as (
    select
      np.key,
      jsonb_set(coalesce(np.rules, '{}'::jsonb), '{event_key}', to_jsonb(np.key), true) as rules
      from public.notification_policies np
     where np.key not like 'locks.%'
       and np.key not like 'defaults.%'
  ),
  expanded as (
    select
      p.key as event_key,
      channel.channel,
      state.default_enabled,
      state.locked,
      state.lock_reason
      from policy_rows p
      cross join (values ('in_app'::text), ('email'::text)) channel(channel)
      cross join ctx
      cross join lateral public.notification_policy_channel_state(
        p.rules,
        ctx.role_keys,
        channel.channel
      ) state
  )
  select
    expanded.event_key,
    expanded.channel,
    case
      when expanded.locked then true
      else coalesce(up.enabled, expanded.default_enabled)
    end as effective_enabled,
    expanded.locked,
    expanded.lock_reason,
    expanded.default_enabled,
    up.enabled as user_override
    from expanded
    cross join ctx
    left join public.user_notification_prefs up
      on up.user_id = ctx.user_id
     and up.type = expanded.event_key
     and up.channel = expanded.channel
   where ctx.user_id is not null
   order by expanded.event_key, expanded.channel;
$$;


ALTER FUNCTION "public"."rpc_current_user_notification_preferences_get"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_current_user_notification_preferences_get"() IS 'Returns current public.users.id-scoped effective notification preferences by event/channel, merging notification_policies defaults, user_notification_prefs overrides, and policy locks.';



CREATE OR REPLACE FUNCTION "public"."rpc_current_user_settings_get"() RETURNS TABLE("user_id" "uuid", "email" "text", "display_name" "text", "full_name" "text", "phone" "text", "avatar_url" "text", "display_color" "text", "color" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_app_user_id uuid := public.current_app_user_id();
begin
  if v_app_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  return query
  select
    u.id as user_id,
    u.email,
    u.display_name,
    u.full_name,
    u.phone,
    u.avatar_url,
    u.display_color,
    u.color
  from public.users u
  where u.id = v_app_user_id;
end;
$$;


ALTER FUNCTION "public"."rpc_current_user_settings_get"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_current_user_settings_get"() IS 'Phase 8C5I1 safe current-user settings read projection. Returns allowlisted profile/account display fields for current_app_user_id only.';



CREATE OR REPLACE FUNCTION "public"."rpc_current_user_settings_update"("p_patch" "jsonb") RETURNS TABLE("user_id" "uuid", "email" "text", "display_name" "text", "full_name" "text", "phone" "text", "avatar_url" "text", "display_color" "text", "color" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_app_user_id uuid := public.current_app_user_id();
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_display_name text;
  v_full_name text;
  v_phone text;
  v_avatar_url text;
  v_color text;
begin
  if v_app_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_patch ? 'display_name' then
    v_display_name := nullif(trim(coalesce(v_patch->>'display_name', '')), '');
  end if;

  if v_patch ? 'full_name' then
    v_full_name := nullif(trim(coalesce(v_patch->>'full_name', '')), '');
  end if;

  if v_patch ? 'phone' then
    v_phone := nullif(trim(coalesce(v_patch->>'phone', '')), '');
  end if;

  if v_patch ? 'avatar_url' then
    v_avatar_url := nullif(trim(coalesce(v_patch->>'avatar_url', '')), '');
  end if;

  if v_patch ? 'display_color' then
    v_color := nullif(trim(coalesce(v_patch->>'display_color', '')), '');
  elsif v_patch ? 'color' then
    v_color := nullif(trim(coalesce(v_patch->>'color', '')), '');
  end if;

  if v_color is not null and v_color !~* '^#[0-9a-f]{6}$' then
    raise exception 'invalid_profile_color'
      using errcode = '22023';
  end if;

  update public.users u
     set display_name = case when v_patch ? 'display_name' then v_display_name else u.display_name end,
         full_name = case when v_patch ? 'full_name' then v_full_name else u.full_name end,
         phone = case when v_patch ? 'phone' then v_phone else u.phone end,
         avatar_url = case when v_patch ? 'avatar_url' then v_avatar_url else u.avatar_url end,
         display_color = case when (v_patch ? 'display_color') or (v_patch ? 'color') then v_color else u.display_color end,
         color = case when (v_patch ? 'display_color') or (v_patch ? 'color') then v_color else u.color end,
         updated_at = now()
   where u.id = v_app_user_id;

  if not found then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  return query
  select
    u.id as user_id,
    u.email,
    u.display_name,
    u.full_name,
    u.phone,
    u.avatar_url,
    u.display_color,
    u.color
  from public.users u
  where u.id = v_app_user_id;
end;
$_$;


ALTER FUNCTION "public"."rpc_current_user_settings_update"("p_patch" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_current_user_settings_update"("p_patch" "jsonb") IS 'Phase 8C5I1 safe current-user settings update RPC. Updates only allowlisted current-user display/profile fields, keeps color/display_color synced, and does not update role/status/permissions/company authority.';



CREATE OR REPLACE FUNCTION "public"."rpc_debug_notifications_access"() RETURNS TABLE("ok" boolean, "rows_seen" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception using
    errcode = '55000',
    message = 'rpc_debug_notifications_access is deprecated/quarantined',
    hint = 'Use catalog checks and tenant-safe notification RPC validation instead.';
end;
$$;


ALTER FUNCTION "public"."rpc_debug_notifications_access"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_debug_notifications_access"() IS 'Slice 7G2A quarantine. Deprecated debug RPC; app-role execute revoked and body raises an exception.';



CREATE OR REPLACE FUNCTION "public"."rpc_delete_client"("client_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_client public.clients%rowtype;
begin
  select *
    into v_client
    from public.clients c
   where c.id = $1
   for update;

  if not found then
    raise exception 'Client not found';
  end if;

  if not public.current_app_user_can_delete_client_row(v_client.company_id, v_client.id) then
    raise exception 'clients.delete permission is required to delete clients';
  end if;

  delete from public.clients where id = v_client.id;
end;
$_$;


ALTER FUNCTION "public"."rpc_delete_client"("client_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_delete_client"("client_id" bigint) IS 'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_delete_client_row(...). Hard-delete semantics are unchanged.';



CREATE OR REPLACE FUNCTION "public"."rpc_dismiss_notification"("p_notification_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count int;
begin
  update public.notifications n
     set dismissed_at = coalesce(n.dismissed_at, now()),
         read_at = coalesce(n.read_at, now()),
         is_read = true,
         read = true
   where n.id = p_notification_id
     and public.current_app_user_can_access_notification_row(n.user_id, n.order_id);

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;


ALTER FUNCTION "public"."rpc_dismiss_notification"("p_notification_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_dismiss_notification"("p_notification_id" "uuid") IS 'Slice 7G2A dismisses only current-user notifications that are personal or tied to readable source orders.';



CREATE OR REPLACE FUNCTION "public"."rpc_dismiss_seen_notifications"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count int;
begin
  update public.notifications n
     set dismissed_at = coalesce(n.dismissed_at, now())
   where public.current_app_user_can_access_notification_row(n.user_id, n.order_id)
     and n.read_at is not null
     and n.dismissed_at is null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;


ALTER FUNCTION "public"."rpc_dismiss_seen_notifications"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_dismiss_seen_notifications"() IS 'Slice 7G2A dismisses only seen current-user notifications that are personal or tied to readable source orders.';



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


ALTER FUNCTION "public"."rpc_enqueue_email_v1"("p_user_id" "uuid", "p_subject" "text", "p_template" "text", "p_to_email" "text", "p_payload" "jsonb") OWNER TO "postgres";


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
    and public.current_app_user_can_read_order(p_order_id)
  order by al.created_at desc
  limit 200;
$$;


ALTER FUNCTION "public"."rpc_get_activity_feed"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(public.current_user_role(), 'appraiser')
$$;


ALTER FUNCTION "public"."rpc_get_my_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_get_my_role"() IS 'Deprecated legacy role-string compatibility RPC. Browser callers must use company-member RPCs, permission hooks, and rpc_current_user_app_context instead.';



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


ALTER FUNCTION "public"."rpc_get_next_order_number"("p_company_key" "text", "p_effective_at" timestamp with time zone) OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_get_notification_prefs_v1"("p_user_id" "uuid") OWNER TO "postgres";


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
    "dismissed_at" timestamp with time zone,
    "company_id" "uuid"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notifications"."company_id" IS 'Nullable company scope foundation. Derived from order when possible; not yet used for notification filtering.';



CREATE OR REPLACE FUNCTION "public"."rpc_get_notifications"("p_limit" integer DEFAULT 50, "p_before" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS SETOF "public"."notifications"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select n.*
  from public.notifications n
  where n.user_id = public.current_app_user_id()
    and (p_before is null or n.created_at < p_before)
    and (
      n.order_id is null
      or public.current_app_user_can_read_order(n.order_id)
    )
  order by n.created_at desc
  limit coalesce(p_limit, 50);
$$;


ALTER FUNCTION "public"."rpc_get_notifications"("p_limit" integer, "p_before" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_get_notifications"("p_limit" integer, "p_before" timestamp with time zone) IS 'Slice 7C: user notifications remain personal, and order-tied notifications require readable underlying orders.';



CREATE OR REPLACE FUNCTION "public"."rpc_get_unread_count"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select count(*)::int
  from public.notifications n
  where n.user_id = public.current_app_user_id()
    and n.read_at is null
    and (
      n.order_id is null
      or public.current_app_user_can_read_order(n.order_id)
    );
$$;


ALTER FUNCTION "public"."rpc_get_unread_count"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_is_client_name_available"("p_name" "text", "p_ignore_client_id" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_is_order_number_available"("p_order_number" "text", "p_ignore_order_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_is_order_number_available_v2"("p_order_number" "text", "p_order_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.current_company_id();
  v_order_number text := btrim(coalesce(p_order_number, ''));
  v_conflicting_order_id uuid := null;
begin
  if auth.role() <> 'service_role'
     and public.current_app_user_id() is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if auth.role() <> 'service_role'
     and not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if v_order_number = '' then
    raise exception 'order_number_required'
      using errcode = '22023';
  end if;

  if length(v_order_number) > 80 then
    raise exception 'order_number_too_long'
      using errcode = '22023';
  end if;

  if p_order_id is not null
     and not exists (
       select 1
       from public.orders o
       where o.id = p_order_id
         and coalesce(o.company_id, public.default_company_id()) = v_company_id
     ) then
    raise exception 'order_not_found_in_current_company'
      using errcode = '42501';
  end if;

  select o.id
    into v_conflicting_order_id
    from public.orders o
   where coalesce(o.company_id, public.default_company_id()) = v_company_id
     and coalesce(o.order_number, '') = v_order_number
     and (p_order_id is null or o.id <> p_order_id)
   order by o.created_at asc nulls last, o.id asc
   limit 1;

  return jsonb_build_object(
    'available', v_conflicting_order_id is null,
    'order_number', v_order_number,
    'company_id', v_company_id,
    'conflicting_order_id', v_conflicting_order_id,
    'scope', 'company'
  );
end;
$$;


ALTER FUNCTION "public"."rpc_is_order_number_available_v2"("p_order_number" "text", "p_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_is_order_number_available_v2"("p_order_number" "text", "p_order_id" "uuid") IS 'Phase 10E8B read-only company-scoped order-number availability check. Does not mutate orders, does not implement manual override, and does not replace legacy global availability until later wiring.';



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


ALTER FUNCTION "public"."rpc_list_admin_events"("p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_appraiser_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_list_orders"("p_appraiser_id" "uuid" DEFAULT NULL::"uuid", "p_status" "text" DEFAULT NULL::"text", "p_q" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0) RETURNS SETOF "public"."orders"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select *
  from public.orders o
  where public.current_app_user_can_read_order_row(
      o.company_id,
      o.appraiser_id,
      o.assigned_to,
      o.reviewer_id,
      o.status
    )
    and (p_appraiser_id is null or o.appraiser_id = p_appraiser_id)
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


ALTER FUNCTION "public"."rpc_list_orders"("p_appraiser_id" "uuid", "p_status" "text", "p_q" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_list_users_with_roles"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_list_users_with_roles"() IS 'Deprecated legacy role-string user listing RPC. Browser callers must use company-member read RPCs and invitation/member management RPCs instead.';



CREATE OR REPLACE FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id uuid;
  v_actor record;
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_legacy_profile_id uuid := null;
  v_order public.orders;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if v_app_uid is null then
    raise exception 'current app user not found';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = p_order_id
   limit 1;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.current_app_user_has_current_company()
     or coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id()
     or not public.current_app_user_can_read_order(p_order_id)
     or not public.current_app_user_can_update_order_row(
       v_order.company_id,
       v_order.appraiser_id,
       v_order.assigned_to,
       v_order.reviewer_id,
       v_order.status
     ) then
    raise exception 'not authorized to log activity for this order';
  end if;

  select * into v_actor from public._activity_actor();
  select p.id
    into v_legacy_profile_id
    from public.profiles_legacy p
   where p.id = v_auth_uid
   limit 1;

  insert into public.activity_log (
    order_id,
    company_id,
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
    coalesce(v_order.company_id, public.default_company_id()),
    p_event_type,
    coalesce(p_details, '{}'::jsonb),
    v_app_uid,
    v_auth_uid,
    v_legacy_profile_id,
    v_actor.full_name,
    v_actor.email,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_details" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_details" "jsonb") IS 'Phase 10I5: compact activity logger with actor_user_id as the canonical app-user FK and FK-safe legacy created_by handling.';



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
    "actor_user_id" "uuid" DEFAULT "public"."current_app_user_id"(),
    "company_id" "uuid"
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


COMMENT ON COLUMN "public"."activity_log"."company_id" IS 'Nullable company scope foundation. Derived from order when possible; not yet used for activity RLS enforcement.';



CREATE OR REPLACE FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_message" "text" DEFAULT NULL::"text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."activity_log"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor record;
  v_row public.activity_log;
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_legacy_profile_id uuid := null;
  v_from text := coalesce(p_payload->>'from_status', p_payload->>'from');
  v_to text := coalesce(p_payload->>'to_status', p_payload->>'to');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_msg text;
  v_order public.orders;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if v_app_uid is null then
    raise exception 'current app user not found';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = p_order_id
   limit 1;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.current_app_user_has_current_company()
     or coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id()
     or not public.current_app_user_can_read_order(p_order_id)
     or not public.current_app_user_can_update_order_row(
       v_order.company_id,
       v_order.appraiser_id,
       v_order.assigned_to,
       v_order.reviewer_id,
       v_order.status
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
  select p.id
    into v_legacy_profile_id
    from public.profiles_legacy p
   where p.id = v_auth_uid
   limit 1;

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
    company_id,
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
    coalesce(v_order.company_id, public.default_company_id()),
    p_event_type,
    v_msg,
    v_payload,
    v_app_uid,
    v_auth_uid,
    v_legacy_profile_id,
    v_actor.full_name,
    v_actor.email
  )
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_message" "text", "p_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_message" "text", "p_payload" "jsonb") IS 'Phase 10I5: logs order activity with actor_user_id as the canonical app-user FK and created_by only when a legacy profile row exists.';



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


ALTER FUNCTION "public"."rpc_log_note"("p_order_id" "uuid", "p_message" "text", "p_context" "jsonb") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_log_status_change"("p_order_id" "uuid", "p_prev_status" "text", "p_new_status" "text", "p_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_mark_all_notifications_read"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count int;
begin
  update public.notifications n
     set read_at = coalesce(n.read_at, now()),
         is_read = true,
         read = true
   where public.current_app_user_can_access_notification_row(n.user_id, n.order_id)
     and n.read_at is null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;


ALTER FUNCTION "public"."rpc_mark_all_notifications_read"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_mark_all_notifications_read"() IS 'Slice 7G2A marks only current-user notifications that are personal or tied to readable source orders.';



CREATE OR REPLACE FUNCTION "public"."rpc_mark_email_failed_v1"("p_id" "uuid", "p_error" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.email_queue
     set status='failed', error=p_error
   where id = p_id;
$$;


ALTER FUNCTION "public"."rpc_mark_email_failed_v1"("p_id" "uuid", "p_error" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_mark_email_outbox_failed"("p_id" "uuid", "p_error" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_mark_email_outbox_sent"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_mark_email_sent_v1"("p_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.email_queue
     set status='sent', sent_at=now(), error=null
   where id = p_id;
$$;


ALTER FUNCTION "public"."rpc_mark_email_sent_v1"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_mark_notification_read"("p_notification_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count int;
begin
  update public.notifications n
     set read_at = coalesce(n.read_at, now()),
         is_read = true,
         read = true
   where n.id = p_notification_id
     and public.current_app_user_can_access_notification_row(n.user_id, n.order_id);

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;


ALTER FUNCTION "public"."rpc_mark_notification_read"("p_notification_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_mark_notification_read"("p_notification_id" "uuid") IS 'Slice 7G2A marks only current-user notifications that are personal or tied to readable source orders.';



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


ALTER FUNCTION "public"."rpc_next_order_no"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_notification_create"("patch" "jsonb") RETURNS "public"."notifications"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.notifications;
  v_order public.orders;
  v_order_id uuid := nullif(patch->>'order_id', '')::uuid;
  v_company_id uuid;
  v_recipient_user_id uuid := nullif(patch->>'user_id', '')::uuid;
  v_app_user_id uuid := public.current_app_user_id();
  v_is_service_role boolean := auth.role() = 'service_role';
begin
  if v_recipient_user_id is null then
    v_recipient_user_id := v_app_user_id;
  end if;

  if v_recipient_user_id is null then
    raise exception 'notification recipient user_id is required'
      using errcode = '23502';
  end if;

  if v_order_id is null then
    if not v_is_service_role then
      raise exception 'authenticated notification creation requires an order_id'
        using errcode = '42501';
    end if;

    v_company_id := public.default_company_id();
  else
    select *
      into v_order
      from public.orders o
     where o.id = v_order_id
     limit 1;

    if not found then
      raise exception 'notification source order not found'
        using errcode = '23503';
    end if;

    v_company_id := coalesce(v_order.company_id, public.default_company_id());

    if not v_is_service_role then
      if v_app_user_id is null then
        raise exception 'current app user not found'
          using errcode = '42501';
      end if;

      if not public.current_app_user_has_current_company()
         or v_company_id <> public.current_company_id()
         or not public.current_app_user_can_read_order(v_order_id)
         or not public.current_app_user_can_update_order_row(
           v_order.company_id,
           v_order.appraiser_id,
           v_order.assigned_to,
           v_order.reviewer_id,
           v_order.status
         ) then
        raise exception 'not authorized to create notification for this order'
          using errcode = '42501';
      end if;
    end if;

    if not exists (
      select 1
        from public.company_memberships cm
       where cm.user_id = v_recipient_user_id
         and cm.company_id = v_company_id
         and cm.status = 'active'
    ) then
      raise exception 'notification recipient is not an active member of the source company'
        using errcode = '42501';
    end if;
  end if;

  insert into public.notifications (
    user_id,
    company_id,
    type,
    category,
    title,
    body,
    message,
    order_id,
    is_read,
    created_at,
    link_path,
    payload,
    priority
  ) values (
    v_recipient_user_id,
    v_company_id,
    coalesce(patch->>'type', patch->>'category'),
    patch->>'category',
    patch->>'title',
    patch->>'body',
    patch->>'message',
    v_order_id,
    coalesce(nullif(patch->>'is_read', '')::boolean, false),
    coalesce(nullif(patch->>'created_at', '')::timestamptz, now()),
    patch->>'link_path',
    coalesce(patch->'payload', '{}'::jsonb),
    patch->>'priority'
  )
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_notification_create"("patch" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_notification_create"("patch" "jsonb") IS 'Slice 7G2A tenant-safe notification creation. Authenticated callers must create order-tied notifications for readable/updateable current-company orders; recipient must be an active member of the source company. Non-order creation is service_role-only.';



CREATE OR REPLACE FUNCTION "public"."rpc_notification_policy_lock_update"("p_event_key" "text", "p_channel" "text", "p_locked" boolean, "p_role" "text" DEFAULT 'appraiser'::"text", "p_lock_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("event_key" "text", "channel" "text", "role_key" "text", "locked" boolean, "lock_reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_event_key text := btrim(coalesce(p_event_key, ''));
  v_channel text := lower(btrim(coalesce(p_channel, '')));
  v_role text := lower(btrim(coalesce(p_role, 'appraiser')));
  v_reason text := nullif(btrim(coalesce(p_lock_reason, '')), '');
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('notifications.preferences.manage_company') then
    raise exception 'notifications_manage_company_required'
      using errcode = '42501';
  end if;

  if v_event_key = '' or not exists (
    select 1 from public.notification_policies np
     where np.key = v_event_key
       and np.key not like 'locks.%'
       and np.key not like 'defaults.%'
  ) then
    raise exception 'unknown_notification_event'
      using errcode = '22023';
  end if;

  if v_channel not in ('in_app', 'email') then
    raise exception 'invalid_notification_channel'
      using errcode = '22023';
  end if;

  if v_role not in ('owner', 'admin', 'reviewer', 'appraiser', 'billing') then
    raise exception 'invalid_notification_role'
      using errcode = '22023';
  end if;

  update public.notification_policies np
     set rules = jsonb_set(
           jsonb_set(
             coalesce(np.rules, '{}'::jsonb),
             array['roles', v_role, v_channel, 'required'],
             to_jsonb(coalesce(p_locked, false)),
             true
           ),
           array['roles', v_role, v_channel, 'lock_reason'],
           to_jsonb(coalesce(v_reason, 'Required by company policy.')),
           true
         ),
         updated_by = v_actor_user_id,
         updated_at = now()
   where np.key = v_event_key;

  event_key := v_event_key;
  channel := v_channel;
  role_key := v_role;
  locked := coalesce(p_locked, false);
  lock_reason := coalesce(v_reason, 'Required by company policy.');
  return next;
end;
$$;


ALTER FUNCTION "public"."rpc_notification_policy_lock_update"("p_event_key" "text", "p_channel" "text", "p_locked" boolean, "p_role" "text", "p_lock_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_notification_policy_lock_update"("p_event_key" "text", "p_channel" "text", "p_locked" boolean, "p_role" "text", "p_lock_reason" "text") IS 'Owner/admin guarded V1 lock setter for staff-critical notification preferences stored in notification_policies role/channel rules.';



CREATE OR REPLACE FUNCTION "public"."rpc_notification_policy_locks_get"("p_role" "text" DEFAULT 'appraiser'::"text") RETURNS TABLE("event_key" "text", "channel" "text", "role_key" "text", "locked" boolean, "lock_reason" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_role text := lower(btrim(coalesce(p_role, 'appraiser')));
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('notifications.preferences.manage_company') then
    raise exception 'notifications_manage_company_required'
      using errcode = '42501';
  end if;

  if v_role not in ('owner', 'admin', 'reviewer', 'appraiser', 'billing') then
    raise exception 'invalid_notification_role'
      using errcode = '22023';
  end if;

  return query
  select
    np.key as event_key,
    channel.channel,
    v_role as role_key,
    coalesce((np.rules #>> array['roles', v_role, channel.channel, 'required'])::boolean, false)
      or (channel.channel = 'email' and lower(coalesce(np.rules #>> '{email,mode}', '')) = 'required')
      as locked,
    coalesce(
      nullif(np.rules #>> array['roles', v_role, channel.channel, 'lock_reason'], ''),
      nullif(np.rules #>> '{email,lock_reason}', ''),
      'Required by company policy.'
    ) as lock_reason
    from public.notification_policies np
    cross join (values ('in_app'::text), ('email'::text)) channel(channel)
   where np.key not like 'locks.%'
     and np.key not like 'defaults.%'
   order by np.key, channel.channel;
end;
$$;


ALTER FUNCTION "public"."rpc_notification_policy_locks_get"("p_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_notification_policy_locks_get"("p_role" "text") IS 'Owner/admin guarded V1 lock reader for staff-critical notification preferences stored in notification_policies role/channel rules.';



CREATE OR REPLACE FUNCTION "public"."rpc_notification_prefs_ensure"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := public.current_app_user_id();
begin
  if v_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  insert into public.notification_prefs(user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;
  return true;
end;
$$;


ALTER FUNCTION "public"."rpc_notification_prefs_ensure"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_prefs" (
    "user_id" "uuid" NOT NULL,
    "dnd_until" timestamp with time zone,
    "snooze_until" timestamp with time zone,
    "email_enabled" boolean,
    "push_enabled" boolean,
    "categories" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_prefs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_notification_prefs_get"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."notification_prefs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_target_user_id uuid := coalesce(p_user_id, v_actor_user_id);
  v_row public.notification_prefs;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_target_user_id <> v_actor_user_id
     and not public.current_app_user_has_permission('notifications.preferences.manage_company') then
    raise exception 'notifications_manage_company_required'
      using errcode = '42501';
  end if;

  insert into public.notification_prefs(user_id)
  values (v_target_user_id)
  on conflict (user_id) do nothing;

  select *
    into v_row
    from public.notification_prefs
   where user_id = v_target_user_id
   limit 1;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_notification_prefs_get"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb") RETURNS "public"."notification_prefs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.notification_prefs;
begin
  select *
    into v_row
    from public.rpc_notification_prefs_update(patch, null);

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."notification_prefs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_target_user_id uuid := coalesce(p_user_id, v_actor_user_id);
  v_row public.notification_prefs;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(patch, '{}'::jsonb)) <> 'object' then
    raise exception 'notification_preferences_patch_object_required'
      using errcode = '22023';
  end if;

  if v_target_user_id <> v_actor_user_id
     and not public.current_app_user_has_permission('notifications.preferences.manage_company') then
    raise exception 'notifications_manage_company_required'
      using errcode = '42501';
  end if;

  insert into public.notification_prefs (
    user_id,
    dnd_until,
    snooze_until,
    email_enabled,
    push_enabled,
    categories,
    updated_at
  )
  values (
    v_target_user_id,
    (patch->>'dnd_until')::timestamptz,
    (patch->>'snooze_until')::timestamptz,
    (patch->>'email_enabled')::boolean,
    (patch->>'push_enabled')::boolean,
    patch->'categories',
    now()
  )
  on conflict (user_id)
  do update set
    dnd_until = coalesce((patch->>'dnd_until')::timestamptz, public.notification_prefs.dnd_until),
    snooze_until = coalesce((patch->>'snooze_until')::timestamptz, public.notification_prefs.snooze_until),
    email_enabled = coalesce((patch->>'email_enabled')::boolean, public.notification_prefs.email_enabled),
    push_enabled = coalesce((patch->>'push_enabled')::boolean, public.notification_prefs.push_enabled),
    categories = coalesce(patch->'categories', public.notification_prefs.categories),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_notification_recipients_for_order"("p_order_id" "uuid" DEFAULT NULL::"uuid", "p_recipient_kind" "text" DEFAULT 'admin_owner'::"text") RETURNS TABLE("user_id" "uuid", "role_key" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_is_service_role boolean := auth.role() = 'service_role';
  v_order public.orders%rowtype;
  v_company_id uuid;
  v_kind text := lower(btrim(coalesce(p_recipient_kind, 'admin_owner')));
begin
  if v_kind not in ('admin_owner', 'appraiser', 'reviewer') then
    raise exception 'invalid_notification_recipient_kind'
      using errcode = '22023';
  end if;

  if p_order_id is not null then
    select *
      into v_order
      from public.orders o
     where o.id = p_order_id
     limit 1;

    if not found then
      raise exception 'notification_source_order_not_found'
        using errcode = '23503';
    end if;

    v_company_id := coalesce(v_order.company_id, public.default_company_id());

    if not v_is_service_role then
      if v_actor_user_id is null then
        raise exception 'app_user_not_found'
          using errcode = '42501';
      end if;

      if not public.current_app_user_has_current_company()
         or v_company_id <> public.current_company_id()
         or not public.current_app_user_can_read_order(p_order_id) then
        raise exception 'notification_recipient_resolution_denied'
          using errcode = '42501';
      end if;
    end if;
  else
    if v_kind <> 'admin_owner' then
      raise exception 'order_id_required_for_assigned_recipient_resolution'
        using errcode = '22023';
    end if;

    v_company_id := public.current_company_id();

    if v_company_id is null then
      v_company_id := public.default_company_id();
    end if;

    if not v_is_service_role then
      if v_actor_user_id is null
         or v_company_id is null
         or not public.current_app_user_has_current_company()
         or v_company_id <> public.current_company_id() then
        raise exception 'current_company_required'
          using errcode = '42501';
      end if;

      if not public.current_app_user_has_permission('users.manage_company_access') then
        raise exception 'notification_recipient_admin_resolution_denied'
          using errcode = '42501';
      end if;
    end if;
  end if;

  if v_kind = 'admin_owner' then
    return query
    with candidates as (
      select distinct
        u.id as user_id,
        case
          when r.is_owner_role or lower(btrim(r.name)) = 'owner' then 'owner'
          else 'admin'
        end as role_key,
        case
          when r.is_owner_role or lower(btrim(r.name)) = 'owner' then 1
          else 2
        end as sort_key
        from public.company_memberships cm
        join public.users u
          on u.id = cm.user_id
        join public.user_role_assignments ura
          on ura.user_id = cm.user_id
         and ura.company_id = cm.company_id
         and ura.status = 'active'
         and (ura.expires_at is null or ura.expires_at > now())
        join public.roles r
          on r.id = ura.role_id
       where cm.company_id = v_company_id
         and cm.status = 'active'
         and coalesce(u.is_active, true)
         and coalesce(lower(btrim(u.status)), 'active') = 'active'
         and (
           r.is_owner_role
           or lower(btrim(r.name)) in ('owner', 'admin')
         )
    )
    select distinct on (c.user_id)
      c.user_id,
      c.role_key
      from candidates c
     order by c.user_id, c.sort_key;
    return;
  end if;

  if v_kind = 'appraiser' then
    return query
    with assigned as (
      select v_order.appraiser_id as user_id
      union all
      select v_order.assigned_to
       where v_order.appraiser_id is null
    )
    select distinct
      u.id as user_id,
      'appraiser'::text as role_key
      from assigned a
      join public.company_memberships cm
        on cm.user_id = a.user_id
       and cm.company_id = v_company_id
       and cm.status = 'active'
      join public.users u
        on u.id = cm.user_id
     where a.user_id is not null
       and coalesce(u.is_active, true)
       and coalesce(lower(btrim(u.status)), 'active') = 'active';
    return;
  end if;

  return query
  with assigned as (
    select v_order.reviewer_id as user_id
  )
  select distinct
    u.id as user_id,
    'reviewer'::text as role_key
    from assigned a
    join public.company_memberships cm
      on cm.user_id = a.user_id
     and cm.company_id = v_company_id
     and cm.status = 'active'
    join public.users u
      on u.id = cm.user_id
   where a.user_id is not null
     and coalesce(u.is_active, true)
     and coalesce(lower(btrim(u.status)), 'active') = 'active';
end;
$$;


ALTER FUNCTION "public"."rpc_notification_recipients_for_order"("p_order_id" "uuid", "p_recipient_kind" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_notification_recipients_for_order"("p_order_id" "uuid", "p_recipient_kind" "text") IS 'Company-scoped V1 notification recipient resolver. Owner/admin recipients come from active company role assignments; assigned appraiser/reviewer recipients come from the source order and require active company membership.';



CREATE OR REPLACE FUNCTION "public"."rpc_notifications_list"("category" "text" DEFAULT NULL::"text", "is_read" boolean DEFAULT NULL::boolean, "page_limit" integer DEFAULT 50, "before" timestamp with time zone DEFAULT NULL::timestamp with time zone, "after" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS SETOF "public"."notifications"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  select n.*
  from public.notifications n
  where n.user_id = public.current_app_user_id()
    and ($1 is null or n.category = $1)
    and ($2 is null or n.is_read = $2)
    and ($4 is null or n.created_at < $4)
    and ($5 is null or n.created_at > $5)
    and (
      n.order_id is null
      or public.current_app_user_can_read_order(n.order_id)
    )
  order by n.created_at desc
  limit coalesce($3, 50);
$_$;


ALTER FUNCTION "public"."rpc_notifications_list"("category" "text", "is_read" boolean, "page_limit" integer, "before" timestamp with time zone, "after" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_notifications_mark_all_read"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.notifications n
     set is_read = true,
         read = true,
         read_at = coalesce(n.read_at, now())
   where public.current_app_user_can_access_notification_row(n.user_id, n.order_id)
     and coalesce(n.is_read, false) = false;
$$;


ALTER FUNCTION "public"."rpc_notifications_mark_all_read"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_notifications_mark_all_read"() IS 'Slice 7G2A legacy mark-all-read compatibility wrapper with order-readable notification mutation safety.';



CREATE OR REPLACE FUNCTION "public"."rpc_notifications_mark_read"("ids" "uuid"[]) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.notifications n
     set is_read = true,
         read = true,
         read_at = coalesce(n.read_at, now())
   where n.id = any(ids)
     and public.current_app_user_can_access_notification_row(n.user_id, n.order_id);
$$;


ALTER FUNCTION "public"."rpc_notifications_mark_read"("ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_notifications_mark_read"("ids" "uuid"[]) IS 'Slice 7G2A legacy mark-read compatibility wrapper with order-readable notification mutation safety.';



CREATE OR REPLACE FUNCTION "public"."rpc_notifications_unread_count"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select count(*)::int
  from public.notifications n
  where n.user_id = public.current_app_user_id()
    and coalesce(n.is_read, false) = false
    and (
      n.order_id is null
      or public.current_app_user_can_read_order(n.order_id)
    );
$$;


ALTER FUNCTION "public"."rpc_notifications_unread_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_notify_admins"("p_title" "text", "p_body" "text", "p_message" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception using
    errcode = '55000',
    message = 'rpc_notify_admins is deprecated/quarantined',
    hint = 'Use tenant-safe order-tied notification creation paths.';
end;
$$;


ALTER FUNCTION "public"."rpc_notify_admins"("p_title" "text", "p_body" "text", "p_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_notify_admins"("p_title" "text", "p_body" "text", "p_message" "text") IS 'Slice 7G2A quarantine. Deprecated manual notification RPC; app-role execute revoked and body raises an exception.';



CREATE OR REPLACE FUNCTION "public"."rpc_notify_user"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception using
    errcode = '55000',
    message = 'rpc_notify_user is deprecated/quarantined',
    hint = 'Use tenant-safe order-tied notification creation paths.';
end;
$$;


ALTER FUNCTION "public"."rpc_notify_user"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_notify_user"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text") IS 'Slice 7G2A quarantine. Deprecated manual notification RPC; app-role execute revoked and body raises an exception.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_archive"("p_order_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.current_company_id();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_existing public.orders%rowtype;
  v_updated public.orders%rowtype;
  v_activity_id uuid := null;
  v_actor record;
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_legacy_profile_id uuid := null;
  v_detail jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if p_order_id is null then
    raise exception 'order_id_required'
      using errcode = '22023';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if v_reason is not null and length(v_reason) > 500 then
    raise exception 'archive_reason_too_long'
      using errcode = '22023';
  end if;

  select *
    into v_existing
    from public.orders o
   where o.id = p_order_id
   for update;

  if not found then
    raise exception 'order_not_found'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order_not_in_current_company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order_not_readable'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('orders.archive') then
    raise exception 'order_archive_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.is_archived, false) then
    return jsonb_build_object(
      'status', 'already_archived',
      'order_id', v_existing.id,
      'company_id', v_company_id,
      'order_number', v_existing.order_number,
      'order_status', v_existing.status,
      'is_archived', true,
      'updated_at', v_existing.updated_at,
      'activity_id', null
    );
  end if;

  update public.orders
     set is_archived = true,
         updated_at = now()
   where id = p_order_id
     and coalesce(company_id, public.default_company_id()) = v_company_id
  returning * into v_updated;

  select * into v_actor from public._activity_actor();
  select p.id
    into v_legacy_profile_id
    from public.profiles_legacy p
   where p.id = v_auth_uid
   limit 1;

  v_detail := jsonb_strip_nulls(jsonb_build_object(
    'order_id', p_order_id,
    'reason', v_reason
  ));

  insert into public.activity_log (
    order_id,
    company_id,
    event_type,
    message,
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
    v_company_id,
    'order.archived',
    'Order archived',
    v_detail,
    v_app_uid,
    v_auth_uid,
    v_legacy_profile_id,
    v_actor.full_name,
    v_actor.email,
    now()
  )
  returning id into v_activity_id;

  return jsonb_build_object(
    'status', 'archived',
    'order_id', v_updated.id,
    'company_id', v_company_id,
    'order_number', v_updated.order_number,
    'order_status', v_updated.status,
    'is_archived', v_updated.is_archived,
    'updated_at', v_updated.updated_at,
    'activity_id', v_activity_id
  );
end;
$$;


ALTER FUNCTION "public"."rpc_order_archive"("p_order_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_archive"("p_order_id" "uuid", "p_reason" "text") IS 'CRUD Stabilization Sprint 2B guarded order archive RPC. Authenticated current-company callers require readable order scope and orders.archive. Updates only is_archived/updated_at and writes order.archived activity with safe payload.';



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


ALTER FUNCTION "public"."rpc_order_assign"("p_order_id" "uuid", "p_appraiser_id" "uuid", "p_reviewer_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_order_assign_appraiser"("p_order_id" "text", "p_appraiser_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_order_cancel"("p_order_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.current_company_id();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_existing public.orders%rowtype;
  v_updated public.orders%rowtype;
  v_activity_id uuid := null;
  v_actor record;
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_legacy_profile_id uuid := null;
  v_detail jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if p_order_id is null then
    raise exception 'order_id_required'
      using errcode = '22023';
  end if;

  if v_reason is null then
    raise exception 'cancel_reason_required'
      using errcode = '22023';
  end if;

  if length(v_reason) > 500 then
    raise exception 'cancel_reason_too_long'
      using errcode = '22023';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select *
    into v_existing
    from public.orders o
   where o.id = p_order_id
   for update;

  if not found then
    raise exception 'order_not_found'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order_not_in_current_company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order_not_readable'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('orders.cancel') then
    raise exception 'order_cancel_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.is_archived, false) then
    raise exception 'archived_order_cannot_be_cancelled'
      using errcode = '22023';
  end if;

  update public.orders
     set status = 'cancelled',
         updated_at = now()
   where id = p_order_id
     and coalesce(company_id, public.default_company_id()) = v_company_id
  returning * into v_updated;

  select * into v_actor from public._activity_actor();
  select p.id
    into v_legacy_profile_id
    from public.profiles_legacy p
   where p.id = v_auth_uid
   limit 1;

  v_detail := jsonb_build_object(
    'order_id', p_order_id,
    'reason', v_reason
  );

  insert into public.activity_log (
    order_id,
    company_id,
    event_type,
    message,
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
    v_company_id,
    'order.cancelled',
    'Order cancelled',
    v_detail,
    v_app_uid,
    v_auth_uid,
    v_legacy_profile_id,
    v_actor.full_name,
    v_actor.email,
    now()
  )
  returning id into v_activity_id;

  return jsonb_build_object(
    'status', 'cancelled',
    'order_id', v_updated.id,
    'company_id', v_company_id,
    'order_number', v_updated.order_number,
    'order_status', v_updated.status,
    'is_archived', coalesce(v_updated.is_archived, false),
    'updated_at', v_updated.updated_at,
    'activity_id', v_activity_id
  );
end;
$$;


ALTER FUNCTION "public"."rpc_order_cancel"("p_order_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_cancel"("p_order_id" "uuid", "p_reason" "text") IS 'CRUD Stabilization Sprint 2O guarded order cancel RPC. Authenticated current-company callers require readable order scope and orders.cancel. Requires a reason, rejects archived orders, sets status=cancelled/updated_at, and writes order.cancelled activity with safe payload.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_accept"("p_assignment_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order_company_id uuid;
  v_relationship public.company_relationships%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.respond') then
    raise exception 'missing required assignment respond permission'
      using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.assigned_company_id <> v_company_id then
    raise exception 'assignment is not assigned to the current company'
      using errcode = '42501';
  end if;

  if v_assignment.status <> 'offered' then
    raise exception 'only offered order-company assignments can be accepted';
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if v_order_company_id is distinct from v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'accepted',
         accepted_by_user_id = v_actor_user_id,
         accepted_at = now()
   where id = p_assignment_id;

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.accepted',
    v_actor_user_id,
    v_company_id,
    'Assignment accepted',
    '{}'::jsonb
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.accepted',
    v_actor_user_id,
    v_company_id,
    '{}'::jsonb
  );

  return p_assignment_id;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_accept"("p_assignment_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_accept"("p_assignment_id" "uuid") IS 'Phase 8B4E assigned-company accept RPC with assignment-scoped activity and owner notification side effects. Acting by assignment_id is not canonical order read access.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_activity"("p_assignment_id" "uuid") RETURNS TABLE("id" "uuid", "assignment_id" "uuid", "event_type" "text", "actor_side" "text", "actor_company_id" "uuid", "actor_company_name" "text", "message" "text", "event_note" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_is_owner_reader boolean := false;
  v_is_assigned_reader boolean := false;
begin
  if p_assignment_id is null then
    raise exception 'assignment id is required';
  end if;

  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
   where oca.id = p_assignment_id;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_assignment.relationship_id;

  if not found then
    raise exception 'assignment relationship not found';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type'
      using errcode = '42501';
  end if;

  if v_company_id = v_assignment.owner_company_id then
    if not public.current_app_user_has_permission('order_company_assignments.read_owner') then
      raise exception 'missing required owner assignment read permission'
        using errcode = '42501';
    end if;

    if not public.current_app_user_can_read_order(v_assignment.order_id) then
      raise exception 'order is not readable by current user'
        using errcode = '42501';
    end if;

    v_is_owner_reader := true;
  elsif v_company_id = v_assignment.assigned_company_id then
    if not public.current_app_user_has_permission('order_company_assignments.read_assigned') then
      raise exception 'missing required assigned assignment read permission'
        using errcode = '42501';
    end if;

    if v_assignment.status not in ('offered', 'accepted', 'in_progress', 'submitted', 'completed') then
      raise exception 'assignment activity is not available for this assignment status'
        using errcode = '42501';
    end if;

    if v_relationship.status <> 'active' then
      raise exception 'assignment activity requires an active company relationship'
        using errcode = '42501';
    end if;

    v_is_assigned_reader := true;
  else
    raise exception 'assignment is not available to the current company'
      using errcode = '42501';
  end if;

  if not (v_is_owner_reader or v_is_assigned_reader) then
    raise exception 'assignment activity is not authorized'
      using errcode = '42501';
  end if;

  return query
  select
    activity.id,
    activity.assignment_id,
    activity.event_type,
    activity.actor_side,
    activity.actor_company_id,
    actor_company.name as actor_company_name,
    activity.message,
    case
      when activity.event_type in ('assignment.declined', 'assignment.cancelled', 'assignment.revoked')
        then nullif(activity.payload->>'reason', '')
      when activity.event_type = 'assignment.completed'
        then nullif(activity.payload->>'completion_note', '')
      else null
    end as event_note,
    activity.created_at
  from public.order_company_assignment_activity activity
  left join public.companies actor_company
    on actor_company.id = activity.actor_company_id
  where activity.assignment_id = v_assignment.id
    and activity.order_id = v_assignment.order_id
    and activity.owner_company_id = v_assignment.owner_company_id
    and activity.assigned_company_id = v_assignment.assigned_company_id
    and activity.relationship_id = v_assignment.relationship_id
  order by activity.created_at asc, activity.id asc;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_activity"("p_assignment_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_activity"("p_assignment_id" "uuid") IS 'Phase 8C3 assignment-scoped activity timeline read RPC. Reads order_company_assignment_activity only, returns allowlisted lifecycle display fields, omits order_id, raw payload, actor user IDs, client/AMC/order activity fields, fees, splits, and canonical order activity. Owner access follows read_owner plus current_app_user_can_read_order; assigned-company access follows read_assigned packet status rules without granting canonical order visibility.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_cancel"("p_assignment_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_payload jsonb := '{}'::jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.cancel') then
    raise exception 'missing required assignment cancel permission'
      using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.owner_company_id <> v_company_id then
    raise exception 'assignment source order is not owned by the current company'
      using errcode = '42501';
  end if;

  if v_assignment.status not in ('offered', 'accepted', 'in_progress') then
    raise exception 'only offered, accepted, or in-progress order-company assignments can be cancelled';
  end if;

  select *
    into v_order
    from public.orders
   where id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(v_order.id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order is not updateable by current user'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'cancelled',
         cancelled_by_user_id = v_actor_user_id,
         cancelled_at = now(),
         submission_payload = case
           when nullif(trim(coalesce(p_reason, '')), '') is null then submission_payload
           else jsonb_set(
             coalesce(submission_payload, '{}'::jsonb),
             '{cancel_reason}',
             to_jsonb(p_reason),
             true
           )
         end
   where id = p_assignment_id;

  if nullif(trim(coalesce(p_reason, '')), '') is not null then
    v_payload := jsonb_build_object('reason', p_reason);
  end if;

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.cancelled',
    v_actor_user_id,
    v_company_id,
    'Assignment cancelled',
    v_payload
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.cancelled',
    v_actor_user_id,
    v_company_id,
    v_payload
  );

  return p_assignment_id;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_cancel"("p_assignment_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_cancel"("p_assignment_id" "uuid", "p_reason" "text") IS 'Phase 8B4E owner-company cancel RPC with assignment-scoped activity and assigned-company notification side effects. Notifications route to assignment packet context.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_complete"("p_assignment_id" "uuid", "p_completion_note" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_payload jsonb := '{}'::jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.complete') then
    raise exception 'missing required assignment complete permission'
      using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.owner_company_id <> v_company_id then
    raise exception 'assignment source order is not owned by the current company'
      using errcode = '42501';
  end if;

  if v_assignment.status <> 'submitted' then
    raise exception 'only submitted order-company assignments can be completed';
  end if;

  select *
    into v_order
    from public.orders
   where id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(v_order.id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order is not updateable by current user'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'completed',
         completed_by_user_id = v_actor_user_id,
         completed_at = now(),
         submission_payload = case
           when nullif(trim(coalesce(p_completion_note, '')), '') is null then submission_payload
           else jsonb_set(
             coalesce(submission_payload, '{}'::jsonb),
             '{completion_note}',
             to_jsonb(p_completion_note),
             true
           )
         end
   where id = p_assignment_id;

  if nullif(trim(coalesce(p_completion_note, '')), '') is not null then
    v_payload := jsonb_build_object('completion_note', p_completion_note);
  end if;

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.completed',
    v_actor_user_id,
    v_company_id,
    'Assignment completed',
    v_payload
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.completed',
    v_actor_user_id,
    v_company_id,
    v_payload
  );

  return p_assignment_id;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_complete"("p_assignment_id" "uuid", "p_completion_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_complete"("p_assignment_id" "uuid", "p_completion_note" "text") IS 'Phase 8B4E owner-company complete RPC with assignment-scoped activity and assigned-company notification side effects. Notifications route to assignment packet context.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_decline"("p_assignment_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order_company_id uuid;
  v_relationship public.company_relationships%rowtype;
  v_payload jsonb := '{}'::jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.respond') then
    raise exception 'missing required assignment respond permission'
      using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.assigned_company_id <> v_company_id then
    raise exception 'assignment is not assigned to the current company'
      using errcode = '42501';
  end if;

  if v_assignment.status <> 'offered' then
    raise exception 'only offered order-company assignments can be declined';
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if v_order_company_id is distinct from v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'declined',
         declined_by_user_id = v_actor_user_id,
         declined_at = now(),
         submission_payload = case
           when nullif(trim(coalesce(p_reason, '')), '') is null then submission_payload
           else jsonb_set(
             coalesce(submission_payload, '{}'::jsonb),
             '{decline_reason}',
             to_jsonb(p_reason),
             true
           )
         end
   where id = p_assignment_id;

  if nullif(trim(coalesce(p_reason, '')), '') is not null then
    v_payload := jsonb_build_object('reason', p_reason);
  end if;

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.declined',
    v_actor_user_id,
    v_company_id,
    'Assignment declined',
    v_payload
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.declined',
    v_actor_user_id,
    v_company_id,
    v_payload
  );

  return p_assignment_id;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_decline"("p_assignment_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_decline"("p_assignment_id" "uuid", "p_reason" "text") IS 'Phase 8B4E assigned-company decline RPC with assignment-scoped activity and owner notification side effects. Acting by assignment_id is not canonical order read access.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_detail"("p_assignment_id" "uuid") RETURNS TABLE("id" "uuid", "order_id" "uuid", "owner_company_id" "uuid", "assigned_company_id" "uuid", "assigned_company_name" "text", "relationship_id" "uuid", "relationship_type" "text", "assignment_type" "text", "status" "text", "instructions" "text", "terms" "jsonb", "handoff_payload" "jsonb", "submission_payload" "jsonb", "compliance_snapshot" "jsonb", "offered_at" timestamp with time zone, "accepted_at" timestamp with time zone, "declined_at" timestamp with time zone, "started_at" timestamp with time zone, "submitted_at" timestamp with time zone, "completed_at" timestamp with time zone, "cancelled_at" timestamp with time zone, "revoked_at" timestamp with time zone, "due_at" timestamp with time zone, "review_due_at" timestamp with time zone, "expires_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  select *
    from public.rpc_order_company_assignment_list(null, null) listed
   where listed.id = p_assignment_id;

  if not found then
    raise exception 'Order-company assignment not found or not authorized';
  end if;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_detail"("p_assignment_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_detail"("p_assignment_id" "uuid") IS 'Phase 8B4B owner-side assignment management detail. Assigned-company lifecycle actions operate by known assignment_id and are not read-path access.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_inbox"("p_status" "text" DEFAULT NULL::"text", "p_assignment_type" "text" DEFAULT NULL::"text") RETURNS TABLE("assignment_id" "uuid", "order_id" "uuid", "owner_company_id" "uuid", "owner_company_name" "text", "assigned_company_id" "uuid", "relationship_id" "uuid", "relationship_type" "text", "assignment_type" "text", "assignment_status" "text", "instructions" "text", "terms" "jsonb", "handoff_payload" "jsonb", "offered_at" timestamp with time zone, "accepted_at" timestamp with time zone, "started_at" timestamp with time zone, "submitted_at" timestamp with time zone, "completed_at" timestamp with time zone, "cancelled_at" timestamp with time zone, "revoked_at" timestamp with time zone, "due_at" timestamp with time zone, "review_due_at" timestamp with time zone, "expires_at" timestamp with time zone, "order_number" "text", "order_status" "text", "property_type" "text", "report_type" "text", "city" "text", "state" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.current_company_id();
  v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
  v_assignment_type text := nullif(lower(trim(coalesce(p_assignment_type, ''))), '');
begin
  if public.current_app_user_id() is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.read_assigned') then
    raise exception 'missing required assigned assignment read permission'
      using errcode = '42501';
  end if;

  if v_status is not null and v_status not in (
    'offered',
    'accepted',
    'in_progress',
    'submitted',
    'completed'
  ) then
    raise exception 'invalid or non-visible assigned assignment status: %', p_status;
  end if;

  if v_assignment_type is not null and v_assignment_type not in (
    'vendor_appraisal',
    'staff_overflow',
    'review_provider',
    'enterprise_delegated',
    'billing_managed',
    'support_managed'
  ) then
    raise exception 'invalid order-company assignment type: %', p_assignment_type;
  end if;

  return query
  select
    oca.id as assignment_id,
    oca.order_id,
    oca.owner_company_id,
    owner_company.name as owner_company_name,
    oca.assigned_company_id,
    oca.relationship_id,
    cr.relationship_type,
    oca.assignment_type,
    oca.status as assignment_status,
    oca.instructions,
    oca.terms,
    oca.handoff_payload,
    oca.offered_at,
    oca.accepted_at,
    oca.started_at,
    oca.submitted_at,
    oca.completed_at,
    oca.cancelled_at,
    oca.revoked_at,
    oca.due_at,
    oca.review_due_at,
    oca.expires_at,
    o.order_number,
    o.status as order_status,
    o.property_type,
    o.report_type,
    o.city,
    o.state
  from public.order_company_assignments oca
  join public.orders o
    on o.id = oca.order_id
  join public.company_relationships cr
    on cr.id = oca.relationship_id
  join public.companies owner_company
    on owner_company.id = oca.owner_company_id
  where oca.assigned_company_id = v_company_id
    and oca.status in ('offered', 'accepted', 'in_progress', 'submitted', 'completed')
    and (v_status is null or oca.status = v_status)
    and (v_assignment_type is null or oca.assignment_type = v_assignment_type)
    and cr.status = 'active'
    and cr.source_company_id = oca.owner_company_id
    and cr.target_company_id = oca.assigned_company_id
    and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
    and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id
  order by oca.updated_at desc, oca.created_at desc;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_inbox"("p_status" "text", "p_assignment_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_inbox"("p_status" "text", "p_assignment_type" "text") IS 'Phase 8B4D assigned-company inbox. Returns assignment-scoped packet list data for the assigned company only; this is not canonical order read access and does not grant client visibility.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_list"("p_status" "text" DEFAULT NULL::"text", "p_assignment_type" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "order_id" "uuid", "owner_company_id" "uuid", "assigned_company_id" "uuid", "assigned_company_name" "text", "relationship_id" "uuid", "relationship_type" "text", "assignment_type" "text", "status" "text", "instructions" "text", "terms" "jsonb", "handoff_payload" "jsonb", "submission_payload" "jsonb", "compliance_snapshot" "jsonb", "offered_at" timestamp with time zone, "accepted_at" timestamp with time zone, "declined_at" timestamp with time zone, "started_at" timestamp with time zone, "submitted_at" timestamp with time zone, "completed_at" timestamp with time zone, "cancelled_at" timestamp with time zone, "revoked_at" timestamp with time zone, "due_at" timestamp with time zone, "review_due_at" timestamp with time zone, "expires_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.current_company_id();
  v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
  v_assignment_type text := nullif(lower(trim(coalesce(p_assignment_type, ''))), '');
begin
  if public.current_app_user_id() is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.read_owner') then
    raise exception 'missing required assignment read permission'
      using errcode = '42501';
  end if;

  if v_status is not null and v_status not in (
    'offered',
    'accepted',
    'in_progress',
    'submitted',
    'completed',
    'declined',
    'cancelled',
    'revoked'
  ) then
    raise exception 'invalid order-company assignment status: %', p_status;
  end if;

  if v_assignment_type is not null and v_assignment_type not in (
    'vendor_appraisal',
    'staff_overflow',
    'review_provider',
    'enterprise_delegated',
    'billing_managed',
    'support_managed'
  ) then
    raise exception 'invalid order-company assignment type: %', p_assignment_type;
  end if;

  return query
  select
    oca.id,
    oca.order_id,
    oca.owner_company_id,
    oca.assigned_company_id,
    c.name as assigned_company_name,
    oca.relationship_id,
    cr.relationship_type,
    oca.assignment_type,
    oca.status,
    oca.instructions,
    oca.terms,
    oca.handoff_payload,
    oca.submission_payload,
    oca.compliance_snapshot,
    oca.offered_at,
    oca.accepted_at,
    oca.declined_at,
    oca.started_at,
    oca.submitted_at,
    oca.completed_at,
    oca.cancelled_at,
    oca.revoked_at,
    oca.due_at,
    oca.review_due_at,
    oca.expires_at,
    oca.created_at,
    oca.updated_at
  from public.order_company_assignments oca
  join public.company_relationships cr
    on cr.id = oca.relationship_id
  join public.companies c
    on c.id = oca.assigned_company_id
  where oca.owner_company_id = v_company_id
    and (v_status is null or oca.status = v_status)
    and (v_assignment_type is null or oca.assignment_type = v_assignment_type)
  order by oca.updated_at desc, oca.created_at desc;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_list"("p_status" "text", "p_assignment_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_list"("p_status" "text", "p_assignment_type" "text") IS 'Phase 8B4B owner-side assignment management list. Returns assignments for the current owner company only; assigned-company users do not get list/read-path access and assignments do not grant order/client visibility.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_list_for_order"("p_order_id" "uuid") RETURNS TABLE("id" "uuid", "order_id" "uuid", "owner_company_id" "uuid", "assigned_company_id" "uuid", "assigned_company_name" "text", "relationship_id" "uuid", "relationship_type" "text", "relationship_status" "text", "assignment_type" "text", "status" "text", "instructions" "text", "offered_at" timestamp with time zone, "accepted_at" timestamp with time zone, "declined_at" timestamp with time zone, "started_at" timestamp with time zone, "submitted_at" timestamp with time zone, "completed_at" timestamp with time zone, "cancelled_at" timestamp with time zone, "revoked_at" timestamp with time zone, "due_at" timestamp with time zone, "review_due_at" timestamp with time zone, "expires_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_order public.orders%rowtype;
begin
  if p_order_id is null then
    raise exception 'order id is required';
  end if;

  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.read_owner') then
    raise exception 'missing required owner assignment read permission'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = p_order_id;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order is not owned by the current company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  return query
  select
    oca.id,
    oca.order_id,
    oca.owner_company_id,
    oca.assigned_company_id,
    assigned_company.name as assigned_company_name,
    oca.relationship_id,
    cr.relationship_type,
    cr.status as relationship_status,
    oca.assignment_type,
    oca.status,
    oca.instructions,
    oca.offered_at,
    oca.accepted_at,
    oca.declined_at,
    oca.started_at,
    oca.submitted_at,
    oca.completed_at,
    oca.cancelled_at,
    oca.revoked_at,
    oca.due_at,
    oca.review_due_at,
    oca.expires_at,
    oca.created_at,
    oca.updated_at
  from public.order_company_assignments oca
  join public.company_relationships cr
    on cr.id = oca.relationship_id
  join public.companies assigned_company
    on assigned_company.id = oca.assigned_company_id
  where oca.order_id = p_order_id
    and oca.owner_company_id = v_company_id
    and cr.source_company_id = oca.owner_company_id
    and cr.target_company_id = oca.assigned_company_id
    and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
  order by oca.updated_at desc, oca.created_at desc;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_list_for_order"("p_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_list_for_order"("p_order_id" "uuid") IS 'Phase 8C2A narrow owner-side assignment summary list for one readable owner order. Returns assignment lifecycle summary fields only; does not expose assignment payload JSON, client data, AMC data, fees, splits, internal notes, owner assignment user columns, assigned-company order access, or canonical order visibility beyond current_app_user_can_read_order.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_offer"("p_order_id" "uuid", "p_assigned_company_id" "uuid", "p_relationship_id" "uuid", "p_assignment_type" "text", "p_instructions" "text" DEFAULT NULL::"text", "p_terms" "jsonb" DEFAULT '{}'::"jsonb", "p_handoff_payload" "jsonb" DEFAULT '{}'::"jsonb", "p_due_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_review_due_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_assignment_type text := lower(trim(coalesce(p_assignment_type, '')));
  v_assignment_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.offer') then
    raise exception 'missing required assignment offer permission'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('relationships.assign_work') then
    raise exception 'missing required relationship work-assignment permission'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order is not owned by the current company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order is not updateable by current user'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id;

  if not found then
    raise exception 'company relationship not found';
  end if;

  if v_relationship.status <> 'active' then
    raise exception 'order-company assignment offer requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_company_id then
    raise exception 'relationship source must match current owner company'
      using errcode = '42501';
  end if;

  if v_relationship.source_company_id <> coalesce(v_order.company_id, public.default_company_id()) then
    raise exception 'relationship source must match order owner company'
      using errcode = '42501';
  end if;

  if v_relationship.target_company_id <> p_assigned_company_id then
    raise exception 'relationship target must match assigned company'
      using errcode = '42501';
  end if;

  if v_assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type % is incompatible with relationship type %',
      p_assignment_type,
      v_relationship.relationship_type;
  end if;

  insert into public.order_company_assignments (
    order_id,
    owner_company_id,
    assigned_company_id,
    relationship_id,
    assignment_type,
    status,
    instructions,
    terms,
    handoff_payload,
    offered_by_user_id,
    offered_at,
    due_at,
    review_due_at,
    expires_at
  ) values (
    p_order_id,
    coalesce(v_order.company_id, public.default_company_id()),
    p_assigned_company_id,
    p_relationship_id,
    v_assignment_type,
    'offered',
    p_instructions,
    coalesce(p_terms, '{}'::jsonb),
    coalesce(p_handoff_payload, '{}'::jsonb),
    v_actor_user_id,
    now(),
    p_due_at,
    p_review_due_at,
    p_expires_at
  )
  returning id into v_assignment_id;

  perform public.log_order_company_assignment_event(
    v_assignment_id,
    'assignment.offered',
    v_actor_user_id,
    v_company_id,
    'Assignment offered',
    '{}'::jsonb
  );
  perform public.notify_order_company_assignment_event(
    v_assignment_id,
    'assignment.offered',
    v_actor_user_id,
    v_company_id,
    '{}'::jsonb
  );

  return v_assignment_id;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_offer"("p_order_id" "uuid", "p_assigned_company_id" "uuid", "p_relationship_id" "uuid", "p_assignment_type" "text", "p_instructions" "text", "p_terms" "jsonb", "p_handoff_payload" "jsonb", "p_due_at" timestamp with time zone, "p_review_due_at" timestamp with time zone, "p_expires_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_offer"("p_order_id" "uuid", "p_assigned_company_id" "uuid", "p_relationship_id" "uuid", "p_assignment_type" "text", "p_instructions" "text", "p_terms" "jsonb", "p_handoff_payload" "jsonb", "p_due_at" timestamp with time zone, "p_review_due_at" timestamp with time zone, "p_expires_at" timestamp with time zone) IS 'Phase 8B4E owner-side assignment offer RPC with assignment-scoped activity and notification side effects. Does not modify core order assignment columns or grant vendor order visibility.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_offer_packet"("p_assignment_id" "uuid") RETURNS TABLE("assignment_id" "uuid", "owner_company_id" "uuid", "owner_company_name" "text", "assigned_company_id" "uuid", "relationship_id" "uuid", "relationship_type" "text", "assignment_type" "text", "assignment_status" "text", "instructions" "text", "terms" "jsonb", "handoff_payload" "jsonb", "offered_at" timestamp with time zone, "due_at" timestamp with time zone, "review_due_at" timestamp with time zone, "expires_at" timestamp with time zone, "order_number" "text", "order_status" "text", "property_type" "text", "report_type" "text", "city" "text", "state" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if public.current_app_user_id() is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.read_assigned') then
    raise exception 'missing required assigned assignment read permission'
      using errcode = '42501';
  end if;

  return query
  select
    oca.id as assignment_id,
    oca.owner_company_id,
    owner_company.name as owner_company_name,
    oca.assigned_company_id,
    oca.relationship_id,
    cr.relationship_type,
    oca.assignment_type,
    oca.status as assignment_status,
    oca.instructions,
    oca.terms,
    oca.handoff_payload,
    oca.offered_at,
    oca.due_at,
    oca.review_due_at,
    oca.expires_at,
    o.order_number,
    o.status as order_status,
    o.property_type,
    o.report_type,
    o.city,
    o.state
  from public.order_company_assignments oca
  join public.orders o
    on o.id = oca.order_id
  join public.company_relationships cr
    on cr.id = oca.relationship_id
  join public.companies owner_company
    on owner_company.id = oca.owner_company_id
  where oca.id = p_assignment_id
    and oca.assigned_company_id = public.current_company_id()
    and oca.status = 'offered'
    and cr.status = 'active'
    and cr.source_company_id = oca.owner_company_id
    and cr.target_company_id = oca.assigned_company_id
    and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
    and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id;

  if not found then
    raise exception 'Order-company assignment offer packet not found or not authorized';
  end if;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_offer_packet"("p_assignment_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_offer_packet"("p_assignment_id" "uuid") IS 'Phase 8B4G assigned-company offered-assignment invitation preview by assignment_id. Returns inbox-safe fields only, does not expose order_id, and does not grant canonical order or client visibility.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_owner_packet"("p_assignment_id" "uuid") RETURNS TABLE("assignment_id" "uuid", "order_id" "uuid", "owner_company_id" "uuid", "assigned_company_id" "uuid", "assigned_company_name" "text", "relationship_id" "uuid", "relationship_type" "text", "relationship_status" "text", "assignment_type" "text", "assignment_status" "text", "instructions" "text", "terms" "jsonb", "handoff_payload" "jsonb", "submission_payload" "jsonb", "compliance_snapshot" "jsonb", "offered_at" timestamp with time zone, "accepted_at" timestamp with time zone, "declined_at" timestamp with time zone, "started_at" timestamp with time zone, "submitted_at" timestamp with time zone, "completed_at" timestamp with time zone, "cancelled_at" timestamp with time zone, "revoked_at" timestamp with time zone, "due_at" timestamp with time zone, "assignment_review_due_at" timestamp with time zone, "expires_at" timestamp with time zone, "order_number" "text", "order_status" "text", "property_address" "text", "city" "text", "state" "text", "postal_code" "text", "property_type" "text", "report_type" "text", "site_visit_at" timestamp with time zone, "final_due_at" timestamp with time zone, "order_review_due_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if public.current_app_user_id() is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.read_owner') then
    raise exception 'missing required owner assignment read permission'
      using errcode = '42501';
  end if;

  return query
  select
    oca.id as assignment_id,
    oca.order_id,
    oca.owner_company_id,
    oca.assigned_company_id,
    assigned_company.name as assigned_company_name,
    oca.relationship_id,
    cr.relationship_type,
    cr.status as relationship_status,
    oca.assignment_type,
    oca.status as assignment_status,
    oca.instructions,
    oca.terms,
    oca.handoff_payload,
    oca.submission_payload,
    oca.compliance_snapshot,
    oca.offered_at,
    oca.accepted_at,
    oca.declined_at,
    oca.started_at,
    oca.submitted_at,
    oca.completed_at,
    oca.cancelled_at,
    oca.revoked_at,
    oca.due_at,
    oca.review_due_at as assignment_review_due_at,
    oca.expires_at,
    o.order_number,
    o.status as order_status,
    coalesce(o.property_address, o.address) as property_address,
    o.city,
    o.state,
    coalesce(o.postal_code, o.zip) as postal_code,
    o.property_type,
    o.report_type,
    coalesce(
      o.site_visit_at::timestamptz,
      (o.site_visit_date)::timestamptz,
      (o.inspection_date)::timestamptz
    ) as site_visit_at,
    coalesce(
      o.final_due_at,
      o.client_due_at,
      (o.due_to_client)::timestamptz,
      (o.due_date)::timestamptz
    ) as final_due_at,
    coalesce(
      o.review_due_at,
      (o.due_for_review)::timestamptz,
      (o.review_due_date)::timestamptz
    ) as order_review_due_at
  from public.order_company_assignments oca
  join public.orders o
    on o.id = oca.order_id
  join public.company_relationships cr
    on cr.id = oca.relationship_id
  join public.companies assigned_company
    on assigned_company.id = oca.assigned_company_id
  where oca.id = p_assignment_id
    and oca.owner_company_id = public.current_company_id()
    and public.current_app_user_can_read_order(oca.order_id)
    and cr.source_company_id = oca.owner_company_id
    and cr.target_company_id = oca.assigned_company_id
    and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
    and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id;

  if not found then
    raise exception 'Order-company assignment owner packet not found or not authorized';
  end if;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_owner_packet"("p_assignment_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_owner_packet"("p_assignment_id" "uuid") IS 'Phase 8B4D owner-company assignment packet. Owner company remains canonical order owner; relationship existence alone grants nothing and packets are assignment-management projections.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_revoke"("p_assignment_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_payload jsonb := '{}'::jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.revoke') then
    raise exception 'missing required assignment revoke permission'
      using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.owner_company_id <> v_company_id then
    raise exception 'assignment source order is not owned by the current company'
      using errcode = '42501';
  end if;

  if v_assignment.status not in ('offered', 'accepted', 'in_progress', 'submitted') then
    raise exception 'only current order-company assignments can be revoked';
  end if;

  select *
    into v_order
    from public.orders
   where id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(v_order.id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order is not updateable by current user'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'revoked',
         revoked_by_user_id = v_actor_user_id,
         revoked_at = now(),
         submission_payload = case
           when nullif(trim(coalesce(p_reason, '')), '') is null then submission_payload
           else jsonb_set(
             coalesce(submission_payload, '{}'::jsonb),
             '{revoke_reason}',
             to_jsonb(p_reason),
             true
           )
         end
   where id = p_assignment_id;

  if nullif(trim(coalesce(p_reason, '')), '') is not null then
    v_payload := jsonb_build_object('reason', p_reason);
  end if;

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.revoked',
    v_actor_user_id,
    v_company_id,
    'Assignment revoked',
    v_payload
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.revoked',
    v_actor_user_id,
    v_company_id,
    v_payload
  );

  return p_assignment_id;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_revoke"("p_assignment_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_revoke"("p_assignment_id" "uuid", "p_reason" "text") IS 'Phase 8B4E owner-company revoke RPC with assignment-scoped activity and assigned-company notification side effects. Notifications route to assignment packet context.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_start"("p_assignment_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order_company_id uuid;
  v_relationship public.company_relationships%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.progress') then
    raise exception 'missing required assignment progress permission'
      using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.assigned_company_id <> v_company_id then
    raise exception 'assignment is not assigned to the current company'
      using errcode = '42501';
  end if;

  if v_assignment.status <> 'accepted' then
    raise exception 'only accepted order-company assignments can be started';
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if v_order_company_id is distinct from v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'in_progress',
         started_at = coalesce(started_at, now())
   where id = p_assignment_id;

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.started',
    v_actor_user_id,
    v_company_id,
    'Assignment started',
    '{}'::jsonb
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.started',
    v_actor_user_id,
    v_company_id,
    '{}'::jsonb
  );

  return p_assignment_id;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_start"("p_assignment_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_start"("p_assignment_id" "uuid") IS 'Phase 8B4E assigned-company start RPC with assignment-scoped activity only. No owner order activity or canonical order visibility is exposed.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_submit"("p_assignment_id" "uuid", "p_submission_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order_company_id uuid;
  v_relationship public.company_relationships%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.progress') then
    raise exception 'missing required assignment progress permission'
      using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'order-company assignment not found';
  end if;

  if v_assignment.assigned_company_id <> v_company_id then
    raise exception 'assignment is not assigned to the current company'
      using errcode = '42501';
  end if;

  if v_assignment.status not in ('accepted', 'in_progress') then
    raise exception 'only accepted or in-progress order-company assignments can be submitted';
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  if v_order_company_id is distinct from v_assignment.owner_company_id then
    raise exception 'assignment source order owner company mismatch'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = v_assignment.relationship_id;

  if not found or v_relationship.status <> 'active' then
    raise exception 'assignment requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id then
    raise exception 'assignment relationship no longer matches assignment companies'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type is incompatible with relationship type';
  end if;

  update public.order_company_assignments
     set status = 'submitted',
         submitted_by_user_id = v_actor_user_id,
         submitted_at = now(),
         submission_payload = coalesce(p_submission_payload, '{}'::jsonb)
   where id = p_assignment_id;

  perform public.log_order_company_assignment_event(
    p_assignment_id,
    'assignment.submitted',
    v_actor_user_id,
    v_company_id,
    'Assignment submitted',
    '{}'::jsonb
  );
  perform public.notify_order_company_assignment_event(
    p_assignment_id,
    'assignment.submitted',
    v_actor_user_id,
    v_company_id,
    '{}'::jsonb
  );

  return p_assignment_id;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_submit"("p_assignment_id" "uuid", "p_submission_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_submit"("p_assignment_id" "uuid", "p_submission_payload" "jsonb") IS 'Phase 8B4E assigned-company submit RPC with assignment-scoped activity and owner notification side effects. Acting by assignment_id is not canonical order read access.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_company_assignment_work_packet"("p_assignment_id" "uuid") RETURNS TABLE("assignment_id" "uuid", "order_id" "uuid", "owner_company_id" "uuid", "owner_company_name" "text", "assigned_company_id" "uuid", "relationship_id" "uuid", "relationship_type" "text", "assignment_type" "text", "assignment_status" "text", "instructions" "text", "terms" "jsonb", "handoff_payload" "jsonb", "offered_at" timestamp with time zone, "accepted_at" timestamp with time zone, "started_at" timestamp with time zone, "submitted_at" timestamp with time zone, "completed_at" timestamp with time zone, "cancelled_at" timestamp with time zone, "revoked_at" timestamp with time zone, "due_at" timestamp with time zone, "assignment_review_due_at" timestamp with time zone, "expires_at" timestamp with time zone, "order_number" "text", "order_status" "text", "property_type" "text", "report_type" "text", "city" "text", "state" "text", "property_address" "text", "postal_code" "text", "site_visit_at" timestamp with time zone, "final_due_at" timestamp with time zone, "order_review_due_at" timestamp with time zone, "submission_payload" "jsonb", "compliance_snapshot" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if public.current_app_user_id() is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.read_assigned') then
    raise exception 'missing required assigned assignment read permission'
      using errcode = '42501';
  end if;

  return query
  select
    oca.id as assignment_id,
    oca.order_id,
    oca.owner_company_id,
    owner_company.name as owner_company_name,
    oca.assigned_company_id,
    oca.relationship_id,
    cr.relationship_type,
    oca.assignment_type,
    oca.status as assignment_status,
    oca.instructions,
    oca.terms,
    oca.handoff_payload,
    oca.offered_at,
    oca.accepted_at,
    oca.started_at,
    oca.submitted_at,
    oca.completed_at,
    oca.cancelled_at,
    oca.revoked_at,
    oca.due_at,
    oca.review_due_at as assignment_review_due_at,
    oca.expires_at,
    o.order_number,
    o.status as order_status,
    o.property_type,
    o.report_type,
    o.city,
    o.state,
    coalesce(o.property_address, o.address) as property_address,
    coalesce(o.postal_code, o.zip) as postal_code,
    coalesce(
      o.site_visit_at::timestamptz,
      (o.site_visit_date)::timestamptz,
      (o.inspection_date)::timestamptz
    ) as site_visit_at,
    coalesce(
      o.final_due_at,
      o.client_due_at,
      (o.due_to_client)::timestamptz,
      (o.due_date)::timestamptz
    ) as final_due_at,
    coalesce(
      o.review_due_at,
      (o.due_for_review)::timestamptz,
      (o.review_due_date)::timestamptz
    ) as order_review_due_at,
    oca.submission_payload,
    oca.compliance_snapshot
  from public.order_company_assignments oca
  join public.orders o
    on o.id = oca.order_id
  join public.company_relationships cr
    on cr.id = oca.relationship_id
  join public.companies owner_company
    on owner_company.id = oca.owner_company_id
  where oca.id = p_assignment_id
    and oca.assigned_company_id = public.current_company_id()
    and oca.status in ('accepted', 'in_progress', 'submitted', 'completed')
    and cr.status = 'active'
    and cr.source_company_id = oca.owner_company_id
    and cr.target_company_id = oca.assigned_company_id
    and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
    and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id;

  if not found then
    raise exception 'Order-company assignment work packet not found or not authorized';
  end if;
end;
$$;


ALTER FUNCTION "public"."rpc_order_company_assignment_work_packet"("p_assignment_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_company_assignment_work_packet"("p_assignment_id" "uuid") IS 'Phase 8B4D assigned-company work packet by assignment_id. Packet access does not modify current_app_user_can_read_order, expose canonical order views, grant client visibility, or modify core order assignment columns.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_create"("p" "jsonb") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_order_create(jsonb) is deprecated and quarantined; use rpc_create_order(jsonb) or direct authorized orders writes'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_order_create"("p" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_create"("p" "jsonb") IS 'Slice 7E3B quarantine. Deprecated legacy order create RPC used stale uuid client_id semantics; preserved only as a service_role-callable exception for compatibility discovery.';



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


ALTER FUNCTION "public"."rpc_order_delete"("p_order_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_order_document_archive"("p_document_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "order_id" "uuid", "company_id" "uuid", "uploaded_by_user_id" "uuid", "category" "text", "title" "text", "file_name" "text", "mime_type" "text", "file_size" bigint, "visibility_scope" "text", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_document public.order_documents;
  v_order public.orders;
  v_row public.order_documents;
  v_app_user_id uuid := public.current_app_user_id();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_display_name text;
  v_detail jsonb;
begin
  if p_document_id is null then
    raise exception 'document_id required';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company required'
      using errcode = '42501';
  end if;

  if v_app_user_id is null then
    raise exception 'current app user required'
      using errcode = '42501';
  end if;

  if v_reason is not null and length(v_reason) > 1000 then
    raise exception 'archive reason is too long'
      using errcode = '22023';
  end if;

  select *
    into v_document
    from public.order_documents od
   where od.id = p_document_id
   limit 1;

  if not found then
    raise exception 'document not found';
  end if;

  if v_document.status not in ('active', 'pending') then
    raise exception 'document cannot be archived from current status'
      using errcode = '22023';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = v_document.order_id
   limit 1;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id()
     or v_document.company_id <> public.current_company_id()
     or not public.current_app_user_can_read_order(v_order.id)
     or not public.current_app_user_has_permission('documents.delete') then
    raise exception 'not authorized to archive this document'
      using errcode = '42501';
  end if;

  update public.order_documents od
     set status = 'archived',
         updated_at = now()
   where od.id = v_document.id
     and od.status in ('active', 'pending')
   returning * into v_row;

  if not found then
    raise exception 'document cannot be archived from current status'
      using errcode = '22023';
  end if;

  v_display_name := coalesce(nullif(v_row.title, ''), v_row.file_name, 'document');

  v_detail := jsonb_build_object(
    'document_id', v_row.id,
    'actor_user_id', v_app_user_id,
    'category', v_row.category,
    'title', v_row.title,
    'file_name', v_row.file_name,
    'visibility_scope', v_row.visibility_scope
  );

  if v_reason is not null then
    v_detail := v_detail || jsonb_build_object('reason', v_reason);
  end if;

  perform public.rpc_log_event(
    v_row.order_id,
    'order_document.archived',
    format('Archived %s', v_display_name),
    v_detail
  );

  return query
  select
    v_row.id,
    v_row.order_id,
    v_row.company_id,
    v_row.uploaded_by_user_id,
    v_row.category,
    v_row.title,
    v_row.file_name,
    v_row.mime_type,
    v_row.file_size,
    v_row.visibility_scope,
    v_row.status,
    v_row.created_at,
    v_row.updated_at;
end;
$$;


ALTER FUNCTION "public"."rpc_order_document_archive"("p_document_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_document_archive"("p_document_id" "uuid", "p_reason" "text") IS 'Soft-archives an active or pending order document after current-company, readable-order, and documents.delete authorization, then writes an order_document.archived activity event without storage path, bucket, or signed URL data.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_document_authorize_download"("p_document_id" "uuid") RETURNS TABLE("id" "uuid", "order_id" "uuid", "company_id" "uuid", "category" "text", "title" "text", "file_name" "text", "mime_type" "text", "file_size" bigint, "visibility_scope" "text", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_document public.order_documents;
begin
  if p_document_id is null then
    raise exception 'document_id required';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company required'
      using errcode = '42501';
  end if;

  select *
    into v_document
    from public.order_documents od
   where od.id = p_document_id
   limit 1;

  if not found then
    raise exception 'document not found';
  end if;

  if v_document.status <> 'active'
     or not public.current_app_user_can_read_order_document_row(
       v_document.company_id,
       v_document.order_id,
       v_document.visibility_scope,
       v_document.status
     ) then
    raise exception 'not authorized to download this document'
      using errcode = '42501';
  end if;

  return query
  select
    v_document.id,
    v_document.order_id,
    v_document.company_id,
    v_document.category,
    v_document.title,
    v_document.file_name,
    v_document.mime_type,
    v_document.file_size,
    v_document.visibility_scope,
    v_document.status,
    v_document.created_at,
    v_document.updated_at;
end;
$$;


ALTER FUNCTION "public"."rpc_order_document_authorize_download"("p_document_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_document_authorize_download"("p_document_id" "uuid") IS 'Authorizes an order document download for the current caller and returns safe metadata only. Storage bucket/path remain backend-only for signed URL creation.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_document_finalize_upload"("p_document_id" "uuid", "p_mime_type" "text" DEFAULT NULL::"text", "p_file_size" bigint DEFAULT NULL::bigint) RETURNS TABLE("id" "uuid", "order_id" "uuid", "company_id" "uuid", "uploaded_by_user_id" "uuid", "category" "text", "title" "text", "file_name" "text", "mime_type" "text", "file_size" bigint, "visibility_scope" "text", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'storage'
    AS $$
declare
  v_document public.order_documents;
  v_order public.orders;
  v_row public.order_documents;
  v_app_user_id uuid := public.current_app_user_id();
  v_display_name text;
begin
  if p_document_id is null then
    raise exception 'document_id required';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company required'
      using errcode = '42501';
  end if;

  if v_app_user_id is null then
    raise exception 'current app user required'
      using errcode = '42501';
  end if;

  select *
    into v_document
    from public.order_documents od
   where od.id = p_document_id
   limit 1;

  if not found then
    raise exception 'document not found';
  end if;

  if v_document.status <> 'pending' then
    raise exception 'document upload is not pending'
      using errcode = '22023';
  end if;

  if p_file_size is not null and (p_file_size < 0 or p_file_size > 52428800) then
    raise exception 'invalid file_size'
      using errcode = '22023';
  end if;

  if p_mime_type is not null and length(btrim(p_mime_type)) > 255 then
    raise exception 'invalid mime_type'
      using errcode = '22023';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = v_document.order_id
   limit 1;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id()
     or not public.current_app_user_can_upload_order_document_row(
       v_order.company_id,
       v_order.id,
       v_order.appraiser_id,
       v_order.assigned_to,
       v_order.reviewer_id,
       v_order.status
     ) then
    raise exception 'not authorized to finalize document upload for this order'
      using errcode = '42501';
  end if;

  if v_document.uploaded_by_user_id <> v_app_user_id
     and not public.current_app_user_has_permission('documents.upload.all') then
    raise exception 'not authorized to finalize this document upload'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
      from storage.objects so
     where so.bucket_id = v_document.storage_bucket
       and so.name = v_document.storage_path
  ) then
    raise exception 'uploaded object not found'
      using errcode = '22023';
  end if;

  update public.order_documents od
     set status = 'active',
         mime_type = coalesce(nullif(btrim(p_mime_type), ''), od.mime_type),
         file_size = coalesce(p_file_size, od.file_size),
         updated_at = now()
   where od.id = v_document.id
   returning * into v_row;

  v_display_name := coalesce(nullif(v_row.title, ''), v_row.file_name, 'document');

  perform public.rpc_log_event(
    v_row.order_id,
    'order_document.uploaded',
    format('Uploaded %s', v_display_name),
    jsonb_build_object(
      'document_id', v_row.id,
      'actor_user_id', v_app_user_id,
      'category', v_row.category,
      'title', v_row.title,
      'file_name', v_row.file_name,
      'visibility_scope', v_row.visibility_scope
    )
  );

  return query
  select
    v_row.id,
    v_row.order_id,
    v_row.company_id,
    v_row.uploaded_by_user_id,
    v_row.category,
    v_row.title,
    v_row.file_name,
    v_row.mime_type,
    v_row.file_size,
    v_row.visibility_scope,
    v_row.status,
    v_row.created_at,
    v_row.updated_at;
end;
$$;


ALTER FUNCTION "public"."rpc_order_document_finalize_upload"("p_document_id" "uuid", "p_mime_type" "text", "p_file_size" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_document_finalize_upload"("p_document_id" "uuid", "p_mime_type" "text", "p_file_size" bigint) IS 'Finalizes a pending order document after authorization and storage object existence validation, then writes an order_document.uploaded activity event without storage path or signed URL data.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_document_prepare_upload"("p_order_id" "uuid", "p_category" "text", "p_file_name" "text", "p_mime_type" "text" DEFAULT NULL::"text", "p_file_size" bigint DEFAULT NULL::bigint, "p_visibility_scope" "text" DEFAULT 'internal'::"text", "p_title" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "order_id" "uuid", "company_id" "uuid", "category" "text", "title" "text", "file_name" "text", "mime_type" "text", "file_size" bigint, "storage_bucket" "text", "storage_path" "text", "visibility_scope" "text", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order public.orders;
  v_app_user_id uuid := public.current_app_user_id();
  v_category text := lower(btrim(coalesce(p_category, '')));
  v_visibility_scope text := lower(btrim(coalesce(nullif(p_visibility_scope, ''), 'internal')));
  v_file_name text := public.order_document_sanitize_file_name(p_file_name);
  v_document_id uuid := gen_random_uuid();
  v_storage_bucket text := 'order-documents';
  v_storage_path text;
  v_row public.order_documents;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if v_app_user_id is null then
    raise exception 'current app user required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company required'
      using errcode = '42501';
  end if;

  if not (
    v_category = any (
    array[
      'engagement',
      'source_documents',
      'property_media',
      'review_revisions',
      'final_report',
      'internal_workfile'
    ]
    )
  ) then
    raise exception 'invalid document category'
      using errcode = '22023';
  end if;

  if not (v_visibility_scope = any (array['internal', 'assigned', 'audit'])) then
    raise exception 'invalid upload visibility scope'
      using errcode = '22023';
  end if;

  if p_file_name is null or btrim(p_file_name) = '' then
    raise exception 'file_name required'
      using errcode = '22023';
  end if;

  if p_file_size is not null and (p_file_size < 0 or p_file_size > 52428800) then
    raise exception 'invalid file_size'
      using errcode = '22023';
  end if;

  if p_mime_type is not null and length(btrim(p_mime_type)) > 255 then
    raise exception 'invalid mime_type'
      using errcode = '22023';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = p_order_id
   limit 1;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id()
     or not public.current_app_user_can_upload_order_document_row(
       v_order.company_id,
       v_order.id,
       v_order.appraiser_id,
       v_order.assigned_to,
       v_order.reviewer_id,
       v_order.status
     ) then
    raise exception 'not authorized to prepare document upload for this order'
      using errcode = '42501';
  end if;

  v_storage_path := format(
    'company/%s/orders/%s/documents/%s/%s',
    coalesce(v_order.company_id, public.default_company_id()),
    v_order.id,
    v_document_id,
    v_file_name
  );

  insert into public.order_documents (
    id,
    company_id,
    order_id,
    uploaded_by_user_id,
    category,
    title,
    file_name,
    mime_type,
    file_size,
    storage_bucket,
    storage_path,
    visibility_scope,
    status
  )
  values (
    v_document_id,
    coalesce(v_order.company_id, public.default_company_id()),
    v_order.id,
    v_app_user_id,
    v_category,
    nullif(btrim(p_title), ''),
    v_file_name,
    nullif(btrim(p_mime_type), ''),
    p_file_size,
    v_storage_bucket,
    v_storage_path,
    v_visibility_scope,
    'pending'
  )
  returning * into v_row;

  return query
  select
    v_row.id,
    v_row.order_id,
    v_row.company_id,
    v_row.category,
    v_row.title,
    v_row.file_name,
    v_row.mime_type,
    v_row.file_size,
    v_row.storage_bucket,
    v_row.storage_path,
    v_row.visibility_scope,
    v_row.status,
    v_row.created_at,
    v_row.updated_at;
end;
$$;


ALTER FUNCTION "public"."rpc_order_document_prepare_upload"("p_order_id" "uuid", "p_category" "text", "p_file_name" "text", "p_mime_type" "text", "p_file_size" bigint, "p_visibility_scope" "text", "p_title" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_document_prepare_upload"("p_order_id" "uuid", "p_category" "text", "p_file_name" "text", "p_mime_type" "text", "p_file_size" bigint, "p_visibility_scope" "text", "p_title" "text") IS 'Creates pending order document metadata and returns upload path instructions after current-company, order, and document upload authorization.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_documents_list"("p_order_id" "uuid") RETURNS TABLE("id" "uuid", "order_id" "uuid", "company_id" "uuid", "uploaded_by_user_id" "uuid", "category" "text", "title" "text", "file_name" "text", "mime_type" "text", "file_size" bigint, "visibility_scope" "text", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order public.orders;
begin
  if p_order_id is null then
    raise exception 'order_id required';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company required'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = p_order_id
   limit 1;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id()
     or not public.current_app_user_can_read_order(p_order_id)
     or not (
       public.current_app_user_has_permission('documents.read.all')
       or public.current_app_user_has_permission('documents.read.assigned')
     ) then
    raise exception 'not authorized to list documents for this order'
      using errcode = '42501';
  end if;

  return query
  select
    od.id,
    od.order_id,
    od.company_id,
    od.uploaded_by_user_id,
    od.category,
    od.title,
    od.file_name,
    od.mime_type,
    od.file_size,
    od.visibility_scope,
    od.status,
    od.created_at,
    od.updated_at
  from public.order_documents od
  where od.order_id = p_order_id
    and public.current_app_user_can_read_order_document_row(
      od.company_id,
      od.order_id,
      od.visibility_scope,
      od.status
    )
  order by od.created_at desc, od.id desc;
end;
$$;


ALTER FUNCTION "public"."rpc_order_documents_list"("p_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_documents_list"("p_order_id" "uuid") IS 'Lists safe order document metadata for a readable current-company order. Does not expose raw storage bucket/path or signed URLs.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_filter_clients"() RETURNS TABLE("client_id" bigint, "client_name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_authorized boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  v_authorized :=
    public.current_app_user_has_permission('orders.read.all')
    or public.current_app_user_has_permission('orders.read.assigned')
    or public.current_app_user_has_permission('clients.read.all')
    or public.current_app_user_has_permission('clients.read.assigned');

  if not v_authorized then
    raise exception 'order_filter_clients_permission_required'
      using errcode = '42501';
  end if;

  return query
  select distinct
    c.id as client_id,
    c.name as client_name
  from public.orders o
  join public.clients c
    on c.id = o.client_id
   and coalesce(c.company_id, public.default_company_id()) = v_company_id
  where o.client_id is not null
    and coalesce(o.company_id, public.default_company_id()) = v_company_id
    and nullif(trim(c.name), '') is not null
    and public.current_app_user_can_read_order(o.id)
  order by c.name asc, c.id asc;
end;
$$;


ALTER FUNCTION "public"."rpc_order_filter_clients"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_filter_clients"() IS 'Phase 8C5G4B1 safe Orders filter client option projection. Returns distinct current-company clients attached to readable source orders only; no contact fields, order details, metrics, borrower data, or cross-company clients.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_form_client_create"("p_client" "jsonb") RETURNS TABLE("client_id" bigint, "client_name" "text", "category" "text", "amc_id" bigint, "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_name text := trim(coalesce(p_client->>'name', ''));
  v_amc_id_text text := trim(coalesce(p_client->>'amc_id', ''));
  v_amc_id bigint;
  v_created public.clients%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not (
    public.current_app_user_has_permission('orders.create')
    or public.current_app_user_has_permission('clients.create')
  ) then
    raise exception 'order_form_client_create_permission_required'
      using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'client_name_required'
      using errcode = '22023';
  end if;

  if v_amc_id_text <> '' then
    if v_amc_id_text !~ '^[0-9]+$' then
      raise exception 'invalid_amc'
        using errcode = '23503';
    end if;

    v_amc_id := v_amc_id_text::bigint;
  end if;

  if exists (
    select 1
      from public.clients c
     where coalesce(c.company_id, public.default_company_id()) = v_company_id
       and lower(trim(coalesce(c.name, ''))) = lower(v_name)
       and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
       and coalesce(c.is_merged, false) = false
  ) then
    raise exception 'client_name_already_exists'
      using errcode = '23505';
  end if;

  if v_amc_id is not null and not exists (
    select 1
      from public.clients amc
     where amc.id = v_amc_id
       and coalesce(amc.company_id, public.default_company_id()) = v_company_id
       and lower(coalesce(nullif(amc.status, ''), 'active')) = 'active'
       and coalesce(amc.is_merged, false) = false
       and lower(coalesce(nullif(amc.category, ''), nullif(amc.client_type, ''), nullif(amc.kind, ''), 'client')) = 'amc'
  ) then
    raise exception 'invalid_amc'
      using errcode = '23503';
  end if;

  insert into public.clients (
    name,
    status,
    category,
    amc_id,
    company_id
  )
  values (
    v_name,
    'active',
    'client',
    v_amc_id,
    v_company_id
  )
  returning * into v_created;

  return query
  select
    v_created.id as client_id,
    v_created.name as client_name,
    lower(coalesce(nullif(v_created.category, ''), 'client')) as category,
    v_created.amc_id,
    coalesce(nullif(v_created.status, ''), 'active') as status;
end;
$_$;


ALTER FUNCTION "public"."rpc_order_form_client_create"("p_client" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_form_client_create"("p_client" "jsonb") IS 'Phase 8C5G4C3A narrow inline order-form client creation RPC. Creates active current-company client rows only, validates optional current-company active non-merged AMC attachment, and returns a safe created-client projection.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_form_client_name_search"("p_search" "text", "p_limit" integer DEFAULT 5) RETURNS TABLE("client_id" bigint, "client_name" "text", "category" "text", "status" "text", "is_merged" boolean, "merged_into_id" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_search text := trim(coalesce(p_search, ''));
  v_limit integer := least(greatest(coalesce(p_limit, 5), 1), 25);
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_use_order_form_client_options() then
    raise exception 'order_form_client_options_permission_required'
      using errcode = '42501';
  end if;

  if length(v_search) < 2 then
    return;
  end if;

  return query
  select
    c.id as client_id,
    c.name as client_name,
    lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as category,
    coalesce(nullif(c.status, ''), 'active') as status,
    coalesce(c.is_merged, false) as is_merged,
    c.merged_into_id
  from public.clients c
  where coalesce(c.company_id, public.default_company_id()) = v_company_id
    and nullif(trim(c.name), '') is not null
    and c.name ilike ('%' || v_search || '%')
  order by
    case when lower(trim(c.name)) = lower(v_search) then 0 else 1 end,
    c.name asc,
    c.id asc
  limit v_limit;
end;
$$;


ALTER FUNCTION "public"."rpc_order_form_client_name_search"("p_search" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_form_client_name_search"("p_search" "text", "p_limit" integer) IS 'Phase 8C5G4C1 safe current-company order form duplicate-name search. Returns limited client identity/status fields only and clamps result limits.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_form_client_options"() RETURNS TABLE("client_id" bigint, "client_name" "text", "category" "text", "amc_id" bigint, "is_merged" boolean, "contact_name" "text", "contact_email" "text", "contact_phone" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_use_order_form_client_options() then
    raise exception 'order_form_client_options_permission_required'
      using errcode = '42501';
  end if;

  return query
  select
    c.id as client_id,
    c.name as client_name,
    lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as category,
    c.amc_id,
    coalesce(c.is_merged, false) as is_merged,
    c.contact_name_1 as contact_name,
    c.contact_email_1 as contact_email,
    c.contact_phone_1 as contact_phone
  from public.clients c
  where coalesce(c.company_id, public.default_company_id()) = v_company_id
    and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
    and coalesce(c.is_merged, false) = false
    and nullif(trim(c.name), '') is not null
  order by
    case lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client'))
      when 'amc' then 0
      else 1
    end,
    c.name asc,
    c.id asc;
end;
$$;


ALTER FUNCTION "public"."rpc_order_form_client_options"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_form_client_options"() IS 'Phase 8C5G4C1 safe current-company order form client/AMC picker projection. Returns active non-merged clients and AMCs with limited contact preview fields only.';



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


ALTER FUNCTION "public"."rpc_order_log_note"("p_order_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_order_mark_complete"("p_order_id" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_order_mark_complete(text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_order_mark_complete"("p_order_id" "text", "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_mark_complete"("p_order_id" "text", "p_note" "text") IS 'Slice 7F3 quarantine. Deprecated completion override workflow RPC; app roles must use rpc_transition_order_status(uuid,text,text).';



CREATE OR REPLACE FUNCTION "public"."rpc_order_number_override"("p_order_id" "uuid", "p_order_number" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_company_id uuid := public.current_company_id();
  v_order_number text := btrim(coalesce(p_order_number, ''));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_existing public.orders%rowtype;
  v_updated public.orders%rowtype;
  v_conflicting_order_id uuid := null;
  v_activity_id uuid := null;
  v_actor record;
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_legacy_profile_id uuid := null;
  v_message text;
begin
  if p_order_id is null then
    raise exception 'order_id_required'
      using errcode = '22023';
  end if;

  if auth.role() <> 'service_role'
     and v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if auth.role() <> 'service_role'
     and not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select *
    into v_existing
    from public.orders o
   where o.id = p_order_id
   for update;

  if not found then
    raise exception 'order_not_found'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order_not_in_current_company'
      using errcode = '42501';
  end if;

  if auth.role() <> 'service_role'
     and not public.current_app_user_has_permission('orders.update.all') then
    raise exception 'order_number_override_not_authorized'
      using errcode = '42501';
  end if;

  if v_order_number = '' then
    raise exception 'order_number_required'
      using errcode = '22023';
  end if;

  if length(v_order_number) > 80 then
    raise exception 'order_number_too_long'
      using errcode = '22023';
  end if;

  if v_order_number !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$' then
    raise exception 'order_number_invalid_format'
      using errcode = '22023';
  end if;

  if coalesce(v_existing.order_number, '') = v_order_number then
    return jsonb_build_object(
      'status', 'unchanged',
      'order_id', p_order_id,
      'company_id', v_company_id,
      'old_order_number', v_existing.order_number,
      'new_order_number', v_order_number,
      'activity_id', null,
      'reason_required', false,
      'reason', v_reason,
      'warnings', jsonb_build_array(
        jsonb_build_object(
          'code', 'global_uniqueness_still_enforced',
          'message', 'Global order-number uniqueness remains active during migration.'
        )
      )
    );
  end if;

  select o.id
    into v_conflicting_order_id
    from public.orders o
   where coalesce(o.company_id, public.default_company_id()) = v_company_id
     and coalesce(o.order_number, '') = v_order_number
     and o.id <> p_order_id
   order by o.created_at asc nulls last, o.id asc
   limit 1;

  if v_conflicting_order_id is not null then
    raise exception 'order_number_unavailable'
      using errcode = '23505';
  end if;

  begin
    update public.orders
       set order_number = v_order_number,
           updated_at = now()
     where id = p_order_id
       and coalesce(company_id, public.default_company_id()) = v_company_id
    returning * into v_updated;
  exception
    when unique_violation then
      raise exception 'order_number_globally_reserved_during_transition'
        using errcode = '23505';
  end;

  select * into v_actor from public._activity_actor();
  select p.id
    into v_legacy_profile_id
    from public.profiles_legacy p
   where p.id = v_auth_uid
   limit 1;

  v_message := format(
    'Order number changed from %s to %s',
    coalesce(v_existing.order_number, '(none)'),
    v_order_number
  );

  insert into public.activity_log (
    order_id,
    company_id,
    event_type,
    message,
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
    v_company_id,
    'order_number.manual_override',
    v_message,
    jsonb_build_object(
      'old_order_number', v_existing.order_number,
      'new_order_number', v_order_number,
      'reason', v_reason,
      'source', 'rpc_order_number_override',
      'scope', 'company'
    ),
    v_app_uid,
    v_auth_uid,
    v_legacy_profile_id,
    v_actor.full_name,
    v_actor.email,
    now()
  )
  returning id into v_activity_id;

  return jsonb_build_object(
    'status', 'updated',
    'order_id', p_order_id,
    'company_id', v_company_id,
    'old_order_number', v_existing.order_number,
    'new_order_number', v_updated.order_number,
    'activity_id', v_activity_id,
    'reason_required', false,
    'reason', v_reason,
    'warnings', jsonb_build_array(
      jsonb_build_object(
        'code', 'global_uniqueness_still_enforced',
        'message', 'Global order-number uniqueness remains active during migration.'
      )
    )
  );
end;
$_$;


ALTER FUNCTION "public"."rpc_order_number_override"("p_order_id" "uuid", "p_order_number" "text", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_number_override"("p_order_id" "uuid", "p_order_number" "text", "p_reason" "text") IS 'Phase 10I5 explicit order-number override RPC. Preserves authorization and activity logging while using actor_user_id as canonical app-user attribution and FK-safe legacy created_by handling.';



CREATE TABLE IF NOT EXISTS "public"."order_operational_inputs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "input_type" "text" NOT NULL,
    "actor_user_id" "uuid" NOT NULL,
    "actor_role" "text",
    "actor_context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "note" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "cleared_at" timestamp with time zone,
    "cleared_by_user_id" "uuid",
    CONSTRAINT "order_operational_inputs_actor_context_object_check" CHECK (("jsonb_typeof"("actor_context") = 'object'::"text")),
    CONSTRAINT "order_operational_inputs_clear_consistency_check" CHECK (((("cleared_at" IS NULL) AND ("cleared_by_user_id" IS NULL)) OR (("cleared_at" IS NOT NULL) AND ("cleared_by_user_id" IS NOT NULL)))),
    CONSTRAINT "order_operational_inputs_expires_after_created_check" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "order_operational_inputs_input_type_check" CHECK (("input_type" = ANY (ARRAY['inspection_scheduled'::"text", 'report_on_track'::"text", 'waiting_on_client'::"text"]))),
    CONSTRAINT "order_operational_inputs_note_length_check" CHECK ((("note" IS NULL) OR ("char_length"("note") <= 500))),
    CONSTRAINT "order_operational_inputs_payload_object_check" CHECK (("jsonb_typeof"("payload") = 'object'::"text")),
    CONSTRAINT "order_operational_inputs_source_check" CHECK (("source" = 'manual'::"text"))
);


ALTER TABLE "public"."order_operational_inputs" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_operational_inputs" IS 'Append-friendly, non-authoritative operational evidence records for orders.';



COMMENT ON COLUMN "public"."order_operational_inputs"."input_type" IS 'First-wave operational evidence type. This does not mutate lifecycle state.';



COMMENT ON COLUMN "public"."order_operational_inputs"."expires_at" IS 'Freshness boundary used by resolvers. Expired records remain audit evidence.';



COMMENT ON COLUMN "public"."order_operational_inputs"."cleared_at" IS 'Manual clear timestamp. Clearing does not delete evidence.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_operational_input_clear"("p_input_id" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."order_operational_inputs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_auth_uid uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_input public.order_operational_inputs;
  v_order public.orders;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_actor record;
  v_legacy_profile_id uuid;
  v_row public.order_operational_inputs;
  v_can_update_order boolean := false;
  v_label text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found' using errcode = 'P0001';
  end if;

  if p_input_id is null then
    raise exception 'operational_input_id_required' using errcode = '22023';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'operational_input_note_too_long' using errcode = '22023';
  end if;

  select *
    into v_input
  from public.order_operational_inputs
  where id = p_input_id
  for update;

  if not found then
    raise exception 'operational_input_not_found' using errcode = 'P0002';
  end if;

  select *
    into v_order
  from public.orders
  where id = v_input.order_id
  limit 1;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if not public.current_app_user_has_current_company()
    or v_company_id is null
    or v_input.company_id <> v_company_id
    or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order_operational_input_company_scope_denied' using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(v_order.id) then
    raise exception 'order_operational_input_read_denied' using errcode = '42501';
  end if;

  v_can_update_order := public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  );

  if v_input.actor_user_id <> v_actor_user_id and not v_can_update_order then
    raise exception 'order_operational_input_clear_denied' using errcode = '42501';
  end if;

  if v_input.cleared_at is not null then
    raise exception 'operational_input_already_cleared' using errcode = '22023';
  end if;

  update public.order_operational_inputs
  set
    cleared_at = now(),
    cleared_by_user_id = v_actor_user_id
  where id = v_input.id
  returning * into v_row;

  select * into v_actor from public._activity_actor();

  if v_auth_uid is not null then
    select p.id
      into v_legacy_profile_id
    from public.profiles_legacy p
    where p.id = v_auth_uid
    limit 1;
  end if;

  v_label := case v_input.input_type
    when 'inspection_scheduled' then 'Inspection scheduled'
    when 'report_on_track' then 'Report on track'
    when 'waiting_on_client' then 'Waiting on client response'
    else v_input.input_type
  end;

  insert into public.activity_log (
    order_id,
    company_id,
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
    v_order.id,
    v_company_id,
    'order_operational_input.cleared',
    'Operational status cleared: ' || v_label || '.',
    jsonb_build_object(
      'operational_input_id', v_row.id,
      'input_type', v_row.input_type,
      'cleared_at', v_row.cleared_at,
      'clear_note', v_note
    ),
    v_actor_user_id,
    v_auth_uid,
    v_legacy_profile_id,
    v_actor.full_name,
    v_actor.email
  );

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_order_operational_input_clear"("p_input_id" "uuid", "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_operational_input_clear"("p_input_id" "uuid", "p_note" "text") IS 'Clears manual operational evidence without deleting evidence or mutating order lifecycle state.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_operational_input_create"("p_order_id" "uuid", "p_input_type" "text", "p_note" "text" DEFAULT NULL::"text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb", "p_source" "text" DEFAULT 'manual'::"text") RETURNS "public"."order_operational_inputs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_auth_uid uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_order public.orders;
  v_input_type text := lower(btrim(coalesce(p_input_type, '')));
  v_source text := lower(btrim(coalesce(p_source, 'manual')));
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_created_at timestamptz := now();
  v_expires_at timestamptz;
  v_actor_role text;
  v_actor record;
  v_legacy_profile_id uuid;
  v_row public.order_operational_inputs;
  v_message text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found' using errcode = 'P0001';
  end if;

  if p_order_id is null then
    raise exception 'order_id_required' using errcode = '22023';
  end if;

  if v_input_type not in ('inspection_scheduled', 'report_on_track', 'waiting_on_client') then
    raise exception 'invalid_operational_input_type' using errcode = '22023';
  end if;

  if v_source <> 'manual' then
    raise exception 'invalid_operational_input_source' using errcode = '22023';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'operational_input_payload_must_be_object' using errcode = '22023';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'operational_input_note_too_long' using errcode = '22023';
  end if;

  select *
    into v_order
  from public.orders
  where id = p_order_id
  limit 1;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if not public.current_app_user_has_current_company()
    or v_company_id is null
    or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order_operational_input_company_scope_denied' using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(v_order.id) then
    raise exception 'order_operational_input_read_denied' using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order_operational_input_create_denied' using errcode = '42501';
  end if;

  v_expires_at := case v_input_type
    when 'inspection_scheduled' then v_created_at + interval '7 days'
    when 'report_on_track' then v_created_at + interval '48 hours'
    when 'waiting_on_client' then v_created_at + interval '72 hours'
  end;

  select r.name
    into v_actor_role
  from public.user_role_assignments ura
  join public.roles r on r.id = ura.role_id
  where ura.user_id = v_actor_user_id
    and ura.company_id = v_company_id
    and ura.status = 'active'
    and (ura.expires_at is null or ura.expires_at > now())
  order by
    ura.is_primary desc,
    case lower(btrim(r.name))
      when 'owner' then 1
      when 'admin' then 2
      when 'reviewer' then 3
      when 'appraiser' then 4
      else 99
    end,
    r.name
  limit 1;

  insert into public.order_operational_inputs (
    company_id,
    order_id,
    input_type,
    actor_user_id,
    actor_role,
    actor_context,
    note,
    payload,
    source,
    created_at,
    expires_at
  )
  values (
    v_company_id,
    v_order.id,
    v_input_type,
    v_actor_user_id,
    v_actor_role,
    jsonb_build_object('role', v_actor_role),
    v_note,
    v_payload,
    v_source,
    v_created_at,
    v_expires_at
  )
  returning * into v_row;

  select * into v_actor from public._activity_actor();

  if v_auth_uid is not null then
    select p.id
      into v_legacy_profile_id
    from public.profiles_legacy p
    where p.id = v_auth_uid
    limit 1;
  end if;

  v_message := case v_input_type
    when 'inspection_scheduled' then 'Inspection scheduled.'
    when 'report_on_track' then 'Report marked on track.'
    when 'waiting_on_client' then 'Waiting on client response.'
  end;

  insert into public.activity_log (
    order_id,
    company_id,
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
    v_order.id,
    v_company_id,
    'order_operational_input.created',
    v_message,
    jsonb_build_object(
      'operational_input_id', v_row.id,
      'input_type', v_input_type,
      'source', v_source,
      'expires_at', v_expires_at,
      'note', v_note,
      'payload', v_payload
    ),
    v_actor_user_id,
    v_auth_uid,
    v_legacy_profile_id,
    v_actor.full_name,
    v_actor.email
  );

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_order_operational_input_create"("p_order_id" "uuid", "p_input_type" "text", "p_note" "text", "p_payload" "jsonb", "p_source" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_operational_input_create"("p_order_id" "uuid", "p_input_type" "text", "p_note" "text", "p_payload" "jsonb", "p_source" "text") IS 'Creates manual, non-authoritative operational evidence for an order and logs activity.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_ready_to_send"("p_order_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_order_ready_to_send(text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_order_ready_to_send"("p_order_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_ready_to_send"("p_order_id" "text") IS 'Slice 7F3 quarantine. Deprecated ready-to-send workflow RPC with stale lifecycle semantics; app roles must use rpc_transition_order_status(uuid,text,text).';



CREATE OR REPLACE FUNCTION "public"."rpc_order_saved_view_create"("p_name" "text", "p_filters" "jsonb") RETURNS TABLE("id" "uuid", "company_id" "uuid", "user_id" "uuid", "name" "text", "filters" "jsonb", "sort_order" integer, "is_default" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.current_company_id();
  v_app_uid uuid := public.current_app_user_id();
  v_name text;
  v_filters jsonb;
  v_sort_order integer;
  v_row public.order_saved_views%rowtype;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  v_name := public.order_saved_view_trim_name(p_name);
  v_filters := public.order_saved_view_validate_filters(p_filters);

  select coalesce(max(osv.sort_order), 0) + 1
    into v_sort_order
    from public.order_saved_views osv
   where osv.company_id = v_company_id
     and osv.user_id = v_app_uid;

  insert into public.order_saved_views (
    company_id,
    user_id,
    name,
    filters,
    sort_order
  )
  values (
    v_company_id,
    v_app_uid,
    v_name,
    v_filters,
    v_sort_order
  )
  returning * into v_row;

  return query
  select
    v_row.id,
    v_row.company_id,
    v_row.user_id,
    v_row.name,
    v_row.filters,
    v_row.sort_order,
    v_row.is_default,
    v_row.created_at,
    v_row.updated_at;
end;
$$;


ALTER FUNCTION "public"."rpc_order_saved_view_create"("p_name" "text", "p_filters" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_saved_view_create"("p_name" "text", "p_filters" "jsonb") IS 'Saved Views Slice 1D create RPC. Creates a current-company, current-app-user saved Orders view after name and filter allowlist validation.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_saved_view_delete"("p_view_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.current_company_id();
  v_app_uid uuid := public.current_app_user_id();
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if p_view_id is null then
    raise exception 'saved_view_id_required'
      using errcode = '22023';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  delete from public.order_saved_views osv
   where osv.id = p_view_id
     and osv.company_id = v_company_id
     and osv.user_id = v_app_uid;

  if not found then
    raise exception 'saved_view_not_found'
      using errcode = '42501';
  end if;

  return true;
end;
$$;


ALTER FUNCTION "public"."rpc_order_saved_view_delete"("p_view_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_saved_view_delete"("p_view_id" "uuid") IS 'Saved Views Slice 1D delete RPC. Deletes a saved Orders view owned by the current app user in the current company.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_saved_view_update"("p_view_id" "uuid", "p_name" "text", "p_filters" "jsonb") RETURNS TABLE("id" "uuid", "company_id" "uuid", "user_id" "uuid", "name" "text", "filters" "jsonb", "sort_order" integer, "is_default" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.current_company_id();
  v_app_uid uuid := public.current_app_user_id();
  v_name text;
  v_filters jsonb;
  v_row public.order_saved_views%rowtype;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if p_view_id is null then
    raise exception 'saved_view_id_required'
      using errcode = '22023';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  v_name := public.order_saved_view_trim_name(p_name);
  v_filters := public.order_saved_view_validate_filters(p_filters);

  update public.order_saved_views osv
     set name = v_name,
         filters = v_filters,
         updated_at = now()
   where osv.id = p_view_id
     and osv.company_id = v_company_id
     and osv.user_id = v_app_uid
  returning * into v_row;

  if not found then
    raise exception 'saved_view_not_found'
      using errcode = '42501';
  end if;

  return query
  select
    v_row.id,
    v_row.company_id,
    v_row.user_id,
    v_row.name,
    v_row.filters,
    v_row.sort_order,
    v_row.is_default,
    v_row.created_at,
    v_row.updated_at;
end;
$$;


ALTER FUNCTION "public"."rpc_order_saved_view_update"("p_view_id" "uuid", "p_name" "text", "p_filters" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_saved_view_update"("p_view_id" "uuid", "p_name" "text", "p_filters" "jsonb") IS 'Saved Views Slice 1D update RPC. Updates name and filters only for a saved Orders view owned by the current app user in the current company.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_saved_views_list"() RETURNS TABLE("id" "uuid", "company_id" "uuid", "user_id" "uuid", "name" "text", "filters" "jsonb", "sort_order" integer, "is_default" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.current_company_id();
  v_app_uid uuid := public.current_app_user_id();
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  return query
  select
    osv.id,
    osv.company_id,
    osv.user_id,
    osv.name,
    osv.filters,
    osv.sort_order,
    osv.is_default,
    osv.created_at,
    osv.updated_at
  from public.order_saved_views osv
  where osv.company_id = v_company_id
    and osv.user_id = v_app_uid
  order by
    osv.sort_order nulls last,
    osv.created_at,
    osv.name,
    osv.id;
end;
$$;


ALTER FUNCTION "public"."rpc_order_saved_views_list"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_saved_views_list"() IS 'Saved Views Slice 1D list RPC. Returns current-company, current-app-user saved Orders views with allowlisted filter payloads only.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_send_to_client"("p_order_id" "text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_order_send_to_client(text,jsonb) is deprecated and quarantined; workflow send-to-client behavior must use a tenant-safe canonical path'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_order_send_to_client"("p_order_id" "text", "p_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_send_to_client"("p_order_id" "text", "p_payload" "jsonb") IS 'Slice 7F3 quarantine. Deprecated send-to-client workflow event RPC without tenant-safe lifecycle governance; rewrite before re-enabling.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_review_due_at" "date" DEFAULT NULL::"date", "p_due_date" "date" DEFAULT NULL::"date") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_order_set_dates(uuid,timestamp,date,date) is deprecated and quarantined; use tenant-safe direct orders updates or rpc_update_order_dates(uuid,timestamptz,timestamptz,timestamptz)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp without time zone, "p_review_due_at" "date", "p_due_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp without time zone, "p_review_due_at" "date", "p_due_date" "date") IS 'Slice 7F4A quarantine. Deprecated mixed legacy date RPC; use tenant-safe direct orders updates or rpc_update_order_dates.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_review_due_at" "date" DEFAULT NULL::"date", "p_final_due_at" "date" DEFAULT NULL::"date", "p_due_date" "date" DEFAULT NULL::"date") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_order_set_dates(uuid,timestamptz,date,date,date) is deprecated and quarantined; use tenant-safe direct orders updates or rpc_update_order_dates(uuid,timestamptz,timestamptz,timestamptz)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp with time zone, "p_review_due_at" "date", "p_final_due_at" "date", "p_due_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp with time zone, "p_review_due_at" "date", "p_final_due_at" "date", "p_due_date" "date") IS 'Slice 7F4A quarantine. Deprecated mixed legacy date RPC; use tenant-safe direct orders updates or rpc_update_order_dates.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_set_status"("p_order_id" "text", "p_status" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_order_set_status(text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_order_set_status"("p_order_id" "text", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_set_status"("p_order_id" "text", "p_status" "text") IS 'Slice 7F3 quarantine. Deprecated text-id arbitrary status mutation RPC with stale lifecycle semantics; app roles must use rpc_transition_order_status(uuid,text,text).';



CREATE OR REPLACE FUNCTION "public"."rpc_order_set_status"("p_order_id" "uuid", "p_status" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_order_set_status(uuid,text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_order_set_status"("p_order_id" "uuid", "p_status" "text", "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_set_status"("p_order_id" "uuid", "p_status" "text", "p_note" "text") IS 'Slice 7F3 quarantine. Deprecated uuid arbitrary status mutation RPC; app roles must use rpc_transition_order_status(uuid,text,text).';



CREATE OR REPLACE FUNCTION "public"."rpc_order_update"("p_order_id" "text", "p_patch" "jsonb") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if coalesce(p_patch, '{}'::jsonb) ? 'order_number' then
    raise exception 'generic order update RPCs do not accept order_number; use rpc_order_number_override'
      using errcode = '22023';
  end if;

  raise exception 'rpc_order_update(text,jsonb) is deprecated and quarantined; use rpc_order_update(uuid,jsonb), rpc_update_order(uuid,jsonb), or direct authorized orders writes'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_order_update"("p_order_id" "text", "p_patch" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_update"("p_order_id" "text", "p_patch" "jsonb") IS 'Phase 10E8L quarantine preservation. Deprecated text-id order update RPC remains service_role-only and rejects order_number patch keys before raising the legacy quarantine exception.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_update"("p_order_id" "uuid", "p" "jsonb") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_existing public.orders;
  v_row public.orders;
  v_client_id public.orders.client_id%TYPE := null;
  v_managing_amc_id public.orders.managing_amc_id%TYPE := null;
  v_appraiser_id public.orders.appraiser_id%TYPE := null;
  v_reviewer_id public.orders.reviewer_id%TYPE := null;
begin
  if coalesce(p, '{}'::jsonb) ? 'order_number' then
    raise exception 'generic order update RPCs do not accept order_number; use rpc_order_number_override'
      using errcode = '22023';
  end if;

  select *
    into v_existing
    from public.orders
   where id = p_order_id;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_existing.company_id,
    v_existing.appraiser_id,
    v_existing.assigned_to,
    v_existing.reviewer_id,
    v_existing.status
  ) then
    raise exception 'not authorized to update order %', p_order_id
      using errcode = '42501';
  end if;

  if p ? 'client_id' then
    v_client_id := nullif(p->>'client_id', '')::bigint;
    if v_client_id is not null
       and not public.current_app_user_can_attach_order_client(v_client_id) then
      raise exception 'client_id % is not attachable to orders in the current company', v_client_id
        using errcode = '42501';
    end if;
  end if;

  if p ? 'managing_amc_id' then
    v_managing_amc_id := nullif(p->>'managing_amc_id', '')::bigint;
    if v_managing_amc_id is not null
       and not public.current_app_user_can_attach_order_amc(v_managing_amc_id) then
      raise exception 'managing_amc_id % is not an attachable current-company AMC client', v_managing_amc_id
        using errcode = '42501';
    end if;
  end if;

  if p ? 'appraiser_id' then
    v_appraiser_id := public.fn_to_users_id((p->>'appraiser_id')::uuid);
  end if;

  if p ? 'reviewer_id' then
    v_reviewer_id := public.fn_to_users_id((p->>'reviewer_id')::uuid);
  end if;

  update public.orders o
  set
    title            = coalesce(p->>'title', o.title),
    address          = coalesce(p->>'address', o.address),
    city             = coalesce(p->>'city', o.city),
    state            = coalesce(p->>'state', o.state),
    zip              = coalesce(p->>'zip', o.zip),
    client_id        = case when p ? 'client_id' then v_client_id else o.client_id end,
    managing_amc_id  = case when p ? 'managing_amc_id' then v_managing_amc_id else o.managing_amc_id end,
    appraiser_id     = coalesce(v_appraiser_id, o.appraiser_id),
    reviewer_id      = coalesce(v_reviewer_id,  o.reviewer_id),
    due_date         = coalesce((p->>'due_date')::date, o.due_date),
    review_due_date  = coalesce((p->>'review_due_date')::date, o.review_due_date),
    site_visit_at    = coalesce((p->>'site_visit_at')::timestamp, o.site_visit_at),
    fee_amount       = coalesce((p->>'fee_amount')::numeric, o.fee_amount),
    is_archived      = coalesce((p->>'is_archived')::boolean, o.is_archived),
    updated_at       = now()
  where o.id = p_order_id
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_order_update"("p_order_id" "uuid", "p" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_update"("p_order_id" "uuid", "p" "jsonb") IS 'Phase 10E8L generic order update RPC. Preserves ordinary order updates but rejects order_number patch keys; use rpc_order_number_override(uuid,text,text) for audited order-number changes.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_update_dates"("p_order_id" "text", "p_site_visit_at" timestamp with time zone, "p_review_due_at" timestamp with time zone, "p_final_due_at" timestamp with time zone, "p_due_date" timestamp with time zone) RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_order_update_dates(text,timestamptz,timestamptz,timestamptz,timestamptz) is deprecated and quarantined; use tenant-safe direct orders updates or rpc_update_order_dates(uuid,timestamptz,timestamptz,timestamptz)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_order_update_dates"("p_order_id" "text", "p_site_visit_at" timestamp with time zone, "p_review_due_at" timestamp with time zone, "p_final_due_at" timestamp with time zone, "p_due_date" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_update_dates"("p_order_id" "text", "p_site_visit_at" timestamp with time zone, "p_review_due_at" timestamp with time zone, "p_final_due_at" timestamp with time zone, "p_due_date" timestamp with time zone) IS 'Slice 7F4A quarantine. Deprecated text-id date RPC with legacy role checks; use tenant-safe direct orders updates or rpc_update_order_dates.';



CREATE OR REPLACE FUNCTION "public"."rpc_order_void"("p_order_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.current_company_id();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_existing public.orders%rowtype;
  v_updated public.orders%rowtype;
  v_activity_id uuid := null;
  v_actor record;
  v_auth_uid uuid := auth.uid();
  v_app_uid uuid := public.current_app_user_id();
  v_legacy_profile_id uuid := null;
  v_detail jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'authenticated_user_required'
      using errcode = '42501';
  end if;

  if p_order_id is null then
    raise exception 'order_id_required'
      using errcode = '22023';
  end if;

  if v_reason is null then
    raise exception 'void_reason_required'
      using errcode = '22023';
  end if;

  if length(v_reason) > 500 then
    raise exception 'void_reason_too_long'
      using errcode = '22023';
  end if;

  if v_app_uid is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select *
    into v_existing
    from public.orders o
   where o.id = p_order_id
   for update;

  if not found then
    raise exception 'order_not_found'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order_not_in_current_company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order_not_readable'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('orders.void') then
    raise exception 'order_void_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_existing.is_archived, false) then
    raise exception 'archived_order_cannot_be_voided'
      using errcode = '22023';
  end if;

  update public.orders
     set status = 'voided',
         updated_at = now()
   where id = p_order_id
     and coalesce(company_id, public.default_company_id()) = v_company_id
  returning * into v_updated;

  select * into v_actor from public._activity_actor();
  select p.id
    into v_legacy_profile_id
    from public.profiles_legacy p
   where p.id = v_auth_uid
   limit 1;

  v_detail := jsonb_build_object(
    'order_id', p_order_id,
    'reason', v_reason
  );

  insert into public.activity_log (
    order_id,
    company_id,
    event_type,
    message,
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
    v_company_id,
    'order.voided',
    'Order voided',
    v_detail,
    v_app_uid,
    v_auth_uid,
    v_legacy_profile_id,
    v_actor.full_name,
    v_actor.email,
    now()
  )
  returning id into v_activity_id;

  return jsonb_build_object(
    'status', 'voided',
    'order_id', v_updated.id,
    'company_id', v_company_id,
    'order_number', v_updated.order_number,
    'order_status', v_updated.status,
    'is_archived', coalesce(v_updated.is_archived, false),
    'updated_at', v_updated.updated_at,
    'activity_id', v_activity_id
  );
end;
$$;


ALTER FUNCTION "public"."rpc_order_void"("p_order_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_order_void"("p_order_id" "uuid", "p_reason" "text") IS 'CRUD Stabilization Sprint 2O guarded order void RPC. Authenticated current-company callers require readable order scope and orders.void. Requires a reason, rejects archived orders, sets status=voided/updated_at, and writes order.voided activity with safe payload.';



CREATE OR REPLACE FUNCTION "public"."rpc_review_approve"("p_order_id" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_review_approve(text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_review_approve"("p_order_id" "text", "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_review_approve"("p_order_id" "text", "p_note" "text") IS 'Slice 7F3 quarantine. Deprecated review approval workflow RPC with stale ready_to_send semantics; app roles must use rpc_transition_order_status(uuid,text,text).';



CREATE OR REPLACE FUNCTION "public"."rpc_review_request_revisions"("p_order_id" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_review_request_revisions(text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_review_request_revisions"("p_order_id" "text", "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_review_request_revisions"("p_order_id" "text", "p_note" "text") IS 'Slice 7F3 quarantine. Deprecated review revisions workflow RPC with stale revisions semantics; app roles must use rpc_transition_order_status(uuid,text,text).';



CREATE OR REPLACE FUNCTION "public"."rpc_review_start"("p_order_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_review_start(text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_review_start"("p_order_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_review_start"("p_order_id" "text") IS 'Slice 7F3 quarantine. Deprecated review-start workflow RPC with reviewer-claim side effects; app roles must use rpc_transition_order_status(uuid,text,text).';



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


ALTER FUNCTION "public"."rpc_set_admin_status"("p_user_id" "uuid", "p_is_admin" boolean) OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_set_notification_pref"("p_user_id" "uuid", "p_type" "text", "p_channel" "text", "p_enabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_notification_pref_v1"("p_user_id" "uuid", "p_type" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if p_user_id is not null and p_user_id <> v_actor_user_id then
    raise exception 'notification_preference_target_self_required'
      using errcode = '42501';
  end if;

  perform 1
    from public.rpc_current_user_notification_preference_update(
      p_type,
      p_channel,
      p_enabled,
      p_meta
    );
end;
$$;


ALTER FUNCTION "public"."rpc_set_notification_pref_v1"("p_user_id" "uuid", "p_type" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "user_id" "uuid" NOT NULL,
    "email_enabled" boolean DEFAULT true NOT NULL,
    "email_address" "text",
    "digest_mode" "text",
    "quiet_hours" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_set_notification_preferences"("p_email_enabled" boolean, "p_email_address" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_set_review_route"("order_id" "uuid", "route" "jsonb") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_set_user_role"("p_user_id" "uuid", "p_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_set_user_role"("p_user_id" "uuid", "p_role" "text") IS 'Deprecated legacy public.users.role mutation RPC. Browser callers must use company-member role mutation RPCs instead.';



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


ALTER FUNCTION "public"."rpc_set_user_role"("p_user_id" "uuid", "p_role" "text", "p_grant" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_set_user_role"("p_user_id" "uuid", "p_role" "text", "p_grant" boolean) IS 'Deprecated legacy public.user_roles mutation RPC. Browser callers must use company-member role mutation RPCs instead.';



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


ALTER FUNCTION "public"."rpc_system_insert_notification"("p_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_link_path" "text", "p_payload" "jsonb", "p_priority" "text", "p_category" "text") OWNER TO "postgres";


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

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id() then
    raise exception 'order is not in the current company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order is not updateable by current user'
      using errcode = '42501';
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


ALTER FUNCTION "public"."rpc_transition_order_status"("p_order_id" "uuid", "p_transition_key" "text", "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_transition_order_status"("p_order_id" "uuid", "p_transition_key" "text", "p_note" "text") IS 'Slice 7F2 canonical workflow transition boundary. Preserves transition semantics while requiring current-company membership, readable order, updateable order, and current-company order ownership before mutation.';



CREATE OR REPLACE FUNCTION "public"."rpc_update_client"("client_id" bigint, "patch" "jsonb") RETURNS "public"."clients"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  r public.clients;
  v_client public.clients%rowtype;
begin
  select *
    into v_client
    from public.clients c
   where c.id = $1
   for update;

  if not found then
    raise exception 'Client not found';
  end if;

  if not public.current_app_user_can_update_client_row(v_client.company_id, v_client.id) then
    raise exception 'client update permission is required';
  end if;

  update public.clients c
     set name   = coalesce(nullif(patch->>'name', ''), c.name),
         status = coalesce(nullif(patch->>'status', ''), c.status)
   where c.id = v_client.id
  returning * into r;

  return r;
end;
$_$;


ALTER FUNCTION "public"."rpc_update_client"("client_id" bigint, "patch" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_update_client"("client_id" bigint, "patch" "jsonb") IS 'Slice 7E2 compatibility wrapper. Preserves legacy signature while enforcing current_app_user_can_update_client_row(...). Prefer direct table writes for active frontend paths.';



CREATE OR REPLACE FUNCTION "public"."rpc_update_due_dates"("p_order_id" "uuid", "p_due_date" "date", "p_review_due_date" "date") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order public.orders;
  v_row public.orders;
begin
  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id() then
    raise exception 'order is not in the current company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order is not updateable by current user'
      using errcode = '42501';
  end if;

  update public.orders
     set due_date = p_due_date,
         review_due_date = p_review_due_date,
         updated_at = now()
   where id = p_order_id
   returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_update_due_dates"("p_order_id" "uuid", "p_due_date" "date", "p_review_due_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_update_due_dates"("p_order_id" "uuid", "p_due_date" "date", "p_review_due_date" "date") IS 'Slice 7F4A guarded compatibility RPC. Requires current-company membership plus readable/updateable order before date mutation.';



CREATE OR REPLACE FUNCTION "public"."rpc_update_order"("order_id" "uuid", "patch" "jsonb") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_patch jsonb := coalesce(patch, '{}'::jsonb);
  has_client boolean := v_patch ? 'client_id';
  has_managing_amc boolean := v_patch ? 'managing_amc_id';
  has_client_contact boolean := v_patch ? 'client_contact_id';
  has_manual_client boolean := (v_patch ? 'manual_client') or (v_patch ? 'manual_client_name');
  has_appraiser boolean := v_patch ? 'appraiser_id';
  has_reviewer boolean := v_patch ? 'reviewer_id';
  has_property_address boolean := v_patch ? 'property_address';
  has_city boolean := v_patch ? 'city';
  has_state boolean := v_patch ? 'state';
  has_postal_code boolean := v_patch ? 'postal_code';
  has_base_fee boolean := v_patch ? 'base_fee';
  has_split_pct boolean := v_patch ? 'split_pct';
  has_appraiser_split boolean := v_patch ? 'appraiser_split';
  has_appraiser_fee boolean := v_patch ? 'appraiser_fee';
  has_property_type boolean := v_patch ? 'property_type';
  has_report_type boolean := v_patch ? 'report_type';
  has_entry_contact_name boolean := v_patch ? 'entry_contact_name';
  has_entry_contact_phone boolean := v_patch ? 'entry_contact_phone';
  has_site_visit_at boolean := v_patch ? 'site_visit_at';
  has_review_due_at boolean := v_patch ? 'review_due_at';
  has_final_due_at boolean := v_patch ? 'final_due_at';
  has_notes boolean := v_patch ? 'notes';
  in_client text := v_patch->>'client_id';
  in_managing_amc text := v_patch->>'managing_amc_id';
  in_client_contact text := v_patch->>'client_contact_id';
  v_client_id bigint;
  v_managing_amc_id bigint;
  v_client_contact_id bigint;
  v_client_contact public.client_contacts%rowtype;
  v_manual text := coalesce(
    v_patch->>'manual_client_name',
    v_patch->>'manual_client'
  );
  v_split numeric;
  v_existing public.orders;
  v_target_client_id bigint;
  v_clear_client_contact boolean := false;
  v_row public.orders;
begin
  if jsonb_typeof(v_patch) <> 'object' then
    raise exception 'order update patch must be a JSON object'
      using errcode = '22023';
  end if;

  if v_patch ? 'order_number' then
    raise exception 'generic order update RPCs do not accept order_number; use rpc_order_number_override'
      using errcode = '22023';
  end if;

  if v_patch ? 'client_contact_name'
     or v_patch ? 'client_contact_title'
     or v_patch ? 'client_contact_email'
     or v_patch ? 'client_contact_phone' then
    raise exception 'client contact snapshot fields are server-managed'
      using errcode = '22023';
  end if;

  select *
    into v_existing
    from public.orders
   where id = order_id;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_existing.company_id,
    v_existing.appraiser_id,
    v_existing.assigned_to,
    v_existing.reviewer_id,
    v_existing.status
  ) then
    raise exception 'not authorized to update order %', order_id
      using errcode = '42501';
  end if;

  if has_client then
    v_client_id := nullif(in_client, '')::bigint;
    if v_client_id is not null
       and not public.current_app_user_can_attach_order_client(v_client_id) then
      raise exception 'client_id % is not attachable to orders in the current company', v_client_id
        using errcode = '42501';
    end if;
  end if;

  if has_managing_amc then
    v_managing_amc_id := nullif(in_managing_amc, '')::bigint;
    if v_managing_amc_id is not null
       and not public.current_app_user_can_attach_order_amc(v_managing_amc_id) then
      raise exception 'managing_amc_id % is not an attachable current-company AMC client', v_managing_amc_id
        using errcode = '42501';
    end if;
  end if;

  v_target_client_id := case when has_client then v_client_id else v_existing.client_id end;

  if has_client_contact then
    v_client_contact_id := nullif(in_client_contact, '')::bigint;

    if v_client_contact_id is not null then
      if v_target_client_id is null then
        raise exception 'client_contact_requires_client'
          using errcode = '22023';
      end if;

      select *
        into v_client_contact
        from public.client_contacts cc
       where cc.id = v_client_contact_id
         and cc.company_id = v_existing.company_id
         and cc.client_id = v_target_client_id
         and cc.status = 'active';

      if not found then
        raise exception 'client_contact_not_found'
          using errcode = 'P0002';
      end if;
    end if;
  elsif has_client and v_client_id is distinct from v_existing.client_id then
    v_clear_client_contact := true;
  end if;

  if has_split_pct then
    v_split := nullif(v_patch->>'split_pct', '')::numeric;
  elsif has_appraiser_split then
    v_split := nullif(v_patch->>'appraiser_split', '')::numeric;
  end if;

  update public.orders
     set client_id        = case when has_client then v_client_id else client_id end,
         managing_amc_id  = case when has_managing_amc then v_managing_amc_id else managing_amc_id end,
         client_contact_id = case
           when has_client_contact then v_client_contact_id
           when v_clear_client_contact then null
           else client_contact_id
         end,
         client_contact_name = case
           when has_client_contact and v_client_contact_id is not null then v_client_contact.name
           when has_client_contact or v_clear_client_contact then null
           else client_contact_name
         end,
         client_contact_title = case
           when has_client_contact and v_client_contact_id is not null then v_client_contact.title
           when has_client_contact or v_clear_client_contact then null
           else client_contact_title
         end,
         client_contact_email = case
           when has_client_contact and v_client_contact_id is not null then v_client_contact.email
           when has_client_contact or v_clear_client_contact then null
           else client_contact_email
         end,
         client_contact_phone = case
           when has_client_contact and v_client_contact_id is not null then v_client_contact.phone
           when has_client_contact or v_clear_client_contact then null
           else client_contact_phone
         end,
         manual_client    = case when has_manual_client then nullif(v_manual, '') else manual_client end,
         manual_client_name = case when has_manual_client then nullif(v_manual, '') else manual_client_name end,
         appraiser_id     = case when has_appraiser then nullif(v_patch->>'appraiser_id', '')::uuid else appraiser_id end,
         reviewer_id      = case when has_reviewer then nullif(v_patch->>'reviewer_id', '')::uuid else reviewer_id end,
         property_address = case when has_property_address then nullif(v_patch->>'property_address', '') else property_address end,
         city             = case when has_city then nullif(v_patch->>'city', '') else city end,
         state            = case when has_state then nullif(v_patch->>'state', '') else state end,
         postal_code      = case when has_postal_code then nullif(v_patch->>'postal_code', '') else postal_code end,
         base_fee         = case when has_base_fee then nullif(v_patch->>'base_fee', '')::numeric else base_fee end,
         appraiser_fee    = case when has_appraiser_fee then nullif(v_patch->>'appraiser_fee', '')::numeric else appraiser_fee end,
         split_pct        = case when has_split_pct or has_appraiser_split then v_split else split_pct end,
         appraiser_split  = case when has_split_pct or has_appraiser_split then v_split else appraiser_split end,
         property_type    = case when has_property_type then nullif(v_patch->>'property_type', '') else property_type end,
         report_type      = case when has_report_type then nullif(v_patch->>'report_type', '') else report_type end,
         entry_contact_name = case when has_entry_contact_name then nullif(v_patch->>'entry_contact_name', '') else entry_contact_name end,
         entry_contact_phone = case when has_entry_contact_phone then nullif(v_patch->>'entry_contact_phone', '') else entry_contact_phone end,
         site_visit_at    = case when has_site_visit_at then nullif(v_patch->>'site_visit_at', '')::timestamp else site_visit_at end,
         review_due_at    = case when has_review_due_at then nullif(v_patch->>'review_due_at', '')::timestamptz else review_due_at end,
         final_due_at     = case when has_final_due_at then nullif(v_patch->>'final_due_at', '')::timestamptz else final_due_at end,
         notes            = case when has_notes then nullif(v_patch->>'notes', '') else notes end,
         updated_at       = now()
   where id = order_id
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_update_order"("order_id" "uuid", "patch" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_update_order"("order_id" "uuid", "patch" "jsonb") IS 'Generic order update RPC with explicit allowlist. Supports server-managed client relationship contact snapshots through payload.client_contact_id.';



CREATE OR REPLACE FUNCTION "public"."rpc_update_order_dates"("order_id" "uuid", "site_visit_at" timestamp with time zone, "review_due_at" timestamp with time zone, "final_due_at" timestamp with time zone) RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order public.orders;
  v_row public.orders;
begin
  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders
   where id = order_id
   for update;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> public.current_company_id() then
    raise exception 'order is not in the current company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(order_id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order is not updateable by current user'
      using errcode = '42501';
  end if;

  update public.orders
     set site_visit_at = rpc_update_order_dates.site_visit_at,
         review_due_at = rpc_update_order_dates.review_due_at,
         final_due_at = rpc_update_order_dates.final_due_at,
         updated_at = now()
   where id = rpc_update_order_dates.order_id
   returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."rpc_update_order_dates"("order_id" "uuid", "site_visit_at" timestamp with time zone, "review_due_at" timestamp with time zone, "final_due_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_update_order_dates"("order_id" "uuid", "site_visit_at" timestamp with time zone, "review_due_at" timestamp with time zone, "final_due_at" timestamp with time zone) IS 'Slice 7F4A guarded date RPC. Requires current-company membership plus readable/updateable order before site/review/final date mutation.';



CREATE OR REPLACE FUNCTION "public"."rpc_update_order_status"("order_id" "uuid", "next_status" "text") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_update_order_status(uuid,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_update_order_status"("order_id" "uuid", "next_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_update_order_status"("order_id" "uuid", "next_status" "text") IS 'Slice 7F3 quarantine. Deprecated arbitrary status mutation RPC; app roles must use rpc_transition_order_status(uuid,text,text).';



CREATE OR REPLACE FUNCTION "public"."rpc_update_order_status_with_note"("order_id" "uuid", "next_status" "text", "note" "text") RETURNS "public"."orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_update_order_status_with_note(uuid,text,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_update_order_status_with_note"("order_id" "uuid", "next_status" "text", "note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_update_order_status_with_note"("order_id" "uuid", "next_status" "text", "note" "text") IS 'Slice 7F3 quarantine. Deprecated arbitrary status mutation RPC with duplicate activity behavior; app roles must use rpc_transition_order_status(uuid,text,text).';



CREATE OR REPLACE FUNCTION "public"."rpc_update_order_v1"("p_order_id" "uuid", "p_status" "text" DEFAULT NULL::"text", "p_appraiser_id" "uuid" DEFAULT NULL::"uuid", "p_site_visit" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_review_due" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_final_due" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_actor" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'rpc_update_order_v1(uuid,text,uuid,timestamptz,timestamptz,timestamptz,jsonb) is deprecated and quarantined; use tenant-safe order update and workflow RPCs'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."rpc_update_order_v1"("p_order_id" "uuid", "p_status" "text", "p_appraiser_id" "uuid", "p_site_visit" timestamp with time zone, "p_review_due" timestamp with time zone, "p_final_due" timestamp with time zone, "p_actor" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_update_order_v1"("p_order_id" "uuid", "p_status" "text", "p_appraiser_id" "uuid", "p_site_visit" timestamp with time zone, "p_review_due" timestamp with time zone, "p_final_due" timestamp with time zone, "p_actor" "jsonb") IS 'Slice 7F3 quarantine. Deprecated mixed order mutation RPC that can change status, assignment, dates, activity, and notifications outside tenant-safe boundaries.';



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


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_update_profile"("p_display_name" "text", "p_color" "text", "p_phone" "text", "p_avatar_url" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_update_user_profile"("p_user_id" "uuid", "p_display_name" "text", "p_display_color" "text", "p_phone" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_user_set_color"("p_auth_id" "text", "p_color" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_user_set_fee_split"("p_auth_id" "text", "p_fee" numeric) OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_user_set_role"("p_auth_id" "text", "p_role" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_user_set_status"("p_auth_id" "text", "p_status" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."safe_uuid"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_order_appointment"("p_order_id" "uuid", "p_datetime" timestamp with time zone, "p_note" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'falcon_mvp', 'auth', 'extensions'
    AS $$
begin
  raise exception 'set_order_appointment(uuid,timestamptz,text) is deprecated and quarantined; use tenant-safe order site_visit_at updates'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."set_order_appointment"("p_order_id" "uuid", "p_datetime" timestamp with time zone, "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_order_appointment"("p_order_id" "uuid", "p_datetime" timestamp with time zone, "p_note" "text") IS 'Slice 7F4A quarantine. Deprecated falcon_mvp appointment helper; use tenant-safe order site_visit_at updates.';



CREATE OR REPLACE FUNCTION "public"."set_order_status"("p_order_id" "uuid", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'falcon_mvp', 'auth', 'extensions'
    AS $$
begin
  raise exception 'set_order_status(uuid,text) is deprecated and quarantined; use rpc_transition_order_status(uuid,text,text)'
    using errcode = '0A000';
end;
$$;


ALTER FUNCTION "public"."set_order_status"("p_order_id" "uuid", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_order_status"("p_order_id" "uuid", "p_status" "text") IS 'Slice 7F3 quarantine. Deprecated falcon_mvp compatibility status mutation RPC; app roles must use rpc_transition_order_status(uuid,text,text).';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."team_get_user"("user_id" "uuid") RETURNS "public"."users"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.*
  from public.users u
  where u.id = user_id
  limit 1;
$$;


ALTER FUNCTION "public"."team_get_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."team_list_users"() RETURNS SETOF "public"."users"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select * from public.admin_list_users();
$$;


ALTER FUNCTION "public"."team_list_users"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."team_list_users"("include_inactive" boolean) OWNER TO "postgres";


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


ALTER FUNCTION "public"."tg_activity_denorm_actor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_clients_preserve_company_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if TG_OP = 'INSERT' then
    -- Company ownership is backend-owned. Ignore frontend-sent company_id.
    NEW.company_id := public.current_company_id();
  elsif TG_OP = 'UPDATE' then
    -- Client ownership is immutable in compatibility mode.
    NEW.company_id := coalesce(OLD.company_id, public.default_company_id());
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_clients_preserve_company_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tg_clients_preserve_company_id"() IS 'Keeps client company scope backend-owned. Inserts resolve to current_company_id(); updates preserve existing company ownership.';



CREATE OR REPLACE FUNCTION "public"."tg_company_member_invitations_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_company_member_invitations_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_company_member_permission_overrides_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_company_member_permission_overrides_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_company_memberships_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_company_memberships_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_company_relationship_foundation_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_company_relationship_foundation_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_company_relationships_guard_immutable_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if NEW.source_company_id is distinct from OLD.source_company_id then
    raise exception 'company_relationships.source_company_id is immutable';
  end if;

  if NEW.target_company_id is distinct from OLD.target_company_id then
    raise exception 'company_relationships.target_company_id is immutable';
  end if;

  if NEW.relationship_type is distinct from OLD.relationship_type then
    raise exception 'company_relationships.relationship_type is immutable';
  end if;

  if NEW.status is distinct from OLD.status then
    if OLD.status = 'archived' then
      raise exception 'Archived company relationships are terminal';
    end if;

    if OLD.status = 'invited' and NEW.status not in ('active', 'declined', 'archived') then
      raise exception 'Invalid company relationship status transition: % -> %', OLD.status, NEW.status;
    elsif OLD.status = 'active' and NEW.status not in ('suspended', 'archived') then
      raise exception 'Invalid company relationship status transition: % -> %', OLD.status, NEW.status;
    elsif OLD.status = 'suspended' and NEW.status not in ('active', 'archived') then
      raise exception 'Invalid company relationship status transition: % -> %', OLD.status, NEW.status;
    elsif OLD.status = 'declined' and NEW.status <> 'archived' then
      raise exception 'Invalid company relationship status transition: % -> %', OLD.status, NEW.status;
    elsif OLD.status = 'expired' and NEW.status <> 'archived' then
      raise exception 'Invalid company relationship status transition: % -> %', OLD.status, NEW.status;
    end if;
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_company_relationships_guard_immutable_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tg_company_relationships_guard_immutable_status"() IS 'Phase 8B3 guard. Keeps relationship direction/type immutable and enforces lifecycle status transitions. Relationship status does not affect order/client visibility.';



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


ALTER FUNCTION "public"."tg_log_order_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_notifications_queue_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_to_user_id uuid;
  v_email text;
  v_subject text;
  v_body text;
  v_template text;
  v_payload jsonb;
  v_company_id uuid;
  v_email_allowed boolean := false;
begin
  begin
    if NEW.user_id is null or nullif(btrim(coalesce(NEW.type, '')), '') is null then
      return NEW;
    end if;

    if NEW.order_id is not null then
      select o.company_id
        into v_company_id
        from public.orders o
       where o.id = NEW.order_id
       limit 1;
    end if;

    select prefs.effective_enabled
      into v_email_allowed
      from public.notification_user_effective_preference(
        NEW.user_id,
        NEW.type,
        'email',
        v_company_id
      ) prefs;

    if coalesce(v_email_allowed, false) is false then
      return NEW;
    end if;

    select target.to_user_id, target.email_address
      into v_to_user_id, v_email
      from public._notification_email_target_v1(NEW.user_id) target;

    if v_to_user_id is null or v_email is null then
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


ALTER FUNCTION "public"."tg_notifications_queue_email"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tg_notifications_queue_email"() IS 'Queues canonical email_queue rows after in-app notification insert only when the recipient public.users.id effective email preference allows it. Queue failures are swallowed so in-app notifications are not blocked.';



CREATE OR REPLACE FUNCTION "public"."tg_notifications_v1_order_safe_links"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_order_id uuid;
begin
  if NEW.link_path is not null and NEW.link_path like '/assignments/%' then
    v_order_id := NEW.order_id;

    if v_order_id is null
       and NEW.payload ? 'order_id'
       and (NEW.payload->>'order_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_order_id := nullif(NEW.payload->>'order_id', '')::uuid;
    end if;

    if v_order_id is null
       and NEW.payload ? 'assignment_id'
       and (NEW.payload->>'assignment_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select oca.order_id
        into v_order_id
        from public.order_company_assignments oca
       where oca.id = nullif(NEW.payload->>'assignment_id', '')::uuid
       limit 1;
    end if;

    if v_order_id is not null then
      NEW.order_id := v_order_id;
      NEW.link_path := '/orders/' || v_order_id::text;
      NEW.payload := coalesce(NEW.payload, '{}'::jsonb) || jsonb_build_object(
        'order_id', v_order_id,
        'link_path', '/orders/' || v_order_id::text,
        'v1_hidden_surface_link_rerouted', true
      );
    else
      NEW.link_path := null;
      NEW.payload := coalesce(NEW.payload, '{}'::jsonb) || jsonb_build_object(
        'v1_hidden_surface_link_suppressed', true
      );
    end if;
  end if;

  return NEW;
end;
$_$;


ALTER FUNCTION "public"."tg_notifications_v1_order_safe_links"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tg_notifications_v1_order_safe_links"() IS 'Reroutes hidden assignment-surface notification links to visible order detail routes when an order can be resolved; otherwise suppresses the hidden route link.';



CREATE OR REPLACE FUNCTION "public"."tg_order_company_assignments_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_order_company_id uuid;
  v_relationship public.company_relationships%rowtype;
  v_expected_assignment_type text;
begin
  if TG_OP = 'UPDATE' then
    if NEW.order_id is distinct from OLD.order_id then
      raise exception 'order_company_assignments.order_id is immutable';
    end if;

    if NEW.owner_company_id is distinct from OLD.owner_company_id then
      raise exception 'order_company_assignments.owner_company_id is immutable';
    end if;

    if NEW.assigned_company_id is distinct from OLD.assigned_company_id then
      raise exception 'order_company_assignments.assigned_company_id is immutable';
    end if;

    if NEW.relationship_id is distinct from OLD.relationship_id then
      raise exception 'order_company_assignments.relationship_id is immutable';
    end if;

    if NEW.assignment_type is distinct from OLD.assignment_type then
      raise exception 'order_company_assignments.assignment_type is immutable';
    end if;

    if NEW.status is distinct from OLD.status then
      if OLD.status in ('completed', 'declined', 'cancelled', 'revoked') then
        raise exception 'Terminal order-company assignment status cannot transition: %', OLD.status;
      end if;

      if OLD.status = 'offered' and NEW.status not in ('accepted', 'declined', 'cancelled', 'revoked') then
        raise exception 'Invalid order-company assignment status transition: % -> %', OLD.status, NEW.status;
      elsif OLD.status = 'accepted' and NEW.status not in ('in_progress', 'submitted', 'cancelled', 'revoked') then
        raise exception 'Invalid order-company assignment status transition: % -> %', OLD.status, NEW.status;
      elsif OLD.status = 'in_progress' and NEW.status not in ('submitted', 'cancelled', 'revoked') then
        raise exception 'Invalid order-company assignment status transition: % -> %', OLD.status, NEW.status;
      elsif OLD.status = 'submitted' and NEW.status not in ('completed', 'in_progress', 'revoked') then
        raise exception 'Invalid order-company assignment status transition: % -> %', OLD.status, NEW.status;
      end if;
    end if;
  end if;

  select o.company_id
    into v_order_company_id
    from public.orders o
   where o.id = NEW.order_id;

  if v_order_company_id is null then
    raise exception 'Order-company assignments require an order with company ownership';
  end if;

  if v_order_company_id is distinct from NEW.owner_company_id then
    raise exception 'Order owner company mismatch for order-company assignment';
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = NEW.relationship_id;

  if not found then
    raise exception 'Order-company assignment relationship does not exist';
  end if;

  if v_relationship.status <> 'active' then
    raise exception 'Order-company assignments require an active company relationship';
  end if;

  if v_relationship.source_company_id is distinct from NEW.owner_company_id then
    raise exception 'Order-company assignment relationship source must match order owner company';
  end if;

  if v_relationship.target_company_id is distinct from NEW.assigned_company_id then
    raise exception 'Order-company assignment relationship target must match assigned company';
  end if;

  v_expected_assignment_type := case v_relationship.relationship_type
    when 'amc_vendor' then 'vendor_appraisal'
    when 'staff_overflow_vendor' then 'staff_overflow'
    when 'review_provider' then 'review_provider'
    when 'enterprise_child' then 'enterprise_delegated'
    when 'billing_managed' then 'billing_managed'
    when 'support_managed' then 'support_managed'
    else null
  end;

  if v_expected_assignment_type is null then
    raise exception 'Unsupported relationship type for order-company assignment: %', v_relationship.relationship_type;
  end if;

  if NEW.assignment_type <> v_expected_assignment_type then
    raise exception 'Assignment type % is incompatible with relationship type %', NEW.assignment_type, v_relationship.relationship_type;
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_order_company_assignments_guard"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tg_order_company_assignments_guard"() IS 'Phase 8B4A guard for order-company assignment immutability, active relationship validation, owner/assigned company matching, assignment-type compatibility, and status transitions. Does not modify order visibility.';



CREATE OR REPLACE FUNCTION "public"."tg_order_company_assignments_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_order_company_assignments_touch_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tg_order_company_assignments_touch_updated_at"() IS 'Phase 8B4A updated_at maintenance trigger for order_company_assignments.';



CREATE OR REPLACE FUNCTION "public"."tg_orders_audit_ins"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
  values (
    NEW.id,
    NEW.company_id,
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


ALTER FUNCTION "public"."tg_orders_audit_ins"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_orders_audit_upd"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor uuid := public.current_app_user_id();
begin
  if NEW.status is distinct from OLD.status then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (NEW.id, NEW.company_id, 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status), v_actor);
  end if;

  if NEW.site_visit_at is distinct from OLD.site_visit_at
     or NEW.review_due_at is distinct from OLD.review_due_at
     or NEW.final_due_at is distinct from OLD.final_due_at then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
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
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'assignee_changed',
      jsonb_build_object('field', 'appraiser_id', 'from', OLD.appraiser_id, 'to', NEW.appraiser_id),
      v_actor
    );
  end if;

  if NEW.reviewer_id is distinct from OLD.reviewer_id then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'assignee_changed',
      jsonb_build_object('field', 'reviewer_id', 'from', OLD.reviewer_id, 'to', NEW.reviewer_id),
      v_actor
    );
  end if;

  if NEW.base_fee is distinct from OLD.base_fee or NEW.fee_amount is distinct from OLD.fee_amount then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'fee_changed',
      jsonb_build_object('base_fee', NEW.base_fee, 'fee_amount', NEW.fee_amount),
      v_actor
    );
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_orders_audit_upd"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_orders_insert_assignment_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_new_appraiser_id uuid;
  v_old_appraiser_id uuid;
begin
  v_new_appraiser_id := coalesce(NEW.appraiser_id, NEW.assigned_to);

  if TG_OP = 'INSERT' then
    if v_new_appraiser_id is not null then
      perform public.notify_order_v1_event(
        NEW.id,
        'order.assigned_appraiser',
        array['appraiser'],
        jsonb_build_object(
          'assignment_role', 'appraiser',
          'assigned_user_id', v_new_appraiser_id
        ),
        v_actor_user_id
      );
    end if;

    if NEW.reviewer_id is not null then
      perform public.notify_order_v1_event(
        NEW.id,
        'order.assigned_reviewer',
        array['reviewer'],
        jsonb_build_object(
          'assignment_role', 'reviewer',
          'assigned_user_id', NEW.reviewer_id
        ),
        v_actor_user_id
      );
    end if;

    return NEW;
  end if;

  v_old_appraiser_id := coalesce(OLD.appraiser_id, OLD.assigned_to);

  if v_new_appraiser_id is not null and v_new_appraiser_id is distinct from v_old_appraiser_id then
    perform public.notify_order_v1_event(
      NEW.id,
      case when v_old_appraiser_id is null then 'order.assigned_appraiser' else 'order.reassigned_appraiser' end,
      array['appraiser'],
      jsonb_build_object(
        'assignment_role', 'appraiser',
        'previous_user_id', v_old_appraiser_id,
        'assigned_user_id', v_new_appraiser_id
      ),
      v_actor_user_id
    );
  end if;

  if NEW.reviewer_id is not null and NEW.reviewer_id is distinct from OLD.reviewer_id then
    perform public.notify_order_v1_event(
      NEW.id,
      case when OLD.reviewer_id is null then 'order.assigned_reviewer' else 'order.reassigned_reviewer' end,
      array['reviewer'],
      jsonb_build_object(
        'assignment_role', 'reviewer',
        'previous_user_id', OLD.reviewer_id,
        'assigned_user_id', NEW.reviewer_id
      ),
      v_actor_user_id
    );
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_orders_insert_assignment_notification"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tg_orders_insert_assignment_notification"() IS 'RC1 assignment notification trigger. Covers appraiser_id, assigned_to, and reviewer_id while routing through V1 order-safe enriched notification fanout.';



CREATE OR REPLACE FUNCTION "public"."tg_orders_preserve_company_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if TG_OP = 'INSERT' then
    -- Company ownership is backend-owned. Ignore frontend-sent company_id.
    NEW.company_id := public.current_company_id();
  elsif TG_OP = 'UPDATE' then
    -- Order ownership is immutable in compatibility mode.
    NEW.company_id := coalesce(OLD.company_id, public.default_company_id());
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_orders_preserve_company_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tg_orders_preserve_company_id"() IS 'Keeps order company scope backend-owned. Inserts resolve to current_company_id(); updates preserve existing company ownership.';



CREATE OR REPLACE FUNCTION "public"."tg_orders_v1_date_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
begin
  if NEW.site_visit_at is distinct from OLD.site_visit_at then
    perform public.notify_order_v1_event(
      NEW.id,
      'order.site_visit_updated',
      array['appraiser', 'admin_owner'],
      jsonb_build_object(
        'previous_site_visit_at', OLD.site_visit_at,
        'site_visit_at', NEW.site_visit_at
      ),
      v_actor_user_id
    );
  end if;

  if NEW.review_due_at is distinct from OLD.review_due_at
     or NEW.final_due_at is distinct from OLD.final_due_at then
    perform public.notify_order_v1_event(
      NEW.id,
      'order.dates_updated',
      array['appraiser', 'reviewer', 'admin_owner'],
      jsonb_build_object(
        'previous_review_due_at', OLD.review_due_at,
        'review_due_at', NEW.review_due_at,
        'previous_final_due_at', OLD.final_due_at,
        'final_due_at', NEW.final_due_at
      ),
      v_actor_user_id
    );
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_orders_v1_date_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_orders_validate_assignment_targets"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := coalesce(NEW.company_id, OLD.company_id, public.default_company_id());
begin
  if TG_OP = 'INSERT' or NEW.appraiser_id is distinct from OLD.appraiser_id then
    if not public.current_app_user_can_assign_order_target(NEW.appraiser_id, v_company_id, 'appraiser') then
      raise exception 'appraiser_id % is not an assignable current-company appraiser', NEW.appraiser_id
        using errcode = '42501';
    end if;
  end if;

  if TG_OP = 'INSERT' or NEW.assigned_to is distinct from OLD.assigned_to then
    if not public.current_app_user_can_assign_order_target(NEW.assigned_to, v_company_id, 'assigned_to') then
      raise exception 'assigned_to % is not an assignable current-company appraiser', NEW.assigned_to
        using errcode = '42501';
    end if;
  end if;

  if TG_OP = 'INSERT' or NEW.reviewer_id is distinct from OLD.reviewer_id then
    if not public.current_app_user_can_assign_order_target(NEW.reviewer_id, v_company_id, 'reviewer') then
      raise exception 'reviewer_id % is not an assignable current-company reviewer', NEW.reviewer_id
        using errcode = '42501';
    end if;
  end if;

  if TG_OP = 'INSERT' or NEW.current_reviewer_id is distinct from OLD.current_reviewer_id then
    if not public.current_app_user_can_assign_order_target(NEW.current_reviewer_id, v_company_id, 'current_reviewer') then
      raise exception 'current_reviewer_id % is not an assignable current-company reviewer', NEW.current_reviewer_id
        using errcode = '42501';
    end if;
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_orders_validate_assignment_targets"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tg_orders_validate_assignment_targets"() IS 'Slice 7F4A trigger guard. Validates appraiser_id, assigned_to, reviewer_id, and current_reviewer_id target users before assignment writes.';



CREATE OR REPLACE FUNCTION "public"."tg_orders_validate_company_client_attachments"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Manual-only intake remains valid, but linked client IDs must be real,
  -- readable current-company clients. Invalid linked rows are not converted
  -- to manual-client orders because that would hide tenant boundary errors.
  if NEW.client_id is not null
     and not public.current_app_user_can_attach_order_client(NEW.client_id) then
    raise exception 'client_id % is not attachable to orders in the current company', NEW.client_id
      using errcode = '42501';
  end if;

  if NEW.managing_amc_id is not null
     and not public.current_app_user_can_attach_order_amc(NEW.managing_amc_id) then
    raise exception 'managing_amc_id % is not an attachable current-company AMC client', NEW.managing_amc_id
      using errcode = '42501';
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_orders_validate_company_client_attachments"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tg_orders_validate_company_client_attachments"() IS 'Validates order linked client and managing AMC attachments against current-company readable clients. Manual-only orders remain allowed.';



CREATE OR REPLACE FUNCTION "public"."tg_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


ALTER FUNCTION "public"."tg_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."tg_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_user_role_assignments_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;


ALTER FUNCTION "public"."tg_user_role_assignments_touch_updated_at"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."trg_orders_activity"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."trg_orders_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profile_basic"("p_user_id" "uuid", "p_name" "text", "p_email" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  update public.users
     set name  = coalesce(p_name, name),
         email = coalesce(p_email, email)
   where id = p_user_id;
$$;


ALTER FUNCTION "public"."update_user_profile_basic"("p_user_id" "uuid", "p_name" "text", "p_email" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."upsert_user_settings"("p_user_id" "uuid", "p_phone" "text", "p_preferences" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_owner_role_in_company"("p_user_id" "uuid", "p_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
      from public.user_role_assignments ura
      join public.company_memberships cm
        on cm.company_id = ura.company_id
       and cm.user_id = ura.user_id
       and cm.status = 'active'
      join public.roles r
        on r.id = ura.role_id
     where ura.user_id = p_user_id
       and ura.company_id = p_company_id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
       and (r.is_owner_role = true or lower(r.name) = 'owner')
  );
$$;


ALTER FUNCTION "public"."user_has_owner_role_in_company"("p_user_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_owner_role_in_company"("p_user_id" "uuid", "p_company_id" "uuid") IS 'Returns whether the user is an active owner-role assignee and active member of the company. Service-role helper for owner invariants.';



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


ALTER FUNCTION "public"."user_has_role"("p_role" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_view_backups" (
    "view_name" "text" NOT NULL,
    "definition" "text" NOT NULL,
    "saved_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_view_backups" OWNER TO "postgres";


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


ALTER TABLE "public"."activity_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."amc_lenders" (
    "amc_id" bigint NOT NULL,
    "lender_id" bigint NOT NULL,
    CONSTRAINT "amc_lenders_check" CHECK (("amc_id" <> "lender_id"))
);


ALTER TABLE "public"."amc_lenders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."amcs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."amcs" OWNER TO "postgres";


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


ALTER TABLE "public"."appointments" OWNER TO "postgres";


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


ALTER TABLE "public"."appraiser_licenses" OWNER TO "postgres";


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
    "company_id" "uuid",
    CONSTRAINT "calendar_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['site_visit'::"text", 'due_for_review'::"text", 'due_to_client'::"text"])))
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."calendar_events"."company_id" IS 'Additive company scope. Derived from linked order when available; tenant filtering is deferred.';



CREATE TABLE IF NOT EXISTS "public"."client_contacts" (
    "id" bigint NOT NULL,
    "company_id" "uuid" NOT NULL,
    "client_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "title" "text",
    "email" "text",
    "phone" "text",
    "notes" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_user_id" "uuid",
    CONSTRAINT "client_contacts_name_required" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "client_contacts_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."client_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_contacts" IS 'Reusable client/lender/AMC relationship contacts. Separate from property/access contacts used for inspection logistics.';



ALTER TABLE "public"."client_contacts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."client_contacts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."clients" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."clients_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "timezone" "text" DEFAULT 'America/New_York'::"text" NOT NULL,
    "locale" "text" DEFAULT 'en-US'::"text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_type" "text" DEFAULT 'staff_shop'::"text" NOT NULL,
    "operating_mode_settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


COMMENT ON TABLE "public"."companies" IS 'Canonical company records. Multi-Company Foundation Slice 1 default-company foundation only; no tenant enforcement or org switching yet.';



COMMENT ON COLUMN "public"."companies"."company_type" IS 'Phase 8B static operating-mode key. Defaults existing companies to staff_shop and drives future presets/labels/setup defaults only; it does not grant visibility or change workflow behavior.';



COMMENT ON COLUMN "public"."companies"."operating_mode_settings" IS 'Company-local future operating-mode settings. Not trusted for authorization and not consumed by operational RLS/workflow in Phase 8B.';



CREATE TABLE IF NOT EXISTS "public"."company_audit_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "actor_user_id" "uuid",
    "actor_auth_id" "uuid",
    "actor_kind" "text" DEFAULT 'service_role'::"text" NOT NULL,
    "event_type" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "idempotency_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_audit_events_actor_kind_check" CHECK (("actor_kind" = ANY (ARRAY['service_role'::"text", 'operator'::"text", 'system'::"text"]))),
    CONSTRAINT "company_audit_events_event_type_check" CHECK (("event_type" ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'::"text")),
    CONSTRAINT "company_audit_events_target_type_check" CHECK (("target_type" = ANY (ARRAY['bootstrap'::"text", 'company'::"text", 'user'::"text", 'membership'::"text", 'role_assignment'::"text", 'invitation'::"text"])))
);


ALTER TABLE "public"."company_audit_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_audit_events" IS 'Service-role-only audit log for company setup and future company administration events. App roles have no direct access.';



CREATE TABLE IF NOT EXISTS "public"."company_member_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "normalized_email" "text" NOT NULL,
    "status" "text" DEFAULT 'prepared'::"text" NOT NULL,
    "invited_by_user_id" "uuid" NOT NULL,
    "invited_auth_id" "uuid",
    "invited_user_id" "uuid",
    "membership_id" "uuid",
    "role_ids" "uuid"[] NOT NULL,
    "primary_role_id" "uuid",
    "role_snapshot" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "reason" "text",
    "request_id" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "prepared_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finalized_at" timestamp with time zone,
    "auth_invite_sent_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "auth_error_code" "text",
    "auth_error_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_member_invitations_email_check" CHECK ((("normalized_email" = "lower"(TRIM(BOTH FROM "email"))) AND ("normalized_email" ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'::"text"))),
    CONSTRAINT "company_member_invitations_role_ids_nonempty" CHECK (("array_length"("role_ids", 1) IS NOT NULL)),
    CONSTRAINT "company_member_invitations_status_check" CHECK (("status" = ANY (ARRAY['prepared'::"text", 'sent'::"text", 'accepted'::"text", 'cancelled'::"text", 'expired'::"text", 'auth_failed'::"text"])))
);


ALTER TABLE "public"."company_member_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_member_invitations" IS 'Phase 8C5E3 service-role-owned company member invitation records. Prepared/sent invitations grant no operational visibility and do not activate memberships.';



CREATE TABLE IF NOT EXISTS "public"."company_member_permission_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_key" "text" NOT NULL,
    "effect" "text" NOT NULL,
    "created_by_user_id" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_member_permission_overrides_effect_check" CHECK (("effect" = ANY (ARRAY['grant'::"text", 'revoke'::"text"])))
);


ALTER TABLE "public"."company_member_permission_overrides" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_member_permission_overrides" IS 'Explicit per-company-member permission grants/revokes. Overrides adjust action authority only and do not enable hidden product/module domains.';



CREATE TABLE IF NOT EXISTS "public"."company_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "membership_type" "text",
    "is_primary" boolean DEFAULT true NOT NULL,
    "joined_at" timestamp with time zone,
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."company_memberships" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_memberships" IS 'Additive membership foundation. Compatibility phase only: membership is not yet enforced by RLS or permission resolution.';



COMMENT ON COLUMN "public"."company_memberships"."company_id" IS 'Company the app user belongs to. Existing users are backfilled to falcon_default during default-company mode.';



COMMENT ON COLUMN "public"."company_memberships"."user_id" IS 'Canonical app user id from public.users.id, not auth.users.id.';



COMMENT ON COLUMN "public"."company_memberships"."is_primary" IS 'Default-company compatibility marker. Future org switching should use explicit active-company context verified against membership.';



CREATE TABLE IF NOT EXISTS "public"."company_relationship_types" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "allowed_source_company_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "allowed_target_company_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "default_settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_relationship_types_key_format" CHECK (("key" ~ '^[a-z][a-z0-9_]*$'::"text"))
);


ALTER TABLE "public"."company_relationship_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_relationship_types" IS 'Phase 8B relationship foundation. Static directional relationship vocabulary. Relationships enable future assignment, and assignment grants future visibility; type rows alone do not expose operational data.';



COMMENT ON COLUMN "public"."company_relationship_types"."allowed_source_company_types" IS 'Advisory source company_type list for future onboarding/validation flows. Not enforced against operational visibility in Phase 8B.';



COMMENT ON COLUMN "public"."company_relationship_types"."allowed_target_company_types" IS 'Advisory target company_type list for future onboarding/validation flows. Not enforced against operational visibility in Phase 8B.';



CREATE TABLE IF NOT EXISTS "public"."company_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_company_id" "uuid" NOT NULL,
    "target_company_id" "uuid" NOT NULL,
    "relationship_type" "text" NOT NULL,
    "status" "text" DEFAULT 'invited'::"text" NOT NULL,
    "invited_by_user_id" "uuid",
    "approved_by_user_id" "uuid",
    "suspended_by_user_id" "uuid",
    "archived_by_user_id" "uuid",
    "declined_by_user_id" "uuid",
    "invited_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "suspended_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "compliance" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_relationships_distinct_companies" CHECK (("source_company_id" <> "target_company_id")),
    CONSTRAINT "company_relationships_status_valid" CHECK (("status" = ANY (ARRAY['invited'::"text", 'active'::"text", 'suspended'::"text", 'archived'::"text", 'declined'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."company_relationships" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_relationships" IS 'Phase 8B relationship foundation. Directional source-company to target-company relationship records. These records do not grant order, client, activity, notification, calendar, queue, or workflow visibility until future assignment-backed authorization is implemented.';



COMMENT ON COLUMN "public"."company_relationships"."source_company_id" IS 'Directional relationship owner/source company. For example, an AMC or staff shop approving a vendor relationship.';



COMMENT ON COLUMN "public"."company_relationships"."target_company_id" IS 'Directional relationship participant/target company. For example, a vendor or review provider company.';



COMMENT ON COLUMN "public"."company_relationships"."relationship_type" IS 'Static relationship type key from company_relationship_types.';



COMMENT ON COLUMN "public"."company_relationships"."status" IS 'Relationship lifecycle status. Active/suspended/invited relationships still do not grant operational visibility without future order-company assignment records.';



COMMENT ON COLUMN "public"."company_relationships"."settings" IS 'Future relationship-specific operational settings. Not consumed by RLS or workflow in Phase 8B.';



COMMENT ON COLUMN "public"."company_relationships"."compliance" IS 'Future trust/compliance metadata for vendor approval, insurance, certification, or support checks. Not consumed by RLS or workflow in Phase 8B.';



CREATE TABLE IF NOT EXISTS "public"."company_types" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "default_settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "onboarding_defaults" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_types_key_format" CHECK (("key" ~ '^[a-z][a-z0-9_]*$'::"text"))
);


ALTER TABLE "public"."company_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_types" IS 'Phase 8B relationship foundation. Static operating-mode presets for company setup, labels, defaults, and product configuration. company_type must not hardcode RLS, workflow behavior, or operational visibility.';



COMMENT ON COLUMN "public"."company_types"."key" IS 'Stable lookup key. Uses lookup/config rows instead of a PostgreSQL enum so future company operating modes can be added safely.';



COMMENT ON COLUMN "public"."company_types"."default_settings" IS 'Static defaults for future setup/configuration. Not an authorization source.';



COMMENT ON COLUMN "public"."company_types"."onboarding_defaults" IS 'Future onboarding defaults for this company type. No onboarding UI reads this in Phase 8B.';



CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" bigint NOT NULL,
    "client_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


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


ALTER TABLE "public"."identity_role_backfill_log" OWNER TO "postgres";


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


ALTER TABLE "public"."identity_role_review_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."identity_role_review_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."identity_role_review_log_id_seq" OWNER TO "postgres";


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


ALTER TABLE "public"."instance_blueprint" OWNER TO "postgres";


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


ALTER TABLE "public"."instance_blueprint_backup_20260319" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."instance_blueprint_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."instance_blueprint_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."instance_blueprint_id_seq" OWNED BY "public"."instance_blueprint"."id";



CREATE TABLE IF NOT EXISTS "public"."notification_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "rules" "jsonb" NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_policies" OWNER TO "postgres";


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


ALTER TABLE "public"."order_assignments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_assignments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_assignments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."order_assignments_id_seq" OWNED BY "public"."order_assignments"."id";



CREATE TABLE IF NOT EXISTS "public"."order_company_assignment_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "owner_company_id" "uuid" NOT NULL,
    "assigned_company_id" "uuid" NOT NULL,
    "relationship_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_user_id" "uuid",
    "actor_company_id" "uuid",
    "actor_side" "text" DEFAULT 'system'::"text" NOT NULL,
    "message" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_company_assignment_activity_actor_side_valid" CHECK (("actor_side" = ANY (ARRAY['owner'::"text", 'assigned'::"text", 'system'::"text"]))),
    CONSTRAINT "order_company_assignment_activity_event_type_valid" CHECK (("event_type" = ANY (ARRAY['assignment.offered'::"text", 'assignment.accepted'::"text", 'assignment.declined'::"text", 'assignment.started'::"text", 'assignment.submitted'::"text", 'assignment.completed'::"text", 'assignment.cancelled'::"text", 'assignment.revoked'::"text"])))
);


ALTER TABLE "public"."order_company_assignment_activity" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_company_assignment_activity" IS 'Phase 8B4E assignment-scoped activity log. This is not canonical order activity and does not grant order, client, calendar, notification, or canonical order-view visibility.';



COMMENT ON COLUMN "public"."order_company_assignment_activity"."order_id" IS 'Owner-order audit pointer only. Assigned-company activity access must be assignment-scoped and must not derive canonical order visibility from this value.';



CREATE TABLE IF NOT EXISTS "public"."order_company_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "owner_company_id" "uuid" NOT NULL,
    "assigned_company_id" "uuid" NOT NULL,
    "relationship_id" "uuid" NOT NULL,
    "assignment_type" "text" NOT NULL,
    "status" "text" DEFAULT 'offered'::"text" NOT NULL,
    "instructions" "text",
    "terms" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "handoff_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "submission_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "compliance_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "offered_by_user_id" "uuid",
    "accepted_by_user_id" "uuid",
    "declined_by_user_id" "uuid",
    "submitted_by_user_id" "uuid",
    "completed_by_user_id" "uuid",
    "cancelled_by_user_id" "uuid",
    "revoked_by_user_id" "uuid",
    "offered_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "due_at" timestamp with time zone,
    "review_due_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_company_assignments_assignment_type_valid" CHECK (("assignment_type" = ANY (ARRAY['vendor_appraisal'::"text", 'staff_overflow'::"text", 'review_provider'::"text", 'enterprise_delegated'::"text", 'billing_managed'::"text", 'support_managed'::"text"]))),
    CONSTRAINT "order_company_assignments_distinct_companies" CHECK (("owner_company_id" <> "assigned_company_id")),
    CONSTRAINT "order_company_assignments_status_valid" CHECK (("status" = ANY (ARRAY['offered'::"text", 'accepted'::"text", 'in_progress'::"text", 'submitted'::"text", 'completed'::"text", 'declined'::"text", 'cancelled'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."order_company_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_company_assignments" IS 'Phase 8B4A service-role-only foundation for assigning specific orders from an owner company to an assigned company through an active company relationship. Rows do not grant order visibility until a later explicit read-predicate slice.';



COMMENT ON COLUMN "public"."order_company_assignments"."order_id" IS 'Owned source order. The order remains owned by orders.company_id; this foundation does not change order read visibility.';



COMMENT ON COLUMN "public"."order_company_assignments"."owner_company_id" IS 'Company that owns the order and is the relationship source. Must match orders.company_id and company_relationships.source_company_id.';



COMMENT ON COLUMN "public"."order_company_assignments"."assigned_company_id" IS 'Company receiving scoped work through an active relationship. Must match company_relationships.target_company_id.';



COMMENT ON COLUMN "public"."order_company_assignments"."relationship_id" IS 'Active company_relationships row that authorizes the existence of this assignment record. Relationship existence alone does not grant visibility.';



COMMENT ON COLUMN "public"."order_company_assignments"."assignment_type" IS 'Static assignment vocabulary for future lifecycle RPCs. Relationship type compatibility is enforced by trigger.';



COMMENT ON COLUMN "public"."order_company_assignments"."status" IS 'Assignment lifecycle status. Phase 8B4A stores lifecycle state only; no activity, notification, workflow, order visibility, or client visibility side effects are introduced.';



COMMENT ON COLUMN "public"."order_company_assignments"."instructions" IS 'Owner-company handoff instructions for future assignment lifecycle surfaces.';



COMMENT ON COLUMN "public"."order_company_assignments"."terms" IS 'Structured terms for future assignment lifecycle surfaces. No operational permissions are derived from this JSON.';



COMMENT ON COLUMN "public"."order_company_assignments"."handoff_payload" IS 'Structured handoff metadata for future assignment lifecycle surfaces. No operational permissions are derived from this JSON.';



COMMENT ON COLUMN "public"."order_company_assignments"."submission_payload" IS 'Structured assigned-company submission metadata for future assignment lifecycle surfaces.';



COMMENT ON COLUMN "public"."order_company_assignments"."compliance_snapshot" IS 'Point-in-time assignment compliance metadata. Compliance data does not grant order/client visibility.';



CREATE TABLE IF NOT EXISTS "public"."order_counters" (
    "year" integer NOT NULL,
    "last_seq" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."order_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "uploaded_by_user_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "title" "text",
    "file_name" "text" NOT NULL,
    "mime_type" "text",
    "file_size" bigint,
    "storage_bucket" "text" DEFAULT 'order-documents'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "visibility_scope" "text" DEFAULT 'internal'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_documents_category_check" CHECK (("category" = ANY (ARRAY['engagement'::"text", 'source_documents'::"text", 'property_media'::"text", 'review_revisions'::"text", 'final_report'::"text", 'internal_workfile'::"text"]))),
    CONSTRAINT "order_documents_file_name_not_blank" CHECK (("length"("btrim"("file_name")) > 0)),
    CONSTRAINT "order_documents_file_size_check" CHECK ((("file_size" IS NULL) OR ("file_size" >= 0))),
    CONSTRAINT "order_documents_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'archived'::"text", 'deleted'::"text"]))),
    CONSTRAINT "order_documents_storage_path_not_blank" CHECK (("length"("btrim"("storage_path")) > 0)),
    CONSTRAINT "order_documents_visibility_scope_check" CHECK (("visibility_scope" = ANY (ARRAY['internal'::"text", 'assigned'::"text", 'client'::"text", 'vendor'::"text", 'audit'::"text"])))
);


ALTER TABLE "public"."order_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_documents" IS 'Order-level document metadata. Storage paths are operational metadata only and are not authorization tokens.';



CREATE TABLE IF NOT EXISTS "public"."order_number_counters" (
    "id" bigint NOT NULL,
    "rule_id" bigint NOT NULL,
    "counter_year" integer NOT NULL,
    "last_value" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid",
    CONSTRAINT "order_number_counters_last_value_check" CHECK (("last_value" >= 0))
);


ALTER TABLE "public"."order_number_counters" OWNER TO "postgres";


COMMENT ON COLUMN "public"."order_number_counters"."company_id" IS 'Phase 10E4 compatibility/future v2 storage. Nullable company mapping for company-safe counters; active generation still uses existing rule_id/counter_year behavior until later phases.';



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
    "company_id" "uuid",
    CONSTRAINT "order_numbering_rules_format_kind_check" CHECK (("format_kind" = 'year_seq_3'::"text")),
    CONSTRAINT "order_numbering_rules_reset_period_check" CHECK (("reset_period" = 'yearly'::"text")),
    CONSTRAINT "order_numbering_rules_sequence_digits_check" CHECK (("sequence_digits" > 0)),
    CONSTRAINT "order_numbering_rules_year_digits_check" CHECK (("year_digits" = 4))
);


ALTER TABLE "public"."order_numbering_rules" OWNER TO "postgres";


COMMENT ON COLUMN "public"."order_numbering_rules"."company_id" IS 'Phase 10E4 compatibility/future v2 storage. Nullable company mapping for company-safe order numbering; legacy company_key remains active for current generation until later phases.';



ALTER TABLE "public"."order_numbering_rules" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."order_numbering_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."order_saved_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "filters" "jsonb" NOT NULL,
    "sort_order" integer,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_saved_views_filters_object" CHECK (("jsonb_typeof"("filters") = 'object'::"text")),
    CONSTRAINT "order_saved_views_name_not_blank" CHECK (("length"("btrim"("name")) > 0))
);


ALTER TABLE "public"."order_saved_views" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_saved_views" IS 'Saved Views Slice 1D backend-owned personal Orders saved views. Browser access is RPC-owned only; rows are scoped to current company and current app user.';



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


ALTER TABLE "public"."order_status_log" OWNER TO "postgres";


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


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fee_split" numeric(5,2),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'appraiser'::"text", 'associate'::"text", 'reviewer'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_roles" IS 'Deprecated legacy role-string compatibility table. Frontend/app-role direct access is revoked; remaining backend helper and policy dependencies must be replaced before table retirement.';



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


ALTER VIEW "public"."profiles" OWNER TO "postgres";


COMMENT ON VIEW "public"."profiles" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. User/team visibility remains deferred to a dedicated tenant-isolation slice.';



CREATE TABLE IF NOT EXISTS "public"."profiles_legacy" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles_legacy" OWNER TO "postgres";


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


ALTER TABLE "public"."review_flow" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "role_id" "uuid" NOT NULL,
    "permission_key" "text" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


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


ALTER TABLE "public"."roles" OWNER TO "postgres";


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


ALTER TABLE "public"."schema_decisions" OWNER TO "postgres";


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


ALTER TABLE "public"."schema_decisions_backup_20260319" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."schema_decisions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."schema_decisions_id_seq" OWNER TO "postgres";


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


ALTER TABLE "public"."schema_registry" OWNER TO "postgres";


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


ALTER TABLE "public"."schema_registry_backup_20260319" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."schema_registry_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."schema_registry_id_seq" OWNER TO "postgres";


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


ALTER TABLE "public"."staging_orders_2025" OWNER TO "postgres";


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


ALTER TABLE "public"."staging_raw_orders_2025_csv" OWNER TO "postgres";


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


ALTER TABLE "public"."stg_orders_import" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "title" "text",
    "storage_path" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" "date"
);


ALTER TABLE "public"."user_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_prefs" (
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "meta" "jsonb"
);


ALTER TABLE "public"."user_notification_prefs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_role_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_role_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_role_assignments" IS 'Additive company-scoped role assignment layer. Compatibility phase only: active authorization still uses legacy/global-mode helpers until wrapper migration.';



COMMENT ON COLUMN "public"."user_role_assignments"."company_id" IS 'Company context for this role assignment. Future permission/RLS enforcement should resolve effective permissions in this company context.';



COMMENT ON COLUMN "public"."user_role_assignments"."user_id" IS 'Canonical app user id from public.users.id, not auth.users.id.';



COMMENT ON COLUMN "public"."user_role_assignments"."role_id" IS 'Role bundle from public.roles. Template roles are used during default-company compatibility; future company roles can use roles.company_id.';



COMMENT ON COLUMN "public"."user_role_assignments"."is_primary" IS 'Compatibility/display hint only. A user may have multiple company-scoped role assignments.';



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


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_admin_calendar" WITH ("security_invoker"='true') AS
 SELECT "e"."id",
    COALESCE("e"."company_id", "o"."company_id", "public"."default_company_id"()) AS "company_id",
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
     LEFT JOIN "public"."user_profiles" "p" ON (("p"."user_id" = COALESCE("o"."appraiser_id", "o"."assigned_to", "e"."appraiser_id", "e"."appraiser_user_id"))))
  WHERE (("e"."order_id" IS NULL) OR "public"."current_app_user_can_read_order"("e"."order_id"));


ALTER VIEW "public"."v_admin_calendar" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_admin_calendar" IS 'Slice 7C: calendar read projection preserves company context and filters order-tied rows through current_app_user_can_read_order.';



CREATE OR REPLACE VIEW "public"."v_admin_calendar_enriched" WITH ("security_invoker"='true') AS
 SELECT "id",
    "company_id",
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
   FROM "public"."v_admin_calendar" "ac"
  WHERE (("order_id" IS NULL) OR "public"."current_app_user_can_read_order"("order_id"));


ALTER VIEW "public"."v_admin_calendar_enriched" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_admin_calendar_enriched" IS 'Slice 7C: enriched calendar projection inherits order read safety from v_admin_calendar and keeps explicit order predicate.';



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


ALTER VIEW "public"."v_calendar_events" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_calendar_events" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_admin_calendar or v_admin_calendar_enriched.';



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


ALTER VIEW "public"."v_calendar_unified" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_calendar_unified" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_admin_calendar or v_admin_calendar_enriched.';



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


ALTER VIEW "public"."v_admin_calendar_v2" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_admin_calendar_v2" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_admin_calendar_enriched.';



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


ALTER VIEW "public"."v_orders_unified" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_orders_unified" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_orders_frontend_v4, v_orders_active_frontend_v4, v_orders_list, or v_orders_list_with_last_activity.';



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


ALTER VIEW "public"."v_admin_dashboard_counts" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_admin_dashboard_counts" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Rebuild through tenant-safe dashboard RPC/view before app use.';



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


ALTER VIEW "public"."v_amcs" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_amcs" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Rebuild through tenant-safe client/AMC hierarchy before app use.';



CREATE OR REPLACE VIEW "public"."v_calendar_events_admin" AS
 SELECT "order_id",
    "client_id",
    "assigned_appraiser_id",
    "kind",
    "starts_at",
    "ends_at",
    "title"
   FROM "public"."v_calendar_events";


ALTER VIEW "public"."v_calendar_events_admin" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_calendar_events_admin" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe calendar views/RPCs.';



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


ALTER VIEW "public"."v_calendar_events_appraiser" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_calendar_events_appraiser" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe calendar views/RPCs.';



CREATE OR REPLACE VIEW "public"."v_client_kpis" WITH ("security_invoker"='true') AS
 WITH "client_base" AS (
         SELECT "c"."company_id",
            "c"."id",
            "c"."name",
            COALESCE(NULLIF("c"."status", ''::"text"), 'active'::"text") AS "status",
            "lower"(COALESCE(NULLIF("c"."category", ''::"text"), NULLIF("c"."client_type", ''::"text"), NULLIF("c"."kind", ''::"text"), 'client'::"text")) AS "category",
            "c"."client_type",
            "c"."kind",
            "c"."contact_name_1",
            "c"."contact_phone_1",
            "c"."contact_email_1"
           FROM "public"."clients" "c"
        ), "metric_orders" AS (
         SELECT DISTINCT "cb_1"."id" AS "client_id",
            "o"."id" AS "order_id",
            "o"."status",
            "o"."fee_amount",
            "o"."base_fee",
            "o"."created_at"
           FROM ("client_base" "cb_1"
             LEFT JOIN "public"."orders" "o" ON (((COALESCE("o"."company_id", "public"."default_company_id"()) = "cb_1"."company_id") AND ((("cb_1"."category" = 'amc'::"text") AND (("o"."managing_amc_id" = "cb_1"."id") OR (("o"."managing_amc_id" IS NULL) AND (EXISTS ( SELECT 1
                   FROM "public"."clients" "linked"
                  WHERE (("linked"."id" = "o"."client_id") AND ("linked"."amc_id" = "cb_1"."id") AND (COALESCE("linked"."company_id", "public"."default_company_id"()) = "cb_1"."company_id"))))))) OR (("cb_1"."category" <> 'amc'::"text") AND ("o"."client_id" = "cb_1"."id"))))))
        )
 SELECT "cb"."company_id",
    "cb"."id" AS "client_id",
    "cb"."name" AS "client_name",
    "cb"."name",
    "cb"."status",
    "cb"."category",
    "cb"."client_type",
    "cb"."kind",
    "cb"."contact_name_1" AS "primary_contact_name",
    "cb"."contact_phone_1" AS "primary_contact_phone",
    "cb"."contact_email_1" AS "primary_contact_email",
    ("count"("mo"."order_id"))::integer AS "total_orders",
    ("count"("mo"."order_id"))::integer AS "orders_count",
    ("count"("mo"."order_id") FILTER (WHERE ("lower"(COALESCE("mo"."status", ''::"text")) <> ALL (ARRAY['completed'::"text", 'complete'::"text", 'cancelled'::"text", 'canceled'::"text", 'voided'::"text"]))))::integer AS "active_orders",
    ("count"("mo"."order_id") FILTER (WHERE ("lower"(COALESCE("mo"."status", ''::"text")) = ANY (ARRAY['completed'::"text", 'complete'::"text"]))))::integer AS "completed_orders",
    "avg"(COALESCE("mo"."fee_amount", "mo"."base_fee")) AS "avg_total_fee",
    "max"("mo"."created_at") AS "last_order_date"
   FROM ("client_base" "cb"
     LEFT JOIN "metric_orders" "mo" ON (("mo"."client_id" = "cb"."id")))
  GROUP BY "cb"."company_id", "cb"."id", "cb"."name", "cb"."status", "cb"."category", "cb"."client_type", "cb"."kind", "cb"."contact_name_1", "cb"."contact_phone_1", "cb"."contact_email_1";


ALTER VIEW "public"."v_client_kpis" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_client_kpis" IS 'Company-aware client KPI projection. AMC category rows aggregate managed orders via orders.managing_amc_id, with clients.amc_id fallback for untagged orders; non-AMC rows keep direct client_id metrics.';



CREATE OR REPLACE VIEW "public"."v_client_kpis_appraiser" WITH ("security_invoker"='true') AS
 SELECT "client_id",
    "client_name",
    "primary_contact_name",
    "primary_contact_phone",
    ("total_orders")::bigint AS "total_orders",
    "avg_total_fee",
    "last_order_date" AS "last_order_at",
    "company_id"
   FROM "public"."v_client_kpis" "k"
  WHERE (EXISTS ( SELECT 1
           FROM "public"."orders" "o"
          WHERE (("o"."client_id" = "k"."client_id") AND (COALESCE("o"."appraiser_id", "o"."assigned_to") = "public"."current_app_user_id"()))));


ALTER VIEW "public"."v_client_kpis_appraiser" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_client_metrics" WITH ("security_invoker"='true') AS
 SELECT "company_id",
    "client_id",
    "client_name",
    "name",
    "status",
    "category",
    "client_type",
    "kind",
    "primary_contact_name",
    "primary_contact_phone",
    "primary_contact_email",
    "total_orders",
    "orders_count",
    "active_orders",
    "completed_orders",
    "avg_total_fee",
    "last_order_date"
   FROM "public"."v_client_kpis";


ALTER VIEW "public"."v_client_metrics" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_client_metrics" IS 'Compatibility alias for company-aware client KPI metrics with AMC umbrella rollups.';



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


ALTER VIEW "public"."v_email_queue" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_email_queue" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Email queue inspection must remain service/operator controlled.';



CREATE OR REPLACE VIEW "public"."v_is_admin" AS
 SELECT "auth"."uid"() AS "uid",
    (EXISTS ( SELECT 1
           FROM "public"."users" "u"
          WHERE (("u"."auth_id" = "auth"."uid"()) AND (COALESCE("u"."role", ''::"text") = ANY (ARRAY['owner'::"text", 'admin'::"text", 'manager'::"text"]))))) AS "is_admin";


ALTER VIEW "public"."v_is_admin" OWNER TO "postgres";


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
   FROM "public"."activity_log" "al"
  WHERE (("order_id" IS NOT NULL) AND "public"."current_app_user_can_read_order"("order_id"));


ALTER VIEW "public"."v_order_activity_compat" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_order_activity_compat" IS 'Slice 7H1: tenant-safe legacy activity compatibility view; order_id-null rows are hidden from app roles and order rows require current_app_user_can_read_order(order_id).';



CREATE OR REPLACE VIEW "public"."v_order_activity_feed" AS
 SELECT "a"."id",
    "a"."order_id",
    COALESCE("a"."event_type", "a"."action") AS "event_type",
    COALESCE("a"."message",
        CASE
            WHEN ((COALESCE("a"."event_type", "a"."action") = 'status_changed'::"text") AND (COALESCE(("a"."detail" ->> 'from_status'::"text"), "a"."prev_status", ("a"."detail" ->> 'from'::"text")) IS NOT NULL) AND (COALESCE(("a"."detail" ->> 'to_status'::"text"), "a"."new_status", ("a"."detail" ->> 'to'::"text")) IS NOT NULL)) THEN "format"('Status changed: %s -> %s'::"text", COALESCE(("a"."detail" ->> 'from_status'::"text"), "a"."prev_status", ("a"."detail" ->> 'from'::"text")), COALESCE(("a"."detail" ->> 'to_status'::"text"), "a"."new_status", ("a"."detail" ->> 'to'::"text")))
            ELSE NULL::"text"
        END, ("a"."detail" ->> 'text'::"text")) AS "message",
    "a"."detail",
    "a"."created_at",
    "a"."created_by",
    COALESCE("a"."created_by_name", "p"."full_name") AS "created_by_name",
    COALESCE("a"."created_by_email", "p"."email") AS "created_by_email"
   FROM ("public"."activity_log" "a"
     LEFT JOIN "public"."profiles_legacy" "p" ON (("p"."id" = COALESCE("a"."created_by", "a"."actor_id"))))
  WHERE (("a"."order_id" IS NOT NULL) AND "public"."current_app_user_can_read_order"("a"."order_id"));


ALTER VIEW "public"."v_order_activity_feed" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_order_activity_feed" IS 'Slice 7H1: tenant-safe compatibility activity feed; order_id-null rows are hidden from app roles and order rows require current_app_user_can_read_order(order_id).';



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


ALTER VIEW "public"."v_orders" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_orders_frontend_v4" WITH ("security_invoker"='false') AS
 SELECT "o"."id",
    "o"."id" AS "order_id",
    "o"."company_id",
    "o"."order_number",
    "o"."order_number" AS "order_no",
    COALESCE("c"."name", "o"."manual_client", "o"."manual_client_name") AS "client_name",
    "o"."client_id",
    "o"."amc_id",
    "o"."managing_amc_id",
    COALESCE("mamc"."name", "amc"."name") AS "amc_name",
    COALESCE("o"."appraiser_id", "o"."assigned_to") AS "assigned_appraiser_id",
    COALESCE("o"."manual_appraiser", "ua"."display_name", "ua"."full_name", "ua"."name") AS "assigned_appraiser_name",
    "o"."assigned_to",
    "o"."appraiser_id",
    "o"."reviewer_id",
    COALESCE("o"."manual_appraiser", "ua"."display_name", "ua"."full_name", "ua"."name") AS "appraiser_name",
    COALESCE("ur"."display_name", "ur"."full_name", "ur"."name") AS "reviewer_name",
    COALESCE("ua"."color", "ua"."display_color") AS "appraiser_color",
    COALESCE("ur"."color", "ur"."display_color") AS "reviewer_color",
    COALESCE("o"."property_address", "o"."address") AS "address_line1",
    COALESCE("o"."property_address", "o"."address") AS "address",
    COALESCE("o"."order_number", "o"."title") AS "display_title",
    COALESCE("o"."property_address", "o"."address") AS "display_subtitle",
    "o"."city",
    "o"."state",
    COALESCE("o"."postal_code", "o"."zip") AS "postal_code",
    COALESCE("o"."postal_code", "o"."zip") AS "zip",
    "o"."property_type",
    "o"."report_type",
    COALESCE("o"."fee_amount", "o"."base_fee") AS "fee_amount",
    COALESCE("o"."fee_amount", "o"."base_fee") AS "fee",
    "o"."base_fee",
    "o"."appraiser_fee",
    COALESCE("o"."split_pct", "o"."appraiser_split") AS "split_pct",
    COALESCE(("o"."site_visit_at")::timestamp with time zone, ("o"."site_visit_date")::timestamp with time zone, ("o"."inspection_date")::timestamp with time zone) AS "site_visit_at",
    COALESCE(("o"."site_visit_at")::timestamp with time zone, ("o"."site_visit_date")::timestamp with time zone, ("o"."inspection_date")::timestamp with time zone) AS "site_visit_date",
    COALESCE("o"."review_due_at", ("o"."due_for_review")::timestamp with time zone, ("o"."review_due_date")::timestamp with time zone) AS "review_due_at",
    COALESCE("o"."review_due_at", ("o"."due_for_review")::timestamp with time zone, ("o"."review_due_date")::timestamp with time zone) AS "review_due_date",
    COALESCE("o"."final_due_at", "o"."client_due_at", ("o"."due_to_client")::timestamp with time zone, ("o"."due_date")::timestamp with time zone) AS "final_due_at",
    COALESCE("o"."final_due_at", "o"."client_due_at", ("o"."due_to_client")::timestamp with time zone, ("o"."due_date")::timestamp with time zone) AS "final_due_date",
    COALESCE("o"."final_due_at", "o"."client_due_at", ("o"."due_to_client")::timestamp with time zone, ("o"."due_date")::timestamp with time zone) AS "due_date",
    "o"."status",
    "o"."created_at",
    "o"."updated_at",
    "o"."date_ordered",
    COALESCE("o"."is_archived", "o"."archived", false) AS "is_archived",
    "o"."property_contact_name",
    "o"."property_contact_phone",
    "o"."entry_contact_name",
    "o"."entry_contact_phone",
    "o"."access_notes",
    "o"."notes",
    "a"."last_activity_at",
    "o"."client_contact_id",
    "o"."client_contact_name",
    "o"."client_contact_title",
    "o"."client_contact_email",
    "o"."client_contact_phone"
   FROM (((((("public"."orders" "o"
     LEFT JOIN "public"."clients" "c" ON (("c"."id" = "o"."client_id")))
     LEFT JOIN "public"."clients" "mamc" ON (("mamc"."id" = "o"."managing_amc_id")))
     LEFT JOIN "public"."amcs" "amc" ON (("amc"."id" = "o"."amc_id")))
     LEFT JOIN "public"."users" "ua" ON (("ua"."id" = "o"."appraiser_id")))
     LEFT JOIN "public"."users" "ur" ON (("ur"."id" = "o"."reviewer_id")))
     LEFT JOIN LATERAL ( SELECT "max"("al"."created_at") AS "last_activity_at"
           FROM "public"."activity_log" "al"
          WHERE ("al"."order_id" = "o"."id")) "a" ON (true));


ALTER VIEW "public"."v_orders_frontend_v4" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_orders_frontend_v4" IS 'Phase 10I3 owner-backed safe order projection for browser reads. The view keeps current-company/order-read predicates and avoids broad direct grants on joined tables.';



CREATE OR REPLACE VIEW "public"."v_orders_active_frontend_v4" WITH ("security_invoker"='false') AS
 SELECT "id",
    "order_id",
    "company_id",
    "order_number",
    "order_no",
    "client_name",
    "client_id",
    "amc_id",
    "managing_amc_id",
    "amc_name",
    "assigned_appraiser_id",
    "assigned_appraiser_name",
    "assigned_to",
    "appraiser_id",
    "reviewer_id",
    "appraiser_name",
    "reviewer_name",
    "appraiser_color",
    "reviewer_color",
    "address_line1",
    "address",
    "display_title",
    "display_subtitle",
    "city",
    "state",
    "postal_code",
    "zip",
    "property_type",
    "report_type",
    "fee_amount",
    "fee",
    "base_fee",
    "appraiser_fee",
    "split_pct",
    "site_visit_at",
    "site_visit_date",
    "review_due_at",
    "review_due_date",
    "final_due_at",
    "final_due_date",
    "due_date",
    "status",
    "created_at",
    "updated_at",
    "date_ordered",
    "is_archived",
    "property_contact_name",
    "property_contact_phone",
    "entry_contact_name",
    "entry_contact_phone",
    "access_notes",
    "notes",
    "last_activity_at",
    "client_contact_id",
    "client_contact_name",
    "client_contact_title",
    "client_contact_email",
    "client_contact_phone"
   FROM "public"."v_orders_frontend_v4"
  WHERE ("lower"(COALESCE("status", ''::"text")) <> ALL (ARRAY['completed'::"text", 'complete'::"text", 'cancelled'::"text", 'canceled'::"text"]));


ALTER VIEW "public"."v_orders_active_frontend_v4" OWNER TO "postgres";


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


ALTER VIEW "public"."v_orders_all" OWNER TO "postgres";


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


ALTER VIEW "public"."v_orders_dashboard_active" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_orders_dashboard_active" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe dashboard/order projections.';



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


ALTER VIEW "public"."v_orders_frontend" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_orders_frontend" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_orders_frontend_v4.';



CREATE OR REPLACE VIEW "public"."v_orders_list" WITH ("security_invoker"='false') AS
 SELECT "id" AS "order_id",
    "company_id",
    "order_number",
    "title",
    "status",
    "paid_status",
    "created_at",
    "updated_at",
    "due_date",
    "review_due_date",
    "site_visit_at",
    "appraiser_id",
    "assigned_to",
    "client_id",
    "branch_id",
    "address",
    "city",
    "county",
    "state",
    "zip",
    TRIM(BOTH FROM "concat_ws"(', '::"text", NULLIF("address", ''::"text"), NULLIF("city", ''::"text"), "concat_ws"(' '::"text", NULLIF("state", ''::"text"), NULLIF("zip", ''::"text")))) AS "display_address",
    (("due_date" IS NOT NULL) AND ("due_date" < CURRENT_DATE)) AS "is_overdue",
    (("review_due_date" IS NOT NULL) AND ("review_due_date" < CURRENT_DATE)) AS "is_review_overdue",
    (("site_visit_at" IS NOT NULL) OR ("site_visit_date" IS NOT NULL)) AS "has_site_visit",
    COALESCE("is_archived", false) AS "is_archived",
        CASE
            WHEN ("due_date" IS NULL) THEN NULL::integer
            ELSE ("due_date" - CURRENT_DATE)
        END AS "due_in_days",
        CASE
            WHEN ("review_due_date" IS NULL) THEN NULL::integer
            ELSE ("review_due_date" - CURRENT_DATE)
        END AS "review_due_in_days",
        CASE
            WHEN (("due_date" IS NOT NULL) AND ("due_date" < CURRENT_DATE)) THEN 'overdue'::"text"
            WHEN (("review_due_date" IS NOT NULL) AND ("review_due_date" < CURRENT_DATE)) THEN 'review_overdue'::"text"
            WHEN (("due_date" IS NOT NULL) AND ("due_date" <= (CURRENT_DATE + 2))) THEN 'due_soon'::"text"
            WHEN (("review_due_date" IS NOT NULL) AND ("review_due_date" <= (CURRENT_DATE + 2))) THEN 'review_soon'::"text"
            ELSE 'normal'::"text"
        END AS "priority"
   FROM "public"."orders" "o"
  WHERE "public"."current_app_user_can_read_order_row"("company_id", "appraiser_id", "assigned_to", "reviewer_id", "status");


ALTER VIEW "public"."v_orders_list" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_orders_list" IS 'Phase 10I3 owner-backed safe order list projection with current-company/order-read predicates.';



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


ALTER VIEW "public"."v_orders_list_v2" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_orders_list_v2" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_orders_list.';



CREATE OR REPLACE VIEW "public"."v_orders_list_with_last_activity" WITH ("security_invoker"='false') AS
 SELECT "l"."order_id",
    "l"."company_id",
    "l"."order_number",
    "l"."title",
    "l"."status",
    "l"."paid_status",
    "l"."created_at",
    "l"."updated_at",
    "l"."due_date",
    "l"."review_due_date",
    "l"."site_visit_at",
    "l"."appraiser_id",
    "l"."assigned_to",
    "l"."client_id",
    "l"."branch_id",
    "l"."address",
    "l"."city",
    "l"."county",
    "l"."state",
    "l"."zip",
    "l"."display_address",
    "l"."is_overdue",
    "l"."is_review_overdue",
    "l"."has_site_visit",
    "l"."is_archived",
    "l"."due_in_days",
    "l"."review_due_in_days",
    "l"."priority",
    "a"."action" AS "last_action",
    "a"."message" AS "last_message",
    "a"."created_at" AS "last_activity_at"
   FROM ("public"."v_orders_list" "l"
     LEFT JOIN LATERAL ( SELECT "activity_log"."action",
            "activity_log"."message",
            "activity_log"."created_at"
           FROM "public"."activity_log"
          WHERE ("activity_log"."order_id" = "l"."order_id")
          ORDER BY "activity_log"."created_at" DESC
         LIMIT 1) "a" ON (true));


ALTER VIEW "public"."v_orders_list_with_last_activity" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_orders_list_with_last_activity" IS 'Phase 10I3 owner-backed safe order list projection with last-activity metadata and current-company/order-read predicates.';



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


ALTER VIEW "public"."v_orders_list_with_last_activity_v2" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_orders_list_with_last_activity_v2" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe v_orders_list_with_last_activity.';



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


ALTER VIEW "public"."v_orders_unified_list" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_orders_unified_list" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Use tenant-safe order views.';



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


ALTER VIEW "public"."v_staging_raw_orders_2025_ord" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_staging_raw_orders_2025_ord" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Import staging data must remain operator controlled.';



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


ALTER VIEW "public"."v_user_notification_prefs" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_user_notification_prefs" IS 'Slice 7H1 quarantined legacy exposed view: app-role SELECT revoked. Notification preference company semantics remain deferred.';



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



ALTER TABLE ONLY "public"."client_contacts"
    ADD CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_name_uniq" UNIQUE ("name");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."company_audit_events"
    ADD CONSTRAINT "company_audit_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_member_invitations"
    ADD CONSTRAINT "company_member_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_member_permission_overrides"
    ADD CONSTRAINT "company_member_permission_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_memberships"
    ADD CONSTRAINT "company_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_relationship_types"
    ADD CONSTRAINT "company_relationship_types_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_types"
    ADD CONSTRAINT "company_types_pkey" PRIMARY KEY ("key");



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



ALTER TABLE ONLY "public"."order_company_assignment_activity"
    ADD CONSTRAINT "order_company_assignment_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_counters"
    ADD CONSTRAINT "order_counters_pkey" PRIMARY KEY ("year");



ALTER TABLE ONLY "public"."order_documents"
    ADD CONSTRAINT "order_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_number_counters"
    ADD CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_number_counters"
    ADD CONSTRAINT "order_number_counters_rule_year_key" UNIQUE ("rule_id", "counter_year");



ALTER TABLE ONLY "public"."order_numbering_rules"
    ADD CONSTRAINT "order_numbering_rules_company_key_key" UNIQUE ("company_key");



ALTER TABLE ONLY "public"."order_numbering_rules"
    ADD CONSTRAINT "order_numbering_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_operational_inputs"
    ADD CONSTRAINT "order_operational_inputs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_saved_views"
    ADD CONSTRAINT "order_saved_views_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id");



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



CREATE UNIQUE INDEX "company_member_invitations_pending_unique" ON "public"."company_member_invitations" USING "btree" ("company_id", "normalized_email") WHERE ("status" = ANY (ARRAY['prepared'::"text", 'sent'::"text"]));



CREATE UNIQUE INDEX "company_member_permission_overrides_company_member_permission_u" ON "public"."company_member_permission_overrides" USING "btree" ("company_id", "membership_id", "permission_key");



CREATE UNIQUE INDEX "company_memberships_company_user_unique" ON "public"."company_memberships" USING "btree" ("company_id", "user_id");



CREATE UNIQUE INDEX "company_relationships_current_unique" ON "public"."company_relationships" USING "btree" ("source_company_id", "target_company_id", "relationship_type") WHERE ("status" = ANY (ARRAY['invited'::"text", 'active'::"text", 'suspended'::"text"]));



CREATE INDEX "idx_activity_log_company_order_created" ON "public"."activity_log" USING "btree" ("company_id", "order_id", "created_at" DESC);



CREATE INDEX "idx_activity_log_created_at" ON "public"."activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_log_created_by" ON "public"."activity_log" USING "btree" ("created_by");



CREATE INDEX "idx_activity_log_order_created" ON "public"."activity_log" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_activity_log_order_created_at" ON "public"."activity_log" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_activity_log_order_id" ON "public"."activity_log" USING "btree" ("order_id");



CREATE INDEX "idx_activity_order_created" ON "public"."activity_log" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_activity_order_id_created_at" ON "public"."activity_log" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_appt_order_start" ON "public"."appointments" USING "btree" ("order_id", "start_at");



CREATE INDEX "idx_calendar_appraiser_start" ON "public"."calendar_events" USING "btree" ("appraiser_id", "start_at");



CREATE INDEX "idx_calendar_events_company_order_start" ON "public"."calendar_events" USING "btree" ("company_id", "order_id", "start_at");



CREATE INDEX "idx_calendar_events_company_start" ON "public"."calendar_events" USING "btree" ("company_id", "start_at");



CREATE INDEX "idx_calendar_events_order_start" ON "public"."calendar_events" USING "btree" ("order_id", "start_at");



CREATE INDEX "idx_client_contacts_company_client" ON "public"."client_contacts" USING "btree" ("company_id", "client_id", "status", "is_default" DESC, "name");



CREATE INDEX "idx_clients_category" ON "public"."clients" USING "btree" ("category");



CREATE INDEX "idx_clients_company_id" ON "public"."clients" USING "btree" ("company_id");



CREATE INDEX "idx_clients_is_merged" ON "public"."clients" USING "btree" ("is_merged");



CREATE INDEX "idx_clients_merged_into_id" ON "public"."clients" USING "btree" ("merged_into_id");



CREATE INDEX "idx_clients_name" ON "public"."clients" USING "btree" ("name");



CREATE INDEX "idx_company_audit_events_company_created" ON "public"."company_audit_events" USING "btree" ("company_id", "created_at" DESC);



CREATE INDEX "idx_company_audit_events_event_created" ON "public"."company_audit_events" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_company_audit_events_idempotency" ON "public"."company_audit_events" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "idx_company_member_invitations_company_email" ON "public"."company_member_invitations" USING "btree" ("company_id", "normalized_email");



CREATE INDEX "idx_company_member_invitations_company_status" ON "public"."company_member_invitations" USING "btree" ("company_id", "status");



CREATE INDEX "idx_company_member_invitations_invited_auth" ON "public"."company_member_invitations" USING "btree" ("invited_auth_id") WHERE ("invited_auth_id" IS NOT NULL);



CREATE INDEX "idx_company_member_invitations_request_id" ON "public"."company_member_invitations" USING "btree" ("request_id") WHERE ("request_id" IS NOT NULL);



CREATE INDEX "idx_company_member_permission_overrides_user_company" ON "public"."company_member_permission_overrides" USING "btree" ("user_id", "company_id");



CREATE INDEX "idx_company_memberships_company_status" ON "public"."company_memberships" USING "btree" ("company_id", "status");



CREATE INDEX "idx_company_memberships_user_company" ON "public"."company_memberships" USING "btree" ("user_id", "company_id");



CREATE INDEX "idx_company_relationships_created_at" ON "public"."company_relationships" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_company_relationships_source_status" ON "public"."company_relationships" USING "btree" ("source_company_id", "status");



CREATE INDEX "idx_company_relationships_target_status" ON "public"."company_relationships" USING "btree" ("target_company_id", "status");



CREATE INDEX "idx_company_relationships_type_status" ON "public"."company_relationships" USING "btree" ("relationship_type", "status");



CREATE INDEX "idx_contacts_client_id" ON "public"."contacts" USING "btree" ("client_id");



CREATE INDEX "idx_email_queue_status_created" ON "public"."email_queue" USING "btree" ("status", "created_at");



CREATE INDEX "idx_emailqueue_status_created" ON "public"."email_queue" USING "btree" ("status", "created_at");



CREATE INDEX "idx_identity_role_review_log_tag_issue" ON "public"."identity_role_review_log" USING "btree" ("migration_tag", "issue_type");



CREATE INDEX "idx_licenses_exp" ON "public"."appraiser_licenses" USING "btree" ("expires_at");



CREATE INDEX "idx_licenses_user" ON "public"."appraiser_licenses" USING "btree" ("user_id");



CREATE INDEX "idx_notification_prefs_updated" ON "public"."notification_prefs" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_notifications_company_user_created" ON "public"."notifications" USING "btree" ("company_id", "user_id", "created_at" DESC);



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



CREATE INDEX "idx_order_company_assignment_activity_assigned_created" ON "public"."order_company_assignment_activity" USING "btree" ("assigned_company_id", "created_at" DESC);



CREATE INDEX "idx_order_company_assignment_activity_assignment_created" ON "public"."order_company_assignment_activity" USING "btree" ("assignment_id", "created_at" DESC);



CREATE INDEX "idx_order_company_assignment_activity_event_created" ON "public"."order_company_assignment_activity" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_order_company_assignment_activity_owner_created" ON "public"."order_company_assignment_activity" USING "btree" ("owner_company_id", "created_at" DESC);



CREATE INDEX "idx_order_company_assignments_assigned_status" ON "public"."order_company_assignments" USING "btree" ("assigned_company_id", "status");



CREATE INDEX "idx_order_company_assignments_created_at" ON "public"."order_company_assignments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_order_company_assignments_due_current" ON "public"."order_company_assignments" USING "btree" ("due_at") WHERE ("status" = ANY (ARRAY['offered'::"text", 'accepted'::"text", 'in_progress'::"text", 'submitted'::"text"]));



CREATE INDEX "idx_order_company_assignments_order" ON "public"."order_company_assignments" USING "btree" ("order_id");



CREATE INDEX "idx_order_company_assignments_owner_status" ON "public"."order_company_assignments" USING "btree" ("owner_company_id", "status");



CREATE INDEX "idx_order_company_assignments_relationship_status" ON "public"."order_company_assignments" USING "btree" ("relationship_id", "status");



CREATE INDEX "idx_order_company_assignments_type_status" ON "public"."order_company_assignments" USING "btree" ("assignment_type", "status");



CREATE INDEX "idx_order_documents_company_order_status_created" ON "public"."order_documents" USING "btree" ("company_id", "order_id", "status", "created_at" DESC);



CREATE INDEX "idx_order_documents_company_visibility_status" ON "public"."order_documents" USING "btree" ("company_id", "visibility_scope", "status");



CREATE INDEX "idx_order_documents_order_category_created" ON "public"."order_documents" USING "btree" ("order_id", "category", "created_at" DESC);



CREATE UNIQUE INDEX "idx_order_documents_storage_object_unique" ON "public"."order_documents" USING "btree" ("storage_bucket", "storage_path");



CREATE INDEX "idx_order_documents_uploaded_by_created" ON "public"."order_documents" USING "btree" ("uploaded_by_user_id", "created_at" DESC);



CREATE INDEX "idx_order_number_counters_company_id" ON "public"."order_number_counters" USING "btree" ("company_id");



COMMENT ON INDEX "public"."idx_order_number_counters_company_id" IS 'Phase 10E4 lookup index for future company-id-backed order-number counters. Does not change active generation behavior.';



CREATE INDEX "idx_order_numbering_rules_company_id" ON "public"."order_numbering_rules" USING "btree" ("company_id");



COMMENT ON INDEX "public"."idx_order_numbering_rules_company_id" IS 'Phase 10E4 lookup index for future company-id-backed order numbering. Does not change active generation behavior.';



CREATE INDEX "idx_order_operational_inputs_active_fresh" ON "public"."order_operational_inputs" USING "btree" ("order_id", "input_type", "expires_at" DESC) WHERE ("cleared_at" IS NULL);



CREATE INDEX "idx_order_operational_inputs_actor" ON "public"."order_operational_inputs" USING "btree" ("actor_user_id", "created_at" DESC);



CREATE INDEX "idx_order_operational_inputs_company_order" ON "public"."order_operational_inputs" USING "btree" ("company_id", "order_id");



CREATE INDEX "idx_order_operational_inputs_order_created" ON "public"."order_operational_inputs" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_order_saved_views_company_user_order" ON "public"."order_saved_views" USING "btree" ("company_id", "user_id", "sort_order", "created_at");



CREATE INDEX "idx_orderassign_order" ON "public"."order_assignments" USING "btree" ("order_id");



CREATE INDEX "idx_orders_amc_id" ON "public"."orders" USING "btree" ("amc_id");



CREATE INDEX "idx_orders_appraiser" ON "public"."orders" USING "btree" ("appraiser_id");



CREATE INDEX "idx_orders_appraiser_id" ON "public"."orders" USING "btree" ("appraiser_id");



CREATE INDEX "idx_orders_assigned_to" ON "public"."orders" USING "btree" ("assigned_to");



CREATE INDEX "idx_orders_assigned_to_created_at" ON "public"."orders" USING "btree" ("assigned_to", "created_at" DESC);



CREATE INDEX "idx_orders_client" ON "public"."orders" USING "btree" ("client_id");



CREATE INDEX "idx_orders_client_contact_id" ON "public"."orders" USING "btree" ("client_contact_id") WHERE ("client_contact_id" IS NOT NULL);



CREATE INDEX "idx_orders_client_id" ON "public"."orders" USING "btree" ("client_id");



CREATE INDEX "idx_orders_company_id" ON "public"."orders" USING "btree" ("company_id");



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



CREATE INDEX "idx_user_role_assignments_company_role" ON "public"."user_role_assignments" USING "btree" ("company_id", "role_id");



CREATE INDEX "idx_user_role_assignments_company_status" ON "public"."user_role_assignments" USING "btree" ("company_id", "status");



CREATE INDEX "idx_user_role_assignments_user_company" ON "public"."user_role_assignments" USING "btree" ("user_id", "company_id");



CREATE INDEX "idx_user_settings_user" ON "public"."user_settings" USING "btree" ("user_id");



CREATE INDEX "idx_users_auth_id" ON "public"."users" USING "btree" ("auth_id");



CREATE UNIQUE INDEX "order_company_assignments_current_unique" ON "public"."order_company_assignments" USING "btree" ("order_id", "assigned_company_id", "assignment_type") WHERE ("status" = ANY (ARRAY['offered'::"text", 'accepted'::"text", 'in_progress'::"text", 'submitted'::"text"]));



CREATE UNIQUE INDEX "order_number_counters_company_rule_year_unique" ON "public"."order_number_counters" USING "btree" ("company_id", "rule_id", "counter_year") WHERE ("company_id" IS NOT NULL);



COMMENT ON INDEX "public"."order_number_counters_company_rule_year_unique" IS 'Phase 10E4 future-safe uniqueness for mapped company/rule/year counters. Legacy rule/year uniqueness remains active.';



CREATE UNIQUE INDEX "order_numbering_rules_company_key_company_unique" ON "public"."order_numbering_rules" USING "btree" ("company_id", "company_key") WHERE ("company_id" IS NOT NULL);



COMMENT ON INDEX "public"."order_numbering_rules_company_key_company_unique" IS 'Phase 10E4 future-safe uniqueness for mapped company/rule keys. Legacy global company_key uniqueness remains active.';



CREATE UNIQUE INDEX "order_saved_views_one_default_per_user_company" ON "public"."order_saved_views" USING "btree" ("company_id", "user_id") WHERE ("is_default" = true);



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



CREATE UNIQUE INDEX "uq_client_contacts_one_default_per_client" ON "public"."client_contacts" USING "btree" ("company_id", "client_id") WHERE (("is_default" IS TRUE) AND ("status" = 'active'::"text"));



CREATE UNIQUE INDEX "uq_users_email" ON "public"."users" USING "btree" ("email");



CREATE UNIQUE INDEX "user_role_assignments_company_user_role_unique" ON "public"."user_role_assignments" USING "btree" ("company_id", "user_id", "role_id");



CREATE UNIQUE INDEX "user_roles_user_id_uidx" ON "public"."user_roles" USING "btree" ("user_id");



CREATE UNIQUE INDEX "users_auth_id_unique" ON "public"."users" USING "btree" ("auth_id");



CREATE UNIQUE INDEX "users_email_unique" ON "public"."users" USING "btree" ("lower"("email"));



CREATE UNIQUE INDEX "users_uid_unique" ON "public"."users" USING "btree" ("uid") WHERE ("uid" IS NOT NULL);



CREATE UNIQUE INDEX "ux_users_email" ON "public"."users" USING "btree" ("lower"("email"));



CREATE OR REPLACE TRIGGER "set_timestamp_user_roles" BEFORE UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_activity_denorm_actor" BEFORE INSERT OR UPDATE ON "public"."activity_log" FOR EACH ROW EXECUTE FUNCTION "public"."tg_activity_denorm_actor"();



CREATE OR REPLACE TRIGGER "trg_activity_log_compat" BEFORE INSERT OR UPDATE ON "public"."activity_log" FOR EACH ROW EXECUTE FUNCTION "public"."activity_log_compat"();



CREATE OR REPLACE TRIGGER "trg_client_contacts_updated_at" BEFORE UPDATE ON "public"."client_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_clients_preserve_company_id" BEFORE INSERT OR UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."tg_clients_preserve_company_id"();



CREATE OR REPLACE TRIGGER "trg_company_member_invitations_touch_updated_at" BEFORE UPDATE ON "public"."company_member_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."tg_company_member_invitations_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_company_member_permission_overrides_touch_updated_at" BEFORE UPDATE ON "public"."company_member_permission_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."tg_company_member_permission_overrides_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_company_memberships_touch_updated_at" BEFORE UPDATE ON "public"."company_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."tg_company_memberships_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_company_relationship_types_touch_updated_at" BEFORE UPDATE ON "public"."company_relationship_types" FOR EACH ROW EXECUTE FUNCTION "public"."tg_company_relationship_foundation_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_company_relationships_guard_immutable_status" BEFORE UPDATE ON "public"."company_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."tg_company_relationships_guard_immutable_status"();



CREATE OR REPLACE TRIGGER "trg_company_relationships_touch_updated_at" BEFORE UPDATE ON "public"."company_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."tg_company_relationship_foundation_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_company_types_touch_updated_at" BEFORE UPDATE ON "public"."company_types" FOR EACH ROW EXECUTE FUNCTION "public"."tg_company_relationship_foundation_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_freeze_writes_email_outbox" BEFORE INSERT OR DELETE OR UPDATE ON "public"."email_outbox" FOR EACH ROW EXECUTE FUNCTION "public"."_block_deprecated_runtime_writes"();



CREATE OR REPLACE TRIGGER "trg_freeze_writes_notification_preferences" BEFORE INSERT OR DELETE OR UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."_block_deprecated_runtime_writes"();



CREATE OR REPLACE TRIGGER "trg_instance_blueprint_set_updated_at" BEFORE UPDATE ON "public"."instance_blueprint" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_notifications_queue_email" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."tg_notifications_queue_email"();



CREATE OR REPLACE TRIGGER "trg_notifications_v1_order_safe_links" BEFORE INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."tg_notifications_v1_order_safe_links"();



CREATE OR REPLACE TRIGGER "trg_notifications_v1_order_safe_links_update" BEFORE UPDATE OF "link_path", "payload", "order_id" ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."tg_notifications_v1_order_safe_links"();



CREATE OR REPLACE TRIGGER "trg_order_company_assignments_guard" BEFORE INSERT OR UPDATE ON "public"."order_company_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."tg_order_company_assignments_guard"();



CREATE OR REPLACE TRIGGER "trg_order_company_assignments_touch_updated_at" BEFORE UPDATE ON "public"."order_company_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."tg_order_company_assignments_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_orders_activity" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_orders_activity"();

ALTER TABLE "public"."orders" DISABLE TRIGGER "trg_orders_activity";



COMMENT ON TRIGGER "trg_orders_activity" ON "public"."orders" IS 'Disabled 2026-05-03: legacy duplicate activity trigger. Canonical order audit logging is handled by trg_orders_audit_upd / trg_orders_audit_ins.';



CREATE OR REPLACE TRIGGER "trg_orders_audit_ins" AFTER INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."tg_orders_audit_ins"();



CREATE OR REPLACE TRIGGER "trg_orders_audit_upd" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."tg_orders_audit_upd"();



CREATE OR REPLACE TRIGGER "trg_orders_insert_assignment_notification" AFTER INSERT OR UPDATE OF "appraiser_id", "assigned_to", "reviewer_id" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."tg_orders_insert_assignment_notification"();



CREATE OR REPLACE TRIGGER "trg_orders_log" AFTER INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."log_order_changes"();

ALTER TABLE "public"."orders" DISABLE TRIGGER "trg_orders_log";



COMMENT ON TRIGGER "trg_orders_log" ON "public"."orders" IS 'Disabled 2026-05-03: legacy duplicate activity trigger. Canonical order audit logging is handled by trg_orders_audit_upd / trg_orders_audit_ins.';



CREATE OR REPLACE TRIGGER "trg_orders_preserve_company_id" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."tg_orders_preserve_company_id"();



CREATE OR REPLACE TRIGGER "trg_orders_v1_date_notification" AFTER UPDATE OF "site_visit_at", "review_due_at", "final_due_at" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."tg_orders_v1_date_notification"();



CREATE OR REPLACE TRIGGER "trg_orders_validate_assignment_targets" BEFORE INSERT OR UPDATE OF "appraiser_id", "assigned_to", "reviewer_id", "current_reviewer_id", "company_id" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."tg_orders_validate_assignment_targets"();



CREATE OR REPLACE TRIGGER "trg_orders_validate_company_client_attachments" BEFORE INSERT OR UPDATE OF "client_id", "managing_amc_id", "company_id" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."tg_orders_validate_company_client_attachments"();



CREATE OR REPLACE TRIGGER "trg_schema_decisions_set_updated_at" BEFORE UPDATE ON "public"."schema_decisions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_schema_registry_set_updated_at" BEFORE UPDATE ON "public"."schema_registry" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_role_assignments_touch_updated_at" BEFORE UPDATE ON "public"."user_role_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."tg_user_role_assignments_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_users_after_insert_prefs" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."_trg_users_after_insert_prefs"();



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



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
    ADD CONSTRAINT "calendar_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_contacts"
    ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_contacts"
    ADD CONSTRAINT "client_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_company_type_fkey" FOREIGN KEY ("company_type") REFERENCES "public"."company_types"("key") ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."company_audit_events"
    ADD CONSTRAINT "company_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."company_audit_events"
    ADD CONSTRAINT "company_audit_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."company_member_invitations"
    ADD CONSTRAINT "company_member_invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_member_invitations"
    ADD CONSTRAINT "company_member_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."company_member_invitations"
    ADD CONSTRAINT "company_member_invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_member_invitations"
    ADD CONSTRAINT "company_member_invitations_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."company_memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_member_invitations"
    ADD CONSTRAINT "company_member_invitations_primary_role_id_fkey" FOREIGN KEY ("primary_role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."company_member_permission_overrides"
    ADD CONSTRAINT "company_member_permission_overrides_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_member_permission_overrides"
    ADD CONSTRAINT "company_member_permission_overrides_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_member_permission_overrides"
    ADD CONSTRAINT "company_member_permission_overrides_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."company_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_member_permission_overrides"
    ADD CONSTRAINT "company_member_permission_overrides_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_member_permission_overrides"
    ADD CONSTRAINT "company_member_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_memberships"
    ADD CONSTRAINT "company_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."company_memberships"
    ADD CONSTRAINT "company_memberships_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."company_memberships"
    ADD CONSTRAINT "company_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_approved_by_user_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_archived_by_user_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_declined_by_user_fkey" FOREIGN KEY ("declined_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_invited_by_user_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_relationship_type_fkey" FOREIGN KEY ("relationship_type") REFERENCES "public"."company_relationship_types"("key") ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_source_company_fkey" FOREIGN KEY ("source_company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_suspended_by_user_fkey" FOREIGN KEY ("suspended_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_target_company_fkey" FOREIGN KEY ("target_company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



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
    ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



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



ALTER TABLE ONLY "public"."order_company_assignment_activity"
    ADD CONSTRAINT "order_company_assignment_activity_actor_company_fkey" FOREIGN KEY ("actor_company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignment_activity"
    ADD CONSTRAINT "order_company_assignment_activity_actor_user_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignment_activity"
    ADD CONSTRAINT "order_company_assignment_activity_assigned_company_fkey" FOREIGN KEY ("assigned_company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignment_activity"
    ADD CONSTRAINT "order_company_assignment_activity_assignment_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."order_company_assignments"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignment_activity"
    ADD CONSTRAINT "order_company_assignment_activity_order_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignment_activity"
    ADD CONSTRAINT "order_company_assignment_activity_owner_company_fkey" FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignment_activity"
    ADD CONSTRAINT "order_company_assignment_activity_relationship_fkey" FOREIGN KEY ("relationship_id") REFERENCES "public"."company_relationships"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_accepted_by_user_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_assigned_company_fkey" FOREIGN KEY ("assigned_company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_cancelled_by_user_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_completed_by_user_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_declined_by_user_fkey" FOREIGN KEY ("declined_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_offered_by_user_fkey" FOREIGN KEY ("offered_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_order_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_owner_company_fkey" FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_relationship_fkey" FOREIGN KEY ("relationship_id") REFERENCES "public"."company_relationships"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_revoked_by_user_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."order_company_assignments"
    ADD CONSTRAINT "order_company_assignments_submitted_by_user_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."order_documents"
    ADD CONSTRAINT "order_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_documents"
    ADD CONSTRAINT "order_documents_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_documents"
    ADD CONSTRAINT "order_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."order_number_counters"
    ADD CONSTRAINT "order_number_counters_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."order_number_counters"
    ADD CONSTRAINT "order_number_counters_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."order_numbering_rules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_numbering_rules"
    ADD CONSTRAINT "order_numbering_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



ALTER TABLE ONLY "public"."order_operational_inputs"
    ADD CONSTRAINT "order_operational_inputs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_operational_inputs"
    ADD CONSTRAINT "order_operational_inputs_cleared_by_user_id_fkey" FOREIGN KEY ("cleared_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_operational_inputs"
    ADD CONSTRAINT "order_operational_inputs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_operational_inputs"
    ADD CONSTRAINT "order_operational_inputs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_saved_views"
    ADD CONSTRAINT "order_saved_views_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_saved_views"
    ADD CONSTRAINT "order_saved_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_status_log"
    ADD CONSTRAINT "order_status_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_status_log"
    ADD CONSTRAINT "order_status_log_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "public"."amcs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_client_contact_id_fkey" FOREIGN KEY ("client_contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT NOT VALID;



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



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_fk" FOREIGN KEY ("auth_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow assigned reviewers to read" ON "public"."review_flow" FOR SELECT USING (("auth"."uid"() = "assigned_to"));



CREATE POLICY "Allow insert for All" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert for all" ON "public"."order_status_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert for all users" ON "public"."contacts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow read to all" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Allow select for All" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Allow select for all users" ON "public"."contacts" FOR SELECT USING (true);



CREATE POLICY "Allow update for all" ON "public"."order_status_log" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Allow update for all" ON "public"."users" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Allow update for all users" ON "public"."contacts" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Public profiles are readable" ON "public"."profiles_legacy" FOR SELECT USING (true);



CREATE POLICY "Users can insert own data" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "activity_admin_all" ON "public"."activity_events" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text")))));



ALTER TABLE "public"."activity_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_log_delete_none" ON "public"."activity_log" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "activity_log_insert_updateable_order" ON "public"."activity_log" FOR INSERT TO "authenticated" WITH CHECK ((("order_id" IS NOT NULL) AND "public"."current_app_user_can_write_order_activity"("order_id")));



COMMENT ON POLICY "activity_log_insert_updateable_order" ON "public"."activity_log" IS 'Slice 7G1: authenticated direct activity inserts require a non-null readable/updateable current-company order.';



CREATE POLICY "activity_log_select_readable_order" ON "public"."activity_log" FOR SELECT TO "authenticated" USING ((("order_id" IS NOT NULL) AND "public"."current_app_user_can_read_order"("order_id")));



COMMENT ON POLICY "activity_log_select_readable_order" ON "public"."activity_log" IS 'Slice 7G1: authenticated activity reads require a non-null readable source order; order_id-null system rows are not exposed to app roles.';



CREATE POLICY "activity_log_update_none" ON "public"."activity_log" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "allow_select_notification_policies" ON "public"."notification_policies" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."amcs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."appraiser_licenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appt_order_scoped" ON "public"."appointments" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "appointments"."order_id") AND (( SELECT "v_is_admin"."is_admin"
           FROM "public"."v_is_admin") OR ("o"."appraiser_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."order_assignments" "oa"
          WHERE (("oa"."order_id" = "o"."id") AND ("oa"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."review_flow" "rf"
          WHERE (("rf"."order_id" = "o"."id") AND ("rf"."assigned_to" = "auth"."uid"()))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "appointments"."order_id") AND (( SELECT "v_is_admin"."is_admin"
           FROM "public"."v_is_admin") OR ("o"."appraiser_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."order_assignments" "oa"
          WHERE (("oa"."order_id" = "o"."id") AND ("oa"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."review_flow" "rf"
          WHERE (("rf"."order_id" = "o"."id") AND ("rf"."assigned_to" = "auth"."uid"())))))))));



ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendar_read" ON "public"."calendar_events" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."client_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_contacts_read_visible_clients" ON "public"."client_contacts" FOR SELECT USING ("public"."current_app_user_can_read_client_row"("company_id", "client_id"));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_delete_company_authorized" ON "public"."clients" FOR DELETE TO "authenticated" USING ("public"."current_app_user_can_delete_client_row"("company_id", "id"));



CREATE POLICY "clients_delete_none" ON "public"."clients" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "clients_insert_company_authorized" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_user_can_create_client"() AND (COALESCE("company_id", "public"."current_company_id"()) = "public"."current_company_id"())));



CREATE POLICY "clients_insert_none" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "clients_select_company_visibility" ON "public"."clients" FOR SELECT TO "authenticated" USING ("public"."current_app_user_can_read_client_row"("company_id", "id"));



CREATE POLICY "clients_update_company_authorized" ON "public"."clients" FOR UPDATE TO "authenticated" USING ("public"."current_app_user_can_update_client_row"("company_id", "id")) WITH CHECK ("public"."current_app_user_can_update_client_row"("company_id", "id"));



CREATE POLICY "clients_update_none" ON "public"."clients" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."company_audit_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_member_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_member_permission_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_relationship_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contacts_related_read" ON "public"."contacts" FOR SELECT USING ((( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin") OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."client_id" = "contacts"."client_id") AND (("o"."appraiser_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."order_assignments" "oa"
          WHERE (("oa"."order_id" = "o"."id") AND ("oa"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."review_flow" "rf"
          WHERE (("rf"."order_id" = "o"."id") AND ("rf"."assigned_to" = "auth"."uid"()))))))))));



CREATE POLICY "docs_admin_all" ON "public"."user_documents" USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin")) WITH CHECK (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "docs_self_rw" ON "public"."user_documents" USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"())))) WITH CHECK (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"()))));



ALTER TABLE "public"."email_outbox" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_outbox_insert_self" ON "public"."email_outbox" FOR INSERT WITH CHECK (("to_user_id" = "auth"."uid"()));



CREATE POLICY "email_outbox_select_admin" ON "public"."email_outbox" FOR SELECT USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "email_outbox_update_admin" ON "public"."email_outbox" FOR UPDATE USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."email_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_queue_block_delete" ON "public"."email_queue" FOR DELETE USING (false);



CREATE POLICY "email_queue_block_insert" ON "public"."email_queue" FOR INSERT WITH CHECK (false);



CREATE POLICY "email_queue_block_update" ON "public"."email_queue" FOR UPDATE USING (false);



CREATE POLICY "email_queue_select_own" ON "public"."email_queue" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "insert own activity" ON "public"."order_activity" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "insert own settings" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "lic_admin_all" ON "public"."appraiser_licenses" USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin")) WITH CHECK (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "lic_self_rw" ON "public"."appraiser_licenses" USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"())))) WITH CHECK (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"()))));



CREATE POLICY "notif_policies_admin_all" ON "public"."notification_policies" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text")))));



ALTER TABLE "public"."notification_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_prefs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_none" ON "public"."notifications" FOR DELETE TO "authenticated" USING (false);



COMMENT ON POLICY "notifications_delete_none" ON "public"."notifications" IS 'Slice 7G2A keeps notification deletes blocked for authenticated app users.';



CREATE POLICY "notifications_insert_none" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (false);



COMMENT ON POLICY "notifications_insert_none" ON "public"."notifications" IS 'Slice 7G2A blocks direct authenticated notification inserts; use rpc_notification_create for tenant-safe order-tied notifications.';



CREATE POLICY "notifications_select_current_user_order_safe" ON "public"."notifications" FOR SELECT TO "authenticated" USING ("public"."current_app_user_can_access_notification_row"("user_id", "order_id"));



COMMENT ON POLICY "notifications_select_current_user_order_safe" ON "public"."notifications" IS 'Slice 7G2A canonical notification SELECT policy. Uses app user identity and hides order-tied rows unless the source order is readable.';



CREATE POLICY "notifications_update_none" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



COMMENT ON POLICY "notifications_update_none" ON "public"."notifications" IS 'Slice 7G2A blocks direct authenticated notification updates; use mark/dismiss RPCs for personal delivery-state mutations.';



CREATE POLICY "notifprefs_select_self" ON "public"."notification_preferences" FOR SELECT USING (("user_id" = "public"."current_app_user_id"()));



CREATE POLICY "notifprefs_update_self" ON "public"."notification_preferences" FOR UPDATE USING (("user_id" = "public"."current_app_user_id"())) WITH CHECK (("user_id" = "public"."current_app_user_id"()));



CREATE POLICY "notifprefs_upsert_self" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("user_id" = "public"."current_app_user_id"()));



ALTER TABLE "public"."order_activity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_activity_admin_delete" ON "public"."order_activity" FOR DELETE TO "authenticated" USING ("public"."current_app_user_has_permission"('activity.moderate'::"text"));



CREATE POLICY "order_activity_admin_update" ON "public"."order_activity" FOR UPDATE TO "authenticated" USING ("public"."current_app_user_has_permission"('activity.moderate'::"text")) WITH CHECK ("public"."current_app_user_has_permission"('activity.moderate'::"text"));



CREATE POLICY "order_activity_insert_self" ON "public"."order_activity" FOR INSERT TO "authenticated" WITH CHECK (((NOT ("created_by" IS DISTINCT FROM "auth"."uid"())) OR (NOT ("user_id" IS DISTINCT FROM "auth"."uid"()))));



CREATE POLICY "order_activity_no_inserts" ON "public"."order_activity" FOR INSERT WITH CHECK (false);



CREATE POLICY "order_activity_no_updates" ON "public"."order_activity" FOR UPDATE USING (false);



CREATE POLICY "order_activity_select_visible" ON "public"."order_activity" FOR SELECT TO "authenticated" USING ("public"."can_read_order"("order_id"));



ALTER TABLE "public"."order_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_company_assignment_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_company_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_counters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_documents_delete_denied" ON "public"."order_documents" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "order_documents_insert_denied" ON "public"."order_documents" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "order_documents_select_company_order_permission" ON "public"."order_documents" FOR SELECT TO "authenticated" USING ("public"."current_app_user_can_read_order_document_row"("company_id", "order_id", "visibility_scope", "status"));



CREATE POLICY "order_documents_update_denied" ON "public"."order_documents" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."order_operational_inputs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_operational_inputs_no_direct_delete" ON "public"."order_operational_inputs" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "order_operational_inputs_no_direct_insert" ON "public"."order_operational_inputs" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "order_operational_inputs_no_direct_update" ON "public"."order_operational_inputs" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "order_operational_inputs_select_readable_order" ON "public"."order_operational_inputs" FOR SELECT TO "authenticated" USING (("public"."current_app_user_has_current_company"() AND ("company_id" = "public"."current_company_id"()) AND "public"."current_app_user_can_read_order"("order_id")));



ALTER TABLE "public"."order_saved_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_delete_rpc_only" ON "public"."orders" FOR DELETE TO "authenticated" USING (false);



COMMENT ON POLICY "orders_delete_rpc_only" ON "public"."orders" IS 'Phase 10G3: direct authenticated browser/table deletes are blocked. Archive/delete behavior must use a guarded RPC path.';



CREATE POLICY "orders_insert_rpc_only" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (false);



COMMENT ON POLICY "orders_insert_rpc_only" ON "public"."orders" IS 'Phase 10G3: direct authenticated browser/table inserts are blocked. Use guarded order creation RPCs such as rpc_create_order().';



CREATE POLICY "orders_select_company_lifecycle_visibility" ON "public"."orders" FOR SELECT TO "authenticated" USING ("public"."current_app_user_can_read_order_row"("company_id", "appraiser_id", "assigned_to", "reviewer_id", "status"));



COMMENT ON POLICY "orders_select_company_lifecycle_visibility" ON "public"."orders" IS 'Slice 7B order read isolation: current company plus existing lifecycle/responsibility visibility. Writes remain unchanged.';



CREATE POLICY "orders_update_rpc_only" ON "public"."orders" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



COMMENT ON POLICY "orders_update_rpc_only" ON "public"."orders" IS 'Phase 10G3: direct authenticated browser/table updates are blocked. Use guarded order mutation RPCs such as rpc_update_order(), rpc_transition_order_status(), and rpc_order_number_override().';



ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prefs_insert_self" ON "public"."notification_prefs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "public"."current_app_user_id"()));



CREATE POLICY "prefs_select_own" ON "public"."user_notification_prefs" FOR SELECT TO "authenticated" USING (("user_id" = "public"."current_app_user_id"()));



CREATE POLICY "prefs_select_self" ON "public"."notification_prefs" FOR SELECT TO "authenticated" USING (("user_id" = "public"."current_app_user_id"()));



CREATE POLICY "prefs_update_own" ON "public"."user_notification_prefs" FOR UPDATE TO "authenticated" USING (("user_id" = "public"."current_app_user_id"())) WITH CHECK (("user_id" = "public"."current_app_user_id"()));



CREATE POLICY "prefs_update_self" ON "public"."notification_prefs" FOR UPDATE TO "authenticated" USING (("user_id" = "public"."current_app_user_id"())) WITH CHECK (("user_id" = "public"."current_app_user_id"()));



CREATE POLICY "prefs_upsert_own" ON "public"."user_notification_prefs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "public"."current_app_user_id"()));



ALTER TABLE "public"."profiles_legacy" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_read" ON "public"."profiles_legacy" FOR SELECT USING (true);



ALTER TABLE "public"."review_flow" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "review_flow_order_read_visible" ON "public"."review_flow" FOR SELECT TO "authenticated" USING ((("order_id" IS NOT NULL) AND "public"."can_read_order"("order_id")));



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select own settings" ON "public"."user_settings" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."staging_orders_2025" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staging_raw_orders_2025_csv" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stat_order_scoped" ON "public"."order_status_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_status_log"."order_id") AND (( SELECT "v_is_admin"."is_admin"
           FROM "public"."v_is_admin") OR ("o"."appraiser_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."order_assignments" "oa"
          WHERE (("oa"."order_id" = "o"."id") AND ("oa"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."review_flow" "rf"
          WHERE (("rf"."order_id" = "o"."id") AND ("rf"."assigned_to" = "auth"."uid"())))))))));



CREATE POLICY "update own settings" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notification_prefs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_read" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."user_role_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_read" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_settings_admin_read" ON "public"."user_settings" FOR SELECT USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "user_settings_self_rw" ON "public"."user_settings" USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"())))) WITH CHECK (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"()))));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_admin_delete" ON "public"."users" FOR DELETE USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "users_admin_insert" ON "public"."users" FOR INSERT WITH CHECK (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "users_admin_read" ON "public"."users" FOR SELECT USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "users_admin_update" ON "public"."users" FOR UPDATE USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin")) WITH CHECK (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "users_any_authenticated_read" ON "public"."users" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "users_delete_none" ON "public"."users" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "users_insert_none" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "users_owner_admin_delete" ON "public"."users" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND (("u"."role" = 'owner'::"text") OR ("u"."is_admin" = true))))));



CREATE POLICY "users_owner_admin_update" ON "public"."users" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND (("u"."role" = 'owner'::"text") OR ("u"."is_admin" = true)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND (("u"."role" = 'owner'::"text") OR ("u"."is_admin" = true))))));



CREATE POLICY "users_read_role_aware" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "users_select_policy" ON "public"."users" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'admin'::"text") OR ("auth"."uid"() = "auth_id")));



CREATE POLICY "users_self_rw" ON "public"."users" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "users_update_none" ON "public"."users" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."_activity_actor"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_activity_actor"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_activity_insert"("p_order_id" "uuid", "p_kind" "text", "p_message" "text", "p_meta" "jsonb", "p_created_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_activity_insert"("p_order_id" "uuid", "p_kind" "text", "p_message" "text", "p_meta" "jsonb", "p_created_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_block_deprecated_runtime_writes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_block_deprecated_runtime_writes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_col_exists"("p_schema" "text", "p_table" "text", "p_column" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_col_exists"("p_schema" "text", "p_table" "text", "p_column" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_default_notification_categories"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_default_notification_categories"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_ensure_notification_prefs_for"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_ensure_notification_prefs_for"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_maybe_move_fk"("p_table" "regclass", "p_col" "text", "p_from" bigint, "p_to" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_maybe_move_fk"("p_table" "regclass", "p_col" "text", "p_from" bigint, "p_to" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."_notification_email_pref"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_notification_email_pref"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_notification_email_target"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_notification_email_target"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_notification_email_target_v1"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_notification_email_target_v1"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."_notification_email_target_v1"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."_notify_user"("p_to_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_notify_user"("p_to_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_notify_user"("p_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_link_path" "text", "p_payload" "jsonb", "p_priority" "text", "p_category" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_notify_user"("p_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_link_path" "text", "p_payload" "jsonb", "p_priority" "text", "p_category" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_trg_users_after_insert_prefs"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_trg_users_after_insert_prefs"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."activity_log_compat"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."activity_log_compat"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."activity_log_event_type_compat"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."activity_log_event_type_compat"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_order_note"("p_order_id" "uuid", "p_body" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_order_note"("p_order_id" "uuid", "p_body" "text") TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."users" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_list_users"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_users"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."app_user_has_company_role"("p_user_id" "uuid", "p_company_id" "uuid", "p_role_names" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."app_user_has_company_role"("p_user_id" "uuid", "p_company_id" "uuid", "p_role_names" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."app_user_permission_keys_for_company"("p_user_id" "uuid", "p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."app_user_permission_keys_for_company"("p_user_id" "uuid", "p_company_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assert_company_will_have_owner"("p_company_id" "uuid", "p_excluding_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assert_company_will_have_owner"("p_company_id" "uuid", "p_excluding_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assert_role"("roles" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assert_role"("roles" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_order"("p_order_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_order"("p_order_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_read_order"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_read_order"("p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."can_read_order"("p_order_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."client_metrics_rollup"("p_client_ids" bigint[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."client_metrics_rollup"("p_client_ids" bigint[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."client_name_taken"("p_name" "text", "p_ignore_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."client_name_taken"("p_name" "text", "p_ignore_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."client_name_taken"("p_name" "text", "p_ignore_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."company_active_owner_count"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."company_active_owner_count"("p_company_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_access_notification_row"("p_user_id" "uuid", "p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_access_notification_row"("p_user_id" "uuid", "p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_access_notification_row"("p_user_id" "uuid", "p_order_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_approve_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_approve_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_approve_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_archive_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_archive_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_archive_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_assign_order_target"("p_target_user_id" "uuid", "p_company_id" "uuid", "p_assignment_kind" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_assign_order_target"("p_target_user_id" "uuid", "p_company_id" "uuid", "p_assignment_kind" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_assign_order_target"("p_target_user_id" "uuid", "p_company_id" "uuid", "p_assignment_kind" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_attach_order_amc"("p_client_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_attach_order_amc"("p_client_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_attach_order_amc"("p_client_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_attach_order_client"("p_client_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_attach_order_client"("p_client_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_attach_order_client"("p_client_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_create_client"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_create_client"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_create_client"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_create_order"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_create_order"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_create_order"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_delete_client_row"("p_company_id" "uuid", "p_client_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_delete_client_row"("p_company_id" "uuid", "p_client_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_delete_client_row"("p_company_id" "uuid", "p_client_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_invite_company_relationship"("p_target_company_id" "uuid", "p_relationship_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_invite_company_relationship"("p_target_company_id" "uuid", "p_relationship_type" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_invite_company_relationship"("p_target_company_id" "uuid", "p_relationship_type" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_manage_company_relationship_compliance"("p_source_company_id" "uuid", "p_target_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_manage_company_relationship_compliance"("p_source_company_id" "uuid", "p_target_company_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_manage_company_relationship_compliance"("p_source_company_id" "uuid", "p_target_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_read_client_row"("p_company_id" "uuid", "p_client_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_read_client_row"("p_company_id" "uuid", "p_client_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_read_client_row"("p_company_id" "uuid", "p_client_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_read_company_relationship_row"("p_source_company_id" "uuid", "p_target_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_read_company_relationship_row"("p_source_company_id" "uuid", "p_target_company_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_read_company_relationship_row"("p_source_company_id" "uuid", "p_target_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_read_order"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_read_order"("p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_read_order"("p_order_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."current_app_user_can_read_order_document_row"("p_company_id" "uuid", "p_order_id" "uuid", "p_visibility_scope" "text", "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_read_order_document_row"("p_company_id" "uuid", "p_order_id" "uuid", "p_visibility_scope" "text", "p_status" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_read_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_read_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_read_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_suspend_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_suspend_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_suspend_company_relationship"("p_source_company_id" "uuid", "p_target_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_update_client_row"("p_company_id" "uuid", "p_client_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_update_client_row"("p_company_id" "uuid", "p_client_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_update_client_row"("p_company_id" "uuid", "p_client_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_update_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_update_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_update_order_row"("p_company_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."current_app_user_can_upload_order_document_row"("p_company_id" "uuid", "p_order_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_upload_order_document_row"("p_company_id" "uuid", "p_order_id" "uuid", "p_appraiser_id" "uuid", "p_assigned_to" "uuid", "p_reviewer_id" "uuid", "p_status" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_use_order_form_client_options"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_use_order_form_client_options"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_use_order_form_client_options"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_can_write_order_activity"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_can_write_order_activity"("p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_can_write_order_activity"("p_order_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_company_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_company_ids"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_company_ids"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_has_all_permissions"("p_permission_keys" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_has_all_permissions"("p_permission_keys" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_has_all_permissions"("p_permission_keys" "text"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_has_all_permissions_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_has_all_permissions_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_has_all_permissions_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_has_any_permission"("p_permission_keys" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_has_any_permission"("p_permission_keys" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_has_any_permission"("p_permission_keys" "text"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_has_any_permission_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_has_any_permission_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_has_any_permission_for_company"("p_company_id" "uuid", "p_permission_keys" "text"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_has_company"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_has_company"("p_company_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_has_company"("p_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_has_current_company"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_has_current_company"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_has_current_company"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_has_permission"("p_permission_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_has_permission"("p_permission_key" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_has_permission"("p_permission_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_has_permission_for_company"("p_company_id" "uuid", "p_permission_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_has_permission_for_company"("p_company_id" "uuid", "p_permission_key" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_has_permission_for_company"("p_company_id" "uuid", "p_permission_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_notification_role_keys"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_notification_role_keys"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_notification_role_keys"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_permission_keys"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_permission_keys"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_permission_keys"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_app_user_permission_keys_for_company"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_permission_keys_for_company"("p_company_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_app_user_permission_keys_for_company"("p_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_company_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_company_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_company_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_is_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_is_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_is_appraiser"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_is_appraiser"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_is_appraiser"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_public_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_public_user_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_public_user_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_user_has_role"("p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_has_role"("p_role" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_user_has_role"("p_role" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_user_public_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_public_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_user_public_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."default_company_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."default_company_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."default_company_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."fn_current_user_users_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_current_user_users_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_to_auth_id"("p" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_to_auth_id"("p" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_to_users_id"("p" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_to_users_id"("p" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_calendar_events"("p_from" timestamp with time zone, "p_to" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_calendar_events"("p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_calendar_events"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_calendar_events"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_calendar_events"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_calendar_events"("p_from" timestamp with time zone, "p_to" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_calendar_events"("p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_calendar_events"("p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_clients_for_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_clients_for_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_clients_for_user"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_order_activity_flexible"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_order_activity_flexible"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_order_activity_flexible_v3"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_order_activity_flexible_v3"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."import_orders_from_json"("payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."import_orders_from_json"("payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_admin_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_appraiser"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_appraiser"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_appraiser"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_reviewer"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_reviewer"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_reviewer"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."log_activity"("p_target_type" "text", "p_target_id" "uuid", "p_event" "text", "p_meta" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_activity"("p_target_type" "text", "p_target_id" "uuid", "p_event" "text", "p_meta" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_activity"("p_order_id" "uuid", "p_event_type" "text", "p_message" "text", "p_prev_status" "text", "p_new_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_activity"("p_order_id" "uuid", "p_event_type" "text", "p_message" "text", "p_prev_status" "text", "p_new_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_order_activity"("p_order_id" "uuid", "p_action" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_order_activity"("p_order_id" "uuid", "p_action" "text", "p_note" "text") TO "service_role";



GRANT ALL ON TABLE "public"."order_activity" TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_order_activity"("p_details" "text", "p_event" "text", "p_order_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_order_activity"("p_details" "text", "p_event" "text", "p_order_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_order_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_order_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_order_company_assignment_event"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid", "p_actor_company_id" "uuid", "p_message" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_order_company_assignment_event"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid", "p_actor_company_id" "uuid", "p_message" "text", "p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."merge_clients"("p_source_id" bigint, "p_target_id" bigint, "p_strategy" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merge_clients"("p_source_id" bigint, "p_target_id" bigint, "p_strategy" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."merge_clients"("p_source_id" bigint, "p_target_id" bigint, "p_strategy" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."next_order_number"("p_year" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."next_order_number"("p_year" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."next_order_number_v2"("p_company_id" "uuid", "p_effective_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."next_order_number_v2"("p_company_id" "uuid", "p_effective_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."notification_order_event_body_v1"("p_event_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notification_order_event_body_v1"("p_event_type" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."notification_order_event_body_v1"("p_event_type" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."notification_order_event_title_v1"("p_event_type" "text", "p_order_number" "text", "p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notification_order_event_title_v1"("p_event_type" "text", "p_order_number" "text", "p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."notification_order_event_title_v1"("p_event_type" "text", "p_order_number" "text", "p_order_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."notification_policy_channel_state"("p_rules" "jsonb", "p_roles" "text"[], "p_channel" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notification_policy_channel_state"("p_rules" "jsonb", "p_roles" "text"[], "p_channel" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."notification_policy_channel_state"("p_rules" "jsonb", "p_roles" "text"[], "p_channel" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."notification_user_effective_preference"("p_user_id" "uuid", "p_event_key" "text", "p_channel" "text", "p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notification_user_effective_preference"("p_user_id" "uuid", "p_event_key" "text", "p_channel" "text", "p_company_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."notification_user_effective_preference"("p_user_id" "uuid", "p_event_key" "text", "p_channel" "text", "p_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."notification_user_role_keys"("p_user_id" "uuid", "p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notification_user_role_keys"("p_user_id" "uuid", "p_company_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."notification_user_role_keys"("p_user_id" "uuid", "p_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."notify_admins"("p_title" "text", "p_body" "text", "p_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_admins"("p_title" "text", "p_body" "text", "p_message" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_order_company_assignment_event"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid", "p_actor_company_id" "uuid", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_order_company_assignment_event"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid", "p_actor_company_id" "uuid", "p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_order_v1_event"("p_order_id" "uuid", "p_event_type" "text", "p_recipient_kinds" "text"[], "p_payload" "jsonb", "p_actor_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_order_v1_event"("p_order_id" "uuid", "p_event_type" "text", "p_recipient_kinds" "text"[], "p_payload" "jsonb", "p_actor_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."notify_order_v1_event"("p_order_id" "uuid", "p_event_type" "text", "p_recipient_kinds" "text"[], "p_payload" "jsonb", "p_actor_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."notify_safe"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_safe"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."order_company_assignment_assigned_notification_recipients"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."order_company_assignment_assigned_notification_recipients"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."order_company_assignment_expected_type"("p_relationship_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."order_company_assignment_expected_type"("p_relationship_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."order_company_assignment_owner_notification_recipients"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."order_company_assignment_owner_notification_recipients"("p_assignment_id" "uuid", "p_event_type" "text", "p_actor_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."order_company_assignment_user_has_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_permission_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."order_company_assignment_user_has_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_permission_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."order_document_sanitize_file_name"("p_file_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."order_document_sanitize_file_name"("p_file_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."order_saved_view_trim_name"("p_name" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."order_saved_view_validate_filters"("p_filters" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."permission_override_is_v1_safe"("p_permission_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."permission_override_is_v1_safe"("p_permission_key" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."permission_override_is_v1_safe"("p_permission_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."permission_override_is_v1_ui_visible"("p_permission_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."permission_override_is_v1_ui_visible"("p_permission_key" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."permission_override_is_v1_ui_visible"("p_permission_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."remap_user_id"("from_id" "uuid", "to_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remap_user_id"("from_id" "uuid", "to_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_view_from_source"("target_view" "text", "source_view" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_view_from_source"("target_view" "text", "source_view" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_admin_set_user_active"("p_user_id" "uuid", "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_admin_set_user_active"("p_user_id" "uuid", "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_admin_set_user_role"("p_user_id" "uuid", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_admin_set_user_role"("p_user_id" "uuid", "p_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_admin_update_user_profile"("p_user_id" "uuid", "p_display_name" "text", "p_full_name" "text", "p_name" "text", "p_color" "text", "p_display_color" "text", "p_avatar_url" "text", "p_fee_split" numeric, "p_split" numeric, "p_split_pct" numeric, "p_phone" "text", "p_status" "text", "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_admin_update_user_profile"("p_user_id" "uuid", "p_display_name" "text", "p_full_name" "text", "p_name" "text", "p_color" "text", "p_display_color" "text", "p_avatar_url" "text", "p_fee_split" numeric, "p_split" numeric, "p_split_pct" numeric, "p_phone" "text", "p_status" "text", "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_admin_users_set_active"("p_user_id" "uuid", "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_admin_users_set_active"("p_user_id" "uuid", "p_is_active" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_admin_users_set_active"("p_user_id" "uuid", "p_is_active" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_admin_users_update"("p_user_id" "uuid", "p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_admin_users_update"("p_user_id" "uuid", "p_patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_admin_users_update"("p_user_id" "uuid", "p_patch" "jsonb") TO "authenticated";



GRANT ALL ON TABLE "public"."orders" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."orders" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_assign_next_reviewer"("order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_assign_next_reviewer"("order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_appraiser_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_appraiser_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_assigned_to" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_assigned_to" "uuid", "p_note" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_assign_order"("p_order_id" "uuid", "p_assigned_to" "uuid", "p_note" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_assign_reviewer"("order_id" "uuid", "reviewer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_assign_reviewer"("order_id" "uuid", "reviewer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_bootstrap_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_bootstrap_admin"() TO "service_role";



GRANT ALL ON TABLE "public"."email_queue" TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_claim_email_batch_v1"("p_limit" integer, "p_worker" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_claim_email_batch_v1"("p_limit" integer, "p_worker" "text") TO "service_role";



GRANT ALL ON TABLE "public"."email_outbox" TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_claim_email_outbox"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_claim_email_outbox"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_client_contact_create"("p_client_id" bigint, "p_contact" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_contact_create"("p_client_id" bigint, "p_contact" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_contact_create"("p_client_id" bigint, "p_contact" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_contact_list"("p_client_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_contact_list"("p_client_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_contact_list"("p_client_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_contact_set_default"("p_contact_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_contact_set_default"("p_contact_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_contact_set_default"("p_contact_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_contact_set_status"("p_contact_id" bigint, "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_contact_set_status"("p_contact_id" bigint, "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_contact_set_status"("p_contact_id" bigint, "p_status" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_contact_update"("p_contact_id" bigint, "p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_contact_update"("p_contact_id" bigint, "p_patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_contact_update"("p_contact_id" bigint, "p_patch" "jsonb") TO "authenticated";



GRANT ALL ON TABLE "public"."clients" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."clients" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_create"("p" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_create"("p" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_create"("p" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_delete"("p_client_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_delete"("p_client_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_delete"("p_client_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_management_amc_options"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_management_amc_options"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_management_amc_options"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_management_archive"("p_client_id" bigint, "p_reason" "text", "p_request_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_management_archive"("p_client_id" bigint, "p_reason" "text", "p_request_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_management_archive"("p_client_id" bigint, "p_reason" "text", "p_request_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_management_create"("p_client" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_management_create"("p_client" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_management_create"("p_client" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_management_create_without_portal"("p_client" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_management_create_without_portal"("p_client" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_client_management_detail"("p_client_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_management_detail"("p_client_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_management_detail"("p_client_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_management_detail_without_portal"("p_client_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_management_detail_without_portal"("p_client_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_client_management_list"("p_search" "text", "p_category" "text", "p_sort" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_management_list"("p_search" "text", "p_category" "text", "p_sort" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_management_list"("p_search" "text", "p_category" "text", "p_sort" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_management_list_without_portal"("p_search" "text", "p_category" "text", "p_sort" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_management_list_without_portal"("p_search" "text", "p_category" "text", "p_sort" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_client_management_update"("p_client_id" bigint, "p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_management_update"("p_client_id" bigint, "p_patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_management_update"("p_client_id" bigint, "p_patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_client_management_update_without_portal"("p_client_id" bigint, "p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_management_update_without_portal"("p_client_id" bigint, "p_patch" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_client_update"("p_client_id" "text", "p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_client_update"("p_client_id" "text", "p_patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_client_update"("p_client_id" "text", "p_patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_assignable_users"("p_purpose" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_assignable_users"("p_purpose" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_assignable_users"("p_purpose" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_bootstrap"("p_company_slug" "text", "p_company_name" "text", "p_company_type" "text", "p_timezone" "text", "p_locale" "text", "p_owner_auth_id" "uuid", "p_owner_email" "text", "p_owner_name" "text", "p_owner_phone" "text", "p_idempotency_key" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_bootstrap"("p_company_slug" "text", "p_company_name" "text", "p_company_type" "text", "p_timezone" "text", "p_locale" "text", "p_owner_auth_id" "uuid", "p_owner_email" "text", "p_owner_name" "text", "p_owner_phone" "text", "p_idempotency_key" "text", "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_company_bootstrap_v1"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_bootstrap_v1"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_access_save"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_overrides" "jsonb", "p_save_permission_overrides" boolean, "p_reason" "text", "p_request_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_access_save"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_overrides" "jsonb", "p_save_permission_overrides" boolean, "p_reason" "text", "p_request_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_member_access_save"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_overrides" "jsonb", "p_save_permission_overrides" boolean, "p_reason" "text", "p_request_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_invitation_cancel"("p_invitation_id" "uuid", "p_reason" "text", "p_request_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_invitation_cancel"("p_invitation_id" "uuid", "p_reason" "text", "p_request_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_member_invitation_cancel"("p_invitation_id" "uuid", "p_reason" "text", "p_request_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_invitation_resend_finalize"("p_invitation_id" "uuid", "p_auth_invite_sent" boolean, "p_auth_error" "text", "p_request_id" "text", "p_auth_user_id" "uuid", "p_auth_email" "text", "p_provider_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_invitation_resend_finalize"("p_invitation_id" "uuid", "p_auth_invite_sent" boolean, "p_auth_error" "text", "p_request_id" "text", "p_auth_user_id" "uuid", "p_auth_email" "text", "p_provider_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_invitation_resend_prepare"("p_invitation_id" "uuid", "p_expires_in" interval, "p_reason" "text", "p_request_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_invitation_resend_prepare"("p_invitation_id" "uuid", "p_expires_in" interval, "p_reason" "text", "p_request_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_member_invitation_resend_prepare"("p_invitation_id" "uuid", "p_expires_in" interval, "p_reason" "text", "p_request_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_invitations_list"("p_status" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_invitations_list"("p_status" "text", "p_limit" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_member_invitations_list"("p_status" "text", "p_limit" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_invite_accept"("p_invitation_id" "uuid", "p_request_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_invite_accept"("p_invitation_id" "uuid", "p_request_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_member_invite_accept"("p_invitation_id" "uuid", "p_request_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_invite_finalize"("p_invitation_id" "uuid", "p_auth_user_id" "uuid", "p_auth_email" "text", "p_auth_invite_sent" boolean, "p_auth_error_code" "text", "p_auth_error_message" "text", "p_provider_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_invite_finalize"("p_invitation_id" "uuid", "p_auth_user_id" "uuid", "p_auth_email" "text", "p_auth_invite_sent" boolean, "p_auth_error_code" "text", "p_auth_error_message" "text", "p_provider_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_invite_prepare"("p_email" "text", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_expires_in" interval, "p_reason" "text", "p_request_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_invite_prepare"("p_email" "text", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_expires_in" interval, "p_reason" "text", "p_request_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_member_invite_prepare"("p_email" "text", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_expires_in" interval, "p_reason" "text", "p_request_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_list"("p_include_inactive" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_list"("p_include_inactive" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_member_list"("p_include_inactive" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_permission_overrides"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_permission_overrides"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_member_permission_overrides"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_permission_overrides_save"("p_user_id" "uuid", "p_overrides" "jsonb", "p_reason" "text", "p_request_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_permission_overrides_save"("p_user_id" "uuid", "p_overrides" "jsonb", "p_reason" "text", "p_request_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_member_permission_overrides_save"("p_user_id" "uuid", "p_overrides" "jsonb", "p_reason" "text", "p_request_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_role_update"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_reason" "text", "p_request_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_role_update"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_reason" "text", "p_request_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_member_role_update"("p_user_id" "uuid", "p_role_ids" "uuid"[], "p_primary_role_id" "uuid", "p_reason" "text", "p_request_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_member_set_status"("p_user_id" "uuid", "p_status" "text", "p_reason" "text", "p_request_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_member_set_status"("p_user_id" "uuid", "p_status" "text", "p_reason" "text", "p_request_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_member_set_status"("p_user_id" "uuid", "p_status" "text", "p_reason" "text", "p_request_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_profile_update"("p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_profile_update"("p_patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_profile_update"("p_patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_relationship_accept"("p_relationship_id" "uuid", "p_compliance" "jsonb", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_accept"("p_relationship_id" "uuid", "p_compliance" "jsonb", "p_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_accept"("p_relationship_id" "uuid", "p_compliance" "jsonb", "p_notes" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_relationship_archive"("p_relationship_id" "uuid", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_archive"("p_relationship_id" "uuid", "p_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_archive"("p_relationship_id" "uuid", "p_notes" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_relationship_decline"("p_relationship_id" "uuid", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_decline"("p_relationship_id" "uuid", "p_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_decline"("p_relationship_id" "uuid", "p_notes" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_relationship_detail"("p_relationship_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_detail"("p_relationship_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_detail"("p_relationship_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_relationship_invite"("p_target_company_id" "uuid", "p_relationship_type" "text", "p_settings" "jsonb", "p_compliance" "jsonb", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_invite"("p_target_company_id" "uuid", "p_relationship_type" "text", "p_settings" "jsonb", "p_compliance" "jsonb", "p_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_invite"("p_target_company_id" "uuid", "p_relationship_type" "text", "p_settings" "jsonb", "p_compliance" "jsonb", "p_notes" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_relationship_list"("p_scope" "text", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_list"("p_scope" "text", "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_list"("p_scope" "text", "p_status" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_relationship_reactivate"("p_relationship_id" "uuid", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_reactivate"("p_relationship_id" "uuid", "p_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_reactivate"("p_relationship_id" "uuid", "p_notes" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_relationship_suspend"("p_relationship_id" "uuid", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_suspend"("p_relationship_id" "uuid", "p_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_suspend"("p_relationship_id" "uuid", "p_notes" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_relationship_target_search"("p_query" "text", "p_relationship_type" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_target_search"("p_query" "text", "p_relationship_type" "text", "p_limit" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_relationship_target_search"("p_query" "text", "p_relationship_type" "text", "p_limit" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_role_permission_preview"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_role_permission_preview"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_role_permission_preview"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_role_preset_list"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_role_preset_list"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_role_preset_list"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_company_setup_context"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_company_setup_context"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_company_setup_context"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_create_calendar_event"("p_event_type" "text", "p_title" "text", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_order_id" "uuid", "p_appraiser_id" "uuid", "p_location" "text", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_create_calendar_event"("p_event_type" "text", "p_title" "text", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_order_id" "uuid", "p_appraiser_id" "uuid", "p_location" "text", "p_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_create_calendar_event"("p_event_type" "text", "p_title" "text", "p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_order_id" "uuid", "p_appraiser_id" "uuid", "p_location" "text", "p_notes" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_create_client"("patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_create_client"("patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_create_client"("patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_create_order"("payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_create_order"("payload" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_create_order"("payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_current_company_context"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_current_company_context"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_current_company_context"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_current_user_app_context"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_current_user_app_context"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_current_user_app_context"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_current_user_notification_preference_update"("p_event_key" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_current_user_notification_preference_update"("p_event_key" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_current_user_notification_preference_update"("p_event_key" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_current_user_notification_preferences_get"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_current_user_notification_preferences_get"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_current_user_notification_preferences_get"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_current_user_settings_get"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_current_user_settings_get"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_current_user_settings_get"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_current_user_settings_update"("p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_current_user_settings_update"("p_patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_current_user_settings_update"("p_patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_debug_notifications_access"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_debug_notifications_access"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_delete_client"("client_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_delete_client"("client_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_delete_client"("client_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_dismiss_notification"("p_notification_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_dismiss_notification"("p_notification_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_dismiss_notification"("p_notification_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_dismiss_seen_notifications"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_dismiss_seen_notifications"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_dismiss_seen_notifications"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_enqueue_email_v1"("p_user_id" "uuid", "p_subject" "text", "p_template" "text", "p_to_email" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_enqueue_email_v1"("p_user_id" "uuid", "p_subject" "text", "p_template" "text", "p_to_email" "text", "p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_get_activity_feed"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_get_activity_feed"("p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_get_activity_feed"("p_order_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_get_my_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_get_my_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_get_next_order_number"("p_company_key" "text", "p_effective_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_get_next_order_number"("p_company_key" "text", "p_effective_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_get_notification_prefs_v1"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_get_notification_prefs_v1"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_get_notification_prefs_v1"("p_user_id" "uuid") TO "authenticated";



GRANT ALL ON TABLE "public"."notifications" TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_get_notifications"("p_limit" integer, "p_before" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_get_notifications"("p_limit" integer, "p_before" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_get_notifications"("p_limit" integer, "p_before" timestamp with time zone) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_get_unread_count"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_get_unread_count"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_get_unread_count"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_is_client_name_available"("p_name" "text", "p_ignore_client_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_is_client_name_available"("p_name" "text", "p_ignore_client_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_is_order_number_available"("p_order_number" "text", "p_ignore_order_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_is_order_number_available"("p_order_number" "text", "p_ignore_order_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_is_order_number_available_v2"("p_order_number" "text", "p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_is_order_number_available_v2"("p_order_number" "text", "p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_is_order_number_available_v2"("p_order_number" "text", "p_order_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_list_admin_events"("p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_appraiser_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_list_admin_events"("p_start_at" timestamp with time zone, "p_end_at" timestamp with time zone, "p_appraiser_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_list_orders"("p_appraiser_id" "uuid", "p_status" "text", "p_q" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_list_orders"("p_appraiser_id" "uuid", "p_status" "text", "p_q" "text", "p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_list_orders"("p_appraiser_id" "uuid", "p_status" "text", "p_q" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_list_users_with_roles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_list_users_with_roles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_details" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_details" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_details" "jsonb") TO "authenticated";



GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_message" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_message" "text", "p_payload" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_log_event"("p_order_id" "uuid", "p_event_type" "text", "p_message" "text", "p_payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_log_note"("p_order_id" "uuid", "p_message" "text", "p_context" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_log_note"("p_order_id" "uuid", "p_message" "text", "p_context" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_log_note"("p_order_id" "uuid", "p_message" "text", "p_context" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_log_status_change"("p_order_id" "uuid", "p_prev_status" "text", "p_new_status" "text", "p_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_log_status_change"("p_order_id" "uuid", "p_prev_status" "text", "p_new_status" "text", "p_message" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_log_status_change"("p_order_id" "uuid", "p_prev_status" "text", "p_new_status" "text", "p_message" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_mark_all_notifications_read"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_mark_all_notifications_read"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_mark_all_notifications_read"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_mark_email_failed_v1"("p_id" "uuid", "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_mark_email_failed_v1"("p_id" "uuid", "p_error" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_mark_email_outbox_failed"("p_id" "uuid", "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_mark_email_outbox_failed"("p_id" "uuid", "p_error" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_mark_email_outbox_sent"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_mark_email_outbox_sent"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_mark_email_sent_v1"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_mark_email_sent_v1"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_mark_notification_read"("p_notification_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_mark_notification_read"("p_notification_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_mark_notification_read"("p_notification_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_next_order_no"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_next_order_no"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_notification_create"("patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notification_create"("patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_notification_create"("patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_notification_policy_lock_update"("p_event_key" "text", "p_channel" "text", "p_locked" boolean, "p_role" "text", "p_lock_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notification_policy_lock_update"("p_event_key" "text", "p_channel" "text", "p_locked" boolean, "p_role" "text", "p_lock_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_notification_policy_lock_update"("p_event_key" "text", "p_channel" "text", "p_locked" boolean, "p_role" "text", "p_lock_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_notification_policy_locks_get"("p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notification_policy_locks_get"("p_role" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_notification_policy_locks_get"("p_role" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_notification_prefs_ensure"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notification_prefs_ensure"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_notification_prefs_ensure"() TO "authenticated";



GRANT ALL ON TABLE "public"."notification_prefs" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."notification_prefs" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_notification_prefs_get"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notification_prefs_get"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_notification_prefs_get"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_notification_prefs_update"("patch" "jsonb", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_notification_recipients_for_order"("p_order_id" "uuid", "p_recipient_kind" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notification_recipients_for_order"("p_order_id" "uuid", "p_recipient_kind" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_notification_recipients_for_order"("p_order_id" "uuid", "p_recipient_kind" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_notifications_list"("category" "text", "is_read" boolean, "page_limit" integer, "before" timestamp with time zone, "after" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notifications_list"("category" "text", "is_read" boolean, "page_limit" integer, "before" timestamp with time zone, "after" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_notifications_mark_all_read"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notifications_mark_all_read"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_notifications_mark_read"("ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notifications_mark_read"("ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_notifications_unread_count"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notifications_unread_count"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_notify_admins"("p_title" "text", "p_body" "text", "p_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notify_admins"("p_title" "text", "p_body" "text", "p_message" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_notify_user"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_notify_user"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_message" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_archive"("p_order_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_archive"("p_order_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_assign"("p_order_id" "uuid", "p_appraiser_id" "uuid", "p_reviewer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_assign"("p_order_id" "uuid", "p_appraiser_id" "uuid", "p_reviewer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_assign_appraiser"("p_order_id" "text", "p_appraiser_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_assign_appraiser"("p_order_id" "text", "p_appraiser_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_cancel"("p_order_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_cancel"("p_order_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_accept"("p_assignment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_accept"("p_assignment_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_accept"("p_assignment_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_activity"("p_assignment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_activity"("p_assignment_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_activity"("p_assignment_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_cancel"("p_assignment_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_cancel"("p_assignment_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_cancel"("p_assignment_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_complete"("p_assignment_id" "uuid", "p_completion_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_complete"("p_assignment_id" "uuid", "p_completion_note" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_complete"("p_assignment_id" "uuid", "p_completion_note" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_decline"("p_assignment_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_decline"("p_assignment_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_decline"("p_assignment_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_detail"("p_assignment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_detail"("p_assignment_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_detail"("p_assignment_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_inbox"("p_status" "text", "p_assignment_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_inbox"("p_status" "text", "p_assignment_type" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_inbox"("p_status" "text", "p_assignment_type" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_list"("p_status" "text", "p_assignment_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_list"("p_status" "text", "p_assignment_type" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_list"("p_status" "text", "p_assignment_type" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_list_for_order"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_list_for_order"("p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_list_for_order"("p_order_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_offer"("p_order_id" "uuid", "p_assigned_company_id" "uuid", "p_relationship_id" "uuid", "p_assignment_type" "text", "p_instructions" "text", "p_terms" "jsonb", "p_handoff_payload" "jsonb", "p_due_at" timestamp with time zone, "p_review_due_at" timestamp with time zone, "p_expires_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_offer"("p_order_id" "uuid", "p_assigned_company_id" "uuid", "p_relationship_id" "uuid", "p_assignment_type" "text", "p_instructions" "text", "p_terms" "jsonb", "p_handoff_payload" "jsonb", "p_due_at" timestamp with time zone, "p_review_due_at" timestamp with time zone, "p_expires_at" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_offer"("p_order_id" "uuid", "p_assigned_company_id" "uuid", "p_relationship_id" "uuid", "p_assignment_type" "text", "p_instructions" "text", "p_terms" "jsonb", "p_handoff_payload" "jsonb", "p_due_at" timestamp with time zone, "p_review_due_at" timestamp with time zone, "p_expires_at" timestamp with time zone) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_offer_packet"("p_assignment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_offer_packet"("p_assignment_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_offer_packet"("p_assignment_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_owner_packet"("p_assignment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_owner_packet"("p_assignment_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_owner_packet"("p_assignment_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_revoke"("p_assignment_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_revoke"("p_assignment_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_revoke"("p_assignment_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_start"("p_assignment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_start"("p_assignment_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_start"("p_assignment_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_submit"("p_assignment_id" "uuid", "p_submission_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_submit"("p_assignment_id" "uuid", "p_submission_payload" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_submit"("p_assignment_id" "uuid", "p_submission_payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_company_assignment_work_packet"("p_assignment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_work_packet"("p_assignment_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_company_assignment_work_packet"("p_assignment_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_create"("p" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_create"("p" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_delete"("p_order_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_delete"("p_order_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_order_document_archive"("p_document_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_document_archive"("p_document_id" "uuid", "p_reason" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."rpc_order_document_authorize_download"("p_document_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_document_authorize_download"("p_document_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."rpc_order_document_finalize_upload"("p_document_id" "uuid", "p_mime_type" "text", "p_file_size" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_document_finalize_upload"("p_document_id" "uuid", "p_mime_type" "text", "p_file_size" bigint) TO "authenticated";



GRANT ALL ON FUNCTION "public"."rpc_order_document_prepare_upload"("p_order_id" "uuid", "p_category" "text", "p_file_name" "text", "p_mime_type" "text", "p_file_size" bigint, "p_visibility_scope" "text", "p_title" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_document_prepare_upload"("p_order_id" "uuid", "p_category" "text", "p_file_name" "text", "p_mime_type" "text", "p_file_size" bigint, "p_visibility_scope" "text", "p_title" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."rpc_order_documents_list"("p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_documents_list"("p_order_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_filter_clients"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_filter_clients"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_filter_clients"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_form_client_create"("p_client" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_form_client_create"("p_client" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_form_client_create"("p_client" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_form_client_name_search"("p_search" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_form_client_name_search"("p_search" "text", "p_limit" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_form_client_name_search"("p_search" "text", "p_limit" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_form_client_options"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_form_client_options"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_form_client_options"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_log_note"("p_order_id" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_log_note"("p_order_id" "uuid", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_mark_complete"("p_order_id" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_mark_complete"("p_order_id" "text", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_number_override"("p_order_id" "uuid", "p_order_number" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_number_override"("p_order_id" "uuid", "p_order_number" "text", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_number_override"("p_order_id" "uuid", "p_order_number" "text", "p_reason" "text") TO "authenticated";



GRANT ALL ON TABLE "public"."order_operational_inputs" TO "service_role";
GRANT SELECT ON TABLE "public"."order_operational_inputs" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_operational_input_clear"("p_input_id" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_operational_input_clear"("p_input_id" "uuid", "p_note" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_operational_input_create"("p_order_id" "uuid", "p_input_type" "text", "p_note" "text", "p_payload" "jsonb", "p_source" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_operational_input_create"("p_order_id" "uuid", "p_input_type" "text", "p_note" "text", "p_payload" "jsonb", "p_source" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_ready_to_send"("p_order_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_ready_to_send"("p_order_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_saved_view_create"("p_name" "text", "p_filters" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_saved_view_create"("p_name" "text", "p_filters" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_saved_view_delete"("p_view_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_saved_view_delete"("p_view_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_saved_view_update"("p_view_id" "uuid", "p_name" "text", "p_filters" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_saved_view_update"("p_view_id" "uuid", "p_name" "text", "p_filters" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_saved_views_list"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_saved_views_list"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_send_to_client"("p_order_id" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_send_to_client"("p_order_id" "text", "p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp without time zone, "p_review_due_at" "date", "p_due_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp without time zone, "p_review_due_at" "date", "p_due_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp with time zone, "p_review_due_at" "date", "p_final_due_at" "date", "p_due_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_set_dates"("p_order_id" "uuid", "p_site_visit_at" timestamp with time zone, "p_review_due_at" "date", "p_final_due_at" "date", "p_due_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_set_status"("p_order_id" "text", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_set_status"("p_order_id" "text", "p_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_set_status"("p_order_id" "uuid", "p_status" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_set_status"("p_order_id" "uuid", "p_status" "text", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_update"("p_order_id" "text", "p_patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_update"("p_order_id" "text", "p_patch" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_update"("p_order_id" "uuid", "p" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_update"("p_order_id" "uuid", "p" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_order_update"("p_order_id" "uuid", "p" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_order_update_dates"("p_order_id" "text", "p_site_visit_at" timestamp with time zone, "p_review_due_at" timestamp with time zone, "p_final_due_at" timestamp with time zone, "p_due_date" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_update_dates"("p_order_id" "text", "p_site_visit_at" timestamp with time zone, "p_review_due_at" timestamp with time zone, "p_final_due_at" timestamp with time zone, "p_due_date" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_order_void"("p_order_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_order_void"("p_order_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_review_approve"("p_order_id" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_review_approve"("p_order_id" "text", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_review_request_revisions"("p_order_id" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_review_request_revisions"("p_order_id" "text", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_review_start"("p_order_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_review_start"("p_order_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_set_admin_status"("p_user_id" "uuid", "p_is_admin" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_set_admin_status"("p_user_id" "uuid", "p_is_admin" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_set_notification_pref"("p_user_id" "uuid", "p_type" "text", "p_channel" "text", "p_enabled" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_set_notification_pref"("p_user_id" "uuid", "p_type" "text", "p_channel" "text", "p_enabled" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_set_notification_pref_v1"("p_user_id" "uuid", "p_type" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_set_notification_pref_v1"("p_user_id" "uuid", "p_type" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_set_notification_pref_v1"("p_user_id" "uuid", "p_type" "text", "p_channel" "text", "p_enabled" boolean, "p_meta" "jsonb") TO "authenticated";



GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_set_notification_preferences"("p_email_enabled" boolean, "p_email_address" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_set_notification_preferences"("p_email_enabled" boolean, "p_email_address" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_set_review_route"("order_id" "uuid", "route" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_set_review_route"("order_id" "uuid", "route" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_set_user_role"("p_user_id" "uuid", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_set_user_role"("p_user_id" "uuid", "p_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_set_user_role"("p_user_id" "uuid", "p_role" "text", "p_grant" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_set_user_role"("p_user_id" "uuid", "p_role" "text", "p_grant" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_system_insert_notification"("p_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_link_path" "text", "p_payload" "jsonb", "p_priority" "text", "p_category" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_system_insert_notification"("p_user_id" "uuid", "p_type" "text", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_link_path" "text", "p_payload" "jsonb", "p_priority" "text", "p_category" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_transition_order_status"("p_order_id" "uuid", "p_transition_key" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_transition_order_status"("p_order_id" "uuid", "p_transition_key" "text", "p_note" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_transition_order_status"("p_order_id" "uuid", "p_transition_key" "text", "p_note" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_update_client"("client_id" bigint, "patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_update_client"("client_id" bigint, "patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_update_client"("client_id" bigint, "patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_update_due_dates"("p_order_id" "uuid", "p_due_date" "date", "p_review_due_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_update_due_dates"("p_order_id" "uuid", "p_due_date" "date", "p_review_due_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_update_due_dates"("p_order_id" "uuid", "p_due_date" "date", "p_review_due_date" "date") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_update_order"("order_id" "uuid", "patch" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_update_order"("order_id" "uuid", "patch" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_update_order"("order_id" "uuid", "patch" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_update_order_dates"("order_id" "uuid", "site_visit_at" timestamp with time zone, "review_due_at" timestamp with time zone, "final_due_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_update_order_dates"("order_id" "uuid", "site_visit_at" timestamp with time zone, "review_due_at" timestamp with time zone, "final_due_at" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_update_order_dates"("order_id" "uuid", "site_visit_at" timestamp with time zone, "review_due_at" timestamp with time zone, "final_due_at" timestamp with time zone) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_update_order_status"("order_id" "uuid", "next_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_update_order_status"("order_id" "uuid", "next_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_update_order_status_with_note"("order_id" "uuid", "next_status" "text", "note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_update_order_status_with_note"("order_id" "uuid", "next_status" "text", "note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_update_order_v1"("p_order_id" "uuid", "p_status" "text", "p_appraiser_id" "uuid", "p_site_visit" timestamp with time zone, "p_review_due" timestamp with time zone, "p_final_due" timestamp with time zone, "p_actor" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_update_order_v1"("p_order_id" "uuid", "p_status" "text", "p_appraiser_id" "uuid", "p_site_visit" timestamp with time zone, "p_review_due" timestamp with time zone, "p_final_due" timestamp with time zone, "p_actor" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."user_profiles" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_update_profile"("p_display_name" "text", "p_color" "text", "p_phone" "text", "p_avatar_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_update_profile"("p_display_name" "text", "p_color" "text", "p_phone" "text", "p_avatar_url" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_update_profile"("p_display_name" "text", "p_color" "text", "p_phone" "text", "p_avatar_url" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rpc_update_user_profile"("p_user_id" "uuid", "p_display_name" "text", "p_display_color" "text", "p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_update_user_profile"("p_user_id" "uuid", "p_display_name" "text", "p_display_color" "text", "p_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_user_set_color"("p_auth_id" "text", "p_color" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_user_set_color"("p_auth_id" "text", "p_color" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_user_set_fee_split"("p_auth_id" "text", "p_fee" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_user_set_fee_split"("p_auth_id" "text", "p_fee" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_user_set_role"("p_auth_id" "text", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_user_set_role"("p_auth_id" "text", "p_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_user_set_status"("p_auth_id" "text", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_user_set_status"("p_auth_id" "text", "p_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."safe_uuid"("p_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."safe_uuid"("p_text" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_order_appointment"("p_order_id" "uuid", "p_datetime" timestamp with time zone, "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_order_appointment"("p_order_id" "uuid", "p_datetime" timestamp with time zone, "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_order_status"("p_order_id" "uuid", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_order_status"("p_order_id" "uuid", "p_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."team_get_user"("user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."team_get_user"("user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."team_get_user"("user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."team_list_users"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."team_list_users"() TO "service_role";
GRANT ALL ON FUNCTION "public"."team_list_users"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."team_list_users"("include_inactive" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."team_list_users"("include_inactive" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."team_list_users"("include_inactive" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."tg_activity_denorm_actor"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_activity_denorm_actor"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_clients_preserve_company_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_clients_preserve_company_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_company_member_invitations_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_company_member_permission_overrides_touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_company_memberships_touch_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_company_memberships_touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_company_relationship_foundation_touch_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_company_relationship_foundation_touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_company_relationships_guard_immutable_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_company_relationships_guard_immutable_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_log_order_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_log_order_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_notifications_queue_email"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_notifications_queue_email"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_notifications_v1_order_safe_links"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_notifications_v1_order_safe_links"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_order_company_assignments_guard"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_order_company_assignments_guard"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_order_company_assignments_touch_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_order_company_assignments_touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_orders_audit_ins"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_orders_audit_ins"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_orders_audit_upd"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_orders_audit_upd"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_orders_insert_assignment_notification"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_orders_insert_assignment_notification"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_orders_preserve_company_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_orders_preserve_company_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_orders_v1_date_notification"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_orders_validate_assignment_targets"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_orders_validate_assignment_targets"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_orders_validate_company_client_attachments"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_orders_validate_company_client_attachments"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_set_timestamp"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_set_timestamp"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_user_role_assignments_touch_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_user_role_assignments_touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trg_orders_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trg_orders_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trg_orders_notifications"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trg_orders_notifications"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_user_profile_basic"("p_user_id" "uuid", "p_name" "text", "p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_user_profile_basic"("p_user_id" "uuid", "p_name" "text", "p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_user_settings"("p_user_id" "uuid", "p_phone" "text", "p_preferences" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_user_settings"("p_user_id" "uuid", "p_phone" "text", "p_preferences" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_owner_role_in_company"("p_user_id" "uuid", "p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_owner_role_in_company"("p_user_id" "uuid", "p_company_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_role"("p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_role"("p_role" "text") TO "service_role";



GRANT ALL ON TABLE "public"."_view_backups" TO "service_role";



GRANT ALL ON TABLE "public"."activity_events" TO "service_role";



GRANT ALL ON TABLE "public"."amc_lenders" TO "service_role";



GRANT ALL ON TABLE "public"."amcs" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."appraiser_licenses" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."client_contacts" TO "service_role";
GRANT SELECT ON TABLE "public"."client_contacts" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."client_contacts_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."clients_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_audit_events" TO "service_role";



GRANT ALL ON TABLE "public"."company_member_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."company_member_permission_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."company_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."company_relationship_types" TO "service_role";



GRANT ALL ON TABLE "public"."company_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."company_types" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contacts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."identity_role_backfill_log" TO "service_role";



GRANT ALL ON TABLE "public"."identity_role_review_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."identity_role_review_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."instance_blueprint" TO "service_role";



GRANT ALL ON TABLE "public"."instance_blueprint_backup_20260319" TO "service_role";



GRANT ALL ON SEQUENCE "public"."instance_blueprint_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification_policies" TO "service_role";
GRANT SELECT ON TABLE "public"."notification_policies" TO "authenticated";



GRANT ALL ON TABLE "public"."order_assignments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_assignments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_company_assignment_activity" TO "service_role";



GRANT ALL ON TABLE "public"."order_company_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."order_counters" TO "service_role";



GRANT ALL ON TABLE "public"."order_documents" TO "service_role";



GRANT ALL ON TABLE "public"."order_number_counters" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_number_counters_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_numbering_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_numbering_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_saved_views" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_log" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."profiles_legacy" TO "service_role";



GRANT ALL ON TABLE "public"."review_flow" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."schema_decisions" TO "service_role";



GRANT ALL ON TABLE "public"."schema_decisions_backup_20260319" TO "service_role";



GRANT ALL ON SEQUENCE "public"."schema_decisions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."schema_registry" TO "service_role";



GRANT ALL ON TABLE "public"."schema_registry_backup_20260319" TO "service_role";



GRANT ALL ON SEQUENCE "public"."schema_registry_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."staging_orders_2025" TO "service_role";



GRANT ALL ON TABLE "public"."staging_raw_orders_2025_csv" TO "service_role";



GRANT ALL ON TABLE "public"."stg_orders_import" TO "service_role";



GRANT ALL ON TABLE "public"."user_documents" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_prefs" TO "service_role";



GRANT ALL ON TABLE "public"."user_role_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."v_admin_calendar" TO "service_role";
GRANT SELECT ON TABLE "public"."v_admin_calendar" TO "authenticated";



GRANT ALL ON TABLE "public"."v_admin_calendar_enriched" TO "service_role";
GRANT SELECT ON TABLE "public"."v_admin_calendar_enriched" TO "authenticated";



GRANT ALL ON TABLE "public"."v_calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."v_calendar_unified" TO "service_role";



GRANT ALL ON TABLE "public"."v_admin_calendar_v2" TO "service_role";



GRANT ALL ON TABLE "public"."v_orders_unified" TO "service_role";



GRANT ALL ON TABLE "public"."v_admin_dashboard_counts" TO "service_role";



GRANT ALL ON TABLE "public"."v_amcs" TO "service_role";



GRANT ALL ON TABLE "public"."v_calendar_events_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_calendar_events_appraiser" TO "service_role";



GRANT ALL ON TABLE "public"."v_client_kpis" TO "service_role";
GRANT SELECT ON TABLE "public"."v_client_kpis" TO "authenticated";
GRANT SELECT ON TABLE "public"."v_client_kpis" TO "anon";



GRANT ALL ON TABLE "public"."v_client_kpis_appraiser" TO "service_role";
GRANT SELECT ON TABLE "public"."v_client_kpis_appraiser" TO "authenticated";
GRANT SELECT ON TABLE "public"."v_client_kpis_appraiser" TO "anon";



GRANT ALL ON TABLE "public"."v_client_metrics" TO "service_role";
GRANT SELECT ON TABLE "public"."v_client_metrics" TO "authenticated";
GRANT SELECT ON TABLE "public"."v_client_metrics" TO "anon";



GRANT ALL ON TABLE "public"."v_email_queue" TO "service_role";



GRANT ALL ON TABLE "public"."v_is_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_order_activity_compat" TO "service_role";
GRANT SELECT ON TABLE "public"."v_order_activity_compat" TO "authenticated";



GRANT ALL ON TABLE "public"."v_order_activity_feed" TO "service_role";
GRANT SELECT ON TABLE "public"."v_order_activity_feed" TO "authenticated";



GRANT ALL ON TABLE "public"."v_orders" TO "service_role";



GRANT ALL ON TABLE "public"."v_orders_frontend_v4" TO "service_role";
GRANT SELECT ON TABLE "public"."v_orders_frontend_v4" TO "authenticated";
GRANT SELECT ON TABLE "public"."v_orders_frontend_v4" TO "anon";



GRANT ALL ON TABLE "public"."v_orders_active_frontend_v4" TO "service_role";
GRANT SELECT ON TABLE "public"."v_orders_active_frontend_v4" TO "authenticated";
GRANT SELECT ON TABLE "public"."v_orders_active_frontend_v4" TO "anon";



GRANT ALL ON TABLE "public"."v_orders_all" TO "service_role";



GRANT ALL ON TABLE "public"."v_orders_dashboard_active" TO "service_role";



GRANT ALL ON TABLE "public"."v_orders_frontend" TO "service_role";



GRANT ALL ON TABLE "public"."v_orders_list" TO "service_role";
GRANT SELECT ON TABLE "public"."v_orders_list" TO "authenticated";



GRANT ALL ON TABLE "public"."v_orders_list_v2" TO "service_role";



GRANT ALL ON TABLE "public"."v_orders_list_with_last_activity" TO "service_role";
GRANT SELECT ON TABLE "public"."v_orders_list_with_last_activity" TO "authenticated";



GRANT ALL ON TABLE "public"."v_orders_list_with_last_activity_v2" TO "service_role";



GRANT ALL ON TABLE "public"."v_orders_unified_list" TO "service_role";



GRANT ALL ON TABLE "public"."v_staging_raw_orders_2025_ord" TO "service_role";



GRANT ALL ON TABLE "public"."v_user_notification_prefs" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







RESET ALL;
