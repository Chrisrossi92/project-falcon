import { describe, expect, it, vi } from "vitest";

import { resolveAvailableOperationsModes } from "../operationAccess.js";
import { OPERATIONS_MODES } from "../operationsMode.js";
import { PERMISSIONS } from "@/lib/permissions/constants";

function permissions({ allowed = [], loading = false, error = null } = {}) {
  const allowedSet = new Set(allowed);

  return {
    loading,
    error,
    hasPermission: vi.fn((permissionKey) => allowedSet.has(permissionKey)),
  };
}

function shellProfile(appContext) {
  return { appContext };
}

describe("resolveAvailableOperationsModes", () => {
  it("preserves current Continental fallback behavior for owner/admin users with AMC permissions", () => {
    expect(
      resolveAvailableOperationsModes(
        permissions({ allowed: [PERMISSIONS.VENDORS_READ] }),
        shellProfile({ is_owner: true }),
      ),
    ).toEqual([OPERATIONS_MODES.INTERNAL_OPERATIONS, OPERATIONS_MODES.AMC_OPERATIONS]);

    expect(
      resolveAvailableOperationsModes(
        permissions({ allowed: [PERMISSIONS.VENDORS_READ] }),
        shellProfile({ is_admin_role: true }),
      ),
    ).toEqual([OPERATIONS_MODES.INTERNAL_OPERATIONS, OPERATIONS_MODES.AMC_OPERATIONS]);
  });

  it("does not infer AMC access from owner authority when explicit operation access says Internal only", () => {
    expect(
      resolveAvailableOperationsModes(
        permissions({ allowed: [PERMISSIONS.VENDORS_READ] }),
        shellProfile({
          is_owner: true,
          operations_access: {
            internal_operations: true,
            amc_operations: false,
          },
        }),
      ),
    ).toEqual([OPERATIONS_MODES.INTERNAL_OPERATIONS]);
  });

  it("allows an AMC admin who is not owner to see AMC when explicit operation access grants it", () => {
    expect(
      resolveAvailableOperationsModes(
        permissions({ allowed: [PERMISSIONS.VENDORS_READ] }),
        shellProfile({
          is_owner: false,
          is_admin_role: true,
          available_operations_modes: ["amc"],
        }),
      ),
    ).toEqual([OPERATIONS_MODES.AMC_OPERATIONS]);
  });

  it("does not add Internal access when explicit operation access is AMC only", () => {
    expect(
      resolveAvailableOperationsModes(
        permissions({ allowed: [PERMISSIONS.VENDORS_READ] }),
        shellProfile({
          is_owner: true,
          operationAccess: {
            amc: true,
          },
        }),
      ),
    ).toEqual([OPERATIONS_MODES.AMC_OPERATIONS]);
  });

  it("falls back to Internal only when no explicit access or AMC permission is available", () => {
    expect(
      resolveAvailableOperationsModes(
        permissions(),
        shellProfile({ is_owner: false, is_admin_role: false }),
      ),
    ).toEqual([OPERATIONS_MODES.INTERNAL_OPERATIONS]);
  });
});
