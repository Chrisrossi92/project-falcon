import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260610120000_vendor_workspace_contact_login_bootstrap.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');
const normalizedSql = migrationSql.replace(/\s+/g, ' ');

describe('Vendor Workspace contact login bootstrap migration', () => {
  it('creates the authenticated vendor workspace bootstrap RPC and current-company fallback', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_bootstrap()');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain('create or replace function public.current_company_id()');
    expect(migrationSql).toContain('primary_membership as');
    expect(migrationSql).toContain('order by cm.is_primary desc, cm.joined_at desc nulls last, cm.created_at desc');
  });

  it('matches authenticated vendor users by email to active vendor contacts and relationships', () => {
    [
      "v_auth_claims ->> 'email'",
      'lower(btrim(coalesce(vc.email, \'\')))',
      '(vc.user_id is null or vc.user_id = v_user_id)',
      'join public.company_vendor_profiles cvp',
      'join public.companies vendor_company',
      "vendor_company.status = 'active'",
      'join public.company_relationships cr',
      "cr.relationship_type = 'amc_vendor'",
      "cr.status = 'active'",
      "cvp.vendor_status not in ('inactive', 'do_not_use')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('creates vendor-company membership, assigns Vendor Admin, and links unclaimed contacts only', () => {
    [
      'insert into public.company_memberships',
      "'vendor_workspace_contact'",
      'on conflict (company_id, user_id) do update',
      'insert into public.user_role_assignments',
      'on conflict (company_id, user_id, role_id) do update',
      "lower(r.name) = lower('Vendor Admin')",
      'update public.vendor_contacts vc',
      'where vc.id = v_match.contact_id',
      'and vc.user_id is null',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('preserves execute posture for authenticated callers only', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_bootstrap() from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_bootstrap() to authenticated, service_role',
    );
  });

  it('does not create execution, procurement, notification, email, or token side effects', () => {
    [
      'insert into public.orders',
      'update public.orders',
      'insert into public.order_company_assignments',
      'update public.order_company_assignments',
      'insert into public.order_vendor_bid_requests',
      'insert into public.order_vendor_bid_responses',
      'insert into public.notifications',
      'insert into public.email_queue',
      'insert into public.order_vendor_bid_request_recipient_invitations',
      'gen_random_bytes',
      'token_hash',
    ].forEach((sqlSnippet) => {
      expect(normalizedSql).not.toContain(sqlSnippet);
    });
  });
});
