import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260605116000_amc_vendor_invoice_review_queue.sql'),
  'utf8',
);

const vendorPaymentsSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260605114000_amc_vendor_workspace_payments_rpc.sql'),
  'utf8',
);

describe('AMC-12C vendor invoice review queue migration', () => {
  it('creates internal invoice list and review RPCs with guarded execute grants', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_amc_vendor_invoices(');
    expect(migrationSql).toContain('create or replace function public.rpc_amc_review_vendor_invoice(');
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('revoke all on function public.rpc_amc_vendor_invoices(text) from public, anon');
    expect(migrationSql).toContain('grant execute on function public.rpc_amc_review_vendor_invoice(text, jsonb) to authenticated, service_role');
  });

  it('requires internal vendor and billing authority rather than Vendor Workspace permissions', () => {
    expect(migrationSql).toContain("current_app_user_has_permission('vendors.read')");
    expect(migrationSql).toContain("current_app_user_has_permission('billing.update')");
    expect(migrationSql).toContain('vendor_invoice_review_permission_required');
    expect(migrationSql).not.toContain("current_app_user_has_permission('vendor_invoices.submit')");
    expect(migrationSql).not.toContain("current_app_user_has_permission('vendor_payments.read')");
  });

  it('scopes invoice review to current owner company, AMC orders, and active AMC vendor assignments', () => {
    expect(migrationSql).toContain('oca.owner_company_id = v_owner_company_id');
    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'");
    expect(migrationSql).toContain("cr.relationship_type = 'amc_vendor'");
    expect(migrationSql).toContain("cr.status = 'active'");
    expect(migrationSql).toContain("oca.assignment_type = 'vendor_appraisal'");
    expect(migrationSql).toContain("'amc_vendor_invoice_v1'");
  });

  it('supports invoice received, approved, hold, and rejected queue filters', () => {
    expect(migrationSql).toContain("v_status not in ('invoice_received', 'approved', 'on_hold', 'rejected')");
    expect(migrationSql).toContain("'Invoice Received'");
    expect(migrationSql).toContain("'Approved'");
    expect(migrationSql).toContain("'On Hold'");
    expect(migrationSql).toContain("'Rejected'");
  });

  it('moves invoice status to approved, on_hold, or rejected only', () => {
    expect(migrationSql).toContain("when 'approve' then 'approved'");
    expect(migrationSql).toContain("when 'hold' then 'on_hold'");
    expect(migrationSql).toContain("else 'rejected'");
    expect(migrationSql).not.toContain("then 'scheduled'");
    expect(migrationSql).not.toContain("then 'paid'");
  });

  it('separates internal reviewer notes from vendor-facing messages', () => {
    expect(migrationSql).toContain("'internal_reviewer_note', v_reviewer_note");
    expect(migrationSql).toContain("'vendor_message', v_vendor_message");
    expect(migrationSql).toContain('Add a vendor-facing message for held or rejected invoices.');
    expect(migrationSql).toContain("'vendor_message', v_vendor_message");
  });

  it('preserves invoice documents and uses existing internal document access metadata', () => {
    expect(migrationSql).toContain('ir.invoice_payload -> \'documents\'');
    expect(migrationSql).toContain("'vendor_assignment_invoice_document_v1'");
    expect(migrationSql).toContain("'document_id', od.id");
    expect(migrationSql).not.toContain('delete from public.order_documents');
    expect(migrationSql).not.toContain('update public.order_documents');
  });

  it('notifies the vendor with safe decision payload only', () => {
    expect(migrationSql).toContain("'vendor.invoice_reviewed'");
    expect(migrationSql).toContain("'source_type', 'vendor_invoice_review'");
    expect(migrationSql).toContain("'/vendor-workspace/payments'");
    expect(migrationSql).not.toContain("'internal_reviewer_note', v_reviewer_note,\n        'vendor_message'");
  });

  it('does not expose client fee, AMC margin, owner financial notes, or procurement data', () => {
    expect(migrationSql).not.toContain('client_fee');
    expect(migrationSql).not.toContain('amc_margin');
    expect(migrationSql).not.toContain('owner_financial_note');
    expect(migrationSql).not.toContain('candidate_score');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_request');
  });

  it('lets Vendor Payments display rejected invoice status safely after internal review', () => {
    expect(vendorPaymentsSql).toContain("in ('rejected', 'invoice_rejected') then 'rejected'");
    expect(vendorPaymentsSql).toContain("when 'rejected' then 'Rejected'");
    expect(vendorPaymentsSql).toContain("when 'rejected' then 'Submit a corrected invoice if requested'");
  });
});
