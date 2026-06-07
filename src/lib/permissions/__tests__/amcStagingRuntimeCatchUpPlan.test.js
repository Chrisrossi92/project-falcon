import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const docPath = resolve(repoRoot, 'docs/amc/AMC_STAGING_RUNTIME_CATCH_UP_PLAN.md');
const scriptPath = resolve(repoRoot, 'scripts/check-amc-staging-runtime.mjs');
const packageJsonPath = resolve(repoRoot, 'package.json');

const doc = readFileSync(docPath, 'utf8');
const script = readFileSync(scriptPath, 'utf8');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const requiredRpcs = [
  'rpc_vendor_workspace_available_work',
  'rpc_vendor_workspace_available_work_detail',
  'rpc_vendor_workspace_submit_bid_response',
  'rpc_vendor_workspace_decline_bid_opportunity',
  'rpc_vendor_workspace_my_bids',
  'rpc_vendor_workspace_assigned_orders',
  'rpc_vendor_workspace_assigned_order_detail',
  'rpc_vendor_workspace_submit_report',
  'rpc_vendor_workspace_payments',
  'rpc_amc_vendor_invoices',
  'rpc_amc_vendor_payment_ledger',
];

const requiredFunctions = [
  'vendor-workspace-document-download-url',
  'vendor-workspace-report-upload-url',
  'vendor-workspace-invoice-upload-url',
];

describe('AMC staging runtime catch-up plan', () => {
  it('documents the staging-only deployment sequence and required commands', () => {
    expect(doc).toContain('AMC-13C Staging Runtime Catch-Up Plan');
    expect(doc).toContain('supabase db push --linked --include-all --yes');
    expect(doc).toContain('does not support `db push --project-ref`');
    expect(doc).toContain("select pg_notify('pgrst', 'reload schema');");
    expect(doc).toContain('npm run amc:staging:runtime:check');
    expect(doc).toContain('Do not run it against production data');
  });

  it('exposes a staging runtime availability probe command', () => {
    expect(packageJson.scripts['amc:staging:runtime:check']).toBe(
      'node scripts/check-amc-staging-runtime.mjs',
    );
    expect(script).toContain('AMC_STAGING_PROJECT_REF');
    expect(script).toContain('AMC_STAGING_SUPABASE_URL');
    expect(script).toContain('AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY');
    expect(script).toContain('PRODUCTION_PROJECT_REFS');
    expect(script).toContain('Refusing probe');
    expect(script).toContain('RPC_PROBE_PAYLOADS');
    expect(script).toContain('p_assignment_work_key');
    expect(script).toContain('p_invoice_key');
  });

  it('covers required AMC RPC and Edge Function availability probes', () => {
    requiredRpcs.forEach((rpcName) => {
      expect(doc).toContain(rpcName);
      expect(script).toContain(rpcName);
    });

    requiredFunctions.forEach((functionName) => {
      expect(doc).toContain(functionName);
      expect(script).toContain(functionName);
    });
  });

  it('keeps staging smoke fixture loading disposable and separate from production', () => {
    [
      'amc.smoke.owner+staging@example.test',
      'amc.smoke.vendor+staging@example.test',
      'amc.smoke.wrongvendor+staging@example.test',
      'AMC-STAGING-SMOKE-001',
      'staging_smoke',
      'Never run staging fixture cleanup by broad date ranges',
      'No production data or production secrets are used',
    ].forEach((snippet) => {
      expect(doc).toContain(snippet);
    });
  });
});
