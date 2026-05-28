import { describe, expect, it } from "vitest";
import { calendarEventsFromOrder, normalizeCalendarEvent } from "../normalizeCalendarEvent";

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

  it("treats review and final due timestamps as date-only business dates", () => {
    const events = calendarEventsFromOrder({
      id: "order-1",
      address_line1: "100 Main St",
      review_due_at: "2026-06-01T00:00:00+00",
      final_due_at: "2026-06-03T00:00:00+00",
    });

    expect(events.find((event) => event.type === "review")?.start).toBe("2026-06-01T00:00:00");
    expect(events.find((event) => event.type === "final")?.start).toBe("2026-06-03T00:00:00");
    expect(new Date(events.find((event) => event.type === "review")?.start).toLocaleDateString()).toBe("6/1/2026");
    expect(new Date(events.find((event) => event.type === "final")?.start).toLocaleDateString()).toBe("6/3/2026");
  });

  it("normalizes calendar view review and client due events without UTC midnight drift", () => {
    const reviewEvent = normalizeCalendarEvent({
      id: "review-1",
      event_type: "due_for_review",
      start_at: "2026-06-01T00:00:00+00",
      end_at: "2026-06-01T00:00:00+00",
      order_id: "order-1",
    });
    const finalEvent = normalizeCalendarEvent({
      id: "final-1",
      event_type: "due_to_client",
      start_at: "2026-06-03T00:00:00+00",
      end_at: "2026-06-03T00:00:00+00",
      order_id: "order-1",
    });

    expect(reviewEvent.start).toBe("2026-06-01T00:00:00");
    expect(finalEvent.start).toBe("2026-06-03T00:00:00");
  });

  it("supports legacy review and client due aliases when building order calendar events", () => {
    const events = calendarEventsFromOrder({
      id: "order-1",
      address_line1: "100 Main St",
      review_due_date: "2026-06-01T00:00:00+00",
      client_due_at: "2026-06-03T00:00:00+00",
    });

    expect(events.find((event) => event.type === "review")?.sourceField).toBe("review_due_date");
    expect(events.find((event) => event.type === "review")?.start).toBe("2026-06-01T00:00:00");
    expect(events.find((event) => event.type === "final")?.sourceField).toBe("client_due_at");
    expect(events.find((event) => event.type === "final")?.start).toBe("2026-06-03T00:00:00");
  });
});
