import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260626110000_refine_vendor_bid_invitation_read_status.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('vendor bid invitation read status refinement migration', () => {
  it('replaces only the public token read RPC with the existing signature and grants', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_order_vendor_bid_invitation_read');
    expect(migrationSql).toContain('p_token text');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_order_vendor_bid_invitation_read(text) to anon, authenticated, service_role',
    );
  });

  it('returns safe closed-token statuses for expired, submitted, and unavailable invitations', () => {
    [
      "'error', 'bid_invitation_expired'",
      "'status', 'expired'",
      "'reason', 'expired'",
      "'error', 'bid_invitation_already_submitted'",
      "'status', 'submitted'",
      "'reason', 'already_submitted'",
      "'error', 'bid_invitation_unavailable'",
      "'status', 'unavailable'",
      "'reason', 'revoked'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('classifies closed links from existing invitation and recipient fields', () => {
    [
      'v_invitation.revoked_at is not null',
      'v_invitation.submitted_at is not null',
      'v_invitation.expires_at <= now()',
      "v_recipient.status in ('responded', 'selected', 'not_selected')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('keeps valid open invitation behavior and open tracking unchanged', () => {
    [
      "'access_mode', 'token_invitation'",
      "'status', 'available_to_bid'",
      "'can_submit', true",
      'update public.order_vendor_bid_request_recipient_invitations inv',
      'opened_at = coalesce(inv.opened_at, now())',
      'last_opened_at = now()',
      'open_count = inv.open_count + 1',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('does not add bid submission, order mutation, assignment, notification, or email behavior', () => {
    [
      'insert into public.order_vendor_bid_responses',
      'update public.orders',
      'insert into public.order_company_assignments',
      'insert into public.notifications',
      'insert into public.email_queue',
      'net.http_post',
      'resend',
    ].forEach((forbiddenSnippet) => {
      expect(migrationSql.toLowerCase()).not.toContain(forbiddenSnippet);
    });
  });
});
