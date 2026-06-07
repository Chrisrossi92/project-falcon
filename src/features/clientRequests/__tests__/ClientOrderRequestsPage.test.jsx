// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  getClientOrderRequestReviewDetail: vi.fn(),
  listClientOrderRequestsForReview: vi.fn(),
  updateClientOrderRequestReviewStatus: vi.fn(),
}));

vi.mock("@/features/clientRequests/api", () => apiMock);

const { default: ClientOrderRequestsPage } = await import("../ClientOrderRequestsPage.jsx");

const requestSummary = {
  requestKey: "request-key-1",
  status: "submitted",
  clientName: "Acme Lending",
  propertyAddress: "200 Oak St",
  propertyType: "Condo",
  reportType: "Full appraisal",
  requestedDueDate: "2026-06-20",
  submittedAt: "2026-06-07T13:00:00Z",
};

const requestDetail = {
  ...requestSummary,
  loanPurpose: "Purchase",
  borrowerContactName: "Borrower Name",
  clientContactName: "Avery Client",
  clientContactPhone: "555-0100",
  clientContactEmail: "avery@example.test",
  requestedByName: "Avery Client",
  requestedByEmail: "avery@example.test",
  notes: "Gate code available.",
};

describe("ClientOrderRequestsPage", () => {
  beforeEach(() => {
    apiMock.getClientOrderRequestReviewDetail.mockReset();
    apiMock.listClientOrderRequestsForReview.mockReset();
    apiMock.updateClientOrderRequestReviewStatus.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders staff request list and selected request details", async () => {
    apiMock.listClientOrderRequestsForReview.mockResolvedValue([requestSummary]);
    apiMock.getClientOrderRequestReviewDetail.mockResolvedValue(requestDetail);

    render(<ClientOrderRequestsPage />);

    expect(await screen.findByText("Client Order Requests")).toBeInTheDocument();
    const list = await screen.findByLabelText("Client request list");
    expect(within(list).getByText("200 Oak St")).toBeInTheDocument();
    expect(within(list).getByText("Acme Lending")).toBeInTheDocument();

    const detail = await screen.findByLabelText("Client request detail");
    expect(within(detail).getByText("Full appraisal")).toBeInTheDocument();
    expect(within(detail).getAllByText("Avery Client")).toHaveLength(2);
    expect(within(detail).getByText("Gate code available.")).toBeInTheDocument();
    expect(screen.getByText(/Conversion into an operational order is not wired in this slice/)).toBeInTheDocument();

    expect(document.body.textContent).not.toMatch(/vendor|procurement|fee|margin|invoice/i);
  });

  it("marks a submitted request as reviewing without creating an operational order", async () => {
    apiMock.listClientOrderRequestsForReview.mockResolvedValue([requestSummary]);
    apiMock.getClientOrderRequestReviewDetail.mockResolvedValue(requestDetail);
    apiMock.updateClientOrderRequestReviewStatus.mockResolvedValue({
      requestKey: "request-key-1",
      status: "under_review",
      reviewedAt: "2026-06-07T14:00:00Z",
      reviewedByName: "Coordinator",
    });

    render(<ClientOrderRequestsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Mark reviewing" }));

    await waitFor(() => {
      expect(apiMock.updateClientOrderRequestReviewStatus).toHaveBeenCalledWith(
        "request-key-1",
        "under_review",
      );
    });

    expect(apiMock.getClientOrderRequestReviewDetail).toHaveBeenCalledWith("request-key-1");
    expect(screen.getAllByText("Reviewing").length).toBeGreaterThanOrEqual(1);
    expect(document.body.textContent).not.toMatch(/Create order|Convert request/i);
  });

  it("shows status update errors without dropping request detail", async () => {
    apiMock.listClientOrderRequestsForReview.mockResolvedValue([requestSummary]);
    apiMock.getClientOrderRequestReviewDetail.mockResolvedValue(requestDetail);
    apiMock.updateClientOrderRequestReviewStatus.mockRejectedValue(new Error("manage_required"));

    render(<ClientOrderRequestsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Reject request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("manage_required");
    expect(screen.getByText("Gate code available.")).toBeInTheDocument();
  });
});
