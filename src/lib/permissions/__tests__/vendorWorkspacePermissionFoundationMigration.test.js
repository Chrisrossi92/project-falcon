import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260604100000_amc_vendor_workspace_permission_foundation.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

const vendorWorkspacePermissionKeys = Object.freeze([
  'vendor_workspace.view',
  'vendor_bids.read',
  'vendor_bids.respond',
  'vendor_assignments.read',
  'vendor_assignments.respond',
  'vendor_assignments.progress',
  'vendor_documents.read',
  'vendor_documents.upload',
  'vendor_profile.read',
  'vendor_profile.update',
]);

const forbiddenOwnerSidePermissionPrefixes = Object.freeze([
  'orders.',
  'vendors.',
  'bid_requests.',
]);

describe('AMC vendor workspace permission foundation migration', () => {
  it('seeds the approved vendor workspace permission catalog keys', () => {
    vendorWorkspacePermissionKeys.forEach((permissionKey) => {
      expect(migrationSql).toContain(`'${permissionKey}'`);
    });

    expect(migrationSql).not.toContain('vendor_orders.read');
    expect(migrationSql).not.toContain('vendor_financials.manage');
    expect(migrationSql).not.toContain('vendor_users.manage');
  });

  it('creates a Vendor Admin system template role', () => {
    expect(migrationSql).toContain("'Vendor Admin'");
    expect(migrationSql).toContain('true,');
    expect(migrationSql).toContain('false');
    expect(migrationSql).toContain('where r.company_id is null');
  });

  it('grants only vendor-side permissions to Vendor Admin', () => {
    vendorWorkspacePermissionKeys.forEach((permissionKey) => {
      expect(migrationSql).toContain(`('Vendor Admin', '${permissionKey}')`);
    });

    forbiddenOwnerSidePermissionPrefixes.forEach((prefix) => {
      expect(migrationSql).not.toContain(`('Vendor Admin', '${prefix}`);
    });
  });

  it('does not grant vendor workspace permissions to existing internal templates', () => {
    vendorWorkspacePermissionKeys.forEach((permissionKey) => {
      expect(migrationSql).not.toContain(`('Owner', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Admin', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Reviewer', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Appraiser', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Billing', '${permissionKey}')`);
    });
  });

  it('does not expose runtime vendor workspace surfaces', () => {
    expect(migrationSql).not.toContain('create or replace function');
    expect(migrationSql).not.toContain('create table');
    expect(migrationSql).not.toContain('alter table');
    expect(migrationSql).not.toContain('insert into public.order_vendor_bid_requests');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).toContain('No vendor routes, nav, pages, public token changes');
  });
});
