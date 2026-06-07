import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260605113000_amc_vendor_profile_update_request_review.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC vendor profile update request review RPC migration', () => {
  it('creates internal review list and decision RPCs with security-definer posture', () => {
    [
      'create or replace function public.rpc_amc_vendor_profile_update_requests',
      'create or replace function public.rpc_amc_review_vendor_profile_update_request',
      'returns jsonb',
      'security definer',
      'set search_path = public',
      'grant execute on function public.rpc_amc_vendor_profile_update_requests(text) to authenticated, service_role',
      'grant execute on function public.rpc_amc_review_vendor_profile_update_request(text, jsonb) to authenticated, service_role',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('requires owner-company membership and internal vendor management permissions', () => {
    [
      'current_app_user_id()',
      'current_company_id()',
      'current_app_user_has_current_company()',
      "current_app_user_has_permission('vendors.read')",
      "current_app_user_has_permission('vendors.update')",
      "current_app_user_has_permission('vendors.contacts.manage')",
      "current_app_user_has_permission('vendors.service_areas.manage')",
      "raise exception 'vendor_profile_update_review_permission_required'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('scopes queue and review decisions to active AMC vendor relationships for the current owner company', () => {
    [
      'vpur.owner_company_id = v_owner_company_id',
      'cvp.owner_company_id = vpur.owner_company_id',
      'cvp.vendor_company_id = vpur.vendor_company_id',
      'cr.source_company_id = vpur.owner_company_id',
      'cr.target_company_id = vpur.vendor_company_id',
      "cr.relationship_type = 'amc_vendor'",
      "cr.status = 'active'",
      "cvp.vendor_status not in ('inactive', 'do_not_use')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('uses opaque request keys and validates all-or-nothing approve or reject decisions', () => {
    [
      'p_request_key text',
      'v_request_key text',
      "v_decision not in ('approve', 'reject')",
      "'Choose approve or reject.'",
      "'vendor_profile_update_request_unavailable'",
      "'vendor_profile_update_request_already_reviewed'",
      "v_request.status not in ('pending', 'reviewing')",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('only mutates live vendor profile/contact/coverage fields on approval', () => {
    [
      "if v_decision = 'approve' then",
      'update public.company_vendor_profiles',
      'website = case when v_company_changes ?',
      'public_phone = case when v_company_changes ?',
      'product_eligibility = coalesce(v_product_eligibility',
      'update public.vendor_contacts',
      'insert into public.vendor_contacts',
      'insert into public.vendor_service_areas',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    expect(migrationSql).not.toContain('update public.companies');
    expect(migrationSql).not.toContain('update public.company_relationships');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('client_fee');
    expect(migrationSql).not.toContain('amc_margin');
    expect(migrationSql).not.toContain('pricing');
  });

  it('preserves history on rejection without applying live mutations', () => {
    [
      "status = case when v_decision = 'approve' then 'approved' else 'rejected' end",
      'reviewer_message = v_reviewer_message',
      'reviewed_by_user_id = v_actor_user_id',
      'reviewed_at = now()',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('notifies the vendor with safe decision copy only', () => {
    [
      'insert into public.notifications',
      "'vendor.profile_update_reviewed'",
      "'/vendor-workspace/profile'",
      "'request_key'",
      "'decision'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    [
      "'vendor_profile_id'",
      "'relationship_id'",
      "'owner_company_id'",
      "'vendor_company_id'",
      "'internal_notes'",
      "'storage_path'",
      "'storage_bucket'",
    ].forEach((fieldName) => {
      expect(migrationSql).not.toContain(`jsonb_build_object(${fieldName}`);
      expect(migrationSql).not.toContain(`, ${fieldName},`);
    });
  });
});
