import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260604105000_amc_vendor_workspace_available_work_detail_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace available work detail RPC migration', () => {
  it('creates the authenticated vendor unified work detail RPC with JSON response shape', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_vendor_workspace_available_work_detail(p_work_key text)',
    );
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain("'ok', true");
    expect(migrationSql).toContain("'item'");
    expect(migrationSql).toContain("'available_work_unavailable'");
  });

  it('uses security-definer RPC posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_available_work_detail(text) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_available_work_detail(text) to authenticated, service_role',
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

  it('resolves the opaque work key only inside current vendor company scope', () => {
    [
      "v_work_key !~ '^[0-9a-f]{64}$'",
      'extensions.digest',
      "'vendor_available_work_v1'",
      'brr.id::text',
      'brr.vendor_company_id::text',
      'where brr.vendor_company_id = v_vendor_company_id',
      'where work_key = v_work_key',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('supports open and history states while preserving AMC/vendor scope guards', () => {
    [
      "br.status in ('sent', 'partially_responded', 'closed', 'expired')",
      "brr.status in ('pending', 'sent', 'viewed', 'responded', 'declined', 'selected', 'not_selected', 'expired')",
      "coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'",
      "cr.relationship_type = 'amc_vendor'",
      "cr.status = 'active'",
      "cvp.vendor_status not in ('inactive', 'do_not_use')",
      "when response.selected_at is not null or brr.status = 'selected' then 'selected'",
      "when brr.status = 'not_selected' then 'not_selected'",
      "when brr.status = 'declined' then 'declined'",
      "then 'expired'",
      "when response.submitted_at is not null or brr.status = 'responded' then 'submitted'",
      "when brr.status = 'viewed' then 'viewed'",
      "else 'available'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('returns only vendor-safe detail, history, and vendor-visible document metadata fields', () => {
    [
      'work_key',
      'status',
      'selection_outcome',
      'bid_due_at',
      'requested_due_date',
      'requested_turn_time_days',
      'expired_at',
      'order',
      'owner',
      'summary',
      'instructions',
      'bid',
      'decline',
      'documents',
      'order_number',
      'property_address',
      'city',
      'state',
      'postal_code',
      'county',
      'property_type',
      'report_type',
      'company_name',
      'documents_available',
      'fee_amount',
      'currency',
      'turn_time_days',
      'proposed_due_at',
      'comments',
      'submitted_at',
      'reason',
      'declined_at',
      'document_key',
      'category',
      'title',
      'file_name',
      'mime_type',
      'file_size',
      'created_at',
    ].forEach((fieldName) => {
      expect(migrationSql).toContain(`'${fieldName}'`);
    });

    expect(migrationSql).toContain("od.status = 'active'");
    expect(migrationSql).toContain("od.visibility_scope = 'vendor'");
  });

  it('does not expose denylisted raw or internal fields in the JSON payload', () => {
    [
      'recipient_id',
      'bid_request_id',
      'order_id',
      'vendor_profile_id',
      'relationship_id',
      'document_id',
      'storage_bucket',
      'storage_path',
      'token_hash',
      'token_last_four',
      'token',
      'candidate_snapshot',
      'score',
      'client_fee',
      'amc_margin',
      'internal_notes',
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
    expect(migrationSql).toContain('does not mutate bids, responses, assignments, orders');
  });
});
