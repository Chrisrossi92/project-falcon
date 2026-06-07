import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const scriptPath = resolve(repoRoot, 'scripts/run-amc-staging-happy-smoke.mjs');
const packageJsonPath = resolve(repoRoot, 'package.json');

const script = readFileSync(scriptPath, 'utf8');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

describe('AMC staging happy-path smoke runner', () => {
  it('exposes a dedicated staging happy-path command', () => {
    expect(packageJson.scripts['amc:staging:smoke:happy']).toBe(
      'node scripts/run-amc-staging-happy-smoke.mjs',
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

  it('covers the full AMC staging happy path in order', () => {
    [
      '1. Owner confirms AMC order',
      '2. Candidate matching returns smoke vendor',
      '3. Vendor sees Available Work',
      '4. Vendor opens Work Detail',
      '5. Vendor opens authorized document',
      '6. Vendor submits bid',
      '7. Owner selects bid',
      '8. Owner creates assignment offer',
      '9. Vendor accepts assignment',
      '10. Vendor sees Assigned Orders',
      '11. Vendor opens Assigned Order Detail',
      '12. Vendor starts work',
      '13. Vendor uploads report PDF and submits report',
      '14. Owner requests revision',
      '15. Vendor uploads revision and resubmits',
      '16. Owner completes assignment',
      '17. Vendor submits invoice PDF',
      '18. Owner approves invoice',
      '19. Owner schedules payment',
      '20. Owner marks paid',
      '21. Vendor Payments shows Paid',
    ].forEach((snippet) => {
      expect(script).toContain(snippet);
    });
  });

  it('uses Vendor Workspace and owner AMC RPCs without shared order routes', () => {
    [
      'rpc_vendor_workspace_available_work',
      'rpc_vendor_workspace_available_work_detail',
      'vendor-workspace-document-download-url',
      'rpc_vendor_workspace_submit_bid_response',
      'rpc_order_vendor_bid_response_select',
      'rpc_order_vendor_bid_response_convert_to_assignment_offer',
      'rpc_order_company_assignment_invitation_create',
      'rpc_order_company_assignment_invitation_respond',
      'rpc_vendor_workspace_assigned_orders',
      'rpc_vendor_workspace_start_assigned_order',
      'rpc_vendor_workspace_submit_report',
      'rpc_amc_request_vendor_assignment_revision',
      'rpc_vendor_workspace_resubmit_report',
      'rpc_order_company_assignment_complete',
      'rpc_vendor_workspace_submit_invoice',
      'rpc_amc_review_vendor_invoice',
      'rpc_amc_schedule_vendor_payment',
      'rpc_amc_mark_vendor_payment_paid',
      'rpc_vendor_workspace_payments',
    ].forEach((snippet) => {
      expect(script).toContain(snippet);
    });

    expect(script).not.toContain('/orders');
  });
});
