import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260602153000_amc_bid_request_schema_foundation.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC bid request schema foundation migration', () => {
  it('creates the approved bid request tables only', () => {
    expect(migrationSql).toContain('create table if not exists public.order_vendor_bid_requests');
    expect(migrationSql).toContain(
      'create table if not exists public.order_vendor_bid_request_recipients',
    );
    expect(migrationSql).toContain('create table if not exists public.order_vendor_bid_responses');

    expect(migrationSql).not.toContain('create table if not exists public.order_company_assignments');
    expect(migrationSql).not.toContain('create table if not exists public.orders');
    expect(migrationSql).not.toContain('create table if not exists public.order_vendor_bid_notifications');
  });

  it('adds request, recipient, and response status/check constraints', () => {
    expect(migrationSql).toContain('order_vendor_bid_requests_status_valid');
    expect(migrationSql).toContain(
      "status in ('draft', 'sent', 'partially_responded', 'closed', 'cancelled', 'expired')",
    );
    expect(migrationSql).toContain('order_vendor_bid_request_recipients_status_valid');
    expect(migrationSql).toContain(
      "status in ('pending', 'sent', 'viewed', 'responded', 'declined', 'expired', 'cancelled', 'selected', 'not_selected')",
    );
    expect(migrationSql).toContain('order_vendor_bid_responses_fee_non_negative');
    expect(migrationSql).toContain('order_vendor_bid_responses_turn_time_non_negative');
    expect(migrationSql).toContain('order_vendor_bid_responses_currency_format');
    expect(migrationSql).toContain("currency ~ '^[A-Z]{3}$'");
    expect(migrationSql).toContain("jsonb_typeof(metadata) = 'object'");
  });

  it('adds the expected foreign keys and structural guard triggers', () => {
    [
      'order_vendor_bid_requests_company_fkey',
      'order_vendor_bid_requests_order_fkey',
      'order_vendor_bid_requests_requested_by_user_fkey',
      'order_vendor_bid_request_recipients_request_fkey',
      'order_vendor_bid_request_recipients_profile_fkey',
      'order_vendor_bid_request_recipients_vendor_company_fkey',
      'order_vendor_bid_request_recipients_relationship_fkey',
      'order_vendor_bid_responses_recipient_fkey',
      'order_vendor_bid_responses_selected_by_user_fkey',
    ].forEach((constraintName) => {
      expect(migrationSql).toContain(constraintName);
      expect(migrationSql).toContain('not valid');
    });

    expect(migrationSql).toContain('create or replace function public.tg_order_vendor_bid_requests_guard');
    expect(migrationSql).toContain('Bid request company must match order company');
    expect(migrationSql).toContain(
      'create or replace function public.tg_order_vendor_bid_request_recipients_guard',
    );
    expect(migrationSql).toContain('Bid request recipients require an amc_vendor relationship');
    expect(migrationSql).toContain('create or replace function public.tg_order_vendor_bid_touch_updated_at');
  });

  it('adds the approved indexes without cross-request duplicate denormalization', () => {
    [
      'idx_order_vendor_bid_requests_company_order',
      'idx_order_vendor_bid_requests_company_status',
      'idx_order_vendor_bid_requests_order_status',
      'idx_order_vendor_bid_requests_response_due',
      'order_vendor_bid_request_recipients_request_vendor_unique',
      'idx_order_vendor_bid_request_recipients_request_status',
      'idx_order_vendor_bid_request_recipients_vendor_profile_status',
      'idx_order_vendor_bid_request_recipients_vendor_company_status',
      'idx_order_vendor_bid_request_recipients_relationship',
      'order_vendor_bid_responses_recipient_unique',
      'idx_order_vendor_bid_responses_selected',
      'idx_order_vendor_bid_responses_submitted',
    ].forEach((indexName) => {
      expect(migrationSql).toContain(indexName);
    });

    expect(migrationSql).toContain(
      'on public.order_vendor_bid_request_recipients (bid_request_id, vendor_profile_id)',
    );
    expect(migrationSql).not.toContain('order_vendor_bid_request_recipients (order_id');
  });

  it('enables RLS and blocks direct app table access', () => {
    [
      'order_vendor_bid_requests',
      'order_vendor_bid_request_recipients',
      'order_vendor_bid_responses',
    ].forEach((tableName) => {
      expect(migrationSql).toContain(`alter table public.${tableName} enable row level security`);
      expect(migrationSql).toContain(
        `revoke all privileges on table public.${tableName} from public, anon, authenticated`,
      );
      expect(migrationSql).toContain(`grant all privileges on table public.${tableName} to service_role`);
    });

    expect(migrationSql).toContain(
      'revoke all privileges on function public.tg_order_vendor_bid_requests_guard() from public, anon, authenticated',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.tg_order_vendor_bid_requests_guard() to service_role',
    );
  });

  it('documents that bid requests and responses are not assignments', () => {
    expect(migrationSql).toContain('Bid requests are not assignments');
    expect(migrationSql).toContain('do not create order_company_assignments packets');
    expect(migrationSql).toContain('Responses are not assignment acceptance');
    expect(migrationSql).toContain('Selection alone does not create an assignment packet');
  });

  it('does not create RPCs, UI/routes, assignment writes, or order mutations', () => {
    expect(migrationSql).not.toContain('rpc_order_company_assignment_offer');
    expect(migrationSql).not.toContain('rpc_order_vendor_bid');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('orders.appraiser_id');
    expect(migrationSql).not.toContain('orders.reviewer_id');
    expect(migrationSql).not.toMatch(/path\s*=\s*'\/amc\//i);
  });
});
