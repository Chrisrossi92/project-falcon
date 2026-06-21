import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260621103000_vendor_coverage_engine_v1a.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

const coverageTables = Object.freeze([
  'vendor_coverage_states',
  'vendor_coverage_counties',
  'vendor_property_types',
  'vendor_assignment_types',
]);

describe('Vendor Coverage Engine V1A migration', () => {
  it('creates normalized coverage tables for geography, property types, and assignment types', () => {
    coverageTables.forEach((tableName) => {
      expect(migrationSql).toContain(`create table if not exists public.${tableName}`);
      expect(migrationSql).toContain(`${tableName}_profile_company_fkey`);
      expect(migrationSql).toContain(`alter table public.${tableName} enable row level security`);
      expect(migrationSql).toContain(`grant all privileges on table public.${tableName} to service_role`);
      expect(migrationSql).toContain(`revoke all privileges on table public.${tableName} from public, anon, authenticated`);
    });
  });

  it('ties each coverage row to an owner-scoped vendor profile and matching vendor company', () => {
    expect(migrationSql).toContain('company_vendor_profiles_id_vendor_company_unique');
    expect(migrationSql).toContain('foreign key (vendor_profile_id, company_id)');
    expect(migrationSql).toContain('references public.company_vendor_profiles(id, vendor_company_id)');
    expect(migrationSql).toContain('on delete cascade');
  });

  it('prevents duplicate coverage values per vendor profile', () => {
    expect(migrationSql).toContain('vendor_coverage_states_profile_state_unique');
    expect(migrationSql).toContain('vendor_coverage_counties_profile_state_county_unique');
    expect(migrationSql).toContain('lower(btrim(county_name))');
    expect(migrationSql).toContain('vendor_property_types_profile_type_unique');
    expect(migrationSql).toContain('vendor_assignment_types_profile_type_unique');
  });

  it('limits values to the approved V1A vocabularies', () => {
    [
      'commercial',
      'industrial',
      'retail',
      'office',
      'multifamily',
      'agricultural',
      'land',
      'residential',
      'appraisal',
      'review',
      'desktop',
      'restricted',
      'evaluation',
    ].forEach((value) => {
      expect(migrationSql).toContain(`'${value}'`);
    });

    expect(migrationSql).toContain("vendor_status in ('active', 'inactive', 'pending', 'preferred', 'do_not_use', 'probation', 'suspended')");
    expect(migrationSql).toContain("state_code = upper(state_code) and state_code ~ '^[A-Z]{2}$'");
    expect(migrationSql).toContain("check (btrim(county_name) <> '')");
  });

  it('adds future matching indexes without creating matching logic or bid automation', () => {
    [
      'idx_vendor_coverage_states_company_state',
      'idx_vendor_coverage_counties_company_state_county',
      'idx_vendor_property_types_company_type',
      'idx_vendor_assignment_types_company_type',
    ].forEach((indexName) => {
      expect(migrationSql).toContain(indexName);
    });

    expect(migrationSql).not.toContain('rpc_vendor_assignment_candidates');
    expect(migrationSql).not.toContain('order_vendor_bid_requests');
    expect(migrationSql).not.toContain('order_vendor_bid_request_recipients');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.orders');
  });
});
