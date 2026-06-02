import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260601142000_amc_one_active_vendor_offer_guard.sql',
);
const foundationPath = resolve(
  repoRoot,
  'supabase/migrations/20260518029000_order_company_assignment_foundation.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');
const foundationSql = readFileSync(foundationPath, 'utf8');

describe('AMC one-active-vendor-offer guard migration', () => {
  it('fails preflight when existing active vendor assignment conflicts exist', () => {
    expect(migrationSql).toContain('order_vendor_assignment_active_conflict');
    expect(migrationSql).toContain("oca.assignment_type = 'vendor_appraisal'");
    expect(migrationSql).toContain(
      "oca.status in ('offered', 'accepted', 'in_progress', 'submitted')",
    );
    expect(migrationSql).toContain('having count(*) > 1');
    expect(migrationSql).not.toContain('delete from public.order_company_assignments');
  });

  it('adds an order-scoped partial unique index for active vendor appraisal packets', () => {
    expect(migrationSql).toContain(
      'create unique index if not exists order_company_assignments_one_active_vendor_per_order',
    );
    expect(migrationSql).toContain('on public.order_company_assignments (order_id)');
    expect(migrationSql).toContain("where assignment_type = 'vendor_appraisal'");
    expect(migrationSql).toContain(
      "and status in ('offered', 'accepted', 'in_progress', 'submitted')",
    );
  });

  it('preserves the existing same-company current assignment uniqueness guard', () => {
    expect(foundationSql).toContain('order_company_assignments_current_unique');
    expect(foundationSql).toContain(
      'on public.order_company_assignments (order_id, assigned_company_id, assignment_type)',
    );
    expect(foundationSql).toContain(
      "where status in ('offered', 'accepted', 'in_progress', 'submitted')",
    );
  });

  it('patches the offer RPC with a stable vendor-active error before insert', () => {
    const guardPosition = migrationSql.indexOf('order_vendor_assignment_active_exists');
    const insertPosition = migrationSql.indexOf('insert into public.order_company_assignments');

    expect(migrationSql).toContain('create or replace function public.rpc_order_company_assignment_offer');
    expect(migrationSql).toContain("if v_assignment_type = 'vendor_appraisal'");
    expect(migrationSql).toContain("oca.assignment_type = 'vendor_appraisal'");
    expect(migrationSql).toContain(
      "oca.status in ('offered', 'accepted', 'in_progress', 'submitted')",
    );
    expect(migrationSql).toContain("raise exception 'order_vendor_assignment_active_exists'");
    expect(migrationSql).toContain("using errcode = '23505'");
    expect(guardPosition).toBeGreaterThan(-1);
    expect(insertPosition).toBeGreaterThan(-1);
    expect(guardPosition).toBeLessThan(insertPosition);
  });

  it('does not apply the active vendor guard to non-vendor assignment types', () => {
    expect(migrationSql).toContain("if v_assignment_type = 'vendor_appraisal'");
    expect(migrationSql).not.toContain("v_assignment_type in ('vendor_appraisal'");
    expect(migrationSql).toContain('Does not affect non-vendor assignment types');
  });

  it('does not write direct order assignment columns', () => {
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('orders.appraiser_id');
    expect(migrationSql).not.toContain('orders.reviewer_id');
    expect(migrationSql).not.toContain('orders.assigned_to');
    expect(migrationSql).not.toContain('orders.current_reviewer_id');
  });
});
