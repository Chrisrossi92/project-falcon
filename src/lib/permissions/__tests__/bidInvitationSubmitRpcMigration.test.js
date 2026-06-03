import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260603105000_amc_vendor_bid_invitation_submit_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC vendor bid invitation submit RPC migration', () => {
  it('creates the public token submit RPC with the expected signature and security posture', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_order_vendor_bid_invitation_submit',
    );
    expect(migrationSql).toContain('p_token text');
    expect(migrationSql).toContain('p_payload jsonb');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
  });

  it('grants execute to public app roles without granting direct table access', () => {
    [
      'revoke all privileges on table public.order_vendor_bid_request_recipient_invitations from public, anon, authenticated',
      'revoke all privileges on table public.order_vendor_bid_requests from public, anon, authenticated',
      'revoke all privileges on table public.order_vendor_bid_request_recipients from public, anon, authenticated',
      'revoke all privileges on table public.order_vendor_bid_responses from public, anon, authenticated',
      'revoke all on function public.rpc_order_vendor_bid_invitation_submit(text, jsonb) from public',
      'grant execute on function public.rpc_order_vendor_bid_invitation_submit(text, jsonb) to anon, authenticated, service_role',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    [
      'grant select on public.order_vendor_bid_request_recipient_invitations to anon',
      'grant insert on public.order_vendor_bid_responses to anon',
      'grant update on public.order_vendor_bid_request_recipients to anon',
      'grant all privileges on table public.order_vendor_bid_responses to authenticated',
    ].forEach((forbiddenGrant) => {
      expect(migrationSql).not.toContain(forbiddenGrant);
    });
  });

  it('normalizes and hashes the incoming token with a constant lifecycle failure response', () => {
    expect(migrationSql).toContain("v_token text := lower(btrim(coalesce(p_token, '')))");
    expect(migrationSql).toContain("v_token !~ '^[0-9a-f]{64}$'");
    expect(migrationSql).toContain("v_token_hash := encode(digest(v_token, 'sha256'), 'hex')");
    expect(migrationSql).toContain("'ok', false");
    expect(migrationSql).toContain("'error', 'bid_invitation_invalid_or_expired'");
    expect(migrationSql).toContain('return v_failure');
  });

  it('validates invitation, request, recipient, order scope, vendor profile, and relationship lifecycle states', () => {
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
      'from public.order_vendor_bid_responses obr',
      'where obr.recipient_id = v_recipient.id',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('rechecks denormalized invitation consistency before accepting payload validation', () => {
    [
      'v_recipient.bid_request_id is distinct from v_invitation.bid_request_id',
      'v_recipient.vendor_profile_id is distinct from v_invitation.vendor_profile_id',
      'v_recipient.vendor_company_id is distinct from v_invitation.vendor_company_id',
      'v_request.id is distinct from v_recipient.bid_request_id',
      'v_request.order_id is distinct from v_invitation.order_id',
      'v_profile.vendor_company_id is distinct from v_invitation.vendor_company_id',
      'v_relationship.source_company_id is distinct from v_profile.owner_company_id',
      'v_relationship.target_company_id is distinct from v_invitation.vendor_company_id',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('locks invitation, recipient, and request rows to avoid concurrent duplicate submits', () => {
    expect(migrationSql).toMatch(
      /from public\.order_vendor_bid_request_recipient_invitations inv[\s\S]*for update/,
    );
    expect(migrationSql).toMatch(/from public\.order_vendor_bid_request_recipients brr[\s\S]*for update/);
    expect(migrationSql).toMatch(/from public\.order_vendor_bid_requests br[\s\S]*for update/);
    expect(migrationSql).toContain('if exists (');
    expect(migrationSql).toContain('where obr.recipient_id = v_recipient.id');
  });

  it('returns validation errors only after token and lifecycle validation have passed', () => {
    const firstPayloadValidationIndex = migrationSql.indexOf("jsonb_typeof(v_payload) <> 'object'");
    const relationshipValidationIndex = migrationSql.indexOf("v_relationship.status <> 'active'");

    expect(firstPayloadValidationIndex).toBeGreaterThan(relationshipValidationIndex);
    expect(migrationSql).toContain("'error', 'bid_submission_invalid'");
    expect(migrationSql).toContain("'field_errors'");
    expect(migrationSql).toContain("'payload', 'Bid submission payload must be an object.'");
  });

  it('validates public bid submission payload fields', () => {
    [
      "'fee_amount', 'Fee amount is required.'",
      "'fee_amount', 'Fee amount must be numeric.'",
      "'fee_amount', 'Fee amount must be non-negative.'",
      "'currency', 'Currency must be a three-letter code.'",
      "'turn_time_days', 'Turn time must be a non-negative integer.'",
      "'proposed_due_at', 'Proposed due date must be a valid timestamp.'",
      "'timing'",
      "'Provide either turn time days or a proposed due date.'",
      "'contact_email', 'Contact email must be valid.'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('inserts one bid response with token invitation metadata', () => {
    [
      'insert into public.order_vendor_bid_responses',
      'recipient_id',
      'fee_amount',
      'currency',
      'proposed_due_at',
      'turn_time_days',
      'comments',
      'submitted_at',
      "'submitted_via', 'token_invitation'",
      "'invitation_id', v_invitation.id",
      "'token_last_four', v_invitation.token_last_four",
      "'contact_name', v_contact_name",
      "'contact_email', v_contact_email",
      "'contact_phone', v_contact_phone",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('marks recipient responded, sets invitation submitted_at, and advances request status', () => {
    [
      'update public.order_vendor_bid_request_recipients',
      "set status = 'responded'",
      'responded_at = v_submitted_at',
      'update public.order_vendor_bid_request_recipient_invitations',
      'set submitted_at = v_submitted_at',
      "v_request_status := 'partially_responded'",
      "v_request_status := 'closed'",
      'closed_at = case when v_request_status = \'closed\' then coalesce(closed_at, v_submitted_at) else closed_at end',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('returns a compact public success payload without internal ids', () => {
    const successReturnBody = migrationSql.slice(migrationSql.lastIndexOf('return jsonb_build_object('));

    [
      "'ok', true",
      "'status', 'bid_submitted'",
      "'submitted_at', v_submitted_at",
      "'message', 'Your bid has been submitted.'",
    ].forEach((sqlSnippet) => {
      expect(successReturnBody).toContain(sqlSnippet);
    });

    [
      "'recipient_id'",
      "'bid_request_id'",
      "'order_id'",
      "'response_id'",
      "'invitation_id'",
      "'vendor_profile_id'",
      "'vendor_company_id'",
      "'relationship_id'",
    ].forEach((internalField) => {
      expect(successReturnBody).not.toContain(internalField);
    });
  });

  it('does not mutate orders, select bids, create assignments, send email, or notify', () => {
    [
      'update public.orders',
      'insert into public.orders',
      'selected_at =',
      'selected_by_user_id',
      'insert into public.order_company_assignments',
      'update public.order_company_assignments',
      'rpc_order_vendor_bid_response_select',
      'rpc_order_vendor_bid_response_convert_to_assignment_offer',
      'send_email',
      'insert into public.notifications',
      'notify_order_company_assignment_event',
    ].forEach((forbiddenSnippet) => {
      expect(migrationSql).not.toContain(forbiddenSnippet);
    });

    expect(migrationSql).toContain('Does not mutate orders');
    expect(migrationSql).toContain('select bids');
    expect(migrationSql).toContain('create assignment packets');
    expect(migrationSql).toContain('send email');
    expect(migrationSql).toContain('expose internal ids');
  });
});
