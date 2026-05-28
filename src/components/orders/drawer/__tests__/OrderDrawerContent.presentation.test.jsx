// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OrderDrawerContent from "../OrderDrawerContent";

const supabaseMaybeSingleMock = vi.hoisted(() => vi.fn());
const operationalInputsMock = vi.hoisted(() => []);

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: supabaseMaybeSingleMock,
        })),
      })),
    })),
  },
}));

vi.mock("@/components/activity/ActivityLog", () => ({
  default: ({ orderId, showComposer }) => (
    <div data-testid="activity-log">
      Activity for {orderId} {showComposer ? "with composer" : ""}
    </div>
  ),
}));

vi.mock("@/components/maps/GoogleMapEmbed", () => ({
  default: () => <div data-testid="google-map" />,
  googleMapsEmbedApiKey: () => "test-key",
}));

vi.mock("@/features/orders/operational-inputs/useOrderOperationalInputs", () => ({
  default: () => ({
    inputs: operationalInputsMock,
    loading: false,
    error: null,
  }),
}));

function renderDrawer(props) {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <OrderDrawerContent {...props} />
    </MemoryRouter>,
  );
}

describe("OrderDrawerContent presentation", () => {
  beforeEach(() => {
    operationalInputsMock.splice(0, operationalInputsMock.length);
    supabaseMaybeSingleMock
      .mockResolvedValueOnce({
        data: {
          id: "order-1",
          order_number: "2026001",
          status: "in_review",
          client_name: "Acme Lending",
          appraiser_name: "Avery Appraiser",
          reviewer_id: "reviewer-1",
          reviewer_name: "Riley Reviewer",
          address: "123 Main St",
          city: "Atlanta",
          state: "GA",
          zip: "30301",
          property_contact_name: "Site Contact",
          property_contact_phone: "555-0100",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "order-1",
          order_number: "2026001",
          status: "in_review",
          client_name: "Acme Lending",
          appraiser_name: "Avery Appraiser",
          reviewer_id: "reviewer-1",
          reviewer_name: "Riley Reviewer",
          address: "123 Main St",
          city: "Atlanta",
          state: "GA",
          zip: "30301",
          client_contact_email: "client@example.com",
          access_notes: "Use side entrance.",
          document_count: 0,
        },
        error: null,
      });
  });

  afterEach(() => {
    cleanup();
    supabaseMaybeSingleMock.mockReset();
  });

  it("renders a lean secondary-context drawer after existing drawer fetches", async () => {
    renderDrawer({ orderId: "order-1" });

    expect(screen.getByRole("status")).toHaveTextContent("Loading order details...");

    expect(await screen.findByText("Activity")).toBeInTheDocument();
    expect(screen.queryByText("Order 2026001")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open full order ↗" })).not.toBeInTheDocument();
    expect(screen.queryByText("Order context")).not.toBeInTheDocument();
    expect(screen.queryByText("Inline order detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Appraiser: Avery Appraiser")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Order attention summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Order Signals")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("File readiness summary")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Review context summary")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Operational status evidence")).not.toBeInTheDocument();
    expect(screen.getByText("Order Contacts")).toBeInTheDocument();
    expect(screen.getByText("Client and site contact context")).toBeInTheDocument();
    expect(screen.getByText("Acme Lending")).toBeInTheDocument();
    expect(screen.queryByText("Order Team")).not.toBeInTheDocument();
    expect(screen.queryByText("Avery Appraiser")).not.toBeInTheDocument();
    expect(screen.queryByText("Riley Reviewer")).not.toBeInTheDocument();
    expect(screen.getByText("555-0100")).toBeInTheDocument();
    expect(screen.queryByText("Access")).not.toBeInTheDocument();
    expect(screen.queryByText("Use side entrance.")).not.toBeInTheDocument();
    expect(screen.getByText("Location Preview")).toBeInTheDocument();
    expect(screen.getByText("Subject property context")).toBeInTheDocument();
    expect(screen.getByTestId("activity-log")).toHaveTextContent("Activity for order-1 with composer");
  });

  it("renders active operational evidence as read-only drawer context", async () => {
    operationalInputsMock.push({
      id: "input-1",
      input_type: "waiting_on_client",
      actor_role: "Admin",
      note: "Client is gathering the missing lease.",
      created_at: "2026-05-24T13:00:00.000Z",
      expires_at: "2026-05-27T13:00:00.000Z",
    });

    renderDrawer({ orderId: "order-1" });

    const evidence = await screen.findByLabelText("Operational status evidence");
    expect(within(evidence).getByText("Operational Context")).toBeInTheDocument();
    expect(within(evidence).getByText("Waiting on client")).toBeInTheDocument();
    expect(within(evidence).getByText("Admin")).toBeInTheDocument();
    expect(within(evidence).getByText("Client is gathering the missing lease.")).toBeInTheDocument();
    expect(within(evidence).queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a polished no-selection state without action controls", () => {
    renderDrawer({});

    expect(screen.getByText("No order selected.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archive|cancel|void/i })).not.toBeInTheDocument();
  });

  it("renders a polished error state from the existing drawer fetch path", async () => {
    supabaseMaybeSingleMock.mockReset();
    supabaseMaybeSingleMock.mockResolvedValue({ data: null, error: new Error("Permission denied") });

    renderDrawer({ orderId: "order-1" });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Order details could not load.");
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Permission denied");
  });
});
