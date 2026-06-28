import { describe, expect, it } from "vitest";

import {
  calendarDayCapacityScore,
  classifyCalendarDayCapacity,
} from "@/lib/calendar/calendarCapacity";

describe("calendar capacity classification", () => {
  it("treats an empty day as open capacity", () => {
    expect(calendarDayCapacityScore([])).toBe(0);
    expect(classifyCalendarDayCapacity([]).id).toBe("open");
  });

  it("keeps lightweight supporting events in the light band", () => {
    const events = [{ type: "other" }, { type: "other" }];

    expect(calendarDayCapacityScore(events)).toBe(2);
    expect(classifyCalendarDayCapacity(events).id).toBe("light");
  });

  it("weights site visits as stronger schedule commitments", () => {
    const events = [{ type: "site_visit" }];

    expect(calendarDayCapacityScore(events)).toBe(3);
    expect(classifyCalendarDayCapacity(events).id).toBe("steady");
  });

  it("weights review and client due events as medium pressure", () => {
    const events = [{ type: "due_for_review" }, { type: "due_to_client" }];

    expect(calendarDayCapacityScore(events)).toBe(4);
    expect(classifyCalendarDayCapacity(events).id).toBe("steady");
  });

  it("classifies combined site and due-date pressure conservatively", () => {
    const heavyEvents = [{ type: "site" }, { type: "review" }, { type: "final" }];
    const overloadedEvents = [{ type: "site" }, { type: "site" }, { type: "site" }];

    expect(calendarDayCapacityScore(heavyEvents)).toBe(7);
    expect(classifyCalendarDayCapacity(heavyEvents).id).toBe("heavy");
    expect(calendarDayCapacityScore(overloadedEvents)).toBe(9);
    expect(classifyCalendarDayCapacity(overloadedEvents).id).toBe("overloaded");
  });
});
