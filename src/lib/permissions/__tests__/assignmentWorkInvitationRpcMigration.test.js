import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260603113000_amc_assignment_work_invitation_rpcs.sql',
);
const offerMigrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260603112000_amc_assignment_invitation_read_respond_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');
const offerMigrationSql = readFileSync(offerMigrationPath, 'utf8');

describe('AMC assignment work invitation RPC migration', () => {
  it('creates a separate work-token table and public work RPCs', () => {
    [
      'create table if not exists public.order_company_assignment_work_invitations',
      'create or replace function public.rpc_order_company_assignment_work_invitation_create',
      'create or replace function public.rpc_order_company_assignment_work_invitation_read',
      'create or replace function public.rpc_order_company_assignment_work_invitation_respond',
      'returns jsonb',
      'security definer',
      'set search_path = public',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('stores token hashes only and returns plaintext tokens only once from create RPC', () => {
    [
      'token_hash text not null unique',
      'token_last_four text not null',
      "v_token := encode(extensions.gen_random_bytes(32), 'hex')",
      "v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex')",
      "v_path := '/vendor/assignment-work/' || v_token",
      "'token', v_token",
      "'path', v_path",
      "'link', v_path",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    expect(migrationSql).not.toContain('token text not null');
    expect(migrationSql).not.toMatch(/(?<!extensions\.)\bgen_random_bytes\(/);
    expect(migrationSql).not.toMatch(/(?<!extensions\.)\bdigest\(/);
  });

  it('uses RPC-only table access posture with public read/respond execute grants', () => {
    [
      'alter table public.order_company_assignment_work_invitations enable row level security',
      'revoke all privileges on table public.order_company_assignment_work_invitations from public, anon, authenticated',
      'grant all privileges on table public.order_company_assignment_work_invitations to service_role',
      'grant execute on function public.rpc_order_company_assignment_work_invitation_create(uuid, jsonb) to authenticated, service_role',
      'grant execute on function public.rpc_order_company_assignment_work_invitation_read(text) to anon, authenticated, service_role',
      'grant execute on function public.rpc_order_company_assignment_work_invitation_respond(text, text, jsonb) to anon, authenticated, service_role',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    [
      'grant select on public.order_company_assignment_work_invitations to anon',
      'grant update on public.order_company_assignment_work_invitations to anon',
      'grant update on public.order_company_assignments to anon',
      'grant all privileges on table public.order_company_assignment_work_invitations to authenticated',
    ].forEach((forbiddenGrant) => {
      expect(migrationSql).not.toContain(forbiddenGrant);
    });
  });

  it('does not modify the existing assignment offer token behavior', () => {
    expect(offerMigrationSql).toContain('v_invitation.accepted_at is not null');
    expect(offerMigrationSql).toContain('v_invitation.declined_at is not null');
    expect(offerMigrationSql).toContain("v_assignment.status <> 'offered'");
    expect(migrationSql).not.toContain('rpc_order_company_assignment_invitation_read');
    expect(migrationSql).not.toContain('rpc_order_company_assignment_invitation_respond');
  });

  it('validates active accepted or in-progress AMC vendor assignments before creating work links', () => {
    [
      "v_assignment.assignment_type <> 'vendor_appraisal'",
      "v_assignment.status not in ('accepted', 'in_progress')",
      "coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'",
      "v_relationship.relationship_type <> 'amc_vendor'",
      "v_relationship.status <> 'active'",
      'v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type)',
      "v_profile.vendor_status in ('inactive', 'do_not_use')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('revokes prior active work invitations when creating a new work token', () => {
    [
      'update public.order_company_assignment_work_invitations',
      'revoked_at = now()',
      "revoked_reason', 'superseded_by_new_assignment_work_invitation'",
      'where assignment_id = v_assignment.id',
      'and submitted_at is null',
      'and revoked_at is null',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('read RPC allows accepted, in-progress, submitted, and completed work states with a constant failure shape', () => {
    [
      "'error', 'assignment_work_invitation_invalid_or_expired'",
      "v_token !~ '^[0-9a-f]{64}$'",
      "v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex')",
      'v_invitation.revoked_at is not null',
      'v_invitation.expires_at <= now()',
      "v_assignment.status not in ('accepted', 'in_progress', 'submitted', 'completed')",
      "'access_mode', 'assignment_work_token'",
      "'can_start_work', v_assignment.status = 'accepted'",
      "'can_submit_report', v_assignment.status in ('accepted', 'in_progress')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('respond RPC supports only start_work and submit_report with current assignment guards', () => {
    [
      "v_action not in ('start_work', 'submit_report')",
      "'error', 'assignment_work_response_invalid'",
      "if v_action = 'start_work' then",
      "v_assignment.status <> 'accepted'",
      "set status = 'in_progress'",
      "status = 'submitted'",
      "submitted_via', 'token_assignment_work_invitation'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('reuses existing lifecycle activity events without order lifecycle mutation', () => {
    [
      "'assignment.started'",
      "'assignment.submitted'",
      'public.log_order_company_assignment_event',
      'public.notify_order_company_assignment_event',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    [
      'update public.orders',
      "set status = 'inspection_complete'",
      "set status = 'report_in_progress'",
      "'inspection_complete'",
      "'report_in_progress'",
      'vendor_login',
      'authenticated_vendor_workbench',
    ].forEach((forbiddenSnippet) => {
      expect(migrationSql).not.toContain(forbiddenSnippet);
    });
  });

  it('read RPC returns allowlisted public work packet fields only', () => {
    const readReturnBody = migrationSql.slice(
      migrationSql.indexOf("return jsonb_build_object(\n    'ok', true"),
      migrationSql.indexOf('create or replace function public.rpc_order_company_assignment_work_invitation_respond'),
    );

    [
      "'invitation'",
      "'vendor'",
      "'owner'",
      "'order'",
      "'assignment'",
      "'order_number'",
      "'property_address'",
      "'due_at'",
      "'review_due_at'",
      "'instructions'",
      "'fee_amount'",
      "'currency'",
      "'turn_time_days'",
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
      "'bid_response_id'",
      "'candidate_score'",
      "'client_fee'",
      "'amc_margin'",
      "'terms'",
      "'handoff_payload'",
    ].forEach((internalField) => {
      expect(readReturnBody).not.toContain(internalField);
    });
  });
});
