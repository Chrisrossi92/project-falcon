import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260625100000_internal_revision_note_notification_suppression.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('internal revision note notification suppression migration', () => {
  it('replaces the existing activity note notification trigger function only', () => {
    expect(migrationSql).toContain('create or replace function public.tg_activity_note_notification_v1()');
    expect(migrationSql).toContain('returns trigger');
    expect(migrationSql).toContain('set search_path = public');
    expect(migrationSql).not.toContain('create trigger');
    expect(migrationSql).not.toContain('drop trigger');
  });

  it('suppresses generic note fanout using metadata, not note text prefixes', () => {
    expect(migrationSql).toContain("NEW.detail->>'notification_suppressed'");
    expect(migrationSql).toContain("NEW.detail #>> '{metadata,notification_suppressed}'");
    expect(migrationSql).toContain("NEW.detail->>'workflow_event'");
    expect(migrationSql).toContain("NEW.detail #>> '{metadata,workflow_event}'");
    expect(migrationSql).toContain("v_notification_suppressed in ('true', 't', '1', 'yes', 'on')");
    expect(migrationSql).toContain("v_workflow_event in ('request_revisions', 'workflow.request_revisions')");
    expect(migrationSql).not.toContain('Revision note:');
  });

  it('keeps ordinary manual note fanout intact', () => {
    expect(migrationSql).toContain("not in ('note', 'note_added', 'activity_note')");
    expect(migrationSql).toContain("'note.added'");
    expect(migrationSql).toContain('perform public.notify_order_v1_event');
    expect(migrationSql).toContain("v_actor_role = 'reviewer'");
    expect(migrationSql).toContain("v_recipient_kinds := array['appraiser', 'admin_owner']");
  });
});
