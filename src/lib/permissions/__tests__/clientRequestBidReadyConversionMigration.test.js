import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260608180000_client_request_bid_ready_conversion.sql'),
  'utf8',
).toLowerCase();

describe('Client request bid-ready conversion migration', () => {
  it('recreates only the staff-confirmed conversion RPC', () => {
    expect(migrationSql).toContain(
      'create or replace function public.rpc_client_portal_order_request_convert_to_order(',
    );
    expect(migrationSql).toContain('public.current_app_user_can_manage_client_portal_order_requests()');
    expect(migrationSql).toContain('public.current_app_user_can_create_order()');
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_client_portal_order_request_convert_to_order(text)',
    );
  });

  it('creates converted requests as current-company AMC Operations orders', () => {
    expect(migrationSql).toContain('company_id,');
    expect(migrationSql).toContain('operations_scope,');
    expect(migrationSql).toContain('v_request.company_id');
    expect(migrationSql).toContain("'amc_operations'");
    expect(migrationSql).toContain('public.next_order_number_v2(v_request.company_id, now())');
  });

  it('maps intake fields into the operational order', () => {
    [
      'v_request.client_id',
      'v_request.property_address',
      'v_request.property_type',
      'v_request.report_type',
      'v_request.borrower_contact_name',
      'v_request.client_contact_name',
      'v_request.client_contact_email',
      'v_request.client_contact_phone',
      'v_request.requested_due_date::timestamptz',
      "'intended use / loan purpose: ' || v_request.loan_purpose",
      "'created from client portal request.'",
      "'client portal request key: ' || v_request_key",
    ].forEach((snippet) => {
      expect(migrationSql).toContain(snippet);
    });
  });

  it('preserves duplicate and terminal-state safeguards', () => {
    expect(migrationSql).toContain("v_request.status in ('declined', 'cancelled')");
    expect(migrationSql).toContain("v_request.status = 'accepted'");
    expect(migrationSql).toContain('v_request.accepted_order_id is not null');
    expect(migrationSql).toContain("v_request.status not in ('submitted', 'under_review')");
    expect(migrationSql).toContain('for update');
  });

  it('does not create downstream procurement or payment records during conversion', () => {
    [
      'insert into public.bid_requests',
      'insert into public.bid_request_recipients',
      'insert into public.order_company_assignments',
      'insert into public.amc_vendor_invoices',
      'insert into public.amc_vendor_payment_ledger',
      'insert into public.order_documents',
    ].forEach((forbidden) => {
      expect(migrationSql).not.toContain(forbidden);
    });
  });
});
