import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const supabaseBin = process.env.SUPABASE_CLI || '/Users/christopherrossi/.supabase/bin/supabase';
const projectName = process.env.SUPABASE_LOCAL_PROJECT || 'project-falcon';
const dbContainer = `supabase_db_${projectName}`;
const storageContainer = `supabase_storage_${projectName}`;
const localStorageVersion = 'v1.26.7';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: { ...process.env, ...options.env },
  });

  if (!options.capture && result.status !== 0 && !options.allowFailure) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function ensureLocalStorageVersionPin() {
  const tempDir = resolve(repoRoot, 'supabase/.temp');
  const versionPath = resolve(tempDir, 'storage-version');

  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const currentVersion = existsSync(versionPath) ? readFileSync(versionPath, 'utf8').trim() : '';
  if (currentVersion !== localStorageVersion) {
    writeFileSync(versionPath, `${localStorageVersion}\n`);
    console.log(`Pinned local Supabase Storage API to ${localStorageVersion}.`);
  }
}

function isKnownStorageResetFailure(result) {
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  return (
    result.status !== 0 &&
    (output.includes('new row violates row-level security policy') ||
      output.includes('"error":"Unauthorized"') ||
      output.includes('An invalid response was received from the upstream server'))
  );
}

function psql(sql) {
  return run(
    'docker',
    [
      'exec',
      dbContainer,
      'env',
      'PGPASSWORD=postgres',
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      'supabase_admin',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-t',
      '-A',
      '-c',
      sql,
    ],
    { capture: true },
  );
}

function bootstrapLocalStorageRoles() {
  const sql = `
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise exception 'storage.buckets is not available after reset';
  end if;

  grant usage on schema storage to service_role;
  grant all on all tables in schema storage to service_role;
  grant all on all sequences in schema storage to service_role;
  grant all on all functions in schema storage to service_role;

  insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
  values (
    'order-documents',
    'order-documents',
    false,
    52428800,
    null
  )
  on conflict (id) do update
    set name = excluded.name,
        public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
end;
$$;
`;

  const result = psql(sql);
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
}

function verifyLocalStorageBootstrap() {
  const sql = `
select (
  to_regclass('storage.buckets') is not null
  and exists (
    select 1
      from information_schema.table_privileges
     where table_schema = 'storage'
       and table_name = 'buckets'
       and grantee = 'service_role'
       and privilege_type = 'SELECT'
  )
  and exists (
    select 1
      from storage.buckets
     where id = 'order-documents'
       and public = false
       and file_size_limit = 52428800
  )
) as local_storage_bootstrap_ready;
`;

  const result = psql(sql);
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }

  const output = (result.stdout ?? '').trim();
  if (output !== 't') {
    process.stderr.write(output);
    process.stderr.write('\n');
    process.stderr.write('Local Storage bootstrap verification failed.\n');
    process.exit(1);
  }

  console.log('Local Storage bootstrap verification passed.');
}

function restartStorageApi() {
  const result = run('docker', ['restart', storageContainer], { capture: true });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
}

ensureLocalStorageVersionPin();

const reset = run(supabaseBin, ['db', 'reset'], { capture: true });
if (reset.status === 0) {
  process.stdout.write(reset.stdout ?? '');
  process.stderr.write(reset.stderr ?? '');
  bootstrapLocalStorageRoles();
  restartStorageApi();
  verifyLocalStorageBootstrap();
  console.log('Local Supabase reset completed.');
  process.exit(0);
}

process.stdout.write(reset.stdout ?? '');
process.stderr.write(reset.stderr ?? '');

if (!isKnownStorageResetFailure(reset)) {
  process.exit(reset.status ?? 1);
}

console.log('Detected local Supabase Storage role bootstrap failure; applying local-only Storage grants.');
bootstrapLocalStorageRoles();
restartStorageApi();
verifyLocalStorageBootstrap();
console.log('Local Supabase reset completed after Storage role bootstrap.');
