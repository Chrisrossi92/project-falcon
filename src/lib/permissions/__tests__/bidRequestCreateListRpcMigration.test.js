import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260602154000_amc_bid_request_create_list_rpcs.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC bid request create/list RPC migration', () => {
  it('creates the approved create and list RPCs only', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_order_vendor_bid_request_create',
    );
    expect(migrationSql).toContain('p_order_id uuid');
    expect(migrationSql).toContain('p_payload jsonb');
    expect(migrationSql).toContain(
      'create or replace function public.rpc_order_vendor_bid_requests_for_order',
    );
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_response_record');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_response_select');
  });

  it('uses security-definer RPC posture and grants execute to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_order_vendor_bid_request_create(uuid, jsonb) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_order_vendor_bid_request_create(uuid, jsonb) to authenticated, service_role',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_order_vendor_bid_requests_for_order(uuid) to authenticated, service_role',
    );
  });

  it('requires bid create, vendor read, current membership, order read, and AMC scope for create', () => {
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('bid_requests.create')");
    expect(migrationSql).toContain("raise exception 'bid_request_create_permission_required'");
    expect(migrationSql).toContain("current_app_user_has_permission('vendors.read')");
    expect(migrationSql).toContain("raise exception 'vendor_read_permission_required'");
    expect(migrationSql).toContain('current_app_user_can_read_order(p_order_id)');
    expect(migrationSql).toContain("raise exception 'bid_request_order_not_found_or_not_authorized'");
    expect(migrationSql).toContain("coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'");
    expect(migrationSql).toContain("raise exception 'order_scope_not_amc_operations'");
  });

  it('requires bid read and order read authority for list', () => {
    expect(migrationSql).toContain("current_app_user_has_permission('bid_requests.read')");
    expect(migrationSql).toContain("raise exception 'bid_request_read_permission_required'");
    expect(migrationSql).toContain('current_app_user_can_read_order(p_order_id)');
    expect(migrationSql).toContain('where br.company_id = v_company_id');
    expect(migrationSql).toContain('and br.order_id = p_order_id');
  });

  it('validates recipients, active amc_vendor relationships, and duplicate open outreach', () => {
    expect(migrationSql).toContain("raise exception 'bid_request_recipients_required'");
    expect(migrationSql).toContain("raise exception 'bid_request_recipient_duplicate'");
    expect(migrationSql).toContain('from public.company_vendor_profiles');
    expect(migrationSql).toContain("v_profile.vendor_status in ('inactive', 'do_not_use')");
    expect(migrationSql).toContain("v_relationship.relationship_type <> 'amc_vendor'");
    expect(migrationSql).toContain("v_relationship.status <> 'active'");
    expect(migrationSql).toContain("raise exception 'bid_request_vendor_ineligible'");
    expect(migrationSql).toContain("br.status in ('draft', 'sent', 'partially_responded')");
    expect(migrationSql).toContain("brr.status in ('pending', 'sent', 'viewed', 'responded')");
    expect(migrationSql).toContain("raise exception 'bid_request_open_recipient_exists'");
  });

  it('creates only bid request parent and recipient rows', () => {
    expect(migrationSql).toContain('insert into public.order_vendor_bid_requests');
    expect(migrationSql).toContain('insert into public.order_vendor_bid_request_recipients');
    expect(migrationSql).not.toContain('insert into public.order_vendor_bid_responses');
    expect(migrationSql).not.toContain('update public.order_vendor_bid_responses');
  });

  it('returns request, recipient, vendor, and response summary JSON', () => {
    [
      'bid_request_id',
      'recipient_count',
      'recipients',
      'recipient_id',
      'vendor_profile_id',
      'vendor_company_id',
      'vendor_company_name',
      'relationship_id',
      'response_id',
      'fee_amount',
      'turn_time_days',
      'selected_at',
    ].forEach((fieldName) => {
      expect(migrationSql).toContain(`'${fieldName}'`);
    });
  });

  it('does not create assignments, mutate orders, send notifications, or add routes', () => {
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('orders.appraiser_id');
    expect(migrationSql).not.toContain('orders.reviewer_id');
    expect(migrationSql).not.toContain('notify_order_company_assignment_event');
    expect(migrationSql).not.toMatch(/path\s*=\s*'\/amc\//i);
    expect(migrationSql).toContain('does not create assignments');
    expect(migrationSql).toContain('or create /amc/* routes');
  });
});
