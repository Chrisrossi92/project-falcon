// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CalendarDayDetailRail from "../CalendarDayDetailRail";

describe("CalendarDayDetailRail", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a calm empty state for a selected day without events", () => {
    render(<CalendarDayDetailRail selectedDay={new Date("2026-05-22T12:00:00")} events={[]} />);

    expect(screen.getByText("Selected Day")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /May 22, 2026/i })).toBeInTheDocument();
    expect(screen.getByText("0 events")).toBeInTheDocument();
    expect(screen.getByLabelText("Selected day has 0 events")).toBeInTheDocument();
    expect(screen.getByText("No events on this day")).toBeInTheDocument();
    expect(screen.getByLabelText("Selected day event counts")).toBeInTheDocument();
  });

  it("groups selected-day events and preserves order opening behavior", () => {
    const onOpenOrder = vi.fn();

    render(
      <CalendarDayDetailRail
        selectedDay={new Date("2026-05-22T12:00:00")}
        onOpenOrder={onOpenOrder}
        events={[
          {
            id: "event-site",
            type: "site",
            orderId: "order-1",
            orderNumber: "26001",
            start: new Date("2026-05-22T09:30:00"),
            address: "100 Main St",
            clientName: "Acme Lending",
            appraiserName: "Ava Appraiser",
          },
          {
            id: "event-review",
            type: "review",
            orderId: "order-2",
            orderNumber: "26002",
            start: new Date("2026-05-22T14:00:00"),
            address: "200 Review Ave",
            reviewerName: "Riley Reviewer",
          },
        ]}
      />,
    );

    const counts = screen.getByLabelText("Selected day event counts");
    expect(within(counts).getByText("Site")).toBeInTheDocument();
    expect(within(counts).getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("2 events")).toBeInTheDocument();
    expect(screen.getByLabelText("Selected day has 2 events")).toBeInTheDocument();
    expect(screen.getByText("Site visits")).toBeInTheDocument();
    expect(screen.getByText("Review handoffs")).toBeInTheDocument();
    expect(screen.queryByText("No events on this day")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open order 26001" }));

    expect(onOpenOrder).toHaveBeenCalledWith("order-1");
  });
});
