// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  convertClientOrderRequestToOrder: vi.fn(),
  getClientOrderRequestReviewDetail: vi.fn(),
  listClientOrderRequestsForReview: vi.fn(),
  updateClientOrderRequestReviewStatus: vi.fn(),
}));

vi.mock("@/features/clientRequests/api", () => apiMock);

const permissionState = vi.hoisted(() => ({
  keys: ["client_portal.order_requests.manage", "orders.create"],
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    loading: false,
    error: null,
    hasAllPermissions: (keys) => keys.every((key) => permissionState.keys.includes(key)),
  }),
}));

const { default: ClientOrderRequestsPage } = await import("../ClientOrderRequestsPage.jsx");

function renderPage() {
  return render(
    <MemoryRouter>
      <ClientOrderRequestsPage />
    </MemoryRouter>,
  );
}

const requestSummary = {
  requestKey: "request-key-1",
  status: "submitted",
  clientName: "Acme Lending",
  propertyAddress: "200 Oak St",
  propertyCity: "Toledo",
  propertyState: "OH",
  propertyPostalCode: "43604",
  propertyCounty: "Lucas",
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
    permissionState.keys = ["client_portal.order_requests.manage", "orders.create"];
    apiMock.convertClientOrderRequestToOrder.mockReset();
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

    renderPage();

    expect(await screen.findByText("Client Order Requests")).toBeInTheDocument();
    const list = await screen.findByLabelText("Client request list");
    expect(within(list).getByText("200 Oak St · Toledo, OH 43604 · Lucas County")).toBeInTheDocument();
    expect(within(list).getByText("Acme Lending")).toBeInTheDocument();

    const detail = await screen.findByLabelText("Client request detail");
    expect(within(detail).getByText("Toledo")).toBeInTheDocument();
    expect(within(detail).getByText("OH")).toBeInTheDocument();
    expect(within(detail).getByText("43604")).toBeInTheDocument();
    expect(within(detail).getByText("Lucas")).toBeInTheDocument();
    expect(within(detail).getByText("Full appraisal")).toBeInTheDocument();
    expect(within(detail).getAllByText("Avery Client")).toHaveLength(2);
    expect(within(detail).getByText("Gate code available.")).toBeInTheDocument();
    expect(screen.getByText(/before converting a request into one operational order/i)).toBeInTheDocument();

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

    renderPage();

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

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Reject request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("manage_required");
    expect(screen.getByText("Gate code available.")).toBeInTheDocument();
  });

  it("shows conversion only with manage and order create permissions", async () => {
    permissionState.keys = ["client_portal.order_requests.manage"];
    apiMock.listClientOrderRequestsForReview.mockResolvedValue([requestSummary]);
    apiMock.getClientOrderRequestReviewDetail.mockResolvedValue(requestDetail);

    renderPage();

    await screen.findByLabelText("Client request detail");

    expect(screen.queryByRole("button", { name: "Convert to order" })).toBeNull();
  });

  it("confirms mapped fields before converting a request into an order", async () => {
    apiMock.listClientOrderRequestsForReview.mockResolvedValue([requestSummary]);
    apiMock.getClientOrderRequestReviewDetail.mockResolvedValue(requestDetail);
    apiMock.convertClientOrderRequestToOrder.mockResolvedValue({
      requestKey: "request-key-1",
      status: "accepted",
      orderId: "order-1",
      orderNumber: "26-0001",
      propertyAddress: "200 Oak St",
      clientName: "Acme Lending",
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Convert to order" }));

    const dialog = await screen.findByRole("dialog", { name: "Convert request to order?" });
    expect(within(dialog).getByText("200 Oak St")).toBeInTheDocument();
    expect(within(dialog).getByText("Toledo")).toBeInTheDocument();
    expect(within(dialog).getByText("OH")).toBeInTheDocument();
    expect(within(dialog).getByText("43604")).toBeInTheDocument();
    expect(within(dialog).getByText("Lucas")).toBeInTheDocument();
    expect(within(dialog).getByText("Condo")).toBeInTheDocument();
    expect(within(dialog).getByText("Full appraisal")).toBeInTheDocument();
    expect(within(dialog).getByText("Purchase")).toBeInTheDocument();
    expect(within(dialog).getByText(/will not create assignments, vendor bidding, invoices, payments, reports, or documents/i)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm conversion" }));

    await waitFor(() => {
      expect(apiMock.convertClientOrderRequestToOrder).toHaveBeenCalledWith("request-key-1");
    });

    expect(await screen.findByRole("link", { name: "26-0001" })).toHaveAttribute("href", "/orders/order-1");
    expect(apiMock.updateClientOrderRequestReviewStatus).not.toHaveBeenCalledWith("request-key-1", "accepted");
  });

  it("prevents duplicate conversion for already accepted requests", async () => {
    apiMock.listClientOrderRequestsForReview.mockResolvedValue([
      { ...requestSummary, status: "accepted" },
    ]);
    apiMock.getClientOrderRequestReviewDetail.mockResolvedValue({
      ...requestDetail,
      status: "accepted",
      acceptedOrderId: "order-1",
      acceptedOrderNumber: "26-0001",
    });

    renderPage();

    const button = await screen.findByRole("button", { name: "Convert to order" });
    expect(button).toBeDisabled();
    expect(screen.getByRole("link", { name: "26-0001" })).toHaveAttribute("href", "/orders/order-1");
  });

  it("does not allow declined requests to convert", async () => {
    apiMock.listClientOrderRequestsForReview.mockResolvedValue([
      { ...requestSummary, status: "declined" },
    ]);
    apiMock.getClientOrderRequestReviewDetail.mockResolvedValue({
      ...requestDetail,
      status: "declined",
    });

    renderPage();

    expect(await screen.findByRole("button", { name: "Convert to order" })).toBeDisabled();
    expect(apiMock.convertClientOrderRequestToOrder).not.toHaveBeenCalled();
  });
});
