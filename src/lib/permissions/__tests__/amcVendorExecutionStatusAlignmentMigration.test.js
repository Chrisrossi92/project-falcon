import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260610110000_amc_vendor_execution_status_alignment.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');
const normalizedSql = migrationSql.replace(/\s+/g, ' ');

describe('AMC vendor execution status alignment migration', () => {
  it('replaces vendor workspace assigned-order RPCs without weakening vendor isolation', () => {
    expect(migrationSql).toContain('create or replace function public.rpc_vendor_workspace_assigned_orders()');
    expect(migrationSql).toContain(
      'create or replace function public.rpc_vendor_workspace_assigned_order_detail(p_assignment_work_key text)',
    );
    expect(migrationSql).toContain("current_app_user_has_permission('vendor_assignments.read')");
    expect(migrationSql).toContain('where oca.assigned_company_id = v_vendor_company_id');
    expect(migrationSql).toContain("oca.assignment_type = 'vendor_appraisal'");
    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'");
    expect(migrationSql).toContain("cr.relationship_type = 'amc_vendor'");
    expect(migrationSql).toContain("cvp.vendor_status not in ('inactive', 'do_not_use')");
  });

  it('projects resubmitted vendor reports distinctly in list and detail RPCs', () => {
    expect(migrationSql).toContain("'resubmitted_awaiting_review'");
    expect(migrationSql).toContain("'Resubmitted / Awaiting Review'");
    expect(migrationSql).toContain("nullif(oca.submission_payload #>> '{resubmission,resubmitted_at}', '')");
    expect(migrationSql).toContain("'status',");
    expect(migrationSql).toContain("when selected_assignment.resubmitted_at is not null then 'resubmitted'");
  });

  it('writes execution milestones to order Activity Log and completes AMC orders on assignment completion', () => {
    [
      "'assignment_started'",
      "'assignment_submitted'",
      "'assignment_revision_requested'",
      "'assignment_resubmitted'",
      "'assignment_completed'",
      "'order_completed'",
      'perform public.amc_log_order_procurement_activity',
      'update public.orders o',
      "set status = 'completed'",
      "coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('does not add notification fanout, email delivery, public token changes, or assignment table writes', () => {
    expect(normalizedSql).not.toContain('insert into public.notifications');
    expect(normalizedSql).not.toContain('insert into public.email_queue');
    expect(normalizedSql).not.toContain('notify_order_company_assignment_event');
    expect(normalizedSql).not.toContain('rpc_order_company_assignment_work_invitation_read');
    expect(normalizedSql).not.toContain('rpc_order_company_assignment_work_invitation_respond');
    expect(normalizedSql).not.toContain('rpc_order_vendor_bid_request_create');
    expect(normalizedSql).not.toContain('insert into public.order_company_assignments');
    expect(normalizedSql).not.toContain('delete from public.order_company_assignments');
  });

  it('preserves execute grants for authenticated/service_role RPC callers only', () => {
    expect(migrationSql).toContain('revoke all on function public.rpc_vendor_workspace_assigned_orders() from public, anon');
    expect(migrationSql).toContain(
      'revoke all on function public.rpc_vendor_workspace_assigned_order_detail(text) from public, anon',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_assigned_orders() to authenticated, service_role',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.rpc_vendor_workspace_assigned_order_detail(text) to authenticated, service_role',
    );
  });
});
