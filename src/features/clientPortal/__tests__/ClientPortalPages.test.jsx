// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  acceptClientPortalInvitation: vi.fn(),
  createClientPortalReportDownloadUrl: vi.fn(),
  getClientPortalDashboard: vi.fn(),
  listClientPortalOrders: vi.fn(),
  getClientPortalOrderDetail: vi.fn(),
  readClientPortalInvitation: vi.fn(),
  submitClientPortalOrderRequest: vi.fn(),
}));

const sessionMock = vi.hoisted(() => ({
  session: null,
  isLoading: false,
}));

vi.mock("@/features/clientPortal/api", () => apiMock);
vi.mock("@supabase/auth-helpers-react", () => ({
  useSessionContext: () => sessionMock,
}));

const { default: ClientPortalDashboard } = await import("../ClientPortalDashboard.jsx");
const { default: ClientPortalInvitationPage } = await import("../ClientPortalInvitationPage.jsx");
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
        <Route path="/client-portal/invitations/:token" element={<ClientPortalInvitationPage />} />
        <Route path="/client-portal/orders" element={<ClientPortalOrdersPage />} />
        <Route path="/client-portal/orders/:orderId" element={<ClientPortalOrderDetailPage />} />
        <Route path="/client-portal/new-order" element={<ClientPortalNewOrderPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Client Portal pages", () => {
  beforeEach(() => {
    sessionMock.session = null;
    sessionMock.isLoading = false;
    apiMock.acceptClientPortalInvitation.mockReset();
    apiMock.getClientPortalDashboard.mockReset();
    apiMock.createClientPortalReportDownloadUrl.mockReset();
    apiMock.listClientPortalOrders.mockReset();
    apiMock.getClientPortalOrderDetail.mockReset();
    apiMock.readClientPortalInvitation.mockReset();
    apiMock.submitClientPortalOrderRequest.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a limited client dashboard with scoped order summary", async () => {
    apiMock.getClientPortalDashboard.mockResolvedValue({
      activeOrderCount: 1,
      reportAvailableCount: 0,
      nextDueAt: "2026-06-15",
      recentOrders: [portalOrder],
    });

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
    expect(await within(ordersRegion).findByText("CP-001")).toBeInTheDocument();

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
    });

    renderPortalRoutes("/client-portal/orders/portal-order-1");

    expect(await screen.findByText("CP-001")).toBeInTheDocument();
    expect(screen.getByText("Client-safe appraisal status and report availability for this property.")).toBeInTheDocument();
    expect(screen.getByText("Report in review")).toBeInTheDocument();
    expect(screen.getByText("The final report will be available here after it is released to your account.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download report" })).toBeDisabled();

    const serialized = document.body.textContent;
    expect(serialized).not.toMatch(/vendor|bid|procurement|appraiser note|internal note|review chatter|assignment/i);
  });

  it("requests a signed report download only when a final report is available", async () => {
    const originalAssign = window.location.assign;
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: assignMock,
      },
    });

    apiMock.getClientPortalOrderDetail.mockResolvedValue({
      ...portalOrder,
      reportAvailable: true,
      reportDownloadReady: true,
      reportFileName: "final-report.pdf",
    });
    apiMock.createClientPortalReportDownloadUrl.mockResolvedValue({
      signedUrl: "https://signed.example/final-report.pdf",
      expiresIn: 300,
      fileName: "final-report.pdf",
    });

    renderPortalRoutes("/client-portal/orders/portal-order-1");

    fireEvent.click(await screen.findByRole("button", { name: "Download report" }));

    await waitFor(() => {
      expect(apiMock.createClientPortalReportDownloadUrl).toHaveBeenCalledWith("portal-order-1");
      expect(assignMock).toHaveBeenCalledWith("https://signed.example/final-report.pdf");
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: originalAssign,
      },
    });
  });

  it("keeps report download errors visible without exposing storage internals", async () => {
    apiMock.getClientPortalOrderDetail.mockResolvedValue({
      ...portalOrder,
      reportAvailable: true,
      reportDownloadReady: true,
      reportFileName: "final-report.pdf",
    });
    apiMock.createClientPortalReportDownloadUrl.mockRejectedValue(new Error("You cannot download this report."));

    renderPortalRoutes("/client-portal/orders/portal-order-1");

    fireEvent.click(await screen.findByRole("button", { name: "Download report" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You cannot download this report.");
    expect(document.body.textContent).not.toMatch(/storage_bucket|storage_path|order-documents|signed_url/i);
  });

  it("submits a client-safe order request and shows confirmation", async () => {
    apiMock.submitClientPortalOrderRequest.mockResolvedValue({
      requestKey: "request-key-1",
      status: "submitted",
      propertyAddress: "200 Oak St",
    });

    renderPortalRoutes("/client-portal/new-order");

    expect(screen.getByText("Request an appraisal")).toBeInTheDocument();
    expect(screen.getByText("File upload is not available yet. Your team can request supporting documents after reviewing the request.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Property address"), {
      target: { value: "200 Oak St" },
    });
    fireEvent.change(screen.getByLabelText("Property type"), {
      target: { value: "Condo" },
    });
    fireEvent.change(screen.getByLabelText("Report type"), {
      target: { value: "Full appraisal" },
    });
    fireEvent.change(screen.getByLabelText("Loan purpose"), {
      target: { value: "Purchase" },
    });
    fireEvent.change(screen.getByLabelText("Requested due date"), {
      target: { value: "2026-06-20" },
    });
    fireEvent.change(screen.getByLabelText("Borrower or property contact"), {
      target: { value: "Borrower Name" },
    });
    fireEvent.change(screen.getByLabelText("Your contact name"), {
      target: { value: "Avery Client" },
    });
    fireEvent.change(screen.getByLabelText("Contact phone"), {
      target: { value: "555-0100" },
    });
    fireEvent.change(screen.getByLabelText("Contact email"), {
      target: { value: "avery@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Notes or special instructions"), {
      target: { value: "Gate code available." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => {
      expect(apiMock.submitClientPortalOrderRequest).toHaveBeenCalledWith({
        propertyAddress: "200 Oak St",
        propertyType: "Condo",
        reportType: "Full appraisal",
        loanPurpose: "Purchase",
        requestedDueDate: "2026-06-20",
        borrowerContactName: "Borrower Name",
        clientContactName: "Avery Client",
        clientContactPhone: "555-0100",
        clientContactEmail: "avery@example.test",
        notes: "Gate code available.",
      });
    });

    expect(await screen.findByText("Request submitted")).toBeInTheDocument();
    expect(screen.getByText("Your team will review and confirm the details before the appraisal moves forward.")).toBeInTheDocument();
    expect(apiMock.getClientPortalDashboard).not.toHaveBeenCalled();
    expect(apiMock.listClientPortalOrders).not.toHaveBeenCalled();
    expect(apiMock.getClientPortalOrderDetail).not.toHaveBeenCalled();

    expect(document.body.textContent).not.toMatch(/vendor|appraiser|procurement|assignment|fee|margin/i);
  });

  it("keeps order request errors visible without losing the form", async () => {
    apiMock.submitClientPortalOrderRequest.mockRejectedValue(new Error("client_portal_order_request_create_required"));

    renderPortalRoutes("/client-portal/new-order");

    fireEvent.change(screen.getByLabelText("Property address"), {
      target: { value: "200 Oak St" },
    });
    fireEvent.change(screen.getByLabelText("Property type"), {
      target: { value: "Condo" },
    });
    fireEvent.change(screen.getByLabelText("Report type"), {
      target: { value: "Full appraisal" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("client_portal_order_request_create_required");
    expect(screen.getByDisplayValue("200 Oak St")).toBeInTheDocument();
  });

  it("renders a valid client portal invitation with sign-in guidance", async () => {
    apiMock.readClientPortalInvitation.mockResolvedValue({
      clientName: "First American Bank",
      companyName: "Falcon AMC",
      contactName: "Dana Miller",
      email: "dmiller@firstbank.com",
      status: "pending",
      expiresAt: "2026-06-15T13:00:00Z",
    });

    renderPortalRoutes("/client-portal/invitations/raw-token");

    expect(await screen.findByText("You're invited by Falcon AMC")).toBeInTheDocument();
    expect(screen.getByText("First American Bank")).toBeInTheDocument();
    expect(screen.getByText("dmiller@firstbank.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in or create account" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Fclient-portal%2Finvitations%2Fraw-token",
    );
    expect(apiMock.getClientPortalDashboard).not.toHaveBeenCalled();
  });

  it("renders expired and revoked client portal invitation states", async () => {
    apiMock.readClientPortalInvitation.mockResolvedValueOnce({
      clientName: "First American Bank",
      companyName: "Falcon AMC",
      email: "dmiller@firstbank.com",
      status: "expired",
    });

    renderPortalRoutes("/client-portal/invitations/expired-token");

    expect(await screen.findByText("This invitation has expired.")).toBeInTheDocument();

    cleanup();

    apiMock.readClientPortalInvitation.mockResolvedValueOnce({
      clientName: "First American Bank",
      companyName: "Falcon AMC",
      email: "dmiller@firstbank.com",
      status: "revoked",
    });

    renderPortalRoutes("/client-portal/invitations/revoked-token");

    expect(await screen.findByText("This invitation is no longer active.")).toBeInTheDocument();
  });

  it("accepts a valid client portal invitation and redirects to the portal", async () => {
    sessionMock.session = {
      user: {
        id: "auth-user-1",
        email: "dmiller@firstbank.com",
      },
    };
    apiMock.readClientPortalInvitation.mockResolvedValue({
      clientName: "First American Bank",
      companyName: "Falcon AMC",
      email: "dmiller@firstbank.com",
      status: "pending",
    });
    apiMock.acceptClientPortalInvitation.mockResolvedValue({
      clientName: "First American Bank",
      email: "dmiller@firstbank.com",
      status: "accepted",
    });
    apiMock.getClientPortalDashboard.mockResolvedValue({
      activeOrderCount: 0,
      reportAvailableCount: 0,
      recentOrders: [],
    });

    renderPortalRoutes("/client-portal/invitations/raw-token");

    fireEvent.click(await screen.findByRole("button", { name: "Accept invitation" }));

    await waitFor(() => {
      expect(apiMock.acceptClientPortalInvitation).toHaveBeenCalledWith("raw-token");
      expect(screen.getByText("Appraisal orders")).toBeInTheDocument();
    });
  });
});
