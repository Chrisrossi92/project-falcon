import { describe, expect, it } from "vitest";

import { PRODUCT_CONTEXTS } from "../productContext";
import { PRODUCT_LINK_TARGETS } from "../productLinks";
import {
  PRODUCT_MESSAGE_KINDS,
  createProductMessagePlan,
  inferProductMessageKind,
  planAmcOrderNotification,
  planClientPortalInvite,
  planInternalOrderNotification,
  planVendorAssignmentOffer,
  planVendorAssignmentWork,
  planVendorBidInvitation,
} from "../productMessagePlans";

describe("productMessagePlans", () => {
  it("resolves Internal order notifications to Internal context", () => {
    const plan = planInternalOrderNotification({ orderId: "order-1" });

    expect(plan).toMatchObject({
      messageKind: PRODUCT_MESSAGE_KINDS.INTERNAL_ORDER_NOTIFICATION,
      productContext: PRODUCT_CONTEXTS.INTERNAL,
      target: PRODUCT_LINK_TARGETS.INTERNAL_ORDER_DETAIL,
      linkBuilder: "buildInternalOrderDetailLink",
      requiredBaseUrlKey: "internalAppBaseUrl",
      fallbackBaseUrlKey: "legacyAppBaseUrl",
      fallback: "legacyAppBaseUrl",
      routeFamily: "order_detail",
      routeParameters: { orderIdPresent: true },
      warnings: [],
    });
  });

  it("resolves AMC order notifications to AMC context", () => {
    const plan = planAmcOrderNotification({ payload: { order_id: "order-2" } });

    expect(plan).toMatchObject({
      messageKind: PRODUCT_MESSAGE_KINDS.AMC_ORDER_NOTIFICATION,
      productContext: PRODUCT_CONTEXTS.AMC,
      target: PRODUCT_LINK_TARGETS.AMC_ORDER_DETAIL,
      linkBuilder: "buildAmcOrderDetailLink",
      requiredBaseUrlKey: "amcAppBaseUrl",
      fallbackBaseUrlKey: "legacyAppBaseUrl",
      routeParameters: { orderIdPresent: true },
      warnings: [],
    });
  });

  it("infers order context from operations scope descriptors", () => {
    expect(
      createProductMessagePlan({
        operations_scope: "internal_operations",
        order_id: "order-3",
      }).productContext,
    ).toBe(PRODUCT_CONTEXTS.INTERNAL);

    expect(
      createProductMessagePlan({
        payload: {
          operations_scope: "amc_operations",
          order_id: "order-4",
        },
      }).productContext,
    ).toBe(PRODUCT_CONTEXTS.AMC);
  });

  it("resolves vendor bid and assignment routes to Vendor context", () => {
    expect(planVendorBidInvitation({ token: "bid-token" })).toMatchObject({
      productContext: PRODUCT_CONTEXTS.VENDOR,
      target: PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_BID_INVITATION,
      linkBuilder: "buildPublicVendorBidInvitationLink",
      requiredBaseUrlKey: "vendorAppBaseUrl",
      routeFamily: "public_vendor_bid_invitation",
      routeParameters: { tokenPresent: true },
      warnings: [],
    });

    expect(planVendorAssignmentOffer({ token: "offer-token" })).toMatchObject({
      productContext: PRODUCT_CONTEXTS.VENDOR,
      target: PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_ASSIGNMENT_OFFER,
      linkBuilder: "buildPublicVendorAssignmentOfferLink",
      routeFamily: "public_vendor_assignment_offer",
      warnings: [],
    });

    expect(planVendorAssignmentWork({ token: "work-token" })).toMatchObject({
      productContext: PRODUCT_CONTEXTS.VENDOR,
      target: PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_ASSIGNMENT_WORK,
      linkBuilder: "buildPublicVendorAssignmentWorkLink",
      routeFamily: "public_vendor_assignment_work",
      warnings: [],
    });
  });

  it("infers vendor message kinds from current public vendor route paths", () => {
    expect(
      inferProductMessageKind({
        link_path: "/vendor/bid-invitations/token-1",
      }),
    ).toBe(PRODUCT_MESSAGE_KINDS.VENDOR_BID_INVITATION);

    expect(
      inferProductMessageKind({
        linkPath: "/vendor/assignment-offers/token-1",
      }),
    ).toBe(PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_OFFER);

    expect(
      inferProductMessageKind({
        payload: { link_path: "/vendor/assignment-work/token-1" },
      }),
    ).toBe(PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_WORK);
  });

  it("resolves Client Portal invites to Client context", () => {
    const plan = planClientPortalInvite({ token: "client-token" });

    expect(plan).toMatchObject({
      messageKind: PRODUCT_MESSAGE_KINDS.CLIENT_PORTAL_INVITE,
      productContext: PRODUCT_CONTEXTS.CLIENT,
      target: PRODUCT_LINK_TARGETS.CLIENT_PORTAL,
      linkBuilder: "buildClientPortalLink",
      requiredBaseUrlKey: "clientPortalAppBaseUrl",
      fallbackBaseUrlKey: "legacyAppBaseUrl",
      routeFamily: "client_portal_invitation",
      routeParameters: { tokenPresent: true },
      warnings: [],
    });
  });

  it("returns shared legacy with a warning for ambiguous generic notifications", () => {
    const plan = createProductMessagePlan({
      eventType: "note.added",
      payload: { message: "A note exists without product context." },
    });

    expect(plan).toMatchObject({
      messageKind: PRODUCT_MESSAGE_KINDS.GENERIC_LEGACY_NOTIFICATION,
      productContext: PRODUCT_CONTEXTS.SHARED_LEGACY,
      target: PRODUCT_LINK_TARGETS.DASHBOARD,
      linkBuilder: "buildDashboardLink",
      requiredBaseUrlKey: "legacyAppBaseUrl",
      fallbackBaseUrlKey: "legacyAppBaseUrl",
      ambiguous: true,
      warnings: ["product_context_ambiguous"],
    });
  });

  it("warns when future link parameters are missing", () => {
    expect(planAmcOrderNotification().warnings).toContain("order_id_missing_for_future_link");
    expect(planVendorBidInvitation().warnings).toContain("token_missing_for_future_link");
    expect(planClientPortalInvite().warnings).toContain("token_missing_for_future_link");
  });

  it("returns dry-run metadata only without sending or writing payloads", () => {
    const plan = createProductMessagePlan({
      eventType: "vendor_assignment_submission",
      token: "work-token",
    });

    expect(plan).toMatchObject({
      productContext: PRODUCT_CONTEXTS.VENDOR,
      target: PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_ASSIGNMENT_WORK,
      dryRunOnly: true,
      diagnosticOnly: true,
      sendsEmail: false,
      sendsNotification: false,
      writesPayload: false,
      affectsDelivery: false,
    });
    expect(plan).not.toHaveProperty("url");
    expect(Object.isFrozen(plan)).toBe(true);
  });
});
