// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.hoisted(() => vi.fn());
const updateSiteVisitAtViaRpcMock = vi.hoisted(() => vi.fn());

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
    order: {
      id: "order-1",
      order_number: "2026001",
      status: "new",
      created_at: "2026-05-20T12:00:00.000Z",
      updated_at: "2026-05-20T12:00:00.000Z",
      site_visit_at: null,
      final_due_at: null,
      due_date: null,
    },
    loading: false,
    error: null,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/services/ordersService", () => ({
  updateSiteVisitAtViaRpc: updateSiteVisitAtViaRpcMock,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    loading: false,
    error: null,
    hasAllPermissions: () => false,
  }),
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
  }),
}));

vi.mock("@/components/dates/SiteVisitPicker", () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange("2026-05-20T14:00:00.000Z")}>
      Set site visit
    </button>
  ),
}));

vi.mock("@/components/maps/GoogleMapEmbed", () => ({
  default: () => <div data-testid="map" />,
}));

vi.mock("@/components/calendar/TwoWeekCalendar", () => ({
  default: () => <div data-testid="two-week-calendar" />,
}));

vi.mock("@/components/calendar/CalendarLegend", () => ({
  default: () => <div data-testid="calendar-legend" />,
}));

vi.mock("@/components/orders/table/OrderStatusBadge", () => ({
  default: ({ status }) => <span>{status}</span>,
}));

vi.mock("@/components/activity/ActivityLog", () => ({
  default: () => <div data-testid="activity-log" />,
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
    refreshMock.mockReset();
    updateSiteVisitAtViaRpcMock.mockReset();
    updateSiteVisitAtViaRpcMock.mockResolvedValue({
      id: "order-1",
      site_visit_at: "2026-05-20T14:00:00.000Z",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("saves the site visit through the RPC-backed wrapper and refreshes", async () => {
    render(<OrderDetail />);

    fireEvent.click(screen.getByRole("button", { name: "Set site visit" }));

    await waitFor(() => {
      expect(updateSiteVisitAtViaRpcMock).toHaveBeenCalledWith(
        "order-1",
        "2026-05-20T14:00:00.000Z",
      );
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
