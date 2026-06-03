import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260602152000_amc_bid_request_permission_seeds.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

const bidRequestPermissionKeys = Object.freeze([
  'bid_requests.read',
  'bid_requests.create',
  'bid_requests.update',
  'bid_requests.select',
]);

describe('AMC bid request permission seed migration', () => {
  it('seeds only the approved bid request permission catalog keys', () => {
    bidRequestPermissionKeys.forEach((permissionKey) => {
      expect(migrationSql).toContain(`'${permissionKey}'`);
    });

    expect(migrationSql).not.toContain('bid_requests.delete');
    expect(migrationSql).not.toContain('bid_requests.respond');
    expect(migrationSql).not.toContain('bid_requests.portal.respond');
    expect(migrationSql).not.toContain('bid_requests.notify');
  });

  it('grants bid request permissions to Owner and Admin template roles only', () => {
    bidRequestPermissionKeys.forEach((permissionKey) => {
      expect(migrationSql).toContain(`('Owner', '${permissionKey}')`);
      expect(migrationSql).toContain(`('Admin', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Reviewer', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Appraiser', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Billing', '${permissionKey}')`);
    });
  });

  it('does not create bid request schema, RPCs, UI, or assignment behavior', () => {
    expect(migrationSql).not.toContain('create table');
    expect(migrationSql).not.toContain('alter table');
    expect(migrationSql).not.toContain('create or replace function');
    expect(migrationSql).not.toContain('insert into public.order_vendor_bid_requests');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).toContain('No bid request tables, RPCs, UI, routes/nav');
    expect(migrationSql).toContain('or /amc/* routes are introduced');
  });
});
