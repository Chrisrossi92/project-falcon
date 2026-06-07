import { describe, expect, it } from "vitest";

import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import {
  getWorkspaceDocumentTitle,
  getWorkspaceIdentity,
} from "../workspaceIdentity";

describe("workspaceIdentity", () => {
  it("returns explicit visual identity for Internal Operations", () => {
    const identity = getWorkspaceIdentity(OPERATIONS_MODES.INTERNAL_OPERATIONS);

    expect(identity.id).toBe(OPERATIONS_MODES.INTERNAL_OPERATIONS);
    expect(identity.label).toBe("Internal Operations");
    expect(identity.shortLabel).toBe("Internal");
    expect(identity.environmentLabel).toBe("Internal Environment");
    expect(identity.badgeLabel).toBe("Internal");
    expect(identity.badgeDescription).toBe("Internal Operations environment");
    expect(identity.documentTitle).toBe("Falcon - Internal Operations");
    expect(identity.shellCueLabel).toBe("Operations Command");
    expect(identity.shellCueDescription).toBe("Internal appraisal operations");
    expect(identity.dashboardTitle).toBe("Operations Dashboard");
    expect(identity.dashboardSubtitle).toBe(
      "Track active work, review handoffs, due pressure, and workflow coordination.",
    );
    expect(identity.dashboardStatLabel).toBe("Environment");
    expect(identity.dashboardStatValue).toBe("Internal Operations");
    expect(identity.ordersEyebrow).toBe("Internal");
    expect(identity.ordersWorkMode).toBe("Internal Operations");
    expect(identity.ordersDescription).toBe(
      "Manage internal appraisal orders, workflow handoffs, and order records.",
    );
    expect(identity.accentClasses.badge).toContain("bg-slate-100");
  });

  it("returns AMC visual and copy identity", () => {
    const identity = getWorkspaceIdentity(OPERATIONS_MODES.AMC_OPERATIONS);

    expect(identity.id).toBe(OPERATIONS_MODES.AMC_OPERATIONS);
    expect(identity.label).toBe("AMC Operations");
    expect(identity.shortLabel).toBe("AMC");
    expect(identity.environmentLabel).toBe("AMC Environment");
    expect(identity.badgeLabel).toBe("AMC");
    expect(identity.badgeDescription).toBe("AMC Operations environment");
    expect(identity.documentTitle).toBe("Falcon - AMC Operations");
    expect(identity.shellCueLabel).toBe("Procurement Command");
    expect(identity.shellCueDescription).toBe("Vendor procurement and AMC operations");
    expect(identity.dashboardTitle).toBe("AMC Operations Dashboard");
    expect(identity.dashboardSubtitle).toBe(
      "Track procurement queues, vendor response, client orders, and SLA pressure.",
    );
    expect(identity.dashboardStatLabel).toBe("Environment");
    expect(identity.dashboardStatValue).toBe("AMC Operations");
    expect(identity.ordersEyebrow).toBe("Procurement");
    expect(identity.ordersWorkMode).toBe("AMC Operations");
    expect(identity.ordersDescription).toBe(
      "Manage AMC orders, vendor procurement context, and client coordination.",
    );
    expect(identity.accentClasses.eyebrow).toContain("bg-cyan-50");
    expect(identity.accentClasses.badge).toContain("bg-cyan-50");
  });

  it("falls back to Internal Operations for unknown input", () => {
    const identity = getWorkspaceIdentity("vendor_workspace");

    expect(identity.id).toBe(OPERATIONS_MODES.INTERNAL_OPERATIONS);
    expect(identity.shellCueLabel).toBe("Operations Command");
  });

  it("resolves document titles from workspace identity", () => {
    expect(getWorkspaceDocumentTitle(OPERATIONS_MODES.INTERNAL_OPERATIONS)).toBe(
      "Falcon - Internal Operations",
    );
    expect(getWorkspaceDocumentTitle(OPERATIONS_MODES.AMC_OPERATIONS)).toBe(
      "Falcon - AMC Operations",
    );
  });
});
