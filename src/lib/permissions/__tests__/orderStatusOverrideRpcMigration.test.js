import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260621100000_order_status_override_rpc.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("order status override RPC migration", () => {
  it("creates a guarded backend-owned status override RPC", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_order_status_override");
    expect(migrationSql).toContain("p_order_id uuid");
    expect(migrationSql).toContain("p_target_status text");
    expect(migrationSql).toContain("p_reason text");
    expect(migrationSql).toContain("returns jsonb");
    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("set search_path = public");
    expect(migrationSql).toContain("grant execute on function public.rpc_order_status_override(uuid, text, text) to authenticated");
  });

  it("requires authenticated current-company access, order visibility, updateability, and override permission", () => {
    expect(migrationSql).toContain("auth.role() <> 'authenticated'");
    expect(migrationSql).toContain("current_app_user_has_current_company()");
    expect(migrationSql).toContain("coalesce(v_existing.company_id, public.default_company_id()) <> v_company_id");
    expect(migrationSql).toContain("current_app_user_can_read_order(p_order_id)");
    expect(migrationSql).toContain("current_app_user_can_update_order_row");
    expect(migrationSql).toContain("current_app_user_has_permission('workflow.override_status')");
    expect(migrationSql).toContain("order_status_override_not_authorized");
  });

  it("validates reason, target status, no-op updates, archived rows, and terminal reversal safety", () => {
    expect(migrationSql).toContain("status_override_reason_required");
    expect(migrationSql).toContain("length(v_reason) > 500");
    expect(migrationSql).toContain("status_override_reason_too_long");
    expect(migrationSql).toContain("v_allowed_statuses text[]");
    expect(migrationSql).toContain("status_override_invalid_target");
    expect(migrationSql).toContain("status_override_noop");
    expect(migrationSql).toContain("archived_order_cannot_be_status_overridden");
    expect(migrationSql).toContain("v_target_status in ('cancelled', 'voided')");
    expect(migrationSql).toContain("status_override_terminal_target_not_supported");
    expect(migrationSql).toContain("lower(coalesce(v_existing.status, '')) in ('cancelled', 'voided')");
    expect(migrationSql).toContain("status_override_terminal_reversal_not_supported");
  });

  it("updates only order status and preserves the generic status_changed trigger path", () => {
    expect(migrationSql).toContain("update public.orders");
    expect(migrationSql).toContain("set status = v_target_status");
    expect(migrationSql).toContain("updated_at = now()");
    expect(migrationSql).not.toContain("delete from public.orders");
    expect(migrationSql).not.toContain("perform public.rpc_transition_order_status");
    expect(migrationSql).toContain("preserves generic status_changed trigger behavior");
  });

  it("writes explicit activity with the required override audit payload", () => {
    expect(migrationSql).toContain("insert into public.activity_log");
    expect(migrationSql).toContain("'order.status_override'");
    expect(migrationSql).toContain("'Order status overridden'");
    expect(migrationSql).toContain("'from_status', v_existing.status");
    expect(migrationSql).toContain("'to_status', v_updated.status");
    expect(migrationSql).toContain("'reason', v_reason");
    expect(migrationSql).toContain("'source', 'rpc_order_status_override'");
    expect(migrationSql).toContain("'override', true");
    expect(migrationSql).toContain("actor_user_id");
    expect(migrationSql).toContain("created_by_name");
    expect(migrationSql).toContain("created_by_email");
  });
});
