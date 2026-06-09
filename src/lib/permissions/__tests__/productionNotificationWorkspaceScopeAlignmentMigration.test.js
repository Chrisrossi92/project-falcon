import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/20260608190000_production_notification_workspace_scope_alignment.sql",
  "utf8",
);

describe("production notification workspace scope alignment migration", () => {
  it("adds the scoped notification RPC contracts expected by deployed clients", () => {
    expect(migrationSql).toContain("create or replace function public.notification_row_matches_operations_scope");
    expect(migrationSql).toContain("create or replace function public.rpc_get_notifications");
    expect(migrationSql).toContain("p_operations_scope text default null");
    expect(migrationSql).toContain("create or replace function public.rpc_get_unread_count");
    expect(migrationSql).toContain("create or replace function public.rpc_mark_all_notifications_read");
    expect(migrationSql).toContain("create or replace function public.rpc_dismiss_seen_notifications");
  });

  it("preserves legacy unscoped overloads by never dropping them", () => {
    expect(migrationSql).not.toContain("drop function if exists public.rpc_get_notifications");
    expect(migrationSql).not.toContain("drop function if exists public.rpc_get_unread_count");
    expect(migrationSql).not.toContain("drop function if exists public.rpc_mark_all_notifications_read");
    expect(migrationSql).not.toContain("drop function if exists public.rpc_dismiss_seen_notifications");
    expect(migrationSql).not.toContain("revoke all on function public.rpc_get_notifications(integer, timestamptz)");
    expect(migrationSql).not.toContain("revoke all on function public.rpc_get_unread_count()");
    expect(migrationSql).not.toContain("revoke all on function public.rpc_mark_all_notifications_read()");
    expect(migrationSql).not.toContain("revoke all on function public.rpc_dismiss_seen_notifications()");
  });

  it("keeps Internal and AMC isolation anchored to order scope and safe payload scope fields", () => {
    expect(migrationSql).toContain("from public.orders o");
    expect(migrationSql).toContain("o.id = p_notification.order_id");
    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = p_operations_scope");
    expect(migrationSql).toContain("p_notification.payload ->> 'operations_scope'");
    expect(migrationSql).toContain("p_notification.payload ->> 'order_operations_scope'");
  });

  it("keeps unscoped operational notifications out of AMC scope by default", () => {
    expect(migrationSql).toContain("concat_ws(' ',");
    expect(migrationSql).toContain("!~* '(order|assignment|bid|invoice|payment|vendor|procurement)'");
    expect(migrationSql).toContain("or p_operations_scope = 'internal_operations'");
  });

  it("preserves scoped grants and production schema-cache comments", () => {
    expect(migrationSql).toContain("grant execute on function public.rpc_get_notifications(integer, timestamptz, text)");
    expect(migrationSql).toContain("grant execute on function public.rpc_get_unread_count(text)");
    expect(migrationSql).toContain("grant execute on function public.rpc_mark_all_notifications_read(text)");
    expect(migrationSql).toContain("grant execute on function public.rpc_dismiss_seen_notifications(text)");
    expect(migrationSql).toContain("Production notification alignment scoped notification list");
  });
});
