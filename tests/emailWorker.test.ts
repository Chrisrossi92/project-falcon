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
      subject: "New Order Assigned - 2026004",
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
});
