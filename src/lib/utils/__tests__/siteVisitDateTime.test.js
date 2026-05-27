import { describe, expect, it } from "vitest";
import {
  formatSiteVisitLocalTimestamp,
  parseSiteVisitWallTime,
  siteVisitToCalendarStart,
} from "../siteVisitDateTime";

describe("site visit wall-time helpers", () => {
  it("preserves the displayed appointment time from timezone-bearing view values", () => {
    const parsed = parseSiteVisitWallTime("2026-06-02T11:00:00+00:00");

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(5);
    expect(parsed.getDate()).toBe(2);
    expect(parsed.getHours()).toBe(11);
    expect(parsed.getMinutes()).toBe(0);
  });

  it("formats picker output as a local wall-time timestamp without a timezone suffix", () => {
    expect(formatSiteVisitLocalTimestamp("2026-06-02T11:00:00.000Z")).toBe(
      "2026-06-02T11:00:00",
    );
  });

  it("builds calendar instants from the preserved local site-visit wall time", () => {
    const start = siteVisitToCalendarStart("2026-06-02T11:00:00+00:00");

    expect(start).toBeTruthy();
    expect(new Date(start).getHours()).toBe(11);
    expect(new Date(start).getMinutes()).toBe(0);
  });
});
