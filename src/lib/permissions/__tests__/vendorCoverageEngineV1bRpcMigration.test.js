import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260621104000_vendor_coverage_engine_v1b_rpcs.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Coverage Engine V1B RPC migration', () => {
  it('creates the read and save coverage RPCs', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_get_vendor_coverage');
    expect(migrationSql).toContain('create or replace function public.rpc_save_vendor_coverage');
    expect(migrationSql).toContain('grant execute on function public.rpc_get_vendor_coverage(uuid) to authenticated, service_role');
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_save_vendor_coverage(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated, service_role',
    );
  });

  it('uses Vendor Directory visibility and coverage management permissions', () => {
    expect(migrationSql).toContain("'vendors.read'");
    expect(migrationSql).toContain("'vendor_directory_vendors_read_permission_required'");
    expect(migrationSql).toContain("'vendors.service_areas.manage'");
    expect(migrationSql).toContain("'vendor_service_areas_manage_permission_required'");
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain('cvp.owner_company_id = v_company_id');
    expect(migrationSql).toContain('vendor_profile_not_found_or_not_authorized');
  });

  it('keeps normalized coverage tables locked down from direct app grants', () => {
    [
      'vendor_coverage_states',
      'vendor_coverage_counties',
      'vendor_property_types',
      'vendor_assignment_types',
    ].forEach((tableName) => {
      expect(migrationSql).not.toContain(`grant select on table public.${tableName} to authenticated`);
      expect(migrationSql).not.toContain(`grant insert on table public.${tableName} to authenticated`);
      expect(migrationSql).not.toContain(`grant update on table public.${tableName} to authenticated`);
      expect(migrationSql).not.toContain(`grant delete on table public.${tableName} to authenticated`);
    });
  });

  it('validates and normalizes state, county, property, and assignment payloads', () => {
    expect(migrationSql).toContain('amc_vendor_coverage_normalized_state');
    expect(migrationSql).toContain("upper(public.amc_vendor_normalized_text(p_value)) ~ '^[A-Z]{2}$'");
    expect(migrationSql).toContain('amc_vendor_coverage_normalized_county');
    expect(migrationSql).toContain('vendor_coverage_state_invalid');
    expect(migrationSql).toContain('vendor_coverage_county_invalid');
    expect(migrationSql).toContain('vendor_property_type_invalid');
    expect(migrationSql).toContain('vendor_assignment_type_invalid');
    expect(migrationSql).toContain("'commercial'");
    expect(migrationSql).toContain("'residential'");
    expect(migrationSql).toContain("'appraisal'");
    expect(migrationSql).toContain("'evaluation'");
  });

  it('atomically replaces coverage rows for one vendor profile and returns normalized coverage', () => {
    expect(migrationSql).toContain('delete from public.vendor_coverage_states');
    expect(migrationSql).toContain('delete from public.vendor_coverage_counties');
    expect(migrationSql).toContain('delete from public.vendor_property_types');
    expect(migrationSql).toContain('delete from public.vendor_assignment_types');
    expect(migrationSql).toContain('where vendor_profile_id = v_profile.vendor_profile_id');
    expect(migrationSql).toContain('select distinct');
    expect(migrationSql).toContain('return public.amc_vendor_coverage_payload(v_profile.vendor_profile_id)');
  });

  it('does not add matching, recommendation, bid, assignment, or legacy service-area mutations', () => {
    expect(migrationSql).not.toContain('rpc_vendor_assignment_candidates');
    expect(migrationSql).not.toContain('order_vendor_bid_requests');
    expect(migrationSql).not.toContain('order_vendor_bid_request_recipients');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('insert into public.vendor_service_areas');
    expect(migrationSql).not.toContain('update public.vendor_service_areas');
    expect(migrationSql).not.toContain('delete from public.vendor_service_areas');
  });
});
