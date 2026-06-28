import { describe, expect, it } from "vitest";

import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import {
  getWorkspaceDocumentTitle,
  getWorkspaceIdentity,
  getWorkspaceNavigationLabel,
  getWorkspaceNavigationSectionLabel,
  getWorkspacePageChrome,
} from "../workspaceIdentity";

describe("workspaceIdentity", () => {
  it("returns explicit visual identity for Internal Operations", () => {
    const identity = getWorkspaceIdentity(OPERATIONS_MODES.INTERNAL_OPERATIONS);

    expect(identity.id).toBe(OPERATIONS_MODES.INTERNAL_OPERATIONS);
    expect(identity.label).toBe("Continental Internal Operations");
    expect(identity.shortLabel).toBe("Internal");
    expect(identity.environmentLabel).toBe("Continental Internal Operations");
    expect(identity.badgeLabel).toBe("Internal");
    expect(identity.badgeDescription).toBe("Continental Internal Operations environment");
    expect(identity.documentTitle).toBe("Falcon - Continental Internal Operations");
    expect(identity.shellCueLabel).toBe("Operations Command");
    expect(identity.shellCueDescription).toBe("Internal appraisal operations");
    expect(identity.dashboardTitle).toBe("Production Dashboard");
    expect(identity.dashboardSubtitle).toBe(
      "Active work, review handoffs, and due pressure.",
    );
    expect(identity.dashboardStatLabel).toBe("Environment");
    expect(identity.dashboardStatValue).toBe("Continental Internal Operations");
    expect(identity.ordersEyebrow).toBe("Internal");
    expect(identity.ordersWorkMode).toBe("Client Orders");
    expect(identity.ordersDescription).toBe(
      "Manage Continental appraisal production orders, workflow handoffs, and client delivery records.",
    );
    expect(getWorkspaceNavigationLabel(identity.id, "orders", "Orders")).toBe("Client Orders");
    expect(getWorkspaceNavigationSectionLabel(identity.id, "operations", "Operations")).toBe(
      "Appraisal Production",
    );
    expect(getWorkspacePageChrome(identity.id, "activity")).toMatchObject({
      title: "Continental Internal Activity",
    });
    expect(getWorkspacePageChrome(identity.id, "orderDetail")).toMatchObject({
      eyebrow: "Internal Order Detail",
      title: "Continental Internal Order",
    });
    expect(identity.accentClasses.badge).toContain("bg-slate-100");
  });

  it("returns AMC visual and copy identity", () => {
    const identity = getWorkspaceIdentity(OPERATIONS_MODES.AMC_OPERATIONS);

    expect(identity.id).toBe(OPERATIONS_MODES.AMC_OPERATIONS);
    expect(identity.label).toBe("Falcon AMC");
    expect(identity.shortLabel).toBe("AMC");
    expect(identity.environmentLabel).toBe("Falcon AMC Environment");
    expect(identity.badgeLabel).toBe("AMC");
    expect(identity.badgeDescription).toBe("Falcon AMC environment");
    expect(identity.documentTitle).toBe("Falcon - Falcon AMC");
    expect(identity.shellCueLabel).toBe("Procurement Command");
    expect(identity.shellCueDescription).toBe("Vendor procurement and AMC operations");
    expect(identity.dashboardTitle).toBe("AMC Dashboard");
    expect(identity.dashboardSubtitle).toBe(
      "Procurement queues, vendor responses, and SLA pressure.",
    );
    expect(identity.dashboardStatLabel).toBe("Environment");
    expect(identity.dashboardStatValue).toBe("Falcon AMC");
    expect(identity.ordersEyebrow).toBe("Procurement");
    expect(identity.ordersWorkMode).toBe("Falcon AMC");
    expect(identity.ordersDescription).toBe(
      "Manage Falcon AMC orders, vendor procurement context, and client-services coordination.",
    );
    expect(getWorkspaceNavigationLabel(identity.id, "vendors", "Vendors")).toBe("Vendor Network");
    expect(getWorkspaceNavigationSectionLabel(identity.id, "clients", "Clients")).toBe("Client Services");
    expect(getWorkspacePageChrome(identity.id, "vendors")).toMatchObject({
      title: "Falcon AMC Vendor Network",
    });
    expect(getWorkspacePageChrome(identity.id, "orderDetail")).toMatchObject({
      eyebrow: "AMC Order Detail",
      title: "Falcon AMC Order",
    });
    expect(getWorkspacePageChrome(identity.id, "vendorPayments")).toMatchObject({
      title: "Falcon AMC Payments",
    });
    expect(getWorkspacePageChrome(identity.id, "vendorAvailableWorkDetail")).toMatchObject({
      eyebrow: "Procurement Opportunity",
    });
    expect(getWorkspacePageChrome(identity.id, "vendorAssignedOrderDetail")).toMatchObject({
      title: "Falcon AMC Assigned Order",
    });
    expect(identity.accentClasses.eyebrow).toContain("bg-cyan-50");
    expect(identity.accentClasses.badge).toContain("bg-cyan-50");
  });

  it("falls back to Internal Operations for unknown input", () => {
    const identity = getWorkspaceIdentity("vendor_workspace");

    expect(identity.id).toBe(OPERATIONS_MODES.INTERNAL_OPERATIONS);
    expect(identity.shellCueLabel).toBe("Operations Command");
    expect(getWorkspaceNavigationLabel("vendor_workspace", "orders", "Orders")).toBe("Client Orders");
  });

  it("resolves document titles from workspace identity", () => {
    expect(getWorkspaceDocumentTitle(OPERATIONS_MODES.INTERNAL_OPERATIONS)).toBe(
      "Falcon - Continental Internal Operations",
    );
    expect(getWorkspaceDocumentTitle(OPERATIONS_MODES.AMC_OPERATIONS)).toBe(
      "Falcon - Falcon AMC",
    );
  });
});
