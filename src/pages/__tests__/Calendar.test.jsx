// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CalendarPage from "../Calendar";
import { OperationsModeProvider } from "@/lib/operations/OperationsModeProvider";

const appContextMock = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/features/auth/useCurrentUserAppContext", () => ({
  useCurrentUserAppContext: appContextMock,
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

vi.mock("@/components/calendar/CalendarFiltersBar", () => ({
  default: ({ view, lens }) => (
    <div data-testid="calendar-filters">
      Calendar filters: {view} / {lens}
    </div>
  ),
}));

vi.mock("@/components/calendar/CalendarLegend", () => ({
  default: () => <div data-testid="calendar-legend">Calendar legend</div>,
}));

vi.mock("@/components/calendar/CalendarGrid", () => ({
  default: ({ events, role }) => (
    <div data-testid="calendar-grid">
      Month calendar: {role} / {events.length}
    </div>
  ),
}));

vi.mock("@/components/calendar/TwoWeekCalendar", () => ({
  default: () => <div data-testid="two-week-calendar">Two week calendar</div>,
}));

vi.mock("@/components/calendar/CalendarDayDetailRail", () => ({
  default: ({ events }) => (
    <aside data-testid="calendar-day-rail">
      Day detail events: {events.length}
    </aside>
  ),
}));

function createQuery(data = []) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    then: (resolve, reject) => Promise.resolve({ data, error: null }).then(resolve, reject),
  };
  return query;
}

function renderCalendar({ context, rows = [] } = {}) {
  const query = createQuery(rows);
  supabaseMock.from.mockReturnValue(query);
  appContextMock.mockReturnValue({
    loading: false,
    context: context || {
      user_id: "owner-1",
      company_name: "Falcon Appraisals",
      is_owner: true,
      is_admin_role: true,
      is_reviewer_role: false,
      is_appraiser_role: false,
      primary_role_key: "owner",
      role_keys: ["owner"],
    },
  });

  render(
    <OperationsModeProvider>
      <CalendarPage />
    </OperationsModeProvider>,
  );
  return query;
}

describe("CalendarPage workspace hierarchy", () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
    appContextMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    supabaseMock.from.mockReset();
    appContextMock.mockReset();
  });

  it("renders the standalone scheduling workspace hierarchy without changing the calendar surface", async () => {
    renderCalendar({
      rows: [
        {
          id: "order-1",
          order_number: "26001",
          address: "100 Main St",
          status: "in_progress",
          site_visit_at: "2026-05-22T10:00:00",
        },
      ],
    });

    expect(screen.getByRole("heading", { name: "Internal Production Calendar" })).toBeInTheDocument();
    expect(screen.getByText("Review Workflow")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar workspace context")).toBeInTheDocument();
    expect(screen.getByText("Falcon Appraisals")).toBeInTheDocument();
    expect(screen.getByText("Company schedule")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Scheduling Controls" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current calendar view")).toBeInTheDocument();
    expect(screen.getByText("All schedule")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Schedule Board" })).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar schedule board and selected day details")).toBeInTheDocument();
    expect(screen.getByText("Month calendar")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-filters")).toHaveTextContent("month / all");
    expect(screen.getByTestId("calendar-legend")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-grid")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-day-rail")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Loading active schedule...")).not.toBeInTheDocument();
      expect(screen.getByText("1 active order")).toBeInTheDocument();
    });
  });

  it("preserves the active-order read source and reviewer scope filters", async () => {
    const query = renderCalendar({
      context: {
        user_id: "reviewer-1",
        company_name: "Review Co",
        is_owner: false,
        is_admin_role: false,
        is_reviewer_role: true,
        is_appraiser_role: false,
        primary_role_key: "reviewer",
        role_keys: ["reviewer"],
      },
    });

    await waitFor(() => {
      expect(supabaseMock.from).toHaveBeenCalledWith("v_orders_active_frontend_v4");
    });

    expect(query.select).toHaveBeenCalledTimes(1);
    expect(query.select.mock.calls[0][0]).toContain("operations_scope");
    expect(query.eq).toHaveBeenCalledWith("operations_scope", "internal_operations");
    expect(query.eq).toHaveBeenCalledWith("reviewer_id", "reviewer-1");
    expect(query.eq).toHaveBeenCalledWith("status", "in_review");
    expect(screen.getByText("Review schedule")).toBeInTheDocument();
  });
});
