import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260605101000_amc_vendor_workspace_report_upload_rpcs.sql',
);
const edgePath = resolve(
  repoRoot,
  'supabase/functions/vendor-workspace-report-upload-url/index.ts',
);

const migrationSql = readFileSync(migrationPath, 'utf8');
const edgeSource = readFileSync(edgePath, 'utf8');

describe('Vendor Workspace report upload RPC migration', () => {
  it('creates prepare and register RPCs for assignment-scoped report uploads', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_vendor_workspace_prepare_report_document_upload(',
    );
    expect(migrationSql).toContain(
      'create or replace function public.rpc_vendor_workspace_register_report_document(',
    );
    expect(migrationSql).toContain('p_assignment_work_key text');
    expect(migrationSql).toContain('p_payload jsonb');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain("'ok', true");
    expect(migrationSql).toContain("'document_key'");
  });

  it('requires current company, upload/progress permissions, opaque keys, AMC orders, and active vendor relationship/profile', () => {
    [
      'current_app_user_id()',
      'current_company_id()',
      'current_app_user_has_current_company()',
      "current_app_user_has_permission('vendor_documents.upload')",
      "current_app_user_has_permission('vendor_assignments.progress')",
      "p_assignment_work_key !~ '^[0-9a-f]{64}$'",
      "'vendor_assignment_work_v1'",
      'oca.assigned_company_id = v_vendor_company_id',
      "oca.assignment_type = 'vendor_appraisal'",
      "coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'",
      "v_relationship.relationship_type <> 'amc_vendor'",
      "v_relationship.status <> 'active'",
      "v_profile.vendor_status in ('inactive', 'do_not_use')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('limits uploads to valid report metadata and in-progress assignment states', () => {
    expect(migrationSql).toContain("lower(v_mime_type) <> 'application/pdf'");
    expect(migrationSql).toContain('v_file_size > 52428800');
    expect(migrationSql).toContain("v_document_role not in ('report', 'submitted_report')");
    expect(migrationSql).toContain("v_assignment.status not in ('in_progress', 'revision_requested')");
    expect(migrationSql).toContain("'Report files can only be uploaded for in-progress assignments.'");
    expect(migrationSql).toContain("'Report files can only be registered for in-progress assignments.'");
  });

  it('reuses order_documents with vendor-visible final_report metadata and storage-object validation', () => {
    expect(migrationSql).toContain('insert into public.order_documents');
    expect(migrationSql).toContain("'final_report'");
    expect(migrationSql).toContain("'Submitted Report'");
    expect(migrationSql).toContain("'vendor'");
    expect(migrationSql).toContain("'pending'");
    expect(migrationSql).toContain("set status = 'active'");
    expect(migrationSql).toContain('from storage.objects so');
    expect(migrationSql).toContain('so.name = v_document.storage_path');
    expect(migrationSql).toContain("'Upload the report file before registering it.'");
  });

  it('creates pending report upload metadata that AMC-11B cleanup can expire later', () => {
    const cleanupPath = resolve(
      repoRoot,
      'supabase/migrations/20260605110000_amc_vendor_report_upload_cleanup.sql',
    );
    const cleanupSql = readFileSync(cleanupPath, 'utf8');

    expect(migrationSql).toContain("v_storage_path := format(\n    'vendor-workspace/assignments/%s/reports/%s/%s'");
    expect(migrationSql).toContain("'pending'");
    expect(cleanupSql).toContain('add column if not exists upload_expires_at timestamptz');
    expect(cleanupSql).toContain("NEW.upload_expires_at := NEW.created_at + interval '24 hours'");
    expect(cleanupSql).toContain("od.storage_path like 'vendor-workspace/assignments/%'");
  });

  it('keeps client-facing responses vendor-safe and leaves storage signing to the Edge function', () => {
    expect(edgeSource).toContain('vendor-workspace-report-upload-url');
    expect(edgeSource).toContain('rpc_vendor_workspace_prepare_report_document_upload');
    expect(edgeSource).toContain('.createSignedUploadUrl(');
    expect(edgeSource).toContain('signed_url: signed.signedUrl');
    expect(edgeSource).not.toContain('bucket: prepared.upload.storage_bucket');
    expect(edgeSource).not.toContain('path: prepared.upload.storage_path');
    expect(edgeSource).not.toContain('order_id:');
    expect(edgeSource).not.toContain('assignment_id:');
  });

  it('does not call owner-side document, order, assignment, token, or procurement APIs', () => {
    expect(migrationSql).not.toContain('rpc_order_document_prepare_upload');
    expect(migrationSql).not.toContain('rpc_order_document_finalize_upload');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_offer');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_work_invitation_respond');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_request_create');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('delete from public.orders');
  });
});
