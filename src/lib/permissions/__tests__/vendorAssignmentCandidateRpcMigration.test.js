import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260601140000_amc_vendor_assignment_candidate_rpcs.sql',
);
const productMappingPatchPath = resolve(
  repoRoot,
  'supabase/migrations/20260601141000_amc_vendor_candidate_product_mapping_fix.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');
const productMappingPatchSql = readFileSync(productMappingPatchPath, 'utf8');

const helperFunctions = Object.freeze([
  'amc_candidate_normalized_text',
  'amc_candidate_normalized_state',
  'amc_candidate_normalized_zip',
  'amc_candidate_normalized_county',
  'amc_candidate_normalized_market',
  'amc_candidate_normalized_product_slug',
  'amc_candidate_order_product_slugs',
]);

const returnFields = Object.freeze([
  'vendor_profile_id uuid',
  'vendor_company_id uuid',
  'vendor_company_name text',
  'vendor_status text',
  'relationship_id uuid',
  'relationship_status text',
  'match_score integer',
  'match_reasons jsonb',
  'coverage_matches jsonb',
  'primary_contact jsonb',
  'warning_flags jsonb',
]);

describe('AMC vendor assignment candidate RPC migration', () => {
  it('creates the approved normalization helpers and candidate RPC', () => {
    helperFunctions.forEach((helperName) => {
      expect(migrationSql).toContain(`create or replace function public.${helperName}`);
      expect(migrationSql).toContain(`revoke all on function public.${helperName}`);
    });

    expect(migrationSql).toContain('create or replace function public.rpc_vendor_assignment_candidates');
    expect(migrationSql).toContain('grant execute on function public.rpc_vendor_assignment_candidates(uuid) to authenticated, service_role');
  });

  it('returns the approved candidate shape', () => {
    returnFields.forEach((field) => {
      expect(migrationSql).toContain(field);
    });

    expect(migrationSql).toContain('match_reasons');
    expect(migrationSql).toContain('coverage_matches');
    expect(migrationSql).toContain('primary_contact');
    expect(migrationSql).toContain('warning_flags');
  });

  it('uses vendor read and current-company order read authorization', () => {
    expect(migrationSql).toContain("current_app_user_has_permission('vendors.read')");
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain('current_app_user_can_read_order(p_order_id)');
    expect(migrationSql).not.toContain('operations_mode');
    expect(migrationSql).not.toContain('company_type');
    expect(migrationSql).not.toContain('product_mode');
  });

  it('requires active amc vendor relationships and excludes inactive vendors', () => {
    expect(migrationSql).toContain("cr.relationship_type = 'amc_vendor'");
    expect(migrationSql).toContain("cr.status = 'active'");
    expect(migrationSql).toContain("cvp.vendor_status not in ('inactive', 'do_not_use')");
  });

  it('keeps candidate matching read-only and out of assignment/order writes', () => {
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('orders.appraiser_id');
    expect(migrationSql).not.toContain('orders.reviewer_id');
    expect(migrationSql).not.toContain('orders.assigned_to');
    expect(migrationSql).not.toContain('create table');
    expect(migrationSql).not.toContain('alter table');
  });

  it('documents conservative matching limits', () => {
    expect(migrationSql).toContain('no geocoding or radius distance math');
    expect(migrationSql).toContain('exact geography matching');
    expect(migrationSql).toContain('exact product slug matching');
  });

  it('patches order product mapping without changing write behavior', () => {
    expect(productMappingPatchSql).toContain(
      'create or replace function public.amc_candidate_order_product_slugs',
    );
    expect(productMappingPatchSql).toContain("when 'commercial' then 'commercial'");
    expect(productMappingPatchSql).toContain(
      "when 'short_term_rental' then 'short_term_rental'",
    );
    expect(productMappingPatchSql).toContain(
      "if v_report_key in ('appraisal', 'narrative', 'narrative_appraisal', 'form', 'form_appraisal')",
    );
    expect(productMappingPatchSql).toContain(
      'revoke all on function public.amc_candidate_order_product_slugs(text, text) from public, anon, authenticated',
    );
    expect(productMappingPatchSql).not.toContain('insert into public.order_company_assignments');
    expect(productMappingPatchSql).not.toContain('update public.order_company_assignments');
    expect(productMappingPatchSql).not.toContain('insert into public.orders');
    expect(productMappingPatchSql).not.toContain('update public.orders');
    expect(productMappingPatchSql).not.toContain('create table');
    expect(productMappingPatchSql).not.toContain('alter table');
  });
});
