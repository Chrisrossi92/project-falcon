// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  WORKSPACE_SWITCH_INVALIDATION_EVENT,
  resetWorkspaceSwitchState,
} from "../workspaceSwitchReset";

describe("workspaceSwitchReset", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("clears workspace-scoped storage while preserving session and preference keys", () => {
    window.localStorage.setItem("falcon.orders.filters", "q=main");
    window.localStorage.setItem("falcon.vendors.cache.directory", "stale");
    window.localStorage.setItem("falcon.operationsMode", "internal_operations");
    window.localStorage.setItem("falcon.theme", "dark");
    window.sessionStorage.setItem("falcon.clients.cache", "stale");
    window.sessionStorage.setItem("falcon.auth.session", "keep");
    const handler = vi.fn();
    window.addEventListener(WORKSPACE_SWITCH_INVALIDATION_EVENT, handler);

    try {
      const result = resetWorkspaceSwitchState({
        fromMode: "internal_operations",
        toMode: "amc_operations",
      });

      expect(window.localStorage.getItem("falcon.orders.filters")).toBeNull();
      expect(window.localStorage.getItem("falcon.vendors.cache.directory")).toBeNull();
      expect(window.localStorage.getItem("falcon.operationsMode")).toBe("internal_operations");
      expect(window.localStorage.getItem("falcon.theme")).toBe("dark");
      expect(window.sessionStorage.getItem("falcon.clients.cache")).toBeNull();
      expect(window.sessionStorage.getItem("falcon.auth.session")).toBe("keep");
      expect(result).toMatchObject({
        fromMode: "internal_operations",
        toMode: "amc_operations",
        scopes: expect.arrayContaining(["orders", "vendors", "clients", "dashboard"]),
        clearedStorageKeys: {
          localStorage: expect.arrayContaining([
            "falcon.orders.filters",
            "falcon.vendors.cache.directory",
          ]),
          sessionStorage: expect.arrayContaining(["falcon.clients.cache"]),
        },
      });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual(result);
    } finally {
      window.removeEventListener(WORKSPACE_SWITCH_INVALIDATION_EVENT, handler);
    }
  });
});
