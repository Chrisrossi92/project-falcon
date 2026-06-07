import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260605104000_amc_vendor_workspace_execution_closeout_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace execution closeout RPC migration', () => {
  it('replaces the dashboard summary RPC without schema/table churn', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_dashboard_summary()');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).not.toContain('create table');
    expect(migrationSql).not.toContain('alter table');
    expect(migrationSql).not.toContain('drop table');
  });

  it('preserves authenticated vendor workspace scope and AMC assignment guardrails', () => {
    [
      'current_app_user_id()',
      'current_company_id()',
      'current_app_user_has_current_company()',
      "current_app_user_has_permission('vendor_workspace.view')",
      'where oca.assigned_company_id = v_vendor_company_id',
      "oca.assignment_type = 'vendor_appraisal'",
      "cr.relationship_type = 'amc_vendor'",
      "cr.status = 'active'",
      "coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('counts revision-requested assigned work as active and needs attention', () => {
    expect(migrationSql).toContain("oca.status in ('offered', 'accepted', 'in_progress', 'submitted', 'revision_requested')");
    expect(migrationSql).toContain("status in ('accepted', 'in_progress', 'revision_requested')");
    expect(migrationSql).toContain("from vendor_assignment_rows where status = 'revision_requested'");
    expect(migrationSql).toContain("'revision_request'");
    expect(migrationSql).toContain("'Respond to revision request'");
  });

  it('preserves safe dashboard response fields and denies internal data exposure', () => {
    [
      "'available_work'",
      "'pending_bids'",
      "'assignment_offers'",
      "'active_assigned_orders'",
      "'submitted_awaiting_review'",
      "'needs_attention'",
      "'actions'",
      "'order'",
      "'owner'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    [
      'storage_path',
      'storage_bucket',
      'client_fee',
      'amc_margin',
      'internal_notes',
      'candidate_score',
    ].forEach((denylisted) => {
      expect(migrationSql).not.toContain(denylisted);
    });
  });
});
