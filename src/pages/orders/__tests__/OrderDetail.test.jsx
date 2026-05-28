// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.hoisted(() => vi.fn());
const updateSiteVisitAtViaRpcMock = vi.hoisted(() => vi.fn());
const archiveOrderViaRpcMock = vi.hoisted(() => vi.fn());
const cancelOrderViaRpcMock = vi.hoisted(() => vi.fn());
const voidOrderViaRpcMock = vi.hoisted(() => vi.fn());
const listOrderDocumentsMock = vi.hoisted(() => vi.fn());
const createOrderDocumentDownloadUrlMock = vi.hoisted(() => vi.fn());
const archiveOrderDocumentMock = vi.hoisted(() => vi.fn());
const uploadOrderDocumentMock = vi.hoisted(() => vi.fn());
const createOrderOperationalInputMock = vi.hoisted(() => vi.fn());
const clearOrderOperationalInputMock = vi.hoisted(() => vi.fn());
const operationalInputsMock = vi.hoisted(() => []);
const refreshOperationalInputsMock = vi.hoisted(() => vi.fn());
const permissionKeysMock = vi.hoisted(() => []);
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
  useNavigate: () => vi.fn(),
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

vi.mock("@/features/order-documents/api", () => ({
  listOrderDocuments: listOrderDocumentsMock,
  createOrderDocumentDownloadUrl: createOrderDocumentDownloadUrlMock,
  archiveOrderDocument: archiveOrderDocumentMock,
  uploadOrderDocument: uploadOrderDocumentMock,
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
  default: () => <div data-testid="assignments-panel" />,
}));

const { default: OrderDetail } = await import("../OrderDetail.jsx");

describe("OrderDetail site visit save", () => {
  beforeEach(() => {
    Object.assign(orderMock, {
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
    permissionKeysMock.splice(
      0,
      permissionKeysMock.length,
      "documents.delete",
      "documents.upload.all",
    );
    Object.assign(shellProfileMock, {
      profileId: "operations",
      appContext: {},
      loading: false,
      error: null,
    });
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
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
