import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260604104000_amc_vendor_workspace_available_work_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace available work RPC migration', () => {
  it('creates the authenticated vendor available work RPC with JSON response shape', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_vendor_workspace_available_work()',
    );
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain("'ok', true");
    expect(migrationSql).toContain("'items'");
  });

  it('uses security-definer RPC posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_available_work() from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_available_work() to authenticated, service_role',
    );
  });

  it('requires app user, current company membership, and vendor bid read permission only', () => {
    expect(migrationSql).toContain('current_app_user_id()');
    expect(migrationSql).toContain('current_company_id()');
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('vendor_bids.read')");
    expect(migrationSql).toContain("raise exception 'vendor_bids_read_permission_required'");

    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('orders\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('vendors\./);
    expect(migrationSql).not.toMatch(/current_app_user_has_permission\('bid_requests\./);
    expect(migrationSql).not.toContain('current_app_user_can_read_order');
  });

  it('scopes rows to the current vendor company, AMC orders, and active vendor relationship/profile', () => {
    [
      'where brr.vendor_company_id = v_vendor_company_id',
      "coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'",
      "cr.relationship_type = 'amc_vendor'",
      "cr.status = 'active'",
      "cvp.vendor_status not in ('inactive', 'do_not_use')",
      'cvp.vendor_company_id = brr.vendor_company_id',
      'cvp.owner_company_id = br.company_id',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('implements available-work eligibility without hiding overdue rows', () => {
    [
      "br.status in ('sent', 'partially_responded')",
      "br.status not in ('closed', 'cancelled', 'expired')",
      "brr.status in ('pending', 'sent', 'viewed')",
      'response.submitted_at is not null',
      'response.id is null',
      "when br.response_due_at is not null and br.response_due_at < now() then 'overdue'",
      "when br.response_due_at is not null and br.response_due_at <= now() + v_due_soon_window then 'due_soon'",
      "when brr.status = 'viewed' then 'viewed'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('exposes an opaque deterministic work key instead of raw row ids', () => {
    expect(migrationSql).toContain("'work_key'");
    expect(migrationSql).toContain('extensions.digest');
    expect(migrationSql).toContain("'vendor_available_work_v1'");
    expect(migrationSql).toContain('brr.id::text');
    expect(migrationSql).toContain('brr.vendor_company_id::text');
  });

  it('returns only vendor-safe list fields', () => {
    [
      'work_key',
      'status',
      'bid_due_at',
      'requested_due_date',
      'requested_turn_time_days',
      'order',
      'owner',
      'summary',
      'order_number',
      'property_address',
      'city',
      'state',
      'postal_code',
      'county',
      'property_type',
      'report_type',
      'company_name',
      'scope',
      'complexity',
      'documents_available',
    ].forEach((fieldName) => {
      expect(migrationSql).toContain(`'${fieldName}'`);
    });
  });

  it('does not expose denylisted raw or internal fields in the JSON payload', () => {
    [
      'recipient_id',
      'bid_request_id',
      'order_id',
      'vendor_profile_id',
      'relationship_id',
      'token_hash',
      'token_last_four',
      'token',
      'candidate_snapshot',
      'score',
      'client_fee',
      'amc_margin',
      'internal_notes',
      'request_message',
      'metadata',
      'payload',
    ].forEach((fieldName) => {
      expect(migrationSql).not.toContain(`'${fieldName}'`);
    });
  });

  it('is read-only and does not touch frontend routes, wrappers, owner APIs, or token flows', () => {
    expect(migrationSql).not.toContain('insert into public.order_vendor_bid');
    expect(migrationSql).not.toContain('update public.order_vendor_bid');
    expect(migrationSql).not.toContain('delete from public.order_vendor_bid');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('delete from public.order_company_assignments');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('delete from public.orders');
    expect(migrationSql).not.toMatch(/path\s*=\s*'\/vendor-workspace/i);
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_invitation');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_request_create');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_requests_for_order');
    expect(migrationSql).toContain('does not mutate bids, responses, orders');
  });
});
