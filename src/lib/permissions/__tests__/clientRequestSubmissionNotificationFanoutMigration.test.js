import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/20260608200000_client_request_submission_notification_fanout.sql",
  "utf8",
);

describe("client request submission notification fanout migration", () => {
  it("recreates the active client portal order request create RPC", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_client_portal_order_request_create(");
    expect(migrationSql).toContain("from public.current_app_user_client_portal_memberships() readable");
    expect(migrationSql).toContain("insert into public.client_portal_order_requests");
    expect(migrationSql).toContain("returning *");
    expect(migrationSql).toContain("into v_request");
  });

  it("fans out backend-owned in-app notifications after the request insert", () => {
    expect(migrationSql).toContain("insert into public.notifications");
    expect(migrationSql.indexOf("insert into public.notifications"))
      .toBeGreaterThan(migrationSql.indexOf("insert into public.client_portal_order_requests"));
    expect(migrationSql).toContain("'client_portal.order_request.submitted'");
    expect(migrationSql).toContain("'New client request submitted'");
    expect(migrationSql).toContain("'action'");
  });

  it("targets active owner/admin and client-request-review staff in the request company", () => {
    expect(migrationSql).toContain("from public.company_memberships cm");
    expect(migrationSql).toContain("join public.user_role_assignments ura");
    expect(migrationSql).toContain("join public.roles r");
    expect(migrationSql).toContain("left join public.role_permissions rp");
    expect(migrationSql).toContain("'client_portal.order_requests.read'");
    expect(migrationSql).toContain("'client_portal.order_requests.manage'");
    expect(migrationSql).toContain("r.is_owner_role");
    expect(migrationSql).toContain("lower(btrim(r.name)) in ('owner', 'admin')");
    expect(migrationSql).toContain("select distinct on (c.user_id)");
    expect(migrationSql).toContain("cm.company_id = v_company_id");
    expect(migrationSql).toContain("cm.status = 'active'");
  });

  it("marks notifications as AMC scoped and links staff to Client Requests", () => {
    expect(migrationSql).toContain("v_company_id");
    expect(migrationSql).toContain("'client_portal'");
    expect(migrationSql).toContain("'/client-requests'");
    expect(migrationSql).toContain("'operations_scope', 'amc_operations'");
    expect(migrationSql).toContain("'request_key', v_request_key");
    expect(migrationSql).toContain("public.client_portal_order_request_key(");
  });

  it("does not create operational orders, assignments, vendor records, procurement, or email", () => {
    expect(migrationSql).not.toContain("insert into public.orders");
    expect(migrationSql).not.toContain("insert into public.order_company_assignments");
    expect(migrationSql).not.toContain("insert into public.bid_requests");
    expect(migrationSql).not.toContain("insert into public.email_queue");
    expect(migrationSql).not.toContain("rpc_notify_admins");
    expect(migrationSql).not.toContain("rpc_notification_recipients_for_order");
    expect(migrationSql).not.toContain("accepted_order_id");
    expect(migrationSql).not.toContain("'vendor'");
    expect(migrationSql).not.toContain("'procurement'");
  });

  it("keeps notification order_id null and avoids exposing raw operational ids in payload", () => {
    expect(migrationSql).toContain("null::uuid");
    expect(migrationSql).toContain("'property_address', v_property_address");
    expect(migrationSql).toContain("'client_name', nullif(v_client_name, '')");
    expect(migrationSql).not.toContain("'client_id'");
    expect(migrationSql).not.toContain("'company_id'");
    expect(migrationSql).not.toContain("'order_id'");
  });
});
