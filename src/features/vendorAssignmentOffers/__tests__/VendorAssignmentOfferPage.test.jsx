// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiMock = vi.hoisted(() => ({
  readOrderCompanyAssignmentInvitation: vi.fn(),
  respondOrderCompanyAssignmentInvitation: vi.fn(),
}));

vi.mock("@/features/assignments/api", () => apiMock);

const { default: VendorAssignmentOfferPage } = await import("../VendorAssignmentOfferPage.jsx");

function renderPage(path = "/vendor/assignment-offers/token-1") {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route path="/vendor/assignment-offers/:token" element={<VendorAssignmentOfferPage />} />
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
  access_mode: "assignment_offer_token",
  invitation: {
    status: "offered",
    expires_at: "2026-06-05T16:00:00.000Z",
    sent_to_email: "vendor@example.test",
    can_accept: true,
    can_decline: true,
    invitation_id: "hidden-invitation-id",
  },
  vendor: {
    company_name: "Reliable Vendor Appraisals",
    contact_name: "Pat Vendor",
    contact_email: "pat.vendor@example.test",
    vendor_company_id: "hidden-vendor-company-id",
  },
  owner: {
    company_name: "Continental Real Estate Solutions",
    owner_company_id: "hidden-owner-company-id",
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
    order_id: "hidden-order-id",
    relationship_id: "hidden-relationship-id",
    client_fee: "hidden-client-fee",
    amc_margin: "hidden-amc-margin",
    audit_metadata: "hidden-audit-metadata",
  },
  assignment: {
    status: "offered",
    offered_at: "2026-06-03T16:00:00.000Z",
    due_at: "2026-06-10T20:00:00.000Z",
    review_due_at: "2026-06-11T20:00:00.000Z",
    expires_at: "2026-06-05T16:00:00.000Z",
    instructions: "Complete the appraisal assignment and upload the report.",
    fee_amount: 2500,
    currency: "USD",
    turn_time_days: 7,
    proposed_due_at: "2026-06-09T20:00:00.000Z",
    comments: "Can complete within seven days.",
    assignment_id: "hidden-assignment-id",
    terms: { internal: "hidden-raw-terms" },
    handoff_payload: { internal: "hidden-raw-handoff" },
    bid_response_id: "hidden-bid-response-id",
    candidate_score: "hidden-candidate-score",
  },
};

describe("VendorAssignmentOfferPage", () => {
  beforeEach(() => {
    apiMock.readOrderCompanyAssignmentInvitation.mockReset();
    apiMock.respondOrderCompanyAssignmentInvitation.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("extracts the route token and reads the assignment offer", async () => {
    apiMock.readOrderCompanyAssignmentInvitation.mockResolvedValue(validPayload);

    renderPage("/vendor/assignment-offers/token-abc");

    await waitFor(() => {
      expect(apiMock.readOrderCompanyAssignmentInvitation).toHaveBeenCalledWith("token-abc");
    });
  });

  it("renders a loading state while the token read is pending", () => {
    const deferred = createDeferred();
    apiMock.readOrderCompanyAssignmentInvitation.mockReturnValue(deferred.promise);

    renderPage();

    expect(screen.getByText("Loading assignment offer...")).not.toBeNull();
  });

  it("renders the unavailable state for invalid token payloads", async () => {
    apiMock.readOrderCompanyAssignmentInvitation.mockResolvedValue({
      ok: false,
      error: "assignment_invitation_invalid_or_expired",
    });

    renderPage();

    expect(await screen.findByText("This assignment offer is unavailable.")).not.toBeNull();
    expect(screen.getByText(/The link may be expired, revoked, already answered/)).not.toBeNull();
  });

  it("renders the unavailable state for transport errors", async () => {
    apiMock.readOrderCompanyAssignmentInvitation.mockRejectedValue(new Error("network failed"));

    renderPage();

    expect(await screen.findByText("This assignment offer is unavailable.")).not.toBeNull();
    expect(screen.getByText(/Contact the AMC coordinator for a new assignment offer/)).not.toBeNull();
  });

  it("renders valid assignment offer details", async () => {
    apiMock.readOrderCompanyAssignmentInvitation.mockResolvedValue(validPayload);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Assignment Offer" })).not.toBeNull();
    expect(screen.getAllByText("Offered")).not.toHaveLength(0);
    expect(screen.getByText("Reliable Vendor Appraisals")).not.toBeNull();
    expect(screen.getByText("Pat Vendor")).not.toBeNull();
    expect(screen.getByText("pat.vendor@example.test")).not.toBeNull();
    expect(screen.getAllByText("Continental Real Estate Solutions")).not.toHaveLength(0);
    expect(screen.getByText("AMC-1042")).not.toBeNull();
    expect(screen.getByText("123 Market Street")).not.toBeNull();
    expect(screen.getByText("Denver, CO, 80202")).not.toBeNull();
    expect(screen.getByText("Denver County")).not.toBeNull();
    expect(screen.getByText("Single Family")).not.toBeNull();
    expect(screen.getByText("URAR")).not.toBeNull();
    expect(screen.getByText("$2,500.00")).not.toBeNull();
    expect(screen.getByText("7 days")).not.toBeNull();
    expect(screen.getByText("Complete the appraisal assignment and upload the report.")).not.toBeNull();
    expect(screen.getByText("Can complete within seven days.")).not.toBeNull();
  });

  it("does not render hidden or internal fields even if present in the payload", async () => {
    apiMock.readOrderCompanyAssignmentInvitation.mockResolvedValue(validPayload);

    renderPage();

    await screen.findByText("Reliable Vendor Appraisals");

    [
      "hidden-invitation-id",
      "hidden-vendor-company-id",
      "hidden-owner-company-id",
      "hidden-order-id",
      "hidden-relationship-id",
      "hidden-client-fee",
      "hidden-amc-margin",
      "hidden-audit-metadata",
      "hidden-assignment-id",
      "hidden-raw-terms",
      "hidden-raw-handoff",
      "hidden-bid-response-id",
      "hidden-candidate-score",
    ].forEach((hiddenValue) => {
      expect(screen.queryByText(hiddenValue)).toBeNull();
    });
  });

  it("accepts the assignment offer by token", async () => {
    apiMock.readOrderCompanyAssignmentInvitation.mockResolvedValue(validPayload);
    apiMock.respondOrderCompanyAssignmentInvitation.mockResolvedValue({
      ok: true,
      status: "accepted",
      message: "Assignment accepted.",
    });

    renderPage("/vendor/assignment-offers/token-accept");

    fireEvent.click(await screen.findByRole("button", { name: "Accept Assignment" }));

    await waitFor(() => {
      expect(apiMock.respondOrderCompanyAssignmentInvitation).toHaveBeenCalledWith(
        "token-accept",
        "accept",
        null,
      );
    });
    expect(await screen.findByText("Assignment accepted.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Accept Assignment" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Decline Assignment" })).toBeNull();
    expect(apiMock.readOrderCompanyAssignmentInvitation).toHaveBeenCalledTimes(1);
  });

  it("declines the assignment offer by token with a reason", async () => {
    apiMock.readOrderCompanyAssignmentInvitation.mockResolvedValue(validPayload);
    apiMock.respondOrderCompanyAssignmentInvitation.mockResolvedValue({
      ok: true,
      status: "declined",
      message: "Assignment declined.",
    });

    renderPage("/vendor/assignment-offers/token-decline");

    fireEvent.change(await screen.findByLabelText("Decline reason"), {
      target: { value: "Capacity is full this week." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decline Assignment" }));

    await waitFor(() => {
      expect(apiMock.respondOrderCompanyAssignmentInvitation).toHaveBeenCalledWith(
        "token-decline",
        "decline",
        "Capacity is full this week.",
      );
    });
    expect(await screen.findByText("Assignment declined.")).not.toBeNull();
    expect(screen.queryByLabelText("Decline reason")).toBeNull();
    expect(apiMock.readOrderCompanyAssignmentInvitation).toHaveBeenCalledTimes(1);
  });

  it("disables actions while responding", async () => {
    const deferred = createDeferred();
    apiMock.readOrderCompanyAssignmentInvitation.mockResolvedValue(validPayload);
    apiMock.respondOrderCompanyAssignmentInvitation.mockReturnValue(deferred.promise);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Accept Assignment" }));

    expect((await screen.findByRole("button", { name: "Accepting..." })).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Decline Assignment" }).disabled).toBe(true);

    deferred.resolve({ ok: true, status: "accepted" });
    expect(await screen.findByText("Assignment accepted.")).not.toBeNull();
  });

  it("shows the unavailable state when respond returns invalid or expired", async () => {
    apiMock.readOrderCompanyAssignmentInvitation.mockResolvedValue(validPayload);
    apiMock.respondOrderCompanyAssignmentInvitation.mockResolvedValue({
      ok: false,
      error: "assignment_invitation_invalid_or_expired",
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Accept Assignment" }));

    expect(await screen.findByText("This assignment offer is unavailable.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Accept Assignment" })).toBeNull();
  });

  it("shows action errors for validation business responses", async () => {
    apiMock.readOrderCompanyAssignmentInvitation.mockResolvedValue(validPayload);
    apiMock.respondOrderCompanyAssignmentInvitation.mockResolvedValue({
      ok: false,
      error: "assignment_response_invalid",
      field_errors: {
        action: "Choose accept or decline.",
      },
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Accept Assignment" }));

    expect(await screen.findByText("Choose accept or decline.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Accept Assignment" })).not.toBeNull();
  });

  it("shows action errors for respond transport failures", async () => {
    apiMock.readOrderCompanyAssignmentInvitation.mockResolvedValue(validPayload);
    apiMock.respondOrderCompanyAssignmentInvitation.mockRejectedValue(new Error("network failed"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Accept Assignment" }));

    expect(await screen.findByText("Assignment response failed. Try again or contact the AMC coordinator.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Accept Assignment" })).not.toBeNull();
  });
});
