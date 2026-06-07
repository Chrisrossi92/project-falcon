create table if not exists public.migrations (
  id integer primary key,
  name varchar(100) unique not null,
  hash varchar(40) not null,
  executed_at timestamp default current_timestamp
);

grant all on public.migrations to supabase_storage_admin;
