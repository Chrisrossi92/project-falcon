// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OrdersPage from "../Orders";

const useOrdersSummaryMock = vi.hoisted(() => vi.fn());
const tableMock = vi.hoisted(() => vi.fn());
const savedViewsApiMock = vi.hoisted(() => ({
  listOrderSavedViews: vi.fn(),
  createOrderSavedView: vi.fn(),
  deleteOrderSavedView: vi.fn(),
}));
const shellProfileState = vi.hoisted(() => ({
  exposure: {
    profileId: "operations",
    metadataAuthority: "presentation_only",
    isPresentationOnly: true,
  },
}));

vi.mock("@/components/orders/NewOrderButton", () => ({
  default: () => <a href="/orders/new">New Order</a>,
}));

vi.mock("@/features/orders/OrdersFilters", () => ({
  default: ({
    actions,
    title = "Filter Orders",
    description = "Search orders by status, owner, client, and due window.",
    showAppraiserFilter = true,
  }) => (
    <div data-testid="orders-filters">
      <div>{title}</div>
      {description ? <p>{description}</p> : null}
      {showAppraiserFilter ? <div>Appraiser</div> : null}
      {actions ? <div data-testid="orders-filter-actions">{actions}</div> : null}
    </div>
  ),
}));

vi.mock("@/features/orders/UnifiedOrdersTable", () => ({
  default: (props) => {
    tableMock(props);
    return <div data-testid="orders-table" />;
  },
}));

vi.mock("@/features/queues/queueEvaluator", () => ({
  orderHasQueue: () => false,
}));

vi.mock("@/features/queues/queueSummary", () => ({
  getQueueSummaryById: () => null,
  summarizeOperationalQueues: () => [],
}));

vi.mock("@/lib/hooks/useOrders", () => ({
  useOrdersSummary: useOrdersSummaryMock,
}));

vi.mock("@/lib/api/orderSavedViews", () => savedViewsApiMock);

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () => shellProfileState.exposure,
}));

function renderPage(initialEntries = ["/orders"]) {
  return render(
    <MemoryRouter
      initialEntries={initialEntries}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <OrdersPage />
    </MemoryRouter>,
  );
}

describe("OrdersPage historical access", () => {
  beforeEach(() => {
    shellProfileState.exposure = {
      profileId: "operations",
      metadataAuthority: "presentation_only",
      isPresentationOnly: true,
    };
    useOrdersSummaryMock.mockReturnValue({
      rows: [],
      count: 0,
      loading: false,
      error: null,
    });
    savedViewsApiMock.listOrderSavedViews.mockResolvedValue([]);
    savedViewsApiMock.createOrderSavedView.mockResolvedValue(null);
    savedViewsApiMock.deleteOrderSavedView.mockResolvedValue(true);
    tableMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    useOrdersSummaryMock.mockReset();
    savedViewsApiMock.listOrderSavedViews.mockReset();
    savedViewsApiMock.createOrderSavedView.mockReset();
    savedViewsApiMock.deleteOrderSavedView.mockReset();
    tableMock.mockReset();
  });

  it("does not expose Historical Orders as a secondary Orders page link", () => {
    renderPage();

    expect(screen.queryByRole("link", { name: "Historical Orders" })).not.toBeInTheDocument();
    expect(screen.getByTestId("orders-table")).toBeInTheDocument();
  });

  it("renders the polished Orders hierarchy without changing table behavior", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Orders" })).toBeInTheDocument();
    expect(screen.getByText("Operations Command")).toBeInTheDocument();
    expect(screen.queryByText("Orders workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Workflow actions in table")).not.toBeInTheDocument();
    expect(screen.queryByText("History is read-only")).not.toBeInTheDocument();
    expect(screen.getByText("Filter Orders")).toBeInTheDocument();
    expect(screen.getByText("Search orders by status, owner, client, and due window.")).toBeInTheDocument();
    expect(screen.getByText("Appraiser")).toBeInTheDocument();
    expect(screen.queryByLabelText("Orders context")).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing company order records/i)).not.toBeInTheDocument();
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          search: "",
          statusIn: [],
          queueId: "",
        }),
        rowsOverride: null,
        tableLabel: "Orders",
        tableSummary: "Company order records.",
      }),
    );
  });

  it("renders appraiser Orders as a focused assigned-work list", () => {
    shellProfileState.exposure = {
      role: "appraiser",
      profileId: "my_work",
      navMode: "my_work",
      metadataAuthority: "presentation_only",
      isPresentationOnly: true,
    };

    renderPage([
      "/orders?status=in_review&appraiserId=appraiser-2&reviewerId=reviewer-1&clientId=client-1",
    ]);

    expect(screen.getByRole("heading", { name: "Orders" })).toBeInTheDocument();
    expect(screen.getByText("Orders assigned to you.")).toBeInTheDocument();
    expect(screen.queryByText("Orders Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Operations")).not.toBeInTheDocument();
    expect(screen.queryByText("Operations Command")).not.toBeInTheDocument();
    expect(screen.queryByText("Active workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Workflow actions in table")).not.toBeInTheDocument();
    expect(screen.queryByText("History is read-only")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New Order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Historical Orders" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Saved Views" })).not.toBeInTheDocument();
    expect(screen.getByTestId("orders-filters")).toHaveTextContent("Filters");
    expect(screen.queryByText("Filter Active Orders")).not.toBeInTheDocument();
    expect(screen.queryByText(/Search active operational orders/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Appraiser")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Orders context")).not.toBeInTheDocument();
    expect(screen.getByText("Status: In Review")).toBeInTheDocument();
    expect(screen.getByText("Client: client-1")).toBeInTheDocument();
    expect(screen.queryByText("Appraiser: appraiser-2")).not.toBeInTheDocument();
    expect(screen.queryByText("Reviewer: reviewer-1")).not.toBeInTheDocument();
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          statusIn: ["in_review"],
          appraiserId: "appraiser-2",
          reviewerId: "reviewer-1",
          clientId: "client-1",
        }),
        tableEyebrow: null,
        tableLabel: "Assigned Orders",
        tableSummary: null,
      }),
    );
  });

  it("renders reviewer Orders as a focused review workspace without management utilities", () => {
    shellProfileState.exposure = {
      role: "reviewer",
      profileId: "review_queue",
      navMode: "review_queue",
      metadataAuthority: "presentation_only",
      isPresentationOnly: true,
      appContext: {
        user_id: "reviewer-1",
        display_name: "Pam Reviewer",
        is_reviewer_role: true,
      },
    };

    renderPage([
      "/orders?status=in_review&appraiserId=appraiser-2&reviewerId=reviewer-1&clientId=client-1",
    ]);

    expect(screen.getByRole("heading", { name: "Pam's Orders" })).toBeInTheDocument();
    expect(screen.getByText("Review and track orders assigned to your queue.")).toBeInTheDocument();
    expect(screen.queryByText("Orders Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Operations")).not.toBeInTheDocument();
    expect(screen.queryByText("Operations Command")).not.toBeInTheDocument();
    expect(screen.queryByText("Active workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Workflow actions in table")).not.toBeInTheDocument();
    expect(screen.queryByText("History is read-only")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New Order" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Historical Orders" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Saved Views" })).not.toBeInTheDocument();
    expect(screen.getByText("Filter Orders")).toBeInTheDocument();
    expect(screen.queryByText("Filter Active Orders")).not.toBeInTheDocument();
    expect(screen.queryByText(/Search active operational orders/i)).not.toBeInTheDocument();
    expect(screen.getByText("Appraiser")).toBeInTheDocument();
    expect(screen.queryByLabelText("Orders context")).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing active operational orders/i)).not.toBeInTheDocument();
    expect(screen.getByText("Status: In Review")).toBeInTheDocument();
    expect(screen.getByText("Client: client-1")).toBeInTheDocument();
    expect(screen.getByText("Appraiser: appraiser-2")).toBeInTheDocument();
    expect(screen.getByText("Reviewer: reviewer-1")).toBeInTheDocument();
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          statusIn: ["in_review"],
          appraiserId: "appraiser-2",
          reviewerId: "reviewer-1",
          clientId: "client-1",
        }),
        tableEyebrow: null,
        tableLabel: "Orders",
        tableSummary: null,
      }),
    );
  });

  it("does not add historical counts or extra historical fetches to the active Orders page", () => {
    renderPage();

    expect(screen.queryByText(/historical total/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/archived total/i)).not.toBeInTheDocument();
    expect(useOrdersSummaryMock).toHaveBeenCalled();
    expect(
      useOrdersSummaryMock.mock.calls.every(([filters]) => {
        return !filters.includeArchived && !filters.includeRetiredLifecycle;
      }),
    ).toBe(true);
  });

  it("passes the overdue due-window query into the active orders table filters", () => {
    renderPage(["/orders?due=overdue"]);

    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          dueWindow: "overdue",
        }),
      }),
    );
  });

  it("passes reviewerId URL filters into the active orders table filters", () => {
    renderPage(["/orders?status=in_review&reviewerId=reviewer-1"]);

    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          statusIn: ["in_review"],
          reviewerId: "reviewer-1",
        }),
      }),
    );
  });

  it("renders active filter chips from supported URL state", () => {
    renderPage([
      "/orders?status=in_review&q=123%20Main&clientId=client-1&appraiserId=appraiser-1&reviewerId=reviewer-1&due=overdue&queue=unassigned_orders",
    ]);

    expect(screen.getByLabelText("Order filters")).toBeInTheDocument();
    expect(screen.getByText("Status: In Review")).toBeInTheDocument();
    expect(screen.getByText('Search: "123 Main"')).toBeInTheDocument();
    expect(screen.getByText("Client: client-1")).toBeInTheDocument();
    expect(screen.getByText("Appraiser: appraiser-1")).toBeInTheDocument();
    expect(screen.getByText("Reviewer: reviewer-1")).toBeInTheDocument();
    expect(screen.getByText("Due: Overdue")).toBeInTheDocument();
    expect(screen.getByText("Queue: Unassigned Orders (derived)")).toBeInTheDocument();
    expect(screen.queryByText("Queue-derived view: Unassigned Orders.")).not.toBeInTheDocument();
  });

  it("removes a chip through the governed Orders filter URL path", () => {
    renderPage(["/orders?status=in_review&reviewerId=reviewer-1&page=3"]);

    fireEvent.click(screen.getByRole("button", { name: "Remove Reviewer: reviewer-1 filter" }));

    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          statusIn: ["in_review"],
          reviewerId: "",
          page: 0,
        }),
      }),
    );
    expect(screen.queryByText("Reviewer: reviewer-1")).not.toBeInTheDocument();
    expect(screen.getByText("Status: In Review")).toBeInTheDocument();
  });

  it("clears supported active filters without changing the default active Orders surface", () => {
    renderPage([
      "/orders?status=needs_revisions&q=main&clientId=client-1&appraiserId=appraiser-1&reviewerId=reviewer-1&due=overdue&queue=unassigned_orders&page=4&pageSize=25",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }));

    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          statusIn: [],
          search: "",
          clientId: "",
          appraiserId: "",
          reviewerId: "",
          dueWindow: "",
          queueId: "",
          page: 0,
          pageSize: 25,
        }),
      }),
    );
    expect(screen.queryByLabelText("Order filters")).not.toBeInTheDocument();
  });

  it("keeps default active Orders filters unchanged when no overdue query is present", () => {
    renderPage();

    expect(screen.queryByLabelText("Order filters")).not.toBeInTheDocument();
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          dueWindow: "",
          reviewerId: "",
        }),
      }),
    );
  });

  it("loads and renders saved views in a compact secondary panel", async () => {
    savedViewsApiMock.listOrderSavedViews.mockResolvedValue([
      { id: "view-1", name: "Review queue", filters: { status: "in_review" } },
    ]);

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Saved Views" }));

    expect(savedViewsApiMock.listOrderSavedViews).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: "Review queue" })).toBeInTheDocument();
    expect(screen.getByText("Personal URL presets for this Orders queue.")).toBeInTheDocument();
  });

  it("applies a saved view through governed Orders filter state", async () => {
    savedViewsApiMock.listOrderSavedViews.mockResolvedValue([
      {
        id: "view-1",
        name: "Review queue",
        filters: {
          status: "in_review",
          q: "Main",
          reviewerId: "reviewer-1",
          pageSize: 25,
        },
      },
    ]);

    renderPage(["/orders?page=4&pageSize=15"]);

    fireEvent.click(screen.getByRole("button", { name: "Saved Views" }));
    fireEvent.click(await screen.findByRole("button", { name: "Review queue" }));

    await waitFor(() => {
      expect(tableMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            statusIn: ["in_review"],
            search: "Main",
            reviewerId: "reviewer-1",
            page: 0,
            pageSize: 25,
          }),
        }),
      );
    });
    expect(screen.getByText("Status: In Review")).toBeInTheDocument();
    expect(screen.getByText('Search: "Main"')).toBeInTheDocument();
    expect(screen.getByText("Reviewer: reviewer-1")).toBeInTheDocument();
  });

  it("creates a saved view from allowlisted current filters only", async () => {
    savedViewsApiMock.createOrderSavedView.mockResolvedValue({
      id: "view-created",
      name: "My review queue",
      filters: { status: "in_review" },
    });

    renderPage([
      "/orders?status=in_review&q=main&clientId=client-1&appraiserId=appraiser-1&reviewerId=reviewer-1&due=overdue&queue=unassigned_orders&priority=urgent&page=4&pageSize=25",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Saved Views" }));
    fireEvent.change(screen.getByPlaceholderText("Name current view"), {
      target: { value: "My review queue" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(savedViewsApiMock.createOrderSavedView).toHaveBeenCalledWith("My review queue", {
        status: "in_review",
        q: "main",
        clientId: "client-1",
        appraiserId: "appraiser-1",
        reviewerId: "reviewer-1",
        due: "overdue",
        queue: "unassigned_orders",
        pageSize: 25,
      });
    });

    expect(savedViewsApiMock.createOrderSavedView.mock.calls[0][1]).not.toHaveProperty("priority");
    expect(savedViewsApiMock.createOrderSavedView.mock.calls[0][1]).not.toHaveProperty("page");
    expect(await screen.findByRole("button", { name: "My review queue" })).toBeInTheDocument();
  });

  it("deletes a saved view through the governed wrapper", async () => {
    savedViewsApiMock.listOrderSavedViews.mockResolvedValue([
      { id: "view-1", name: "Review queue", filters: { status: "in_review" } },
    ]);

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Saved Views" }));
    expect(await screen.findByRole("button", { name: "Review queue" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(savedViewsApiMock.deleteOrderSavedView).toHaveBeenCalledWith("view-1");
    });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Review queue" })).not.toBeInTheDocument();
    });
  });

  it("rejects unsupported saved filters without applying hidden state", async () => {
    savedViewsApiMock.listOrderSavedViews.mockResolvedValue([
      {
        id: "view-1",
        name: "Unsafe view",
        filters: { status: "in_review", includeArchived: true },
      },
    ]);

    renderPage(["/orders?status=new&pageSize=15"]);

    fireEvent.click(screen.getByRole("button", { name: "Saved Views" }));
    fireEvent.click(await screen.findByRole("button", { name: "Unsafe view" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Saved view contains unsupported filters.");
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          statusIn: ["new"],
          pageSize: 15,
        }),
      }),
    );
    expect(screen.getByText("Status: New")).toBeInTheDocument();
    expect(screen.queryByText("Status: In Review")).not.toBeInTheDocument();
  });

  it("does not add order mutation controls to the saved views panel", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Saved Views" }));

    expect(screen.queryByRole("button", { name: /archive order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /void order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /complete/i })).not.toBeInTheDocument();
  });
});
