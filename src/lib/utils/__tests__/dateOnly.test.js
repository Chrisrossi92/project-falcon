import { describe, expect, it } from "vitest";
import { dateOnlyInputValue, formatOperationalDate } from "../dateOnly";

describe("date-only operational formatting", () => {
  it("formats midnight UTC review due timestamps as the intended calendar date", () => {
    expect(formatOperationalDate("2026-06-01T00:00:00+00")).toBe("6/1/2026");
  });

  it("formats midnight UTC final due timestamps as the intended calendar date", () => {
    expect(formatOperationalDate("2026-06-03T00:00:00+00")).toBe("6/3/2026");
  });

  it("hydrates date inputs from the stored date portion without timezone conversion", () => {
    expect(dateOnlyInputValue("2026-06-01T00:00:00+00")).toBe("2026-06-01");
    expect(dateOnlyInputValue("2026-06-03T00:00:00+00")).toBe("2026-06-03");
  });
});
