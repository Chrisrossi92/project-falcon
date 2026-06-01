import { describe, expect, it } from "vitest";
import {
  applyOperationalOrderUserNamesToRows,
  operationalUserName,
} from "../userDisplayName";

describe("userDisplayName", () => {
  it("prefers full operational names over compact display names", () => {
    expect(
      operationalUserName({
        full_name: "Kady Weith",
        display_name: "Kady",
        email: "kady@example.test",
      }),
    ).toBe("Kady Weith");
  });

  it("falls back through name, display_name, and email", () => {
    expect(operationalUserName({ name: "Casey Legal", display_name: "Casey" })).toBe("Casey Legal");
    expect(operationalUserName({ display_name: "Casey" })).toBe("Casey");
    expect(operationalUserName({ email: "casey@example.test" })).toBe("casey@example.test");
  });

  it("applies operational names to assigned order rows by user id", () => {
    const [row] = applyOperationalOrderUserNamesToRows(
      [
        {
          id: "order-1",
          appraiser_id: "user-kady",
          appraiser_name: "Kady",
          reviewer_id: "user-pam",
          reviewer_name: "Pam",
        },
      ],
      [
        {
          id: "user-kady",
          full_name: "Kady Weith",
          display_name: "Kady",
          email: "kady@example.test",
        },
        {
          id: "user-pam",
          name: "Pam Casper",
          display_name: "Pam",
          email: "pam@example.test",
        },
      ],
    );

    expect(row.appraiser_name).toBe("Kady Weith");
    expect(row.appraiserName).toBe("Kady Weith");
    expect(row.reviewer_name).toBe("Pam Casper");
    expect(row.reviewerName).toBe("Pam Casper");
  });
});
