import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260603110000_amc_assignment_invitation_foundation.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC assignment invitation foundation migration', () => {
  it('creates the assignment invitation table with token and lifecycle columns', () => {
    expect(migrationSql).toContain('create table if not exists public.order_company_assignment_invitations');
    [
      'assignment_id uuid not null references public.order_company_assignments(id) on delete cascade',
      'order_id uuid not null references public.orders(id) on delete cascade',
      'owner_company_id uuid not null references public.companies(id) on delete restrict',
      'assigned_company_id uuid not null references public.companies(id) on delete restrict',
      'relationship_id uuid not null references public.company_relationships(id) on delete restrict',
      'vendor_contact_id uuid null references public.vendor_contacts(id) on delete set null',
      'token_hash text not null unique',
      'token_last_four text not null',
      'sent_to_email text not null',
      'expires_at timestamptz not null',
      'accepted_at timestamptz null',
      'declined_at timestamptz null',
      'revoked_at timestamptz null',
      "metadata jsonb not null default '{}'::jsonb",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('stores only token hash and last four, never plaintext token column storage', () => {
    expect(migrationSql).toContain('token_hash text not null unique');
    expect(migrationSql).toContain('token_last_four text not null');
    expect(migrationSql).not.toMatch(/\btoken text\b/);
    expect(migrationSql).not.toMatch(/\bplaintext_token\b/);
    expect(migrationSql).not.toMatch(/\braw_token\b/);
  });

  it('adds constraints and indexes for active invitation lookup', () => {
    [
      'order_company_assignment_invitations_email_valid',
      'order_company_assignment_invitations_token_last_four_valid',
      'order_company_assignment_invitations_hash_valid',
      'order_company_assignment_invitations_open_count_non_negative',
      'order_company_assignment_invitations_metadata_object',
      'idx_order_company_assignment_invitations_assignment',
      'idx_order_company_assignment_invitations_order',
      'idx_order_company_assignment_invitations_owner_company',
      'idx_order_company_assignment_invitations_assigned_company',
      'idx_order_company_assignment_invitations_relationship',
      'idx_order_company_assignment_invitations_sent_to_email',
      'idx_order_company_assignment_invitations_expires_at',
      'idx_order_company_assignment_invitations_active_assignment',
      'where accepted_at is null',
      'and declined_at is null',
      'and revoked_at is null',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('enables RLS and keeps table access RPC-only for app roles', () => {
    [
      'alter table public.order_company_assignment_invitations enable row level security',
      'revoke all privileges on table public.order_company_assignment_invitations from public, anon, authenticated',
      'grant all privileges on table public.order_company_assignment_invitations to service_role',
      'revoke all on function public.rpc_order_company_assignment_invitation_create(uuid, jsonb) from public, anon',
      'grant execute on function public.rpc_order_company_assignment_invitation_create(uuid, jsonb) to authenticated, service_role',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    [
      'grant select on public.order_company_assignment_invitations to anon',
      'grant insert on public.order_company_assignment_invitations to authenticated',
      'grant update on public.order_company_assignment_invitations to authenticated',
    ].forEach((forbiddenGrant) => {
      expect(migrationSql).not.toContain(forbiddenGrant);
    });
  });

  it('creates a consistency guard for denormalized assignment fields', () => {
    [
      'create or replace function public.tg_order_company_assignment_invitation_guard()',
      'order_company_assignment_invitations.assignment_id is immutable',
      'order_company_assignment_invitations.order_id is immutable',
      'order_company_assignment_invitations.owner_company_id is immutable',
      'order_company_assignment_invitations.assigned_company_id is immutable',
      'order_company_assignment_invitations.relationship_id is immutable',
      'order_company_assignment_invitations.token_hash is immutable',
      'Assignment invitation order must match assignment order',
      'Assignment invitation owner company must match assignment owner company',
      'Assignment invitation assigned company must match assignment assigned company',
      'Assignment invitation relationship must match assignment relationship',
      'Assignment invitation vendor contact must belong to assigned vendor company',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('creates the authenticated owner/coordinator create RPC', () => {
    [
      'create or replace function public.rpc_order_company_assignment_invitation_create',
      'p_assignment_id uuid',
      "p_payload jsonb default '{}'::jsonb",
      'returns jsonb',
      'security definer',
      'set search_path = public',
      'v_actor_user_id uuid := public.current_app_user_id()',
      'v_company_id uuid := public.current_company_id()',
      'current_company_membership_required',
      "current_app_user_has_permission('order_company_assignments.offer')",
      "jsonb_typeof(v_payload) <> 'object'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('uses schema-qualified pgcrypto token generation and hashing only', () => {
    expect(migrationSql).toContain("v_token := encode(extensions.gen_random_bytes(32), 'hex')");
    expect(migrationSql).toContain("v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex')");
    expect(migrationSql).not.toMatch(/(?<!extensions\.)\bgen_random_bytes\(/);
    expect(migrationSql).not.toMatch(/(?<!extensions\.)\bdigest\(/);
  });

  it('validates owner company, AMC order scope, offered status, vendor assignment type, and active relationship', () => {
    [
      'if v_assignment.owner_company_id <> v_company_id then',
      "v_assignment.assignment_type <> 'vendor_appraisal'",
      "v_assignment.status <> 'offered'",
      "coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'",
      "v_relationship.source_company_id <> v_company_id",
      'v_relationship.target_company_id <> v_assignment.assigned_company_id',
      "v_relationship.relationship_type <> 'amc_vendor'",
      "v_relationship.status <> 'active'",
      'v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type)',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('validates vendor profile, optional vendor contact, email, and future expiration', () => {
    [
      'from public.company_vendor_profiles cvp',
      'cvp.owner_company_id = v_company_id',
      'cvp.vendor_company_id = v_assignment.assigned_company_id',
      "v_profile.vendor_status in ('inactive', 'do_not_use')",
      "v_contact_id := nullif(btrim(v_payload ->> 'vendor_contact_id'), '')::uuid",
      'v_contact.vendor_profile_id <> v_profile.id',
      "v_sent_to_email := lower(nullif(btrim(v_payload ->> 'sent_to_email'), ''))",
      'vc.receives_assignment_notifications desc',
      'vc.is_primary desc',
      "v_sent_to_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'",
      "v_assignment.expires_at",
      "now() + interval '7 days'",
      'if v_expires_at <= now() then',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('revokes prior active invitations before inserting a new one', () => {
    [
      'update public.order_company_assignment_invitations',
      'set revoked_at = now()',
      "'revoked_reason', 'superseded_by_new_assignment_invitation'",
      'where assignment_id = v_assignment.id',
      'and accepted_at is null',
      'and declined_at is null',
      'and revoked_at is null',
      'insert into public.order_company_assignment_invitations',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('returns token and vendor assignment offer path once from create RPC', () => {
    const returnBody = migrationSql.slice(migrationSql.lastIndexOf('return jsonb_build_object('));

    [
      "v_path := '/vendor/assignment-offers/' || v_token",
      "'invitation_id', v_invitation_id",
      "'assignment_id', v_assignment.id",
      "'order_id', v_assignment.order_id",
      "'sent_to_email', v_sent_to_email",
      "'expires_at', v_expires_at",
      "'token', v_token",
      "'path', v_path",
      "'link', v_path",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    expect(returnBody).not.toContain("'token_hash'");
    expect(returnBody).not.toContain("'token_last_four'");
  });

  it('does not add public read/respond RPCs or mutate assignment lifecycle status', () => {
    [
      'rpc_order_company_assignment_invitation_read',
      'rpc_order_company_assignment_invitation_accept',
      'rpc_order_company_assignment_invitation_decline',
      'rpc_order_company_assignment_invitation_respond',
      'grant execute on function public.rpc_order_company_assignment_invitation_create(uuid, jsonb) to anon',
      "set status = 'accepted'",
      "set status = 'declined'",
      'accepted_by_user_id',
      'declined_by_user_id',
      'accepted_at = now()',
      'declined_at = now()',
      'update public.orders',
      'insert into public.notifications',
      'send_email',
    ].forEach((forbiddenSnippet) => {
      expect(migrationSql).not.toContain(forbiddenSnippet);
    });

    expect(migrationSql).toContain('does not mutate assignment lifecycle status');
    expect(migrationSql).toContain('No public assignment offer page yet');
  });
});
