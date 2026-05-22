// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OrdersPage from "../Orders";

const useOrdersSummaryMock = vi.hoisted(() => vi.fn());
const tableMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/orders/NewOrderButton", () => ({
  default: () => <a href="/orders/new">New Order</a>,
}));

vi.mock("@/features/orders/OrdersFilters", () => ({
  default: () => <div data-testid="orders-filters" />,
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
    useOrdersSummaryMock.mockReturnValue({
      rows: [],
      count: 0,
      loading: false,
      error: null,
    });
    tableMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    useOrdersSummaryMock.mockReset();
    tableMock.mockReset();
  });

  it("exposes Historical Orders as a secondary Orders page link", () => {
    renderPage();

    const link = screen.getByRole("link", { name: "Historical Orders" });

    expect(link).toHaveAttribute("href", "/orders/historical");
    expect(link).toHaveClass("border-slate-200", "text-slate-600");
    expect(screen.getByTestId("orders-table")).toBeInTheDocument();
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

    expect(screen.getByLabelText("Active order filters")).toBeInTheDocument();
    expect(screen.getByText("Status: In Review")).toBeInTheDocument();
    expect(screen.getByText('Search: "123 Main"')).toBeInTheDocument();
    expect(screen.getByText("Client: client-1")).toBeInTheDocument();
    expect(screen.getByText("Appraiser: appraiser-1")).toBeInTheDocument();
    expect(screen.getByText("Reviewer: reviewer-1")).toBeInTheDocument();
    expect(screen.getByText("Due: Overdue")).toBeInTheDocument();
    expect(screen.getByText("Queue: Unassigned Orders (derived)")).toBeInTheDocument();
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
    expect(screen.queryByLabelText("Active order filters")).not.toBeInTheDocument();
  });

  it("keeps default active Orders filters unchanged when no overdue query is present", () => {
    renderPage();

    expect(screen.queryByLabelText("Active order filters")).not.toBeInTheDocument();
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          dueWindow: "",
          reviewerId: "",
        }),
      }),
    );
  });
});
