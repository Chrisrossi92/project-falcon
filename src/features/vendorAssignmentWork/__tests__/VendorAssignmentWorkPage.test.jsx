// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiMock = vi.hoisted(() => ({
  readOrderCompanyAssignmentWorkInvitation: vi.fn(),
  respondOrderCompanyAssignmentWorkInvitation: vi.fn(),
}));

vi.mock("@/features/assignments/api", () => apiMock);

const { default: VendorAssignmentWorkPage } = await import("../VendorAssignmentWorkPage.jsx");

function renderPage(path = "/vendor/assignment-work/token-1") {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route path="/vendor/assignment-work/:token" element={<VendorAssignmentWorkPage />} />
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
  access_mode: "assignment_work_token",
  invitation: {
    status: "accepted",
    expires_at: "2026-06-15T16:00:00.000Z",
    sent_to_email: "vendor@example.test",
    can_start_work: true,
    can_submit_report: false,
    invitation_id: "hidden-work-invitation-id",
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
    status: "accepted",
    accepted_at: "2026-06-03T16:00:00.000Z",
    due_at: "2026-06-10T20:00:00.000Z",
    review_due_at: "2026-06-11T20:00:00.000Z",
    instructions: "Complete the appraisal assignment and upload the report.",
    fee_amount: 2500,
    currency: "USD",
    turn_time_days: 7,
    comments: "Can complete within seven days.",
    assignment_id: "hidden-assignment-id",
    terms: { internal: "hidden-raw-terms" },
    handoff_payload: { internal: "hidden-raw-handoff" },
    bid_response_id: "hidden-bid-response-id",
    candidate_score: "hidden-candidate-score",
  },
};

describe("VendorAssignmentWorkPage", () => {
  beforeEach(() => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockReset();
    apiMock.respondOrderCompanyAssignmentWorkInvitation.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("extracts the route token and reads the assignment work packet", async () => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockResolvedValue(validPayload);

    renderPage("/vendor/assignment-work/token-abc");

    await waitFor(() => {
      expect(apiMock.readOrderCompanyAssignmentWorkInvitation).toHaveBeenCalledWith("token-abc");
    });
  });

  it("renders a loading state while the token read is pending", () => {
    const deferred = createDeferred();
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockReturnValue(deferred.promise);

    renderPage();

    expect(screen.getByText("Loading assignment work...")).not.toBeNull();
  });

  it("renders the unavailable state for invalid token payloads", async () => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockResolvedValue({
      ok: false,
      error: "assignment_work_invitation_invalid_or_expired",
    });

    renderPage();

    expect(await screen.findByText("This assignment work link is unavailable.")).not.toBeNull();
    expect(screen.getByText(/Contact the AMC coordinator for a new assignment work link/)).not.toBeNull();
  });

  it("renders the unavailable state for transport errors", async () => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockRejectedValue(new Error("network failed"));

    renderPage();

    expect(await screen.findByText("This assignment work link is unavailable.")).not.toBeNull();
  });

  it("renders valid accepted assignment work details", async () => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockResolvedValue(validPayload);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Assignment Work" })).not.toBeNull();
    expect(screen.getAllByText("Accepted")).not.toHaveLength(0);
    expect(screen.getByText("Reliable Vendor Appraisals")).not.toBeNull();
    expect(screen.getByText("Pat Vendor")).not.toBeNull();
    expect(screen.getByText("pat.vendor@example.test")).not.toBeNull();
    expect(screen.getAllByText("Continental Real Estate Solutions")).not.toHaveLength(0);
    expect(screen.getByText("AMC-1042")).not.toBeNull();
    expect(screen.getByText("123 Market Street")).not.toBeNull();
    expect(screen.getByText("Denver, CO, 80202")).not.toBeNull();
    expect(screen.getByText("$2,500.00")).not.toBeNull();
    expect(screen.getByText("7 days")).not.toBeNull();
    expect(screen.getByText("Complete the appraisal assignment and upload the report.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Start Work" })).not.toBeNull();
  });

  it("does not render hidden or internal fields even if present in the payload", async () => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockResolvedValue(validPayload);

    renderPage();

    await screen.findByText("Reliable Vendor Appraisals");

    [
      "hidden-work-invitation-id",
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

  it("starts work by token and then allows report submission without rereading", async () => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockResolvedValue(validPayload);
    apiMock.respondOrderCompanyAssignmentWorkInvitation
      .mockResolvedValueOnce({
        ok: true,
        status: "in_progress",
        message: "Work started.",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: "submitted",
        message: "Report submitted.",
      });

    renderPage("/vendor/assignment-work/token-work");

    fireEvent.click(await screen.findByRole("button", { name: "Start Work" }));

    await waitFor(() => {
      expect(apiMock.respondOrderCompanyAssignmentWorkInvitation).toHaveBeenCalledWith(
        "token-work",
        "start_work",
        {},
      );
    });
    expect(await screen.findByText("Work started.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Start Work" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Submission note"), {
      target: { value: "Report uploaded through secure link." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Report" }));

    await waitFor(() => {
      expect(apiMock.respondOrderCompanyAssignmentWorkInvitation).toHaveBeenLastCalledWith(
        "token-work",
        "submit_report",
        { note: "Report uploaded through secure link." },
      );
    });
    expect(await screen.findByText("Report submitted.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Submit Report" })).toBeNull();
    expect(screen.getByText("The report has been submitted to the AMC coordinator.")).not.toBeNull();
    expect(apiMock.readOrderCompanyAssignmentWorkInvitation).toHaveBeenCalledTimes(1);
  });

  it("renders submit action directly for in-progress assignments", async () => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockResolvedValue({
      ...validPayload,
      invitation: {
        ...validPayload.invitation,
        status: "in_progress",
        can_start_work: false,
        can_submit_report: true,
      },
      assignment: {
        ...validPayload.assignment,
        status: "in_progress",
      },
    });

    renderPage();

    expect(await screen.findByRole("button", { name: "Submit Report" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Start Work" })).toBeNull();
  });

  it("renders submitted state without mutation actions", async () => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockResolvedValue({
      ...validPayload,
      invitation: {
        ...validPayload.invitation,
        status: "submitted",
        can_start_work: false,
        can_submit_report: false,
      },
      assignment: {
        ...validPayload.assignment,
        status: "submitted",
      },
    });

    renderPage();

    expect(await screen.findByText("The report has been submitted to the AMC coordinator.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Start Work" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Submit Report" })).toBeNull();
  });

  it("disables actions while responding", async () => {
    const deferred = createDeferred();
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockResolvedValue(validPayload);
    apiMock.respondOrderCompanyAssignmentWorkInvitation.mockReturnValue(deferred.promise);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Start Work" }));

    expect((await screen.findByRole("button", { name: "Starting..." })).disabled).toBe(true);

    deferred.resolve({ ok: true, status: "in_progress", message: "Work started." });
    expect(await screen.findByText("Work started.")).not.toBeNull();
  });

  it("shows the unavailable state when respond returns invalid or expired", async () => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockResolvedValue(validPayload);
    apiMock.respondOrderCompanyAssignmentWorkInvitation.mockResolvedValue({
      ok: false,
      error: "assignment_work_invitation_invalid_or_expired",
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Start Work" }));

    expect(await screen.findByText("This assignment work link is unavailable.")).not.toBeNull();
  });

  it("shows action errors for validation business responses", async () => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockResolvedValue(validPayload);
    apiMock.respondOrderCompanyAssignmentWorkInvitation.mockResolvedValue({
      ok: false,
      error: "assignment_work_response_invalid",
      field_errors: {
        action: "Choose start work or submit report.",
      },
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Start Work" }));

    expect(await screen.findByText("Choose start work or submit report.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Start Work" })).not.toBeNull();
  });

  it("shows action errors for respond transport failures", async () => {
    apiMock.readOrderCompanyAssignmentWorkInvitation.mockResolvedValue(validPayload);
    apiMock.respondOrderCompanyAssignmentWorkInvitation.mockRejectedValue(new Error("network failed"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Start Work" }));

    expect(await screen.findByText("Assignment work response failed. Try again or contact the AMC coordinator.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Start Work" })).not.toBeNull();
  });
});
