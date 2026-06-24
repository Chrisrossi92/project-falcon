import { describe, expect, it } from "vitest";

import { PRODUCT_CONTEXTS } from "../productContext";
import {
  PRODUCT_LINK_TARGETS,
  buildAcceptInviteLink,
  buildAmcOrderDetailLink,
  buildAmcVendorDetailLink,
  buildAmcVendorsLink,
  buildClientPortalLink,
  buildDashboardLink,
  buildInternalOrderDetailLink,
  buildProductLink,
  buildPublicVendorAssignmentOfferLink,
  buildPublicVendorAssignmentWorkLink,
  buildPublicVendorBidInvitationLink,
  buildVendorWorkspaceLink,
  describeProductLink,
  getProductBaseUrl,
} from "../productLinks";

const BASE_CONFIG = Object.freeze({
  internalAppBaseUrl: "https://internal.example.test/",
  amcAppBaseUrl: "https://amc.example.test/",
  vendorAppBaseUrl: "https://vendor.example.test/",
  clientPortalAppBaseUrl: "https://client.example.test/",
  legacyAppBaseUrl: "https://legacy.example.test/",
});

describe("productLinks", () => {
  it("uses product-specific base URLs before legacy fallback", () => {
    expect(buildInternalOrderDetailLink("order-1", { config: BASE_CONFIG })).toBe(
      "https://internal.example.test/orders/order-1",
    );
    expect(buildAmcOrderDetailLink("order-1", { config: BASE_CONFIG })).toBe(
      "https://amc.example.test/orders/order-1",
    );
    expect(buildVendorWorkspaceLink({ config: BASE_CONFIG })).toBe(
      "https://vendor.example.test/vendor-workspace/dashboard",
    );
    expect(buildClientPortalLink({ config: BASE_CONFIG })).toBe(
      "https://client.example.test/client-portal",
    );
  });

  it("keeps compatibility paths as the default link mode", () => {
    expect(buildAmcOrderDetailLink("order-1")).toBe("/orders/order-1");
    expect(buildDashboardLink({ productContext: PRODUCT_CONTEXTS.AMC })).toBe("/dashboard");
    expect(buildAmcVendorsLink()).toBe("/vendors");
    expect(buildAmcVendorDetailLink("vendor-profile-1")).toBe("/vendors/vendor-profile-1");
    expect(buildInternalOrderDetailLink("order-1")).toBe("/orders/order-1");
  });

  it("uses route registry canonical paths only when explicitly opted in", () => {
    expect(buildAmcOrderDetailLink("order-1", { useCanonicalRoutes: true })).toBe(
      "/amc/orders/order-1",
    );
    expect(
      buildDashboardLink({
        productContext: PRODUCT_CONTEXTS.AMC,
        routeMode: "canonical",
      }),
    ).toBe("/amc/dashboard");
    expect(buildAmcVendorsLink({ useCanonicalRoutes: true })).toBe("/amc/vendors");
    expect(buildAmcVendorDetailLink("vendor-profile-1", { useCanonicalRoutes: true })).toBe(
      "/amc/vendors/vendor-profile-1",
    );
    expect(buildInternalOrderDetailLink("order-1", { useCanonicalRoutes: true })).toBe(
      "/internal/orders/order-1",
    );
  });

  it("falls back to the legacy base URL when a product-specific base is missing", () => {
    const config = {
      legacyAppBaseUrl: "https://legacy.example.test/",
    };

    expect(buildAmcOrderDetailLink("order-2", { config })).toBe(
      "https://legacy.example.test/orders/order-2",
    );
    expect(buildVendorWorkspaceLink({ path: "/vendor-workspace/profile", config })).toBe(
      "https://legacy.example.test/vendor-workspace/profile",
    );
    expect(getProductBaseUrl(PRODUCT_CONTEXTS.CLIENT, config)).toBe("https://legacy.example.test");
  });

  it("preserves base URL fallback behavior in canonical route mode", () => {
    const legacyOnlyConfig = {
      legacyAppBaseUrl: "https://legacy.example.test/",
    };

    expect(
      buildAmcOrderDetailLink("order-canonical", {
        config: BASE_CONFIG,
        useCanonicalRoutes: true,
      }),
    ).toBe("https://amc.example.test/amc/orders/order-canonical");
    expect(
      buildAmcOrderDetailLink("order-canonical", {
        config: legacyOnlyConfig,
        useCanonicalRoutes: true,
      }),
    ).toBe("https://legacy.example.test/amc/orders/order-canonical");
    expect(
      buildAmcOrderDetailLink("order-canonical", {
        useCanonicalRoutes: true,
      }),
    ).toBe("/amc/orders/order-canonical");
  });

  it("returns safe relative links when no base URL is configured", () => {
    expect(buildDashboardLink()).toBe("/dashboard");
    expect(buildInternalOrderDetailLink("order-3")).toBe("/orders/order-3");
    expect(buildClientPortalLink({ path: "/client-portal/orders/order-3" })).toBe(
      "/client-portal/orders/order-3",
    );
  });

  it("normalizes slashes between base URL and path", () => {
    expect(
      buildProductLink({
        productContext: PRODUCT_CONTEXTS.AMC,
        path: "///orders/order-4",
        config: {
          amcAppBaseUrl: "https://amc.example.test///",
          legacyAppBaseUrl: "https://legacy.example.test///",
        },
      }),
    ).toBe("https://amc.example.test/orders/order-4");
  });

  it("keeps AMC and Internal order links distinguishable by product context base", () => {
    expect(buildInternalOrderDetailLink("shared-path-order", { config: BASE_CONFIG })).toBe(
      "https://internal.example.test/orders/shared-path-order",
    );
    expect(buildAmcOrderDetailLink("shared-path-order", { config: BASE_CONFIG })).toBe(
      "https://amc.example.test/orders/shared-path-order",
    );
  });

  it("preserves current public vendor token paths", () => {
    expect(buildPublicVendorBidInvitationLink("bid token", { config: BASE_CONFIG })).toBe(
      "https://vendor.example.test/vendor/bid-invitations/bid%20token",
    );
    expect(buildPublicVendorAssignmentOfferLink("offer-token", { config: BASE_CONFIG })).toBe(
      "https://vendor.example.test/vendor/assignment-offers/offer-token",
    );
    expect(buildPublicVendorAssignmentWorkLink("work-token", { config: BASE_CONFIG })).toBe(
      "https://vendor.example.test/vendor/assignment-work/work-token",
    );
  });

  it("uses registry canonical paths for public/vendor/client routes when opted in", () => {
    expect(
      buildPublicVendorBidInvitationLink("bid-token", {
        config: BASE_CONFIG,
        useCanonicalRoutes: true,
      }),
    ).toBe("https://vendor.example.test/vendor/bid-invitations/bid-token");
    expect(
      buildClientPortalLink({
        config: BASE_CONFIG,
        useCanonicalRoutes: true,
      }),
    ).toBe("https://client.example.test/client-portal");
  });

  it("supports accept-invite and dashboard links through legacy-compatible paths", () => {
    expect(buildAcceptInviteLink("invite-1", { config: BASE_CONFIG })).toBe(
      "https://legacy.example.test/accept-invite/invite-1",
    );
    expect(
      buildDashboardLink({
        productContext: PRODUCT_CONTEXTS.AMC,
        config: BASE_CONFIG,
      }),
    ).toBe("https://amc.example.test/dashboard");
  });

  it("preserves query strings and appends query params safely", () => {
    expect(
      buildProductLink({
        productContext: PRODUCT_CONTEXTS.CLIENT,
        path: "/client-portal/orders?tab=open",
        query: { source: "email", empty: "" },
        config: BASE_CONFIG,
      }),
    ).toBe("https://client.example.test/client-portal/orders?tab=open&source=email");
  });

  it("returns no-op diagnostic metadata for future adoption", () => {
    const descriptor = describeProductLink({
      target: PRODUCT_LINK_TARGETS.AMC_ORDER_DETAIL,
      productContext: PRODUCT_CONTEXTS.AMC,
      path: "/orders/order-5",
      config: {
        legacyAppBaseUrl: "https://legacy.example.test",
      },
    });

    expect(descriptor).toMatchObject({
      target: PRODUCT_LINK_TARGETS.AMC_ORDER_DETAIL,
      productContext: PRODUCT_CONTEXTS.AMC,
      path: "/orders/order-5",
      baseUrl: "https://legacy.example.test",
      url: "https://legacy.example.test/orders/order-5",
      legacyFallbackUsed: true,
      relativeFallbackUsed: false,
      diagnosticOnly: true,
      affectsDelivery: false,
      affectsRouting: false,
      affectsAuth: false,
    });
    expect(Object.isFrozen(descriptor)).toBe(true);
  });

  it("describes canonical links when route registry opt-in is enabled", () => {
    const descriptor = describeProductLink({
      target: PRODUCT_LINK_TARGETS.AMC_ORDER_DETAIL,
      productContext: PRODUCT_CONTEXTS.AMC,
      path: "/orders/order-6",
      routeId: "amcOrderDetail",
      routeParams: { id: "order-6" },
      useCanonicalRoutes: true,
    });

    expect(descriptor).toMatchObject({
      target: PRODUCT_LINK_TARGETS.AMC_ORDER_DETAIL,
      productContext: PRODUCT_CONTEXTS.AMC,
      routeId: "amcOrderDetail",
      routeMode: "canonical",
      path: "/amc/orders/order-6",
      url: "/amc/orders/order-6",
      relativeFallbackUsed: true,
    });
  });

  it("falls back safely to the supplied compatibility path for unknown route ids", () => {
    expect(
      buildProductLink({
        productContext: PRODUCT_CONTEXTS.AMC,
        path: "/orders/order-7",
        routeId: "missingRoute",
        useCanonicalRoutes: true,
      }),
    ).toBe("/orders/order-7");
  });
});
