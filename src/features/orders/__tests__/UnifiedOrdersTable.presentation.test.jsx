// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SmartActionsControl from "../components/SmartActionsControl";
import UnifiedOrdersTable from "../UnifiedOrdersTable";

const useOrdersMock = vi.hoisted(() => vi.fn());
const useColumnsConfigMock = vi.hoisted(() => vi.fn());
const updateSiteVisitAtMock = vi.hoisted(() => vi.fn());
const fetchAmcOrderProcurementSummariesMock = vi.hoisted(() => vi.fn());
const sendOrderToReviewMock = vi.hoisted(() => vi.fn());
const orderWorkflowMocks = vi.hoisted(() => ({
  sendOrderBackToAppraiser: vi.fn(),
  completeOrder: vi.fn(),
  clearReview: vi.fn(),
  requestFinalApproval: vi.fn(),
  markReadyForClient: vi.fn(),
}));
const logNoteMock = vi.hoisted(() => vi.fn());
const emitNotificationMock = vi.hoisted(() => vi.fn());
const appContextState = vi.hoisted(() => ({
  context: {
    user_id: "app-user-1",
    is_owner: true,
    is_admin_role: true,
    primary_role_key: "owner",
  },
}));

vi.mock("@/lib/hooks/useSession", () => ({
  default: () => ({ user: { id: "auth-user-1" } }),
}));

vi.mock("@/lib/hooks/useOrders", () => ({
  useOrders: useOrdersMock,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    loading: false,
    error: null,
    hasPermission: () => true,
  }),
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/api/orders", () => ({
  updateSiteVisitAt: updateSiteVisitAtMock,
}));

vi.mock("@/features/bids/api", () => ({
  fetchAmcOrderProcurementSummaries: fetchAmcOrderProcurementSummariesMock,
}));

vi.mock("@/lib/services/ordersService", () => ({
  sendOrderToReview: sendOrderToReviewMock,
  sendOrderBackToAppraiser: orderWorkflowMocks.sendOrderBackToAppraiser,
  completeOrder: orderWorkflowMocks.completeOrder,
  clearReview: orderWorkflowMocks.clearReview,
  requestFinalApproval: orderWorkflowMocks.requestFinalApproval,
  markReadyForClient: orderWorkflowMocks.markReadyForClient,
}));

vi.mock("@/lib/services/activityService", () => ({
  logNote: logNoteMock,
}));

vi.mock("@/lib/services/notificationsService", () => ({
  emitNotification: emitNotificationMock,
}));

vi.mock("@/features/auth/useCurrentUserAppContext", () => ({
  useCurrentUserAppContext: () => ({
    loading: false,
    context: appContextState.context,
  }),
}));

vi.mock("@/features/orders/columns/useColumnsConfig", () => ({
  default: useColumnsConfigMock,
}));

vi.mock("@/components/orders/drawer/OrderDrawerContent", () => ({
  default: ({ order }) => <div>Drawer for {order?.order_number}</div>,
}));

vi.mock("@/components/orders/WorkflowNoteModal", () => ({
  default: ({ open, title, description, confirmLabel, onConfirm }) => {
    if (!open) return null;

    return (
      <div role="dialog" aria-label={title}>
        <p>{description}</p>
        <button type="button" onClick={() => onConfirm("Ready for review")}>
          {confirmLabel}
        </button>
      </div>
    );
  },
}));

const rows = [
  {
    id: "order-1",
    order_number: "2026001",
    client_name: "Acme Lending",
    status: "new",
    site_visit_at: "2099-05-20T12:00:00.000Z",
  },
  {
    id: "order-2",
    order_number: "2026002",
    client_name: "North Bank",
    status: "in_review",
    review_due_at: "2099-05-20T12:00:00.000Z",
  },
];

function renderTable(props = {}) {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <UnifiedOrdersTable {...props} />
    </MemoryRouter>,
  );
}

describe("UnifiedOrdersTable presentation", () => {
  beforeEach(() => {
    appContextState.context = {
      user_id: "app-user-1",
      is_owner: true,
      is_admin_role: true,
      primary_role_key: "owner",
    };
    useOrdersMock.mockReturnValue({
      data: rows,
      count: rows.length,
      loading: false,
      error: null,
      filters: { page: 0, pageSize: 15 },
      setFilters: vi.fn(),
    });

    useColumnsConfigMock.mockReturnValue([
      {
        key: "order",
        width: "minmax(140px,1fr)",
        header: () => "Order / Status",
        cell: (order) => order.order_number,
      },
      {
        key: "client",
        width: "minmax(140px,1fr)",
        header: () => "Client",
        cell: (order) => order.client_name,
      },
    ]);
    fetchAmcOrderProcurementSummariesMock.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    useOrdersMock.mockReset();
    useColumnsConfigMock.mockReset();
    updateSiteVisitAtMock.mockReset();
    fetchAmcOrderProcurementSummariesMock.mockReset();
    sendOrderToReviewMock.mockReset();
    Object.values(orderWorkflowMocks).forEach((mock) => mock.mockReset());
    logNoteMock.mockReset();
    emitNotificationMock.mockReset();
  });

  it("renders the active table chrome without changing loaded rows", () => {
    renderTable();

    expect(screen.getByLabelText("Orders table")).toBeInTheDocument();
    expect(screen.getByText("Orders Table")).toBeInTheDocument();
    expect(screen.getByText("Active orders")).toBeInTheDocument();
    expect(screen.getByText("Order records in this view.")).toBeInTheDocument();
    expect(screen.getAllByText("2 total")[0]).toBeInTheDocument();
    expect(screen.getByText("2026001")).toBeInTheDocument();
    expect(screen.getByText("Acme Lending")).toBeInTheDocument();
  });

  it("fetches AMC procurement summaries once for visible AMC order rows and renders backend labels", async () => {
    fetchAmcOrderProcurementSummariesMock.mockResolvedValue([
      {
        order_id: "order-1",
        label: "Responses Received",
        tone: "info",
        contacted_count: 3,
        responded_count: 2,
      },
    ]);

    renderTable({
      operationsScope: "amc_operations",
      rowsOverride: [
        { ...rows[0], operations_scope: "amc_operations" },
        { ...rows[1], operations_scope: "amc_operations" },
        {
          id: "internal-order-1",
          order_number: "2026003",
          client_name: "Internal Bank",
          status: "new",
          operations_scope: "internal_operations",
        },
      ],
    });

    await waitFor(() =>
      expect(fetchAmcOrderProcurementSummariesMock).toHaveBeenCalledWith(["order-1", "order-2"]),
    );
    expect(fetchAmcOrderProcurementSummariesMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Responses Received")).toBeInTheDocument();
    expect(screen.queryByText("No Bids")).not.toBeInTheDocument();
  });

  it("does not fetch or render AMC procurement chips for internal operations rows", async () => {
    renderTable({
      operationsScope: "amc_operations",
      rowsOverride: [{ ...rows[0], operations_scope: "internal_operations" }],
    });

    await waitFor(() => expect(screen.getByText("2026001")).toBeInTheDocument());
    expect(fetchAmcOrderProcurementSummariesMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Bids Requested")).not.toBeInTheDocument();
  });

  it("does not fetch AMC procurement summaries outside AMC operations scope", async () => {
    renderTable({
      operationsScope: "internal_operations",
      rowsOverride: [{ ...rows[0], operations_scope: "amc_operations" }],
    });

    await waitFor(() => expect(screen.getByText("2026001")).toBeInTheDocument());
    expect(fetchAmcOrderProcurementSummariesMock).not.toHaveBeenCalled();
  });

  it("handles AMC procurement summary fetch errors without breaking the table", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchAmcOrderProcurementSummariesMock.mockRejectedValue(new Error("summary load failed"));

    renderTable({
      operationsScope: "amc_operations",
      rowsOverride: [{ ...rows[0], operations_scope: "amc_operations" }],
    });

    expect(screen.getByText("2026001")).toBeInTheDocument();
    await waitFor(() => expect(fetchAmcOrderProcurementSummariesMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Bids Requested")).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load AMC procurement summaries",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("renders read-only next-step support copy from visible row data", () => {
    renderTable();

    expect(screen.getAllByLabelText("Order row next step").length).toBeGreaterThan(0);
    expect(screen.getByText("Review pending")).toBeInTheDocument();
    expect(screen.getByText(/Review due in/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review pending|Due soon|Needs revisions/i })).not.toBeInTheDocument();
  });

  it("renders queue worklist context from existing activeQueue and rowsOverride inputs", () => {
    renderTable({
      rowsOverride: [rows[0]],
      activeQueue: {
        label: "Unassigned Orders",
        urgency: "medium",
        description: "Orders that need assignment.",
        count: 1,
      },
    });

    expect(screen.getByText("Queue worklist")).toBeInTheDocument();
    expect(screen.getByText("Derived from the current active order set.")).toBeInTheDocument();
    expect(screen.getByText("Unassigned Orders")).toBeInTheDocument();
    expect(screen.getByText("Orders that need assignment.")).toBeInTheDocument();
    expect(screen.getByText("2026001")).toBeInTheDocument();
    expect(screen.queryByText("2026002")).not.toBeInTheDocument();
  });

  it("uses the polished empty state without adding action controls", () => {
    useOrdersMock.mockReturnValue({
      data: [],
      count: 0,
      loading: false,
      error: null,
      filters: { page: 0, pageSize: 15 },
      setFilters: vi.fn(),
    });

    renderTable();

    expect(screen.getByText("No active orders to show.")).toBeInTheDocument();
    expect(screen.getByText("The current filters do not have any active work.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archive|cancel|void/i })).not.toBeInTheDocument();
  });

  it("allows My Work to use appraiser-specific table and empty-state copy", () => {
    renderTable({
      rowsOverride: [],
      tableEyebrow: "Active Orders",
      tableLabel: "Assigned work",
      tableSummary: "Assigned orders from My Work.",
      emptyTitle: "No active assigned orders to show.",
      emptyDescription: "Assigned orders will appear here when they are available.",
    });

    expect(screen.getByText("Active Orders")).toBeInTheDocument();
    expect(screen.getByText("Assigned work")).toBeInTheDocument();
    expect(screen.getByText("Assigned orders from My Work.")).toBeInTheDocument();
    expect(screen.getByText("No active assigned orders to show.")).toBeInTheDocument();
    expect(
      screen.getByText("Assigned orders will appear here when they are available."),
    ).toBeInTheDocument();
    expect(screen.queryByText("The current filters do not have any active work.")).not.toBeInTheDocument();
  });

  it("does not force reviewer-primary appraiser-secondary Orders data into appraiser-only filters", () => {
    appContextState.context = {
      user_id: "pam-user",
      is_owner: false,
      is_admin_role: false,
      is_reviewer_role: true,
      is_appraiser_role: true,
      primary_role_key: "reviewer",
      role_keys: ["reviewer", "appraiser"],
    };

    renderTable({
      filters: { page: 0, pageSize: 15 },
    });

    expect(useOrdersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        appraiserId: null,
        assignedAppraiserId: null,
        reviewerId: null,
      }),
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it("passes My Work assignment OR filters without forcing the primary reviewer queue", () => {
    appContextState.context = {
      user_id: "pam-user",
      is_owner: false,
      is_admin_role: false,
      is_reviewer_role: true,
      is_appraiser_role: true,
      primary_role_key: "reviewer",
      role_keys: ["reviewer", "appraiser"],
    };

    renderTable({
      filters: { assignedToMe: true, page: 0, pageSize: 15 },
    });

    expect(useOrdersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        assignedToMe: true,
        assignedToMeUserId: "pam-user",
        appraiserId: null,
        assignedAppraiserId: null,
        reviewerId: null,
      }),
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it("uses the polished loading state from existing table loading", () => {
    useOrdersMock.mockReturnValue({
      data: [],
      count: 0,
      loading: true,
      error: null,
      filters: { page: 0, pageSize: 2 },
      setFilters: vi.fn(),
    });

    const { container } = renderTable();

    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
  });

  it("shows a saved site visit optimistically and keeps the server-confirmed date", async () => {
    updateSiteVisitAtMock.mockResolvedValue({
      id: "order-2",
      site_visit_at: "2026-05-20T09:15:00",
    });
    const onOrderDatesChanged = vi.fn();
    useColumnsConfigMock.mockImplementation((_role, actions) => [
      {
        key: "dates",
        width: "minmax(180px,1fr)",
        header: () => "Dates",
        cell: (order) => (
          <div>
            <span>{order.site_visit_at || "Site: Not set"}</span>
            <button
              type="button"
              onClick={() => actions.onSetSiteVisit(order, "2026-05-20T09:15:00")}
            >
              Set table site visit
            </button>
          </div>
        ),
      },
    ]);

    renderTable({
      rowsOverride: [rows[1]],
      onOrderDatesChanged,
    });

    expect(screen.getByText("Site: Not set")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Set table site visit" }));

    expect(screen.getByText("2026-05-20T09:15:00")).toBeInTheDocument();
    expect(onOrderDatesChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "order-2",
        site_visit_at: "2026-05-20T09:15:00",
      }),
      expect.objectContaining({ status: "optimistic" }),
    );

    await waitFor(() => expect(updateSiteVisitAtMock).toHaveBeenCalledWith(
      "order-2",
      "2026-05-20T09:15:00",
      expect.any(Object),
    ));
    await waitFor(() => expect(onOrderDatesChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "order-2",
        site_visit_at: "2026-05-20T09:15:00",
      }),
      expect.objectContaining({ status: "success" }),
    ));
  });

  it("reverts the optimistic site visit when save fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    updateSiteVisitAtMock.mockRejectedValue(new Error("save failed"));
    const onOrderDatesChanged = vi.fn();
    useColumnsConfigMock.mockImplementation((_role, actions) => [
      {
        key: "dates",
        width: "minmax(180px,1fr)",
        header: () => "Dates",
        cell: (order) => (
          <div>
            <span>{order.site_visit_at || "Site: Not set"}</span>
            <button
              type="button"
              onClick={() => actions.onSetSiteVisit(order, "2026-05-20T09:15:00")}
            >
              Set table site visit
            </button>
          </div>
        ),
      },
    ]);

    renderTable({
      rowsOverride: [rows[1]],
      onOrderDatesChanged,
    });

    fireEvent.click(screen.getByRole("button", { name: "Set table site visit" }));

    expect(screen.getByText("2026-05-20T09:15:00")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Site: Not set")).toBeInTheDocument());
    expect(onOrderDatesChanged).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-2" }),
      expect.objectContaining({ status: "error" }),
    );
    consoleErrorSpy.mockRestore();
  });

  it("keeps Smart Action button clicks from opening the row drawer", () => {
    const smartAction = vi.fn();
    useColumnsConfigMock.mockReturnValue([
      {
        key: "order",
        width: "minmax(140px,1fr)",
        header: () => "Order / Status",
        cell: (order) => order.order_number,
      },
      {
        key: "actions",
        width: "minmax(140px,1fr)",
        header: () => "Actions",
        cell: () => (
          <SmartActionsControl
            actions={[
              {
                id: "send-to-review",
                label: "Send to Review",
                visible: true,
                onClick: smartAction,
              },
            ]}
          />
        ),
      },
    ]);

    renderTable({ rowsOverride: [rows[0]] });

    fireEvent.click(screen.getByRole("button", { name: "Send to Review" }));

    expect(smartAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Drawer for 2026001")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("2026001"));

    expect(screen.getByText("Drawer for 2026001")).toBeInTheDocument();
  });

  it("keeps Smart Action dropdown selections from opening the row drawer", () => {
    const firstAction = vi.fn();
    const secondAction = vi.fn();
    useColumnsConfigMock.mockReturnValue([
      {
        key: "order",
        width: "minmax(140px,1fr)",
        header: () => "Order / Status",
        cell: (order) => order.order_number,
      },
      {
        key: "actions",
        width: "minmax(140px,1fr)",
        header: () => "Actions",
        cell: () => (
          <SmartActionsControl
            actions={[
              {
                id: "send-to-review",
                label: "Send to Review",
                visible: true,
                isPrimary: true,
                onClick: firstAction,
              },
              {
                id: "ready-for-client",
                label: "Ready for Client",
                visible: true,
                onClick: secondAction,
              },
            ]}
          />
        ),
      },
    ]);

    renderTable({ rowsOverride: [rows[0]] });

    fireEvent.click(screen.getByRole("button", { name: "Send to Review" }));

    expect(screen.getByRole("button", { name: "Ready for Client" })).toBeInTheDocument();
    expect(screen.queryByText("Drawer for 2026001")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ready for Client" }));

    expect(secondAction).toHaveBeenCalledTimes(1);
    expect(firstAction).not.toHaveBeenCalled();
    expect(screen.queryByText("Drawer for 2026001")).not.toBeInTheDocument();
  });

  it("optimistically updates reviewer Request Revisions rows after the action succeeds", async () => {
    orderWorkflowMocks.sendOrderBackToAppraiser.mockResolvedValue({
      id: "order-2",
      status: "needs_revisions",
    });
    useColumnsConfigMock.mockImplementation((_role, actions) => [
      {
        key: "status",
        width: "minmax(140px,1fr)",
        header: () => "Status",
        cell: (order) => <span>{order.status}</span>,
      },
      {
        key: "actions",
        width: "minmax(140px,1fr)",
        header: () => "Actions",
        cell: (order) => (
          <SmartActionsControl
            actions={[
              {
                id: "request-revisions",
                label: "Request Revisions",
                visible: order.status === "in_review",
                onClick: () => actions.onSendBackToAppraiser(order),
              },
            ]}
          />
        ),
      },
    ]);

    renderTable({
      role: "reviewer",
      rowsOverride: [rows[1]],
    });

    fireEvent.click(screen.getByRole("button", { name: "Request Revisions" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Request Revisions" })).getByRole("button", { name: "Request Revisions" }));

    await waitFor(() => expect(screen.getByText("Needs Revisions")).toBeInTheDocument());
    expect(orderWorkflowMocks.sendOrderBackToAppraiser).toHaveBeenCalledWith("order-2", "auth-user-1", {
      noteText: "Revision note:\nReady for review",
    });
    expect(screen.queryByRole("button", { name: "Request Revisions" })).not.toBeInTheDocument();
  });

  it("removes reviewer Clear Review rows from the current status-filtered view after success", async () => {
    orderWorkflowMocks.clearReview.mockResolvedValue({
      id: "order-2",
      status: "review_cleared",
    });
    useColumnsConfigMock.mockImplementation((_role, actions) => [
      {
        key: "status",
        width: "minmax(140px,1fr)",
        header: () => "Status",
        cell: (order) => <span>{order.status}</span>,
      },
      {
        key: "actions",
        width: "minmax(140px,1fr)",
        header: () => "Actions",
        cell: (order) => (
          <SmartActionsControl
            actions={[
              {
                id: "clear-review",
                label: "Clear Review",
                visible: order.status === "in_review",
                onClick: () => actions.onClearReview(order),
              },
            ]}
          />
        ),
      },
    ]);

    renderTable({
      role: "reviewer",
      filters: { statusIn: ["in_review"], page: 0, pageSize: 15 },
      rowsOverride: [rows[1]],
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear Review" }));

    await waitFor(() => expect(screen.queryByText("in_review")).not.toBeInTheDocument());
    expect(orderWorkflowMocks.clearReview).toHaveBeenCalledWith("order-2", "auth-user-1");
    expect(screen.getByText("0 total")).toBeInTheDocument();
    expect(screen.getByText("No active orders to show.")).toBeInTheDocument();
  });

  it("labels first send-to-review notes as submission notes", async () => {
    sendOrderToReviewMock.mockResolvedValue({ id: "order-1", status: "in_review" });
    logNoteMock.mockResolvedValue(undefined);
    useColumnsConfigMock.mockImplementation((_role, actions) => [
      {
        key: "workflow",
        width: "minmax(180px,1fr)",
        header: () => "Workflow",
        cell: (order) => (
          <button type="button" onClick={() => actions.onSendToReview(order)}>
            Send workflow
          </button>
        ),
      },
    ]);

    renderTable({
      rowsOverride: [{ ...rows[0], status: "in_progress" }],
    });

    fireEvent.click(screen.getByRole("button", { name: "Send workflow" }));

    expect(screen.getByRole("dialog", { name: "Send to Review" })).toBeInTheDocument();
    expect(
      screen.getByText("Add an optional submission note before sending the order to review."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/resubmission note/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send to Review" }));

    await waitFor(() => expect(sendOrderToReviewMock).toHaveBeenCalled());
    expect(logNoteMock).toHaveBeenCalledWith("order-1", "Submission note:\nReady for review");
    expect(sendOrderToReviewMock).toHaveBeenCalledWith("order-1", "app-user-1", {
      noteText: "Submission note:\nReady for review",
    });
  });

  it("uses resubmission wording only when the order is returning from needs revisions", async () => {
    sendOrderToReviewMock.mockResolvedValue({ id: "order-1", status: "in_review" });
    logNoteMock.mockResolvedValue(undefined);
    useColumnsConfigMock.mockImplementation((_role, actions) => [
      {
        key: "workflow",
        width: "minmax(180px,1fr)",
        header: () => "Workflow",
        cell: (order) => (
          <button type="button" onClick={() => actions.onSendToReview(order)}>
            Send workflow
          </button>
        ),
      },
    ]);

    renderTable({
      rowsOverride: [{ ...rows[0], status: "needs_revisions" }],
    });

    fireEvent.click(screen.getByRole("button", { name: "Send workflow" }));

    expect(screen.getByRole("dialog", { name: "Resubmit to Review" })).toBeInTheDocument();
    expect(
      screen.getByText("Add an optional resubmission note before sending the revised order back to review."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resubmit to Review" }));

    await waitFor(() => expect(sendOrderToReviewMock).toHaveBeenCalled());
    expect(logNoteMock).toHaveBeenCalledWith("order-1", "Resubmission note:\nReady for review");
    expect(sendOrderToReviewMock).toHaveBeenCalledWith("order-1", "app-user-1", {
      noteText: "Resubmission note:\nReady for review",
    });
  });
});
