import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const scriptPath = resolve(repoRoot, 'scripts/load-amc-staging-smoke-fixtures.mjs');
const packageJsonPath = resolve(repoRoot, 'package.json');

const script = readFileSync(scriptPath, 'utf8');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

describe('AMC staging smoke fixture loader', () => {
  it('exposes a dedicated staging fixture command', () => {
    expect(packageJson.scripts['amc:staging:fixtures:load']).toBe(
      'node scripts/load-amc-staging-smoke-fixtures.mjs',
    );
  });

  it('requires explicit staging environment and refuses production refs', () => {
    expect(script).toContain('AMC_STAGING_PROJECT_REF');
    expect(script).toContain('AMC_STAGING_SUPABASE_URL');
    expect(script).toContain('AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY');
    expect(script).toContain('AMC_STAGING_SUPABASE_ANON_KEY');
    expect(script).toContain('voompccpkjfcsmehdoqu');
    expect(script).toContain('PRODUCTION_PROJECT_REFS');
    expect(script).toContain('Refusing fixture load');
  });

  it('creates disposable staging identities and smoke order records', () => {
    [
      'amc.smoke.owner+staging@example.test',
      'amc.smoke.vendor+staging@example.test',
      'amc.smoke.wrongvendor+staging@example.test',
      'amc-staging-smoke-disposable-vendor',
      'amc-staging-smoke-wrong-vendor',
      'AMC-STAGING-SMOKE-001',
      'amc-staging-smoke-fixtures/AMC-STAGING-SMOKE-001',
      'staging_smoke',
      '.upload(storagePath',
      'order-documents',
    ].forEach((snippet) => {
      expect(script).toContain(snippet);
    });
  });

  it('validates company context and vendor visibility through authenticated RPCs', () => {
    expect(script).toContain('rpc_current_user_app_context');
    expect(script).toContain('rpc_vendor_workspace_available_work');
    expect(script).toContain('Owner login did not resolve owner company context');
    expect(script).toContain('Vendor login did not resolve vendor company context');
    expect(script).toContain('Wrong-vendor login did not resolve wrong-vendor company context');
    expect(script).toContain('Expected one vendor available-work row');
    expect(script).toContain('Expected zero wrong-vendor available-work rows');
  });
});
