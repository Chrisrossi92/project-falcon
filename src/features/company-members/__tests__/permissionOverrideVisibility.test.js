import { describe, expect, it } from "vitest";

import {
  isV1VisiblePermissionOverride,
  normalizeEffectiveOverrideMap,
  normalizeOverrideRows,
  serializeOverrideMap,
} from "../permissionOverrideVisibility";

const permissions = Object.freeze([
  {
    role_id: "role-admin",
    permission_key: "orders.read.all",
    permission_category: "orders",
  },
  {
    role_id: "role-admin",
    permission_key: "relationships.read",
    permission_category: "relationships",
  },
  {
    role_id: "role-admin",
    permission_key: "vendors.read",
    permission_category: "vendors",
  },
  {
    role_id: "role-reviewer",
    permission_key: "orders.assignable_as_reviewer",
    permission_category: "orders",
  },
  {
    role_id: "role-reviewer",
    permission_key: "workflow.status.approve_review",
    permission_category: "workflow",
  },
]);

describe("permission override visibility", () => {
  it("keeps the active V1 override universe separate from hidden and work eligibility permissions", () => {
    expect(isV1VisiblePermissionOverride(permissions[0])).toBe(true);
    expect(isV1VisiblePermissionOverride(permissions[1])).toBe(false);
    expect(isV1VisiblePermissionOverride(permissions[2])).toBe(false);
    expect(isV1VisiblePermissionOverride(permissions[3])).toBe(false);
    expect(isV1VisiblePermissionOverride(permissions[4])).toBe(true);
  });

  it("normalizes read rows to visible permission keys only", () => {
    const overrides = normalizeOverrideRows(
      [
        { permission_key: "orders.read.all", effect: "revoke" },
        { permission_key: "relationships.read", effect: "grant" },
        { permission_key: "vendors.read", effect: "grant" },
        { permission_key: "orders.assignable_as_reviewer", effect: "grant" },
        { permission_key: "workflow.status.approve_review", effect: "grant" },
      ],
      permissions,
    );

    expect([...overrides.entries()]).toEqual([
      ["orders.read.all", "revoke"],
      ["workflow.status.approve_review", "grant"],
    ]);
  });

  it("serializes only effective visible deltas for save payloads", () => {
    const overrides = new Map([
      ["orders.read.all", "revoke"],
      ["relationships.read", "grant"],
      ["vendors.read", "grant"],
      ["orders.assignable_as_reviewer", "grant"],
      ["workflow.status.approve_review", "grant"],
    ]);

    expect(normalizeEffectiveOverrideMap(overrides, ["role-admin"], permissions)).toEqual(
      new Map([
        ["orders.read.all", "revoke"],
        ["workflow.status.approve_review", "grant"],
      ]),
    );
    expect(serializeOverrideMap(overrides, ["role-admin"], permissions)).toEqual([
      { permission_key: "orders.read.all", effect: "revoke" },
      { permission_key: "workflow.status.approve_review", effect: "grant" },
    ]);
  });
});
