import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    rpc: rpcMock,
  },
}));

const {
  listCompanyAssignableAppraisers,
  listCompanyAssignableReviewers,
  listCompanyAssignableUsers,
} = await import("../assignableUsersApi.js");

describe("assignableUsersApi", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("loads assignable users through the current-company RPC and normalizes default split", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          user_id: "user-appraiser",
          display_name: "Smoke Appraiser",
          default_split_pct: 42.5,
          can_be_appraiser: true,
          can_be_reviewer: false,
        },
      ],
      error: null,
    });

    const users = await listCompanyAssignableUsers("order_assignment");

    expect(rpcMock).toHaveBeenCalledWith("rpc_company_assignable_users", {
      p_purpose: "order_assignment",
    });
    expect(users).toEqual([
      expect.objectContaining({
        id: "user-appraiser",
        user_id: "user-appraiser",
        fee_split: 42.5,
        split: 42.5,
        default_split_pct: 42.5,
      }),
    ]);
  });

  it("uses appraiser and reviewer purpose helpers", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await listCompanyAssignableAppraisers();
    await listCompanyAssignableReviewers();

    expect(rpcMock).toHaveBeenNthCalledWith(1, "rpc_company_assignable_users", {
      p_purpose: "appraiser",
    });
    expect(rpcMock).toHaveBeenNthCalledWith(2, "rpc_company_assignable_users", {
      p_purpose: "reviewer",
    });
  });

  it("propagates RPC errors so forms can show the existing safe load failure state", async () => {
    const error = new Error("assignable_users_permission_required");
    rpcMock.mockResolvedValue({ data: null, error });

    await expect(listCompanyAssignableUsers()).rejects.toThrow(
      "assignable_users_permission_required",
    );
  });
});
