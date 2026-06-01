import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260601110000_amc_vendor_permission_seeds.sql',
);
const readRpcMigrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260601120000_amc_vendor_directory_vendors_read_gate.sql',
);
const navigationRegistryPath = resolve(repoRoot, 'src/lib/navigation/currentNavigationRegistry.js');

const migrationSql = readFileSync(migrationPath, 'utf8');
const readRpcMigrationSql = readFileSync(readRpcMigrationPath, 'utf8');
const navigationRegistrySource = readFileSync(navigationRegistryPath, 'utf8');

const vendorPermissionKeys = Object.freeze([
  'vendors.read',
  'vendors.create',
  'vendors.update',
  'vendors.contacts.manage',
  'vendors.service_areas.manage',
]);

describe('AMC vendor permission seed migration', () => {
  it('seeds only the approved MVP vendor permission catalog keys', () => {
    vendorPermissionKeys.forEach((permissionKey) => {
      expect(migrationSql).toContain(`'${permissionKey}'`);
    });

    expect(migrationSql).not.toContain('vendors.archive');
    expect(migrationSql).not.toContain('vendors.assign');
    expect(migrationSql).not.toContain('vendors.compliance.manage');
    expect(migrationSql).not.toContain('vendors.performance.view');
    expect(migrationSql).not.toContain('vendors.financial_terms.view');
    expect(migrationSql).not.toContain('vendors.financial_terms.manage');
  });

  it('grants MVP vendor permissions to Owner and Admin template roles only', () => {
    vendorPermissionKeys.forEach((permissionKey) => {
      expect(migrationSql).toContain(`('Owner', '${permissionKey}')`);
      expect(migrationSql).toContain(`('Admin', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Reviewer', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Appraiser', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Billing', '${permissionKey}')`);
    });
  });

  it('does not expose the vendors category in V1 permission override UI helpers', () => {
    expect(migrationSql).not.toContain('permission_override_is_v1_ui_visible');
  });

  it('uses vendors.read for Vendor Directory route and RPC gates after AMC-2T', () => {
    expect(readRpcMigrationSql).toContain("current_app_user_has_permission('vendors.read')");
    expect(readRpcMigrationSql).not.toContain("current_app_user_has_permission('relationships.read')");

    expect(navigationRegistrySource).toContain('PERMISSIONS.VENDORS_READ');
    expect(navigationRegistrySource).toContain(
      'AMC Operations read-only Vendor Directory surface gated by vendors.read.',
    );
  });
});
