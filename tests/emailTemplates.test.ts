import { describe, it, expect } from "vitest";
import { renderEmailTemplate } from "@/lib/notifications/emailTemplates";

describe("renderEmailTemplate", () => {
  it("replaces tokens in subject (#{token} or {token}) and body", () => {
    const { subject, body } = renderEmailTemplate("APPRAISER_ASSIGNED", {
      order_number: "12345",
      property_address: "123 Main St",
      contact_name: "Alex Appraiser",
      contact_phone: "555-1111",
      special_instructions: "Call before 5pm",
      order_url: "https://example.com/orders/12345",
      due_date: "2025-01-01",
    });

    expect(subject).toBe("New Order Assigned – 12345");
    expect(body).toContain("123 Main St");
    expect(body).toContain("Alex Appraiser");
    expect(body).toContain("555-1111");
    expect(body).toContain("Call before 5pm");
    expect(body).toContain("https://example.com/orders/12345");
  });

  it("does not throw and blanks missing tokens", () => {
    expect(() => renderEmailTemplate("DUE_TODAY", {})).not.toThrow();
    const { subject, body } = renderEmailTemplate("DUE_TODAY", {});
    expect(subject).toBe("Order Due Today – ");
    expect(body).not.toContain("{");
  });

  it("truncates note_preview to 200 characters and appends an ellipsis", () => {
    const longNote = "a".repeat(205);
    const { body } = renderEmailTemplate("NOTE_ADDRESSED", {
      order_number: "999",
      property_address: "1 Test Way",
      author_name: "Reviewer",
      note_preview: longNote,
    });
    expect(body).toContain(`${"a".repeat(200)}…`);
  });

  it("applies fallbacks for contact fields and special instructions", () => {
    const { body } = renderEmailTemplate("APPRAISER_ASSIGNED", {
      order_number: "777",
      property_address: "77 Sample Ave",
      due_date: "2025-02-02",
      order_url: "https://example.com",
    });

    expect(body).toContain("Not provided");
    expect(body).toContain("None");
  });
});
