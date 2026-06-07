import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/20260607100000_amc_notification_workspace_scope.sql",
  "utf8",
);

describe("AMC notification workspace scope migration", () => {
  it("adds scoped notification list and unread-count RPC signatures", () => {
    expect(migrationSql).toContain("create or replace function public.notification_row_matches_operations_scope");
    expect(migrationSql).toContain("create or replace function public.rpc_get_notifications");
    expect(migrationSql).toContain("p_operations_scope text default null");
    expect(migrationSql).toContain("create or replace function public.rpc_get_unread_count");
    expect(migrationSql).toContain("and public.notification_row_matches_operations_scope(n, p_operations_scope)");
  });

	  it("scopes order notifications through orders.operations_scope", () => {
	    expect(migrationSql).toContain("from public.orders o");
	    expect(migrationSql).toContain("o.id = p_notification.order_id");
	    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = p_operations_scope");
	  });

	  it("keeps unscoped operational notifications out of AMC scope by default", () => {
	    expect(migrationSql).toContain("concat_ws(' ',");
	    expect(migrationSql).toContain("!~* '(order|assignment|bid|invoice|payment|vendor|procurement)'");
	    expect(migrationSql).toContain("or p_operations_scope = 'internal_operations'");
	  });

  it("scopes bulk read and dismiss actions to the selected workspace", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_mark_all_notifications_read");
    expect(migrationSql).toContain("create or replace function public.rpc_dismiss_seen_notifications");
    expect(migrationSql.match(/notification_row_matches_operations_scope\(n, p_operations_scope\)/g)?.length)
      .toBeGreaterThanOrEqual(4);
  });
});
