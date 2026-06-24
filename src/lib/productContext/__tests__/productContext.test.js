import { describe, expect, it } from "vitest";

import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import {
  PRODUCT_CONTEXTS,
  getProductContextDiagnostics,
  getProductContextForOperationsMode,
  getProductContextLabel,
  inferProductContextFromPathname,
  normalizeProductContext,
} from "../productContext";

describe("productContext", () => {
  it("defines stable product context constants", () => {
    expect(PRODUCT_CONTEXTS).toEqual({
      INTERNAL: "internal",
      AMC: "amc",
      VENDOR: "vendor",
      CLIENT: "client",
      SHARED_LEGACY: "shared_legacy",
    });
  });

  it("infers vendor and client product contexts from route pathname", () => {
    expect(inferProductContextFromPathname("/vendor-workspace/dashboard")).toBe(
      PRODUCT_CONTEXTS.VENDOR,
    );
    expect(inferProductContextFromPathname("/vendor/bid-invitations/token-1")).toBe(
      PRODUCT_CONTEXTS.VENDOR,
    );
    expect(inferProductContextFromPathname("/client-portal/orders")).toBe(
      PRODUCT_CONTEXTS.CLIENT,
    );
  });

  it("infers explicit AMC and Internal route contexts", () => {
    expect(inferProductContextFromPathname("/amc/dashboard")).toBe(PRODUCT_CONTEXTS.AMC);
    expect(inferProductContextFromPathname("/vendors/profile-1")).toBe(PRODUCT_CONTEXTS.AMC);
    expect(inferProductContextFromPathname("/client-requests")).toBe(PRODUCT_CONTEXTS.AMC);
    expect(inferProductContextFromPathname("/my-work")).toBe(PRODUCT_CONTEXTS.INTERNAL);
    expect(inferProductContextFromPathname("/users")).toBe(PRODUCT_CONTEXTS.INTERNAL);
  });

  it("keeps shared operational routes as shared legacy without operations mode", () => {
    expect(inferProductContextFromPathname("/")).toBe(PRODUCT_CONTEXTS.SHARED_LEGACY);
    expect(inferProductContextFromPathname("/dashboard")).toBe(PRODUCT_CONTEXTS.SHARED_LEGACY);
    expect(inferProductContextFromPathname("/orders/123")).toBe(PRODUCT_CONTEXTS.SHARED_LEGACY);
    expect(inferProductContextFromPathname("/calendar")).toBe(PRODUCT_CONTEXTS.SHARED_LEGACY);
    expect(inferProductContextFromPathname("/activity")).toBe(PRODUCT_CONTEXTS.SHARED_LEGACY);
  });

  it("uses operations mode only to clarify shared legacy operational routes", () => {
    expect(
      inferProductContextFromPathname("/dashboard", {
        operationsMode: OPERATIONS_MODES.INTERNAL_OPERATIONS,
      }),
    ).toBe(PRODUCT_CONTEXTS.INTERNAL);
    expect(
      inferProductContextFromPathname("/orders/123", {
        operationsMode: OPERATIONS_MODES.AMC_OPERATIONS,
      }),
    ).toBe(PRODUCT_CONTEXTS.AMC);
  });

  it("normalizes URL-like and malformed pathname input safely", () => {
    expect(inferProductContextFromPathname("https://example.test/vendor-workspace/profile?x=1")).toBe(
      PRODUCT_CONTEXTS.VENDOR,
    );
    expect(inferProductContextFromPathname("vendors/profile-1?tab=contacts")).toBe(
      PRODUCT_CONTEXTS.AMC,
    );
    expect(inferProductContextFromPathname("")).toBe(PRODUCT_CONTEXTS.SHARED_LEGACY);
  });

  it("maps operations modes to product context without changing operations mode behavior", () => {
    expect(getProductContextForOperationsMode(OPERATIONS_MODES.INTERNAL_OPERATIONS)).toBe(
      PRODUCT_CONTEXTS.INTERNAL,
    );
    expect(getProductContextForOperationsMode(OPERATIONS_MODES.AMC_OPERATIONS)).toBe(
      PRODUCT_CONTEXTS.AMC,
    );
    expect(getProductContextForOperationsMode("unknown")).toBe(PRODUCT_CONTEXTS.INTERNAL);
  });

  it("normalizes product context labels", () => {
    expect(normalizeProductContext(PRODUCT_CONTEXTS.VENDOR)).toBe(PRODUCT_CONTEXTS.VENDOR);
    expect(normalizeProductContext("unknown")).toBe(PRODUCT_CONTEXTS.SHARED_LEGACY);
    expect(getProductContextLabel(PRODUCT_CONTEXTS.CLIENT)).toBe("Client Portal");
    expect(getProductContextLabel("unknown")).toBe("Shared / Legacy");
  });

  it("returns diagnostic-only metadata without authority side effects", () => {
    const diagnostics = getProductContextDiagnostics({
      pathname: "/dashboard",
      operationsMode: OPERATIONS_MODES.AMC_OPERATIONS,
      source: "unit_test",
    });

    expect(diagnostics).toMatchObject({
      productContext: PRODUCT_CONTEXTS.AMC,
      productContextLabel: "Falcon AMC",
      pathname: "/dashboard",
      routeFamily: "shared_legacy",
      source: "unit_test",
      operationsMode: OPERATIONS_MODES.AMC_OPERATIONS,
      operationsModeProvided: true,
      diagnosticOnly: true,
      affectsAuth: false,
      affectsRouting: false,
      affectsCompanyContext: false,
      affectsDataAccess: false,
      legalBoundary: false,
    });
    expect(Object.isFrozen(diagnostics)).toBe(true);
  });
});
