import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { PRODUCT_CONTEXTS } from "../productContext";
import {
  PRODUCT_ROUTE_DEFINITIONS,
  PRODUCT_ROUTE_IDS,
  PRODUCT_ROUTE_MIGRATION_PHASES,
  getCanonicalPath,
  getCompatibilityPath,
  getRouteDefinition,
} from "../productRoutes";

const sourcePath = resolve(dirname(fileURLToPath(import.meta.url)), "../productRoutes.js");

describe("productRoutes", () => {
  it("defines unique route ids for the planned product aliases", () => {
    const ids = PRODUCT_ROUTE_DEFINITIONS.map((definition) => definition.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(PRODUCT_ROUTE_IDS.INTERNAL_DASHBOARD);
    expect(ids).toContain(PRODUCT_ROUTE_IDS.AMC_VENDORS);
    expect(ids).toContain(PRODUCT_ROUTE_IDS.VENDOR_WORKSPACE_DASHBOARD);
    expect(ids).toContain(PRODUCT_ROUTE_IDS.CLIENT_PORTAL_ORDER_DETAIL);
    expect(ids).toContain(PRODUCT_ROUTE_IDS.ACCEPT_INVITE);
  });

  it("returns route definitions by id", () => {
    expect(getRouteDefinition(PRODUCT_ROUTE_IDS.AMC_VENDORS)).toEqual({
      id: "amcVendors",
      productContext: PRODUCT_CONTEXTS.AMC,
      currentPath: "/vendors",
      compatibilityPath: "/vendors",
      canonicalPath: "/amc/vendors",
      migrationPhase: PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
    });

    expect(getRouteDefinition("missingRoute")).toBeNull();
  });

  it("returns canonical and compatibility paths", () => {
    expect(getCanonicalPath(PRODUCT_ROUTE_IDS.INTERNAL_ORDER_DETAIL)).toBe("/internal/orders/:id");
    expect(getCompatibilityPath(PRODUCT_ROUTE_IDS.INTERNAL_ORDER_DETAIL)).toBe("/orders/:id");
    expect(getCanonicalPath(PRODUCT_ROUTE_IDS.AMC_ORDER_DETAIL)).toBe("/amc/orders/:id");
    expect(getCompatibilityPath(PRODUCT_ROUTE_IDS.AMC_ORDER_DETAIL)).toBe("/orders/:id");
    expect(getCanonicalPath("missingRoute")).toBeNull();
    expect(getCompatibilityPath("missingRoute")).toBeNull();
  });

  it("keeps Vendor Workspace and Client Portal paths compatibility-only for now", () => {
    expect(getRouteDefinition(PRODUCT_ROUTE_IDS.VENDOR_WORKSPACE_PAYMENTS)).toMatchObject({
      productContext: PRODUCT_CONTEXTS.VENDOR,
      currentPath: "/vendor-workspace/payments",
      canonicalPath: "/vendor-workspace/payments",
      migrationPhase: PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
    });

    expect(getRouteDefinition(PRODUCT_ROUTE_IDS.CLIENT_PORTAL_DASHBOARD)).toMatchObject({
      productContext: PRODUCT_CONTEXTS.CLIENT,
      currentPath: "/client-portal",
      canonicalPath: "/client-portal",
      migrationPhase: PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
    });
  });

  it("keeps public token and invite routes compatibility-only", () => {
    expect(getRouteDefinition(PRODUCT_ROUTE_IDS.VENDOR_BID_INVITATION)).toMatchObject({
      productContext: PRODUCT_CONTEXTS.VENDOR,
      currentPath: "/vendor/bid-invitations/:token",
      canonicalPath: "/vendor/bid-invitations/:token",
      migrationPhase: PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
    });

    expect(getRouteDefinition(PRODUCT_ROUTE_IDS.ACCEPT_INVITE)).toMatchObject({
      productContext: PRODUCT_CONTEXTS.SHARED_LEGACY,
      currentPath: "/accept-invite/:invitationId",
      canonicalPath: "/accept-invite/:invitationId",
      migrationPhase: PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
    });
  });

  it("is metadata-only and does not register React Router routes", () => {
    const source = readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("react-router-dom");
    expect(source).not.toMatch(/<Route\b/);
    expect(source).not.toContain("createBrowserRouter");
    expect(source).not.toContain("Navigate");
  });
});
