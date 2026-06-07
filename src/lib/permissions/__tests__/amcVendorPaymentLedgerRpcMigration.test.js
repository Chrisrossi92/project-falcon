import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260606120000_amc_vendor_payment_ledger_scheduling.sql'),
  'utf8',
);

const vendorPaymentsSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260605114000_amc_vendor_workspace_payments_rpc.sql'),
  'utf8',
);

describe('AMC-12E vendor payment ledger and scheduling migration', () => {
  it('creates an internal-only vendor payment ledger table', () => {
    expect(migrationSql).toContain('create table if not exists public.amc_vendor_payment_ledger');
    expect(migrationSql).toContain("check (status in ('scheduled', 'paid', 'cancelled'))");
    expect(migrationSql).toContain('alter table public.amc_vendor_payment_ledger enable row level security');
    expect(migrationSql).toContain('revoke all on public.amc_vendor_payment_ledger from public, anon, authenticated');
    expect(migrationSql).toContain('grant all on public.amc_vendor_payment_ledger to service_role');
  });

  it('creates guarded ledger, schedule, and mark-paid RPCs', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_amc_vendor_payment_ledger(');
    expect(migrationSql).toContain('create or replace function public.rpc_amc_schedule_vendor_payment(');
    expect(migrationSql).toContain('create or replace function public.rpc_amc_mark_vendor_payment_paid(');
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('grant execute on function public.rpc_amc_vendor_payment_ledger(text) to authenticated, service_role');
    expect(migrationSql).toContain('grant execute on function public.rpc_amc_schedule_vendor_payment(text, jsonb) to authenticated, service_role');
    expect(migrationSql).toContain('grant execute on function public.rpc_amc_mark_vendor_payment_paid(text, jsonb) to authenticated, service_role');
  });

  it('requires current owner company vendor and billing permissions', () => {
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('vendors.read')");
    expect(migrationSql).toContain("current_app_user_has_permission('billing.update')");
    expect(migrationSql).toContain('vendor_payment_ledger_permission_required');
    expect(migrationSql).toContain('vendor_payment_schedule_permission_required');
    expect(migrationSql).toContain('vendor_payment_paid_permission_required');
  });

  it('scopes rows to AMC vendor assignments and approved/scheduled/paid invoice states', () => {
    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'");
    expect(migrationSql).toContain("cr.relationship_type = 'amc_vendor'");
    expect(migrationSql).toContain("oca.assignment_type = 'vendor_appraisal'");
    expect(migrationSql).toContain("lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')) in ('approved', 'scheduled', 'paid')");
    expect(migrationSql).toContain("lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')) = 'approved'");
    expect(migrationSql).toContain("vpl.status = 'scheduled'");
  });

  it('uses opaque invoice and payment keys instead of raw ids for RPC actions', () => {
    expect(migrationSql).toContain("'amc_vendor_invoice_v1'");
    expect(migrationSql).toContain("'amc_vendor_payment_v1'");
    expect(migrationSql).toContain("p_invoice_key !~ '^[0-9a-f]{64}$'");
    expect(migrationSql).toContain("p_payment_key !~ '^[0-9a-f]{64}$'");
  });

  it('separates internal notes from vendor-facing payment notes', () => {
    expect(migrationSql).toContain('internal_note text');
    expect(migrationSql).toContain('vendor_payment_note text');
    expect(migrationSql).toContain("'vendor_payment_note', v_vendor_note");
    expect(vendorPaymentsSql).toContain("'vendor_payment_note', vendor_payment_note");
    expect(vendorPaymentsSql).not.toContain('internal_note');
  });

  it('updates vendor-visible status to scheduled and paid without payment processor integration', () => {
    expect(migrationSql).toContain("'status', 'scheduled'");
    expect(migrationSql).toContain("'status', 'paid'");
    expect(migrationSql).toContain("'{invoice,status}', to_jsonb('scheduled'::text)");
    expect(migrationSql).toContain("'{invoice,status}', to_jsonb('paid'::text)");
    expect(migrationSql).not.toContain('stripe');
    expect(migrationSql).not.toContain('ach_account');
    expect(migrationSql).not.toContain('bank_account');
  });

  it('does not expose forbidden financial data or mutate invoice review history', () => {
    expect(migrationSql).not.toContain('client_fee');
    expect(migrationSql).not.toContain('amc_margin');
    expect(migrationSql).not.toContain('review_history');
    expect(migrationSql).not.toContain('internal_reviewer_note');
  });
});
