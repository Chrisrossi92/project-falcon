// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  listClientPortalOrders: vi.fn(),
  getClientPortalOrderDetail: vi.fn(),
}));

vi.mock("@/features/clientPortal/api", () => apiMock);

const { default: ClientPortalDashboard } = await import("../ClientPortalDashboard.jsx");
const { default: ClientPortalOrderDetailPage } = await import("../ClientPortalOrderDetailPage.jsx");
const { default: ClientPortalOrdersPage } = await import("../ClientPortalOrdersPage.jsx");
const { default: ClientPortalNewOrderPage } = await import("../ClientPortalNewOrderPage.jsx");

const portalOrder = {
  orderKey: "portal-order-1",
  orderNumber: "CP-001",
  status: "Report in review",
  propertyAddress: "100 Main St",
  dueAt: "2026-06-15",
  inspectionAt: "2026-06-10",
  reportAvailable: false,
};

function renderPortalRoutes(initialPath = "/client-portal") {
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route path="/client-portal" element={<ClientPortalDashboard />} />
        <Route path="/client-portal/orders" element={<ClientPortalOrdersPage />} />
        <Route path="/client-portal/orders/:orderId" element={<ClientPortalOrderDetailPage />} />
        <Route path="/client-portal/new-order" element={<ClientPortalNewOrderPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Client Portal pages", () => {
  beforeEach(() => {
    apiMock.listClientPortalOrders.mockReset();
    apiMock.getClientPortalOrderDetail.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a limited client dashboard with scoped order summary", async () => {
    apiMock.listClientPortalOrders.mockResolvedValue([portalOrder]);

    renderPortalRoutes();

    expect(await screen.findByText("Appraisal orders")).toBeInTheDocument();
    expect(screen.getByText("Order Appraisal")).toBeInTheDocument();
    expect(screen.getByText("Track Progress")).toBeInTheDocument();
    expect(screen.getByText("Download Report")).toBeInTheDocument();
    expect(await screen.findByText("CP-001")).toBeInTheDocument();
    expect(screen.getByText("100 Main St")).toBeInTheDocument();
  });

  it("renders the client order list without internal, vendor, or procurement language", async () => {
    apiMock.listClientPortalOrders.mockResolvedValue([portalOrder]);

    renderPortalRoutes("/client-portal/orders");

    const ordersRegion = await screen.findByRole("region", { name: "Client orders" });
    expect(within(ordersRegion).getByText("CP-001")).toBeInTheDocument();

    const serialized = document.body.textContent;
    expect(serialized).not.toMatch(/vendor bidding|assignment detail|procurement|internal review|private note/i);
  });

  it("renders client-safe order detail and hides operational details", async () => {
    apiMock.getClientPortalOrderDetail.mockResolvedValue({
      ...portalOrder,
      loanPurpose: "Purchase",
      propertyType: "Single family",
      contactName: "Avery Client",
      orderedAt: "2026-06-01",
      reportReadyAt: null,
      reportDownloadReady: false,
      reportDownloadUrl: null,
    });

    renderPortalRoutes("/client-portal/orders/portal-order-1");

    expect(await screen.findByText("CP-001")).toBeInTheDocument();
    expect(screen.getByText("Client-safe appraisal status and report availability for this property.")).toBeInTheDocument();
    expect(screen.getByText("Report in review")).toBeInTheDocument();
    expect(screen.getByText("The final report will be available here after it is released to your account.")).toBeInTheDocument();

    const serialized = document.body.textContent;
    expect(serialized).not.toMatch(/vendor|bid|procurement|appraiser note|internal note|review chatter|assignment/i);
  });

  it("keeps new-order intake as a non-mutating placeholder", () => {
    renderPortalRoutes("/client-portal/new-order");

    expect(screen.getByText("Request an appraisal")).toBeInTheDocument();
    expect(screen.getByText("Intake not wired yet")).toBeInTheDocument();
    expect(apiMock.listClientPortalOrders).not.toHaveBeenCalled();
    expect(apiMock.getClientPortalOrderDetail).not.toHaveBeenCalled();
  });
});
