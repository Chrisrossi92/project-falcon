// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  acceptClientPortalInvitation: vi.fn(),
  createClientPortalReportDownloadUrl: vi.fn(),
  getClientPortalDashboard: vi.fn(),
  listClientPortalPendingOrderRequests: vi.fn(),
  listClientPortalOrders: vi.fn(),
  getClientPortalOrderDetail: vi.fn(),
  readClientPortalInvitation: vi.fn(),
  submitClientPortalOrderRequest: vi.fn(),
}));

const sessionMock = vi.hoisted(() => ({
  session: null,
  isLoading: false,
}));

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
  },
}));

vi.mock("@/features/clientPortal/api", () => apiMock);
vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));
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
    apiMock.listClientPortalPendingOrderRequests.mockReset();
    apiMock.createClientPortalReportDownloadUrl.mockReset();
    apiMock.listClientPortalOrders.mockReset();
    apiMock.getClientPortalOrderDetail.mockReset();
    apiMock.readClientPortalInvitation.mockReset();
    apiMock.submitClientPortalOrderRequest.mockReset();
    supabaseMock.auth.signUp.mockReset();
    supabaseMock.auth.signInWithPassword.mockReset();
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
    apiMock.listClientPortalPendingOrderRequests.mockResolvedValue([]);

    renderPortalRoutes();

    expect(await screen.findByText("What needs attention today")).toBeInTheDocument();
    expect(screen.getByText("Client Portal / Falcon Workspace")).toBeInTheDocument();
    expect(screen.getAllByText("Request Appraisal").length).toBeGreaterThan(0);
    expect(screen.getByText("Active Orders")).toBeInTheDocument();
    expect(screen.getByText("Waiting on You")).toBeInTheDocument();
    expect(screen.getByText("Reports Ready")).toBeInTheDocument();
    expect(screen.getByText("Recent Updates")).toBeInTheDocument();
    expect(screen.getByText("Current Orders")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Due Dates")).toBeInTheDocument();
    expect(screen.getByText("Recent Documents")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Orders" })).toHaveAttribute("href", "/client-portal/orders");
    expect(screen.getAllByRole("link", { name: "Request Appraisal" })[0]).toHaveAttribute(
      "href",
      "/client-portal/new-order",
    );
    expect((await screen.findAllByText("CP-001")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("100 Main St").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Vendor Workspace" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Internal Operations" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Falcon AMC" })).toBeNull();
  });

  it("shows submitted pending client requests on the dashboard without treating them as active orders", async () => {
    apiMock.getClientPortalDashboard.mockResolvedValue({
      activeOrderCount: 0,
      reportAvailableCount: 0,
      nextDueAt: null,
      recentOrders: [],
    });
    apiMock.listClientPortalPendingOrderRequests.mockResolvedValue([
      {
        requestKey: "request-key-1",
        status: "submitted",
        statusLabel: "Submitted",
        statusCopy: "Your appraisal team is reviewing this request.",
        propertyAddress: "300 Madison Ave, Toledo OH",
        propertyCity: "Toledo",
        propertyState: "OH",
        propertyPostalCode: "43604",
        propertyCounty: "Lucas",
        propertyType: "Office",
        reportType: "Full",
        requestedDueDate: "2026-06-20",
        submittedAt: "2026-06-08T14:00:00Z",
      },
    ]);

    renderPortalRoutes();

    expect(await screen.findByText("Submitted Requests")).toBeInTheDocument();
    expect(await screen.findByText("300 Madison Ave, Toledo OH · Toledo, OH 43604 · Lucas County")).toBeInTheDocument();
    expect(screen.getAllByText("Submitted").length).toBeGreaterThan(0);
    expect(screen.getByText("Your appraisal team is reviewing this request.")).toBeInTheDocument();
    expect(screen.getByText("Jun 20, 2026")).toBeInTheDocument();
    expect(screen.getByText("Active Orders")).toBeInTheDocument();
    expect(screen.queryByText("CP-001")).not.toBeInTheDocument();

    const serialized = document.body.textContent;
    expect(serialized).not.toMatch(/vendor|procurement|assignment|internal review|staff note|fee|margin/i);
  });

  it("renders the client order list without internal, vendor, or procurement language", async () => {
    apiMock.listClientPortalOrders.mockResolvedValue([portalOrder]);
    apiMock.listClientPortalPendingOrderRequests.mockResolvedValue([]);

    renderPortalRoutes("/client-portal/orders");

    const ordersRegion = await screen.findByRole("region", { name: "Client orders" });
    expect(await within(ordersRegion).findByText("CP-001")).toBeInTheDocument();

    const serialized = document.body.textContent;
    expect(serialized).not.toMatch(/vendor bidding|assignment detail|procurement|internal review|private note/i);
  });

  it("shows pending submitted requests on the orders page separately from operational orders", async () => {
    apiMock.listClientPortalOrders.mockResolvedValue([]);
    apiMock.listClientPortalPendingOrderRequests.mockResolvedValue([
      {
        requestKey: "request-key-1",
        status: "submitted",
        statusLabel: "Submitted",
        statusCopy: "Your appraisal team is reviewing this request.",
        propertyAddress: "300 Madison Ave, Toledo OH",
        propertyCity: "Toledo",
        propertyState: "OH",
        propertyPostalCode: "43604",
        propertyCounty: "Lucas",
        requestedDueDate: "2026-06-20",
        submittedAt: "2026-06-08T14:00:00Z",
      },
    ]);

    renderPortalRoutes("/client-portal/orders");

    const pendingRegion = await screen.findByRole("region", { name: "Pending requests" });
    expect(within(pendingRegion).getByText("300 Madison Ave, Toledo OH · Toledo, OH 43604 · Lucas County")).toBeInTheDocument();
    expect(within(pendingRegion).getAllByText("Submitted").length).toBeGreaterThan(0);
    expect(within(pendingRegion).getByText("Your appraisal team is reviewing this request.")).toBeInTheDocument();
    expect(screen.getByText("No client portal orders are available yet.")).toBeInTheDocument();
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
    expect(screen.getByText("Appraisal Detail")).toBeInTheDocument();
    expect(screen.getByText("Report in review")).toBeInTheDocument();
    expect(screen.getByText("The final report will be available here after it is released to your account.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download final report" })).toBeDisabled();

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

    fireEvent.click(await screen.findByRole("button", { name: "Download final report" }));

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

    fireEvent.click(await screen.findByRole("button", { name: "Download final report" }));

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

    expect(screen.getByText("Request a new appraisal")).toBeInTheDocument();
    expect(screen.getByText(/Upload is not available from this portal form yet/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Property address"), {
      target: { value: "200 Oak St" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Toledo" },
    });
    fireEvent.change(screen.getByLabelText("State"), {
      target: { value: "OH" },
    });
    fireEvent.change(screen.getByLabelText("ZIP"), {
      target: { value: "43604" },
    });
    fireEvent.change(screen.getByLabelText("County"), {
      target: { value: "Lucas" },
    });
    fireEvent.change(screen.getByLabelText("Property type"), {
      target: { value: "Office" },
    });
    fireEvent.change(screen.getByLabelText("Report type"), {
      target: { value: "Full Appraisal" },
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
        propertyCity: "Toledo",
        propertyState: "OH",
        propertyPostalCode: "43604",
        propertyCounty: "Lucas",
        propertyType: "Office",
        reportType: "Full Appraisal",
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
    expect(screen.getByText("Your appraisal team will review the details and confirm next steps.")).toBeInTheDocument();
    expect(apiMock.getClientPortalDashboard).not.toHaveBeenCalled();
    expect(apiMock.listClientPortalOrders).not.toHaveBeenCalled();
    expect(apiMock.listClientPortalPendingOrderRequests).not.toHaveBeenCalled();
    expect(apiMock.getClientPortalOrderDetail).not.toHaveBeenCalled();

    expect(document.body.textContent).not.toMatch(/vendor|appraiser|procurement|assignment|fee|margin/i);
  });

  it("submits the filled production pilot order request fields to the API wrapper", async () => {
    apiMock.submitClientPortalOrderRequest.mockResolvedValue({
      requestKey: "request-key-2",
      status: "submitted",
      propertyAddress: "300 Madison Ave, Toledo OH",
    });

    renderPortalRoutes("/client-portal/new-order");

    fireEvent.change(screen.getByLabelText("Property address"), {
      target: { value: "300 Madison Ave, Toledo OH" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Toledo" },
    });
    fireEvent.change(screen.getByLabelText("State"), {
      target: { value: "OH" },
    });
    fireEvent.change(screen.getByLabelText("ZIP"), {
      target: { value: "43604" },
    });
    fireEvent.change(screen.getByLabelText("Property type"), {
      target: { value: "Office" },
    });
    fireEvent.change(screen.getByLabelText("Report type"), {
      target: { value: "Full Appraisal" },
    });
    fireEvent.change(screen.getByLabelText("Loan purpose"), {
      target: { value: "Refinance" },
    });
    fireEvent.change(screen.getByLabelText("Requested due date"), {
      target: { value: "2026-06-20" },
    });
    fireEvent.change(screen.getByLabelText("Borrower or property contact"), {
      target: { value: "John Smith" },
    });
    fireEvent.change(screen.getByLabelText("Your contact name"), {
      target: { value: "Abby Meneses" },
    });
    fireEvent.change(screen.getByLabelText("Contact phone"), {
      target: { value: "4193083466" },
    });
    fireEvent.change(screen.getByLabelText("Contact email"), {
      target: { value: "abbymeneses91@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("Notes or special instructions"), {
      target: { value: "Please do quick" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => {
      expect(apiMock.submitClientPortalOrderRequest).toHaveBeenCalledWith({
        propertyAddress: "300 Madison Ave, Toledo OH",
        propertyCity: "Toledo",
        propertyState: "OH",
        propertyPostalCode: "43604",
        propertyCounty: "",
        propertyType: "Office",
        reportType: "Full Appraisal",
        loanPurpose: "Refinance",
        requestedDueDate: "2026-06-20",
        borrowerContactName: "John Smith",
        clientContactName: "Abby Meneses",
        clientContactPhone: "4193083466",
        clientContactEmail: "abbymeneses91@gmail.com",
        notes: "Please do quick",
      });
    });

    expect(await screen.findByText("Request submitted")).toBeInTheDocument();
  });

  it("submits Other dropdown detail values for controlled intake fields", async () => {
    apiMock.submitClientPortalOrderRequest.mockResolvedValue({
      requestKey: "request-key-other",
      status: "submitted",
      propertyAddress: "400 Market St",
    });

    renderPortalRoutes("/client-portal/new-order");

    fireEvent.change(screen.getByLabelText("Property address"), {
      target: { value: "400 Market St" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Toledo" },
    });
    fireEvent.change(screen.getByLabelText("State"), {
      target: { value: "OH" },
    });
    fireEvent.change(screen.getByLabelText("ZIP"), {
      target: { value: "43604" },
    });
    fireEvent.change(screen.getByLabelText("Property type"), {
      target: { value: "Other" },
    });
    fireEvent.change(screen.getByPlaceholderText("Describe property type"), {
      target: { value: "Medical Office" },
    });
    fireEvent.change(screen.getByLabelText("Report type"), {
      target: { value: "Other" },
    });
    fireEvent.change(screen.getByPlaceholderText("Describe report type"), {
      target: { value: "Narrative Appraisal" },
    });
    fireEvent.change(screen.getByLabelText("Loan purpose"), {
      target: { value: "Other" },
    });
    fireEvent.change(screen.getByPlaceholderText("Describe intended use"), {
      target: { value: "Portfolio review" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => {
      expect(apiMock.submitClientPortalOrderRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyAddress: "400 Market St",
          propertyCity: "Toledo",
          propertyState: "OH",
          propertyPostalCode: "43604",
          propertyType: "Medical Office",
          reportType: "Narrative Appraisal",
          loanPurpose: "Portfolio review",
        }),
      );
    });
  });

  it("keeps order request errors visible without losing the form", async () => {
    apiMock.submitClientPortalOrderRequest.mockRejectedValue(new Error("client_portal_order_request_create_required"));

    renderPortalRoutes("/client-portal/new-order");

    fireEvent.change(screen.getByLabelText("Property address"), {
      target: { value: "200 Oak St" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Toledo" },
    });
    fireEvent.change(screen.getByLabelText("State"), {
      target: { value: "OH" },
    });
    fireEvent.change(screen.getByLabelText("ZIP"), {
      target: { value: "43604" },
    });
    fireEvent.change(screen.getByLabelText("Property type"), {
      target: { value: "Office" },
    });
    fireEvent.change(screen.getByLabelText("Report type"), {
      target: { value: "Full Appraisal" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your Client Portal access could not be confirmed. Return to your invitation link or contact your appraisal team.",
    );
    expect(screen.getByDisplayValue("200 Oak St")).toBeInTheDocument();
  });

  it("maps backend request validation errors to readable messages", async () => {
    apiMock.submitClientPortalOrderRequest.mockRejectedValue(new Error("client_contact_email_invalid"));

    renderPortalRoutes("/client-portal/new-order");

    fireEvent.change(screen.getByLabelText("Property address"), {
      target: { value: "200 Oak St" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Toledo" },
    });
    fireEvent.change(screen.getByLabelText("State"), {
      target: { value: "OH" },
    });
    fireEvent.change(screen.getByLabelText("ZIP"), {
      target: { value: "43604" },
    });
    fireEvent.change(screen.getByLabelText("Property type"), {
      target: { value: "Office" },
    });
    fireEvent.change(screen.getByLabelText("Report type"), {
      target: { value: "Full Appraisal" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid contact email address.");
    expect(screen.getByDisplayValue("200 Oak St")).toBeInTheDocument();
  });

  it("renders a valid client portal invitation with create-account guidance", async () => {
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
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("dmiller@firstbank.com");
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

  it("creates an invited client account, accepts the invite, and redirects to the portal", async () => {
    apiMock.readClientPortalInvitation.mockResolvedValue({
      clientName: "First American Bank",
      companyName: "Falcon AMC",
      email: "dmiller@firstbank.com",
      status: "pending",
    });
    supabaseMock.auth.signUp.mockResolvedValue({
      data: {
        user: { id: "auth-user-1", email: "dmiller@firstbank.com" },
        session: { access_token: "token" },
      },
      error: null,
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

    fireEvent.change(await screen.findByLabelText("Password"), {
      target: { value: "DanaPassword123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "DanaPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account and continue" }));

    await waitFor(() => {
      expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
        email: "dmiller@firstbank.com",
        password: "DanaPassword123!",
        options: {
          emailRedirectTo: "http://localhost:3000/client-portal/invitations/raw-token",
        },
      });
      expect(apiMock.acceptClientPortalInvitation).toHaveBeenCalledWith("raw-token");
      expect(screen.getByText("What needs attention today")).toBeInTheDocument();
    });
  });

  it("shows email confirmation state when signup creates a user without a session", async () => {
    apiMock.readClientPortalInvitation.mockResolvedValue({
      clientName: "First American Bank",
      companyName: "Falcon AMC",
      email: "dmiller@firstamerican.com",
      status: "pending",
    });
    supabaseMock.auth.signUp.mockResolvedValue({
      data: {
        user: { id: "auth-user-1", email: "dmiller@firstamerican.com" },
        session: null,
      },
      error: null,
    });

    renderPortalRoutes("/client-portal/invitations/raw-token");

    fireEvent.change(await screen.findByLabelText("Password"), {
      target: { value: "DanaPassword123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "DanaPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account and continue" }));

    expect(await screen.findByText("Account created.")).toBeInTheDocument();
    expect(screen.getByText(/Please check your email to confirm your account, then return to this invite link to finish setup/i)).toBeInTheDocument();
    expect(screen.getByText(/If confirmation sends you to the Client Portal before setup is complete/i)).toBeInTheDocument();
    expect(screen.getByText("dmiller@firstamerican.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in after confirming" })).toBeInTheDocument();
    expect(apiMock.acceptClientPortalInvitation).not.toHaveBeenCalled();
    expect(screen.queryByText("What needs attention today")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign in after confirming" }));
    expect(screen.getByRole("button", { name: "Sign in and continue" })).toBeInTheDocument();
  });

  it("signs in an existing invited client, accepts the invite, and redirects to the portal", async () => {
    apiMock.readClientPortalInvitation.mockResolvedValue({
      clientName: "First American Bank",
      companyName: "Falcon AMC",
      email: "dmiller@firstbank.com",
      status: "pending",
    });
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "auth-user-1", email: "dmiller@firstbank.com" },
        session: { access_token: "token" },
      },
      error: null,
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

    fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "DanaPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in and continue" }));

    await waitFor(() => {
      expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "dmiller@firstbank.com",
        password: "DanaPassword123!",
      });
      expect(apiMock.acceptClientPortalInvitation).toHaveBeenCalledWith("raw-token");
      expect(screen.getByText("What needs attention today")).toBeInTheDocument();
    });
  });

  it("keeps generic invite acceptance failures visible", async () => {
    apiMock.readClientPortalInvitation.mockResolvedValue({
      clientName: "First American Bank",
      companyName: "Falcon AMC",
      email: "dmiller@firstbank.com",
      status: "pending",
    });
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "auth-user-1", email: "dmiller@firstbank.com" },
        session: { access_token: "token" },
      },
      error: null,
    });
    apiMock.acceptClientPortalInvitation.mockRejectedValue(new Error("rpc_unavailable"));

    renderPortalRoutes("/client-portal/invitations/raw-token");

    fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "DanaPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in and continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The invitation could not be accepted. Try again or ask your lending team contact for a new invite.",
    );
    expect(apiMock.acceptClientPortalInvitation).toHaveBeenCalledWith("raw-token");
    expect(screen.queryByText("What needs attention today")).not.toBeInTheDocument();
  });

  it("auto-accepts a pending invite for an already authenticated client", async () => {
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

    await waitFor(() => {
      expect(apiMock.acceptClientPortalInvitation).toHaveBeenCalledWith("raw-token");
      expect(screen.getByText("What needs attention today")).toBeInTheDocument();
    });
  });
});
