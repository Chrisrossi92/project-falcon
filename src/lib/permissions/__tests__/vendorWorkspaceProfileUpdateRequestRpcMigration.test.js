import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260605112000_amc_vendor_workspace_profile_update_requests.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace profile update request RPC migration', () => {
  it('creates an internal review request table with opaque request keys and pending status', () => {
    [
      'create table if not exists public.vendor_profile_update_requests',
      'request_key text not null default encode(extensions.gen_random_bytes(16)',
      "status text not null default 'pending'",
      "check (status in ('pending', 'reviewing', 'approved', 'rejected', 'cancelled'))",
      'request_payload jsonb not null default',
      'current_snapshot jsonb not null default',
      'constraint vendor_profile_update_requests_request_key_unique unique (request_key)',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('keeps direct table access service-role only', () => {
    expect(migrationSql).toContain('alter table public.vendor_profile_update_requests enable row level security');
    expect(migrationSql).toContain(
      'revoke all privileges on table public.vendor_profile_update_requests from public, anon, authenticated',
    );
    expect(migrationSql).toContain('grant all privileges on table public.vendor_profile_update_requests to service_role');
  });

  it('creates submit and history RPCs with security-definer posture', () => {
    [
      'create or replace function public.rpc_vendor_workspace_submit_profile_update_request',
      'create or replace function public.rpc_vendor_workspace_profile_update_requests()',
      'returns jsonb',
      'security definer',
      'set search_path = public',
      'grant execute on function public.rpc_vendor_workspace_submit_profile_update_request(jsonb) to authenticated, service_role',
      'grant execute on function public.rpc_vendor_workspace_profile_update_requests() to authenticated, service_role',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('requires current-company vendor scope and vendor profile update permission', () => {
    [
      'current_app_user_id()',
      'current_company_id()',
      'current_app_user_has_current_company()',
      "current_app_user_has_permission('vendor_profile.update')",
      "raise exception 'vendor_profile_update_permission_required'",
      'cvp.vendor_company_id = v_vendor_company_id',
      "cvp.vendor_status not in ('inactive', 'do_not_use')",
      "cr.relationship_type = 'amc_vendor'",
      "cr.status = 'active'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('validates payload object shape and requires at least one proposed change or explanation', () => {
    [
      "jsonb_typeof(v_payload) is distinct from 'object'",
      "'profile_update_request_invalid'",
      "'field_errors'",
      "'Contact changes must be an object.'",
      "'Coverage changes must be an object.'",
      "'Accepted work types must be an object.'",
      "'Add at least one proposed change or explanation.'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('stores pending requests and notifies internal owner/admin users without mutating live vendor data', () => {
    [
      'insert into public.vendor_profile_update_requests',
      "'pending'",
      'insert into public.notifications',
      "'vendor.profile_update_requested'",
      "lower(ur.role) in ('owner', 'admin')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    expect(migrationSql).not.toContain('update public.company_vendor_profiles');
    expect(migrationSql).not.toContain('update public.vendor_contacts');
    expect(migrationSql).not.toContain('update public.vendor_service_areas');
    expect(migrationSql).not.toContain('update public.company_relationships');
    expect(migrationSql).not.toContain('rpc_vendor_profile_update');
    expect(migrationSql).not.toContain('rpc_vendor_service_area_create');
  });

  it('returns only opaque request keys and vendor-safe request summaries from RPC responses', () => {
    [
      "'request_key'",
      "'status'",
      "'submitted_at'",
      "'updated_at'",
      "'reviewed_at'",
      "'reviewer_message'",
      "'proposed_changes'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    [
      "'id'",
      "'vendor_profile_id'",
      "'relationship_id'",
      "'owner_company_id'",
      "'vendor_company_id'",
      "'submitted_by_user_id'",
      "'internal_notes'",
      "'client_fee'",
      "'amc_margin'",
      "'storage_path'",
      "'storage_bucket'",
    ].forEach((fieldName) => {
      expect(migrationSql).not.toContain(`jsonb_build_object(${fieldName}`);
      expect(migrationSql).not.toContain(`, ${fieldName},`);
    });
  });
});
