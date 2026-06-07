import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260603103000_amc_vendor_bid_invitation_foundation.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC vendor bid invitation foundation migration', () => {
  it('creates the recipient-scoped invitation ledger table', () => {
    expect(migrationSql).toContain(
      'create table if not exists public.order_vendor_bid_request_recipient_invitations',
    );
    [
      'recipient_id uuid not null',
      'bid_request_id uuid not null',
      'order_id uuid not null',
      'vendor_profile_id uuid not null',
      'vendor_company_id uuid not null',
      'vendor_contact_id uuid null',
      'token_hash text not null unique',
      'token_last_four text not null',
      'sent_to_email text not null',
      'expires_at timestamptz not null',
      'opened_at timestamptz null',
      'last_opened_at timestamptz null',
      'open_count integer not null default 0',
      'submitted_at timestamptz null',
      'revoked_at timestamptz null',
      'created_by_user_id uuid null',
    ].forEach((columnSql) => {
      expect(migrationSql).toContain(columnSql);
    });
  });

  it('adds token, email, metadata, and open-count constraints', () => {
    [
      'order_vendor_bid_request_recipient_invitations_email_valid',
      'order_vendor_bid_request_recipient_invitations_token_last_four_valid',
      'order_vendor_bid_request_recipient_invitations_hash_valid',
      'order_vendor_bid_request_recipient_invitations_open_count_non_negative',
      'order_vendor_bid_request_recipient_invitations_metadata_object',
    ].forEach((constraintName) => {
      expect(migrationSql).toContain(constraintName);
    });

    expect(migrationSql).toContain("token_hash ~ '^[0-9a-f]{64}$'");
    expect(migrationSql).toContain("token_last_four ~ '^[0-9a-f]{4}$'");
    expect(migrationSql).toContain("jsonb_typeof(metadata) = 'object'");
  });

  it('adds the expected indexes including active-recipient lookup', () => {
    [
      'idx_order_vendor_bid_invitations_recipient',
      'idx_order_vendor_bid_invitations_bid_request',
      'idx_order_vendor_bid_invitations_order',
      'idx_order_vendor_bid_invitations_vendor_profile',
      'idx_order_vendor_bid_invitations_sent_to_email',
      'idx_order_vendor_bid_invitations_expires_at',
      'idx_order_vendor_bid_invitations_active_recipient',
    ].forEach((indexName) => {
      expect(migrationSql).toContain(indexName);
    });

    expect(migrationSql).toContain('where revoked_at is null');
    expect(migrationSql).toContain('and submitted_at is null');
  });

  it('enforces denormalized recipient/request/order/vendor/contact consistency', () => {
    expect(migrationSql).toContain('create or replace function public.tg_order_vendor_bid_invitation_guard');
    expect(migrationSql).toContain('Bid invitation request must match recipient request');
    expect(migrationSql).toContain('Bid invitation order must match bid request order');
    expect(migrationSql).toContain('Bid invitation vendor profile must match recipient vendor profile');
    expect(migrationSql).toContain('Bid invitation vendor company must match recipient vendor company');
    expect(migrationSql).toContain('Bid invitation vendor contact must belong to recipient vendor profile');
  });

  it('keeps invitation storage RPC-only and service-role direct access only', () => {
    expect(migrationSql).toContain(
      'alter table public.order_vendor_bid_request_recipient_invitations enable row level security',
    );
    expect(migrationSql).toContain(
      'revoke all privileges on table public.order_vendor_bid_request_recipient_invitations from public, anon, authenticated',
    );
    expect(migrationSql).toContain(
      'grant all privileges on table public.order_vendor_bid_request_recipient_invitations to service_role',
    );
  });

  it('creates authenticated coordinator create RPC only', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_order_vendor_bid_invitation_create',
    );
    expect(migrationSql).toContain('p_recipient_id uuid');
    expect(migrationSql).toContain("current_app_user_has_permission('bid_requests.update')");
    expect(migrationSql).toContain("raise exception 'bid_request_update_permission_required'");
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_order_vendor_bid_invitation_create(uuid, jsonb) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_order_vendor_bid_invitation_create(uuid, jsonb) to authenticated, service_role',
    );

    expect(migrationSql).not.toContain('rpc_order_vendor_bid_invitation_read');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_invitation_submit');
  });

  it('validates AMC scope, open request/recipient states, vendor consistency, email, and expiration', () => {
    [
      "coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'",
      "v_request.status in ('cancelled', 'expired', 'closed')",
      "v_recipient.status not in ('pending', 'sent', 'viewed')",
      "v_profile.vendor_status in ('inactive', 'do_not_use')",
      "v_relationship.relationship_type <> 'amc_vendor'",
      "v_relationship.status <> 'active'",
      'bid_invitation_email_required',
      'bid_invitation_expiration_invalid',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('generates, hashes, stores, and returns tokens according to doctrine', () => {
    expect(migrationSql).toContain("v_token := encode(extensions.gen_random_bytes(32), 'hex')");
    expect(migrationSql).toContain("v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex')");
    expect(migrationSql).toContain('v_token_last_four := right(v_token, 4)');
    expect(migrationSql).toContain('v_path := \'/vendor/bid-invitations/\' || v_token');
    expect(migrationSql).toContain("'token', v_token");
    expect(migrationSql).toContain("'path', v_path");
    expect(migrationSql).toContain("'link', v_path");
    expect(migrationSql).toContain('Plaintext token values must never be stored.');
  });

  it('revokes prior unsubmitted invitations and preserves current manual bid workflow', () => {
    expect(migrationSql).toContain('update public.order_vendor_bid_request_recipient_invitations');
    expect(migrationSql).toContain('revoked_by_invitation_reissue');
    expect(migrationSql).toContain('and submitted_at is null');

    expect(migrationSql).not.toContain('insert into public.order_vendor_bid_responses');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_response_record');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_response_select');
    expect(migrationSql).not.toContain('update public.order_vendor_bid_request_recipients');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('insert into public.email_queue');
    expect(migrationSql).not.toMatch(/path\s*=\s*'\/amc\//i);
  });
});
