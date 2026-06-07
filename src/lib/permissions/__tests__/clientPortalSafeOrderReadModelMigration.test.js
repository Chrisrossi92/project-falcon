import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260607100000_client_portal_safe_order_read_model.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Client Portal safe order read model migration', () => {
  it('creates dedicated Client Portal permissions, member mapping, view, and RPCs', () => {
    expect(migrationSql).toContain("'client_portal.dashboard.view'");
    expect(migrationSql).toContain("'client_portal.orders.read'");
    expect(migrationSql).toContain('create table if not exists public.client_portal_members');
    expect(migrationSql).toContain('create or replace view public.v_client_portal_order_status');
    expect(migrationSql).toContain('create or replace function public.rpc_client_portal_dashboard()');
    expect(migrationSql).toContain('create or replace function public.rpc_client_portal_orders()');
    expect(migrationSql).toContain('create or replace function public.rpc_client_portal_order_detail(p_order_key text)');
  });

  it('scopes reads to active mapped client accounts in the current company', () => {
    expect(migrationSql).toContain('public.current_company_id()');
    expect(migrationSql).toContain('public.current_app_user_id()');
    expect(migrationSql).toContain("cpm.status = 'active'");
    expect(migrationSql).toContain('public.current_app_user_client_portal_client_ids()');
    expect(migrationSql).toContain('v.client_id in (');
    expect(migrationSql).toContain("raise exception 'client_portal_access_required'");
  });

  it('returns opaque order keys and does not expose raw identifiers, storage paths, or signed URLs', () => {
    expect(migrationSql).toContain('client_portal_order_key(');
    expect(migrationSql).toContain("'client_portal_order_v1'");
    expect(migrationSql).toContain('order_key text');
    expect(migrationSql).not.toContain('signed_url');
    expect(migrationSql).not.toContain('storage_path,');
    expect(migrationSql).not.toContain('storage_bucket,');
  });

  it('limits report exposure to client-visible final report metadata', () => {
    expect(migrationSql).toContain("od.category = 'final_report'");
    expect(migrationSql).toContain("od.visibility_scope = 'client'");
    expect(migrationSql).toContain("od.status = 'active'");
    expect(migrationSql).toContain('report_available');
    expect(migrationSql).toContain('report_delivered_at');
    expect(migrationSql).toContain('report_file_name');
  });

  it('does not return vendor procurement assignment fee margin or private-note fields', () => {
    const forbiddenPayloadFields = [
      'vendor_company_id',
      'bid_request_id',
      'assigned_company_id',
      'appraiser_id',
      'reviewer_id',
      'internal_note',
      'private_note',
      'client_invoice_amount',
      'appraiser_fee',
      'base_fee',
      'fee_amount',
      'split_pct',
      'amc_margin',
      'paid_status',
      'invoice_number',
    ];

    forbiddenPayloadFields.forEach((field) => {
      expect(migrationSql).not.toContain(`${field} `);
      expect(migrationSql).not.toContain(`${field},`);
    });
  });
});
