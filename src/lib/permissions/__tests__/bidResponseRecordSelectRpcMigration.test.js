import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260602155000_amc_bid_response_record_select_rpcs.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC bid response record/select RPC migration', () => {
  it('creates the approved response record and select RPCs only', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_order_vendor_bid_response_record',
    );
    expect(migrationSql).toContain('p_recipient_id uuid');
    expect(migrationSql).toContain('p_payload jsonb');
    expect(migrationSql).toContain(
      'create or replace function public.rpc_order_vendor_bid_response_select',
    );
    expect(migrationSql).toContain('p_response_id uuid');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_request_create');
  });

  it('uses security-definer RPC posture and grants execute to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_order_vendor_bid_response_record(uuid, jsonb) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_order_vendor_bid_response_record(uuid, jsonb) to authenticated, service_role',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_order_vendor_bid_response_select(uuid) to authenticated, service_role',
    );
  });

  it('requires update permission, current membership, order read authority, and AMC scope for recording', () => {
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('bid_requests.update')");
    expect(migrationSql).toContain("raise exception 'bid_request_update_permission_required'");
    expect(migrationSql).toContain('current_app_user_can_read_order(v_request.order_id)');
    expect(migrationSql).toContain("raise exception 'bid_request_not_found_or_not_authorized'");
    expect(migrationSql).toContain("coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'");
    expect(migrationSql).toContain("raise exception 'order_scope_not_amc_operations'");
  });

  it('records response fields and moves recipient/request statuses without creating assignments', () => {
    [
      'fee_amount',
      'currency',
      'proposed_due_at',
      'turn_time_days',
      'comments',
      'submitted_at',
      'selected_at = null',
    ].forEach((fieldName) => {
      expect(migrationSql).toContain(fieldName);
    });

    expect(migrationSql).toContain('insert into public.order_vendor_bid_responses');
    expect(migrationSql).toContain('on conflict (recipient_id) do update');
    expect(migrationSql).toContain("set status = 'responded'");
    expect(migrationSql).toContain("v_request_status := 'partially_responded'");
    expect(migrationSql).toContain("v_request_status := 'closed'");
  });

  it('requires select permission and rejects non-selectable requests, recipients, and unsubmitted responses', () => {
    expect(migrationSql).toContain("current_app_user_has_permission('bid_requests.select')");
    expect(migrationSql).toContain("raise exception 'bid_request_select_permission_required'");
    expect(migrationSql).toContain("v_request.status in ('cancelled', 'expired')");
    expect(migrationSql).toContain("raise exception 'bid_request_not_selectable'");
    expect(migrationSql).toContain("v_recipient.status in ('declined', 'expired', 'cancelled', 'not_selected')");
    expect(migrationSql).toContain("raise exception 'bid_response_not_selectable'");
    expect(migrationSql).toContain('v_response.submitted_at is null');
    expect(migrationSql).toContain("raise exception 'bid_response_not_submitted'");
  });

  it('selects one response, marks sibling recipients not_selected, and closes the request', () => {
    expect(migrationSql).toContain('update public.order_vendor_bid_responses obr');
    expect(migrationSql).toContain('obr.id <> p_response_id');
    expect(migrationSql).toContain('selected_by_user_id = v_actor_user_id');
    expect(migrationSql).toContain("set status = case when id = v_recipient.id then 'selected' else 'not_selected' end");
    expect(migrationSql).toContain("set status = 'closed'");
    expect(migrationSql).toContain("'selected_response_id'");
    expect(migrationSql).toContain("'selected_vendor_company_id'");
  });

  it('does not mutate orders, create assignment packets, call offer RPCs, send notifications, or add routes', () => {
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_offer');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('orders.appraiser_id');
    expect(migrationSql).not.toContain('orders.reviewer_id');
    expect(migrationSql).not.toContain('notify_order_company_assignment_event');
    expect(migrationSql).not.toMatch(/path\s*=\s*'\/amc\//i);
    expect(migrationSql).toContain('does not call assignment offer RPCs');
    expect(migrationSql).toContain('or create /amc/* routes');
  });
});
