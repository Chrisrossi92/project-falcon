// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.hoisted(() => vi.fn());
const updateSiteVisitAtViaRpcMock = vi.hoisted(() => vi.fn());
const DOCUMENT_POSITION_FOLLOWING = 4;

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
      client_name: "Acme Lending",
      amc_name: "Northstar AMC",
      appraiser_name: "Avery Appraiser",
      reviewer_name: "Riley Reviewer",
      address_line1: "100 Main St",
      city: "Boston",
      state: "MA",
      postal_code: "02110",
      property_contact_name: "Casey Contact",
      property_contact_phone: "555-0100",
      created_at: "2026-05-20T12:00:00.000Z",
      updated_at: "2026-05-20T12:00:00.000Z",
      site_visit_at: null,
      review_due_at: "2026-05-22T12:00:00.000Z",
      final_due_at: "2026-05-29T12:00:00.000Z",
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

  it("surfaces the full operational overview from the loaded order", () => {
    render(<OrderDetail />);

    const overview = screen.getByLabelText("Operational Overview");

    expect(within(overview).getByText("Order / Client")).toBeInTheDocument();
    expect(within(overview).getByText("Client")).toBeInTheDocument();
    expect(within(overview).getByText("Acme Lending")).toBeInTheDocument();
    expect(within(overview).getByText("AMC")).toBeInTheDocument();
    expect(within(overview).getByText("Northstar AMC")).toBeInTheDocument();
    expect(within(overview).getByText("Property / Assignment")).toBeInTheDocument();
    expect(within(overview).getByText("Property Address")).toBeInTheDocument();
    expect(within(overview).getByText("100 Main St, Boston, MA 02110")).toBeInTheDocument();
    expect(within(overview).getByText("Property Type")).toBeInTheDocument();
    expect(within(overview).getByText("Report Type")).toBeInTheDocument();
    expect(within(overview).getByText("Schedule")).toBeInTheDocument();
    expect(within(overview).getByText("Site Visit")).toBeInTheDocument();
    expect(within(overview).getByText("Review Due")).toBeInTheDocument();
    expect(within(overview).getByText("Final Due")).toBeInTheDocument();
    expect(within(overview).getByText("Updated")).toBeInTheDocument();
    expect(within(overview).getByText("Team / Fees")).toBeInTheDocument();
    expect(within(overview).getByText("Appraiser")).toBeInTheDocument();
    expect(within(overview).getByText("Avery Appraiser")).toBeInTheDocument();
    expect(within(overview).getByText("Reviewer")).toBeInTheDocument();
    expect(within(overview).getByText("Riley Reviewer")).toBeInTheDocument();
    expect(within(overview).getByText("Property Contact / Access")).toBeInTheDocument();
    expect(within(overview).getByText("Contact")).toBeInTheDocument();
    expect(within(overview).getByText("Casey Contact")).toBeInTheDocument();
    expect(within(overview).getByText("Contact Phone")).toBeInTheDocument();
    expect(within(overview).getByText("555-0100")).toBeInTheDocument();
    expect(within(overview).getByText("Split %")).toBeInTheDocument();
    expect(within(overview).getByText("Base Fee")).toBeInTheDocument();
    expect(within(overview).getByText("Appraiser Fee")).toBeInTheDocument();
    expect(within(overview).queryByText("Client Contact")).not.toBeInTheDocument();
    expect(within(overview).queryByText("Client Contact Phone")).not.toBeInTheDocument();
    expect(within(overview).queryByText("Client Contact Email")).not.toBeInTheDocument();
    expect(within(overview).queryByText("Property Contact Email")).not.toBeInTheDocument();

    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.queryByText("Activity / Communication History")).not.toBeInTheDocument();
  });

  it("uses overview first, then map and activity detail cards", () => {
    render(<OrderDetail />);

    const overview = screen.getByLabelText("Operational Overview");
    const detailBody = screen.getByLabelText("Order detail body");
    const propertyHeading = screen.getByText("Property / Map");
    const activityHeading = screen.getByText("Activity");

    expect(screen.queryByTestId("two-week-calendar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("calendar-legend")).not.toBeInTheDocument();
    expect(screen.queryByText("Dates")).not.toBeInTheDocument();
    expect(screen.queryByText("People / Fees")).not.toBeInTheDocument();
    expect(within(detailBody).getByText("Property / Map")).toBeInTheDocument();
    expect(within(detailBody).getByText("Activity")).toBeInTheDocument();
    expect(overview.compareDocumentPosition(propertyHeading)).toBe(DOCUMENT_POSITION_FOLLOWING);
    expect(overview.compareDocumentPosition(activityHeading)).toBe(DOCUMENT_POSITION_FOLLOWING);
  });
});
