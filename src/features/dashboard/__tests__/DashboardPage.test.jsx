// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const summaryState = vi.hoisted(() => ({
  current: null,
}));

const permissionState = vi.hoisted(() => ({
  settingsView: false,
  teamAccess: true,
  orderRead: true,
}));

const setupContextState = vi.hoisted(() => ({
  current: {
    context: {
      active_member_count: 2,
    },
    loading: false,
    error: null,
    permissionDenied: false,
    refetch: vi.fn(),
  },
}));

const tableMock = vi.hoisted(() => vi.fn());
const calendarMock = vi.hoisted(() => vi.fn());
const DOCUMENT_POSITION_FOLLOWING = 4;

vi.mock("@/lib/hooks/useDashboardSummary", () => ({
  useDashboardSummary: () => summaryState.current,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useCan: (permissionKey) => {
    const key = String(permissionKey || "");
    const allowed =
      key === "users.read" ? permissionState.teamAccess : permissionState.settingsView;

    return {
      allowed,
      loading: false,
      error: null,
      permissionKeys: allowed ? [key] : [],
      reload: vi.fn(),
    };
  },
  useCanAny: () => ({
    allowed: permissionState.orderRead,
    loading: false,
    error: null,
    permissionKeys: permissionState.orderRead ? ["orders.read.all"] : [],
    reload: vi.fn(),
  }),
}));

vi.mock("@/features/company-setup/useCompanySetupContext", () => ({
  useCompanySetupContext: () => setupContextState.current,
}));

vi.mock("@/features/orders/UnifiedOrdersTable", () => ({
  default: (props) => {
    tableMock(props);
    return (
      <div data-testid="unified-orders-table">
        <div>rows: {props.rowsOverride?.length ?? 0}</div>
      </div>
    );
  },
}));

vi.mock("@/components/dashboard/DashboardCalendarPanel", () => ({
  default: (props) => {
    calendarMock(props);
    return <div data-testid="dashboard-calendar">calendar rows: {props.orders?.length ?? 0}</div>;
  },
}));

const { default: DashboardPage } = await import("../DashboardPage.jsx");

function dueDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function buildSummary(overrides = {}) {
  return {
    role: "owner",
    isAdmin: true,
    isReviewer: false,
    loading: false,
    tableFilters: {},
    userId: "owner-user",
    appContext: {
      current_company_id: "company-1",
      company_name: "Falcon Appraisals",
      has_current_company_membership: true,
      is_owner: true,
      is_admin_role: true,
    },
    orders: {
      count: 4,
      inProgress: 1,
      dueIn7: 2,
      inReview: 1,
      needsRevisions: 1,
      overdue: 1,
      inspectedAwaitingReport: 1,
      dueToClient2: 1,
    },
    ordersRows: [
      {
        id: "order-new",
        order_number: "1001",
        status: "new",
        appraiser_id: "appraiser-1",
        appraiser_name: "Appraiser One",
        final_due_date: dueDate(-1),
      },
      {
        id: "order-review",
        order_number: "1002",
        status: "in_review",
        reviewer_id: "reviewer-1",
        reviewer_name: "Reviewer One",
        final_due_date: dueDate(1),
      },
      {
        id: "order-approval",
        order_number: "1003",
        status: "pending_final_approval",
        appraiser_id: "appraiser-2",
        final_due_date: dueDate(5),
      },
      {
        id: "order-routine",
        order_number: "1004",
        status: "in_progress",
        appraiser_id: "appraiser-3",
        final_due_date: dueDate(14),
      },
      {
        id: "order-revisions",
        order_number: "1005",
        status: "needs_revisions",
        appraiser_id: "appraiser-4",
        appraiser_name: "Appraiser Four",
        final_due_date: dueDate(3),
      },
      {
        id: "order-ready",
        order_number: "1006",
        status: "ready_for_client",
        reviewer_id: "reviewer-2",
        reviewer_name: "Reviewer Two",
        final_due_date: dueDate(4),
      },
    ],
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage operational polish", () => {
  beforeEach(() => {
    summaryState.current = buildSummary();
    permissionState.settingsView = false;
    permissionState.teamAccess = true;
    permissionState.orderRead = true;
    setupContextState.current = {
      context: {
        active_member_count: 2,
      },
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };
    tableMock.mockClear();
    calendarMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the polished operational sections from existing summary data", () => {
    renderDashboard();

    const calendarHeading = screen.getByText("Calendar");
    const ordersHeading = screen.getByText("Active Worklist");
    const statusHeading = screen.getByText("Status");
    const kpiCards = screen.getByRole("region", { name: /operational kpi cards/i });

    expect(statusHeading).toBeInTheDocument();
    expect(calendarHeading).toBeInTheDocument();
    expect(ordersHeading).toBeInTheDocument();
    expect(within(kpiCards).getByText("Active Orders")).toBeInTheDocument();
    expect(within(kpiCards).getByText("Current operational queue")).toBeInTheDocument();
    expect(within(kpiCards).getByText("In Review")).toBeInTheDocument();
    expect(within(kpiCards).getByText("Orders awaiting review clearance")).toBeInTheDocument();
    expect(within(kpiCards).getByText("Needs Revisions")).toBeInTheDocument();
    expect(within(kpiCards).getByText("Returned for report updates")).toBeInTheDocument();
    expect(within(kpiCards).getByText("Overdue Orders")).toBeInTheDocument();
    expect(within(kpiCards).getByText("Active orders past final due date")).toBeInTheDocument();
    expect(within(kpiCards).getAllByText("1")).toHaveLength(3);
    expect(within(kpiCards).queryByRole("button")).not.toBeInTheDocument();
    const kpiLinks = within(kpiCards).getAllByRole("link");
    expect(kpiLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/orders",
      "/orders?status=in_review",
      "/orders?status=needs_revisions",
      "/orders?due=overdue",
    ]);
    expect(within(kpiCards).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Priority Worklist Preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Workload Snapshot")).not.toBeInTheDocument();
    expect(screen.queryByText("Review Bottlenecks")).not.toBeInTheDocument();
    expect(screen.queryByText("Schedule")).not.toBeInTheDocument();
    expect(screen.queryByText("Schedule pressure")).not.toBeInTheDocument();
    expect(screen.queryByText("Due dates and site visits.")).not.toBeInTheDocument();
    expect(screen.queryByText(/pressure/i)).not.toBeInTheDocument();
    expect(calendarHeading.compareDocumentPosition(ordersHeading)).toBe(DOCUMENT_POSITION_FOLLOWING);
    expect(calendarHeading.compareDocumentPosition(statusHeading)).toBe(DOCUMENT_POSITION_FOLLOWING);
    expect(ordersHeading.compareDocumentPosition(statusHeading)).toBe(DOCUMENT_POSITION_FOLLOWING);

    for (const label of ["New", "In Progress", "In Review", "Needs Revisions", "Ready for Client"]) {
      expect(screen.getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
    const statusFilters = screen.getByRole("group", { name: /status filters/i });
    expect(statusFilters).toHaveClass("grid-cols-1");
    expect(statusFilters).not.toHaveClass("grid-cols-2");
    expect(within(screen.getByRole("button", { name: /new/i })).getByText("1")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /ready for client/i })).getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new/i })).toHaveClass("bg-blue-50");
    expect(screen.getByRole("button", { name: /in review/i })).toHaveClass("bg-indigo-50");
    expect(screen.queryByText("Operational Attention")).not.toBeInTheDocument();
    const workload = screen.getByRole("region", { name: /workload visibility/i });
    expect(within(workload).getByText("Workload Visibility")).toBeInTheDocument();
    expect(within(workload).getByText("Current active order ownership for coordination.")).toBeInTheDocument();
    expect(within(workload).getByText("Assigned Work")).toBeInTheDocument();
    expect(within(workload).getByText("Review Queue")).toBeInTheDocument();
    expect(within(workload).getByText("Unassigned Active")).toBeInTheDocument();
    expect(within(workload).getByText("Revision Follow-Up")).toBeInTheDocument();
    expect(within(workload).queryByRole("button")).not.toBeInTheDocument();
    expect(within(workload).getByRole("link", { name: "Review Queue" })).toHaveAttribute(
      "href",
      "/orders?status=in_review",
    );
    expect(within(workload).getByRole("link", { name: "Unassigned Active" })).toHaveAttribute(
      "href",
      "/orders?queue=unassigned_orders",
    );
    expect(within(workload).getByRole("link", { name: "Revision Follow-Up" })).toHaveAttribute(
      "href",
      "/orders?status=needs_revisions",
    );
    const readiness = screen.getByRole("region", { name: /operational readiness/i });
    expect(within(readiness).getByText("Operational Readiness")).toBeInTheDocument();
    expect(within(readiness).getByText("Read-only")).toBeInTheDocument();
    expect(within(readiness).getByText("Current company")).toBeInTheDocument();
    expect(within(readiness).getByText("Falcon Appraisals")).toBeInTheDocument();
    expect(within(readiness).getByText("Owner/admin access")).toBeInTheDocument();
    expect(within(readiness).getByText("Management dashboard access is active")).toBeInTheDocument();
    expect(within(readiness).getByText("Team Access")).toBeInTheDocument();
    expect(within(readiness).getByText("Member management route is available")).toBeInTheDocument();
    expect(within(readiness).getByText("Additional team member")).toBeInTheDocument();
    expect(within(readiness).getByText("2 active members")).toBeInTheDocument();
    expect(within(readiness).getByText("Dashboard KPIs")).toBeInTheDocument();
    expect(within(readiness).getByText("Active metrics read path is available")).toBeInTheDocument();
    expect(within(readiness).getByText("Historical Orders")).toBeInTheDocument();
    expect(within(readiness).getByText("Saved Views")).toBeInTheDocument();
    expect(within(readiness).getByText("Print Packet")).toBeInTheDocument();
    expect(within(readiness).getByText("Available from authorized Order Detail")).toBeInTheDocument();
    expect(within(readiness).queryByRole("button")).not.toBeInTheDocument();
    expect(within(readiness).queryByText(/100%/i)).not.toBeInTheDocument();
    expect(within(readiness).getByRole("link", { name: /team access/i })).toHaveAttribute(
      "href",
      "/users",
    );
    expect(within(readiness).getByRole("link", { name: /historical orders/i })).toHaveAttribute(
      "href",
      "/orders/historical",
    );
    expect(within(readiness).getByRole("link", { name: /saved views/i })).toHaveAttribute(
      "href",
      "/orders",
    );

    expect(calendarMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ orders: summaryState.current.ordersRows }),
    );
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rowsOverride: summaryState.current.ordersRows,
        scope: "dashboard",
      }),
    );
  });

  it("filters the existing dashboard rows when a status card is selected and cleared", () => {
    renderDashboard();

    const inReview = screen.getByRole("button", { name: /in review/i });
    fireEvent.click(inReview);

    expect(inReview).toHaveAttribute("aria-pressed", "true");
    expect(inReview).toHaveClass("bg-indigo-100");
    expect(inReview).toHaveClass("translate-x-0.5");

    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rowsOverride: [expect.objectContaining({ id: "order-review" })],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /clear filter/i }));

    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rowsOverride: summaryState.current.ordersRows,
      }),
    );
  });

  it("renders clean empty states when loaded dashboard rows have no action signals", () => {
    setupContextState.current = {
      context: {
        active_member_count: 1,
      },
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };
    summaryState.current = buildSummary({
      orders: {
        count: 0,
        inProgress: 0,
        dueIn7: 0,
        inReview: 0,
        needsRevisions: 0,
        overdue: 0,
        inspectedAwaitingReport: 0,
        dueToClient2: 0,
      },
      ordersRows: [],
    });

    renderDashboard();

    expect(within(screen.getByRole("button", { name: /new/i })).getByText("0")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /ready for client/i })).getByText("0")).toBeInTheDocument();
    const kpiCards = screen.getByRole("region", { name: /operational kpi cards/i });
    expect(within(kpiCards).getAllByText("0")).toHaveLength(4);
    const workload = screen.getByRole("region", { name: /workload visibility/i });
    expect(within(workload).getByText("No assigned appraiser work")).toBeInTheDocument();
    expect(within(workload).getByText("No assigned review work")).toBeInTheDocument();
    expect(within(workload).getByText("No unassigned active orders")).toBeInTheDocument();
    expect(within(workload).getByText("No revision follow-up")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view order/i })).not.toBeInTheDocument();
    const readiness = screen.getByRole("region", { name: /operational readiness/i });
    expect(within(readiness).getByText("Solo-owner operation is allowed")).toBeInTheDocument();
    expect(within(readiness).getByText("Available after an order exists")).toBeInTheDocument();
    expect(within(readiness).getByText("Neutral")).toBeInTheDocument();
  });

  it("keeps unverified readiness states neutral and avoids mutation controls", () => {
    permissionState.teamAccess = false;
    permissionState.orderRead = false;
    setupContextState.current = {
      context: null,
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };
    summaryState.current = buildSummary({
      appContext: {
        current_company_id: null,
        company_name: null,
        has_current_company_membership: false,
      },
      ordersRows: [],
    });

    renderDashboard();

    const readiness = screen.getByRole("region", { name: /operational readiness/i });
    expect(within(readiness).getByText("Company context has not resolved yet")).toBeInTheDocument();
    expect(within(readiness).getByText("Not verified")).toBeInTheDocument();
    expect(within(readiness).getByText("Team Access requires users.read")).toBeInTheDocument();
    expect(within(readiness).getAllByText("Needs permission")).toHaveLength(3);
    expect(within(readiness).getByText("Member count is not verified")).toBeInTheDocument();
    expect(within(readiness).getByText("Available after an order exists")).toBeInTheDocument();
    expect(within(readiness).queryByRole("button")).not.toBeInTheDocument();
    expect(within(readiness).queryByText(/complete/i)).not.toBeInTheDocument();
    expect(within(readiness).queryByText(/100%/i)).not.toBeInTheDocument();
  });

  it("derives workload visibility from active dashboard rows and excludes retired rows", () => {
    summaryState.current = buildSummary({
      ordersRows: [
        {
          id: "active-a1",
          order_number: "2001",
          status: "new",
          appraiser_id: "appraiser-1",
          appraiser_name: "Appraiser One",
        },
        {
          id: "active-a2",
          order_number: "2002",
          status: "in_progress",
          appraiser_id: "appraiser-1",
          appraiser_name: "Appraiser One",
        },
        {
          id: "active-a3",
          order_number: "2003",
          status: "needs_revisions",
          appraiser_id: "appraiser-2",
          appraiser_name: "Appraiser Two",
        },
        {
          id: "review-r1",
          order_number: "2004",
          status: "in_review",
          reviewer_id: "reviewer-1",
          reviewer_name: "Reviewer One",
        },
        {
          id: "review-r2",
          order_number: "2005",
          status: "in_review",
          reviewer_id: "reviewer-1",
          reviewer_name: "Reviewer One",
        },
        {
          id: "unassigned-appraiser",
          order_number: "2006",
          status: "new",
        },
        {
          id: "unassigned-reviewer",
          order_number: "2007",
          status: "in_review",
        },
        {
          id: "archived-row",
          order_number: "2008",
          status: "new",
          is_archived: true,
          appraiser_id: "retired-appraiser",
          appraiser_name: "Retired Appraiser",
        },
        {
          id: "cancelled-row",
          order_number: "2009",
          status: "cancelled",
          appraiser_id: "cancelled-appraiser",
          appraiser_name: "Cancelled Appraiser",
        },
        {
          id: "voided-row",
          order_number: "2010",
          status: "voided",
          reviewer_id: "voided-reviewer",
          reviewer_name: "Voided Reviewer",
        },
        {
          id: "completed-row",
          order_number: "2011",
          status: "completed",
          appraiser_id: "completed-appraiser",
          appraiser_name: "Completed Appraiser",
        },
      ],
    });

    renderDashboard();

    const workload = screen.getByRole("region", { name: /workload visibility/i });
    expect(within(workload).getByText("Appraiser One")).toBeInTheDocument();
    expect(within(workload).getAllByText("Appraiser Two")).toHaveLength(2);
    expect(within(workload).getByText("Reviewer One")).toBeInTheDocument();
    expect(within(workload).getByText("Needs assignment review")).toBeInTheDocument();
    expect(within(workload).getAllByText("2")).toHaveLength(3);
    expect(within(workload).getAllByText("1")).toHaveLength(2);
    expect(within(workload).queryByText("Retired Appraiser")).not.toBeInTheDocument();
    expect(within(workload).queryByText("Cancelled Appraiser")).not.toBeInTheDocument();
    expect(within(workload).queryByText("Voided Reviewer")).not.toBeInTheDocument();
    expect(within(workload).queryByText("Completed Appraiser")).not.toBeInTheDocument();
    expect(within(workload).getByRole("link", { name: "Appraiser One" })).toHaveAttribute(
      "href",
      "/orders?appraiserId=appraiser-1",
    );
    expect(within(workload).getAllByRole("link", { name: "Appraiser Two" }).map((link) => link.getAttribute("href"))).toEqual([
      "/orders?appraiserId=appraiser-2",
      "/orders?status=needs_revisions&appraiserId=appraiser-2",
    ]);
    expect(within(workload).getByRole("link", { name: "Reviewer One" })).toHaveAttribute(
      "href",
      "/orders?status=in_review&reviewerId=reviewer-1",
    );
    expect(within(workload).queryByRole("button")).not.toBeInTheDocument();
  });

  it("uses role-specific worklist copy without changing dashboard gate behavior", () => {
    summaryState.current = buildSummary({
      role: "reviewer",
      isAdmin: false,
      isReviewer: true,
      userId: "reviewer-1",
      orders: {
        count: 1,
        inProgress: 0,
        dueIn7: 1,
        inReview: 1,
        needsRevisions: 0,
        overdue: 0,
        inspectedAwaitingReport: 0,
        dueToClient2: 1,
      },
    });

    renderDashboard();

    expect(screen.getByText("Reviewer Dashboard")).toBeInTheDocument();
    expect(screen.getByText("My Review Work")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /operational readiness/i })).not.toBeInTheDocument();
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "reviewerQueue",
        reviewerId: "reviewer-1",
        scope: "dashboard",
      }),
    );
  });
});
