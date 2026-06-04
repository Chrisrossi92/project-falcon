import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260604103000_amc_vendor_workspace_dashboard_summary_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace dashboard summary RPC migration', () => {
  it('creates the authenticated vendor dashboard summary RPC with JSON response shape', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_vendor_workspace_dashboard_summary()',
    );
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain("'ok', true");
    expect(migrationSql).toContain("'counts'");
    expect(migrationSql).toContain("'actions'");
    [
      'available_work',
      'pending_bids',
      'assignment_offers',
      'active_assigned_orders',
      'submitted_awaiting_review',
      'needs_attention',
    ].forEach((countKey) => {
      expect(migrationSql).toContain(`'${countKey}'`);
    });
  });

  it('uses security-definer RPC posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_dashboard_summary() from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_dashboard_summary() to authenticated, service_role',
    );
  });

  it('requires app user, current company membership, and vendor workspace permission only', () => {
    expect(migrationSql).toContain('current_app_user_id()');
    expect(migrationSql).toContain('current_company_id()');
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('vendor_workspace.view')");
    expect(migrationSql).toContain("raise exception 'vendor_workspace_view_permission_required'");

    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('orders\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('vendors\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('bid_requests\./);
    expect(migrationSql).not.toContain('current_app_user_can_read_order');
  });

  it('scopes bid rows to the current vendor company and assignment rows to assigned company', () => {
    expect(migrationSql).toContain(
      'where brr.vendor_company_id = v_vendor_company_id',
    );
    expect(migrationSql).toContain(
      'where oca.assigned_company_id = v_vendor_company_id',
    );
    expect(migrationSql).toContain("oca.assignment_type = 'vendor_appraisal'");
    expect(migrationSql).toContain("cr.relationship_type = 'amc_vendor'");
    expect(migrationSql).toContain("cr.status = 'active'");
  });

  it('filters all dashboard rows to AMC-scoped orders', () => {
    const amcScopeFilterCount = (
      migrationSql.match(/coalesce\(o\.operations_scope, 'internal_operations'\) = 'amc_operations'/g) ?? []
    ).length;

    expect(amcScopeFilterCount).toBeGreaterThanOrEqual(4);
    expect(migrationSql).toContain(
      'and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id',
    );
  });

  it('implements the approved count definitions and due-soon window', () => {
    expect(migrationSql).toContain("br.status in ('sent', 'partially_responded')");
    expect(migrationSql).toContain("brr.status in ('pending', 'sent', 'viewed')");
    expect(migrationSql).toContain('response.submitted_at is null');
    expect(migrationSql).toContain('response_submitted_at is not null');
    expect(migrationSql).toContain("recipient_status = 'responded'");
    expect(migrationSql).toContain("request_status not in ('cancelled', 'expired')");
    expect(migrationSql).toContain("status in ('accepted', 'in_progress')");
    expect(migrationSql).toContain("status = 'submitted'");
    expect(migrationSql).toContain("status = 'accepted' and started_at is null");
    expect(migrationSql).toContain("v_due_soon_window interval := interval '48 hours'");
  });

  it('returns only capped safe action summary fields', () => {
    expect(migrationSql).toContain('limit 8');
    [
      'kind',
      'priority',
      'label',
      'due_at',
      'order',
      'owner',
      'order_number',
      'property_address',
      'city',
      'state',
      'postal_code',
      'county',
      'property_type',
      'report_type',
      'company_name',
    ].forEach((fieldName) => {
      expect(migrationSql).toContain(`'${fieldName}'`);
    });
  });

  it('does not expose denylisted raw or internal fields in the JSON payload', () => {
    [
      'order_id',
      'relationship_id',
      'vendor_profile_id',
      'bid_request_id',
      'recipient_id',
      'response_id',
      'terms',
      'handoff_payload',
      'submission_payload',
      'candidate_snapshot',
      'internal_notes',
      'client_fee',
      'amc_margin',
    ].forEach((fieldName) => {
      expect(migrationSql).not.toContain(`'${fieldName}'`);
    });
  });

  it('is read-only and does not touch frontend routes, nav, wrappers, or token flows', () => {
    expect(migrationSql).not.toContain('insert into public.order_vendor_bid');
    expect(migrationSql).not.toContain('update public.order_vendor_bid');
    expect(migrationSql).not.toContain('delete from public.order_vendor_bid');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('delete from public.order_company_assignments');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('delete from public.orders');
    expect(migrationSql).not.toMatch(/path\s*=\s*'\/vendor-workspace/i);
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_invitation');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_invitation');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_work_invitation');
    expect(migrationSql).toContain('without mutating bids, assignments, orders, public token flows');
  });
});
