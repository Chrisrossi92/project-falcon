import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260603104000_amc_vendor_bid_invitation_read_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC vendor bid invitation read RPC migration', () => {
  it('creates the public token read RPC with the expected signature and security posture', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_order_vendor_bid_invitation_read',
    );
    expect(migrationSql).toContain('p_token text');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
  });

  it('grants execute to public app roles without granting direct invitation table access', () => {
    expect(migrationSql).toContain(
      'revoke all privileges on table public.order_vendor_bid_request_recipient_invitations from public, anon, authenticated',
    );
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_order_vendor_bid_invitation_read(text) from public',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_order_vendor_bid_invitation_read(text) to anon, authenticated, service_role',
    );

    expect(migrationSql).not.toContain(
      'grant select on public.order_vendor_bid_request_recipient_invitations to anon',
    );
    expect(migrationSql).not.toContain(
      'grant all privileges on table public.order_vendor_bid_request_recipient_invitations to authenticated',
    );
  });

  it('hashes a well-formed token and uses a constant failure response', () => {
    expect(migrationSql).toContain("v_token !~ '^[0-9a-f]{64}$'");
    expect(migrationSql).toContain("v_token_hash := encode(digest(v_token, 'sha256'), 'hex')");
    expect(migrationSql).toContain("'ok', false");
    expect(migrationSql).toContain("'error', 'bid_invitation_invalid_or_expired'");
    expect(migrationSql).toContain('return v_failure');
  });

  it('validates revoked, expired, submitted, request, recipient, AMC scope, vendor, and relationship states', () => {
    [
      'v_invitation.revoked_at is not null',
      'v_invitation.submitted_at is not null',
      'v_invitation.expires_at <= now()',
      "v_request.status not in ('sent', 'partially_responded')",
      "v_recipient.status not in ('pending', 'sent', 'viewed')",
      "coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'",
      "v_profile.vendor_status in ('inactive', 'do_not_use')",
      "v_relationship.relationship_type <> 'amc_vendor'",
      "v_relationship.status <> 'active'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('rechecks denormalized invitation consistency before returning data', () => {
    [
      'v_recipient.bid_request_id is distinct from v_invitation.bid_request_id',
      'v_recipient.vendor_profile_id is distinct from v_invitation.vendor_profile_id',
      'v_recipient.vendor_company_id is distinct from v_invitation.vendor_company_id',
      'v_request.order_id is distinct from v_invitation.order_id',
      'v_profile.vendor_company_id is distinct from v_invitation.vendor_company_id',
      'v_relationship.source_company_id is distinct from v_profile.owner_company_id',
      'v_relationship.target_company_id is distinct from v_invitation.vendor_company_id',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('updates invitation open tracking only on valid reads', () => {
    expect(migrationSql).toContain('update public.order_vendor_bid_request_recipient_invitations inv');
    expect(migrationSql).toContain('opened_at = coalesce(inv.opened_at, now())');
    expect(migrationSql).toContain('last_opened_at = now()');
    expect(migrationSql).toContain('open_count = inv.open_count + 1');
    expect(migrationSql).toContain('updated_at = now()');

    expect(migrationSql).not.toContain('update public.order_vendor_bid_request_recipients');
    expect(migrationSql).not.toContain('update public.order_vendor_bid_requests');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('insert into public.order_vendor_bid_responses');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_response_record');
  });

  it('returns the limited Vendor Order Detail payload shape', () => {
    [
      "'ok', true",
      "'access_mode', 'token_invitation'",
      "'invitation'",
      "'status', 'available_to_bid'",
      "'can_submit', true",
      "'vendor'",
      "'company_name'",
      "'contact_name'",
      "'contact_email'",
      "'order'",
      "'order_number'",
      "'property_address'",
      "'postal_code'",
      "'property_type'",
      "'report_type'",
      "'site_visit_at'",
      "'client_due_at'",
      "'final_due_at'",
      "'status_label', 'Available to Bid'",
      "'bid_request'",
      "'request_message'",
      "'response_due_at'",
      "'desired_vendor_due_at'",
      "'status', 'open'",
      "'response', null",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('does not expose known sensitive fields in the returned JSON payload', () => {
    const returnBody = migrationSql.slice(migrationSql.indexOf('return jsonb_build_object('));

    [
      "'client_id'",
      "'managing_amc_id'",
      "'company_id'",
      "'relationship_id'",
      "'vendor_profile_id'",
      "'vendor_company_id'",
      "'recipient_id'",
      "'bid_request_id'",
      "'invitation_id'",
      "'base_fee'",
      "'fee_amount'",
      "'appraiser_fee'",
      "'appraiser_split'",
      "'split_pct'",
      "'client_invoice_amount'",
      "'candidate_snapshot'",
      "'selected_response_id'",
      "'selected_vendor_company_id'",
      "'selected_by_user_id'",
      "'notes'",
      "'internal_notes'",
      "'reviewer_id'",
      "'current_reviewer_id'",
      "'appraiser_id'",
      "'metadata'",
    ].forEach((sensitiveField) => {
      expect(returnBody).not.toContain(sensitiveField);
    });
  });

  it('documents the no-mutation and no-leak boundary', () => {
    expect(migrationSql).toContain('updates invitation open tracking only');
    expect(migrationSql).toContain('Does not update recipient lifecycle');
    expect(migrationSql).toContain('record bid responses');
    expect(migrationSql).toContain('mutate orders or requests');
    expect(migrationSql).toContain('expose internal ids');
    expect(migrationSql).toContain('grant direct table access');
  });
});
