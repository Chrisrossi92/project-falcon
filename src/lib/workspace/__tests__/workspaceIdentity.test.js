import { describe, expect, it } from "vitest";

import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import { getWorkspaceIdentity } from "../workspaceIdentity";

describe("workspaceIdentity", () => {
  it("returns empty presentation overrides for Internal Operations", () => {
    const identity = getWorkspaceIdentity(OPERATIONS_MODES.INTERNAL_OPERATIONS);

    expect(identity.id).toBe(OPERATIONS_MODES.INTERNAL_OPERATIONS);
    expect(identity.shellCueLabel).toBeNull();
    expect(identity.dashboardSubtitle).toBeNull();
    expect(identity.ordersDescription).toBeNull();
    expect(identity.accentClasses.eyebrow).toBe("");
  });

  it("returns AMC visual and copy identity", () => {
    const identity = getWorkspaceIdentity(OPERATIONS_MODES.AMC_OPERATIONS);

    expect(identity.id).toBe(OPERATIONS_MODES.AMC_OPERATIONS);
    expect(identity.shellCueLabel).toBe("Procurement Command");
    expect(identity.shellCueDescription).toBe("Vendor procurement and AMC operations");
    expect(identity.dashboardSubtitle).toBe(
      "Track procurement queues, vendor response, client orders, and SLA pressure.",
    );
    expect(identity.dashboardStatLabel).toBe("Workspace");
    expect(identity.dashboardStatValue).toBe("AMC Operations");
    expect(identity.ordersEyebrow).toBe("Procurement");
    expect(identity.ordersWorkMode).toBe("AMC Operations");
    expect(identity.ordersDescription).toBe(
      "Manage AMC orders, vendor procurement context, and client coordination.",
    );
    expect(identity.accentClasses.eyebrow).toContain("bg-cyan-50");
  });

  it("falls back to Internal Operations for unknown input", () => {
    const identity = getWorkspaceIdentity("vendor_workspace");

    expect(identity.id).toBe(OPERATIONS_MODES.INTERNAL_OPERATIONS);
    expect(identity.shellCueLabel).toBeNull();
  });
});
