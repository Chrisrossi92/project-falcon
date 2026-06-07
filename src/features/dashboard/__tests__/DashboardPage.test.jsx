// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";

const summaryState = vi.hoisted(() => ({
  current: null,
}));
const useDashboardSummaryMock = vi.hoisted(() => vi.fn());

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
  useDashboardSummary: useDashboardSummaryMock,
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

const operationsShell = Object.freeze({
  profileId: "operations",
  metadataAuthority: "presentation_only",
  profile: Object.freeze({
    id: "operations",
    dashboardTitle: "Operations Dashboard",
    metadataAuthority: "presentation_only",
  }),
});

const myWorkShell = Object.freeze({
  profileId: "my_work",
  metadataAuthority: "presentation_only",
  profile: Object.freeze({
    id: "my_work",
    dashboardTitle: "My Work",
    metadataAuthority: "presentation_only",
  }),
});

const reviewQueueShell = Object.freeze({
  profileId: "review_queue",
  metadataAuthority: "presentation_only",
  profile: Object.freeze({
    id: "review_queue",
    dashboardTitle: "Review Queue",
    metadataAuthority: "presentation_only",
  }),
});

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
    operationsScope: "internal_operations",
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
    reviewerHybridAppraisal: {
      count: 0,
      rows: [],
      filters: null,
    },
    ...overrides,
  };
}

function renderDashboard(shellProfilePresentation, props = {}) {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <DashboardPage shellProfilePresentation={shellProfilePresentation} {...props} />
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
    useDashboardSummaryMock.mockImplementation(() => summaryState.current);
    tableMock.mockClear();
    calendarMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    useDashboardSummaryMock.mockReset();
  });

  it("renders the polished operational sections from existing summary data", () => {
    renderDashboard(operationsShell, { operationsMode: OPERATIONS_MODES.INTERNAL_OPERATIONS });

    expect(screen.getByText("Operations Command")).toBeInTheDocument();
    expect(screen.getByText("Appraisal Production Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Track active work, review handoffs, due pressure, and workflow coordination."),
    ).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Falcon Appraisals")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-identity-badge")).toHaveTextContent("Internal");
    expect(screen.getByText("Environment")).toBeInTheDocument();
    expect(screen.getByText("Continental Internal Operations")).toBeInTheDocument();

    const calendarHeading = screen.getByText("Calendar");
    const ordersHeading = screen.getByText("Active Worklist");
    const statusHeading = screen.getByText("Status");

    expect(statusHeading).toBeInTheDocument();
    expect(calendarHeading).toBeInTheDocument();
    expect(ordersHeading).toBeInTheDocument();
    expect(screen.queryByText("Priority Worklist Preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Workload Snapshot")).not.toBeInTheDocument();
    expect(screen.queryByText("Review Bottlenecks")).not.toBeInTheDocument();
    expect(screen.queryByText("Schedule")).not.toBeInTheDocument();
    expect(screen.queryByText("Schedule pressure")).not.toBeInTheDocument();
    expect(screen.queryByText("Due dates and site visits.")).not.toBeInTheDocument();
    expect(calendarHeading.compareDocumentPosition(statusHeading)).toBe(DOCUMENT_POSITION_FOLLOWING);
    expect(statusHeading.compareDocumentPosition(ordersHeading)).toBe(DOCUMENT_POSITION_FOLLOWING);
    expect(screen.queryByText("Operational Support")).not.toBeInTheDocument();
    expect(screen.queryByText("Secondary context from existing dashboard reads.")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /operational kpi cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /workload visibility/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /operational readiness/i })).not.toBeInTheDocument();

    for (const label of ["New", "In Progress", "In Review", "Needs Revisions", "Ready for Client"]) {
      expect(screen.getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
    const statusFilters = screen.getByRole("group", { name: /status filters/i });
    expect(statusFilters).toHaveClass("xl:grid-cols-5");
    expect(statusFilters).toHaveClass("sm:grid-cols-2");
    expect(statusFilters).not.toHaveClass("grid-cols-1");
    expect(within(screen.getByRole("button", { name: /new/i })).getByText("1")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /ready for client/i })).getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new/i })).toHaveClass("bg-blue-50");
    expect(screen.getByRole("button", { name: /in review/i })).toHaveClass("bg-indigo-50");
    expect(screen.queryByText("Operational Attention")).not.toBeInTheDocument();

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

  it("renders AMC Operations dashboard context with AMC-scoped dashboard reads", () => {
    summaryState.current = buildSummary({ operationsScope: "amc_operations" });

    renderDashboard(operationsShell, { operationsMode: OPERATIONS_MODES.AMC_OPERATIONS });

    expect(
      screen.getByRole("heading", { name: "Falcon AMC Dashboard", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track procurement queues, vendor response, client orders, and SLA pressure.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("workspace-identity-badge")).toHaveTextContent("AMC");
    expect(screen.getByText("Environment")).toBeInTheDocument();
    expect(screen.getByText("Falcon AMC")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Appraisal Production Dashboard", level: 1 })).toBeNull();

    expect(calendarMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ orders: summaryState.current.ordersRows }),
    );
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rowsOverride: summaryState.current.ordersRows,
        operationsScope: "amc_operations",
        scope: "dashboard",
      }),
    );
    expect(useDashboardSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        operationsMode: OPERATIONS_MODES.AMC_OPERATIONS,
      }),
    );
  });

  it("keeps the current owner/admin dashboard support copy outside operations shell presentation", () => {
    renderDashboard(myWorkShell);

    expect(
      screen.getByRole("heading", { name: "Operations Dashboard", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "My Work preview" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Calendar, active orders, and workflow handoffs for the current company."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Track active work, review handoffs, due pressure, and workflow coordination."),
    ).not.toBeInTheDocument();
  });

  it("filters the existing dashboard rows when a status card is selected and cleared", () => {
    renderDashboard();

    const inReview = screen.getByRole("button", { name: /in review/i });
    fireEvent.click(inReview);

    expect(inReview).toHaveAttribute("aria-pressed", "true");
    expect(inReview).toHaveClass("bg-indigo-100");
    expect(inReview).toHaveClass("ring-2");

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
    expect(screen.queryByRole("region", { name: /operational kpi cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /workload visibility/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /operational readiness/i })).not.toBeInTheDocument();
  });

  it("does not render operational readiness diagnostics for incomplete admin context", () => {
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

    expect(screen.queryByRole("region", { name: /operational readiness/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Company context has not resolved yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Team Access requires users.read")).not.toBeInTheDocument();
    expect(screen.queryByText("Member count is not verified")).not.toBeInTheDocument();
  });

  it("mounts the appraiser workbench preview as a secondary panel for my_work shell metadata", () => {
    summaryState.current = buildSummary({
      role: "appraiser",
      isAdmin: false,
      isReviewer: false,
      userId: "appraiser-1",
      orders: {
        count: 2,
        inProgress: 1,
        dueIn7: 1,
        inReview: 0,
        needsRevisions: 1,
        overdue: 0,
        inspectedAwaitingReport: 0,
        dueToClient2: 0,
      },
    });

    renderDashboard(myWorkShell);

    expect(
      screen.getByRole("heading", { name: "Operations Dashboard", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Calendar context, assigned orders, and revision follow-up.")).toBeInTheDocument();
    expect(screen.getAllByText("Appraiser")).toHaveLength(2);
    expect(screen.getByText("My Assignments")).toBeInTheDocument();
    const myWorkPreview = screen.getByRole("region", { name: "My Work summary" });
    expect(within(myWorkPreview).getByRole("heading", { name: "My Work" })).toBeInTheDocument();
    expect(within(myWorkPreview).getByRole("link", { name: "Open My Work" })).toHaveAttribute(
      "href",
      "/my-work",
    );
    expect(within(myWorkPreview).queryByRole("region", { name: "Priority Work" })).toBeNull();
    expect(within(myWorkPreview).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Review Queue preview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /operational readiness/i })).not.toBeInTheDocument();
    expect(calendarMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ orders: summaryState.current.ordersRows }),
    );
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: undefined,
        role: "appraiser",
        rowsOverride: summaryState.current.ordersRows,
        scope: "dashboard",
      }),
    );
  });

  it("renders the reviewer dashboard as a focused review workspace", () => {
    summaryState.current = buildSummary({
      role: "reviewer",
      isAdmin: false,
      isReviewer: true,
      userId: "reviewer-1",
      appContext: {
        current_company_id: "company-1",
        company_name: "Falcon Appraisals",
        has_current_company_membership: true,
        display_name: "Pam Reviewer",
        is_owner: false,
        is_admin_role: false,
      },
      orders: {
        count: 2,
        inProgress: 0,
        dueIn7: 1,
        inReview: 1,
        needsRevisions: 1,
        overdue: 0,
        inspectedAwaitingReport: 0,
        dueToClient2: 1,
      },
    });

    renderDashboard(reviewQueueShell);

    expect(
      screen.getByRole("heading", { name: "Pam's Reviews", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Active review work, revision follow-up, and calendar context for your queue."),
    ).toBeInTheDocument();
    expect(screen.getByText("Reviewer")).toBeInTheDocument();
    expect(screen.getByText("My Review Work")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Review status filters" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /In Review 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Needs Revisions 1/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Resubmitted/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Operational Support")).not.toBeInTheDocument();
    expect(screen.queryByText("Workload Visibility")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Review Queue preview" })).not.toBeInTheDocument();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "My Work preview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /operational readiness/i })).not.toBeInTheDocument();
    expect(calendarMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ orders: summaryState.current.ordersRows }),
    );
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "reviewerQueue",
        reviewerId: "reviewer-1",
        rowsOverride: summaryState.current.ordersRows,
        scope: "dashboard",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Needs Revisions 1/i }));

    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rowsOverride: [
          expect.objectContaining({
            id: "order-revisions",
            status: "needs_revisions",
          }),
        ],
      }),
    );
  });

  it("lets reviewer-primary appraiser-secondary users switch the dashboard table to appraisal work", () => {
    summaryState.current = buildSummary({
      role: "reviewer",
      isAdmin: false,
      isReviewer: true,
      userId: "pam-user",
      appContext: {
        current_company_id: "company-1",
        company_name: "Falcon Appraisals",
        has_current_company_membership: true,
        display_name: "Pam Reviewer",
        is_owner: false,
        is_admin_role: false,
        is_reviewer_role: true,
        is_appraiser_role: true,
        primary_role_key: "reviewer",
        role_keys: ["reviewer", "appraiser"],
      },
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
      ordersRows: [
        {
          id: "review-order",
          order_number: "1002",
          status: "in_review",
          reviewer_id: "pam-user",
          reviewer_name: "Pam Reviewer",
          final_due_date: dueDate(1),
        },
      ],
      reviewerHybridAppraisal: {
        count: 2,
        rows: [
          { id: "appraisal-order", order_number: "1007", status: "in_progress", appraiser_id: "pam-user" },
          { id: "revision-order", order_number: "1008", status: "needs_revisions", appraiser_id: "pam-user" },
        ],
        filters: {
          appraiserId: "pam-user",
          assignedAppraiserId: "pam-user",
          statusIn: ["new", "in_progress", "needs_revisions"],
        },
      },
    });

    renderDashboard(reviewQueueShell);

    expect(screen.getByRole("heading", { name: "Pam's Reviews", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Assigned appraisal work" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open Assigned Work" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Dashboard work filter" })).toBeInTheDocument();
    const reviewWorkButton = screen.getByRole("button", { name: "Review Work" });
    const appraisalWorkButton = screen.getByRole("button", { name: "Appraisal Work 2" });
    expect(reviewWorkButton).toHaveAttribute("aria-pressed", "true");
    expect(appraisalWorkButton).toHaveAttribute("aria-pressed", "false");
    expect(within(reviewWorkButton).queryByText("1")).not.toBeInTheDocument();
    expect(within(appraisalWorkButton).getByText("2")).toBeInTheDocument();
    expect(screen.getByText("My Review Work")).toBeInTheDocument();
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        role: "reviewer",
        mode: "reviewerQueue",
        reviewerId: "pam-user",
        rowsOverride: [expect.objectContaining({ id: "review-order" })],
      }),
    );

    fireEvent.click(appraisalWorkButton);

    const inactiveReviewWorkButton = screen.getByRole("button", { name: "Review Work 1" });
    const activeAppraisalWorkButton = screen.getByRole("button", { name: "Appraisal Work" });
    expect(inactiveReviewWorkButton).toHaveAttribute("aria-pressed", "false");
    expect(activeAppraisalWorkButton).toHaveAttribute("aria-pressed", "true");
    expect(within(inactiveReviewWorkButton).getByText("1")).toBeInTheDocument();
    expect(within(activeAppraisalWorkButton).queryByText("2")).not.toBeInTheDocument();
    expect(screen.getByText("My Appraisal Work")).toBeInTheDocument();
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        role: "appraiser",
        mode: undefined,
        reviewerId: undefined,
        filters: expect.objectContaining({
          appraiserId: "pam-user",
          assignedAppraiserId: "pam-user",
          statusIn: ["new", "in_progress", "needs_revisions"],
        }),
        rowsOverride: [
          expect.objectContaining({ id: "appraisal-order" }),
          expect.objectContaining({ id: "revision-order" }),
        ],
      }),
    );
  });

  it("does not add an inactive tab badge when the opposite hybrid work count is zero", () => {
    summaryState.current = buildSummary({
      role: "reviewer",
      isAdmin: false,
      isReviewer: true,
      userId: "pam-user",
      appContext: {
        current_company_id: "company-1",
        company_name: "Falcon Appraisals",
        has_current_company_membership: true,
        display_name: "Pam Reviewer",
        is_owner: false,
        is_admin_role: false,
        is_reviewer_role: true,
        is_appraiser_role: true,
        primary_role_key: "reviewer",
        role_keys: ["reviewer", "appraiser"],
      },
      ordersRows: [
        {
          id: "review-order",
          order_number: "1002",
          status: "in_review",
          reviewer_id: "pam-user",
        },
      ],
      reviewerHybridAppraisal: {
        count: 0,
        rows: [],
        filters: {
          appraiserId: "pam-user",
          assignedAppraiserId: "pam-user",
          statusIn: ["new", "in_progress", "needs_revisions"],
        },
      },
    });

    renderDashboard(reviewQueueShell);

    const appraisalWorkButton = screen.getByRole("button", { name: "Appraisal Work" });
    expect(appraisalWorkButton).toHaveAttribute("aria-pressed", "false");
    expect(within(appraisalWorkButton).queryByText("0")).not.toBeInTheDocument();
  });

  it("does not show secondary appraisal work for reviewer-only users", () => {
    summaryState.current = buildSummary({
      role: "reviewer",
      isAdmin: false,
      isReviewer: true,
      userId: "reviewer-1",
      appContext: {
        current_company_id: "company-1",
        company_name: "Falcon Appraisals",
        has_current_company_membership: true,
        display_name: "Pam Reviewer",
        is_owner: false,
        is_admin_role: false,
        is_reviewer_role: true,
        is_appraiser_role: false,
        primary_role_key: "reviewer",
        role_keys: ["reviewer"],
      },
    });

    renderDashboard(reviewQueueShell);

    expect(screen.queryByRole("group", { name: "Dashboard work filter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Assigned appraisal work" })).not.toBeInTheDocument();
  });

  it("does not mount appraiser or reviewer workbench previews for owner/admin hybrids", () => {
    summaryState.current = buildSummary({
      role: "reviewer",
      isAdmin: true,
      isReviewer: true,
      userId: "owner-reviewer-1",
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

    renderDashboard(reviewQueueShell);

    expect(
      screen.getByRole("heading", { name: "Operations Dashboard", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Calendar, active orders, and workflow handoffs for the current company."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "My Work preview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Review Queue preview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /operational readiness/i })).not.toBeInTheDocument();
    expect(calendarMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ orders: summaryState.current.ordersRows }),
    );
    expect(tableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "reviewerQueue",
        reviewerId: "owner-reviewer-1",
        rowsOverride: summaryState.current.ordersRows,
        scope: "dashboard",
      }),
    );
  });
});
