// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const updateSiteVisitAtViaRpcMock = vi.hoisted(() => vi.fn());
const archiveOrderViaRpcMock = vi.hoisted(() => vi.fn());
const cancelOrderViaRpcMock = vi.hoisted(() => vi.fn());
const overrideOrderStatusViaRpcMock = vi.hoisted(() => vi.fn());
const voidOrderViaRpcMock = vi.hoisted(() => vi.fn());
const listOrderDocumentsMock = vi.hoisted(() => vi.fn());
const createOrderDocumentDownloadUrlMock = vi.hoisted(() => vi.fn());
const archiveOrderDocumentMock = vi.hoisted(() => vi.fn());
const uploadOrderDocumentMock = vi.hoisted(() => vi.fn());
const listOwnerAssignmentsForOrderMock = vi.hoisted(() => vi.fn());
const createOrderOperationalInputMock = vi.hoisted(() => vi.fn());
const clearOrderOperationalInputMock = vi.hoisted(() => vi.fn());
const operationalInputsMock = vi.hoisted(() => []);
const refreshOperationalInputsMock = vi.hoisted(() => vi.fn());
const permissionKeysMock = vi.hoisted(() => []);
const bidRequestsPanelRowsMock = vi.hoisted(() => []);
const operationsModeMock = vi.hoisted(() => ({
  operationsMode: "internal_operations",
}));
const shellProfileMock = vi.hoisted(() => ({
  profileId: "operations",
  appContext: {},
  loading: false,
  error: null,
}));
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const orderMock = vi.hoisted(() => ({
  id: "order-1",
  order_number: "2026001",
  status: "new",
  is_archived: false,
  client_name: "Acme Lending",
  amc_name: "Northstar AMC",
  appraiser_name: "Avery Appraiser",
  reviewer_name: "Riley Reviewer",
  address_line1: "100 Main St",
  city: "Boston",
  state: "MA",
  postal_code: "02110",
  property_contact_name: "Casey Contact",
  property_contact_phone: "(555) 123-4567",
  created_at: "2026-05-20T12:00:00.000Z",
  updated_at: "2026-05-20T12:00:00.000Z",
  site_visit_at: null,
  review_due_at: "2026-05-22T12:00:00.000Z",
  final_due_at: "2026-05-29T12:00:00.000Z",
  due_date: null,
  split_pct: 42.5,
  base_fee: 1200,
  appraiser_fee: 510,
}));
const DOCUMENT_POSITION_FOLLOWING = 4;

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
  useParams: () => ({ id: "order-1" }),
}));

vi.mock("@/lib/hooks/useOrder", () => ({
  default: () => ({
    order: { ...orderMock },
    loading: false,
    error: null,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/services/ordersService", () => ({
  archiveOrderViaRpc: archiveOrderViaRpcMock,
  cancelOrderViaRpc: cancelOrderViaRpcMock,
  overrideOrderStatusViaRpc: overrideOrderStatusViaRpcMock,
  updateSiteVisitAtViaRpc: updateSiteVisitAtViaRpcMock,
  voidOrderViaRpc: voidOrderViaRpcMock,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    loading: false,
    error: null,
    permissionKeys: permissionKeysMock,
    hasPermission: (permission) => permissionKeysMock.includes(permission),
    hasAnyPermission: (permissions) =>
      permissions.some((permission) => permissionKeysMock.includes(permission)),
    hasAllPermissions: (permissions) =>
      permissions.every((permission) => permissionKeysMock.includes(permission)),
  }),
}));

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () => shellProfileMock,
}));

vi.mock("@/lib/operations/OperationsModeProvider", () => ({
  useOperationsMode: () => operationsModeMock,
}));

vi.mock("@/features/order-documents/api", () => ({
  listOrderDocuments: listOrderDocumentsMock,
  createOrderDocumentDownloadUrl: createOrderDocumentDownloadUrlMock,
  archiveOrderDocument: archiveOrderDocumentMock,
  uploadOrderDocument: uploadOrderDocumentMock,
}));

vi.mock("@/features/assignments/api", () => ({
  listOwnerAssignmentsForOrder: listOwnerAssignmentsForOrderMock,
}));

vi.mock("@/features/orders/operational-inputs/useOrderOperationalInputs", () => ({
  default: () => ({
    inputs: operationalInputsMock,
    loading: false,
    error: null,
    refresh: refreshOperationalInputsMock,
  }),
}));

vi.mock("@/features/orders/operational-inputs/orderOperationalInputsApi", () => ({
  createOrderOperationalInput: createOrderOperationalInputMock,
  clearOrderOperationalInput: clearOrderOperationalInputMock,
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

vi.mock("@/components/dates/SiteVisitPicker", () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange("2026-05-20T14:00:00")}>
      Set site visit
    </button>
  ),
}));

vi.mock("@/components/maps/GoogleMapEmbed", () => ({
  default: () => <div data-testid="map" />,
}));

vi.mock("@/components/orders/table/OrderStatusBadge", () => ({
  default: ({ status }) => <span>{status}</span>,
}));

vi.mock("@/components/activity/ActivityLog", () => ({
  default: ({ height }) => <div data-testid="activity-log" data-height={height} />,
}));

vi.mock("@/features/assignments/components/OfferAssignmentModal", () => ({
  default: () => null,
}));

vi.mock("@/features/assignments/components/OwnerOrderAssignmentsPanel", () => ({
  default: ({ assignmentRows = [], assignmentsLoading, onRefreshAssignments }) => (
    <div
      data-testid="assignments-panel"
      data-row-count={String(assignmentRows.length)}
      data-loading={String(Boolean(assignmentsLoading))}
    >
      <button type="button" onClick={onRefreshAssignments}>Refresh assignments</button>
    </div>
  ),
}));

vi.mock("@/features/bids/components/BidRequestsPanel", () => ({
  default: function MockBidRequestsPanel({
    orderId,
    enabled,
    hasActiveVendorAssignment,
    canRecordResponses,
    canSelectResponses,
    refreshToken,
    onBidRequestsChange,
  }) {
    useEffect(() => {
      if (enabled) {
        onBidRequestsChange?.(bidRequestsPanelRowsMock);
      }
    }, [enabled, onBidRequestsChange, refreshToken]);

    return (
      <section
        aria-label="Bid requests"
        data-enabled={String(enabled)}
        data-order-id={orderId}
        data-has-active-vendor-assignment={String(Boolean(hasActiveVendorAssignment))}
        data-can-record-responses={String(Boolean(canRecordResponses))}
        data-can-select-responses={String(Boolean(canSelectResponses))}
        data-refresh-token={String(refreshToken)}
      >
        <div>Bid requests</div>
      </section>
    );
  },
}));

vi.mock("@/features/vendors/components/VendorAssignmentCandidatesPanel", () => ({
  default: ({
    orderId,
    enabled,
    activeVendorAssignment,
    canOfferAssignment,
    orderDueAt,
    onOfferSuccess,
    onBidRequestSuccess,
  }) => (
    <section
      aria-label="Vendor candidates"
      data-enabled={String(enabled)}
      data-order-id={orderId}
      data-active-assignment-id={activeVendorAssignment?.id || ""}
      data-can-offer={String(Boolean(canOfferAssignment))}
      data-order-due-at={orderDueAt || ""}
    >
      <div>Suggested vendors</div>
      {activeVendorAssignment && (
        <div>
          <div>Vendor assignment already active</div>
          <div>This order already has an active vendor offer or assignment, so new bid requests and direct awards are disabled.</div>
        </div>
      )}
      {canOfferAssignment && (
        <button type="button" onClick={() => onOfferSuccess?.("assignment-new")}>
          Mock candidate offer success
        </button>
      )}
      {!activeVendorAssignment && (
        <button type="button" onClick={() => onBidRequestSuccess?.({ bid_request_id: "bid-request-new" })}>
          Mock bid request success
        </button>
      )}
    </section>
  ),
}));

const { default: OrderDetail } = await import("../OrderDetail.jsx");

describe("OrderDetail site visit save", () => {
  beforeEach(() => {
    Object.assign(orderMock, {
      id: "order-1",
      order_number: "2026001",
      status: "new",
      operations_scope: "internal_operations",
      is_archived: false,
      client_name: "Acme Lending",
      amc_name: "Northstar AMC",
      appraiser_name: "Avery Appraiser",
      reviewer_name: "Riley Reviewer",
      address_line1: "100 Main St",
      city: "Boston",
      state: "MA",
      postal_code: "02110",
      property_contact_name: "Casey Contact",
      property_contact_phone: "(555) 123-4567",
      created_at: "2026-05-20T12:00:00.000Z",
      updated_at: "2026-05-20T12:00:00.000Z",
      site_visit_at: null,
      review_due_at: "2026-05-22T12:00:00.000Z",
      last_review_activity_at: null,
      final_due_at: "2026-05-29T12:00:00.000Z",
      due_date: null,
      split_pct: 42.5,
      base_fee: 1200,
      appraiser_fee: 510,
      access_notes: "Unsupported V1 access text",
      notes: "Inspection access confirmed. Bring gate code and call contact on arrival.",
    });
    refreshMock.mockReset();
    navigateMock.mockReset();
    updateSiteVisitAtViaRpcMock.mockReset();
    updateSiteVisitAtViaRpcMock.mockResolvedValue({
      id: "order-1",
      site_visit_at: "2026-05-20T14:00:00",
    });
    archiveOrderViaRpcMock.mockReset();
    archiveOrderViaRpcMock.mockResolvedValue({
      id: "order-1",
      order_number: "2026001",
      status: "new",
      is_archived: true,
    });
    cancelOrderViaRpcMock.mockReset();
    cancelOrderViaRpcMock.mockResolvedValue({
      id: "order-1",
      order_number: "2026001",
      status: "cancelled",
      is_archived: false,
    });
    voidOrderViaRpcMock.mockReset();
    voidOrderViaRpcMock.mockResolvedValue({
      id: "order-1",
      order_number: "2026001",
      status: "voided",
      is_archived: false,
    });
    overrideOrderStatusViaRpcMock.mockReset();
    overrideOrderStatusViaRpcMock.mockResolvedValue({
      status: "updated",
      order_id: "order-1",
      from_status: "new",
      to_status: "in_review",
      reason: "Correcting field reality",
    });
    permissionKeysMock.splice(
      0,
      permissionKeysMock.length,
      "documents.delete",
      "documents.upload.all",
    );
    bidRequestsPanelRowsMock.splice(0, bidRequestsPanelRowsMock.length);
    operationsModeMock.operationsMode = "internal_operations";
    Object.assign(shellProfileMock, {
      profileId: "operations",
      appContext: {},
      loading: false,
      error: null,
    });
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    listOwnerAssignmentsForOrderMock.mockReset();
    listOwnerAssignmentsForOrderMock.mockResolvedValue([]);
    listOrderDocumentsMock.mockReset();
    listOrderDocumentsMock.mockResolvedValue([
      {
        id: "doc-1",
        order_id: "order-1",
        category: "engagement",
        title: "Engagement Letter",
        file_name: "engagement.pdf",
        file_size: 2048,
        status: "active",
        visibility_scope: "internal",
        created_at: "2026-05-20T12:00:00.000Z",
      },
      {
        id: "doc-2",
        order_id: "order-1",
        category: "source_documents",
        title: null,
        file_name: "rent-roll.xlsx",
        file_size: null,
        status: "archived",
        visibility_scope: "internal",
        created_at: "2026-05-19T12:00:00.000Z",
      },
    ]);
    createOrderDocumentDownloadUrlMock.mockReset();
    createOrderDocumentDownloadUrlMock.mockResolvedValue({
      signed_url: "https://example.test/signed-download",
    });
    archiveOrderDocumentMock.mockReset();
    archiveOrderDocumentMock.mockResolvedValue({ id: "doc-1", status: "archived" });
    uploadOrderDocumentMock.mockReset();
    uploadOrderDocumentMock.mockResolvedValue({ id: "doc-3", status: "active" });
    createOrderOperationalInputMock.mockReset();
    createOrderOperationalInputMock.mockResolvedValue({ id: "input-new" });
    clearOrderOperationalInputMock.mockReset();
    clearOrderOperationalInputMock.mockResolvedValue({ id: "input-1", cleared_at: "2026-05-24T12:00:00.000Z" });
    operationalInputsMock.splice(0, operationalInputsMock.length);
    refreshOperationalInputsMock.mockReset();
    refreshOperationalInputsMock.mockResolvedValue([]);
    Object.defineProperty(window, "print", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(window, "open").mockImplementation(() => null);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("renders Internal order detail chrome for Continental production records", async () => {
    operationsModeMock.operationsMode = "internal_operations";
    orderMock.operations_scope = "internal_operations";

    render(<OrderDetail />);

    expect(screen.getByText("Internal")).toBeInTheDocument();
    expect(screen.getByText("Internal Order Detail")).toBeInTheDocument();
    expect(screen.getByText("Continental Internal Order 2026001")).toBeInTheDocument();
    expect(
      screen.getByText("Internal appraisal production record scoped to Continental workflow, review, and client delivery."),
    ).toBeInTheDocument();
  });

  it("renders AMC order detail chrome for Falcon AMC procurement records", async () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";

    render(<OrderDetail />);

    expect(screen.getByTestId("workspace-identity-badge")).toHaveTextContent("AMC");
    expect(screen.getByText("AMC Order Detail")).toBeInTheDocument();
    expect(screen.getByText("Falcon AMC Order 2026001")).toBeInTheDocument();
    expect(
      screen.getByText("Falcon AMC procurement record scoped to vendor assignment, client services, and payment oversight."),
    ).toBeInTheDocument();
  });

  it("saves the site visit through the RPC-backed wrapper and refreshes", async () => {
    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "Set site visit" }));

    await waitFor(() => {
      expect(updateSiteVisitAtViaRpcMock).toHaveBeenCalledWith(
        "order-1",
        "2026-05-20T14:00:00",
      );
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("redirects an AMC order away from Internal Operations on refresh before rendering stale order content", async () => {
    orderMock.operations_scope = "amc_operations";
    operationsModeMock.operationsMode = "internal_operations";

    render(<OrderDetail />);

    expect(screen.getByText("Switching workspace...")).toBeInTheDocument();
    expect(screen.queryByText("Order 2026001")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/dashboard", {
        replace: true,
        state: {
          workspaceRedirect: {
            from: "order_detail",
            selectedOperationsMode: "internal_operations",
            expectedOrderScope: "internal_operations",
            actualOrderScope: "amc_operations",
          },
        },
      });
    });
  });

  it("redirects an Internal order away from AMC Operations before rendering cross-workspace detail", async () => {
    orderMock.operations_scope = "internal_operations";
    operationsModeMock.operationsMode = "amc_operations";

    render(<OrderDetail />);

    expect(screen.getByText("Switching workspace...")).toBeInTheDocument();
    expect(screen.queryByText("Order 2026001")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/dashboard", {
        replace: true,
        state: {
          workspaceRedirect: {
            from: "order_detail",
            selectedOperationsMode: "amc_operations",
            expectedOrderScope: "amc_operations",
            actualOrderScope: "internal_operations",
          },
        },
      });
    });
  });

  it("surfaces the full operational overview from the loaded order", () => {
    render(<OrderDetail />);

    const overview = screen.getByLabelText("Operational Overview");

    expect(within(overview).getByText("Order / Client")).toBeInTheDocument();
    expect(within(overview).getByText("Client")).toBeInTheDocument();
    expect(within(overview).getByText("Acme Lending")).toBeInTheDocument();
    expect(within(overview).getByText("AMC")).toBeInTheDocument();
    expect(within(overview).getByText("Northstar AMC")).toBeInTheDocument();
    expect(within(overview).getByText("Property / Assignment")).toBeInTheDocument();
    expect(within(overview).getByText("Property Address")).toBeInTheDocument();
    expect(within(overview).getByText("100 Main St, Boston, MA 02110")).toBeInTheDocument();
    expect(within(overview).getByText("Property Type")).toBeInTheDocument();
    expect(within(overview).getByText("Report Type")).toBeInTheDocument();
    expect(within(overview).getByText("Schedule")).toBeInTheDocument();
    expect(within(overview).getByText("Site Visit")).toBeInTheDocument();
    expect(within(overview).getByText("Review Due")).toBeInTheDocument();
    expect(within(overview).getByText("Final Due")).toBeInTheDocument();
    expect(within(overview).getByText("Updated")).toBeInTheDocument();
    expect(within(overview).getByText("Team / Fees")).toBeInTheDocument();
    expect(within(overview).getByText("Appraiser")).toBeInTheDocument();
    expect(within(overview).getByText("Avery Appraiser")).toBeInTheDocument();
    expect(within(overview).getByText("Reviewer")).toBeInTheDocument();
    expect(within(overview).getByText("Riley Reviewer")).toBeInTheDocument();
    expect(within(overview).getByText("Property Contact")).toBeInTheDocument();
    expect(within(overview).getByText("Contact")).toBeInTheDocument();
    expect(within(overview).getByText("Casey Contact")).toBeInTheDocument();
    expect(within(overview).getByText("Contact Phone")).toBeInTheDocument();
    expect(within(overview).getByText("555-123-4567")).toBeInTheDocument();
    expect(within(overview).getByText("Split %")).toBeInTheDocument();
    expect(within(overview).getByText("42.5")).toBeInTheDocument();
    expect(within(overview).getByText("Base Fee")).toBeInTheDocument();
    expect(within(overview).getByText("$1,200.00")).toBeInTheDocument();
    expect(within(overview).getByText("Appraiser Fee")).toBeInTheDocument();
    expect(within(overview).getByText("$510.00")).toBeInTheDocument();
    expect(within(overview).queryByText("Property Contact / Access")).not.toBeInTheDocument();
    expect(within(overview).queryByText("Client Contact")).not.toBeInTheDocument();
    expect(within(overview).queryByText("Client Contact Phone")).not.toBeInTheDocument();
    expect(within(overview).queryByText("Client Contact Email")).not.toBeInTheDocument();
    expect(within(overview).queryByText("Property Contact Email")).not.toBeInTheDocument();

    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.queryByText("Unsupported V1 access text")).not.toBeInTheDocument();
    expect(screen.queryByText("Activity / Communication History")).not.toBeInTheDocument();
    const attention = screen.getByLabelText("Order attention summary");
    expect(attention).toBeInTheDocument();
    expect(screen.getByText("Attention Summary")).toBeInTheDocument();
    expect(attention.compareDocumentPosition(overview)).toBe(DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders midnight UTC review and final due timestamps as date-only values", () => {
    orderMock.review_due_at = "2026-06-01T00:00:00+00";
    orderMock.final_due_at = "2026-06-03T00:00:00+00";

    render(<OrderDetail />);

    const overview = screen.getByLabelText("Operational Overview");
    expect(within(overview).getByText("6/1/2026")).toBeInTheDocument();
    expect(within(overview).getByText("6/3/2026")).toBeInTheDocument();
    expect(within(overview).queryByText("5/31/2026")).not.toBeInTheDocument();
    expect(within(overview).queryByText("6/2/2026")).not.toBeInTheDocument();
  });

  it("adds document context to the read-only attention summary after files load", async () => {
    render(<OrderDetail />);

    const attention = screen.getByLabelText("Order attention summary");

    await waitFor(() => {
      expect(within(attention).getByText("Files present")).toBeInTheDocument();
    });
    expect(within(attention).getByText("1 supporting file loaded.")).toBeInTheDocument();
    expect(within(attention).queryByRole("button")).not.toBeInTheDocument();

    const readiness = screen.getByLabelText("File readiness summary");
    expect(within(readiness).getByText("Limited files")).toBeInTheDocument();
    expect(within(readiness).getByText("Limited supporting files uploaded so far.")).toBeInTheDocument();
    expect(within(readiness).queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders read-only review context when order status supports it", () => {
    orderMock.status = "in_review";
    orderMock.last_review_activity_at = "2026-05-23T12:00:00.000Z";

    render(<OrderDetail />);

    const reviewContext = screen.getByLabelText("Review context summary");
    expect(within(reviewContext).getByText("Review / Revision Context")).toBeInTheDocument();
    expect(within(reviewContext).getByText("Derived")).toBeInTheDocument();
    expect(within(reviewContext).queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders active operational input evidence with Order Detail-only mutation controls", async () => {
    operationalInputsMock.push({
      id: "input-1",
      input_type: "inspection_scheduled",
      actor_role: "Appraiser",
      note: "Inspection window confirmed with the property contact.",
      created_at: "2026-05-24T13:00:00.000Z",
      expires_at: "2026-05-31T13:00:00.000Z",
    });

    render(<OrderDetail />);

    const evidence = screen.getByLabelText("Operational status evidence");
    const overview = screen.getByLabelText("Operational Overview");
    expect(within(evidence).getByText("Operational Context")).toBeInTheDocument();
    expect(evidence.compareDocumentPosition(overview)).toBe(DOCUMENT_POSITION_FOLLOWING);
    expect(within(evidence).getByText("Inspection scheduled")).toBeInTheDocument();
    expect(within(evidence).getByText("Evidence")).toBeInTheDocument();
    expect(within(evidence).getByText("Appraiser")).toBeInTheDocument();
    expect(
      within(evidence).getByText("Inspection window confirmed with the property contact."),
    ).toBeInTheDocument();
    expect(within(evidence).queryByRole("button")).not.toBeInTheDocument();
    expect(within(evidence).queryByRole("textbox")).not.toBeInTheDocument();

    const controls = screen.getByLabelText("Operational context controls");
    expect(
      within(controls).getByText("Adds temporary context. This does not change lifecycle status."),
    ).toBeInTheDocument();
    fireEvent.click(within(controls).getByRole("button", { name: "Update context" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark report on track" }));

    await waitFor(() => {
      expect(createOrderOperationalInputMock).toHaveBeenCalledWith("order-1", "report_on_track");
    });
    expect(refreshOperationalInputsMock).toHaveBeenCalledTimes(1);
    expect(clearOrderOperationalInputMock).not.toHaveBeenCalled();
  });

  it("hides management and AMC assignment surfaces in the appraiser execution workspace", async () => {
    Object.assign(shellProfileMock, {
      profileId: "my_work",
      loading: false,
      error: null,
    });
    permissionKeysMock.splice(
      0,
      permissionKeysMock.length,
      "documents.delete",
      "documents.upload.all",
      "orders.archive",
      "orders.cancel",
      "orders.void",
      "order_company_assignments.offer",
      "order_company_assignments.read_owner",
      "relationships.assign_work",
      "relationships.read",
    );
    operationalInputsMock.push({
      id: "input-1",
      input_type: "inspection_scheduled",
      actor_role: "Appraiser",
      created_at: "2026-05-24T13:00:00.000Z",
      expires_at: "2026-05-31T13:00:00.000Z",
    });

    render(<OrderDetail />);

    expect(screen.getByRole("button", { name: "Print Packet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set site visit" })).toBeInTheDocument();
    expect(screen.getByText("Contacts / Map")).toBeInTheDocument();
    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.getByTestId("activity-log")).toBeInTheDocument();
    expect(screen.getByTestId("activity-log")).toHaveAttribute("data-height", "360");
    expect(await screen.findByLabelText("Order files")).toBeInTheDocument();
    expect(screen.getByLabelText("Order notes")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Offer Assignment" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("assignments-panel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Operational context controls")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Operational status evidence")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Order attention summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Attention Summary")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void order" })).not.toBeInTheDocument();
  });

  it("removes derived operational context from the reviewer review workspace", async () => {
    Object.assign(shellProfileMock, {
      profileId: "review_queue",
      loading: false,
      error: null,
    });
    orderMock.status = "in_review";
    orderMock.last_review_activity_at = "2026-05-23T12:00:00.000Z";
    operationalInputsMock.push({
      id: "input-1",
      input_type: "inspection_scheduled",
      actor_role: "Appraiser",
      created_at: "2026-05-24T13:00:00.000Z",
      expires_at: "2026-05-31T13:00:00.000Z",
    });

    render(<OrderDetail />);

    expect(screen.getByLabelText("Order Summary")).toBeInTheDocument();
    expect(screen.queryByLabelText("Operational Overview")).not.toBeInTheDocument();
    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("Review Due")).toBeInTheDocument();
    expect(screen.getByText("Contacts / Map")).toBeInTheDocument();
    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.getByTestId("activity-log")).toBeInTheDocument();
    expect(screen.getByTestId("activity-log")).toHaveAttribute("data-height", "360");
    expect(screen.getByRole("button", { name: "Print Packet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "<- Back" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Order files")).toBeInTheDocument();
    expect(screen.getByLabelText("Order notes")).toBeInTheDocument();

    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("assignments-panel")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Offer Assignment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void order" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Order attention summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Attention Summary")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Operational context controls")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Operational status evidence")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Review context summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Review / Revision Context")).not.toBeInTheDocument();
    expect(screen.queryByText("Derived")).not.toBeInTheDocument();
    expect(screen.queryByText("Review appears active.")).not.toBeInTheDocument();
    expect(screen.queryByText("Appointment scheduled")).not.toBeInTheDocument();
    expect(screen.queryByText("Recently updated")).not.toBeInTheDocument();
    expect(screen.queryByText("No files loaded")).not.toBeInTheDocument();
  });

  it("preserves owner/admin management surfaces while suppressing V1 assignment surfaces", () => {
    permissionKeysMock.push(
      "orders.archive",
      "order_company_assignments.offer",
      "order_company_assignments.read_owner",
      "relationships.assign_work",
      "relationships.read",
    );

    render(<OrderDetail />);

    expect(screen.queryByRole("button", { name: "Offer Assignment" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("assignments-panel")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Operational context controls")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive order" })).toBeInTheDocument();
  });

  it("hides the status override action without workflow override permission", () => {
    render(<OrderDetail />);

    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Override status" })).not.toBeInTheDocument();
  });

  it("hides the status override action in appraiser and reviewer workspaces even with permission", () => {
    permissionKeysMock.push("workflow.override_status");
    Object.assign(shellProfileMock, {
      profileId: "my_work",
      loading: false,
      error: null,
    });

    render(<OrderDetail />);

    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
    cleanup();

    Object.assign(shellProfileMock, {
      profileId: "review_queue",
      loading: false,
      error: null,
    });
    render(<OrderDetail />);

    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
  });

  it("shows the owner/admin status override modal with current status, workspace, and audit warning", () => {
    permissionKeysMock.push("workflow.override_status");

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Override status" }));

    const dialog = screen.getByRole("dialog", { name: "Override status" });
    expect(within(dialog).getByText(/owner\/admin override changes the order workflow status/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/will be recorded in activity/i)).toBeInTheDocument();
    expect(within(dialog).getByText("Workspace:")).toBeInTheDocument();
    expect(within(dialog).getByText("Internal")).toBeInTheDocument();
    expect(within(dialog).getByText("Current status:")).toBeInTheDocument();
    expect(within(dialog).getByText("new")).toBeInTheDocument();
  });

  it("shows Falcon AMC workspace context in the status override modal", () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.push("workflow.override_status");

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Override status" }));

    const dialog = screen.getByRole("dialog", { name: "Override status" });
    expect(within(dialog).getByText("Falcon AMC")).toBeInTheDocument();
  });

  it("keeps status override submit disabled until target differs and reason is present", () => {
    permissionKeysMock.push("workflow.override_status");

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Override status" }));

    const dialog = screen.getByRole("dialog", { name: "Override status" });
    const submit = within(dialog).getByRole("button", { name: "Override status" });
    expect(submit).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Target status"), {
      target: { value: "in_review" },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Override reason"), {
      target: { value: "   " },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Override reason"), {
      target: { value: "Correcting field reality" },
    });
    expect(submit).not.toBeDisabled();
  });

  it("keeps status override submit disabled when target matches current status", () => {
    permissionKeysMock.push("workflow.override_status");

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Override status" }));

    const dialog = screen.getByRole("dialog", { name: "Override status" });
    fireEvent.change(within(dialog).getByLabelText("Target status"), {
      target: { value: "new" },
    });
    fireEvent.change(within(dialog).getByLabelText("Override reason"), {
      target: { value: "Correcting field reality" },
    });

    expect(within(dialog).getByRole("button", { name: "Override status" })).toBeDisabled();
    expect(overrideOrderStatusViaRpcMock).not.toHaveBeenCalled();
  });

  it("calls the status override RPC wrapper, refreshes, and closes the modal on success", async () => {
    permissionKeysMock.push("workflow.override_status");

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Override status" }));
    const dialog = screen.getByRole("dialog", { name: "Override status" });
    fireEvent.change(within(dialog).getByLabelText("Target status"), {
      target: { value: "in_review" },
    });
    fireEvent.change(within(dialog).getByLabelText("Override reason"), {
      target: { value: "Correcting field reality" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Override status" }));

    await waitFor(() => {
      expect(overrideOrderStatusViaRpcMock).toHaveBeenCalledWith(
        "order-1",
        "in_review",
        "Correcting field reality",
      );
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Order status overridden. The override reason was recorded in activity.",
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Override status" })).not.toBeInTheDocument();
    });
  });

  it("keeps the status override modal open and displays errors", async () => {
    const error = new Error("status_override_noop");
    overrideOrderStatusViaRpcMock.mockRejectedValue(error);
    permissionKeysMock.push("workflow.override_status");

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Override status" }));
    const dialog = screen.getByRole("dialog", { name: "Override status" });
    fireEvent.change(within(dialog).getByLabelText("Target status"), {
      target: { value: "in_review" },
    });
    fireEvent.change(within(dialog).getByLabelText("Override reason"), {
      target: { value: "Correcting field reality" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Override status" }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("status_override_noop");
    });
    expect(screen.getByRole("dialog", { name: "Override status" })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog", { name: "Override status" })).getByText("status_override_noop")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("hides status override for archived, cancelled, and voided orders", () => {
    permissionKeysMock.push("workflow.override_status");
    orderMock.is_archived = true;

    render(<OrderDetail />);
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
    cleanup();

    orderMock.is_archived = false;
    orderMock.status = "cancelled";
    render(<OrderDetail />);
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
    cleanup();

    orderMock.status = "voided";
    render(<OrderDetail />);
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
  });

  it("shows read-only vendor candidates in AMC Operations with vendor read access", () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.push("vendors.read");

    render(<OrderDetail />);

    const candidates = screen.getByLabelText("Vendor candidates");
    expect(candidates).toHaveAttribute("data-order-id", "order-1");
    expect(candidates).toHaveAttribute("data-enabled", "true");
    expect(within(candidates).getByText("Suggested vendors")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /assign/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mock bid request success" })).toBeInTheDocument();
  });

  it("shows read-only bid requests in AMC Operations with bid read access", () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.push("bid_requests.read");

    render(<OrderDetail />);

    const bidRequests = screen.getByLabelText("Bid requests");
    expect(bidRequests).toHaveAttribute("data-order-id", "order-1");
    expect(bidRequests).toHaveAttribute("data-enabled", "true");
    expect(bidRequests).toHaveAttribute("data-has-active-vendor-assignment", "false");
    expect(bidRequests).toHaveAttribute("data-can-record-responses", "false");
    expect(bidRequests).toHaveAttribute("data-can-select-responses", "false");
    expect(within(bidRequests).getByText("Bid requests")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /request bids/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record response/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /select/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /offer assignment/i })).not.toBeInTheDocument();

    const bidStatus = screen.getByLabelText("AMC bid status");
    expect(within(bidStatus).getByText("Not sent for bid")).toBeInTheDocument();
    expect(within(bidStatus).getByText("0 contacted / 0 responded")).toBeInTheDocument();
    expect(within(bidStatus).queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the AMC bid status summary from loaded bid request rows", async () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.push("bid_requests.read");
    bidRequestsPanelRowsMock.push({
      bid_request_id: "bid-request-1",
      status: "partially_responded",
      response_due_at: "2026-06-03T20:00:00.000Z",
      client_due_at: "2026-06-10T20:00:00.000Z",
      created_at: "2026-06-02T15:00:00.000Z",
      recipients: [
        {
          recipient_id: "recipient-1",
          vendor_company_name: "Franklin Commercial Valuation",
          status: "responded",
          response: {
            response_id: "response-1",
            fee_amount: 1450,
            proposed_due_at: "2026-06-08T20:00:00.000Z",
            turn_time_days: 5,
            submitted_at: "2026-06-02T16:00:00.000Z",
          },
        },
        {
          recipient_id: "recipient-2",
          vendor_company_name: "Metro Valuation Group",
          status: "responded",
          response: {
            response_id: "response-2",
            fee_amount: 1250,
            proposed_due_at: "2026-06-07T20:00:00.000Z",
            turn_time_days: 4,
            submitted_at: "2026-06-02T17:00:00.000Z",
          },
        },
      ],
    });

    render(<OrderDetail />);

    const bidStatus = screen.getByLabelText("AMC bid status");
    expect(await within(bidStatus).findByText("Bids received")).toBeInTheDocument();
    expect(within(bidStatus).getByText("2 contacted / 2 responded")).toBeInTheDocument();
    expect(within(bidStatus).getByText("$1,250.00")).toBeInTheDocument();
    expect(within(bidStatus).getByText("4 days")).toBeInTheDocument();
    expect(within(bidStatus).queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders selected bid details in the AMC bid status summary", async () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.push("bid_requests.read");
    bidRequestsPanelRowsMock.push({
      bid_request_id: "bid-request-1",
      status: "closed",
      recipients: [
        {
          recipient_id: "recipient-1",
          vendor_company_name: "Franklin Commercial Valuation",
          status: "selected",
          response: {
            response_id: "response-1",
            fee_amount: 1450,
            proposed_due_at: "2026-06-08T20:00:00.000Z",
            turn_time_days: 5,
            selected_at: "2026-06-02T18:00:00.000Z",
          },
        },
      ],
    });

    render(<OrderDetail />);

    const bidStatus = screen.getByLabelText("AMC bid status");
    expect(await within(bidStatus).findByText("Bid selected")).toBeInTheDocument();
    expect(within(bidStatus).getByText("Franklin Commercial Valuation")).toBeInTheDocument();
  });

  it("hides the AMC bid status summary outside bid-readable AMC order context", () => {
    render(<OrderDetail />);
    expect(screen.queryByLabelText("AMC bid status")).not.toBeInTheDocument();

    cleanup();
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "internal_operations";
    permissionKeysMock.push("bid_requests.read");
    render(<OrderDetail />);
    expect(screen.queryByLabelText("AMC bid status")).not.toBeInTheDocument();

    cleanup();
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.splice(0, permissionKeysMock.length);
    render(<OrderDetail />);
    expect(screen.queryByLabelText("AMC bid status")).not.toBeInTheDocument();
  });

  it("passes bid response recording authority to bid requests when update access exists", () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.push("bid_requests.read", "bid_requests.update");

    render(<OrderDetail />);

    const bidRequests = screen.getByLabelText("Bid requests");
    expect(bidRequests).toHaveAttribute("data-can-record-responses", "true");
    expect(bidRequests).toHaveAttribute("data-can-select-responses", "false");
  });

  it("passes bid selection authority to bid requests when select access exists", () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.push("bid_requests.read", "bid_requests.select");

    render(<OrderDetail />);

    const bidRequests = screen.getByLabelText("Bid requests");
    expect(bidRequests).toHaveAttribute("data-can-record-responses", "false");
    expect(bidRequests).toHaveAttribute("data-can-select-responses", "true");
  });

  it("refreshes bid request history after vendor candidate bid request success", async () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.push("vendors.read", "bid_requests.read");

    render(<OrderDetail />);

    const bidRequests = screen.getByLabelText("Bid requests");
    expect(bidRequests).toHaveAttribute("data-refresh-token", "0");

    fireEvent.click(screen.getByRole("button", { name: "Mock bid request success" }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("Bid request created.");
      expect(screen.getByLabelText("Bid requests")).toHaveAttribute("data-refresh-token", "1");
    });
  });

  it("passes candidate offer authority and refresh callback to vendor candidates", async () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.push(
      "vendors.read",
      "order_company_assignments.offer",
      "order_company_assignments.read_owner",
      "relationships.assign_work",
    );

    render(<OrderDetail />);

    await waitFor(() => {
      expect(listOwnerAssignmentsForOrderMock).toHaveBeenCalledWith("order-1");
    });

    const candidates = screen.getByLabelText("Vendor candidates");
    expect(candidates).toHaveAttribute("data-can-offer", "true");
    expect(candidates).toHaveAttribute("data-order-due-at", "2026-05-29T12:00:00.000Z");

    fireEvent.click(screen.getByRole("button", { name: "Mock candidate offer success" }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("Assignment offer sent.");
      expect(listOwnerAssignmentsForOrderMock).toHaveBeenCalledTimes(2);
    });
  });

  it("derives active vendor assignment state and passes it to vendor candidates", async () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.push("vendors.read", "bid_requests.read", "order_company_assignments.read_owner");
    bidRequestsPanelRowsMock.push({
      bid_request_id: "bid-request-1",
      status: "closed",
      recipients: [
        {
          recipient_id: "recipient-1",
          vendor_company_name: "Franklin Commercial Valuation",
          status: "selected",
          response: {
            response_id: "response-1",
            selected_at: "2026-06-02T18:00:00.000Z",
          },
        },
      ],
    });
    listOwnerAssignmentsForOrderMock.mockResolvedValue([
      {
        id: "assignment-1",
        assignment_type: "vendor_appraisal",
        status: "offered",
        assigned_company_name: "ABC Valuation",
        offered_at: "2026-06-01T12:00:00.000Z",
      },
    ]);

    render(<OrderDetail />);

    await waitFor(() => {
      expect(listOwnerAssignmentsForOrderMock).toHaveBeenCalledWith("order-1");
    });
    expect(screen.queryByTestId("assignments-panel")).not.toBeInTheDocument();

    expect(screen.getByText("Show Procurement Details").closest("details")).toBeInTheDocument();
    const candidates = screen.getByLabelText("Vendor candidates");
    expect(candidates).toHaveAttribute("data-active-assignment-id", "assignment-1");
    expect(screen.getByLabelText("Bid requests")).toHaveAttribute("data-has-active-vendor-assignment", "true");
    const bidStatus = screen.getByLabelText("AMC bid status");
    expect(within(bidStatus).getByText("Assignment offered")).toBeInTheDocument();
    expect(within(bidStatus).getByText("Offered")).toBeInTheDocument();
    expect(within(bidStatus).getByRole("link", { name: "Open Packet" })).toHaveAttribute(
      "href",
      "/assignments/assignment-1",
    );
    expect(within(candidates).getByText("Vendor assignment already active")).toBeInTheDocument();
    expect(
      within(candidates).getByText("This order already has an active vendor offer or assignment, so new bid requests and direct awards are disabled."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /offer assignment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bid/i })).not.toBeInTheDocument();
  });

  it("renders accepted AMC vendor assignment terms without internal team fee fields", async () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    orderMock.client_due_at = "2026-06-15T12:00:00.000Z";
    permissionKeysMock.push("vendors.read", "bid_requests.read", "order_company_assignments.read_owner");
    listOwnerAssignmentsForOrderMock.mockResolvedValue([
      {
        id: "assignment-accepted",
        assignment_type: "vendor_appraisal",
        status: "accepted",
        assigned_company_name: "Acme Appraisal",
        accepted_fee_amount: 1500,
        accepted_fee_currency: "USD",
        accepted_turn_time_days: 10,
        accepted_vendor_due_at: "2026-06-20T12:00:00.000Z",
        accepted_at: "2026-06-10T12:00:00.000Z",
        due_at: "2026-06-20T12:00:00.000Z",
      },
    ]);

    render(<OrderDetail />);

    await waitFor(() => {
      expect(listOwnerAssignmentsForOrderMock).toHaveBeenCalledWith("order-1");
    });

    const overview = screen.getByLabelText("Operational Overview");
    expect(within(overview).getByText("Vendor Assignment")).toBeInTheDocument();
    expect(within(overview).getByText("Acme Appraisal")).toBeInTheDocument();
    expect(within(overview).getByText("Accepted")).toBeInTheDocument();
    expect(within(overview).getByText("$1,500.00")).toBeInTheDocument();
    expect(within(overview).getByText("10 days")).toBeInTheDocument();
    expect(within(overview).getAllByText("6/20/2026").length).toBeGreaterThan(0);
    expect(within(overview).getAllByText("6/10/2026").length).toBeGreaterThan(0);
    expect(within(overview).queryByText("Team / Fees")).not.toBeInTheDocument();
    expect(within(overview).queryByText("Appraiser Fee")).not.toBeInTheDocument();

    const bidStatus = screen.getByLabelText("AMC bid status");
    expect(within(bidStatus).getByText("Assigned")).toBeInTheDocument();
    expect(within(bidStatus).getByText("Acme Appraisal")).toBeInTheDocument();
    expect(within(bidStatus).getByText("Accepted Fee")).toBeInTheDocument();
    expect(within(bidStatus).getByText("$1,500.00")).toBeInTheDocument();
    expect(within(bidStatus).getByText("Turn Time")).toBeInTheDocument();
    expect(within(bidStatus).getByText("10 days")).toBeInTheDocument();
    expect(within(bidStatus).getByText("Client Due")).toBeInTheDocument();
    expect(within(bidStatus).getByText("6/15/2026")).toBeInTheDocument();

    const procurementDetails = screen.getByText("Show Procurement Details").closest("details");
    expect(procurementDetails).not.toHaveAttribute("open");
    expect(screen.getByLabelText("Bid requests")).toHaveAttribute("data-has-active-vendor-assignment", "true");
  });

  it("does not treat historical vendor assignment statuses as active candidate blockers", async () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";
    permissionKeysMock.push("vendors.read", "order_company_assignments.read_owner");
    listOwnerAssignmentsForOrderMock.mockResolvedValue([
      {
        id: "assignment-1",
        assignment_type: "vendor_appraisal",
        status: "declined",
        assigned_company_name: "ABC Valuation",
        declined_at: "2026-06-01T12:00:00.000Z",
      },
      {
        id: "assignment-2",
        assignment_type: "vendor_appraisal",
        status: "revoked",
        assigned_company_name: "Beta Valuation",
        revoked_at: "2026-06-02T12:00:00.000Z",
      },
      {
        id: "assignment-3",
        assignment_type: "review_provider",
        status: "offered",
        assigned_company_name: "Review Co",
        offered_at: "2026-06-03T12:00:00.000Z",
      },
    ]);

    render(<OrderDetail />);

    await waitFor(() => {
      expect(listOwnerAssignmentsForOrderMock).toHaveBeenCalledWith("order-1");
    });

    const candidates = screen.getByLabelText("Vendor candidates");
    expect(candidates).toHaveAttribute("data-active-assignment-id", "");
    expect(screen.queryByRole("link", { name: "Open Packet" })).not.toBeInTheDocument();
    expect(
      within(candidates).queryByText("This order already has an active vendor offer or assignment."),
    ).not.toBeInTheDocument();
  });

  it("keeps the existing assignments panel rendering with shared assignment rows", async () => {
    Object.assign(shellProfileMock, {
      profileId: "assignment_management",
      appContext: {},
      loading: false,
      error: null,
    });
    permissionKeysMock.push(
      "order_company_assignments.read_owner",
      "order_company_assignments.offer",
      "relationships.assign_work",
      "relationships.read",
    );
    listOwnerAssignmentsForOrderMock.mockResolvedValue([
      {
        id: "assignment-1",
        assignment_type: "vendor_appraisal",
        status: "offered",
        assigned_company_name: "ABC Valuation",
      },
    ]);

    render(<OrderDetail />);

    await waitFor(() => {
      expect(listOwnerAssignmentsForOrderMock).toHaveBeenCalledWith("order-1");
    });

    const assignmentsPanel = screen.getByTestId("assignments-panel");
    expect(assignmentsPanel).toHaveAttribute("data-row-count", "1");
    expect(assignmentsPanel).toHaveAttribute("data-loading", "false");
    expect(screen.getByRole("button", { name: "Refresh assignments" })).toBeInTheDocument();
  });

  it("hides vendor candidates outside AMC Operations mode", () => {
    operationsModeMock.operationsMode = "internal_operations";
    permissionKeysMock.push("vendors.read");

    render(<OrderDetail />);

    expect(screen.queryByLabelText("Vendor candidates")).not.toBeInTheDocument();
  });

  it("hides bid requests outside AMC Operations mode", () => {
    operationsModeMock.operationsMode = "internal_operations";
    permissionKeysMock.push("bid_requests.read");

    render(<OrderDetail />);

    expect(screen.queryByLabelText("Bid requests")).not.toBeInTheDocument();
  });

  it("hides vendor candidates for internal-scoped orders even in AMC Operations mode", () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "internal_operations";
    permissionKeysMock.push("vendors.read");

    render(<OrderDetail />);

    expect(screen.queryByLabelText("Vendor candidates")).not.toBeInTheDocument();
    expect(listOwnerAssignmentsForOrderMock).not.toHaveBeenCalled();
  });

  it("hides bid requests for internal-scoped orders even in AMC Operations mode", () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "internal_operations";
    permissionKeysMock.push("bid_requests.read");

    render(<OrderDetail />);

    expect(screen.queryByLabelText("Bid requests")).not.toBeInTheDocument();
  });

  it("hides vendor candidates without vendor read access", () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";

    render(<OrderDetail />);

    expect(screen.queryByLabelText("Vendor candidates")).not.toBeInTheDocument();
  });

  it("hides bid requests without bid request read access", () => {
    operationsModeMock.operationsMode = "amc_operations";
    orderMock.operations_scope = "amc_operations";

    render(<OrderDetail />);

    expect(screen.queryByLabelText("Bid requests")).not.toBeInTheDocument();
  });

  it("uses overview first, then map, activity, and support detail zones", () => {
    render(<OrderDetail />);

    const overview = screen.getByLabelText("Operational Overview");
    const detailBody = screen.getByLabelText("Order detail body");
    const supportBody = screen.getByLabelText("Order support body");
    const contactMapHeading = screen.getByText("Contacts / Map");
    const activityHeading = screen.getByText("Activity");

    expect(screen.queryByTestId("two-week-calendar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("calendar-legend")).not.toBeInTheDocument();
    expect(screen.queryByText("Dates")).not.toBeInTheDocument();
    expect(screen.queryByText("People / Fees")).not.toBeInTheDocument();
    expect(within(detailBody).getByText("Activity")).toBeInTheDocument();
    expect(within(detailBody).getByText("Contacts / Map")).toBeInTheDocument();
    expect(within(detailBody).getByText("Property Contact")).toBeInTheDocument();
    expect(within(detailBody).getByText("Contact Phone")).toBeInTheDocument();
    expect(within(supportBody).getByLabelText("Order files")).toBeInTheDocument();
    expect(within(supportBody).getByLabelText("Order notes")).toBeInTheDocument();
    expect(overview.compareDocumentPosition(activityHeading)).toBe(DOCUMENT_POSITION_FOLLOWING);
    expect(overview.compareDocumentPosition(contactMapHeading)).toBe(DOCUMENT_POSITION_FOLLOWING);
    expect(detailBody.compareDocumentPosition(supportBody)).toBe(DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders compact order files beside the notes support panel", async () => {
    render(<OrderDetail />);

    const supportBody = screen.getByLabelText("Order support body");
    const files = await screen.findByLabelText("Order files");
    const notes = within(supportBody).getByLabelText("Order notes");
    const engagementGroup = within(files).getByLabelText("Engagement files");
    const sourceGroup = within(files).getByLabelText("Source Documents files");

    expect(within(supportBody).getByLabelText("Order files")).toBe(files);
    expect(notes).toBeInTheDocument();
    expect(listOrderDocumentsMock).toHaveBeenCalledWith("order-1");
    expect(within(files).getByText("Files")).toBeInTheDocument();
    expect(within(files).getByLabelText("Engagement files").parentElement).toHaveClass(
      "max-h-96",
      "overflow-y-auto",
    );
    expect(engagementGroup).toBeInTheDocument();
    expect(sourceGroup).toBeInTheDocument();
    expect(within(engagementGroup).getByText("Engagement Letter")).toBeInTheDocument();
    expect(within(engagementGroup).getAllByText("Engagement").length).toBeGreaterThan(1);
    expect(within(engagementGroup).getByText("Uploaded 5/20/2026")).toBeInTheDocument();
    expect(within(engagementGroup).getByText("2.0 KB")).toBeInTheDocument();
    expect(within(sourceGroup).getByText("rent-roll.xlsx")).toBeInTheDocument();
    expect(within(sourceGroup).getByText("Archived")).toBeInTheDocument();
  });

  it("keeps long operational notes internally scrollable beside files", async () => {
    orderMock.notes = Array.from({ length: 20 }, (_, index) => `Operational note ${index + 1}`).join("\n");

    render(<OrderDetail />);

    const supportBody = screen.getByLabelText("Order support body");
    const notes = within(supportBody).getByLabelText("Order notes");
    const noteContent = within(notes).getByText(/Operational note 1/);

    expect(await within(supportBody).findByLabelText("Order files")).toBeInTheDocument();
    expect(noteContent).toHaveClass("max-h-72", "overflow-y-auto");
    expect(noteContent).toHaveTextContent("Operational note 20");
  });

  it("preserves document order within grouped file sections", async () => {
    listOrderDocumentsMock.mockResolvedValueOnce([
      {
        id: "doc-1",
        order_id: "order-1",
        category: "engagement",
        title: "Second Engagement File",
        file_name: "second.pdf",
        file_size: 2048,
        status: "active",
        created_at: "2026-05-20T12:00:00.000Z",
      },
      {
        id: "doc-2",
        order_id: "order-1",
        category: "engagement",
        title: "First Engagement File",
        file_name: "first.pdf",
        file_size: 1024,
        status: "active",
        created_at: "2026-05-19T12:00:00.000Z",
      },
      {
        id: "doc-3",
        order_id: "order-1",
        category: "source_documents",
        title: "Source Package",
        file_name: "source.pdf",
        file_size: 1024,
        status: "active",
        created_at: "2026-05-18T12:00:00.000Z",
      },
    ]);

    render(<OrderDetail />);

    const files = await screen.findByLabelText("Order files");
    const engagementGroup = within(files).getByLabelText("Engagement files");
    const second = within(engagementGroup).getByText("Second Engagement File");
    const first = within(engagementGroup).getByText("First Engagement File");

    expect(second.compareDocumentPosition(first)).toBe(DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders the files empty state when no documents are returned", async () => {
    listOrderDocumentsMock.mockResolvedValueOnce([]);

    render(<OrderDetail />);

    const files = await screen.findByLabelText("Order files");

    expect(within(files).getByText("No files uploaded yet.")).toBeInTheDocument();
    expect(within(files).queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
    expect(within(files).queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("does not expose unsafe document storage or signed URL internals", async () => {
    listOrderDocumentsMock.mockResolvedValueOnce([
      {
        id: "doc-unsafe",
        order_id: "order-1",
        category: "internal_workfile",
        title: "Safe Workfile",
        file_name: "safe-workfile.pdf",
        file_size: 1024,
        status: "active",
        created_at: "2026-05-20T12:00:00.000Z",
        storage_bucket: "order-documents",
        storage_path: "private/order-1/safe-workfile.pdf",
        object_key: "private-object-key",
        signed_url: "https://example.test/internal-signed-url",
      },
    ]);

    render(<OrderDetail />);

    const files = await screen.findByLabelText("Order files");

    expect(within(files).getByText("Safe Workfile")).toBeInTheDocument();
    expect(within(files).getAllByText("Internal Workfile").length).toBeGreaterThan(1);
    expect(within(files).queryByText("order-documents")).not.toBeInTheDocument();
    expect(within(files).queryByText("private/order-1/safe-workfile.pdf")).not.toBeInTheDocument();
    expect(within(files).queryByText("private-object-key")).not.toBeInTheDocument();
    expect(screen.queryByText("https://example.test/internal-signed-url")).not.toBeInTheDocument();
  });

  it("opens documents through the signed download Edge helper", async () => {
    render(<OrderDetail />);

    const files = await screen.findByLabelText("Order files");
    fireEvent.click(within(files).getByRole("button", { name: "Download" }));

    await waitFor(() => {
      expect(createOrderDocumentDownloadUrlMock).toHaveBeenCalledWith("doc-1");
    });
    expect(window.open).toHaveBeenCalledWith(
      "https://example.test/signed-download",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("archives active documents through the archive RPC helper and refreshes the list", async () => {
    render(<OrderDetail />);

    const files = await screen.findByLabelText("Order files");
    fireEvent.click(within(files).getByRole("button", { name: "Archive" }));

    const dialog = screen.getByRole("alertdialog", { name: "Archive file" });
    expect(within(dialog).getByText("Archive Engagement Letter?")).toBeInTheDocument();
    expect(archiveOrderDocumentMock).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Archive file" }));

    await waitFor(() => {
      expect(archiveOrderDocumentMock).toHaveBeenCalledWith("doc-1");
    });
    expect(listOrderDocumentsMock).toHaveBeenCalledTimes(2);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith("File archived.");
  });

  it("cancels document archive without calling the archive RPC helper", async () => {
    render(<OrderDetail />);

    const files = await screen.findByLabelText("Order files");
    fireEvent.click(within(files).getByRole("button", { name: "Archive" }));

    const dialog = screen.getByRole("alertdialog", { name: "Archive file" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog", { name: "Archive file" })).not.toBeInTheDocument();
    expect(archiveOrderDocumentMock).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("uploads a selected order file through the upload helper and refreshes the list", async () => {
    render(<OrderDetail />);

    const files = await screen.findByLabelText("Order files");
    const input = within(files).getByLabelText("Choose order file");
    const file = new File(["lease"], "Lease.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadOrderDocumentMock).toHaveBeenCalledWith({
        orderId: "order-1",
        file,
        category: "engagement",
        title: "Lease.pdf",
        visibilityScope: "internal",
      });
    });
    await waitFor(() => {
      expect(within(files).getByText("Upload complete")).toBeInTheDocument();
    });
    expect(listOrderDocumentsMock).toHaveBeenCalledTimes(2);
  });

  it("uploads a dropped order file through the upload helper", async () => {
    render(<OrderDetail />);

    const files = await screen.findByLabelText("Order files");
    fireEvent.change(within(files).getByLabelText("Document category"), {
      target: { value: "source_documents" },
    });

    const dropZone = within(files).getByText("Drop a file here");
    const file = new File(["rent roll"], "Rent Roll.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(uploadOrderDocumentMock).toHaveBeenCalledWith({
        orderId: "order-1",
        file,
        category: "source_documents",
        title: "Rent Roll.xlsx",
        visibilityScope: "internal",
      });
    });
  });

  it("opens a read-only print packet preview and prints through the browser", async () => {
    render(<OrderDetail />);

    await screen.findByLabelText("Order files");
    fireEvent.click(screen.getByRole("button", { name: "Print Packet" }));

    const dialog = screen.getByRole("dialog", { name: "Print Packet" });
    const packet = within(dialog).getByLabelText("Read-only print packet");

    expect(within(packet).getByText("Internal Order Print Packet")).toBeInTheDocument();
    expect(within(packet).getByText("Order 2026001")).toBeInTheDocument();
    expect(within(packet).getByText("Order Summary")).toBeInTheDocument();
    expect(within(packet).getByText("Subject / Property")).toBeInTheDocument();
    expect(within(packet).getByText("Client And Participants")).toBeInTheDocument();
    expect(within(packet).getByText("Key Dates")).toBeInTheDocument();
    expect(within(packet).getByText("Status And Activity Summary")).toBeInTheDocument();
    expect(within(packet).getByText("Files Summary")).toBeInTheDocument();
    expect(within(packet).getByText("100 Main St, Boston, MA 02110")).toBeInTheDocument();
    expect(within(packet).getByText("Avery Appraiser")).toBeInTheDocument();
    expect(within(packet).getByText("Riley Reviewer")).toBeInTheDocument();
    expect(within(packet).getByText("Property Contact Phone")).toBeInTheDocument();
    expect(within(packet).getByText("555-123-4567")).toBeInTheDocument();
    expect(within(packet).getByText("Special Instructions")).toBeInTheDocument();
    expect(within(packet).queryByText("Borrower")).not.toBeInTheDocument();
    expect(within(packet).queryByText("Assigned To")).not.toBeInTheDocument();
    expect(within(packet).getAllByText("2 files").length).toBeGreaterThan(0);
    expect(within(packet).getByText("Document Categories")).toBeInTheDocument();
    expect(within(packet).getByLabelText("Document category counts")).toHaveTextContent(
      "Engagement: 1 file",
    );
    expect(within(packet).getByLabelText("Document category counts")).toHaveTextContent(
      "Source Documents: 1 file",
    );
    expect(packet).toHaveClass("order-print-packet");
    expect(dialog.closest(".order-print-surface")).toBeInTheDocument();
    expect(within(packet).queryByRole("button")).not.toBeInTheDocument();
    expect(within(packet).queryByText("Archive order")).not.toBeInTheDocument();
    expect(within(packet).queryByText("Cancel order")).not.toBeInTheDocument();
    expect(within(packet).queryByText("Void order")).not.toBeInTheDocument();
    expect(within(packet).queryByText("Download")).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Print" }));

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(createOrderDocumentDownloadUrlMock).not.toHaveBeenCalled();
    expect(archiveOrderViaRpcMock).not.toHaveBeenCalled();
    expect(cancelOrderViaRpcMock).not.toHaveBeenCalled();
    expect(voidOrderViaRpcMock).not.toHaveBeenCalled();
  });

  it("renders document category counts without document links or signed URL behavior", async () => {
    listOrderDocumentsMock.mockResolvedValueOnce([
      {
        id: "doc-1",
        order_id: "order-1",
        category: "engagement",
        title: "Engagement Letter",
        file_name: "engagement.pdf",
        file_size: 2048,
        status: "active",
        created_at: "2026-05-20T12:00:00.000Z",
      },
      {
        id: "doc-2",
        order_id: "order-1",
        category: "final_report",
        title: "Final Report",
        file_name: "report.pdf",
        file_size: 4096,
        status: "active",
        created_at: "2026-05-21T12:00:00.000Z",
      },
      {
        id: "doc-3",
        order_id: "order-1",
        category: null,
        title: "Workfile",
        file_name: "workfile.pdf",
        file_size: 1024,
        status: "active",
        created_at: "2026-05-22T12:00:00.000Z",
      },
    ]);

    render(<OrderDetail />);

    await screen.findByLabelText("Order files");
    fireEvent.click(screen.getByRole("button", { name: "Print Packet" }));

    const packet = within(screen.getByRole("dialog", { name: "Print Packet" })).getByLabelText(
      "Read-only print packet",
    );
    const categoryCounts = within(packet).getByLabelText("Document category counts");

    expect(within(packet).getAllByText("3 files").length).toBeGreaterThan(0);
    expect(categoryCounts).toHaveTextContent("Engagement: 1 file");
    expect(categoryCounts).toHaveTextContent("Final Report: 1 file");
    expect(categoryCounts).toHaveTextContent("Uncategorized: 1 file");
    expect(within(packet).queryByRole("link")).not.toBeInTheDocument();
    expect(within(packet).queryByText("Download")).not.toBeInTheDocument();
    expect(within(packet).queryByText("Archive")).not.toBeInTheDocument();
    expect(screen.queryByText("https://example.test/signed-download")).not.toBeInTheDocument();
    expect(createOrderDocumentDownloadUrlMock).not.toHaveBeenCalled();
  });

  it("renders an archived read-only notice in the print packet", async () => {
    orderMock.is_archived = true;

    render(<OrderDetail />);

    await screen.findByLabelText("Order files");
    fireEvent.click(screen.getByRole("button", { name: "Print Packet" }));

    const packet = within(screen.getByRole("dialog", { name: "Print Packet" })).getByLabelText(
      "Read-only print packet",
    );
    const notice = within(packet).getByLabelText("Retired lifecycle notice");

    expect(within(notice).getByText("Archived order")).toBeInTheDocument();
    expect(
      within(notice).getByText(
        "This order was removed from active operational lists and preserved for read-only history. The archive state does not delete documents, activity, assignments, or the order number.",
      ),
    ).toBeInTheDocument();
    expect(within(packet).queryByRole("button")).not.toBeInTheDocument();
    expect(within(packet).queryByText("Archive order")).not.toBeInTheDocument();
    expect(archiveOrderViaRpcMock).not.toHaveBeenCalled();
  });

  it("renders a cancelled read-only notice in the print packet", async () => {
    orderMock.status = "cancelled";

    render(<OrderDetail />);

    await screen.findByLabelText("Order files");
    fireEvent.click(screen.getByRole("button", { name: "Print Packet" }));

    const packet = within(screen.getByRole("dialog", { name: "Print Packet" })).getByLabelText(
      "Read-only print packet",
    );
    const notice = within(packet).getByLabelText("Retired lifecycle notice");

    expect(within(notice).getByText("Cancelled order")).toBeInTheDocument();
    expect(
      within(notice).getByText(
        "This legitimate order was stopped before completion and preserved for read-only history. Cancellation does not delete documents, activity, assignments, or the order number.",
      ),
    ).toBeInTheDocument();
    expect(within(packet).queryByRole("button")).not.toBeInTheDocument();
    expect(within(packet).queryByText("Cancel order")).not.toBeInTheDocument();
    expect(cancelOrderViaRpcMock).not.toHaveBeenCalled();
  });

  it("renders a voided read-only notice in the print packet", async () => {
    orderMock.status = "voided";

    render(<OrderDetail />);

    await screen.findByLabelText("Order files");
    fireEvent.click(screen.getByRole("button", { name: "Print Packet" }));

    const packet = within(screen.getByRole("dialog", { name: "Print Packet" })).getByLabelText(
      "Read-only print packet",
    );
    const notice = within(packet).getByLabelText("Retired lifecycle notice");

    expect(within(notice).getByText("Voided order")).toBeInTheDocument();
    expect(
      within(notice).getByText(
        "This order was administratively invalidated and preserved for read-only history. Voiding does not delete documents, activity, assignments, or the order number.",
      ),
    ).toBeInTheDocument();
    expect(within(packet).queryByRole("button")).not.toBeInTheDocument();
    expect(within(packet).queryByText("Void order")).not.toBeInTheDocument();
    expect(voidOrderViaRpcMock).not.toHaveBeenCalled();
  });

  it("does not show the order archive action without orders.archive permission", () => {
    render(<OrderDetail />);

    expect(screen.queryByRole("button", { name: "Archive order" })).not.toBeInTheDocument();
  });

  it("shows archived order history notice and hides archive action for archived orders", () => {
    permissionKeysMock.push("orders.archive");
    orderMock.is_archived = true;

    render(<OrderDetail />);

    expect(screen.getByText("Archived order")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This order is preserved for history. It is hidden from active operational lists and archive does not change status, remove documents, remove activity, or release the order number.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive order" })).not.toBeInTheDocument();
    expect(screen.getByTestId("activity-log")).toBeInTheDocument();
  });

  it("shows archive confirmation copy only after the guarded order archive action is opened", () => {
    permissionKeysMock.push("orders.archive");

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "Archive order" }));

    const dialog = screen.getByRole("dialog", { name: "Archive order" });
    expect(within(dialog).getAllByText("Archive order")).toHaveLength(2);
    expect(
      within(dialog).getByText(
        "This removes the order from active operational lists. It does not delete the order, change its status, remove documents, remove activity, or release the order number.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Reason for archive (optional)")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Archive order" })).toBeInTheDocument();
  });

  it("archives through the backend RPC wrapper and refreshes order state", async () => {
    permissionKeysMock.push("orders.archive");

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "Archive order" }));
    const dialog = screen.getByRole("dialog", { name: "Archive order" });
    fireEvent.change(within(dialog).getByLabelText("Reason for archive (optional)"), {
      target: { value: "Duplicate request" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive order" }));

    await waitFor(() => {
      expect(archiveOrderViaRpcMock).toHaveBeenCalledWith("order-1", "Duplicate request");
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Order archived. It was removed from active lists, and its history was preserved.",
    );
    expect(screen.queryByRole("dialog", { name: "Archive order" })).not.toBeInTheDocument();
  });

  it("keeps failed archive attempts in the confirmation modal without local mutation", async () => {
    permissionKeysMock.push("orders.archive");
    archiveOrderViaRpcMock.mockRejectedValueOnce(new Error("Permission denied"));

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "Archive order" }));
    const dialog = screen.getByRole("dialog", { name: "Archive order" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive order" }));

    await waitFor(() => {
      expect(archiveOrderViaRpcMock).toHaveBeenCalledWith("order-1", null);
    });
    expect(toastErrorMock).toHaveBeenCalledWith("Could not archive order. No changes were made.");
    expect(refreshMock).not.toHaveBeenCalled();
    expect(
      within(screen.getByRole("dialog", { name: "Archive order" })).getByText(
        "Could not archive order. No changes were made.",
      ),
    ).toBeInTheDocument();
  });

  it("shows cancel and void actions only with matching lifecycle permissions", () => {
    render(<OrderDetail />);

    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void order" })).not.toBeInTheDocument();
    cleanup();

    permissionKeysMock.push("orders.cancel");
    render(<OrderDetail />);

    expect(screen.getByRole("button", { name: "Cancel order" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void order" })).not.toBeInTheDocument();
    cleanup();

    permissionKeysMock.splice(0, permissionKeysMock.length, "orders.void");
    render(<OrderDetail />);

    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Void order" })).toBeInTheDocument();
  });

  it("shows cancel confirmation doctrine copy and requires a trimmed reason", async () => {
    permissionKeysMock.push("orders.cancel");

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));

    const dialog = screen.getByRole("dialog", { name: "Cancel order" });
    expect(within(dialog).getAllByText("Cancel order")).toHaveLength(2);
    expect(
      within(dialog).getByText(
        "Cancelling marks a legitimate order as stopped before completion. It does not delete the order, release the order number, or remove documents/activity.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Reason for cancellation")).toBeRequired();
    expect(within(dialog).getByRole("button", { name: "Cancel order" })).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Reason for cancellation"), {
      target: { value: "  Client withdrew  " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel order" }));

    await waitFor(() => {
      expect(cancelOrderViaRpcMock).toHaveBeenCalledWith("order-1", "Client withdrew");
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Order cancelled. Its history was preserved.");
    expect(screen.queryByRole("dialog", { name: "Cancel order" })).not.toBeInTheDocument();
  });

  it("shows void confirmation doctrine copy and requires a trimmed reason", async () => {
    permissionKeysMock.push("orders.void");

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "Void order" }));

    const dialog = screen.getByRole("dialog", { name: "Void order" });
    expect(within(dialog).getAllByText("Void order")).toHaveLength(2);
    expect(
      within(dialog).getByText(
        "Voiding marks this order as administratively invalid, such as a duplicate, mistake, or record opened in error. It does not delete the order, release the order number, or remove documents/activity.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Reason for voiding")).toBeRequired();
    expect(within(dialog).getByRole("button", { name: "Void order" })).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Reason for voiding"), {
      target: { value: "  Duplicate order  " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Void order" }));

    await waitFor(() => {
      expect(voidOrderViaRpcMock).toHaveBeenCalledWith("order-1", "Duplicate order");
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Order voided. Its history was preserved.");
    expect(screen.queryByRole("dialog", { name: "Void order" })).not.toBeInTheDocument();
  });

  it("keeps failed cancel attempts in the confirmation modal without local mutation", async () => {
    permissionKeysMock.push("orders.cancel");
    cancelOrderViaRpcMock.mockRejectedValueOnce(new Error("Permission denied"));

    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
    const dialog = screen.getByRole("dialog", { name: "Cancel order" });
    fireEvent.change(within(dialog).getByLabelText("Reason for cancellation"), {
      target: { value: "Client withdrew" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel order" }));

    await waitFor(() => {
      expect(cancelOrderViaRpcMock).toHaveBeenCalledWith("order-1", "Client withdrew");
    });
    expect(toastErrorMock).toHaveBeenCalledWith("Could not cancel order. No changes were made.");
    expect(refreshMock).not.toHaveBeenCalled();
    expect(
      within(screen.getByRole("dialog", { name: "Cancel order" })).getByText(
        "Could not cancel order. No changes were made.",
      ),
    ).toBeInTheDocument();
  });

  it("hides cancel and void actions after terminal lifecycle state", () => {
    permissionKeysMock.push("orders.archive", "orders.cancel", "orders.void");
    orderMock.status = "cancelled";

    render(<OrderDetail />);

    expect(screen.getByText("Cancelled order")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This order is preserved for history. It is hidden from active operational queues and cancellation does not delete the order, release the order number, or remove documents/activity.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void order" })).not.toBeInTheDocument();
    expect(screen.getByTestId("activity-log")).toBeInTheDocument();
  });

  it("shows voided preserved-history notice and hides lifecycle actions", () => {
    permissionKeysMock.push("orders.archive", "orders.cancel", "orders.void");
    orderMock.status = "voided";

    render(<OrderDetail />);

    expect(screen.getByText("Voided order")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This order is preserved for history. It is hidden from active operational queues and voiding does not delete the order, release the order number, or remove documents/activity.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void order" })).not.toBeInTheDocument();
    expect(screen.getByTestId("activity-log")).toBeInTheDocument();
  });
});
