import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260605114000_amc_vendor_workspace_payments_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace payments RPC migration', () => {
  it('seeds a read-only vendor payments permission and grants it to Vendor Admin only', () => {
    [
      "'vendor_payments.read'",
      "'vendor_payments'",
      "'Read vendor payments'",
      "lower(r.name) = lower('Vendor Admin')",
      "on conflict (role_id, permission_key) do nothing",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    expect(migrationSql).not.toContain("('Owner', 'vendor_payments.read')");
    expect(migrationSql).not.toContain("('Admin', 'vendor_payments.read')");
  });

  it('creates the authenticated vendor payments RPC returning JSON', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_payments()');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain("'ok', true");
    expect(migrationSql).toContain("'items'");
  });

  it('uses security-definer RPC posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_payments() from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_payments() to authenticated, service_role',
    );
  });

  it('requires app user, current company membership, and vendor payment read permission only', () => {
    [
      'current_app_user_id()',
      'current_company_id()',
      'current_app_user_has_current_company()',
      "current_app_user_has_permission('vendor_payments.read')",
      "raise exception 'vendor_payments_read_permission_required'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('orders\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('vendors\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('bid_requests\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('order_company_assignments\./);
    expect(migrationSql).not.toContain('current_app_user_can_read_order');
  });

  it('scopes payment rows to current vendor company, AMC orders, active vendor relationship/profile, and vendor assignments', () => {
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

  it('exposes opaque payment and assignment keys plus vendor-safe payment status fields', () => {
    [
      'extensions.digest',
      "'vendor_assignment_work_v1'",
      "'vendor_payment_v1'",
      "'payment_key'",
      "'assignment_work_key'",
      "'vendor_fee_amount'",
      "'invoice_status'",
      "'payment_status'",
      "'payment_status_key'",
      "'payment_date'",
      "'payment_reference_label'",
      "'next_action_label'",
      "'Ready for Invoice'",
      "'Invoice Received'",
      "'Scheduled'",
      "'Paid'",
      "'On Hold'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('does not expose raw ids, owner financial internals, or mutation behavior', () => {
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
    ].forEach((fieldName) => {
      expect(migrationSql).not.toContain(`'${fieldName}'`);
    });

    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('insert into public.order_documents');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_request');
  });
});
