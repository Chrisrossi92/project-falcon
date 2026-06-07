import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260605102000_amc_vendor_workspace_resubmit_report_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace Resubmit Report RPC migration', () => {
  it('creates the authenticated vendor resubmit report RPC returning JSON', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_vendor_workspace_resubmit_report(',
    );
    expect(migrationSql).toContain('p_assignment_work_key text');
    expect(migrationSql).toContain('p_payload jsonb');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain("'ok', true");
    expect(migrationSql).toContain("'status', 'submitted'");
    expect(migrationSql).toContain("'message', 'Report resubmitted.'");
  });

  it('uses security-definer RPC posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_resubmit_report(text, jsonb) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_resubmit_report(text, jsonb) to authenticated, service_role',
    );
  });

  it('requires current company, progress and document upload permissions, opaque key, AMC order, active relationship/profile, and assigned vendor scope', () => {
    [
      'current_app_user_id()',
      'current_company_id()',
      'current_app_user_has_current_company()',
      "current_app_user_has_permission('vendor_assignments.progress')",
      "current_app_user_has_permission('vendor_documents.upload')",
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

  it('allows only revision-requested assignments and validates active vendor report document keys', () => {
    expect(migrationSql).toContain("v_assignment.status <> 'revision_requested'");
    expect(migrationSql).toContain("'Reports can only be resubmitted when a revision has been requested.'");
    expect(migrationSql).toContain("jsonb_array_length(v_document_keys) = 0");
    expect(migrationSql).toContain("'Upload at least one revised report file before resubmitting.'");
    expect(migrationSql).toContain("document_key.value !~ '^[0-9a-f]{64}$'");
    expect(migrationSql).toContain("'Uploaded revised report documents are invalid or unavailable.'");
    expect(migrationSql).toContain('from public.order_documents od');
    expect(migrationSql).toContain("od.category = 'final_report'");
    expect(migrationSql).toContain("od.visibility_scope = 'vendor'");
    expect(migrationSql).toContain("od.status = 'active'");
  });

  it('reuses assignment submission lifecycle and records assignment.resubmitted activity/notification', () => {
    expect(migrationSql).toContain('update public.order_company_assignments');
    expect(migrationSql).toContain("set status = 'submitted'");
    expect(migrationSql).toContain('submitted_at = v_resubmitted_at');
    expect(migrationSql).toContain('submission_payload = v_submission_payload');
    expect(migrationSql).toContain("'resubmission'");
    expect(migrationSql).toContain("'resubmitted_at'");
    expect(migrationSql).toContain('log_order_company_assignment_event');
    expect(migrationSql).toContain('notify_order_company_assignment_event');
    expect(migrationSql).toContain("'assignment.resubmitted'");
  });

  it('does not expose denylisted raw or internal fields in response JSON', () => {
    [
      'assignment_id',
      'order_id',
      'relationship_id',
      'vendor_profile_id',
      'assigned_company_id',
      'owner_company_id',
      'storage_bucket',
      'storage_path',
      'client_fee',
      'amc_margin',
      'internal_notes',
      'candidate_score',
      'score',
    ].forEach((fieldName) => {
      expect(migrationSql).not.toContain(`'${fieldName}'`);
    });
  });

  it('does not call owner APIs, token respond APIs, bid procurement APIs, or mutate orders', () => {
    expect(migrationSql).not.toContain('rpc_order_company_assignment_submit');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_work_invitation_respond');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_offer');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_request_create');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_requests_for_order');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('delete from public.orders');
  });
});
