import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260605103000_amc_request_vendor_assignment_revision_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC request vendor assignment revision RPC migration', () => {
  it('creates the coordinator revision request RPC returning safe JSON', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_amc_request_vendor_assignment_revision(',
    );
    expect(migrationSql).toContain('p_assignment_id uuid');
    expect(migrationSql).toContain('p_payload jsonb');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain("'ok', true");
    expect(migrationSql).toContain("'status', 'revision_requested'");
    expect(migrationSql).toContain("'message', 'Revision requested.'");
  });

  it('uses security-definer RPC posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_amc_request_vendor_assignment_revision(uuid, jsonb) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_amc_request_vendor_assignment_revision(uuid, jsonb) to authenticated, service_role',
    );
  });

  it('requires owner company scope, complete permission, AMC order scope, and active AMC vendor relationship/profile', () => {
    [
      'current_app_user_id()',
      'current_company_id()',
      'current_app_user_has_current_company()',
      "current_app_user_has_permission('order_company_assignments.complete')",
      'v_assignment.owner_company_id <> v_company_id',
      "v_assignment.assignment_type <> 'vendor_appraisal'",
      "coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'",
      'current_app_user_can_read_order(v_order.id)',
      'current_app_user_can_update_order_row(',
      "v_relationship.relationship_type <> 'amc_vendor'",
      "v_relationship.status <> 'active'",
      "v_profile.vendor_status in ('inactive', 'do_not_use')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('allows only submitted assignments and validates vendor-facing revision instructions/due date', () => {
    expect(migrationSql).toContain("v_assignment.status <> 'submitted'");
    expect(migrationSql).toContain("'assignment_revision_invalid_state'");
    expect(migrationSql).toContain("'revision_instructions', 'Add vendor-facing revision instructions.'");
    expect(migrationSql).toContain("'revision_due_at', 'Revision due date is invalid.'");
  });

  it('persists revision_requested in the existing assignment lifecycle while preserving prior submission metadata', () => {
    expect(migrationSql).toContain('drop constraint order_company_assignments_status_valid');
    expect(migrationSql).toContain("'revision_requested'");
    expect(migrationSql).toContain('v_prior_submission := coalesce(v_assignment.submission_payload');
    expect(migrationSql).toContain("'prior_submission', v_prior_submission");
    expect(migrationSql).toContain('update public.order_company_assignments');
    expect(migrationSql).toContain("set status = 'revision_requested'");
    expect(migrationSql).toContain('review_due_at = coalesce(v_due_at, review_due_at)');
    expect(migrationSql).toContain('submission_payload = v_submission_payload');
    expect(migrationSql).not.toContain('update public.orders');
  });

  it('logs and notifies revision requests without accepting internal notes into the shared payload path', () => {
    expect(migrationSql).toContain('log_order_company_assignment_event');
    expect(migrationSql).toContain('notify_order_company_assignment_event');
    expect(migrationSql).toContain("'assignment.revision_requested'");
    expect(migrationSql).toContain('does not accept or store internal notes');
    expect(migrationSql).not.toContain("'internal_note'");
    expect(migrationSql).not.toContain('v_internal_note');
  });

  it('adds owner-side revision summary fields without exposing assignment payload JSON in list responses', () => {
    expect(migrationSql).toContain('drop function if exists public.rpc_order_company_assignment_list_for_order(uuid)');
    expect(migrationSql).toContain('revision_summary text');
    expect(migrationSql).toContain('revision_requested_at timestamptz');
    expect(migrationSql).toContain('revision_due_at timestamptz');
    expect(migrationSql).toContain("oca.submission_payload #>> '{revision,summary}'");
    expect(migrationSql).toContain('does not expose assignment payload JSON');
  });
});
