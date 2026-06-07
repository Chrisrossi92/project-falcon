import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260605117000_amc_vendor_workspace_corrected_invoice_resubmission.sql'),
  'utf8',
);

const paymentsSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260605114000_amc_vendor_workspace_payments_rpc.sql'),
  'utf8',
);

describe('AMC-12D Vendor Workspace corrected invoice resubmission migration', () => {
  it('creates the corrected invoice resubmission RPC with guarded execution grants', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_resubmit_invoice(');
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('revoke all on function public.rpc_vendor_workspace_resubmit_invoice(text, jsonb) from public, anon');
    expect(migrationSql).toContain('grant execute on function public.rpc_vendor_workspace_resubmit_invoice(text, jsonb) to authenticated, service_role');
  });

  it('requires vendor payment visibility and invoice submit authority', () => {
    expect(migrationSql).toContain("current_app_user_has_permission('vendor_payments.read')");
    expect(migrationSql).toContain("current_app_user_has_permission('vendor_invoices.submit')");
    expect(migrationSql).toContain('vendor_payments_read_permission_required');
    expect(migrationSql).toContain('vendor_invoices_submit_permission_required');
  });

  it('scopes to current vendor company, active AMC vendor relationships, AMC orders, and assigned vendor work', () => {
    expect(migrationSql).toContain("'vendor_assignment_work_v1'");
    expect(migrationSql).toContain("p_assignment_work_key !~ '^[0-9a-f]{64}$'");
    expect(migrationSql).toContain('oca.assigned_company_id = v_vendor_company_id');
    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'");
    expect(migrationSql).toContain("cr.relationship_type = 'amc_vendor'");
    expect(migrationSql).toContain("cr.status = 'active'");
    expect(migrationSql).toContain("cvp.vendor_status not in ('inactive', 'do_not_use')");
  });

  it('only allows corrected invoice submission after rejected invoice status', () => {
    expect(migrationSql).toContain("lower(coalesce(v_assignment.submission_payload #>> '{invoice,status}', '')) <> 'rejected'");
    expect(migrationSql).toContain('Corrected invoices can only be submitted after an invoice is rejected.');
    expect(migrationSql).toContain("v_assignment.status <> 'completed'");
  });

  it('validates corrected invoice fields and opaque document keys', () => {
    expect(migrationSql).toContain('Enter a corrected invoice number.');
    expect(migrationSql).toContain('Enter a valid corrected invoice amount.');
    expect(migrationSql).toContain('Corrected invoice document references are invalid.');
    expect(migrationSql).toContain('Upload at least one corrected invoice file before submitting.');
    expect(migrationSql).toContain("'vendor_assignment_invoice_document_v1'");
  });

  it('preserves prior rejected invoice metadata in invoice history', () => {
    expect(migrationSql).toContain("v_previous_invoice := coalesce(v_assignment.submission_payload -> 'invoice', '{}'::jsonb)");
    expect(migrationSql).toContain("coalesce(v_previous_invoice -> 'history', '[]'::jsonb)");
    expect(migrationSql).toContain("v_previous_invoice - 'history'");
    expect(migrationSql).toContain("'history', v_invoice_history");
  });

  it('moves the corrected invoice back to invoice_received without approving, scheduling, or paying', () => {
    expect(migrationSql).toContain("'status', 'invoice_received'");
    expect(migrationSql).toContain("'resubmitted_at', v_resubmitted_at");
    expect(migrationSql).not.toContain("'status', 'approved'");
    expect(migrationSql).not.toContain("'status', 'scheduled'");
    expect(migrationSql).not.toContain("'status', 'paid'");
  });

  it('notifies internal users with safe corrected invoice context only', () => {
    expect(migrationSql).toContain("'vendor.invoice_resubmitted'");
    expect(migrationSql).toContain("'source_type', 'vendor_invoice_resubmission'");
    expect(migrationSql).toContain("'assignment_work_key', p_assignment_work_key");
    expect(migrationSql).toContain("'document_count', jsonb_array_length(v_documents)");
  });

  it('does not expose forbidden financial or internal fields', () => {
    expect(migrationSql).not.toContain('client_fee');
    expect(migrationSql).not.toContain('amc_margin');
    expect(migrationSql).not.toContain('owner_financial_note');
    expect(migrationSql).not.toContain('internal_reviewer_note');
    expect(migrationSql).not.toContain('storage_path');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_request');
  });

  it('returns vendor-safe rejection message data through the payments read model', () => {
    expect(paymentsSql).toContain("'invoice', jsonb_strip_nulls(jsonb_build_object");
    expect(paymentsSql).toContain("'vendor_message', nullif(invoice_payload #>> '{review,vendor_message}', '')");
    expect(paymentsSql).not.toContain('internal_reviewer_note');
  });
});
