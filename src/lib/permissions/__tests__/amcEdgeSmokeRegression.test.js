import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const edgeRunnerPath = resolve(repoRoot, 'scripts/run-amc-edge-smoke.mjs');
const fixturePath = resolve(repoRoot, 'supabase/manual/20260606_amc_full_mvp_smoke_fixture.sql');

const edgeRunner = readFileSync(edgeRunnerPath, 'utf8');
const fixtureSql = readFileSync(fixturePath, 'utf8');

describe('AMC edge smoke regression harness', () => {
  it('uses repeatable local disposable users and fixture markers', () => {
    expect(edgeRunner).toContain('amc.smoke.owner@example.test');
    expect(edgeRunner).toContain('amc.smoke.vendor@example.test');
    expect(edgeRunner).toContain('amc.smoke.wrongvendor@example.test');
    expect(edgeRunner).toContain('npm run supabase:reset:local');
    expect(edgeRunner).toContain('npm run amc:smoke:fixtures:load');
    expect(edgeRunner).toContain('AMC-13B.8');
    expect(fixtureSql).toContain('amc.smoke.wrongvendor@example.test');
    expect(fixtureSql).toContain('"fixture_role": "wrong_vendor_denial"');
  });

  it('covers wrong-vendor denial for available work, detail, documents, assignments, and assignment documents', () => {
    [
      'rpc_vendor_workspace_available_work',
      'rpc_vendor_workspace_available_work_detail',
      'rpc_vendor_workspace_authorize_document_access',
      'rpc_vendor_workspace_assigned_order_detail',
      'rpc_vendor_workspace_authorize_assignment_document_access',
      'Wrong vendor: cannot see first vendor available work',
      'Wrong vendor: cannot open first vendor work detail',
      'Wrong vendor: cannot access first vendor opportunity document',
      'Wrong vendor: cannot open first vendor assigned order detail',
      'Wrong vendor: cannot access first vendor assignment document',
    ].forEach((snippet) => {
      expect(edgeRunner).toContain(snippet);
    });
  });

  it('covers declined bid history as a passed opportunity', () => {
    [
      'rpc_vendor_workspace_decline_bid_opportunity',
      'Too busy / capacity',
      'rpc_vendor_workspace_my_bids',
      'bid_status === "passed"',
      'Declined bid: Vendor My Bids shows Passed Opportunity',
      'Declined bid: history detail remains read-only passed state',
    ].forEach((snippet) => {
      expect(edgeRunner).toContain(snippet);
    });
  });

  it('covers rejected invoice correction returning to the internal review queue', () => {
    [
      'rpc_vendor_workspace_submit_invoice',
      'rpc_amc_review_vendor_invoice',
      'decision: "reject"',
      'Please correct the invoice amount and upload a revised PDF.',
      'rpc_vendor_workspace_payments',
      'payment_status_key === "rejected"',
      'rpc_vendor_workspace_resubmit_invoice',
      'AMC-EDGE-INV-001-R',
      'rpc_amc_vendor_invoices',
      'p_status: "invoice_received"',
      'owner queue sees corrected invoice back in review',
    ].forEach((snippet) => {
      expect(edgeRunner).toContain(snippet);
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
      'client_fee',
      'amc_margin',
      'fee_amount_client',
    ].forEach((snippet) => {
      expect(edgeRunner).toContain(snippet);
    });
  });
});
