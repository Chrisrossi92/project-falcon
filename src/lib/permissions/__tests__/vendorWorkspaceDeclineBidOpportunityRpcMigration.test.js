import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260604111000_amc_vendor_workspace_decline_bid_opportunity_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace decline bid opportunity RPC migration', () => {
  it('creates the authenticated vendor decline RPC with work key and payload args', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_vendor_workspace_decline_bid_opportunity',
    );
    expect(migrationSql).toContain('p_work_key text');
    expect(migrationSql).toContain("p_payload jsonb default '{}'::jsonb");
    expect(migrationSql).toContain('returns jsonb');
  });

  it('uses security-definer RPC posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_decline_bid_opportunity(text, jsonb) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_decline_bid_opportunity(text, jsonb) to authenticated, service_role',
    );
  });

  it('requires app user, current company membership, and vendor bid respond permission only', () => {
    expect(migrationSql).toContain('current_app_user_id()');
    expect(migrationSql).toContain('current_company_id()');
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('vendor_bids.respond')");
    expect(migrationSql).toContain("raise exception 'vendor_bids_respond_permission_required'");

    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('orders\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('vendors\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('bid_requests\./);
    expect(migrationSql).not.toContain('current_app_user_can_read_order');
  });

  it('resolves the opaque work key only inside current vendor company scope', () => {
    [
      "v_work_key !~ '^[0-9a-f]{64}$'",
      'extensions.digest',
      "'vendor_available_work_v1'",
      'brr.id::text',
      'brr.vendor_company_id::text',
      'where brr.vendor_company_id = v_vendor_company_id',
      ') = v_work_key',
      'for update',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('guards AMC scope, active relationship/profile, open lifecycle, submitted, declined, and expired states', () => {
    [
      "coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'",
      "v_relationship.relationship_type <> 'amc_vendor'",
      "v_relationship.status <> 'active'",
      "v_profile.vendor_status in ('inactive', 'do_not_use')",
      "v_request.status in ('closed', 'cancelled', 'expired')",
      "v_recipient.status in ('responded', 'expired', 'cancelled', 'selected', 'not_selected')",
      "v_recipient.status = 'declined'",
      'v_request.response_due_at is not null',
      "error', 'bid_already_submitted'",
      "error', 'bid_already_declined'",
      "error', 'bid_opportunity_expired'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('validates optional decline payload fields without requiring a separate decline system', () => {
    [
      "'payload', 'Decline payload must be an object.'",
      "'reason', 'Choose a valid decline reason.'",
      "'comments', 'Comments must be 2000 characters or fewer.'",
      "'Too busy / capacity'",
      "'Outside coverage area'",
      "'Fee does not work'",
      "'Due date / turn time does not work'",
      "'Other'",
      "'error', 'bid_decline_invalid'",
      "'field_errors'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('reuses existing bid recipient/request lifecycle writes', () => {
    [
      'update public.order_vendor_bid_request_recipients',
      "set status = 'declined'",
      'declined_at = v_declined_at',
      "'declined_via', 'vendor_workspace'",
      "'decline_reason', v_reason",
      "'decline_comments', v_comments",
      "v_request_status := 'partially_responded'",
      "v_request_status := 'closed'",
      'update public.order_vendor_bid_requests',
      'closed_at = case when v_request_status = \'closed\'',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    expect(migrationSql).not.toContain('insert into public.order_vendor_bid_responses');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.orders');
  });

  it('returns only compact vendor-safe decline or existing bid summary fields', () => {
    [
      'status',
      'declined_at',
      'message',
      'decline',
      'reason',
      'comments',
      'bid',
      'fee_amount',
      'currency',
      'turn_time_days',
      'proposed_due_at',
      'submitted_at',
    ].forEach((fieldName) => {
      expect(migrationSql).toContain(`'${fieldName}'`);
    });
  });

  it('does not expose denylisted raw or internal fields in response JSON', () => {
    [
      'recipient_id',
      'bid_request_id',
      'order_id',
      'vendor_profile_id',
      'relationship_id',
      'response_id',
      'token_hash',
      'token_last_four',
      'token',
      'candidate_snapshot',
      'score',
      'client_fee',
      'amc_margin',
      'internal_notes',
      'storage_bucket',
      'storage_path',
    ].forEach((fieldName) => {
      expect(migrationSql).not.toContain(`'${fieldName}'`);
    });
  });

  it('does not touch public token flows, owner APIs, assignment offers, or direct order lifecycle', () => {
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_invitation_submit');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_request_create');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_requests_for_order');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_offer');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('delete from public.orders');
    expect(migrationSql).toContain('does not mutate assignments, orders, public token flows');
  });
});
