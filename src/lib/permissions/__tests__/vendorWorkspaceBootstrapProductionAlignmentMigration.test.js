import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260610130000_vendor_workspace_bootstrap_production_alignment.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');
const normalizedSql = migrationSql.replace(/\s+/g, ' ');

describe('Vendor Workspace bootstrap production alignment migration', () => {
  it('replaces the vendor workspace bootstrap RPC with production auth-user alignment', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_bootstrap()');
    expect(migrationSql).toContain('v_auth_user_id uuid := auth.uid()');
    expect(migrationSql).toContain("v_auth_claims ->> 'email'");
    expect(migrationSql).toContain('v_user_id uuid := public.current_app_user_id()');
  });

  it('creates or links the public app user when a matching auth account is new', () => {
    [
      'select *',
      'from public.users u',
      'where u.auth_id = v_auth_user_id',
      'lower(u.email) = v_auth_email',
      'update public.users u',
      'set auth_id = coalesce(u.auth_id, v_auth_user_id)',
      'insert into public.users',
      "'appraiser'",
      "'active'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('still requires an active vendor contact, profile, company, and AMC relationship match', () => {
    [
      'from public.vendor_contacts vc',
      'join public.company_vendor_profiles cvp',
      "vendor_company.status = 'active'",
      "cr.relationship_type = 'amc_vendor'",
      "cr.status = 'active'",
      "lower(btrim(coalesce(vc.email, ''))) = v_auth_email",
      '(vc.user_id is null or vc.user_id = v_user_id)',
      "cvp.vendor_status not in ('inactive', 'do_not_use')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('creates vendor membership and Vendor Admin role, then returns vendor permission diagnostics', () => {
    [
      'insert into public.company_memberships',
      "'vendor_workspace_contact'",
      'insert into public.user_role_assignments',
      "lower(r.name) = lower('Vendor Admin')",
      'current_app_user_permission_keys_for_company(v_match.vendor_company_id)',
      "'permission_keys'",
      "'has_vendor_workspace_view'",
      "'vendor_workspace.view' = any",
      "'diagnostics'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('keeps bootstrap side effects limited to identity, membership, role, and contact linkage', () => {
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
