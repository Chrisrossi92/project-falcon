import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const scriptPath = resolve(repoRoot, 'scripts/run-amc-staging-edge-smoke.mjs');
const packageJsonPath = resolve(repoRoot, 'package.json');

const script = readFileSync(scriptPath, 'utf8');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

describe('AMC staging edge-case smoke runner', () => {
  it('exposes a dedicated staging edge smoke command', () => {
    expect(packageJson.scripts['amc:staging:smoke:edge']).toBe(
      'node scripts/run-amc-staging-edge-smoke.mjs',
    );
  });

  it('requires explicit staging target and refuses production refs', () => {
    expect(script).toContain('AMC_STAGING_PROJECT_REF');
    expect(script).toContain('AMC_STAGING_SUPABASE_URL');
    expect(script).toContain('AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY');
    expect(script).toContain('AMC_STAGING_SUPABASE_ANON_KEY');
    expect(script).toContain('voompccpkjfcsmehdoqu');
    expect(script).toContain('PRODUCTION_PROJECT_REFS');
    expect(script).toContain('Refusing smoke');
  });

  it('covers wrong-vendor denial across work, documents, assignments, and assignment documents', () => {
    [
      'rpc_vendor_workspace_available_work',
      'rpc_vendor_workspace_available_work_detail',
      'rpc_vendor_workspace_authorize_document_access',
      'rpc_vendor_workspace_assigned_order_detail',
      'rpc_vendor_workspace_authorize_assignment_document_access',
      'Wrong vendor: cannot see correct vendor available work',
      'Wrong vendor: cannot open correct vendor work detail',
      'Wrong vendor: cannot access opportunity document',
      'Wrong vendor: cannot open assigned order detail',
      'Wrong vendor: cannot access assignment document',
    ].forEach((snippet) => {
      expect(script).toContain(snippet);
    });
  });

  it('covers declined bid history as a passed opportunity', () => {
    [
      'rpc_vendor_workspace_decline_bid_opportunity',
      'Too busy / capacity',
      'rpc_vendor_workspace_my_bids',
      'bid_status !== "passed"',
      'Declined bid: Vendor My Bids shows Passed Opportunity',
      'Declined bid: Work Detail remains safe and read-only',
    ].forEach((snippet) => {
      expect(script).toContain(snippet);
    });
  });

  it('covers rejected invoice correction returning to the internal review queue', () => {
    [
      'rpc_vendor_workspace_submit_invoice',
      'rpc_amc_review_vendor_invoice',
      'decision: "reject"',
      'Please correct the staging smoke invoice and upload a revised PDF.',
      'rpc_vendor_workspace_payments',
      'payment_status_key !== "rejected"',
      'rpc_vendor_workspace_resubmit_invoice',
      'AMC-STAGING-EDGE-INV-001-R',
      'rpc_amc_vendor_invoices',
      'p_status: "invoice_received"',
      'Rejected invoice: owner review queue sees corrected invoice',
    ].forEach((snippet) => {
      expect(script).toContain(snippet);
    });
  });

  it('guards vendor payloads against raw ids, storage paths, internal notes, and financial leakage', () => {
    [
      'assertNoVendorPayloadLeakage',
      'Leakage: no raw UUIDs/storage paths/internal notes/client fee/AMC margin',
      'storage_path',
      'storage_bucket',
      'order-documents',
      'vendor-report-uploads/',
      'vendor-invoice-uploads/',
      'internal_reviewer_note',
      'Internal-only AMC-13G',
      'client_fee',
      'amc_margin',
      'fee_amount_client',
    ].forEach((snippet) => {
      expect(script).toContain(snippet);
    });
  });
});
