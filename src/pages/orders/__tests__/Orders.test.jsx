// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

  it("keeps default active Orders filters unchanged when no overdue query is present", () => {
    renderPage();

    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          dueWindow: "",
        }),
      }),
    );
  });
});
