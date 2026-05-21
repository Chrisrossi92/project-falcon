-- Dynamically backfill user_profiles and add foreign keys for user reference columns.
-- This migration inspects the schema to determine which user reference columns exist
-- and ensures that every referenced UUID either has a corresponding user_profile row
-- or is nulled out. It then adds and validates the appropriate foreign key constraints.

do $$
declare
  -- Potential user reference columns on the orders table.
  orders_cols text[] := array[
    'assigned_to',
    'reviewer_id',
    'owner_id',
    'created_by',
    'appraiser_id'
  ];

  -- Potential user reference columns on the order_status_log table.
  status_cols text[] := array['actor_id','user_id'];

  tbl text;
  col text;
  con_name text;

  -- Columns and expressions used when inserting into user_profiles.
  cols text := '';
  vals text := '';
begin
  ---------------------------------------------------------------------------
  -- Build the list of columns and values for inserting into user_profiles.
  -- Always include user_id. Optionally include full_name, display_name,
  -- and created_at if those columns exist on user_profiles.
  ---------------------------------------------------------------------------
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='user_profiles'
      and column_name='user_id'
  ) then
    cols := format('%I', 'user_id');
    vals := 'u.id';
  else
    raise exception 'public.user_profiles must have a user_id column';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='user_profiles'
      and column_name='full_name'
  ) then
    cols := cols || ', ' || format('%I','full_name');
    vals := vals || ', ' || 'split_part(u.email, ''@'', 1)';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='user_profiles'
      and column_name='display_name'
  ) then
    cols := cols || ', ' || format('%I','display_name');
    vals := vals || ', ' || 'split_part(u.email, ''@'', 1)';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='user_profiles'
      and column_name='created_at'
  ) then
    cols := cols || ', ' || format('%I','created_at');
    vals := vals || ', ' || 'now()';
  end if;

  ---------------------------------------------------------------------------
  -- Temporary table to collect candidate user IDs for backfilling.
  ---------------------------------------------------------------------------
  create temporary table if not exists tmp_user_ids(id uuid) on commit drop;

  ---------------------------------------------------------------------------
  -- Process each user reference column on the orders table.
  ---------------------------------------------------------------------------
  tbl := 'orders';
  foreach col in array orders_cols loop
    -- Skip columns that do not exist.
    if not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name=tbl
        and column_name=col
    ) then
      continue;
    end if;

    -- Collect distinct IDs from the column.
    delete from tmp_user_ids;
    execute format(
      'insert into tmp_user_ids(id)
       select distinct %I
       from public.%I
       where %I is not null',
      col, tbl, col
    );

    -- Backfill user_profiles for IDs that exist in auth.users but not yet in user_profiles.
    execute format(
      'insert into public.user_profiles (%s)
       select %s
       from auth.users u
       join (select distinct id from tmp_user_ids) x on x.id = u.id
       left join public.user_profiles p on p.user_id = u.id
       where p.user_id is null
       on conflict (user_id) do nothing',
      cols, vals
    );

    -- Null out orphan references that still do not have matching user_profiles.
    execute format(
      'update public.%I t
       set %I = null
       where %I is not null
         and not exists (
           select 1
           from public.user_profiles p
           where p.user_id = t.%I
         )',
      tbl, col, col, col
    );

    -- Add the foreign key constraint if it does not already exist.
    con_name := 'fk_' || tbl || '_' || col;
    if not exists (
      select 1
      from pg_constraint pc
      where pc.conname = con_name
    ) then
      execute format(
        'alter table public.%I
           add constraint %I
           foreign key (%I)
             references public.user_profiles(user_id)
             on delete set null
           not valid',
        tbl, con_name, col
      );
    end if;

    -- Validate the constraint.
    execute format(
      'alter table public.%I validate constraint %I',
      tbl, con_name
    );
  end loop;

  ---------------------------------------------------------------------------
  -- Process each user reference column on the order_status_log table.
  ---------------------------------------------------------------------------
  tbl := 'order_status_log';
  foreach col in array status_cols loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name=tbl
        and column_name=col
    ) then
      continue;
    end if;

    -- Collect distinct IDs from the column.
    delete from tmp_user_ids;
    execute format(
      'insert into tmp_user_ids(id)
       select distinct %I
       from public.%I
       where %I is not null',
      col, tbl, col
    );

    -- Backfill user_profiles for IDs that exist in auth.users but not yet in user_profiles.
    execute format(
      'insert into public.user_profiles (%s)
       select %s
       from auth.users u
       join (select distinct id from tmp_user_ids) x on x.id = u.id
       left join public.user_profiles p on p.user_id = u.id
       where p.user_id is null
       on conflict (user_id) do nothing',
      cols, vals
    );

    -- Null out orphan references.
    execute format(
      'update public.%I t
       set %I = null
       where %I is not null
         and not exists (
           select 1
           from public.user_profiles p
           where p.user_id = t.%I
         )',
      tbl, col, col, col
    );

    -- Add the foreign key constraint if it does not already exist.
    con_name := 'fk_' || tbl || '_' || col;
    if not exists (
      select 1
      from pg_constraint pc
      where pc.conname = con_name
    ) then
      execute format(
        'alter table public.%I
           add constraint %I
           foreign key (%I)
             references public.user_profiles(user_id)
             on delete set null
           not valid',
        tbl, con_name, col
      );
    end if;

    -- Validate the constraint.
    execute format(
      'alter table public.%I validate constraint %I',
      tbl, con_name
    );
  end loop;
end$$;