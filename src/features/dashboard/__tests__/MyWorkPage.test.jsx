// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const summaryState = vi.hoisted(() => ({
  current: null,
}));

vi.mock("@/lib/hooks/useDashboardSummary", () => ({
  useDashboardSummary: () => summaryState.current,
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
  });

  it("renders a dedicated appraiser execution surface from existing dashboard rows", () => {
    summaryState.current = {
      role: "appraiser",
      isAdmin: false,
      isReviewer: false,
      isAppraiser: true,
      loading: false,
      appContext: {
        company_name: "Continental",
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

    expect(screen.getByRole("heading", { name: "My Work", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Continental")).toBeInTheDocument();
    expect(screen.getByText("Assigned Rows")).toBeInTheDocument();

    const workSurface = screen.getByRole("region", { name: "My Work preview" });
    expect(within(workSurface).getByRole("region", { name: "Priority Work" })).toBeInTheDocument();
    expect(within(workSurface).getByRole("region", { name: "Urgent / Overdue" })).toBeInTheDocument();
    expect(within(workSurface).getByRole("region", { name: "Due Soon" })).toBeInTheDocument();
    expect(
      within(workSurface).getByRole("region", { name: "Revisions Required" }),
    ).toBeInTheDocument();
    expect(within(workSurface).getAllByRole("link", { name: "CF-1001" })[0]).toHaveAttribute(
      "href",
      "/orders/assigned-1",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
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
    expect(screen.queryByRole("region", { name: "My Work preview" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Operations Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Open Orders" })).toHaveAttribute("href", "/orders");
  });
});
