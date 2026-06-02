import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260601143000_amc_order_operations_scope_foundation.sql',
);
const ordersServicePath = resolve(repoRoot, 'src/lib/services/ordersService.js');

const migrationSql = readFileSync(migrationPath, 'utf8');
const ordersServiceSource = readFileSync(ordersServicePath, 'utf8');

describe('AMC order operations scope foundation migration', () => {
  it('adds operations_scope with internal default, valid values, backfill, comments, and index', () => {
    expect(migrationSql).toContain('add column if not exists operations_scope text default');
    expect(migrationSql).toContain("set operations_scope = 'internal_operations'");
    expect(migrationSql).toContain('alter column operations_scope set not null');
    expect(migrationSql).toContain('orders_operations_scope_valid');
    expect(migrationSql).toContain("operations_scope in ('internal_operations', 'amc_operations')");
    expect(migrationSql).toContain('idx_orders_company_operations_scope');
    expect(migrationSql).toContain('on public.orders (company_id, operations_scope)');
    expect(migrationSql).toMatch(/compliance-sensitive operational lane/i);
    expect(migrationSql).toContain('Hybrid scope remains deferred');
  });

  it('projects operations_scope through current order read views and frontend order service selects', () => {
    expect(migrationSql).toContain('create or replace view public.v_orders_frontend_v4');
    expect(migrationSql).toContain('o.operations_scope');
    expect(migrationSql).toContain('create or replace view public.v_orders_active_frontend_v4');
    expect(migrationSql).toContain('mode-aware filtering is deferred');
    expect(ordersServiceSource).toContain('operations_scope');
  });

  it('patches candidate RPC to reject non-AMC order scope before matching vendors', () => {
    const scopeGuardPosition = migrationSql.indexOf("raise exception 'order_scope_not_amc_operations'");
    const matchPosition = migrationSql.indexOf('with matched_coverage as');

    expect(migrationSql).toContain('create or replace function public.rpc_vendor_assignment_candidates');
    expect(migrationSql).toContain("coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'");
    expect(scopeGuardPosition).toBeGreaterThan(-1);
    expect(matchPosition).toBeGreaterThan(-1);
    expect(scopeGuardPosition).toBeLessThan(matchPosition);
  });

  it('patches vendor appraisal offer guard without changing non-vendor assignment types', () => {
    const scopeGuardPosition = migrationSql.lastIndexOf("raise exception 'order_scope_not_amc_operations'");
    const activeGuardPosition = migrationSql.indexOf("raise exception 'order_vendor_assignment_active_exists'");
    const insertPosition = migrationSql.indexOf('insert into public.order_company_assignments');

    expect(migrationSql).toContain('create or replace function public.rpc_order_company_assignment_offer');
    expect(migrationSql).toContain("if v_assignment_type = 'vendor_appraisal'");
    expect(migrationSql).toContain("and coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'");
    expect(migrationSql).toContain('preserves existing non-vendor assignment offer behavior');
    expect(scopeGuardPosition).toBeGreaterThan(-1);
    expect(activeGuardPosition).toBeGreaterThan(scopeGuardPosition);
    expect(insertPosition).toBeGreaterThan(activeGuardPosition);
  });

  it('does not add UI routes, navigation, or direct order assignment column writes', () => {
    expect(migrationSql).not.toMatch(/insert\s+into\s+public\.(navigation|routes|nav_items)/i);
    expect(migrationSql).not.toMatch(/path\s*=\s*'\/amc\//i);
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('update public.orders set appraiser_id');
    expect(migrationSql).not.toContain('update public.orders set reviewer_id');
    expect(migrationSql).not.toContain('update public.orders set assigned_to');
    expect(migrationSql).not.toContain('orders.current_reviewer_id');
  });
});
