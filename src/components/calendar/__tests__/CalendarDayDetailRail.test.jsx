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
    const capacityRead = screen.getByLabelText("Selected day capacity: Open Capacity");
    const counts = screen.getByLabelText("Selected day event counts");
    expect(capacityRead).toBeInTheDocument();
    expect(capacityRead.compareDocumentPosition(counts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Open capacity because no operational events are scheduled for this day.")).toBeInTheDocument();
    expect(screen.getByText("No events on this day")).toBeInTheDocument();
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
    expect(screen.getByLabelText("Selected day capacity: Heavy")).toBeInTheDocument();
    expect(screen.getByText("Heavy because of 1 site visit and 1 review handoff.")).toBeInTheDocument();
    expect(screen.getByText("Site visits")).toBeInTheDocument();
    expect(screen.getByText("Review handoffs")).toBeInTheDocument();
    expect(screen.queryByText("No events on this day")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open order 26001" }));

    expect(onOpenOrder).toHaveBeenCalledWith("order-1");
  });

  it("orders selected-day sections by operational priority without changing row actions", () => {
    render(
      <CalendarDayDetailRail
        selectedDay={new Date("2026-05-22T12:00:00")}
        events={[
          {
            id: "event-site",
            type: "site",
            orderId: "order-site",
            orderNumber: "26001",
            start: new Date("2026-05-22T09:30:00"),
            address: "100 Main St",
          },
          {
            id: "event-review",
            type: "review",
            orderId: "order-review",
            orderNumber: "26002",
            start: new Date("2026-05-22T14:00:00"),
            address: "200 Review Ave",
          },
          {
            id: "event-final",
            type: "final",
            orderId: "order-final",
            orderNumber: "26003",
            start: new Date("2026-05-22T17:00:00"),
            address: "300 Final Blvd",
          },
        ]}
      />,
    );

    const finalSection = screen.getByText("Client due");
    const reviewSection = screen.getByText("Review handoffs");
    const siteSection = screen.getByText("Site visits");

    expect(finalSection.compareDocumentPosition(reviewSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(reviewSection.compareDocumentPosition(siteSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
