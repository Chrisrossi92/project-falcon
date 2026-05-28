import { describe, expect, it } from "vitest";
import { formatActivity } from "../utils";

describe("activity formatting", () => {
  it("renders date update metadata as date-only values without timezone drift", () => {
    expect(
      formatActivity({
        event_type: "dates_updated",
        detail: {
          review_due_at: "2026-06-01T00:00:00+00",
          final_due_at: "2026-06-03T00:00:00+00",
        },
      }),
    ).toBe("Dates updated: Review due 6/1/2026 • Final due 6/3/2026");
  });
});
