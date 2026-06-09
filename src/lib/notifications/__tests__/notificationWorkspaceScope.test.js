import { describe, expect, it } from "vitest";

import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import {
  filterNotificationsForOperationsScope,
  getNotificationOperationsScope,
  notificationListRpcParams,
  notificationRpcScopeParams,
} from "../notificationWorkspaceScope";

describe("notificationWorkspaceScope", () => {
  it("uses explicit payload operations scope before fallbacks", () => {
    expect(getNotificationOperationsScope({
      payload: { operations_scope: OPERATIONS_MODES.AMC_OPERATIONS },
    })).toBe(OPERATIONS_MODES.AMC_OPERATIONS);

    expect(getNotificationOperationsScope({
      payload: { order_operations_scope: OPERATIONS_MODES.INTERNAL_OPERATIONS },
    })).toBe(OPERATIONS_MODES.INTERNAL_OPERATIONS);
  });

  it("falls back to smoke-safe order number prefixes when scope metadata is missing", () => {
    expect(getNotificationOperationsScope({
      payload: { order_number: "AMC-STAGING-SMOKE-001" },
    })).toBe(OPERATIONS_MODES.AMC_OPERATIONS);

    expect(getNotificationOperationsScope({
      payload: { order_number: "INT-SMOKE-SEPARATION-001" },
    })).toBe(OPERATIONS_MODES.INTERNAL_OPERATIONS);
  });

	  it("filters operational notifications by selected operations scope while preserving global system notifications", () => {
	    const notifications = [
	      { id: "internal", payload: { operations_scope: OPERATIONS_MODES.INTERNAL_OPERATIONS }, title: "Internal order" },
	      { id: "amc", payload: { operations_scope: OPERATIONS_MODES.AMC_OPERATIONS }, title: "AMC order" },
	      { id: "legacy-internal", title: "Invoice needs review" },
	      { id: "global", title: "System policy changed", category: "system" },
	    ];
	
	    expect(filterNotificationsForOperationsScope(notifications, OPERATIONS_MODES.INTERNAL_OPERATIONS).map((n) => n.id))
	      .toEqual(["internal", "legacy-internal", "global"]);
	    expect(filterNotificationsForOperationsScope(notifications, OPERATIONS_MODES.AMC_OPERATIONS).map((n) => n.id))
	      .toEqual(["amc", "global"]);
	  });

  it("passes the normalized selected operations scope to notification RPCs", () => {
    expect(notificationRpcScopeParams("unknown")).toEqual({
      p_operations_scope: OPERATIONS_MODES.INTERNAL_OPERATIONS,
    });
    expect(notificationRpcScopeParams(OPERATIONS_MODES.AMC_OPERATIONS)).toEqual({
      p_operations_scope: OPERATIONS_MODES.AMC_OPERATIONS,
    });
  });

  it("builds explicit notification list RPC params with a null cursor", () => {
    expect(notificationListRpcParams({ limit: 20, operationsScope: OPERATIONS_MODES.AMC_OPERATIONS })).toEqual({
      p_limit: 20,
      p_before: null,
      p_operations_scope: OPERATIONS_MODES.AMC_OPERATIONS,
    });

    expect(notificationListRpcParams({
      limit: 100,
      before: "2026-06-08T12:00:00Z",
      operationsScope: OPERATIONS_MODES.INTERNAL_OPERATIONS,
    })).toEqual({
      p_limit: 100,
      p_before: "2026-06-08T12:00:00Z",
      p_operations_scope: OPERATIONS_MODES.INTERNAL_OPERATIONS,
    });
  });
});
