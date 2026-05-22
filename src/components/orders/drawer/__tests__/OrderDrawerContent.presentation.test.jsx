// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OrderDrawerContent from "../OrderDrawerContent";

const supabaseMaybeSingleMock = vi.hoisted(() => vi.fn());

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
    supabaseMaybeSingleMock
      .mockResolvedValueOnce({
        data: {
          id: "order-1",
          order_number: "2026001",
          status: "new",
          client_name: "Acme Lending",
          appraiser_name: "Avery Appraiser",
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
          status: "new",
          client_name: "Acme Lending",
          appraiser_name: "Avery Appraiser",
          address: "123 Main St",
          city: "Atlanta",
          state: "GA",
          zip: "30301",
          client_contact_email: "client@example.com",
          access_notes: "Use side entrance.",
        },
        error: null,
      });
  });

  afterEach(() => {
    cleanup();
    supabaseMaybeSingleMock.mockReset();
  });

  it("renders the polished inline detail hierarchy after existing drawer fetches", async () => {
    renderDrawer({ orderId: "order-1" });

    expect(screen.getByRole("status")).toHaveTextContent("Loading order details...");

    expect(await screen.findByText("Inline order detail")).toBeInTheDocument();
    expect(screen.getByText("Order 2026001")).toBeInTheDocument();
    expect(screen.getAllByText("Acme Lending").length).toBeGreaterThan(0);
    expect(screen.getByText("Appraiser: Avery Appraiser")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open full order ↗" })).toHaveAttribute(
      "href",
      "/orders/order-1",
    );
    expect(screen.getByText("Order Contacts")).toBeInTheDocument();
    expect(screen.getByText("Client and site contact context")).toBeInTheDocument();
    expect(screen.getByText("Location Preview")).toBeInTheDocument();
    expect(screen.getByText("Subject property context")).toBeInTheDocument();
    expect(screen.getByTestId("activity-log")).toHaveTextContent("Activity for order-1 with composer");
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
