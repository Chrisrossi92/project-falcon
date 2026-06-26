// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiMock = vi.hoisted(() => ({
  readOrderVendorBidInvitation: vi.fn(),
  submitOrderVendorBidInvitation: vi.fn(),
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
    expires_at: "2026-07-05T16:00:00.000Z",
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
    response_due_at: "2026-07-05T16:00:00.000Z",
    desired_vendor_due_at: "2026-07-08T20:00:00.000Z",
    client_due_at: "2026-07-10T20:00:00.000Z",
    status: "open",
    bid_request_id: "hidden-bid-request-id",
  },
  response: null,
};

describe("VendorBidInvitationPage", () => {
  beforeEach(() => {
    apiMock.readOrderVendorBidInvitation.mockReset();
    apiMock.submitOrderVendorBidInvitation.mockReset();
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

  it("renders an expired state and hides submit when expiration data is expired", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue({
      ...validPayload,
      invitation: {
        ...validPayload.invitation,
        status: "expired",
        expires_at: "2026-06-01T16:00:00.000Z",
        can_submit: false,
      },
    });

    renderPage();

    expect(await screen.findByText("This bid invitation has expired.")).not.toBeNull();
    expect(screen.getByText("Please contact the assigning office if you believe this is an error.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Submit Bid" })).toBeNull();
    expect(apiMock.submitOrderVendorBidInvitation).not.toHaveBeenCalled();
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

  it("renders the Submit Bid form with vendor contact defaults", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue(validPayload);

    renderPage();

    const submitButton = await screen.findByRole("button", { name: "Submit Bid" });
    expect(submitButton.disabled).toBe(false);
    expect(screen.getByLabelText("Fee amount")).not.toBeNull();
    expect(screen.getByLabelText("Currency").value).toBe("USD");
    expect(screen.getByLabelText("Turn time days")).not.toBeNull();
    expect(screen.getByLabelText("Proposed due date")).not.toBeNull();
    expect(screen.getByLabelText("Comments")).not.toBeNull();
    expect(screen.getByLabelText("Contact name").value).toBe("Pat Vendor");
    expect(screen.getByLabelText("Contact email").value).toBe("pat.vendor@example.test");
    expect(screen.getByLabelText("Contact phone")).not.toBeNull();
  });

  it("requires fee amount and one timing field before submitting", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue(validPayload);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Submit Bid" }));

    expect(screen.getByText("Fee amount is required.")).not.toBeNull();
    expect(screen.getByText("Provide either turn time days or a proposed due date.")).not.toBeNull();
    expect(apiMock.submitOrderVendorBidInvitation).not.toHaveBeenCalled();
  });

  it("submits the vendor bid invitation payload by token", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue(validPayload);
    apiMock.submitOrderVendorBidInvitation.mockResolvedValue({
      ok: true,
      status: "bid_submitted",
      submitted_at: "2026-06-03T16:00:00.000Z",
      message: "Your bid has been submitted.",
    });

    renderPage("/vendor/bid-invitations/token-submit");

    await screen.findByLabelText("Fee amount");

    fireEvent.change(screen.getByLabelText("Fee amount"), { target: { value: "1450" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "usd" } });
    fireEvent.change(screen.getByLabelText("Turn time days"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Proposed due date"), {
      target: { value: "2026-06-08T12:30" },
    });
    fireEvent.change(screen.getByLabelText("Comments"), { target: { value: "Available next week." } });
    fireEvent.change(screen.getByLabelText("Contact name"), { target: { value: "Alex Vendor" } });
    fireEvent.change(screen.getByLabelText("Contact email"), { target: { value: "alex@example.test" } });
    fireEvent.change(screen.getByLabelText("Contact phone"), { target: { value: "555-0100" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Bid" }));

    await waitFor(() => {
      expect(apiMock.submitOrderVendorBidInvitation).toHaveBeenCalledWith("token-submit", {
        fee_amount: "1450",
        currency: "USD",
        turn_time_days: "5",
        proposed_due_at: "2026-06-08T12:30",
        comments: "Available next week.",
        contact_name: "Alex Vendor",
        contact_email: "alex@example.test",
        contact_phone: "555-0100",
      });
    });

    expect(await screen.findByText("Thank you for submitting your bid.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Submit Bid" })).toBeNull();
  });

  it("disables submit while submitting", async () => {
    const deferred = createDeferred();
    apiMock.readOrderVendorBidInvitation.mockResolvedValue(validPayload);
    apiMock.submitOrderVendorBidInvitation.mockReturnValue(deferred.promise);

    renderPage();

    fireEvent.change(await screen.findByLabelText("Fee amount"), { target: { value: "1450" } });
    fireEvent.change(screen.getByLabelText("Turn time days"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Bid" }));

    expect((await screen.findByRole("button", { name: "Submitting..." })).disabled).toBe(true);

    deferred.resolve({ ok: true, submitted_at: "2026-06-03T16:00:00.000Z" });
    expect(await screen.findByText("Thank you for submitting your bid.")).not.toBeNull();
  });

  it("shows backend field errors for invalid bid submission payloads", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue(validPayload);
    apiMock.submitOrderVendorBidInvitation.mockResolvedValue({
      ok: false,
      error: "bid_submission_invalid",
      field_errors: {
        currency: "Currency must be a three-letter code.",
        contact_email: "Contact email must be valid.",
      },
    });

    renderPage();

    fireEvent.change(await screen.findByLabelText("Fee amount"), { target: { value: "1450" } });
    fireEvent.change(screen.getByLabelText("Turn time days"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Bid" }));

    expect(await screen.findByText("Bid submission could not be accepted. Review the fields and try again.")).not.toBeNull();
    expect(screen.getByText("Currency must be a three-letter code.")).not.toBeNull();
    expect(screen.getByText("Contact email must be valid.")).not.toBeNull();
  });

  it("shows the unavailable state when submit returns an invalid or expired token response", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue(validPayload);
    apiMock.submitOrderVendorBidInvitation.mockResolvedValue({
      ok: false,
      error: "bid_invitation_invalid_or_expired",
    });

    renderPage();

    fireEvent.change(await screen.findByLabelText("Fee amount"), { target: { value: "1450" } });
    fireEvent.change(screen.getByLabelText("Turn time days"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Bid" }));

    expect(await screen.findByText("This bid invitation is unavailable.")).not.toBeNull();
    expect(screen.queryByLabelText("Fee amount")).toBeNull();
  });

  it("shows a form error for submit transport errors", async () => {
    apiMock.readOrderVendorBidInvitation.mockResolvedValue(validPayload);
    apiMock.submitOrderVendorBidInvitation.mockRejectedValue(new Error("network failed"));

    renderPage();

    fireEvent.change(await screen.findByLabelText("Fee amount"), { target: { value: "1450" } });
    fireEvent.change(screen.getByLabelText("Turn time days"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Bid" }));

    expect(await screen.findByText("Bid submission failed. Try again or contact the AMC coordinator.")).not.toBeNull();
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
