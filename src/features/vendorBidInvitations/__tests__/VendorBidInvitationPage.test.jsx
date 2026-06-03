// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiMock = vi.hoisted(() => ({
  readOrderVendorBidInvitation: vi.fn(),
}));

vi.mock("@/features/bids/api", () => apiMock);

const { default: VendorBidInvitationPage } = await import("../VendorBidInvitationPage.jsx");

function renderPage(path = "/vendor/bid-invitations/token-1") {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route path="/vendor/bid-invitations/:token" element={<VendorBidInvitationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

const validPayload = {
  ok: true,
  access_mode: "token_invitation",
  invitation: {
    status: "available_to_bid",
    expires_at: "2026-06-05T16:00:00.000Z",
    sent_to_email: "vendor@example.test",
    can_submit: true,
    invitation_id: "hidden-invitation-id",
  },
  vendor: {
    company_name: "Reliable Vendor Appraisals",
    contact_name: "Pat Vendor",
    contact_email: "pat.vendor@example.test",
    vendor_company_id: "hidden-vendor-company-id",
  },
  order: {
    order_number: "AMC-1042",
    property_address: "123 Market Street",
    city: "Denver",
    state: "CO",
    postal_code: "80202",
    county: "Denver County",
    property_type: "Single Family",
    report_type: "URAR",
    site_visit_at: "2026-06-04T15:00:00.000Z",
    client_due_at: "2026-06-10T20:00:00.000Z",
    final_due_at: "2026-06-11T20:00:00.000Z",
    base_fee: "hidden-client-fee",
    appraiser_fee: "hidden-appraiser-fee",
    relationship_id: "hidden-relationship-id",
    current_reviewer_id: "hidden-reviewer-id",
    internal_notes: "hidden internal note",
    candidate_snapshot: "hidden candidate snapshot",
  },
  bid_request: {
    request_message: "Please provide fee and turn time.",
    response_due_at: "2026-06-05T16:00:00.000Z",
    desired_vendor_due_at: "2026-06-08T20:00:00.000Z",
    client_due_at: "2026-06-10T20:00:00.000Z",
    status: "open",
    bid_request_id: "hidden-bid-request-id",
  },
  response: null,
};

describe("VendorBidInvitationPage", () => {
  beforeEach(() => {
    apiMock.readOrderVendorBidInvitation.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("extracts the route token and reads the vendor bid invitation", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue(validPayload);

    renderPage("/vendor/bid-invitations/token-abc");

    await waitFor(() => {
      expect(apiMock.readOrderVendorBidInvitation).toHaveBeenCalledWith("token-abc");
    });
  });

  it("renders a loading state while the token read is pending", () => {
    const deferred = createDeferred();
    apiMock.readOrderVendorBidInvitation.mockReturnValue(deferred.promise);

    renderPage();

    expect(screen.getByText("Loading bid invitation...")).not.toBeNull();
  });

  it("renders the unavailable state for invalid token payloads", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue({
      ok: false,
      error: "bid_invitation_invalid_or_expired",
    });

    renderPage();

    expect(await screen.findByText("This bid invitation is unavailable.")).not.toBeNull();
    expect(screen.getByText(/The link may be expired, revoked, already submitted/)).not.toBeNull();
  });

  it("renders the unavailable state for transport errors", async () => {
    apiMock.readOrderVendorBidInvitation.mockRejectedValue(new Error("network failed"));

    renderPage();

    expect(await screen.findByText("This bid invitation is unavailable.")).not.toBeNull();
    expect(screen.getByText(/Contact the AMC coordinator for a new invitation/)).not.toBeNull();
  });

  it("renders valid vendor, order, and bid request fields", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue(validPayload);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Vendor Bid Invitation" })).not.toBeNull();
    expect(screen.getAllByText("Available to Bid")).not.toHaveLength(0);
    expect(screen.getByText("Reliable Vendor Appraisals")).not.toBeNull();
    expect(screen.getByText("Pat Vendor")).not.toBeNull();
    expect(screen.getByText("pat.vendor@example.test")).not.toBeNull();
    expect(screen.getByText("AMC-1042")).not.toBeNull();
    expect(screen.getByText("123 Market Street")).not.toBeNull();
    expect(screen.getByText("Denver, CO, 80202")).not.toBeNull();
    expect(screen.getByText("Denver County")).not.toBeNull();
    expect(screen.getAllByText("Single Family")).not.toHaveLength(0);
    expect(screen.getAllByText("URAR")).not.toHaveLength(0);
    expect(screen.getByText("Please provide fee and turn time.")).not.toBeNull();
  });

  it("renders a disabled Submit Bid placeholder", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue(validPayload);

    renderPage();

    const submitButton = await screen.findByRole("button", { name: "Submit Bid" });
    expect(submitButton.disabled).toBe(true);
    expect(
      screen.getByText(
        "Bid submission is not available yet. Contact the coordinator to submit your response for now.",
      ),
    ).not.toBeNull();
  });

  it("does not render hidden or internal fields even if present in the payload", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue(validPayload);

    renderPage();

    await screen.findByText("Reliable Vendor Appraisals");

    [
      "hidden-invitation-id",
      "hidden-vendor-company-id",
      "hidden-client-fee",
      "hidden-appraiser-fee",
      "hidden-relationship-id",
      "hidden-reviewer-id",
      "hidden internal note",
      "hidden candidate snapshot",
      "hidden-bid-request-id",
    ].forEach((hiddenValue) => {
      expect(screen.queryByText(hiddenValue)).toBeNull();
    });
  });
});
