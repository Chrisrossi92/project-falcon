// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HistoricalOrders from "../HistoricalOrders";

const listHistoricalOrdersMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/orders", () => ({
  listHistoricalOrders: listHistoricalOrdersMock,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <HistoricalOrders />
    </MemoryRouter>,
  );
}

describe("HistoricalOrders", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    listHistoricalOrdersMock.mockReset();
    listHistoricalOrdersMock.mockResolvedValue({
      count: 3,
      rows: [
        {
          id: "order-archived",
          order_number: "2026001",
          status: "completed",
          is_archived: true,
          client_name: "Acme Lending",
          address_line1: "100 Main St",
          city: "Boston",
          state: "MA",
          postal_code: "02110",
          updated_at: "2026-05-20T12:00:00.000Z",
        },
        {
          id: "order-cancelled",
          order_number: "2026002",
          status: "cancelled",
          is_archived: false,
          client_name: "Northstar AMC",
          address_line1: "200 State St",
          city: "Austin",
          state: "TX",
          postal_code: "78701",
          updated_at: "2026-05-21T12:00:00.000Z",
        },
        {
          id: "order-voided",
          order_number: "2026003",
          status: "voided",
          is_archived: false,
          client_name: "Cobalt Bank",
          address_line1: "300 Lake Ave",
          city: "Chicago",
          state: "IL",
          postal_code: "60601",
          updated_at: "2026-05-22T12:00:00.000Z",
        },
      ],
    });
  });

  it("calls the dedicated historical orders helper", async () => {
    renderPage();

    await waitFor(() => {
      expect(listHistoricalOrdersMock).toHaveBeenCalledTimes(1);
    });
    expect(listHistoricalOrdersMock).toHaveBeenCalledWith({
      page: 0,
      pageSize: 50,
      orderBy: "updated_at",
      ascending: false,
    });
  });

  it("renders retired state labels for archived, cancelled, and voided orders", async () => {
    renderPage();

    expect(await screen.findByText("2026001")).toBeInTheDocument();
    expect(screen.getAllByText("Archived").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Voided").length).toBeGreaterThan(0);
  });

  it("renders read-only explanatory copy", async () => {
    renderPage();

    expect(await screen.findByText("2026001")).toBeInTheDocument();
    expect(screen.getByText(/This read-only page keeps archived, cancelled, and voided orders/i)).toBeInTheDocument();
    expect(screen.getByText(/Active orders remain in the normal Orders queue/i)).toBeInTheDocument();
    expect(screen.getByText(/Review preserved records only/i)).toBeInTheDocument();
  });

  it("filters already loaded historical rows by retired state", async () => {
    renderPage();

    expect(await screen.findByText("2026001")).toBeInTheDocument();
    expect(screen.getByText("2026002")).toBeInTheDocument();
    expect(screen.getByText("2026003")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archived" }));
    expect(screen.getByText("2026001")).toBeInTheDocument();
    expect(screen.queryByText("2026002")).not.toBeInTheDocument();
    expect(screen.queryByText("2026003")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelled" }));
    expect(screen.queryByText("2026001")).not.toBeInTheDocument();
    expect(screen.getByText("2026002")).toBeInTheDocument();
    expect(screen.queryByText("2026003")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voided" }));
    expect(screen.queryByText("2026001")).not.toBeInTheDocument();
    expect(screen.queryByText("2026002")).not.toBeInTheDocument();
    expect(screen.getByText("2026003")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All historical" }));
    expect(screen.getByText("2026001")).toBeInTheDocument();
    expect(screen.getByText("2026002")).toBeInTheDocument();
    expect(screen.getByText("2026003")).toBeInTheDocument();
  });

  it("links historical rows to existing Order Detail readback", async () => {
    renderPage();

    const archivedLink = await screen.findByRole("link", { name: "2026001" });
    const cancelledLink = screen.getByRole("link", { name: "2026002" });
    const voidedLink = screen.getByRole("link", { name: "2026003" });

    expect(archivedLink).toHaveAttribute("href", "/orders/order-archived");
    expect(cancelledLink).toHaveAttribute("href", "/orders/order-cancelled");
    expect(voidedLink).toHaveAttribute("href", "/orders/order-voided");
  });

  it("does not render mutation or lifecycle action controls", async () => {
    renderPage();

    const table = await screen.findByRole("table");

    expect(within(table).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Smart Actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive order")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel order")).not.toBeInTheDocument();
    expect(screen.queryByText("Void order")).not.toBeInTheDocument();
    expect(screen.queryByText("Restore")).not.toBeInTheDocument();
    expect(screen.queryByText("Reopen")).not.toBeInTheDocument();
    expect(screen.queryByText("Unarchive")).not.toBeInTheDocument();
  });
});
