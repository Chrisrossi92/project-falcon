import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260518070500_storage_schema_prerequisites.sql',
);
const bucketMigrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260518071000_order_documents_private_bucket_download_auth.sql',
);
const rolesPath = resolve(repoRoot, 'supabase/roles.sql');
const localResetScriptPath = resolve(repoRoot, 'scripts/local-supabase-reset.mjs');
const packageJsonPath = resolve(repoRoot, 'package.json');

const migrationSql = readFileSync(migrationPath, 'utf8');
const bucketMigrationSql = readFileSync(bucketMigrationPath, 'utf8');
const rolesSql = readFileSync(rolesPath, 'utf8');
const localResetScript = readFileSync(localResetScriptPath, 'utf8');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

describe('Storage schema prerequisites migration', () => {
  it('keeps the Storage schema boundary available without taking ownership of Storage tables', () => {
    expect(migrationSql).toContain('create schema if not exists storage');
    expect(migrationSql).toContain('revoke all on schema storage from public');
    expect(migrationSql).toContain('grant usage on schema storage to authenticated, service_role');
    expect(migrationSql).not.toContain('comment on schema storage');
    expect(migrationSql).not.toContain('create table if not exists storage.buckets');
    expect(migrationSql).not.toContain('create table if not exists storage.objects');
    expect(migrationSql).not.toContain('grant all on storage.buckets');
    expect(migrationSql).not.toContain('grant all on storage.objects');
  });

  it('does not add app policies, signed URL behavior, or browser-facing storage exposure', () => {
    expect(migrationSql).not.toContain('create policy');
    expect(migrationSql).not.toContain('create or replace function');
    expect(migrationSql).not.toContain('createSignedUrl');
    expect(migrationSql).not.toContain('signed_url');
    expect(migrationSql).not.toContain('storage_path');
  });
});

describe('Local Supabase roles bootstrap', () => {
  it('prepares Storage migration metadata before Storage service startup', () => {
    [
      'create table if not exists public.migrations',
      'id integer primary key',
      'name varchar(100) unique not null',
      'hash varchar(40) not null',
      'grant all on public.migrations to supabase_storage_admin',
    ].forEach((snippet) => {
      expect(rolesSql).toContain(snippet);
    });

    expect(rolesSql).not.toContain('create table if not exists storage.migrations');
    expect(rolesSql).not.toContain('alter role supabase_storage_admin');
  });

  it('does not modify reserved Storage roles or direct Storage table grants', () => {
    expect(rolesSql).not.toContain('alter default privileges for role supabase_storage_admin');
    expect(rolesSql).not.toContain('alter role supabase_storage_admin');
    expect(rolesSql).not.toContain('grant all on storage.buckets to authenticated');
    expect(rolesSql).not.toContain('grant all on storage.objects to authenticated');
    expect(rolesSql).not.toContain('storage_path');
    expect(rolesSql).not.toContain('signed_url');
  });

  it('does not add local credentialed Storage owner workarounds', () => {
    expect(rolesSql).not.toContain('dblink');
    expect(rolesSql).not.toContain('password=postgres');
    expect(rolesSql).not.toContain('create event trigger');
  });
});

describe('Order documents private bucket migration', () => {
  it('guards Storage bucket writes for local reset environments where storage.buckets is not ready', () => {
    expect(bucketMigrationSql).toContain("if to_regclass('storage.buckets') is null then");
    expect(bucketMigrationSql).toContain(
      "raise notice 'Skipping order-documents bucket bootstrap because storage.buckets is not available in this migration environment.'",
    );
    expect(bucketMigrationSql).toContain('insert into storage.buckets');
    expect(bucketMigrationSql).toContain("'order-documents'");
  });

  it('preserves private order document bucket settings when Storage metadata exists', () => {
    [
      'public,',
      'file_size_limit,',
      'allowed_mime_types',
      'false,',
      '52428800,',
      'public = false',
      'file_size_limit = excluded.file_size_limit',
      'allowed_mime_types = excluded.allowed_mime_types',
    ].forEach((snippet) => {
      expect(bucketMigrationSql).toContain(snippet);
    });
  });
});

describe('Local Supabase reset wrapper', () => {
  it('exposes an explicit local-only reset command', () => {
    expect(packageJson.scripts['supabase:reset:local']).toBe(
      'node scripts/local-supabase-reset.mjs',
    );
  });

  it('keeps Storage role repair local to Docker reset bootstrap', () => {
    [
      "const projectName = process.env.SUPABASE_LOCAL_PROJECT || 'project-falcon'",
      "const localStorageVersion = 'v1.26.7'",
      "run(supabaseBin, ['db', 'reset']",
      "'supabase_admin'",
      'Detected local Supabase Storage role bootstrap failure',
      'grant all on all tables in schema storage to service_role',
      'grant all on all sequences in schema storage to service_role',
      'grant all on all functions in schema storage to service_role',
      "docker', ['restart', storageContainer]",
    ].forEach((snippet) => {
      expect(localResetScript).toContain(snippet);
    });

    expect(localResetScript).not.toContain('service_role key');
    expect(localResetScript).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(localResetScript).not.toContain('storage_path');
  });

  it('reconciles the private order-documents bucket without exposing paths', () => {
    [
      "id = 'order-documents'",
      "where id = 'order-documents'",
      'public = false',
      'file_size_limit = 52428800',
      'local_storage_bootstrap_ready',
    ].forEach((snippet) => {
      expect(localResetScript).toContain(snippet);
    });
  });
});
