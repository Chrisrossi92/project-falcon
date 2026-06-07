import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260604117000_amc_vendor_workspace_submit_report_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace Submit Report RPC migration', () => {
  it('creates the authenticated vendor submit report RPC returning JSON', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_vendor_workspace_submit_report(',
    );
    expect(migrationSql).toContain('p_assignment_work_key text');
    expect(migrationSql).toContain('p_payload jsonb');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain("'ok', true");
    expect(migrationSql).toContain("'status', 'submitted'");
    expect(migrationSql).toContain("'message', 'Report submitted.'");
  });

  it('uses security-definer RPC posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_submit_report(text, jsonb) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_submit_report(text, jsonb) to authenticated, service_role',
    );
  });

  it('requires app user, current company membership, and vendor assignment progress permission only', () => {
    expect(migrationSql).toContain('current_app_user_id()');
    expect(migrationSql).toContain('current_company_id()');
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('vendor_assignments.progress')");
    expect(migrationSql).toContain("raise exception 'vendor_assignments_progress_permission_required'");

    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('orders\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('vendors\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('bid_requests\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('order_company_assignments\./);
    expect(migrationSql).not.toContain('current_app_user_can_read_order');
  });

  it('scopes submission to current vendor company, opaque key, AMC orders, active vendor relationship/profile, and vendor assignments', () => {
    [
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

  it('allows only in-progress or revision-requested assignment states and rejects not-started/submitted states', () => {
    expect(migrationSql).toContain("v_assignment.status not in ('in_progress', 'revision_requested')");
    expect(migrationSql).toContain("'report_submission_invalid'");
    expect(migrationSql).toContain("'Only in-progress assignments can be submitted.'");
  });

  it('validates vendor-safe payload shape and opaque document references', () => {
    expect(migrationSql).toContain("jsonb_typeof(v_payload) <> 'object'");
    expect(migrationSql).toContain("v_payload ? 'document_keys'");
    expect(migrationSql).toContain("jsonb_typeof(v_payload -> 'document_keys') <> 'array'");
    expect(migrationSql).toContain("document_key.value !~ '^[0-9a-f]{64}$'");
    expect(migrationSql).toContain("'Document references are invalid.'");
    expect(migrationSql).toContain("jsonb_array_length(v_document_keys) = 0");
    expect(migrationSql).toContain("'Upload at least one report file before submitting.'");
    expect(migrationSql).toContain("'Uploaded report documents are invalid or unavailable.'");
    expect(migrationSql).toContain('from public.order_documents od');
    expect(migrationSql).toContain("od.category = 'final_report'");
    expect(migrationSql).toContain("od.visibility_scope = 'vendor'");
    expect(migrationSql).toContain("od.status = 'active'");
  });

  it('reuses assignment lifecycle submission and assignment.submitted activity/notification helpers', () => {
    expect(migrationSql).toContain('update public.order_company_assignments');
    expect(migrationSql).toContain("set status = 'submitted'");
    expect(migrationSql).toContain('submitted_at = v_submitted_at');
    expect(migrationSql).toContain('submission_payload = v_submission_payload');
    expect(migrationSql).toContain('log_order_company_assignment_event');
    expect(migrationSql).toContain('notify_order_company_assignment_event');
    expect(migrationSql).toContain("'assignment.submitted'");
    expect(migrationSql).toContain("'responded_via', 'vendor_workspace'");
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
