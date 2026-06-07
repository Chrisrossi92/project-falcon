import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260605115000_amc_vendor_workspace_invoice_submission.sql'),
  'utf8',
);

const edgeSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/vendor-workspace-invoice-upload-url/index.ts'),
  'utf8',
);

describe('AMC-12B Vendor Workspace invoice submission migration', () => {
  it('seeds vendor invoice submission permission for the Vendor Admin template only', () => {
    expect(migrationSql).toContain("'vendor_invoices.submit'");
    expect(migrationSql).toContain("lower(r.name) = lower('Vendor Admin')");
    expect(migrationSql).not.toContain("lower(r.name) = lower('Owner')");
    expect(migrationSql).not.toContain("lower(r.name) = lower('Admin')");
  });

  it('creates the vendor-scoped invoice upload/register/submit RPCs with guarded execution grants', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_prepare_invoice_upload(');
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_register_invoice_document(');
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_submit_invoice(');
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('revoke all on function public.rpc_vendor_workspace_prepare_invoice_upload(text, jsonb) from public, anon');
    expect(migrationSql).toContain('grant execute on function public.rpc_vendor_workspace_submit_invoice(text, jsonb) to authenticated, service_role');
  });

  it('requires payment visibility and invoice submission permissions', () => {
    expect(migrationSql).toContain("current_app_user_has_permission('vendor_payments.read')");
    expect(migrationSql).toContain("current_app_user_has_permission('vendor_invoices.submit')");
    expect(migrationSql).toContain('vendor_payments_read_permission_required');
    expect(migrationSql).toContain('vendor_invoices_submit_permission_required');
  });

  it('scopes invoice submission to opaque assignment keys, current vendor company, active AMC relationship/profile, and AMC orders', () => {
    expect(migrationSql).toContain("'vendor_assignment_work_v1'");
    expect(migrationSql).toContain("p_assignment_work_key !~ '^[0-9a-f]{64}$'");
    expect(migrationSql).toContain('oca.assigned_company_id = v_vendor_company_id');
    expect(migrationSql).toContain("cr.relationship_type = 'amc_vendor'");
    expect(migrationSql).toContain("cr.status = 'active'");
    expect(migrationSql).toContain("cvp.vendor_status not in ('inactive', 'do_not_use')");
    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'");
  });

  it('only allows payment-eligible completed assignments and prevents duplicate invoice submission', () => {
    expect(migrationSql).toContain("v_assignment.status <> 'completed'");
    expect(migrationSql).toContain('Invoices can only be submitted after the assignment is complete.');
    expect(migrationSql).toContain('invoice_already_submitted');
    expect(migrationSql).toContain("'{invoice,status}'");
  });

  it('reuses order_documents for vendor-visible invoice metadata without exposing storage paths from RPC clients', () => {
    expect(migrationSql).toContain('insert into public.order_documents');
    expect(migrationSql).toContain("'invoice'");
    expect(migrationSql).toContain("'Vendor Invoice'");
    expect(migrationSql).toContain("'vendor'");
    expect(migrationSql).toContain("'pending'");
    expect(migrationSql).toContain("'vendor_assignment_invoice_document_v1'");
    expect(migrationSql).toContain('from storage.objects so');
    expect(migrationSql).toContain("od.status = 'active'");
  });

  it('stores invoice received state without approving, scheduling, or paying the invoice', () => {
    expect(migrationSql).toContain("'status', 'invoice_received'");
    expect(migrationSql).toContain("jsonb_set(\n           coalesce(submission_payload, '{}'::jsonb),\n           '{invoice}'");
    expect(migrationSql).not.toContain("set status = 'approved'");
    expect(migrationSql).not.toContain("set status = 'scheduled'");
    expect(migrationSql).not.toContain("set status = 'paid'");
  });

  it('notifies owner/admin users with safe invoice submission context only', () => {
    expect(migrationSql).toContain("'vendor.invoice_submitted'");
    expect(migrationSql).toContain("'source_type', 'vendor_invoice_submission'");
    expect(migrationSql).toContain("'assignment_work_key', p_assignment_work_key");
    expect(migrationSql).toContain("'document_count', jsonb_array_length(v_documents)");
  });

  it('keeps forbidden vendor financial and internal data out of the invoice workflow', () => {
    expect(migrationSql).not.toContain('client_fee');
    expect(migrationSql).not.toContain('amc_margin');
    expect(migrationSql).not.toContain('candidate_score');
    expect(migrationSql).not.toContain('internal_note');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid_request');
  });

  it('adds an Edge helper that signs uploads through prepare RPC and strips storage bucket/path from the response', () => {
    expect(edgeSource).toContain('vendor-workspace-invoice-upload-url');
    expect(edgeSource).toContain('rpc_vendor_workspace_prepare_invoice_upload');
    expect(edgeSource).toContain('createSignedUploadUrl');
    expect(edgeSource).toContain('signed_url: signed.signedUrl');
    expect(edgeSource).not.toContain('storage_path: prepared.upload.storage_path');
    expect(edgeSource).not.toContain('storage_bucket: prepared.upload.storage_bucket');
  });
});
