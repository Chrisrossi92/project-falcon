import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260603102000_amc_order_procurement_summaries_rpc.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC order procurement summaries RPC migration', () => {
  it('creates the batched procurement summary RPC with the expected signature', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_amc_order_procurement_summaries');
    expect(migrationSql).toContain('p_order_ids uuid[]');
    expect(migrationSql).toContain('returns table');
    [
      'order_id uuid',
      'status text',
      'label text',
      'tone text',
      'contacted_count integer',
      'responded_count integer',
      'selected_vendor_name text',
      'response_due_at timestamptz',
      'client_due_at timestamptz',
      'assignment_status text',
      'assignment_id uuid',
    ].forEach((returnColumn) => {
      expect(migrationSql).toContain(returnColumn);
    });
  });

  it('uses security-definer RPC posture and grants execute only to authenticated/service_role', () => {
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_amc_order_procurement_summaries(uuid[]) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_amc_order_procurement_summaries(uuid[]) to authenticated, service_role',
    );
  });

  it('requires current app user, company membership, bid read permission, and order read authority', () => {
    expect(migrationSql).toContain('current_app_user_id()');
    expect(migrationSql).toContain('current_company_id()');
    expect(migrationSql).toContain('current_app_user_has_current_company()');
    expect(migrationSql).toContain("current_app_user_has_permission('bid_requests.read')");
    expect(migrationSql).toContain("raise exception 'bid_request_read_permission_required'");
    expect(migrationSql).toContain('public.current_app_user_can_read_order(o.id)');
  });

  it('returns only current-company AMC orders and handles null or empty input safely', () => {
    expect(migrationSql).toContain('p_order_ids is null or cardinality(p_order_ids) = 0');
    expect(migrationSql).toContain('select distinct unnest(p_order_ids) as id');
    expect(migrationSql).toContain('coalesce(o.company_id, public.default_company_id()) = v_company_id');
    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'");
  });

  it('derives from bid requests, recipients, responses, and vendor assignment packets', () => {
    expect(migrationSql).toContain('from public.order_vendor_bid_requests br');
    expect(migrationSql).toContain('left join public.order_vendor_bid_request_recipients brr');
    expect(migrationSql).toContain('left join public.order_vendor_bid_responses response');
    expect(migrationSql).toContain('from public.order_company_assignments oca');
    expect(migrationSql).toContain("oca.assignment_type = 'vendor_appraisal'");
    expect(migrationSql).toContain("oca.status in ('offered', 'accepted', 'in_progress', 'submitted')");
  });

  it('implements the approved compact status precedence and labels', () => {
    const assignedPosition = migrationSql.indexOf("then 'assigned'");
    const offeredPosition = migrationSql.indexOf("then 'assignment_offered'");
    const selectedPosition = migrationSql.indexOf("then 'bid_selected'");
    const responsesPosition = migrationSql.indexOf("then 'responses_received'");
    const requestedPosition = migrationSql.indexOf("then 'bids_requested'");
    const noBidsPosition = migrationSql.indexOf("else 'no_bids'");

    expect(assignedPosition).toBeGreaterThan(-1);
    expect(offeredPosition).toBeGreaterThan(assignedPosition);
    expect(selectedPosition).toBeGreaterThan(offeredPosition);
    expect(responsesPosition).toBeGreaterThan(selectedPosition);
    expect(requestedPosition).toBeGreaterThan(responsesPosition);
    expect(noBidsPosition).toBeGreaterThan(requestedPosition);

    [
      'Assigned',
      'Assignment Offered',
      'Bid Selected',
      'Responses Received',
      'Bids Requested',
      'No Bids',
    ].forEach((label) => {
      expect(migrationSql).toContain(`'${label}'`);
    });
  });

  it('returns compact table rendering metadata without frontend route assumptions', () => {
    expect(migrationSql).toContain("'success'");
    expect(migrationSql).toContain("'warning'");
    expect(migrationSql).toContain("'info'");
    expect(migrationSql).toContain("'neutral'");
    expect(migrationSql).toContain('selected_vendor_name');
    expect(migrationSql).toContain('contacted_count');
    expect(migrationSql).toContain('responded_count');
    expect(migrationSql).not.toMatch(/path\s*=\s*'\/amc\//i);
  });

  it('is read-only and does not mutate bids, assignments, orders, or navigation state', () => {
    expect(migrationSql).not.toContain('insert into public.order_vendor_bid');
    expect(migrationSql).not.toContain('update public.order_vendor_bid');
    expect(migrationSql).not.toContain('delete from public.order_vendor_bid');
    expect(migrationSql).not.toContain('insert into public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('delete from public.order_company_assignments');
    expect(migrationSql).not.toContain('insert into public.orders');
    expect(migrationSql).not.toContain('update public.orders');
    expect(migrationSql).not.toContain('delete from public.orders');
    expect(migrationSql).toContain('without mutating bid rows, assignment packets, orders');
  });
});
