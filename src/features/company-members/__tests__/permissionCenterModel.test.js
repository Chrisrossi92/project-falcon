import { describe, expect, it } from "vitest";

import {
  buildPermissionCenterModel,
  describePermission,
  humanizePermissionKey,
  permissionCenterCategoryId,
} from "../permissionCenterModel";

describe("permissionCenterModel", () => {
  const rolePermissions = [
    {
      role_id: "role-admin",
      role_name: "Admin",
      permission_key: "orders.read.all",
      permission_category: "orders",
      permission_label: "Read all orders",
      permission_description: "View all orders in the active operation.",
    },
    {
      role_id: "role-admin",
      role_name: "Admin",
      permission_key: "users.invite",
      permission_category: "users",
      permission_label: "Invite users",
    },
    {
      role_id: "role-coordinator",
      role_name: "Coordinator",
      permission_key: "bid_requests.create",
      permission_category: "bid_requests",
      permission_label: "Create bid requests",
    },
    {
      role_id: "role-billing",
      role_name: "Billing/Admin",
      permission_key: "vendor_invoices.submit",
      permission_category: "vendor_invoices",
      permission_label: "Submit vendor invoices",
    },
  ];

  it("groups permissions into guided business categories with readable fallbacks", () => {
    expect(permissionCenterCategoryId({ permission_key: "bid_requests.create" })).toBe("vendors");
    expect(permissionCenterCategoryId({ permission_key: "vendor_invoices.submit" })).toBe("payments");
    expect(humanizePermissionKey("reports.export")).toBe("Export Reports");
    expect(describePermission({ permission_key: "payments.record" })).toMatch(/financial workflow/i);
  });

  it("resolves primary, secondary, source, and override labels for the active operation", () => {
    const model = buildPermissionCenterModel({
      operationsMode: "amc_operations",
      member: {
        user_id: "user-1",
        role_assignments: [
          { role_id: "role-coordinator", role_name: "Coordinator", is_primary: true, status: "active" },
          { role_id: "role-billing", role_name: "Billing/Admin", is_primary: false, status: "active" },
        ],
      },
      rolePermissions,
      overrideRows: [{ permission_key: "vendor_invoices.submit", effect: "revoke" }],
    });

    expect(model.operationLabel).toBe("Falcon AMC");
    expect(model.primaryRole.role_name).toBe("Coordinator");
    expect(model.secondaryRoles.map((role) => role.role_name)).toEqual(["Billing/Admin"]);

    const vendorCategory = model.categories.find((category) => category.id === "vendors");
    expect(vendorCategory.permissions[0]).toMatchObject({
      label: "Create bid requests",
      sourceLabel: "Primary role",
      effective: true,
    });

    const paymentCategory = model.categories.find((category) => category.id === "payments");
    expect(paymentCategory.permissions[0]).toMatchObject({
      label: "Submit vendor invoices",
      sourceLabel: "Individual override",
      override: "revoke",
      effective: false,
    });
  });

  it("keeps same-login role displays scoped to the supplied operation context", () => {
    const internalModel = buildPermissionCenterModel({
      operationsMode: "internal_operations",
      member: {
        user_id: "same-login",
        role_assignments: [
          { role_id: "role-admin", role_name: "Admin", is_primary: true, status: "active" },
        ],
      },
      rolePermissions,
    });
    const amcModel = buildPermissionCenterModel({
      operationsMode: "amc_operations",
      member: {
        user_id: "same-login",
        role_assignments: [
          { role_id: "role-coordinator", role_name: "Coordinator", is_primary: true, status: "active" },
        ],
      },
      rolePermissions,
    });

    expect(internalModel.operationLabel).toBe("Continental Internal Operations");
    expect(internalModel.primaryRole.role_name).toBe("Admin");
    expect(amcModel.operationLabel).toBe("Falcon AMC");
    expect(amcModel.primaryRole.role_name).toBe("Coordinator");
    expect(internalModel.categories.find((category) => category.id === "administration")).toBeTruthy();
    expect(amcModel.categories.find((category) => category.id === "vendors")).toBeTruthy();
  });
});
