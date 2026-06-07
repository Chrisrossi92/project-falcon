import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260606130000_amc_revision_assignment_status_guard.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('AMC revision assignment status guard migration', () => {
  it('replaces only the existing assignment guard function without creating a parallel lifecycle', () => {
    expect(migrationSql).toContain('create or replace function public.tg_order_company_assignments_guard()');
    expect(migrationSql).toContain('returns trigger');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).not.toContain('create trigger');
    expect(migrationSql).not.toContain('create table');
    expect(migrationSql).not.toContain('update public.orders');
  });

  it('extends the existing assignment activity allowlist for revision request and resubmission events only', () => {
    expect(migrationSql).toContain('drop constraint if exists order_company_assignment_activity_event_type_valid');
    expect(migrationSql).toContain('add constraint order_company_assignment_activity_event_type_valid check');
    expect(migrationSql).toContain("'assignment.revision_requested'");
    expect(migrationSql).toContain("'assignment.resubmitted'");
    expect(migrationSql).toContain("'assignment.submitted'");
    expect(migrationSql).toContain("'assignment.completed'");
    expect(migrationSql).toContain('without creating a separate lifecycle');
  });

  it('allows the validated revision loop without adding a persisted resubmitted status', () => {
    expect(migrationSql).toContain(
      "OLD.status = 'submitted' and NEW.status not in ('completed', 'in_progress', 'revision_requested', 'revoked')",
    );
    expect(migrationSql).toContain(
      "OLD.status = 'revision_requested' and NEW.status not in ('submitted')",
    );
    expect(migrationSql).not.toContain("'resubmitted'");
    expect(migrationSql).toContain('Resubmitted remains a vendor-facing label');
  });

  it('keeps accepted and in-progress assignments from jumping directly to revision_requested', () => {
    expect(migrationSql).toContain(
      "OLD.status = 'accepted' and NEW.status not in ('in_progress', 'submitted', 'cancelled', 'revoked')",
    );
    expect(migrationSql).toContain(
      "OLD.status = 'in_progress' and NEW.status not in ('submitted', 'cancelled', 'revoked')",
    );
    expect(migrationSql).not.toContain(
      "OLD.status = 'accepted' and NEW.status not in ('in_progress', 'submitted', 'revision_requested'",
    );
    expect(migrationSql).not.toContain(
      "OLD.status = 'in_progress' and NEW.status not in ('submitted', 'revision_requested'",
    );
  });

  it('preserves terminal status protections', () => {
    expect(migrationSql).toContain(
      "OLD.status in ('completed', 'declined', 'cancelled', 'revoked')",
    );
    expect(migrationSql).toContain('Terminal order-company assignment status cannot transition');
  });

  it('preserves company, relationship, active assignment, and assignment-type guards', () => {
    [
      'order_company_assignments.order_id is immutable',
      'order_company_assignments.owner_company_id is immutable',
      'order_company_assignments.assigned_company_id is immutable',
      'order_company_assignments.relationship_id is immutable',
      'Order-company assignment owner company must match source order company',
      'Order-company assignment relationship source must match owner company',
      'Order-company assignment relationship target must match assigned company',
      "NEW.status in ('offered', 'accepted', 'in_progress', 'submitted', 'revision_requested')",
      'public.order_company_assignment_expected_type',
      'Assignment type % is incompatible with relationship type %',
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it('keeps the trigger function executable only by service_role', () => {
    expect(migrationSql).toContain(
      'revoke all privileges on function public.tg_order_company_assignments_guard() from public, anon, authenticated',
    );
    expect(migrationSql).toContain(
      'grant execute on function public.tg_order_company_assignments_guard() to service_role',
    );
  });
});
