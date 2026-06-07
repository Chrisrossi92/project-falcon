begin;

create schema if not exists storage;

revoke all on schema storage from public;

grant usage on schema storage to authenticated, service_role;

commit;
