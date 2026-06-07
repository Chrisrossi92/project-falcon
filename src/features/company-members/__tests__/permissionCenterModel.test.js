import { describe, expect, it } from "vitest";

import {
  buildPermissionCenterModel,
  buildPermissionCenterReview,
  describePermission,
  humanizePermissionKey,
  permissionCenterCategoryId,
  serializePermissionCenterOverrides,
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

  it("builds a local draft review for template and individual override changes", () => {
    const member = {
      user_id: "user-1",
      role_assignments: [
        { role_id: "role-coordinator", role_name: "Coordinator", is_primary: true, status: "active" },
      ],
    };
    const originalModel = buildPermissionCenterModel({
      operationsMode: "amc_operations",
      member,
      rolePermissions,
    });
    const draftModel = buildPermissionCenterModel({
      operationsMode: "amc_operations",
      member,
      rolePermissions,
      draftRoleIds: ["role-coordinator", "role-billing"],
      draftOverrideRows: [{ permission_key: "bid_requests.create", effect: "revoke", pending: true }],
    });
    const review = buildPermissionCenterReview(originalModel, draftModel);

    const paymentPermission = draftModel.permissions.find((permission) => permission.key === "vendor_invoices.submit");
    expect(paymentPermission).toMatchObject({
      effective: true,
      pending: true,
      sourceLabel: "Pending change",
    });

    const vendorPermission = draftModel.permissions.find((permission) => permission.key === "bid_requests.create");
    expect(vendorPermission).toMatchObject({
      effective: false,
      override: "revoke",
      pending: true,
      sourceLabel: "Pending change",
    });

    expect(review.addedTemplates.map((role) => role.role_name)).toEqual(["Billing/Admin"]);
    expect(review.addedPermissions.map((permission) => permission.label)).toEqual(["Submit vendor invoices"]);
    expect(review.removedPermissions.map((permission) => permission.label)).toEqual(["Create bid requests"]);
    expect(review.affectedCategories).toEqual(["Payments", "Vendors"]);
    expect(review.hasChanges).toBe(true);
  });

  it("serializes effective Permission Center override payloads for the access RPC", () => {
    expect(
      serializePermissionCenterOverrides(
        [
          { permission_key: "bid_requests.create", effect: "revoke", pending: true },
          { permission_key: "vendor_invoices.submit", effect: "grant", pending: true },
        ],
        ["role-coordinator", "role-billing"],
        rolePermissions,
      ),
    ).toEqual([
      { permission_key: "bid_requests.create", effect: "revoke" },
    ]);
  });
});
