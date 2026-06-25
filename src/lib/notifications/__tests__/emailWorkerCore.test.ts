import { describe, expect, it } from "vitest";

import { renderEmailQueueRow } from "../../../../supabase/functions/email-worker/workerCore";

describe("email worker order notification rendering", () => {
  it("renders revision requests with the revision note and spaced Open Order button", () => {
    const rendered = renderEmailQueueRow(
      {
        id: "email-1",
        user_id: "user-1",
        to_email: "appraiser@example.test",
        template: "order.sent_back_to_appraiser",
        payload: {
          order_id: "order-1",
          order_number: "2026007",
          property_address: "123 Main St",
          client_name: "Continental Bank",
          appraiser_name: "Pam Appraiser",
          reviewer_name: "Ron Reviewer",
          final_due_at: "2026-07-02",
          note_text: "Please revise the cap rate support and update the reconciled value.",
          link_path: "/orders/order-1",
        },
      },
      "https://falcon.example.test",
    );

    expect(rendered.subject).toContain("Revisions requested for Order 2026007");
    expect(rendered.text).toContain("A reviewer requested revisions for this order.");
    expect(rendered.text).toContain("Revision note");
    expect(rendered.text).toContain("Please revise the cap rate support and update the reconciled value.");
    expect(rendered.html).toContain("Revision note");
    expect(rendered.html).toContain("Please revise the cap rate support and update the reconciled value.");
    expect(rendered.html).toContain("margin-top:28px");
    expect(rendered.html).toContain("Open Order");
    expect(rendered.html).toContain("https://falcon.example.test/orders/order-1");
  });

  it("omits the revision-note label when a revision request has no note", () => {
    const rendered = renderEmailQueueRow(
      {
        id: "email-2",
        user_id: "user-1",
        to_email: "appraiser@example.test",
        template: "order.sent_back_to_appraiser",
        payload: {
          order_id: "order-1",
          order_number: "2026007",
          property_address: "123 Main St",
          client_name: "Continental Bank",
          link_path: "/orders/order-1",
        },
      },
      "https://falcon.example.test",
    );

    expect(rendered.text).toContain("A reviewer requested revisions for this order.");
    expect(rendered.text).not.toContain("Revision note");
    expect(rendered.html).not.toContain("Revision note");
    expect(rendered.html).toContain("Open Order");
  });
});
