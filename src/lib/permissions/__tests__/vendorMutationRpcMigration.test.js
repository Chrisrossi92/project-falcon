import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260601130000_amc_vendor_directory_mutation_rpcs.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

const publicMutationRpcs = Object.freeze([
  'rpc_vendor_profile_create',
  'rpc_vendor_profile_update',
  'rpc_vendor_contact_create',
  'rpc_vendor_contact_update',
  'rpc_vendor_service_area_create',
  'rpc_vendor_service_area_update',
]);

const expectedPermissionChecks = Object.freeze([
  "'vendors.create'",
  "'vendors.update'",
  "'vendors.contacts.manage'",
  "'vendors.service_areas.manage'",
]);

const stableErrorCodes = Object.freeze([
  'vendor_create_permission_required',
  'vendor_update_permission_required',
  'vendor_contacts_manage_permission_required',
  'vendor_service_areas_manage_permission_required',
  'vendor_profile_not_found_or_not_authorized',
  'vendor_company_required',
  'vendor_company_name_required',
  'vendor_profile_duplicate',
  'vendor_relationship_invalid',
  'vendor_contact_not_found_or_not_authorized',
  'vendor_service_area_not_found_or_not_authorized',
  'vendor_payload_invalid',
  'vendor_patch_contains_forbidden_fields',
  'vendor_status_invalid',
  'vendor_service_area_status_invalid',
]);

describe('AMC vendor mutation RPC migration', () => {
  it('adds only the approved public Vendor Directory mutation RPCs', () => {
    publicMutationRpcs.forEach((rpcName) => {
      expect(migrationSql).toContain(`create or replace function public.${rpcName}`);
      expect(migrationSql).toContain(`grant execute on function public.${rpcName}`);
    });

    expect(migrationSql).not.toContain('rpc_vendor_assignment_candidates');
    expect(migrationSql).not.toContain('rpc_vendor_contact_delete');
    expect(migrationSql).not.toContain('rpc_vendor_service_area_delete');
  });

  it('gates mutations with vendor-specific permissions', () => {
    expectedPermissionChecks.forEach((permissionKey) => {
      expect(migrationSql).toContain(permissionKey);
    });

    expect(migrationSql).not.toContain("'relationships.read'");
    expect(migrationSql).not.toContain("'relationships.invite'");
    expect(migrationSql).not.toContain("'relationships.assign_work'");
  });

  it('defines the approved stable error codes', () => {
    stableErrorCodes.forEach((errorCode) => {
      expect(migrationSql).toContain(errorCode);
    });
  });

  it('keeps assignment and order behavior out of Vendor Directory mutations', () => {
    expect(migrationSql).not.toContain('orders.appraiser_id');
    expect(migrationSql).not.toContain('orders.reviewer_id');
    expect(migrationSql).not.toContain('assigned_to');
    expect(migrationSql).not.toContain('order_company_assignments');
  });

  it('uses allowlist validation and primary contact semantics', () => {
    expect(migrationSql).toContain('amc_vendor_raise_if_unknown_keys');
    expect(migrationSql).toContain('vendor_patch_contains_forbidden_fields');
    expect(migrationSql).toContain('set is_primary = false');
  });
});
