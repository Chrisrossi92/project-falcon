// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OperationsModeProvider } from "@/lib/operations/OperationsModeProvider";
import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";

const vendorApiState = vi.hoisted(() => ({
  listVendorDirectory: vi.fn(),
  createVendorProfile: vi.fn(),
  listAmcVendorInvoices: vi.fn(),
  listAmcVendorPaymentLedger: vi.fn(),
  listVendorProfileUpdateRequests: vi.fn(),
  markAmcVendorPaymentPaid: vi.fn(),
  reviewAmcVendorInvoice: vi.fn(),
  reviewVendorProfileUpdateRequest: vi.fn(),
  scheduleAmcVendorPayment: vi.fn(),
}));

const orderDocumentApiState = vi.hoisted(() => ({
  createOrderDocumentDownloadUrl: vi.fn(),
}));

const permissionState = vi.hoisted(() => ({
  allowed: new Set(),
}));

const routeState = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock("../api", () => ({
  listVendorDirectory: vendorApiState.listVendorDirectory,
  createVendorProfile: vendorApiState.createVendorProfile,
  listAmcVendorInvoices: vendorApiState.listAmcVendorInvoices,
  listAmcVendorPaymentLedger: vendorApiState.listAmcVendorPaymentLedger,
  listVendorProfileUpdateRequests: vendorApiState.listVendorProfileUpdateRequests,
  markAmcVendorPaymentPaid: vendorApiState.markAmcVendorPaymentPaid,
  reviewAmcVendorInvoice: vendorApiState.reviewAmcVendorInvoice,
  reviewVendorProfileUpdateRequest: vendorApiState.reviewVendorProfileUpdateRequest,
  scheduleAmcVendorPayment: vendorApiState.scheduleAmcVendorPayment,
}));

vi.mock("@/features/order-documents/api.js", () => ({
  createOrderDocumentDownloadUrl: orderDocumentApiState.createOrderDocumentDownloadUrl,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useCan: (permissionKey) => ({
    allowed: permissionState.allowed.has(permissionKey),
    loading: false,
    error: null,
    permissionKeys: [...permissionState.allowed],
  }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => routeState.navigate,
  };
});

const { default: VendorDirectoryPage } = await import("../VendorDirectoryPage.jsx");

function renderPage() {
  window.localStorage.setItem("falcon.operationsMode", OPERATIONS_MODES.AMC_OPERATIONS);
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <OperationsModeProvider availableOperationsModes={[OPERATIONS_MODES.AMC_OPERATIONS]}>
        <VendorDirectoryPage />
      </OperationsModeProvider>
    </MemoryRouter>,
  );
}

const vendorRow = {
  vendor_profile_id: "profile-1",
  vendor_company_id: "company-1",
  vendor_company_name: "ABC Valuation",
  vendor_status: "preferred",
  relationship_status: "active",
  primary_contact_name: "Mary Jones",
  primary_contact_email: "mary@example.test",
  primary_contact_phone: "555-0100",
  service_area_summary: {
    active_count: 2,
    states: ["NY"],
    counties: ["Westchester"],
    zips: ["10601"],
    markets: ["NY Metro"],
    product_types: ["commercial"],
  },
  product_eligibility: {
    commercial: true,
    multifamily: true,
  },
  tags: ["preferred", "fast-turn"],
  updated_at: "2026-06-01T12:00:00.000Z",
};

describe("VendorDirectoryPage", () => {
  beforeEach(() => {
    vendorApiState.listVendorDirectory.mockReset();
    vendorApiState.createVendorProfile.mockReset();
    vendorApiState.listAmcVendorInvoices.mockReset();
    vendorApiState.listAmcVendorInvoices.mockResolvedValue([]);
    vendorApiState.listAmcVendorPaymentLedger.mockReset();
    vendorApiState.listAmcVendorPaymentLedger.mockResolvedValue([]);
    vendorApiState.listVendorProfileUpdateRequests.mockReset();
    vendorApiState.markAmcVendorPaymentPaid.mockReset();
    vendorApiState.reviewAmcVendorInvoice.mockReset();
    vendorApiState.reviewVendorProfileUpdateRequest.mockReset();
    vendorApiState.scheduleAmcVendorPayment.mockReset();
    orderDocumentApiState.createOrderDocumentDownloadUrl.mockReset();
    orderDocumentApiState.createOrderDocumentDownloadUrl.mockResolvedValue({
      signed_url: "https://example.test/invoice-download",
    });
    vi.spyOn(window, "open").mockImplementation(() => null);
    permissionState.allowed = new Set();
    routeState.navigate.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("renders loading and populated Vendor Directory states", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([vendorRow]);

    renderPage();

    expect(screen.getByText("Loading vendors...")).toBeInTheDocument();

    expect(await screen.findByText("ABC Valuation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ABC Valuation" })).toHaveAttribute("href", "/vendors/profile-1");
    expect(screen.getAllByText("Preferred").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getByText(/Mary Jones/)).toBeInTheDocument();
    expect(screen.getByText(/2 active/)).toBeInTheDocument();
    expect(screen.getByText(/Commercial/)).toBeInTheDocument();
    expect(screen.getByText("fast-turn")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create|save|assign|invite|add/i })).toBeNull();
  });

  it("handles sparse read-model rows without broken detail links or summaries", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([
      {
        vendor_company_name: "Sparse Vendor",
        vendor_status: null,
        relationship_status: null,
        service_area_summary: null,
        product_eligibility: null,
        tags: null,
      },
    ]);

    renderPage();

    expect(await screen.findByText("Sparse Vendor")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sparse Vendor" })).toBeNull();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText(/Network:\s*Staged/)).toBeInTheDocument();
    expect(screen.getByText("No primary contact")).toBeInTheDocument();
    expect(screen.getByText("No active coverage")).toBeInTheDocument();
    expect(screen.getByText("No product summary")).toBeInTheDocument();
  });

  it("renders an empty state", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("No vendors found.")).toBeInTheDocument();
  });

  it("shows pending Vendor Profile update requests to users with vendor update permission", async () => {
    permissionState.allowed = new Set(["vendors.update"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.listVendorProfileUpdateRequests.mockResolvedValue([
      {
        request_key: "request-key-1",
        vendor_company_name: "ABC Valuation",
        status: "pending",
        submitted_at: "2026-06-05T12:00:00.000Z",
        current_snapshot: {
          company: { public_phone: "614-555-0100" },
        },
        proposed_changes: {
          company_changes: { public_phone: "614-555-0199" },
          coverage_changes: { counties: ["Franklin, OH"] },
        },
      },
    ]);

    renderPage();

    expect(await screen.findByText("Profile Update Requests")).toBeInTheDocument();
    expect(screen.getByText("ABC Valuation")).toBeInTheDocument();
    expect(screen.getByText(/Company Changes/)).toBeInTheDocument();
    expect(vendorApiState.listVendorProfileUpdateRequests).toHaveBeenCalledWith({ status: "pending" });

    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    expect(await screen.findByRole("heading", { name: /ABC Valuation update request/i })).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Proposed")).toBeInTheDocument();
    expect(screen.getAllByText(/614-555-0199/).length).toBeGreaterThan(0);
  });

  it("approves a pending Vendor Profile update request through the internal review RPC", async () => {
    permissionState.allowed = new Set(["vendors.update"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.listVendorProfileUpdateRequests
      .mockResolvedValueOnce([
        {
          request_key: "request-key-1",
          vendor_company_name: "ABC Valuation",
          status: "pending",
          submitted_at: "2026-06-05T12:00:00.000Z",
          current_snapshot: { company: { public_phone: "614-555-0100" } },
          proposed_changes: { company_changes: { public_phone: "614-555-0199" } },
        },
      ])
      .mockResolvedValueOnce([]);
    vendorApiState.reviewVendorProfileUpdateRequest.mockResolvedValue({
      ok: true,
      request: { request_key: "request-key-1", status: "approved" },
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    fireEvent.change(screen.getByPlaceholderText("Add safe decision context for the vendor."), {
      target: { value: "Approved for coverage update." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(vendorApiState.reviewVendorProfileUpdateRequest).toHaveBeenCalledWith("request-key-1", {
        decision: "approve",
        reviewer_note: "Approved for coverage update.",
      });
    });
    expect(await screen.findByText("Profile update request approved.")).toBeInTheDocument();
  });

  it("rejects a pending Vendor Profile update request without using a vendor workspace approval path", async () => {
    permissionState.allowed = new Set(["vendors.update"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.listVendorProfileUpdateRequests
      .mockResolvedValueOnce([
        {
          request_key: "request-key-2",
          vendor_company_name: "Sparse Vendor",
          status: "pending",
          submitted_at: "2026-06-05T12:00:00.000Z",
          current_snapshot: {},
          proposed_changes: { comments: "Please expand coverage." },
        },
      ])
      .mockResolvedValueOnce([]);
    vendorApiState.reviewVendorProfileUpdateRequest.mockResolvedValue({
      ok: true,
      request: { request_key: "request-key-2", status: "rejected" },
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    fireEvent.change(screen.getByPlaceholderText("Add safe decision context for the vendor."), {
      target: { value: "Coverage request needs more detail." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(vendorApiState.reviewVendorProfileUpdateRequest).toHaveBeenCalledWith("request-key-2", {
        decision: "reject",
        reviewer_note: "Coverage request needs more detail.",
      });
    });
    expect(await screen.findByText("Profile update request rejected.")).toBeInTheDocument();
  });

  it("shows submitted Vendor Invoices to users with billing review permission", async () => {
    permissionState.allowed = new Set(["vendors.read", "billing.update"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.listAmcVendorInvoices.mockResolvedValue([
      {
        invoice_key: "invoice-key-1",
        invoice_status: "invoice_received",
        invoice_status_label: "Invoice Received",
        invoice_number: "INV-1001",
        invoice_amount: 1250,
        currency: "USD",
        submitted_at: "2026-06-05T12:00:00.000Z",
        vendor_note: "Please process.",
        documents: [{ document_id: "document-id-1", file_name: "invoice.pdf" }],
        order: { order_number: "AMC-DEMO-003", property_address: "987 Assigned Way", report_type: "Commercial Appraisal" },
        vendor: { company_name: "ABC Valuation" },
      },
    ]);

    renderPage();

    expect(await screen.findByText("Vendor Invoice Review")).toBeInTheDocument();
    expect(screen.getByText("ABC Valuation")).toBeInTheDocument();
    expect(screen.getByText(/INV-1001/)).toBeInTheDocument();
    expect(screen.getByText(/\$1,250\.00/)).toBeInTheDocument();
    expect(screen.getByText(/987 Assigned Way/)).toBeInTheDocument();
    expect(vendorApiState.listAmcVendorInvoices).toHaveBeenCalledWith({ status: "invoice_received" });
  });

  it("opens invoice documents through the internal document access helper", async () => {
    permissionState.allowed = new Set(["vendors.read", "billing.update"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.listAmcVendorInvoices.mockResolvedValue([
      {
        invoice_key: "invoice-key-1",
        invoice_status: "invoice_received",
        invoice_status_label: "Invoice Received",
        invoice_number: "INV-1001",
        invoice_amount: 1250,
        currency: "USD",
        submitted_at: "2026-06-05T12:00:00.000Z",
        documents: [{ document_id: "document-id-1", file_name: "invoice.pdf" }],
        order: { order_number: "AMC-DEMO-003", property_address: "987 Assigned Way" },
        vendor: { company_name: "ABC Valuation" },
      },
    ]);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Open Invoice" }));

    await waitFor(() => {
      expect(orderDocumentApiState.createOrderDocumentDownloadUrl).toHaveBeenCalledWith("document-id-1");
    });
    expect(window.open).toHaveBeenCalledWith(
      "https://example.test/invoice-download",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("approves a submitted Vendor Invoice through the internal review RPC", async () => {
    permissionState.allowed = new Set(["vendors.read", "billing.update"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.listAmcVendorInvoices
      .mockResolvedValueOnce([
        {
          invoice_key: "invoice-key-1",
          invoice_status: "invoice_received",
          invoice_status_label: "Invoice Received",
          invoice_number: "INV-1001",
          invoice_amount: 1250,
          currency: "USD",
          submitted_at: "2026-06-05T12:00:00.000Z",
          documents: [{ document_id: "document-id-1", file_name: "invoice.pdf" }],
          order: { order_number: "AMC-DEMO-003", property_address: "987 Assigned Way" },
          vendor: { company_name: "ABC Valuation" },
        },
      ])
      .mockResolvedValueOnce([]);
    vendorApiState.reviewAmcVendorInvoice.mockResolvedValue({
      ok: true,
      invoice: { invoice_key: "invoice-key-1", invoice_status: "approved" },
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    fireEvent.change(screen.getByPlaceholderText("Private internal note. Not sent to the vendor."), {
      target: { value: "Matches agreed fee." },
    });
    fireEvent.change(screen.getByPlaceholderText("1250"), {
      target: { value: "1250" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Review" }));

    await waitFor(() => {
      expect(vendorApiState.reviewAmcVendorInvoice).toHaveBeenCalledWith("invoice-key-1", {
        decision: "approve",
        reviewer_note: "Matches agreed fee.",
        vendor_message: null,
        approved_amount: 1250,
      });
    });
    expect(await screen.findByText("Invoice approved.")).toBeInTheDocument();
  });

  it("requires a vendor-facing message before holding or rejecting an invoice", async () => {
    permissionState.allowed = new Set(["vendors.read", "billing.update"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.listAmcVendorInvoices.mockResolvedValue([
      {
        invoice_key: "invoice-key-1",
        invoice_status: "invoice_received",
        invoice_status_label: "Invoice Received",
        invoice_number: "INV-1001",
        invoice_amount: 1250,
        currency: "USD",
        submitted_at: "2026-06-05T12:00:00.000Z",
        documents: [],
        order: { order_number: "AMC-DEMO-003", property_address: "987 Assigned Way" },
        vendor: { company_name: "ABC Valuation" },
      },
    ]);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    fireEvent.change(screen.getByLabelText("Decision"), {
      target: { value: "hold" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Review" }));

    expect(await screen.findByText("Add a vendor-facing message for held or rejected invoices.")).toBeInTheDocument();
    expect(vendorApiState.reviewAmcVendorInvoice).not.toHaveBeenCalled();
  });

  it("schedules an approved vendor invoice from the internal payment ledger queue", async () => {
    permissionState.allowed = new Set(["vendors.read", "billing.update"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.listAmcVendorPaymentLedger
      .mockResolvedValueOnce([
        {
          invoice_key: "invoice-key-1",
          payment_key: null,
          payment_status: "approved",
          payment_status_label: "Approved",
          invoice: {
            invoice_number: "INV-1001",
            invoice_amount: 1250,
            currency: "USD",
            approved_amount: 1250,
          },
          order: { order_number: "AMC-DEMO-003", property_address: "987 Assigned Way" },
          vendor: { company_name: "ABC Valuation" },
        },
      ])
      .mockResolvedValueOnce([]);
    vendorApiState.scheduleAmcVendorPayment.mockResolvedValue({
      ok: true,
      payment_status: "scheduled",
      message: "Vendor payment scheduled.",
    });

    renderPage();

    expect(await screen.findByText("Vendor Payment Ledger")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Schedule Payment" }));
    fireEvent.change(screen.getByLabelText("Scheduled payment date"), {
      target: { value: "2026-06-15" },
    });
    fireEvent.change(screen.getByLabelText("Payment method label"), {
      target: { value: "ACH" },
    });
    fireEvent.change(screen.getByLabelText("Reference / check / ACH note"), {
      target: { value: "ACH batch 12" },
    });
    fireEvent.change(screen.getByPlaceholderText("Private finance note. Not sent to the vendor."), {
      target: { value: "Pay with Friday batch." },
    });
    fireEvent.change(screen.getByPlaceholderText("Safe payment note visible to the vendor."), {
      target: { value: "Payment is scheduled for June 15." },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Schedule Payment" })[1]);

    await waitFor(() => {
      expect(vendorApiState.scheduleAmcVendorPayment).toHaveBeenCalledWith("invoice-key-1", {
        scheduled_payment_date: "2026-06-15",
        payment_method_label: "ACH",
        reference_label: "ACH batch 12",
        internal_note: "Pay with Friday batch.",
        vendor_payment_note: "Payment is scheduled for June 15.",
      });
    });
    expect(await screen.findByText("Vendor payment scheduled.")).toBeInTheDocument();
  });

  it("marks a scheduled vendor payment paid from the internal payment ledger queue", async () => {
    permissionState.allowed = new Set(["vendors.read", "billing.update"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.listAmcVendorPaymentLedger
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          invoice_key: "invoice-key-1",
          payment_key: "payment-key-1",
          payment_status: "scheduled",
          payment_status_label: "Scheduled",
          scheduled_payment_date: "2026-06-15",
          payment_method_label: "ACH",
          reference_label: "ACH batch 12",
          invoice: {
            invoice_number: "INV-1001",
            invoice_amount: 1250,
            currency: "USD",
          },
          order: { order_number: "AMC-DEMO-003", property_address: "987 Assigned Way" },
          vendor: { company_name: "ABC Valuation" },
        },
      ])
      .mockResolvedValueOnce([]);
    vendorApiState.markAmcVendorPaymentPaid.mockResolvedValue({
      ok: true,
      payment_status: "paid",
      message: "Vendor payment marked paid.",
    });

    renderPage();

    expect(await screen.findByText("Vendor Payment Ledger")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Payment status"), {
      target: { value: "scheduled" },
    });
    expect(await screen.findByRole("button", { name: "Mark Paid" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark Paid" }));
    fireEvent.change(screen.getByLabelText("Paid date"), {
      target: { value: "2026-06-16" },
    });
    fireEvent.change(screen.getByLabelText("Reference / check / ACH note"), {
      target: { value: "ACH trace 1234" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Mark Paid" })[1]);

    await waitFor(() => {
      expect(vendorApiState.markAmcVendorPaymentPaid).toHaveBeenCalledWith("payment-key-1", {
        paid_date: "2026-06-16",
        payment_method_label: "ACH",
        reference_label: "ACH trace 1234",
        internal_note: null,
        vendor_payment_note: null,
      });
    });
    expect(await screen.findByText("Vendor payment marked paid.")).toBeInTheDocument();
  });

  it("renders an error state", async () => {
    vendorApiState.listVendorDirectory.mockRejectedValue(new Error("denied"));

    renderPage();

    expect(await screen.findByText("Vendor Directory could not load.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("calls listVendorDirectory with search and status controls", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(vendorApiState.listVendorDirectory).toHaveBeenLastCalledWith({
        status: null,
        query: null,
      });
    });

    fireEvent.change(screen.getByPlaceholderText("Search vendors"), {
      target: { value: "Bergen" },
    });

    await waitFor(() => {
      expect(vendorApiState.listVendorDirectory).toHaveBeenLastCalledWith({
        status: null,
        query: "Bergen",
      });
    });

    fireEvent.change(screen.getByLabelText("Vendor status"), {
      target: { value: "preferred" },
    });

    await waitFor(() => {
      expect(vendorApiState.listVendorDirectory).toHaveBeenLastCalledWith({
        status: "preferred",
        query: "Bergen",
      });
    });
  });

  it("shows Add Vendor only with vendors.create permission", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("No vendors found.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Vendor" })).toBeNull();

    cleanup();
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole("button", { name: "Add Vendor" })).toBeInTheDocument();
  });

  it("opens and closes the Add Vendor modal", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    expect(screen.getByRole("dialog", { name: "Add Vendor" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Add Vendor" })).toBeNull();
  });

  it("resets Add Vendor form values after closing", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    let dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "Draft Vendor" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Vendor" }));
    dialog = screen.getByRole("dialog", { name: "Add Vendor" });

    expect(within(dialog).getByLabelText("Vendor company name")).toHaveValue("");
    expect(within(dialog).getByLabelText("Vendor status")).toHaveValue("active");
  });

  it("requires a vendor company name before submitting", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    expect(await within(dialog).findByText("Vendor company name is required.")).toBeInTheDocument();
    expect(vendorApiState.createVendorProfile).not.toHaveBeenCalled();
  });

  it("submits Add Vendor through createVendorProfile and navigates to detail on success", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({
      vendor_profile_id: "profile-new",
      vendor_company_id: "company-new",
      relationship_id: "relationship-new",
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });

    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "New Vendor Co" },
    });
    fireEvent.change(within(dialog).getByLabelText("Website"), {
      target: { value: "https://vendor.example" },
    });
    fireEvent.change(within(dialog).getByLabelText("Public phone"), {
      target: { value: "614-555-0199" },
    });
    fireEvent.change(within(dialog).getByLabelText("Contact name"), {
      target: { value: "Dana Vendor" },
    });
    fireEvent.change(within(dialog).getByLabelText("Contact email"), {
      target: { value: "dana@example.test" },
    });
    expect(within(dialog).getByText(/Coverage is used for directory visibility/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText("Commercial"));
    expect(within(dialog).getByLabelText("Restricted Appraisal")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Short-Term Rental")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));
    fireEvent.change(within(dialog).getByLabelText("Tags"), {
      target: { value: "preferred, commercial, preferred" },
    });
    fireEvent.change(within(dialog).getByLabelText("Default coordination instructions"), {
      target: { value: "Send report questions to the coordinator." },
    });
    fireEvent.change(within(dialog).getByLabelText("Internal notes"), {
      target: { value: "Owner-approved onboarding." },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile).toHaveBeenCalledWith(expect.objectContaining({
        vendor_company: { name: "New Vendor Co" },
        create_relationship: true,
        vendor_status: "active",
        website: "https://vendor.example",
        public_phone: "614-555-0199",
        default_assignment_instructions: "Send report questions to the coordinator.",
        internal_notes: "Owner-approved onboarding.",
        tags: ["preferred", "commercial"],
        primary_contact: expect.objectContaining({
          name: "Dana Vendor",
          email: "dana@example.test",
        }),
        service_areas: [
          expect.objectContaining({
            state: "OH",
            county: null,
            zip: null,
            market: null,
            radius_miles: null,
            product_type: "commercial",
            status: "active",
          }),
        ],
      }));
    });

    expect(vendorApiState.createVendorProfile.mock.calls[0][0]).not.toHaveProperty("relationship_id");
    await waitFor(() => {
      expect(routeState.navigate).toHaveBeenCalledWith("/vendors/profile-new");
    });
    expect(screen.queryByRole("dialog", { name: "Add Vendor" })).toBeNull();
    expect(vendorApiState.listVendorDirectory).toHaveBeenCalledTimes(2);
  });

  it("prevents duplicate submits while Add Vendor is saving", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    let resolveCreate;
    vendorApiState.createVendorProfile.mockImplementation(() => new Promise((resolve) => {
      resolveCreate = resolve;
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "Slow Vendor" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));
    expect(await within(dialog).findByRole("button", { name: "Adding..." })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Adding..." }));

    expect(vendorApiState.createVendorProfile).toHaveBeenCalledTimes(1);

    resolveCreate({ vendor_profile_id: "profile-slow" });
    await waitFor(() => {
      expect(routeState.navigate).toHaveBeenCalledWith("/vendors/profile-slow");
    });
  });

  it("refreshes safely when create succeeds without a returned profile id", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({
      vendor_company_id: "company-new",
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "Refresh Only Vendor" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.listVendorDirectory).toHaveBeenCalledTimes(2);
    });
    expect(routeState.navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Add Vendor" })).toBeNull();
  });

  it("omits empty optional sections from the create payload", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({ vendor_profile_id: "profile-minimal" });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "  Minimal Vendor  " },
    });
    fireEvent.change(within(dialog).getByLabelText("Website"), {
      target: { value: "   " },
    });
    fireEvent.change(within(dialog).getByLabelText("Contact email"), {
      target: { value: "   " },
    });
    fireEvent.change(within(dialog).getByLabelText("Tags"), {
      target: { value: " ,  " },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile).toHaveBeenCalledWith({
        vendor_company: { name: "Minimal Vendor" },
        create_relationship: true,
        vendor_status: "active",
      });
    });
  });

  it("submits Add Vendor entire-state CoverageBuilder rows", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({ vendor_profile_id: "profile-coverage" });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "Statewide Vendor" },
    });
    fireEvent.click(within(dialog).getByLabelText("Commercial"));
    fireEvent.click(within(dialog).getByLabelText("Multifamily"));
    expect(within(dialog).getByText("OH · Statewide · 2 products")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile).toHaveBeenCalledWith(expect.objectContaining({
        service_areas: [
          expect.objectContaining({ state: "OH", county: null, product_type: "commercial", status: "active" }),
          expect.objectContaining({ state: "OH", county: null, product_type: "multifamily", status: "active" }),
        ],
      }));
    });
  });

  it("submits Add Vendor county CoverageBuilder row combinations", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({ vendor_profile_id: "profile-counties" });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "County Vendor" },
    });
    fireEvent.change(within(dialog).getByLabelText("Coverage mode"), {
      target: { value: "selected_counties" },
    });
    fireEvent.click(within(dialog).getByLabelText("Franklin"));
    fireEvent.click(within(dialog).getByLabelText("Delaware"));
    fireEvent.click(within(dialog).getByLabelText("Commercial"));
    fireEvent.click(within(dialog).getByLabelText("Land"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile.mock.calls[0][0].service_areas).toEqual([
        expect.objectContaining({ state: "OH", county: "Franklin", product_type: "commercial", status: "active" }),
        expect.objectContaining({ state: "OH", county: "Franklin", product_type: "land", status: "active" }),
        expect.objectContaining({ state: "OH", county: "Delaware", product_type: "commercial", status: "active" }),
        expect.objectContaining({ state: "OH", county: "Delaware", product_type: "land", status: "active" }),
      ]);
    });
  });

  it("submits Add Vendor ZIP CoverageBuilder row combinations", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({ vendor_profile_id: "profile-zips" });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "ZIP Vendor" },
    });
    fireEvent.change(within(dialog).getByLabelText("Coverage mode"), {
      target: { value: "selected_zips" },
    });
    fireEvent.change(within(dialog).getByLabelText("ZIP codes"), {
      target: { value: "43215, 43212" },
    });
    fireEvent.click(within(dialog).getByLabelText("Residential"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile.mock.calls[0][0].service_areas).toEqual([
        expect.objectContaining({ state: "OH", zip: "43215", product_type: "residential", status: "active" }),
        expect.objectContaining({ state: "OH", zip: "43212", product_type: "residential", status: "active" }),
      ]);
    });
  });

  it("submits Add Vendor market/radius CoverageBuilder rows", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({ vendor_profile_id: "profile-market" });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "Market Vendor" },
    });
    fireEvent.change(within(dialog).getByLabelText("Coverage mode"), {
      target: { value: "market_radius" },
    });
    fireEvent.change(within(dialog).getByLabelText("Market"), {
      target: { value: "Columbus" },
    });
    fireEvent.change(within(dialog).getByLabelText("Radius miles"), {
      target: { value: "25" },
    });
    fireEvent.click(within(dialog).getByLabelText("Commercial"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile.mock.calls[0][0].service_areas).toEqual([
        expect.objectContaining({
          state: "OH",
          market: "Columbus",
          radius_miles: 25,
          product_type: "commercial",
          status: "active",
        }),
      ]);
    });
  });

  it("shows duplicate create errors and preserves Add Vendor form input", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockRejectedValue(Object.assign(new Error("vendor_profile_duplicate"), {
      code: "23505",
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    const companyName = within(dialog).getByLabelText("Vendor company name");
    fireEvent.change(companyName, { target: { value: "Duplicate Vendor" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    expect(await within(dialog).findByText("This vendor is already in your Vendor Directory.")).toBeInTheDocument();
    expect(companyName).toHaveValue("Duplicate Vendor");
    expect(screen.getByRole("dialog", { name: "Add Vendor" })).toBeInTheDocument();
    expect(routeState.navigate).not.toHaveBeenCalled();
  });

  it("logs Add Vendor diagnostics in development without changing user-facing errors", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockRejectedValue(Object.assign(new Error("vendor_payload_invalid"), {
      code: "22023",
      details: "service area row 12 failed validation",
      hint: "Check coverage payload shape",
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "Diagnostics Vendor" },
    });
    fireEvent.change(within(dialog).getByLabelText("Coverage mode"), {
      target: { value: "selected_counties" },
    });
    fireEvent.click(within(dialog).getByLabelText("Franklin"));
    fireEvent.click(within(dialog).getByLabelText("Delaware"));
    fireEvent.click(within(dialog).getByLabelText("Commercial"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    expect(await within(dialog).findByText("Some vendor details are invalid. Review the form and try again.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Vendor company name")).toHaveValue("Diagnostics Vendor");
    expect(debugSpy).toHaveBeenCalledWith("Vendor create failed", expect.objectContaining({
      code: "22023",
      message: "vendor_payload_invalid",
      details: "service area row 12 failed validation",
      hint: "Check coverage payload shape",
      serviceAreaCount: 2,
      serviceAreaSample: [
        expect.objectContaining({ state: "OH", county: "Franklin", product_type: "commercial", status: "active" }),
        expect.objectContaining({ state: "OH", county: "Delaware", product_type: "commercial", status: "active" }),
      ],
      payloadKeys: expect.arrayContaining(["vendor_company", "create_relationship", "vendor_status", "service_areas"]),
    }));
    debugSpy.mockRestore();
  });

  it("shows a self-vendor message for relationship-invalid create errors", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockRejectedValue(new Error("vendor_relationship_invalid"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    const companyName = within(dialog).getByLabelText("Vendor company name");
    fireEvent.change(companyName, { target: { value: "Falcon Default" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    expect(await within(dialog).findByText("You cannot add your current company as its own vendor.")).toBeInTheDocument();
    expect(companyName).toHaveValue("Falcon Default");
    expect(routeState.navigate).not.toHaveBeenCalled();
  });

  it("shows vendor company and permission backend errors with friendly messages", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile
      .mockRejectedValueOnce(new Error("vendor_company_required"))
      .mockRejectedValueOnce(new Error("vendor_company_name_required"))
      .mockRejectedValueOnce(Object.assign(new Error("vendor_create_permission_required"), {
        code: "42501",
      }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    const companyName = within(dialog).getByLabelText("Vendor company name");
    fireEvent.change(companyName, { target: { value: "Backend Checked Vendor" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));
    expect(await within(dialog).findByText("Choose an existing vendor company or enter a new vendor company name.")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));
    expect(await within(dialog).findByText("Vendor company name is required.")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));
    expect(await within(dialog).findByText("You do not have permission to add vendors.")).toBeInTheDocument();
    expect(companyName).toHaveValue("Backend Checked Vendor");
  });

  it("shows generic action failure for unknown create errors", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockRejectedValue(new Error("unexpected backend failure"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    const companyName = within(dialog).getByLabelText("Vendor company name");
    fireEvent.change(companyName, { target: { value: "Unknown Error Vendor" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    expect(await within(dialog).findByText("Vendor action failed. Please review the details and try again.")).toBeInTheDocument();
    expect(companyName).toHaveValue("Unknown Error Vendor");
  });

  it("does not render mutation controls without create permission", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([vendorRow]);

    renderPage();

    expect(await screen.findByText("ABC Valuation")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Vendor" })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit|archive|assign|delete/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /amc/i })).toBeNull();
  });
});
