import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260603112000_amc_assignment_invitation_read_respond_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC assignment invitation read/respond RPC migration', () => {
  it('creates public token read and respond RPCs with the expected security posture', () => {
    [
      'create or replace function public.rpc_order_company_assignment_invitation_read',
      'p_token text',
      'create or replace function public.rpc_order_company_assignment_invitation_respond',
      'p_action text',
      'p_reason text default null',
      'returns jsonb',
      'security definer',
      'set search_path = public',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('grants execute to public app roles without direct table grants', () => {
    [
      'revoke all privileges on table public.order_company_assignment_invitations from public, anon, authenticated',
      'revoke all privileges on table public.order_company_assignments from public, anon, authenticated',
      'revoke all on function public.rpc_order_company_assignment_invitation_read(text) from public',
      'revoke all on function public.rpc_order_company_assignment_invitation_respond(text, text, text) from public',
      'grant execute on function public.rpc_order_company_assignment_invitation_read(text) to anon, authenticated, service_role',
      'grant execute on function public.rpc_order_company_assignment_invitation_respond(text, text, text) to anon, authenticated, service_role',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    [
      'grant select on public.order_company_assignment_invitations to anon',
      'grant update on public.order_company_assignment_invitations to anon',
      'grant update on public.order_company_assignments to anon',
      'grant all privileges on table public.order_company_assignment_invitations to authenticated',
    ].forEach((forbiddenGrant) => {
      expect(migrationSql).not.toContain(forbiddenGrant);
    });
  });

  it('uses schema-qualified token hashing and a constant token lifecycle failure response', () => {
    expect(migrationSql).toContain("v_token text := lower(btrim(coalesce(p_token, '')))");
    expect(migrationSql).toContain("v_token !~ '^[0-9a-f]{64}$'");
    expect(migrationSql).toContain("v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex')");
    expect(migrationSql).not.toMatch(/(?<!extensions\.)\bdigest\(/);
    expect(migrationSql).toContain("'ok', false");
    expect(migrationSql).toContain("'error', 'assignment_invitation_invalid_or_expired'");
    expect(migrationSql).toContain('return v_failure');
  });

  it('validates token, invitation lifecycle, offered vendor assignment, AMC scope, and active relationship', () => {
    [
      'v_invitation.revoked_at is not null',
      'v_invitation.accepted_at is not null',
      'v_invitation.declined_at is not null',
      'v_invitation.expires_at <= now()',
      "v_assignment.status <> 'offered'",
      "v_assignment.assignment_type <> 'vendor_appraisal'",
      'v_assignment.expires_at is not null',
      'v_assignment.expires_at <= now()',
      "coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'",
      "v_relationship.relationship_type <> 'amc_vendor'",
      "v_relationship.status <> 'active'",
      'v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type)',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('rechecks denormalized invitation consistency before returning or mutating data', () => {
    [
      'v_assignment.id is distinct from v_invitation.assignment_id',
      'v_assignment.order_id is distinct from v_invitation.order_id',
      'v_assignment.owner_company_id is distinct from v_invitation.owner_company_id',
      'v_assignment.assigned_company_id is distinct from v_invitation.assigned_company_id',
      'v_assignment.relationship_id is distinct from v_invitation.relationship_id',
      'coalesce(v_order.company_id, public.default_company_id()) is distinct from v_assignment.owner_company_id',
      'v_relationship.source_company_id is distinct from v_assignment.owner_company_id',
      'v_relationship.target_company_id is distinct from v_assignment.assigned_company_id',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('validates vendor profile and selected contact eligibility where feasible', () => {
    [
      'from public.company_vendor_profiles cvp',
      'cvp.owner_company_id = v_assignment.owner_company_id',
      'cvp.vendor_company_id = v_assignment.assigned_company_id',
      "v_profile.vendor_status in ('inactive', 'do_not_use')",
      'v_profile.relationship_id is distinct from v_assignment.relationship_id',
      'if v_invitation.vendor_contact_id is not null then',
      'vc.id = v_invitation.vendor_contact_id',
      'vc.vendor_profile_id = v_profile.id',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('read RPC updates invitation open telemetry only', () => {
    const readRpc = migrationSql.slice(
      migrationSql.indexOf('create or replace function public.rpc_order_company_assignment_invitation_read'),
      migrationSql.indexOf('create or replace function public.rpc_order_company_assignment_invitation_respond'),
    );

    [
      'update public.order_company_assignment_invitations inv',
      'opened_at = coalesce(inv.opened_at, now())',
      'last_opened_at = now()',
      'open_count = inv.open_count + 1',
      'updated_at = now()',
    ].forEach((sqlSnippet) => {
      expect(readRpc).toContain(sqlSnippet);
    });

    [
      'update public.order_company_assignments',
      'update public.orders',
      'insert into public.order_company_assignment_activity',
      'insert into public.notifications',
      'send_email',
      'email_queue',
      'report_submission',
    ].forEach((forbiddenSnippet) => {
      expect(readRpc).not.toContain(forbiddenSnippet);
    });
  });

  it('read RPC returns only the allowlisted public assignment offer payload', () => {
    const readReturnBody = migrationSql.slice(
      migrationSql.indexOf("return jsonb_build_object(\n    'ok', true"),
      migrationSql.indexOf('create or replace function public.rpc_order_company_assignment_invitation_respond'),
    );

    [
      "'access_mode', 'assignment_offer_token'",
      "'invitation'",
      "'status', 'offered'",
      "'can_accept', true",
      "'can_decline', true",
      "'vendor'",
      "'company_name'",
      "'contact_name'",
      "'contact_email'",
      "'owner'",
      "'order'",
      "'order_number'",
      "'property_address'",
      "'postal_code'",
      "'county'",
      "'property_type'",
      "'report_type'",
      "'assignment'",
      "'offered_at'",
      "'due_at'",
      "'review_due_at'",
      "'instructions'",
      "'fee_amount'",
      "'currency'",
      "'turn_time_days'",
      "'proposed_due_at'",
      "'comments'",
    ].forEach((sqlSnippet) => {
      expect(readReturnBody).toContain(sqlSnippet);
    });

    [
      "'assignment_id'",
      "'order_id'",
      "'owner_company_id'",
      "'assigned_company_id'",
      "'relationship_id'",
      "'vendor_profile_id'",
      "'vendor_company_id'",
      "'bid_response_id'",
      "'candidate_score'",
      "'candidate_scores'",
      "'client_fee'",
      "'client_invoice_amount'",
      "'amc_margin'",
      "'metadata'",
      "'terms'",
      "'handoff_payload'",
    ].forEach((internalField) => {
      expect(readReturnBody).not.toContain(internalField);
    });
  });

  it('respond RPC locks invitation and assignment rows before accepting or declining', () => {
    const respondRpc = migrationSql.slice(
      migrationSql.indexOf('create or replace function public.rpc_order_company_assignment_invitation_respond'),
    );

    expect(respondRpc).toMatch(/from public\.order_company_assignment_invitations inv[\s\S]*for update/);
    expect(respondRpc).toMatch(/from public\.order_company_assignments oca[\s\S]*for update/);
  });

  it('validates action only after token lifecycle validation has passed', () => {
    const respondRpc = migrationSql.slice(
      migrationSql.indexOf('create or replace function public.rpc_order_company_assignment_invitation_respond'),
    );
    const actionValidationIndex = respondRpc.indexOf("v_action not in ('accept', 'decline')");
    const relationshipValidationIndex = respondRpc.indexOf("v_relationship.status <> 'active'");

    expect(actionValidationIndex).toBeGreaterThan(relationshipValidationIndex);
    expect(respondRpc).toContain("'error', 'assignment_response_invalid'");
    expect(respondRpc).toContain("'field_errors'");
    expect(respondRpc).toContain("'action', 'Choose accept or decline.'");
  });

  it('accepts an offered assignment and stamps invitation accepted_at', () => {
    [
      "if v_action = 'accept' then",
      'update public.order_company_assignments',
      "set status = 'accepted'",
      'accepted_at = v_responded_at',
      'update public.order_company_assignment_invitations',
      'set accepted_at = v_responded_at',
      "'status', 'accepted'",
      "'message', 'Assignment accepted.'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('declines an offered assignment, stamps invitation declined_at, and stores optional reason', () => {
    [
      'update public.order_company_assignments',
      "set status = 'declined'",
      'declined_at = v_responded_at',
      'submission_payload = case',
      "jsonb_set(\n             coalesce(submission_payload, '{}'::jsonb),\n             '{decline_reason}',",
      'update public.order_company_assignment_invitations',
      'set declined_at = v_responded_at',
      "'decline_reason', v_reason",
      "'status', 'declined'",
      "'message', 'Assignment declined.'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('logs and notifies through existing assignment helpers without email behavior', () => {
    [
      'public.log_order_company_assignment_event',
      'public.notify_order_company_assignment_event',
      "'assignment.accepted'",
      "'assignment.declined'",
      "'responded_via', 'token_assignment_invitation'",
      'v_assignment.assigned_company_id',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    [
      'update public.orders',
      'insert into public.orders',
      'insert into public.order_documents',
      'insert into public.email_queue',
      'send_email',
      'resend',
      'edge function',
      'report_submission',
    ].forEach((forbiddenSnippet) => {
      expect(migrationSql.toLowerCase()).not.toContain(forbiddenSnippet);
    });
  });

  it('documents no raw payload, no internal id, no order mutation, and no email boundaries', () => {
    [
      'Does not expose raw terms',
      'raw handoff_payload',
      'internal ids',
      'client fee',
      'AMC margin',
      'assignment lifecycle mutation',
      'report submission',
      'order mutation',
      'does not mutate orders',
      'create report submissions',
      'send email',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });
});
