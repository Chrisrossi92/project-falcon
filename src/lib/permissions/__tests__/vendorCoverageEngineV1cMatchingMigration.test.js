import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260621105000_vendor_coverage_engine_v1c_matching_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Coverage Engine V1C matching migration', () => {
  it('creates the deterministic matching RPC and grants execute only through RPC access', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_get_matching_vendors_for_order');
    expect(migrationSql).toContain('grant execute on function public.rpc_get_matching_vendors_for_order(uuid) to authenticated, service_role');
    expect(migrationSql).toContain('revoke all on function public.rpc_get_matching_vendors_for_order(uuid) from public, anon');
  });

  it('enforces current company, readable order, and Vendor Directory read permission', () => {
    expect(migrationSql).toContain('current_app_user_id()');
    expect(migrationSql).toContain('current_company_id()');
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('vendors.read')");
    expect(migrationSql).toContain('vendor_directory_vendors_read_permission_required');
    expect(migrationSql).toContain('current_app_user_can_read_order(p_order_id)');
    expect(migrationSql).toContain('order_not_found_or_not_authorized');
  });

  it('uses normalized V1A coverage tables and exact dimension joins', () => {
    expect(migrationSql).toContain('join public.vendor_coverage_states vcs');
    expect(migrationSql).toContain('join public.vendor_coverage_counties vcc');
    expect(migrationSql).toContain('join public.vendor_property_types vpt');
    expect(migrationSql).toContain('join public.vendor_assignment_types vat');
    expect(migrationSql).toContain('vcs.state_code = v_order_state');
    expect(migrationSql).toContain('vcc.state_code = v_order_state');
    expect(migrationSql).toContain('lower(btrim(vcc.county_name)) = lower(btrim(v_order_county))');
    expect(migrationSql).toContain('vpt.property_type = v_order_property_type');
    expect(migrationSql).toContain('vat.assignment_type = v_order_assignment_type');
  });

  it('includes exact active matches and excludes inactive, suspended, mismatched, and incomplete vendors', () => {
    expect(migrationSql).toContain("cvp.vendor_status = 'active'");
    expect(migrationSql).not.toContain("cvp.vendor_status in ('active'");
    expect(migrationSql).not.toContain("cvp.vendor_status not in ('inactive'");
    expect(migrationSql).toContain('vc.status = \'active\'');
    expect(migrationSql).toContain('if v_order_state is null');
    expect(migrationSql).toContain('or v_order_county is null');
    expect(migrationSql).toContain('or v_order_property_type is null');
    expect(migrationSql).toContain('or v_order_assignment_type is null');
  });

  it('returns only eligible vendor identity and matched dimensions in deterministic order', () => {
    [
      'vendor_profile_id uuid',
      'company_id uuid',
      'company_name text',
      'matched_state text',
      'matched_county text',
      'matched_property_type text',
      'matched_assignment_type text',
    ].forEach((returnField) => {
      expect(migrationSql).toContain(returnField);
    });
    expect(migrationSql).toContain('order by vc.name asc, cvp.id asc');
  });

  it('does not add recommendations, scoring, procurement, bid, assignment, or order mutations', () => {
    expect(migrationSql).not.toContain('match_score');
    expect(migrationSql).not.toContain('recommendation_score');
    expect(migrationSql).not.toContain('insert into public.vendor_recommendations');
    expect(migrationSql).not.toContain('order_vendor_bid_requests');
    expect(migrationSql).not.toContain('order_vendor_bid_request_recipients');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('insert into public.orders');
  });
});
