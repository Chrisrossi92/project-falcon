import { describe, expect, it, vi } from "vitest";
import {
  createEmailQueueProcessor,
  renderEmailQueueRow,
  type EmailQueueRow,
} from "../supabase/functions/email-worker/workerCore";

function createSupabaseMock(rows: EmailQueueRow[]) {
  const rpc = vi.fn(async (name: string) => {
    if (name === "rpc_claim_email_batch_v1") return { data: rows, error: null };
    if (name === "rpc_mark_email_sent_v1") return { data: null, error: null };
    if (name === "rpc_mark_email_failed_v1") return { data: null, error: null };
    return { data: null, error: { message: `unexpected rpc ${name}` } };
  });
  return { rpc };
}

describe("email queue worker", () => {
  it("claims canonical email_queue rows, sends through Resend, and marks success", async () => {
    const rows = [
      {
        id: "email-1",
        to_email: "appraiser@example.com",
        subject: "New assignment",
        template: "order.new_assigned",
        payload: {
          order_id: "order-1",
          order_number: "2026004",
          link_path: "/orders/order-1",
        },
      },
    ];
    const supabase = createSupabaseMock(rows);
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));

    const processEmailQueue = createEmailQueueProcessor({
      supabase,
      fetchImpl,
      config: {
        resendApiKey: "resend-key",
        emailFrom: "Falcon <no-reply@example.com>",
        appBaseUrl: "https://continentalres.com",
        batchLimit: 10,
      },
    });

    await expect(processEmailQueue()).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 });

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_claim_email_batch_v1", {
      p_limit: 10,
      p_worker: "email-worker",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer resend-key" }),
      })
    );
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toMatchObject({
      from: "Falcon <no-reply@example.com>",
      to: "appraiser@example.com",
      subject: "You've been assigned Order 2026004",
    });
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_mark_email_sent_v1", { p_id: "email-1" });
    expect(supabase.rpc).not.toHaveBeenCalledWith("rpc_mark_email_outbox_sent", expect.anything());
  });

  it("marks claimed rows failed when Resend rejects delivery", async () => {
    const rows = [
      {
        id: "email-2",
        to_email: "reviewer@example.com",
        subject: "Ready for review",
        template: "order.sent_to_review",
        payload: { order_number: "2026005" },
      },
    ];
    const supabase = createSupabaseMock(rows);
    const fetchImpl = vi.fn(async () => new Response("provider rejected", { status: 400 }));

    const processEmailQueue = createEmailQueueProcessor({
      supabase,
      fetchImpl,
      config: {
        resendApiKey: "resend-key",
        emailFrom: "Falcon <no-reply@example.com>",
      },
    });

    await expect(processEmailQueue()).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 });

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_mark_email_failed_v1", {
      p_id: "email-2",
      p_error: "provider rejected",
    });
    expect(supabase.rpc).not.toHaveBeenCalledWith("rpc_mark_email_sent_v1", expect.anything());
  });

  it("marks claimed rows failed instead of fake-sending when Resend is not configured", async () => {
    const rows = [
      {
        id: "email-3",
        to_email: "admin@example.com",
        subject: "Workflow update",
        template: "order.completed",
        payload: { order_number: "2026006" },
      },
    ];
    const supabase = createSupabaseMock(rows);
    const fetchImpl = vi.fn();

    const processEmailQueue = createEmailQueueProcessor({
      supabase,
      fetchImpl,
      config: { resendApiKey: null },
    });

    await expect(processEmailQueue()).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_mark_email_failed_v1", {
      p_id: "email-3",
      p_error: "No RESEND_API_KEY configured",
    });
  });

  it("marks claimed rows failed when EMAIL_FROM is not configured", async () => {
    const rows = [
      {
        id: "email-4",
        to_email: "admin@example.com",
        subject: "Workflow update",
        template: "order.completed",
        payload: { order_number: "2026006" },
      },
    ];
    const supabase = createSupabaseMock(rows);
    const fetchImpl = vi.fn();

    const processEmailQueue = createEmailQueueProcessor({
      supabase,
      fetchImpl,
      config: { resendApiKey: "resend-key" },
    });

    await expect(processEmailQueue()).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_mark_email_failed_v1", {
      p_id: "email-4",
      p_error: "No EMAIL_FROM configured",
    });
  });

  it("renders relative notification links against APP_BASE_URL", () => {
    const rendered = renderEmailQueueRow(
      {
        id: "email-5",
        to_email: "appraiser@example.com",
        subject: "New assignment",
        template: "APPRAISER_ASSIGNED",
        payload: {
          order_number: "2026007",
          link_path: "/orders/order-7",
        },
      },
      "https://continentalres.com/"
    );

    expect(rendered.text).toContain("https://continentalres.com/orders/order-7");
    expect(rendered.html).toContain("https://continentalres.com/orders/order-7");
  });

  it("renders vendor bid invitation emails with a safe public bid link", () => {
    const rendered = renderEmailQueueRow(
      {
        id: "email-vendor-bid",
        to_email: "bids@acmeappraisal.com",
        subject: "Bid request",
        template: "VENDOR_BID_INVITATION",
        payload: {
          bid_invitation_path: "/vendor/bid-invitations/abc123",
          property_address: "12969 Eckel Junction Road",
          city: "Perrysburg",
          state: "OH",
          postal_code: "43551",
          report_type: "Full Appraisal",
          property_type: "Industrial",
          response_due_at: "2026-06-12T16:00:00Z",
          desired_vendor_due_at: "2026-06-20T16:00:00Z",
          client_due_at: "2026-06-24T16:00:00Z",
          request_message: "Please provide fee and turn time.",
          base_fee: "9999",
          internal_notes: "Do not render",
        },
      },
      "https://continentalres.com/"
    );

    expect(rendered.subject).toBe("Bid request: 12969 Eckel Junction Road");
    expect(rendered.text).toContain("You have been invited to bid on this appraisal assignment.");
    expect(rendered.text).toContain("**Location:** Perrysburg, OH, 43551");
    expect(rendered.text).toContain("**Report:** Full Appraisal");
    expect(rendered.text).toContain("**Property type:** Industrial");
    expect(rendered.text).toContain("Please provide fee and turn time.");
    expect(rendered.text).toContain("https://continentalres.com/vendor/bid-invitations/abc123");
    expect(rendered.html).toContain("Bid packet summary");
    expect(rendered.html).toContain("Open Bid Request");
    expect(rendered.html).toContain("https://continentalres.com/vendor/bid-invitations/abc123");
    expect(rendered.text).not.toContain("9999");
    expect(rendered.text).not.toContain("Do not render");
    expect(rendered.html).not.toContain("9999");
    expect(rendered.html).not.toContain("Do not render");
  });

  it("renders appraiser assignment emails with useful order context", () => {
    const rendered = renderEmailQueueRow(
      {
        id: "email-assignment",
        to_email: "appraiser@example.com",
        template: "order.assigned_appraiser",
        payload: {
          order_id: "order-5",
          order_number: "2026005",
          property_address: "1505 Monroe Street",
          client_name: "Continental Bank",
          report_type: "Appraisal",
          property_type: "Retail",
          property_contact_name: "Test Property Contact",
          property_contact_phone: "555-123-4567",
          site_visit_at: "2026-06-03T10:30:00",
          review_due_at: "2026-06-05T17:00:00",
          final_due_at: "2026-06-08T17:00:00",
          reviewer_name: "Riley Reviewer",
          link_path: "/orders/order-5",
        },
      },
      "https://continentalres.com"
    );

    expect(rendered.subject).toBe("You've been assigned Order 2026005 - 1505 Monroe Street");
    expect(rendered.text).toContain("**Client:** Continental Bank");
    expect(rendered.text).toContain("Property contact: Test Property Contact · 555-123-4567");
    expect(rendered.text).not.toContain("**Contact phone:**");
    expect(rendered.text).toContain("**Site visit:** Wednesday, June 3, 2026 at 10:30 AM");
    expect(rendered.text).toContain("**Review due:** Friday, June 5, 2026");
    expect(rendered.text).toContain("**Final due:** Monday, June 8, 2026");
    expect(rendered.text).not.toContain("2026-06-03T10:30:00");
    expect(rendered.text).not.toContain("2026-06-05T17:00:00");
    expect(rendered.text).toContain("**Reviewer:** Riley Reviewer");
    expect(rendered.text).toContain(
      "Please coordinate access with the contact above and let us know if you have any questions.",
    );
    expect(rendered.html).toContain("Falcon");
    expect(rendered.html).toContain("Order summary");
    expect(rendered.html).toContain("Property contact");
    expect(rendered.html).toContain("Test Property Contact · 555-123-4567");
    expect(rendered.html).not.toContain("Contact phone");
    expect(rendered.html).not.toContain("Property contact phone");
    expect(rendered.html).toContain("Open Order");
    expect(rendered.html).toContain("Powered by Falcon &middot; Continental Real Estate Solutions");
    expect(rendered.html).not.toContain("2026-06-03T10:30:00");
    expect(rendered.text).toContain("https://continentalres.com/orders/order-5");
  });

  it("renders legacy APPRAISER_ASSIGNED rows with enriched order payload fields", () => {
    const rendered = renderEmailQueueRow(
      {
        id: "email-legacy-assignment",
        to_email: "appraiser@example.com",
        template: "APPRAISER_ASSIGNED",
        payload: {
          order_id: "order-2008",
          order_number: "2026008",
          address: "2008 Legacy Lane",
          client_name: "Legacy Client",
          property_contact_name: "Pat Property",
          property_contact_phone: "555-2008",
          site_visit_at: "2026-06-08T11:00:00",
          review_due_at: "2026-06-09",
          final_due_at: "2026-06-10",
          report_type: "Full appraisal",
          property_type: "Industrial",
          appraiser_name: "Alex Appraiser",
          reviewer_name: "Riley Reviewer",
          link_path: "/orders/order-2008",
        },
      },
      "https://continentalres.com"
    );

    expect(rendered.subject).toBe("You've been assigned Order 2026008 - 2008 Legacy Lane");
    expect(rendered.text).toContain("**Property:** 2008 Legacy Lane");
    expect(rendered.text).toContain("**Client:** Legacy Client");
    expect(rendered.text).toContain("Property contact: Pat Property · 555-2008");
    expect(rendered.text).toContain("**Site visit:** Monday, June 8, 2026 at 11:00 AM");
    expect(rendered.text).toContain("**Final due:** Wednesday, June 10, 2026");
    expect(rendered.html).toContain("Powered by Falcon &middot; Continental Real Estate Solutions");
  });

  it("renders assignment property contact cleanly when name or phone is missing", () => {
    const withNameOnly = renderEmailQueueRow({
      id: "email-contact-name-only",
      to_email: "appraiser@example.com",
      template: "APPRAISER_ASSIGNED",
      payload: {
        order_number: "2026012",
        property_contact_name: "Name Only",
      },
    });
    expect(withNameOnly.text).toContain("Property contact: Name Only");
    expect(withNameOnly.html).toContain("Name Only");
    expect(withNameOnly.text).not.toContain("Name Only ·");

    const withPhoneOnly = renderEmailQueueRow({
      id: "email-contact-phone-only",
      to_email: "appraiser@example.com",
      template: "APPRAISER_ASSIGNED",
      payload: {
        order_number: "2026013",
        property_contact_phone: "555-000-1212",
      },
    });
    expect(withPhoneOnly.text).toContain("Property contact: 555-000-1212");
    expect(withPhoneOnly.html).toContain("555-000-1212");
    expect(withPhoneOnly.text).not.toContain("· 555-000-1212");
  });

  it("renders workflow emails for sent to review, revisions, and review cleared", () => {
    const basePayload = {
      order_id: "order-8",
      order_number: "2026008",
      property_address: "44 Review Road",
      client_name: "North Client",
      appraiser_name: "Alex Appraiser",
      reviewer_name: "Riley Reviewer",
      final_due_at: "2026-06-10",
      link_path: "/orders/order-8",
    };

    const sentToReview = renderEmailQueueRow({
      id: "email-review",
      to_email: "reviewer@example.com",
      template: "order.sent_to_review",
      payload: { ...basePayload, note_text: "Ready for review." },
    });
    expect(sentToReview.subject).toBe("Order 2026008 - 44 Review Road is ready for review");
    expect(sentToReview.text).toContain("An appraiser submitted this report for review.");
    expect(sentToReview.text).toContain("Ready for review.");

    const revisions = renderEmailQueueRow({
      id: "email-revisions",
      to_email: "appraiser@example.com",
      template: "order.sent_back_to_appraiser",
      payload: { ...basePayload, note_text: "Please update the sales grid." },
    });
    expect(revisions.subject).toBe("Revisions requested for Order 2026008 - 44 Review Road");
    expect(revisions.text).toContain("Please update the sales grid.");
    expect(revisions.text).toContain("resubmit when ready");

    const cleared = renderEmailQueueRow({
      id: "email-cleared",
      to_email: "admin@example.com",
      template: "order.review_cleared",
      payload: basePayload,
    });
    expect(cleared.subject).toBe("Review cleared for Order 2026008 - 44 Review Road");
    expect(cleared.text).toContain("Continue the client-release workflow");
  });

  it("renders date, site visit, and note emails with safe fallbacks", () => {
    const dates = renderEmailQueueRow({
      id: "email-dates",
      to_email: "appraiser@example.com",
      template: "order.dates_updated",
      payload: {
        order_number: "2026009",
        review_due_at: "2026-06-11",
        final_due_at: "2026-06-13",
      },
    });
    expect(dates.subject).toBe("Dates updated for Order 2026009");
    expect(dates.text).toContain("**Property:** Not provided");
    expect(dates.text).toContain("**Review due:** Thursday, June 11, 2026");
    expect(dates.text).toContain("**Site visit:** Not set");

    const site = renderEmailQueueRow({
      id: "email-site",
      to_email: "appraiser@example.com",
      template: "order.site_visit_updated",
      payload: {
        order_number: "2026010",
        property_address: "10 Site Way",
        site_visit_at: "2026-06-03T11:00:00",
      },
    });
    expect(site.subject).toBe("Site visit updated for Order 2026010 - 10 Site Way");
    expect(site.text).toContain("**Site visit:** Wednesday, June 3, 2026 at 11:00 AM");

    const note = renderEmailQueueRow({
      id: "email-note",
      to_email: "reviewer@example.com",
      template: "note.added",
      payload: {
        order_number: "2026011",
        property_address: "11 Note Lane",
        actor: { name: "Alex Appraiser" },
        note_text: "Needs review. <script>bad()</script>",
      },
    });
    expect(note.subject).toBe("New note on Order 2026011 - 11 Note Lane");
    expect(note.text).toContain("Alex Appraiser added a note");
    expect(note.text.length).toBeLessThan(900);
    expect(note.html).toContain("&lt;script&gt;");
    expect(note.text).not.toContain("[Open Order]()");
  });
});
