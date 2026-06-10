import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260610180000_amc_vendor_report_owner_download_alignment.sql',
);
const edgePath = resolve(repoRoot, 'supabase/functions/order-document-download-url/index.ts');

const migrationSql = readFileSync(migrationPath, 'utf8');
const edgeSource = readFileSync(edgePath, 'utf8');

describe('AMC vendor report owner download alignment migration', () => {
  it('keeps owner-company download authorization scoped to AMC vendor final reports', () => {
    [
      'create or replace function public.rpc_order_document_authorize_download',
      "v_document.visibility_scope = 'vendor'",
      "v_document.category = 'final_report'",
      "coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'",
      "oca.assignment_type = 'vendor_appraisal'",
      "oca.status in ('accepted', 'in_progress', 'submitted', 'revision_requested', 'completed')",
      "current_app_user_has_permission('documents.read.assigned')",
      'public.current_app_user_can_read_order(v_document.order_id)',
    ].forEach((snippet) => {
      expect(migrationSql).toContain(snippet);
    });
  });

  it('preserves existing order document authorization and metadata shape', () => {
    expect(migrationSql).toContain('current_app_user_can_read_order_document_row');
    expect(migrationSql).toContain('returns table (');
    expect(migrationSql).toContain('visibility_scope text');
    expect(migrationSql).not.toContain('storage_bucket text');
    expect(migrationSql).not.toContain('storage_path text');
  });

  it('includes active AMC vendor final reports in the order document list without exposing storage fields', () => {
    [
      'create or replace function public.rpc_order_documents_list',
      "od.visibility_scope = 'vendor'",
      "od.category = 'final_report'",
      "coalesce(v_order.operations_scope, 'internal_operations') = 'amc_operations'",
      "oca.assignment_type = 'vendor_appraisal'",
    ].forEach((snippet) => {
      expect(migrationSql).toContain(snippet);
    });

    const listFunction = migrationSql.slice(
      migrationSql.indexOf('create or replace function public.rpc_order_documents_list'),
      migrationSql.indexOf('grant execute on function public.rpc_order_document_authorize_download'),
    );

    expect(listFunction).not.toContain('storage_bucket');
    expect(listFunction).not.toContain('storage_path');
  });
});

describe('Order document download Edge function diagnostics', () => {
  it('checks caller authorization before storage lookup and signed URL creation', () => {
    expect(edgeSource.indexOf('rpc_order_document_authorize_download')).toBeLessThan(
      edgeSource.indexOf('.schema("storage")'),
    );
    expect(edgeSource.indexOf('.schema("storage")')).toBeLessThan(
      edgeSource.indexOf('createSignedUrl'),
    );
  });

  it('returns structured safe errors for authorization and missing storage objects', () => {
    [
      'authorization_failed',
      'storage_object_missing',
      '"The uploaded file is missing from storage."',
      'storage_bucket_present',
      'storage_path_present',
    ].forEach((snippet) => {
      expect(edgeSource).toContain(snippet);
    });

    expect(edgeSource).toContain('return jsonResponse(req, { ok: false, code, message }, status)');
    expect(edgeSource).not.toContain('storage_path: documentRow.storage_path');
    expect(edgeSource).not.toContain('storage_bucket: documentRow.storage_bucket');
  });

  it('keeps CORS and POST contract compatible with frontend invoke', () => {
    [
      '"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"',
      '"Access-Control-Allow-Methods": "POST, OPTIONS"',
      'if (req.method === "OPTIONS")',
      'document_id?: unknown',
      'isUuid(body.document_id)',
    ].forEach((snippet) => {
      expect(edgeSource).toContain(snippet);
    });
  });
});
