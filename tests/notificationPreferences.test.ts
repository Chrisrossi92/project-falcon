import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getEffectiveNotificationPrefs,
  getNotificationPrefs,
  updateCurrentUserNotificationPreference,
} from "@/features/notifications/api";
import {
  rpcGetNotificationPolicyLocks,
  rpcUpdateNotificationPolicyLock,
} from "@/lib/services/api";
import supabase from "@/lib/supabaseClient";

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    rpc: vi.fn(),
  },
}));

const mockedSupabase = vi.mocked(supabase);

describe("notification preference APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads coarse current-user prefs through the canonical RPC without direct auth/table fallback", async () => {
    mockedSupabase.rpc.mockResolvedValueOnce({
      data: { user_id: "app-user-1", email_enabled: true },
      error: null,
    });

    await expect(getNotificationPrefs()).resolves.toMatchObject({
      user_id: "app-user-1",
      email_enabled: true,
    });

    expect(mockedSupabase.rpc).toHaveBeenCalledWith("rpc_notification_prefs_get");
    expect(mockedSupabase.auth).toBeUndefined();
  });

  it("loads effective event/channel prefs from the V1 resolver", async () => {
    const rows = [
      {
        event_key: "order.new_assigned",
        channel: "email",
        effective_enabled: true,
        locked: true,
        lock_reason: "Required by company policy.",
        default_enabled: true,
        user_override: null,
      },
    ];
    mockedSupabase.rpc.mockResolvedValueOnce({ data: rows, error: null });

    await expect(getEffectiveNotificationPrefs()).resolves.toEqual(rows);

    expect(mockedSupabase.rpc).toHaveBeenCalledWith(
      "rpc_current_user_notification_preferences_get"
    );
  });

  it("updates current-user event/channel prefs through the lock-aware RPC", async () => {
    mockedSupabase.rpc.mockResolvedValueOnce({
      data: [{ event_key: "order.completed", channel: "email", effective_enabled: false }],
      error: null,
    });

    await expect(updateCurrentUserNotificationPreference({
      eventKey: "order.completed",
      channel: "email",
      enabled: false,
    })).resolves.toMatchObject({
      event_key: "order.completed",
      channel: "email",
      effective_enabled: false,
    });

    expect(mockedSupabase.rpc).toHaveBeenCalledWith(
      "rpc_current_user_notification_preference_update",
      {
        p_event_key: "order.completed",
        p_channel: "email",
        p_enabled: false,
        p_meta: null,
      }
    );
  });

  it("uses the owner/admin policy lock RPCs for staff locks", async () => {
    mockedSupabase.rpc
      .mockResolvedValueOnce({
        data: [{ event_key: "order.new_assigned", channel: "email", locked: true }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ event_key: "order.new_assigned", channel: "email", locked: false }],
        error: null,
      });

    await expect(rpcGetNotificationPolicyLocks({ role: "appraiser" })).resolves.toEqual([
      { event_key: "order.new_assigned", channel: "email", locked: true },
    ]);
    await expect(rpcUpdateNotificationPolicyLock({
      eventKey: "order.new_assigned",
      channel: "email",
      locked: false,
      role: "appraiser",
    })).resolves.toEqual({
      event_key: "order.new_assigned",
      channel: "email",
      locked: false,
    });

    expect(mockedSupabase.rpc).toHaveBeenNthCalledWith(
      1,
      "rpc_notification_policy_locks_get",
      { p_role: "appraiser" }
    );
    expect(mockedSupabase.rpc).toHaveBeenNthCalledWith(
      2,
      "rpc_notification_policy_lock_update",
      {
        p_event_key: "order.new_assigned",
        p_channel: "email",
        p_locked: false,
        p_role: "appraiser",
        p_lock_reason: null,
      }
    );
  });
});

describe("notification preference lock migration", () => {
  const migration = readFileSync(
    "supabase/migrations/20260527090000_notification_preference_identity_locks.sql",
    "utf8"
  );

  it("keys active preference RPCs to current_app_user_id instead of auth.uid", () => {
    expect(migration).toContain("v_user_id uuid := public.current_app_user_id()");
    expect(migration).toContain("v_actor_user_id uuid := public.current_app_user_id()");
    expect(migration).not.toContain("values (auth.uid())");
  });

  it("rejects disabling locked preferences", () => {
    expect(migration).toContain("if coalesce(v_locked, false) and not coalesce(p_enabled, false)");
    expect(migration).toContain("notification_preference_locked");
  });

  it("guards owner/admin lock updates with company notification preference permission", () => {
    expect(migration).toContain("rpc_notification_policy_lock_update");
    expect(migration).toContain("current_app_user_has_permission('notifications.preferences.manage_company')");
  });
});
