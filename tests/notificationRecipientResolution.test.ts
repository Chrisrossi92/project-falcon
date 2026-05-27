import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminRecipients,
  fetchOrderRoleRecipients,
} from "@/lib/services/notificationsService";
import { supabase } from "@/lib/supabaseClient";

vi.mock("@/lib/supabaseClient", () => {
  const client = { rpc: vi.fn() };
  return {
    default: client,
    supabase: client,
  };
});

const mockedSupabase = vi.mocked(supabase);

describe("notification recipient service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves owner/admin recipients through the company-scoped RPC and dedupes users", async () => {
    mockedSupabase.rpc.mockResolvedValueOnce({
      data: [
        { user_id: "owner-1", role_key: "owner" },
        { user_id: "admin-1", role_key: "admin" },
        { user_id: "admin-1", role_key: "admin" },
      ],
      error: null,
    });

    await expect(fetchAdminRecipients({ orderId: "order-1" })).resolves.toEqual([
      { userId: "owner-1", role: "owner" },
      { userId: "admin-1", role: "admin" },
    ]);

    expect(mockedSupabase.rpc).toHaveBeenCalledWith("rpc_notification_recipients_for_order", {
      p_order_id: "order-1",
      p_recipient_kind: "admin_owner",
    });
  });

  it("resolves assigned appraiser/reviewer recipients through the same RPC", async () => {
    mockedSupabase.rpc
      .mockResolvedValueOnce({
        data: [{ user_id: "appraiser-1", role_key: "appraiser" }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ user_id: "reviewer-1", role_key: "reviewer" }],
        error: null,
      });

    await expect(fetchOrderRoleRecipients("order-1", "appraiser")).resolves.toEqual([
      { userId: "appraiser-1", role: "appraiser" },
    ]);
    await expect(fetchOrderRoleRecipients("order-1", "reviewer")).resolves.toEqual([
      { userId: "reviewer-1", role: "reviewer" },
    ]);

    expect(mockedSupabase.rpc).toHaveBeenNthCalledWith(
      1,
      "rpc_notification_recipients_for_order",
      { p_order_id: "order-1", p_recipient_kind: "appraiser" }
    );
    expect(mockedSupabase.rpc).toHaveBeenNthCalledWith(
      2,
      "rpc_notification_recipients_for_order",
      { p_order_id: "order-1", p_recipient_kind: "reviewer" }
    );
  });
});

describe("notification recipient resolver migration", () => {
  const migration = readFileSync(
    "supabase/migrations/20260527092000_notification_company_scoped_recipients.sql",
    "utf8"
  );

  it("uses active company memberships and role assignments for owner/admin recipients", () => {
    expect(migration).toContain("join public.company_memberships cm");
    expect(migration).toContain("join public.user_role_assignments ura");
    expect(migration).toContain("join public.roles r");
    expect(migration).toContain("cm.status = 'active'");
    expect(migration).toContain("ura.status = 'active'");
    expect(migration).toContain("coalesce(u.is_active, true)");
    expect(migration).toContain("coalesce(lower(btrim(u.status)), 'active') = 'active'");
    expect(migration).toContain("lower(btrim(r.name)) in ('owner', 'admin')");
  });

  it("requires company-management authority for no-order admin/owner resolution", () => {
    expect(migration).toContain("if not v_is_service_role then");
    expect(migration).toContain("public.current_app_user_has_permission('users.manage_company_access')");
    expect(migration).toContain("notification_recipient_admin_resolution_denied");
  });

  it("resolves assigned order appraiser and reviewer from order assignment columns", () => {
    expect(migration).toContain("select v_order.appraiser_id as user_id");
    expect(migration).toContain("select v_order.assigned_to");
    expect(migration).toContain("select v_order.reviewer_id as user_id");
  });

  it("dedupes recipients in SQL and in the frontend mapper", () => {
    expect(migration).toContain("select distinct on (c.user_id)");
    expect(migration).toContain("select distinct");
  });

  it("does not use legacy public.users.role for active recipient targeting", () => {
    const executableSql = migration.replace(/comment on function[\s\S]*?;/g, "");
    expect(executableSql).not.toContain("u.role");
    expect(executableSql).not.toContain("users.role");
    expect(executableSql).not.toContain(".from(\"users\")");
  });
});
