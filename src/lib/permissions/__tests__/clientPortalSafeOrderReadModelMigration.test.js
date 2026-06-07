import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260607100000_client_portal_safe_order_read_model.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

const reportDownloadMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260607101000_client_portal_report_download_authorization.sql',
);

const reportDownloadMigrationSql = readFileSync(reportDownloadMigrationPath, 'utf8');

const reportDownloadFunctionPath = resolve(
  process.cwd(),
  'supabase/functions/client-portal-report-download-url/index.ts',
);

const reportDownloadFunctionSource = readFileSync(reportDownloadFunctionPath, 'utf8');

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

describe('Client Portal report download authorization', () => {
  it('creates a dedicated opaque-key report authorization RPC', () => {
    expect(reportDownloadMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_report_authorize_download(p_order_key text)',
    );
    expect(reportDownloadMigrationSql).toContain("raise exception 'client_portal_order_key_required'");
    expect(reportDownloadMigrationSql).toContain("raise exception 'client_portal_access_required'");
    expect(reportDownloadMigrationSql).toContain("client_portal.reports.read");
    expect(reportDownloadMigrationSql).toContain('public.current_app_user_client_portal_client_ids()');
    expect(reportDownloadMigrationSql).toContain('v.company_id = public.current_company_id()');
  });

  it('authorizes only active client-visible final report documents', () => {
    expect(reportDownloadMigrationSql).toContain("od.category = 'final_report'");
    expect(reportDownloadMigrationSql).toContain("od.visibility_scope = 'client'");
    expect(reportDownloadMigrationSql).toContain("od.status = 'active'");
    expect(reportDownloadMigrationSql).not.toContain("od.category <> 'final_report'");
    expect(reportDownloadMigrationSql).not.toContain("od.visibility_scope <> 'client'");
  });

  it('does not expose raw order ids storage paths buckets or signed URLs from the authorization RPC', () => {
    expect(reportDownloadMigrationSql).not.toContain('order_id uuid');
    expect(reportDownloadMigrationSql).not.toContain('order_id,');
    expect(reportDownloadMigrationSql).not.toContain('storage_path');
    expect(reportDownloadMigrationSql).not.toContain('storage_bucket');
    expect(reportDownloadMigrationSql).not.toContain('signed_url');
  });

  it('uses a client-specific Edge Function to sign storage service-side', () => {
    expect(reportDownloadFunctionSource).toContain('rpc_client_portal_report_authorize_download');
    expect(reportDownloadFunctionSource).toContain('order_key');
    expect(reportDownloadFunctionSource).toContain('.eq("category", "final_report")');
    expect(reportDownloadFunctionSource).toContain('.eq("visibility_scope", "client")');
    expect(reportDownloadFunctionSource).toContain('.eq("status", "active")');
    expect(reportDownloadFunctionSource).toContain('createSignedUrl');
    expect(reportDownloadFunctionSource).not.toContain('order_id:');
    expect(reportDownloadFunctionSource).not.toContain('storage_path:');
    expect(reportDownloadFunctionSource).not.toContain('storage_bucket:');
  });
});
