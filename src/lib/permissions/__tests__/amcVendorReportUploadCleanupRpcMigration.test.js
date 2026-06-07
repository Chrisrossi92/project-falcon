import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260605110000_amc_vendor_report_upload_cleanup.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC vendor report upload cleanup migration', () => {
  it('adds pending upload expiration metadata and permits expired document status', () => {
    expect(migrationSql).toContain('add column if not exists upload_expires_at timestamptz');
    expect(migrationSql).toContain('add column if not exists upload_expired_at timestamptz');
    expect(migrationSql).toContain('add column if not exists upload_cleanup_note text');
    expect(migrationSql).toContain('drop constraint order_documents_status_check');
    expect(migrationSql).toContain("status = any (array['pending', 'active', 'archived', 'deleted', 'expired'])");
  });

  it('sets 24-hour expiration only for pending Vendor Workspace report uploads', () => {
    expect(migrationSql).toContain('create or replace function public.tg_vendor_report_upload_set_expiry()');
    expect(migrationSql).toContain("NEW.status = 'pending'");
    expect(migrationSql).toContain("NEW.category = 'final_report'");
    expect(migrationSql).toContain("NEW.visibility_scope = 'vendor'");
    expect(migrationSql).toContain("NEW.storage_path like 'vendor-workspace/assignments/%'");
    expect(migrationSql).toContain("NEW.upload_expires_at := NEW.created_at + interval '24 hours'");
    expect(migrationSql).toContain('create trigger trg_vendor_report_upload_set_expiry');
  });

  it('creates a service-role-only cleanup RPC with conservative threshold and bounded batches', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_amc_cleanup_abandoned_vendor_report_uploads(',
    );
    expect(migrationSql).toContain("p_older_than interval default interval '24 hours'");
    expect(migrationSql).toContain('p_limit integer default 500');
    expect(migrationSql).toContain("greatest(coalesce(p_older_than, interval '24 hours'), interval '1 hour')");
    expect(migrationSql).toContain('least(greatest(coalesce(p_limit, 500), 1), 5000)');
    expect(migrationSql).toContain('for update skip locked');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_amc_cleanup_abandoned_vendor_report_uploads(interval, integer) from public, anon, authenticated',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_amc_cleanup_abandoned_vendor_report_uploads(interval, integer) to service_role',
    );
  });

  it('expires only old pending vendor final report uploads and leaves fresh pending rows alone', () => {
    expect(migrationSql).toContain("where od.status = 'pending'");
    expect(migrationSql).toContain("and od.category = 'final_report'");
    expect(migrationSql).toContain("and od.visibility_scope = 'vendor'");
    expect(migrationSql).toContain("and od.storage_path like 'vendor-workspace/assignments/%'");
    expect(migrationSql).toContain('coalesce(od.upload_expires_at, od.created_at + v_threshold) <= now()');
    expect(migrationSql).toContain('od.created_at <= v_cutoff');
  });

  it('marks stale rows expired idempotently without deleting submitted/resubmitted documents', () => {
    expect(migrationSql).toContain("set status = 'expired'");
    expect(migrationSql).toContain('upload_expired_at = coalesce(od.upload_expired_at, now())');
    expect(migrationSql).toContain("where od.id = c.id\n       and od.status = 'pending'");
    expect(migrationSql).not.toContain("where od.status = 'active'");
    expect(migrationSql).not.toContain("set status = 'deleted'");
    expect(migrationSql).not.toContain('delete from public.order_documents');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.orders');
  });

  it('documents metadata-only storage cleanup and does not expose storage paths in the RPC response', () => {
    expect(migrationSql).toContain('Storage object cleanup is intentionally deferred');
    expect(migrationSql).toContain("'storage_cleanup', 'metadata_only'");
    expect(migrationSql).toContain("'expired_count'");
    expect(migrationSql).not.toContain("'storage_path'");
    expect(migrationSql).not.toContain("'storage_bucket'");
    expect(migrationSql).not.toContain('storage.objects');
    expect(migrationSql).not.toContain('storage.delete');
    expect(migrationSql).not.toContain('delete from storage.objects');
  });
});
