import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(testDir, "../../../..");
const migrationPath = resolve(
  repoRoot,
  "supabase/migrations/20260610170000_amc_vendor_execution_audit_only_notifications.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.toLowerCase();

describe("AMC vendor execution audit-only notification alignment migration", () => {
  it("overrides only the assignment notification writer", () => {
    expect(migrationSql).toContain("create or replace function public.notify_order_company_assignment_event");
    expect(migrationSql).toContain("returns integer");
    expect(migrationSql).toContain("grant execute on function public.notify_order_company_assignment_event");
  });

  it("returns before notification inserts for AMC vendor execution review events", () => {
    [
      "v_assignment.assignment_type = 'vendor_appraisal'",
      "coalesce(v_order.operations_scope, 'internal_operations') = 'amc_operations'",
      "'assignment.submitted'",
      "'assignment.revision_requested'",
      "'assignment.resubmitted'",
      "'assignment.completed'",
      "return 0;",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });

    expect(migrationSql.indexOf("return 0;")).toBeLessThan(
      migrationSql.indexOf("insert into public.notifications"),
    );
  });

  it("does not create email queue rows and preserves non-AMC notification behavior", () => {
    expect(normalizedSql).not.toContain("insert into public.email_queue");
    expect(normalizedSql).toContain("insert into public.notifications");
    expect(migrationSql).toContain("order_company_assignment_assigned_notification_recipients");
    expect(migrationSql).toContain("order_company_assignment_owner_notification_recipients");
    expect(migrationSql).toContain("Preserves existing assignment notification behavior except AMC");
  });
});
