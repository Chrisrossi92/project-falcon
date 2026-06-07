import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260604114000_amc_vendor_workspace_assigned_orders_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace Assigned Orders RPC migration', () => {
  it('creates the authenticated vendor assigned orders RPC returning JSON', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_assigned_orders()');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain("'ok', true");
    expect(migrationSql).toContain("'items'");
  });

  it('uses security-definer RPC posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_assigned_orders() from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_assigned_orders() to authenticated, service_role',
    );
  });

  it('requires app user, current company membership, and vendor assignment read permission only', () => {
    expect(migrationSql).toContain('current_app_user_id()');
    expect(migrationSql).toContain('current_company_id()');
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('vendor_assignments.read')");
    expect(migrationSql).toContain("raise exception 'vendor_assignments_read_permission_required'");

    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('orders\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('vendors\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('bid_requests\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('order_company_assignments\./);
    expect(migrationSql).not.toContain('current_app_user_can_read_order');
  });

  it('scopes assigned order rows to current vendor company, AMC orders, active vendor relationship/profile, and vendor assignments', () => {
    [
      'where oca.assigned_company_id = v_vendor_company_id',
      "oca.assignment_type = 'vendor_appraisal'",
      "coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'",
      "cr.relationship_type = 'amc_vendor'",
      "cr.status = 'active'",
      "cvp.vendor_status not in ('inactive', 'do_not_use')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('exposes deterministic opaque assignment work keys and vendor assignment statuses', () => {
    [
      'extensions.digest',
      "'vendor_assignment_work_v1'",
      'oca.id::text',
      'oca.assigned_company_id::text',
      "'assignment_work_key'",
      "'accepted_not_started'",
      "'in_progress'",
      "'inspection_scheduled'",
      "'report_submitted'",
      "'awaiting_review'",
      "'revision_requested'",
      "'completed_closed'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('returns vendor-safe order, owner, status, dates, attention, and next-action fields', () => {
    [
      "'work_key'",
      "'assignment_status'",
      "'status_label'",
      "'accepted_at'",
      "'due_at'",
      "'inspection_status'",
      "'report_submitted'",
      "'next_action_label'",
      "'needs_attention'",
      "'order'",
      "'owner'",
      "'company_name'",
      "'property_address'",
      "'report_type'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
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

  it('does not touch owner APIs, public token flows, bid procurement APIs, or order lifecycle', () => {
    expect(migrationSql).not.toContain('rpc_order_company_assignment_work_invitation_read');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_work_invitation_respond');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_offer');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_request_create');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_requests_for_order');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('delete from public.orders');
  });
});
