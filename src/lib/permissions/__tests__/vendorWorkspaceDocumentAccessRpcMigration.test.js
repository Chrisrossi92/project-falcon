import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260604113000_amc_vendor_workspace_document_access_rpc.sql',
);
const edgePath = resolve(
  repoRoot,
  'supabase/functions/vendor-workspace-document-download-url/index.ts',
);

const migrationSql = readFileSync(migrationPath, 'utf8');
const edgeSource = readFileSync(edgePath, 'utf8');

describe('Vendor Workspace document access authorization migration', () => {
  it('creates caller-facing authorization and service-only storage lookup RPCs', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_vendor_workspace_authorize_document_access',
    );
    expect(migrationSql).toContain('p_work_key text');
    expect(migrationSql).toContain('p_document_key text');
    expect(migrationSql).toContain(
      'create or replace function public.rpc_vendor_workspace_document_storage_lookup',
    );
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_authorize_document_access(text, text) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_authorize_document_access(text, text) to authenticated, service_role',
    );
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_document_storage_lookup(text, text) from public, anon, authenticated',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_document_storage_lookup(text, text) to service_role',
    );
  });

  it('requires current company and vendor document read permission', () => {
    [
      'current_app_user_id()',
      'current_company_id()',
      'current_app_user_has_current_company()',
      "current_app_user_has_permission('vendor_documents.read')",
      "raise exception 'vendor_documents_read_permission_required'",
    ].forEach((snippet) => {
      expect(migrationSql).toContain(snippet);
    });

    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('documents\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('orders\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('bid_requests\./);
  });

  it('resolves only opaque work and document keys in the current vendor company scope', () => {
    [
      "v_work_key !~ '^[0-9a-f]{64}$'",
      "v_document_key !~ '^[0-9a-f]{64}$'",
      "'vendor_available_work_v1'",
      "'vendor_document_v1'",
      'brr.id::text',
      'brr.vendor_company_id::text',
      'od.id::text',
      'where brr.vendor_company_id = v_vendor_company_id',
      'ar.work_key = v_work_key',
      'ar.document_key = v_document_key',
    ].forEach((snippet) => {
      expect(migrationSql).toContain(snippet);
    });
  });

  it('guards active AMC vendor relationship/profile, AMC orders, and vendor-visible documents', () => {
    [
      "cr.relationship_type = 'amc_vendor'",
      "cr.status = 'active'",
      "cvp.vendor_status not in ('inactive', 'do_not_use')",
      "coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'",
      "od.status = 'active'",
      "od.visibility_scope = 'vendor'",
      "br.status in ('sent', 'partially_responded', 'closed', 'expired')",
      "brr.status in ('pending', 'sent', 'viewed', 'responded', 'declined', 'selected', 'not_selected', 'expired')",
    ].forEach((snippet) => {
      expect(migrationSql).toContain(snippet);
    });
  });

  it('keeps caller-facing authorization metadata vendor-safe', () => {
    [
      'document_key',
      'category',
      'title',
      'file_name',
      'mime_type',
      'file_size',
      'created_at',
      'vendor_document_unavailable',
    ].forEach((fieldName) => {
      expect(migrationSql).toContain(`'${fieldName}'`);
    });

    const callerFunction = migrationSql.slice(
      migrationSql.indexOf('create or replace function public.rpc_vendor_workspace_authorize_document_access'),
      migrationSql.indexOf('create or replace function public.rpc_vendor_workspace_document_storage_lookup'),
    );

    [
      'storage_bucket',
      'storage_path',
      'order_id',
      'document_id',
      'recipient_id',
      'bid_request_id',
      'relationship_id',
      'vendor_profile_id',
      'client_fee',
      'amc_margin',
      'candidate_snapshot',
      'internal_notes',
    ].forEach((fieldName) => {
      expect(callerFunction).not.toContain(`'${fieldName}'`);
    });
  });

  it('is read-only and avoids owner-side document/procurement APIs', () => {
    expect(migrationSql).not.toContain('insert into public.order_documents');
    expect(migrationSql).not.toContain('update public.order_documents');
    expect(migrationSql).not.toContain('delete from public.order_documents');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('delete from public.orders');
    expect(migrationSql).not.toContain('rpc_order_document_authorize_download');
    expect(migrationSql).not.toContain('rpc_order_documents_list');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_requests_for_order');
  });
});

describe('Vendor Workspace document download Edge function', () => {
  it('uses caller authorization before service-role storage lookup and signed URL creation', () => {
    expect(edgeSource).toContain('rpc_vendor_workspace_authorize_document_access');
    expect(edgeSource).toContain('rpc_vendor_workspace_document_storage_lookup');
    expect(edgeSource.indexOf('rpc_vendor_workspace_authorize_document_access')).toBeLessThan(
      edgeSource.indexOf('rpc_vendor_workspace_document_storage_lookup'),
    );
    expect(edgeSource).toContain('createSignedUrl');
    expect(edgeSource).toContain('SIGNED_URL_TTL_SECONDS');
  });

  it('accepts only opaque work/document keys and returns signed URLs without exposing storage fields', () => {
    expect(edgeSource).toContain('isOpaqueKey(body.work_key)');
    expect(edgeSource).toContain('isOpaqueKey(body.document_key)');
    expect(edgeSource).toContain('signed_url: signed.signedUrl');
    expect(edgeSource).not.toContain('storage_bucket: storage.storage_bucket');
    expect(edgeSource).not.toContain('storage_path: storage.storage_path');
  });
});
