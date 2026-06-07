import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const fixturePath = resolve(repoRoot, 'supabase/manual/20260606_amc_full_mvp_smoke_fixture.sql');
const loaderPath = resolve(repoRoot, 'scripts/load-amc-smoke-fixtures.mjs');
const edgeRunnerPath = resolve(repoRoot, 'scripts/run-amc-edge-smoke.mjs');
const packageJsonPath = resolve(repoRoot, 'package.json');

const fixtureSql = readFileSync(fixturePath, 'utf8');
const loaderScript = readFileSync(loaderPath, 'utf8');
const edgeRunnerScript = readFileSync(edgeRunnerPath, 'utf8');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

describe('AMC local smoke fixture load', () => {
  it('exposes a repeatable local fixture command', () => {
    expect(packageJson.scripts['amc:smoke:fixtures:load']).toBe(
      'node scripts/load-amc-smoke-fixtures.mjs',
    );
    expect(packageJson.scripts['amc:smoke:edge']).toBe('node scripts/run-amc-edge-smoke.mjs');
    expect(loaderScript).toContain('20260606_amc_full_mvp_smoke_fixture.sql');
    expect(loaderScript).toContain('/private/tmp/project-falcon-amc-smoke');
    expect(loaderScript).toContain('amc-smoke-report.pdf');
    expect(loaderScript).toContain('amc-smoke-invoice.pdf');
    expect(edgeRunnerScript).toContain('Local-only AMC edge smoke runner');
  });

  it('marks fixture records as disposable local smoke data', () => {
    [
      'AMC-13B.2 local-only full MVP smoke fixture',
      'amc.smoke.owner@example.test',
      'amc.smoke.vendor@example.test',
      'amc.smoke.wrongvendor@example.test',
      'AMC-SMOKE-001',
      'AMC Smoke Disposable Vendor',
      'AMC Smoke Wrong Vendor',
      '"demo_seed": "amc_13b_2"',
      '"demo_seed": "amc_13b_8"',
      '"fixture_role": "wrong_vendor_denial"',
      '"disposable": true',
    ].forEach((snippet) => {
      expect(fixtureSql).toContain(snippet);
    });
  });

  it('sets active company metadata for owner and vendor smoke auth sessions', () => {
    expect(fixtureSql).toContain("'active_company_id', v_owner_company_id");
    expect(fixtureSql).toContain("'current_company_id', v_owner_company_id");
    expect(fixtureSql).toContain("'active_company_id', v_vendor_company_id");
    expect(fixtureSql).toContain("'current_company_id', v_vendor_company_id");
    expect(fixtureSql).toContain("'active_company_id', v_wrong_vendor_company_id");
    expect(fixtureSql).toContain("'current_company_id', v_wrong_vendor_company_id");
    expect(fixtureSql).toContain('raw_app_meta_data = coalesce(raw_app_meta_data');
  });

  it('keeps direct auth user rows compatible with local GoTrue password login', () => {
    expect(fixtureSql).toContain('email_change,');
    expect(fixtureSql).toContain("email_change = coalesce(email_change, '')");
    expect(fixtureSql).toContain('email_change_token_new');
    expect(fixtureSql).toContain('email_change_token_current');
    expect(fixtureSql).toContain('auth.identities');
    expect(fixtureSql).toContain("'email'");
  });

  it('creates vendor scoped bid data for Vendor Workspace available work', () => {
    [
      'order_vendor_bid_requests',
      'order_vendor_bid_request_recipients',
      'v_vendor_company_id',
      'v_vendor_profile_id',
      'v_relationship_id',
      "'sent'",
      "'vendor_available_work_v1'",
    ].forEach((snippet) => {
      expect(fixtureSql).toContain(snippet);
    });
  });

  it('creates a second disposable vendor for wrong-vendor edge denial without a bid recipient', () => {
    expect(fixtureSql).toContain('v_wrong_vendor_company_id');
    expect(fixtureSql).toContain('v_wrong_vendor_auth_id');
    expect(fixtureSql).toContain('v_wrong_vendor_user_id');
    expect(fixtureSql).toContain('v_wrong_relationship_id');
    expect(fixtureSql).toContain('v_wrong_vendor_profile_id');
    expect(fixtureSql).toContain("'amc-smoke-wrong-vendor'");
    expect(fixtureSql).toContain("'amc_smoke_wrong_vendor'");
    expect(fixtureSql).toContain('wrong_vendor_profiles');
    expect(fixtureSql).toContain('AMC smoke wrong-vendor login: amc.smoke.wrongvendor@example.test / FalconSmoke123!');
    expect(fixtureSql).not.toMatch(/v_wrong_vendor_profile_id[\s\S]{0,400}order_vendor_bid_request_recipients/);
  });

  it('does not hardcode runtime company resolution or expose storage paths to vendor UI', () => {
    expect(fixtureSql).not.toContain('create or replace function public.current_company_id');
    expect(fixtureSql).not.toContain('alter function public.current_company_id');
    expect(fixtureSql).not.toContain('grant all on storage.objects');
    expect(fixtureSql).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});
