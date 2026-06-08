import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260608170000_client_portal_request_review_role_grants.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

const requestReviewPermissionKeys = Object.freeze([
  'client_portal.order_requests.read',
  'client_portal.order_requests.manage',
]);

describe('Client Portal request review role grant migration', () => {
  it('preserves the staff review permission catalog entries', () => {
    requestReviewPermissionKeys.forEach((permissionKey) => {
      expect(migrationSql).toContain(`'${permissionKey}'`);
    });

    expect(migrationSql).toContain("'Read Client Portal order requests'");
    expect(migrationSql).toContain("'Manage Client Portal order requests'");
    expect(migrationSql).toContain('on conflict (key) do update');
  });

  it('grants request review permissions to Owner and Admin templates only', () => {
    requestReviewPermissionKeys.forEach((permissionKey) => {
      expect(migrationSql).toContain(`('Owner', '${permissionKey}')`);
      expect(migrationSql).toContain(`('Admin', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Reviewer', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Appraiser', '${permissionKey}')`);
      expect(migrationSql).not.toContain(`('Vendor Admin', '${permissionKey}')`);
    });

    expect(migrationSql).toContain('r.company_id is null');
    expect(migrationSql).toContain('r.is_template = true');
    expect(migrationSql).toContain('r.is_system = true');
  });

  it('does not create client portal membership or operational order records', () => {
    expect(migrationSql).not.toContain('insert into public.client_portal_members');
    expect(migrationSql).not.toContain('insert into public.company_memberships');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('insert into public.order_vendor_bid_requests');
  });
});
