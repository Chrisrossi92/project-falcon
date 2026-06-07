import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260605105000_amc_vendor_assignment_internal_notes.sql',
);
const vendorDetailMigrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260604115000_amc_vendor_workspace_assigned_order_detail_rpc.sql',
);
const vendorWorkspaceSql = readFileSync(vendorDetailMigrationPath, 'utf8');
const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC vendor assignment internal notes migration', () => {
  it('creates an internal-only note table with direct app access revoked', () => {
    expect(migrationSql).toContain('create table if not exists public.order_company_assignment_internal_notes');
    expect(migrationSql).toContain('assignment_id uuid not null references public.order_company_assignments(id)');
    expect(migrationSql).toContain('order_id uuid not null references public.orders(id)');
    expect(migrationSql).toContain('owner_company_id uuid not null references public.companies(id)');
    expect(migrationSql).toContain('author_user_id uuid not null references public.users(id)');
    expect(migrationSql).toContain('alter table public.order_company_assignment_internal_notes enable row level security');
    expect(migrationSql).toContain(
      'revoke all privileges on table public.order_company_assignment_internal_notes from public, anon, authenticated',
    );
    expect(migrationSql).toContain('grant all privileges on table public.order_company_assignment_internal_notes to service_role');
  });

  it('creates list and add RPCs with security-definer posture and authenticated grants only', () => {
    [
      'create or replace function public.rpc_amc_vendor_assignment_internal_notes(',
      'create or replace function public.rpc_amc_add_vendor_assignment_internal_note(',
      'returns jsonb',
      'security definer',
      'set search_path = public',
      'revoke all on function public.rpc_amc_vendor_assignment_internal_notes(uuid) from public, anon',
      'revoke all on function public.rpc_amc_add_vendor_assignment_internal_note(uuid, jsonb) from public, anon',
      'grant execute on function public.rpc_amc_vendor_assignment_internal_notes(uuid) to authenticated, service_role',
      'grant execute on function public.rpc_amc_add_vendor_assignment_internal_note(uuid, jsonb) to authenticated, service_role',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('requires internal owner permissions and AMC vendor assignment context', () => {
    [
      'current_app_user_id()',
      'current_company_id()',
      'current_app_user_has_current_company()',
      "current_app_user_has_permission('order_company_assignments.read_owner')",
      "current_app_user_has_permission('order_company_assignments.complete')",
      'v_assignment.owner_company_id <> v_company_id',
      "v_relationship.relationship_type <> 'amc_vendor'",
      "v_assignment.assignment_type <> 'vendor_appraisal'",
      "coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'",
      'current_app_user_can_read_order(v_assignment.order_id)',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    expect(migrationSql).not.toContain("current_app_user_has_permission('vendor_assignments.read')");
    expect(migrationSql).not.toContain("current_app_user_has_permission('vendor_assignments.progress')");
  });

  it('validates note payloads and keeps note context constrained', () => {
    expect(migrationSql).toContain("note_context in ('review', 'revision', 'completion', 'general')");
    expect(migrationSql).toContain('length(note_text) <= 4000');
    expect(migrationSql).toContain("'internal_note_invalid'");
    expect(migrationSql).toContain("'note_text', 'Add an internal note.'");
    expect(migrationSql).toContain("'note_context', 'Choose a valid note context.'");
  });

  it('returns coordinator-safe note rows without leaking assignment/order identifiers', () => {
    expect(migrationSql).toContain("'note_key'");
    expect(migrationSql).toContain('extensions.digest');
    expect(migrationSql).toContain("'note_context'");
    expect(migrationSql).toContain("'note_text'");
    expect(migrationSql).toContain("'author_name'");
    expect(migrationSql).toContain("'created_at'");
    expect(migrationSql).not.toContain("'assignment_id'");
    expect(migrationSql).not.toContain("'order_id'");
    expect(migrationSql).not.toContain("'relationship_id'");
    expect(migrationSql).not.toContain("'storage_path'");
  });

  it('does not write shared activity, notifications, vendor payloads, token payloads, orders, or assignment lifecycle', () => {
    expect(migrationSql).toContain('intentionally does not write shared activity, notifications');
    expect(migrationSql).not.toContain('log_order_company_assignment_event');
    expect(migrationSql).not.toContain('notify_order_company_assignment_event');
    expect(migrationSql).not.toContain('insert into public.activity_log');
    expect(migrationSql).not.toContain('insert into public.notifications');
    expect(migrationSql).not.toContain('order_company_assignment_invitations');
    expect(migrationSql).not.toContain('order_company_assignment_work_invitations');
    expect(migrationSql).not.toContain('update public.order_company_assignments');
    expect(migrationSql).not.toContain('update public.orders');
  });

  it('does not add internal notes to Vendor Workspace assigned order detail', () => {
    expect(vendorWorkspaceSql).not.toContain('order_company_assignment_internal_notes');
    expect(vendorWorkspaceSql).not.toContain('rpc_amc_vendor_assignment_internal_notes');
    expect(vendorWorkspaceSql).not.toContain('rpc_amc_add_vendor_assignment_internal_note');
    expect(vendorWorkspaceSql).not.toContain("'internal_note'");
    expect(vendorWorkspaceSql).not.toContain("'internal_notes'");
  });
});
