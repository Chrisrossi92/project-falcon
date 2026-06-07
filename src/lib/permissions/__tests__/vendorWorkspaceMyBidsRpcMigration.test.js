import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260604112000_amc_vendor_workspace_my_bids_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace My Bids RPC migration', () => {
  it('creates the authenticated vendor My Bids RPC returning JSON', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_my_bids()');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain("'ok', true");
    expect(migrationSql).toContain("'items'");
  });

  it('uses security-definer RPC posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_my_bids() from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_my_bids() to authenticated, service_role',
    );
  });

  it('requires app user, current company membership, and vendor bid read permission only', () => {
    expect(migrationSql).toContain('current_app_user_id()');
    expect(migrationSql).toContain('current_company_id()');
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('vendor_bids.read')");
    expect(migrationSql).toContain("raise exception 'vendor_bids_read_permission_required'");

    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('orders\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('vendors\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('bid_requests\./);
    expect(migrationSql).not.toContain('current_app_user_can_read_order');
  });

  it('scopes history rows to current vendor company, AMC orders, and active vendor relationship/profile', () => {
    [
      'where brr.vendor_company_id = v_vendor_company_id',
      "coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'",
      "cr.relationship_type = 'amc_vendor'",
      "cr.status = 'active'",
      "cvp.vendor_status not in ('inactive', 'do_not_use')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('exposes deterministic opaque work keys and requested status classes', () => {
    [
      'extensions.digest',
      "'vendor_available_work_v1'",
      'brr.id::text',
      'brr.vendor_company_id::text',
      "'work_key'",
      "'submitted'",
      "'passed'",
      "'selected'",
      "'not_selected'",
      "'expired'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('returns vendor-safe order, owner, bid, decline, due-date, and selection summary fields', () => {
    [
      "'bid_status'",
      "'selection_outcome'",
      "'submitted_at'",
      "'declined_at'",
      "'expired_at'",
      "'bid_due_at'",
      "'requested_due_date'",
      "'requested_turn_time_days'",
      "'order'",
      "'owner'",
      "'company_name'",
      "'property_address'",
      "'report_type'",
      "'fee_amount'",
      "'currency'",
      "'turn_time_days'",
      "'proposed_due_at'",
      "'comments'",
      "'reason'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('does not expose denylisted raw or internal fields in response JSON', () => {
    [
      'recipient_id',
      'bid_request_id',
      'order_id',
      'vendor_profile_id',
      'relationship_id',
      'response_id',
      'token_hash',
      'token_last_four',
      'token',
      'candidate_snapshot',
      'score',
      'client_fee',
      'amc_margin',
      'internal_notes',
      'storage_bucket',
      'storage_path',
    ].forEach((fieldName) => {
      expect(migrationSql).not.toContain(`'${fieldName}'`);
    });
  });

  it('does not touch owner APIs, public token flows, assignment offers, or order lifecycle', () => {
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_invitation_submit');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_request_create');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_requests_for_order');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_offer');
    expect(migrationSql).not.toContain('update public.order_vendor_bid_request_recipients');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('delete from public.orders');
  });
});
