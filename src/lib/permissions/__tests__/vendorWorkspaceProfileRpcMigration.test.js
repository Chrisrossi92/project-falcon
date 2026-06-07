import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260605111000_amc_vendor_workspace_profile_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Vendor Workspace profile RPC migration', () => {
  it('creates the authenticated read-only vendor profile RPC returning JSON', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_profile()');
    expect(migrationSql).toContain('returns jsonb');
    expect(migrationSql).toContain("'ok', true");
    expect(migrationSql).toContain("'profile'");
    expect(migrationSql).toContain("'vendor_profile_unavailable'");
  });

  it('uses security-definer posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain('revoke all on function public.rpc_vendor_workspace_profile() from public, anon');
    expect(migrationSql).toContain('grant execute on function public.rpc_vendor_workspace_profile() to authenticated, service_role');
  });

  it('requires current company membership and vendor profile read permission', () => {
    [
      'current_app_user_id()',
      'current_company_id()',
      'current_app_user_has_current_company()',
      "current_app_user_has_permission('vendor_profile.read')",
      "raise exception 'vendor_profile_read_permission_required'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('scopes to current vendor company, active AMC vendor relationship, and active vendor profile', () => {
    [
      'cvp.vendor_company_id = v_vendor_company_id',
      "cvp.vendor_status not in ('inactive', 'do_not_use')",
      "cr.relationship_type = 'amc_vendor'",
      "cr.status = 'active'",
      'cr.source_company_id = cvp.owner_company_id',
      'cr.target_company_id = cvp.vendor_company_id',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('returns vendor-safe company, contact, coverage, accepted work type, compliance, and updated fields', () => {
    [
      "'company'",
      "'name'",
      "'primary_contact'",
      "'contacts'",
      "'coverage'",
      "'states'",
      "'counties'",
      "'markets'",
      "'service_areas'",
      "'accepted_work_types'",
      "'product_types'",
      "'property_types'",
      "'report_types'",
      "'default_turn_time_days'",
      "'compliance'",
      "'document_count'",
      "'last_updated_at'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('does not expose raw identifiers, internal notes, pricing, margin, owner APIs, or edit mutations', () => {
    [
      "'vendor_profile_id'",
      "'relationship_id'",
      "'owner_company_id'",
      "'vendor_company_id'",
      "'internal_notes'",
      "'client_fee'",
      "'amc_margin'",
      "'storage_path'",
      "'storage_bucket'",
    ].forEach((fieldName) => {
      expect(migrationSql).not.toContain(fieldName);
    });
    expect(migrationSql).not.toContain('rpc_vendor_profile_update');
    expect(migrationSql).not.toContain('rpc_vendor_contact_upsert');
    expect(migrationSql).not.toContain('rpc_vendor_service_area_create');
    expect(migrationSql).not.toContain('update public.company_vendor_profiles');
    expect(migrationSql).not.toContain('update public.vendor_contacts');
    expect(migrationSql).not.toContain('update public.vendor_service_areas');
  });
});
