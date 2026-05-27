import { describe, expect, it } from "vitest";
import { calendarEventsFromOrder } from "../normalizeCalendarEvent";

describe("calendarEventsFromOrder", () => {
  it("keeps site visit appointments on the entered local wall time", () => {
    const [event] = calendarEventsFromOrder({
      id: "order-1",
      address_line1: "100 Main St",
      site_visit_at: "2026-06-02T11:00:00+00:00",
    });

    expect(event.type).toBe("site");
    expect(new Date(event.start).getHours()).toBe(11);
    expect(new Date(event.start).getMinutes()).toBe(0);
  });

  it("does not change review and final due timestamp behavior", () => {
    const events = calendarEventsFromOrder({
      id: "order-1",
      address_line1: "100 Main St",
      review_due_at: "2026-06-03T15:00:00.000Z",
      final_due_at: "2026-06-04T16:30:00.000Z",
    });

    expect(events.find((event) => event.type === "review")?.start).toBe("2026-06-03T15:00:00.000Z");
    expect(events.find((event) => event.type === "final")?.start).toBe("2026-06-04T16:30:00.000Z");
  });
});
