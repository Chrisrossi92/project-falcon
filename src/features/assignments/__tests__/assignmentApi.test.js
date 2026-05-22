import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

const {
  acceptAssignment,
  cancelAssignment,
  completeAssignment,
  declineAssignment,
  offerAssignment,
  revokeAssignment,
  startAssignment,
  submitAssignment,
} = await import("../api.js");

describe("assignment packet API mutations", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("offers assignments through the backend assignment packet RPC", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: "assignment-1", error: null });

    await expect(
      offerAssignment({
        orderId: "order-1",
        assignedCompanyId: "company-2",
        relationshipId: "relationship-1",
        assignmentType: "vendor_appraisal",
        instructions: "Complete report",
        terms: { fee: 500 },
        handoffPayload: { property: "1 Main St" },
        dueAt: "2026-05-22T12:00:00.000Z",
        reviewDueAt: "2026-05-23T12:00:00.000Z",
        expiresAt: "2026-05-21T12:00:00.000Z",
      }),
    ).resolves.toBe("assignment-1");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_company_assignment_offer", {
      p_order_id: "order-1",
      p_assigned_company_id: "company-2",
      p_relationship_id: "relationship-1",
      p_assignment_type: "vendor_appraisal",
      p_instructions: "Complete report",
      p_terms: { fee: 500 },
      p_handoff_payload: { property: "1 Main St" },
      p_due_at: "2026-05-22T12:00:00.000Z",
      p_review_due_at: "2026-05-23T12:00:00.000Z",
      p_expires_at: "2026-05-21T12:00:00.000Z",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it.each([
    ["acceptAssignment", () => acceptAssignment("assignment-1"), "rpc_order_company_assignment_accept", { p_assignment_id: "assignment-1" }],
    ["declineAssignment", () => declineAssignment("assignment-1", "Capacity"), "rpc_order_company_assignment_decline", { p_assignment_id: "assignment-1", p_reason: "Capacity" }],
    ["startAssignment", () => startAssignment("assignment-1"), "rpc_order_company_assignment_start", { p_assignment_id: "assignment-1" }],
    ["submitAssignment", () => submitAssignment("assignment-1", { note: "Submitted" }), "rpc_order_company_assignment_submit", { p_assignment_id: "assignment-1", p_submission_payload: { note: "Submitted" } }],
    ["completeAssignment", () => completeAssignment("assignment-1", "Accepted"), "rpc_order_company_assignment_complete", { p_assignment_id: "assignment-1", p_completion_note: "Accepted" }],
    ["cancelAssignment", () => cancelAssignment("assignment-1", "No longer needed"), "rpc_order_company_assignment_cancel", { p_assignment_id: "assignment-1", p_reason: "No longer needed" }],
    ["revokeAssignment", () => revokeAssignment("assignment-1", "Offer expired"), "rpc_order_company_assignment_revoke", { p_assignment_id: "assignment-1", p_reason: "Offer expired" }],
  ])("routes %s through its backend assignment packet RPC", async (_name, action, rpcName, args) => {
    supabaseMock.rpc.mockResolvedValue({ data: [{ id: "assignment-1" }], error: null });

    await expect(action()).resolves.toEqual([{ id: "assignment-1" }]);

    expect(supabaseMock.rpc).toHaveBeenCalledWith(rpcName, args);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("throws assignment packet RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("assignment denied"), { code: "42501" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(acceptAssignment("assignment-1")).rejects.toBe(error);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
