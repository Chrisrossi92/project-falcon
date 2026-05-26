import { describe, expect, it } from "vitest";
import { mapOrderRow } from "../orderMapper";

describe("mapOrderRow", () => {
  it("preserves selected client contact snapshots separately from property access contacts", () => {
    expect(
      mapOrderRow({
        id: "order-1",
        order_number: "26001",
        client_contact_id: 12,
        client_contact_name: "Avery Desk",
        client_contact_title: "AMC Coordinator",
        client_contact_email: "avery@example.test",
        client_contact_phone: "555-0100",
        entry_contact_name: "Casey Entry",
        entry_contact_phone: "555-0110",
        access_notes: "Use side entrance.",
      }),
    ).toEqual(
      expect.objectContaining({
        client_contact_id: 12,
        client_contact_name: "Avery Desk",
        client_contact_title: "AMC Coordinator",
        client_contact_email: "avery@example.test",
        client_contact_phone: "555-0100",
        entry_contact_name: "Casey Entry",
        entry_contact_phone: "555-0110",
        access_notes: "Use side entrance.",
      }),
    );
  });
});
