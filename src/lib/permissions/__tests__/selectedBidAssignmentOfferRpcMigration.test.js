import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260603100000_amc_selected_bid_assignment_offer_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC selected bid assignment offer RPC migration', () => {
  it('creates the selected bid conversion RPC only', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_order_vendor_bid_response_convert_to_assignment_offer',
    );
    expect(migrationSql).toContain('p_response_id uuid');
    expect(migrationSql).toContain("p_payload jsonb default '{}'::jsonb");
    expect(migrationSql).not.toContain('create or replace function public.rpc_order_vendor_bid_response_record');
    expect(migrationSql).not.toContain('create or replace function public.rpc_order_vendor_bid_response_select');
  });

  it('uses security-definer RPC posture and grants execute to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_order_vendor_bid_response_convert_to_assignment_offer(uuid, jsonb) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_order_vendor_bid_response_convert_to_assignment_offer(uuid, jsonb) to authenticated, service_role',
    );
  });

  it('requires assignment offer authority consistent with direct assignment offers', () => {
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('order_company_assignments.offer')");
    expect(migrationSql).toContain("raise exception 'assignment_offer_permission_required'");
    expect(migrationSql).toContain("current_app_user_has_permission('relationships.assign_work')");
    expect(migrationSql).toContain("raise exception 'relationship_assign_work_permission_required'");
    expect(migrationSql).toContain('current_app_user_can_read_order(v_request.order_id)');
    expect(migrationSql).toContain('current_app_user_can_update_order_row');
  });

  it('loads bid response, recipient, request, and order server-side', () => {
    expect(migrationSql).toContain('from public.order_vendor_bid_responses obr');
    expect(migrationSql).toContain('where obr.id = p_response_id');
    expect(migrationSql).toContain('from public.order_vendor_bid_request_recipients brr');
    expect(migrationSql).toContain('where brr.id = v_response.recipient_id');
    expect(migrationSql).toContain('from public.order_vendor_bid_requests br');
    expect(migrationSql).toContain('where br.id = v_recipient.bid_request_id');
    expect(migrationSql).toContain('from public.orders o');
    expect(migrationSql).toContain('where o.id = v_request.order_id');
  });

  it('validates selected response, selected recipient, AMC scope, and request convertibility', () => {
    expect(migrationSql).toContain('v_response.submitted_at is null');
    expect(migrationSql).toContain("raise exception 'bid_response_not_submitted'");
    expect(migrationSql).toContain('v_response.selected_at is null');
    expect(migrationSql).toContain("raise exception 'bid_response_not_selected'");
    expect(migrationSql).toContain("v_recipient.status <> 'selected'");
    expect(migrationSql).toContain("raise exception 'bid_request_recipient_not_selected'");
    expect(migrationSql).toContain("coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'");
    expect(migrationSql).toContain("raise exception 'order_scope_not_amc_operations'");
    expect(migrationSql).toContain("v_request.status in ('cancelled', 'expired')");
    expect(migrationSql).toContain("raise exception 'bid_request_not_convertible'");
  });

  it('revalidates usable vendor profile and active amc_vendor relationship', () => {
    expect(migrationSql).toContain('from public.company_vendor_profiles');
    expect(migrationSql).toContain('v_profile.owner_company_id <> v_company_id');
    expect(migrationSql).toContain('v_profile.vendor_company_id <> v_recipient.vendor_company_id');
    expect(migrationSql).toContain("v_profile.vendor_status in ('inactive', 'do_not_use')");
    expect(migrationSql).toContain("raise exception 'bid_request_vendor_ineligible'");
    expect(migrationSql).toContain('from public.company_relationships');
    expect(migrationSql).toContain("v_relationship.relationship_type <> 'amc_vendor'");
    expect(migrationSql).toContain("v_relationship.status <> 'active'");
  });

  it('revalidates no active vendor assignment before delegating to the canonical offer RPC', () => {
    const activeGuardPosition = migrationSql.indexOf('order_vendor_assignment_active_exists');
    const delegatePosition = migrationSql.indexOf('public.rpc_order_company_assignment_offer');

    expect(migrationSql).toContain('from public.order_company_assignments oca');
    expect(migrationSql).toContain("oca.assignment_type = 'vendor_appraisal'");
    expect(migrationSql).toContain(
      "oca.status in ('offered', 'accepted', 'in_progress', 'submitted')",
    );
    expect(migrationSql).toContain("raise exception 'order_vendor_assignment_active_exists'");
    expect(delegatePosition).toBeGreaterThan(-1);
    expect(activeGuardPosition).toBeGreaterThan(-1);
    expect(activeGuardPosition).toBeLessThan(delegatePosition);
  });

  it('preserves selected bid details in terms and handoff payload', () => {
    [
      'bid_request_id',
      'bid_recipient_id',
      'bid_response_id',
      'vendor_profile_id',
      'vendor_company_id',
      'fee_amount',
      'currency',
      'turn_time_days',
      'proposed_due_at',
      'comments',
      'selected_bid_snapshot',
    ].forEach((fieldName) => {
      expect(migrationSql).toContain(`'${fieldName}'`);
    });
  });

  it('delegates assignment creation to existing offer RPC and returns compact JSON', () => {
    expect(migrationSql).toContain('v_assignment_id := public.rpc_order_company_assignment_offer');
    expect(migrationSql).toContain("'assignment_id'");
    expect(migrationSql).toContain("'status', 'offered'");
    expect(migrationSql).toContain("'result', 'assignment_offer_created'");
    expect(migrationSql).toContain('activity, and notification behavior are preserved');
  });

  it('does not directly mutate bid rows, orders, routes, or assignment packets outside the delegated offer RPC', () => {
    expect(migrationSql).not.toContain('update public.order_vendor_bid_requests');
    expect(migrationSql).not.toContain('update public.order_vendor_bid_request_recipients');
    expect(migrationSql).not.toContain('update public.order_vendor_bid_responses');
    expect(migrationSql).not.toContain('insert into public.order_vendor_bid');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toMatch(/path\s*=\s*'\/amc\//i);
    expect(migrationSql).toContain('Does not mutate bid request/response rows, orders');
  });
});
