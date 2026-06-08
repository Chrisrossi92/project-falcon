import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260608171000_client_request_review_view_alignment.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

const before = (left, right) => {
  const leftIndex = migrationSql.indexOf(left);
  const rightIndex = migrationSql.indexOf(right);
  expect(leftIndex, `${left} should exist`).toBeGreaterThanOrEqual(0);
  expect(rightIndex, `${right} should exist`).toBeGreaterThanOrEqual(0);
  expect(leftIndex, `${left} should come before ${right}`).toBeLessThan(rightIndex);
};

describe('Client request review view alignment migration', () => {
  it('drops dependent RPCs before dropping and recreating the staff review view', () => {
    [
      'drop function if exists public.rpc_client_portal_order_request_convert_to_order(text);',
      'drop function if exists public.rpc_client_portal_order_request_review_update_status(text, text);',
      'drop function if exists public.rpc_client_portal_order_request_review_detail(text);',
      'drop function if exists public.rpc_client_portal_order_requests_for_review();',
    ].forEach((statement) => {
      expect(migrationSql).toContain(statement);
      before(statement, 'drop view if exists public.v_client_portal_order_request_staff_review;');
    });

    before(
      'drop view if exists public.v_client_portal_order_request_staff_review;',
      'create view public.v_client_portal_order_request_staff_review',
    );
    expect(migrationSql).not.toContain('create or replace view public.v_client_portal_order_request_staff_review');
  });

  it('recreates the final staff review view shape including converted order linkage', () => {
    [
      'cpor.accepted_order_id',
      'accepted_order.order_number as accepted_order_number',
      'left join public.orders accepted_order',
      'left join public.users requester',
      'left join public.users reviewer',
      'grant select on public.v_client_portal_order_request_staff_review to service_role',
    ].forEach((text) => {
      expect(migrationSql).toContain(text);
    });
  });

  it('recreates staff list detail status update and conversion RPCs with grants', () => {
    [
      'create or replace function public.rpc_client_portal_order_requests_for_review()',
      'create or replace function public.rpc_client_portal_order_request_review_detail(p_request_key text)',
      'create or replace function public.rpc_client_portal_order_request_review_update_status(',
      'create or replace function public.rpc_client_portal_order_request_convert_to_order(',
      'grant execute on function public.rpc_client_portal_order_requests_for_review()',
      'grant execute on function public.rpc_client_portal_order_request_review_detail(text)',
      'grant execute on function public.rpc_client_portal_order_request_review_update_status(text, text)',
      'grant execute on function public.rpc_client_portal_order_request_convert_to_order(text)',
    ].forEach((text) => {
      expect(migrationSql).toContain(text);
    });
  });

  it('preserves request review permissions and current-company guards', () => {
    [
      "'client_portal.order_requests.read'",
      "'client_portal.order_requests.manage'",
      'public.current_app_user_has_current_company()',
      'v.company_id = public.current_company_id()',
      'cpor.company_id = public.current_company_id()',
    ].forEach((text) => {
      expect(migrationSql).toContain(text);
    });
  });

  it('does not mutate request data except explicit review status or staff-confirmed conversion paths', () => {
    expect(migrationSql).not.toContain('delete from public.client_portal_order_requests');
    expect(migrationSql).not.toContain('truncate public.client_portal_order_requests');
    expect(migrationSql).not.toContain('drop table');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('insert into public.order_vendor_bid_requests');
    expect(migrationSql).not.toContain('insert into public.amc_vendor_payment_ledger');
  });
});
