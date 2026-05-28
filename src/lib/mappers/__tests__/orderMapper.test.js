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

  it("falls back to current_reviewer_id and formats phone snapshots", () => {
    expect(
      mapOrderRow({
        id: "order-2",
        current_reviewer_id: "reviewer-current",
        property_contact_phone: "(555) 123-4567",
        entry_contact_phone: "5551230000 x42",
        client_contact_phone: "1-555-999-0000",
      }),
    ).toEqual(
      expect.objectContaining({
        reviewer_id: "reviewer-current",
        property_contact_phone: "555-123-4567",
        entry_contact_phone: "555-123-0000 x42",
        client_contact_phone: "555-999-0000",
      }),
    );
  });

  it("derives appraiser fee from persisted base fee and split when direct projection is missing", () => {
    expect(
      mapOrderRow({
        id: "order-3",
        base_fee: 1200,
        split_pct: 42.5,
      }),
    ).toEqual(
      expect.objectContaining({
        base_fee: 1200,
        split_pct: 42.5,
        appraiser_fee: 510,
      }),
    );
  });
});
