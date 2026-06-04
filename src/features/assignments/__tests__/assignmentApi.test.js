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
  createOrderCompanyAssignmentInvitation,
  createOrderCompanyAssignmentWorkInvitation,
  declineAssignment,
  offerAssignment,
  offerOrderToVendor,
  readOrderCompanyAssignmentInvitation,
  readOrderCompanyAssignmentWorkInvitation,
  respondOrderCompanyAssignmentInvitation,
  respondOrderCompanyAssignmentWorkInvitation,
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

  it("offers an order to a vendor candidate through the existing assignment offer RPC", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: "assignment-vendor-1", error: null });

    await expect(
      offerOrderToVendor({
        orderId: "order-1",
        vendorProfileId: "vendor-profile-1",
        vendorCompanyId: "vendor-company-1",
        relationshipId: "relationship-1",
        note: "Please complete this assignment.",
        terms: { fee: 700 },
        dueAt: "2026-06-10T12:00:00.000Z",
        reviewDueAt: "2026-06-11T12:00:00.000Z",
        expiresAt: "2026-06-04T12:00:00.000Z",
        candidateSnapshot: {
          match_score: 95,
          match_reasons: { geography: { best_match: "zip" } },
          coverage_matches: [{ state: "OH", zip: "43215", product_type: "commercial" }],
          warning_flags: ["missing_order_market"],
        },
      }),
    ).resolves.toBe("assignment-vendor-1");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_company_assignment_offer", {
      p_order_id: "order-1",
      p_assigned_company_id: "vendor-company-1",
      p_relationship_id: "relationship-1",
      p_assignment_type: "vendor_appraisal",
      p_instructions: "Please complete this assignment.",
      p_terms: { fee: 700 },
      p_handoff_payload: {
        vendor_profile_id: "vendor-profile-1",
        vendor_company_id: "vendor-company-1",
        relationship_id: "relationship-1",
        match_score: 95,
        match_reasons: { geography: { best_match: "zip" } },
        coverage_matches: [{ state: "OH", zip: "43215", product_type: "commercial" }],
        warning_flags: ["missing_order_market"],
      },
      p_due_at: "2026-06-10T12:00:00.000Z",
      p_review_due_at: "2026-06-11T12:00:00.000Z",
      p_expires_at: "2026-06-04T12:00:00.000Z",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("throws vendor candidate offer errors for callers to handle", async () => {
    const error = Object.assign(new Error("active assignment already exists"), { code: "23505" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(
      offerOrderToVendor({
        orderId: "order-1",
        vendorProfileId: "vendor-profile-1",
        vendorCompanyId: "vendor-company-1",
        relationshipId: "relationship-1",
        note: "Please complete this assignment.",
      }),
    ).rejects.toBe(error);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("creates assignment invitation links through the backend RPC", async () => {
    const payload = { sent_to_email: "vendor@example.com" };
    const response = {
      invitation_id: "invitation-1",
      assignment_id: "assignment-1",
      path: "/vendor/assignment-offers/token-1",
    };
    supabaseMock.rpc.mockResolvedValue({ data: response, error: null });

    await expect(createOrderCompanyAssignmentInvitation("assignment-1", payload)).resolves.toBe(response);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_company_assignment_invitation_create", {
      p_assignment_id: "assignment-1",
      p_payload: payload,
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("normalizes default and null assignment invitation payloads to empty objects", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { path: "/vendor/assignment-offers/token-1" }, error: null });

    await createOrderCompanyAssignmentInvitation("assignment-1");
    await createOrderCompanyAssignmentInvitation("assignment-2", null);

    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(1, "rpc_order_company_assignment_invitation_create", {
      p_assignment_id: "assignment-1",
      p_payload: {},
    });
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(2, "rpc_order_company_assignment_invitation_create", {
      p_assignment_id: "assignment-2",
      p_payload: {},
    });
  });

  it("throws assignment invitation RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("assignment invitation denied"), { code: "42501" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(createOrderCompanyAssignmentInvitation("assignment-1")).rejects.toBe(error);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("creates assignment work invitation links through the backend RPC", async () => {
    const payload = { sent_to_email: "vendor@example.com" };
    const response = {
      invitation_id: "work-invitation-1",
      assignment_id: "assignment-1",
      path: "/vendor/assignment-work/token-1",
    };
    supabaseMock.rpc.mockResolvedValue({ data: response, error: null });

    await expect(createOrderCompanyAssignmentWorkInvitation("assignment-1", payload)).resolves.toBe(response);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_company_assignment_work_invitation_create", {
      p_assignment_id: "assignment-1",
      p_payload: payload,
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("normalizes default and null assignment work invitation payloads to empty objects", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { path: "/vendor/assignment-work/token-1" }, error: null });

    await createOrderCompanyAssignmentWorkInvitation("assignment-1");
    await createOrderCompanyAssignmentWorkInvitation("assignment-2", null);

    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(1, "rpc_order_company_assignment_work_invitation_create", {
      p_assignment_id: "assignment-1",
      p_payload: {},
    });
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(2, "rpc_order_company_assignment_work_invitation_create", {
      p_assignment_id: "assignment-2",
      p_payload: {},
    });
  });

  it("throws assignment work invitation create errors for callers to handle", async () => {
    const error = Object.assign(new Error("assignment work invitation denied"), { code: "42501" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(createOrderCompanyAssignmentWorkInvitation("assignment-1")).rejects.toBe(error);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("exports public assignment invitation read and respond wrappers", () => {
    expect(readOrderCompanyAssignmentInvitation).toEqual(expect.any(Function));
    expect(respondOrderCompanyAssignmentInvitation).toEqual(expect.any(Function));
    expect(readOrderCompanyAssignmentWorkInvitation).toEqual(expect.any(Function));
    expect(respondOrderCompanyAssignmentWorkInvitation).toEqual(expect.any(Function));
  });

  it("reads public assignment invitations through the token RPC", async () => {
    const response = {
      ok: true,
      access_mode: "assignment_offer_token",
      invitation: { status: "offered" },
    };
    supabaseMock.rpc.mockResolvedValue({ data: response, error: null });

    await expect(readOrderCompanyAssignmentInvitation("token-1")).resolves.toEqual(response);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_company_assignment_invitation_read", {
      p_token: "token-1",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("trims public assignment invitation tokens before reading", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { ok: true }, error: null });

    await readOrderCompanyAssignmentInvitation("  token-1  ");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_company_assignment_invitation_read", {
      p_token: "token-1",
    });
  });

  it("returns public assignment invitation business failures without throwing", async () => {
    const response = {
      ok: false,
      error: "assignment_invitation_invalid_or_expired",
    };
    supabaseMock.rpc.mockResolvedValue({ data: response, error: null });

    await expect(readOrderCompanyAssignmentInvitation("expired-token")).resolves.toEqual(response);
  });

  it("surfaces public assignment invitation read transport errors for callers to handle", async () => {
    const error = Object.assign(new Error("assignment invitation read failed"), { code: "500" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(readOrderCompanyAssignmentInvitation("token-1")).rejects.toBe(error);
  });

  it("responds to public assignment invitations through the token RPC", async () => {
    const response = {
      ok: true,
      status: "accepted",
      message: "Assignment accepted.",
    };
    supabaseMock.rpc.mockResolvedValue({ data: response, error: null });

    await expect(respondOrderCompanyAssignmentInvitation("token-1", "accept", "Ready")).resolves.toEqual(response);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_company_assignment_invitation_respond", {
      p_token: "token-1",
      p_action: "accept",
      p_reason: "Ready",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("trims public assignment invitation tokens before responding", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { ok: true, status: "accepted" }, error: null });

    await respondOrderCompanyAssignmentInvitation("  token-1  ", "accept");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_company_assignment_invitation_respond", {
      p_token: "token-1",
      p_action: "accept",
      p_reason: null,
    });
  });

  it("normalizes missing and empty public assignment decline reasons to null", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { ok: true, status: "declined" }, error: null });

    await respondOrderCompanyAssignmentInvitation("token-1", "decline");
    await respondOrderCompanyAssignmentInvitation("token-2", "decline", "");

    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(1, "rpc_order_company_assignment_invitation_respond", {
      p_token: "token-1",
      p_action: "decline",
      p_reason: null,
    });
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(2, "rpc_order_company_assignment_invitation_respond", {
      p_token: "token-2",
      p_action: "decline",
      p_reason: null,
    });
  });

  it("returns accepted and declined public assignment invitation success payloads as-is", async () => {
    const accepted = { ok: true, status: "accepted", message: "Assignment accepted." };
    const declined = { ok: true, status: "declined", message: "Assignment declined." };
    supabaseMock.rpc
      .mockResolvedValueOnce({ data: accepted, error: null })
      .mockResolvedValueOnce({ data: declined, error: null });

    await expect(respondOrderCompanyAssignmentInvitation("token-1", "accept")).resolves.toEqual(accepted);
    await expect(respondOrderCompanyAssignmentInvitation("token-2", "decline", "Capacity")).resolves.toEqual(declined);
  });

  it("returns public assignment invitation invalid or expired response without throwing", async () => {
    const response = {
      ok: false,
      error: "assignment_invitation_invalid_or_expired",
    };
    supabaseMock.rpc.mockResolvedValue({ data: response, error: null });

    await expect(respondOrderCompanyAssignmentInvitation("expired-token", "accept")).resolves.toEqual(response);
  });

  it("returns public assignment invitation validation business response without throwing", async () => {
    const response = {
      ok: false,
      error: "assignment_response_invalid",
      field_errors: {
        action: "Choose accept or decline.",
      },
    };
    supabaseMock.rpc.mockResolvedValue({ data: response, error: null });

    await expect(respondOrderCompanyAssignmentInvitation("token-1", "maybe")).resolves.toEqual(response);
  });

  it("surfaces public assignment invitation respond transport errors for callers to handle", async () => {
    const error = Object.assign(new Error("assignment invitation respond failed"), { code: "500" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(respondOrderCompanyAssignmentInvitation("token-1", "accept")).rejects.toBe(error);
  });

  it("reads public assignment work invitations through the token RPC", async () => {
    const response = {
      ok: true,
      access_mode: "assignment_work_token",
      assignment: { status: "accepted" },
    };
    supabaseMock.rpc.mockResolvedValue({ data: response, error: null });

    await expect(readOrderCompanyAssignmentWorkInvitation("token-1")).resolves.toEqual(response);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_company_assignment_work_invitation_read", {
      p_token: "token-1",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("trims public assignment work tokens before reading", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { ok: true }, error: null });

    await readOrderCompanyAssignmentWorkInvitation("  token-1  ");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_company_assignment_work_invitation_read", {
      p_token: "token-1",
    });
  });

  it("returns public assignment work business failures without throwing", async () => {
    const response = {
      ok: false,
      error: "assignment_work_invitation_invalid_or_expired",
    };
    supabaseMock.rpc.mockResolvedValue({ data: response, error: null });

    await expect(readOrderCompanyAssignmentWorkInvitation("expired-token")).resolves.toEqual(response);
  });

  it("surfaces public assignment work read transport errors for callers to handle", async () => {
    const error = Object.assign(new Error("assignment work read failed"), { code: "500" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(readOrderCompanyAssignmentWorkInvitation("token-1")).rejects.toBe(error);
  });

  it("responds to public assignment work invitations through the token RPC", async () => {
    const response = {
      ok: true,
      status: "in_progress",
      message: "Work started.",
    };
    const payload = { note: "Starting today" };
    supabaseMock.rpc.mockResolvedValue({ data: response, error: null });

    await expect(respondOrderCompanyAssignmentWorkInvitation("token-1", "start_work", payload)).resolves.toEqual(response);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_company_assignment_work_invitation_respond", {
      p_token: "token-1",
      p_action: "start_work",
      p_payload: payload,
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("trims public assignment work tokens and normalizes missing payloads before responding", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { ok: true, status: "in_progress" }, error: null });

    await respondOrderCompanyAssignmentWorkInvitation("  token-1  ", "start_work");
    await respondOrderCompanyAssignmentWorkInvitation("token-2", "submit_report", null);

    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(1, "rpc_order_company_assignment_work_invitation_respond", {
      p_token: "token-1",
      p_action: "start_work",
      p_payload: {},
    });
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(2, "rpc_order_company_assignment_work_invitation_respond", {
      p_token: "token-2",
      p_action: "submit_report",
      p_payload: {},
    });
  });

  it("returns public assignment work success and business failure payloads as-is", async () => {
    const started = { ok: true, status: "in_progress", message: "Work started." };
    const submitted = { ok: true, status: "submitted", message: "Report submitted." };
    const invalid = {
      ok: false,
      error: "assignment_work_response_invalid",
      field_errors: { action: "Choose start work or submit report." },
    };
    supabaseMock.rpc
      .mockResolvedValueOnce({ data: started, error: null })
      .mockResolvedValueOnce({ data: submitted, error: null })
      .mockResolvedValueOnce({ data: invalid, error: null });

    await expect(respondOrderCompanyAssignmentWorkInvitation("token-1", "start_work")).resolves.toEqual(started);
    await expect(respondOrderCompanyAssignmentWorkInvitation("token-2", "submit_report", { note: "Done" })).resolves.toEqual(submitted);
    await expect(respondOrderCompanyAssignmentWorkInvitation("token-3", "maybe")).resolves.toEqual(invalid);
  });

  it("surfaces public assignment work respond transport errors for callers to handle", async () => {
    const error = Object.assign(new Error("assignment work respond failed"), { code: "500" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(respondOrderCompanyAssignmentWorkInvitation("token-1", "start_work")).rejects.toBe(error);
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
