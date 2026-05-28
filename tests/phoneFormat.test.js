import { describe, expect, it } from "vitest";
import { formatPhoneForDisplay } from "@/lib/utils/phoneFormat";

describe("formatPhoneForDisplay", () => {
  it("formats US phone numbers with dashes", () => {
    expect(formatPhoneForDisplay("5551234567")).toBe("555-123-4567");
    expect(formatPhoneForDisplay("(555) 123-4567")).toBe("555-123-4567");
    expect(formatPhoneForDisplay("1-555-123-4567")).toBe("555-123-4567");
  });

  it("preserves extensions and non-US fallback values", () => {
    expect(formatPhoneForDisplay("(555) 123-4567 x89")).toBe("555-123-4567 x89");
    expect(formatPhoneForDisplay("+44 20 7946 0958")).toBe("+44 20 7946 0958");
  });
});
