// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CalendarGrid from "../CalendarGrid";

describe("CalendarGrid", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps overflow summaries understandable when a day has dense events", () => {
    const eventDate = new Date("2026-05-05T10:00:00");
    const events = Array.from({ length: 5 }, (_, index) => ({
      id: `event-${index}`,
      type: "review",
      orderId: `order-${index}`,
      address: `${index + 1} Main St`,
      start: eventDate,
    }));

    render(
      <CalendarGrid
        anchor={new Date("2026-05-01T12:00:00")}
        events={events}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText("+2 more events")).toBeInTheDocument();
    expect(screen.getAllByText("1 Main St")[0]).toBeInTheDocument();
    expect(screen.getAllByText("2 Main St")[0]).toBeInTheDocument();
    expect(screen.getAllByText("3 Main St")[0]).toBeInTheDocument();
  });
});
