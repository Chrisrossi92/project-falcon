// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const summaryState = vi.hoisted(() => ({
  current: null,
}));
const unifiedOrdersTableMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/useDashboardSummary", () => ({
  useDashboardSummary: () => summaryState.current,
}));

vi.mock("@/components/dashboard/DashboardCalendarPanel", () => ({
  default: (props) => (
    <div data-testid="my-work-calendar">
      calendar orders: {props.orders?.length ?? 0}; fallback: {String(props.useFallbackLoader)}
    </div>
  ),
}));

vi.mock("@/features/orders/UnifiedOrdersTable", () => ({
  default: (props) => {
    unifiedOrdersTableMock(props);
    return (
      <div data-testid="unified-orders-table">
        orders table rows: {props.rowsOverride?.length ?? 0}
      </div>
    );
  },
}));

const { default: MyWorkPage } = await import("../MyWorkPage.jsx");

function dateFromToday(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function renderMyWorkPage() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <MyWorkPage />
    </MemoryRouter>,
  );
}

describe("MyWorkPage", () => {
  afterEach(() => {
    cleanup();
    unifiedOrdersTableMock.mockClear();
  });

  it("renders a dedicated appraiser execution surface from existing dashboard orders", () => {
    summaryState.current = {
      role: "appraiser",
      isAdmin: false,
      isReviewer: false,
      isAppraiser: true,
      loading: false,
      appContext: {
        company_name: "Continental",
        display_name: "Chris Rossi",
      },
      ordersRows: [
        {
          id: "assigned-1",
          order_number: "CF-1001",
          status: "in_progress",
          final_due_date: dateFromToday(2),
          site_visit_at: dateFromToday(1),
        },
        {
          id: "assigned-2",
          order_number: "CF-1002",
          status: "needs_revisions",
          final_due_date: dateFromToday(-1),
        },
      ],
    };

    renderMyWorkPage();

    expect(screen.getByRole("heading", { name: "Chris's Work", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Continental")).toBeInTheDocument();
    expect(screen.getByText("Work View")).toBeInTheDocument();
    expect(screen.getAllByText("Staff Appraiser").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active Orders").length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "My Work schedule pressure" })).toBeInTheDocument();
    expect(screen.getByText("Site Visits & Due Dates")).toBeInTheDocument();
    expect(screen.getByText("calendar orders: 2; fallback: false")).toBeInTheDocument();

    const activeOrdersSurface = screen.getByRole("region", { name: "My Work active orders" });
    const schedulePressure = screen.getByRole("region", { name: "My Work schedule pressure" });
    expect(
      schedulePressure.compareDocumentPosition(activeOrdersSurface) &
        schedulePressure.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByTestId("unified-orders-table")).toHaveTextContent("orders table rows: 2");
    expect(unifiedOrdersTableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "appraiser",
        rowsOverride: summaryState.current.ordersRows,
        pageSize: 10,
        scope: "dashboard",
      }),
    );
    expect(screen.queryByRole("region", { name: "My Work preview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Urgent / Overdue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Due Soon" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Revisions Required" })).not.toBeInTheDocument();
  });

  it("does not present assigned rows as My Work for non-appraiser role context", () => {
    summaryState.current = {
      role: "owner",
      isAdmin: true,
      isReviewer: false,
      isAppraiser: false,
      loading: false,
      appContext: {
        company_name: "Continental",
      },
      ordersRows: [
        {
          id: "owner-visible-order",
          order_number: "CF-OWNER",
          status: "in_progress",
        },
      ],
    };

    renderMyWorkPage();

    expect(
      screen.getByRole("heading", { name: "Staff appraiser workspace" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "My Work schedule pressure" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "My Work preview" })).not.toBeInTheDocument();
    expect(unifiedOrdersTableMock).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Open Operations Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Open Orders" })).toHaveAttribute("href", "/orders");
  });
});
