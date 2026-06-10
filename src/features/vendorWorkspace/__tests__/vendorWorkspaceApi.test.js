import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
const functionsInvokeMock = vi.hoisted(() => vi.fn());
const refreshSessionMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    rpc: rpcMock,
    functions: {
      invoke: functionsInvokeMock,
    },
    auth: {
      refreshSession: refreshSessionMock,
      getSession: getSessionMock,
    },
  },
}));

const {
  bootstrapVendorWorkspace,
  createVendorWorkspaceAssignmentDocumentDownloadUrl,
  createVendorWorkspaceCorrectedInvoiceUploadUrl,
  createVendorWorkspaceDocumentDownloadUrl,
  createVendorWorkspaceInvoiceUploadUrl,
  createVendorWorkspaceReportUploadUrl,
  declineVendorWorkspaceBidOpportunity,
  fetchVendorWorkspaceAssignedOrderDetail,
  fetchVendorWorkspaceAssignedOrders,
  fetchVendorWorkspaceAvailableWorkDetail,
  fetchVendorWorkspaceAvailableWork,
  fetchVendorWorkspaceDashboardSummary,
  fetchVendorWorkspaceMyBids,
  fetchVendorWorkspacePayments,
  fetchVendorWorkspaceProfile,
  fetchVendorWorkspaceProfileUpdateRequests,
  registerVendorWorkspaceCorrectedInvoiceDocument,
  registerVendorWorkspaceInvoiceDocument,
  registerVendorWorkspaceReportDocument,
  resubmitVendorWorkspaceInvoice,
  resubmitVendorWorkspaceReport,
  startVendorWorkspaceAssignedOrder,
  submitVendorWorkspaceBidResponse,
  submitVendorWorkspaceProfileUpdateRequest,
  submitVendorWorkspaceInvoice,
  submitVendorWorkspaceReport,
} = await import("../api.js");

const apiSource = readFileSync(resolve(process.cwd(), "src/features/vendorWorkspace/api.js"), "utf8");

describe("vendorWorkspace api", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    functionsInvokeMock.mockReset();
    refreshSessionMock.mockReset();
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: {
            email: "vendor@example.com",
            app_metadata: {
              active_company_id: "vendor-company-id",
            },
          },
        },
      },
      error: null,
    });
  });

  it("bootstraps authenticated vendor workspace access and switches to the vendor company context", async () => {
    const response = {
      ok: true,
      vendor_company_id: "vendor-company-id",
      vendor_company_name: "Acme Appraisal",
      vendor_profile_id: "vendor-profile-id",
      vendor_contact_id: "vendor-contact-id",
      relationship_id: "relationship-id",
      membership_id: "membership-id",
      role_assignment_id: "role-assignment-id",
      contact_linked: true,
      permission_keys: ["vendor_workspace.view"],
      has_vendor_workspace_view: true,
      diagnostics: { matched_vendor_contact: true },
    };
    rpcMock.mockImplementation((functionName) => {
      if (functionName === "rpc_vendor_workspace_bootstrap") {
        return Promise.resolve({ data: response, error: null });
      }
      if (functionName === "rpc_current_company_context") {
        return Promise.resolve({
          data: { current_company_id: "vendor-company-id" },
          error: null,
        });
      }
      if (functionName === "current_app_user_permission_keys") {
        return Promise.resolve({ data: ["vendor_workspace.view"], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    functionsInvokeMock.mockResolvedValue({
      data: { ok: true, session_refresh_required: true },
      error: null,
    });
    refreshSessionMock.mockResolvedValue({ data: {}, error: null });

    await expect(bootstrapVendorWorkspace()).resolves.toEqual(
      expect.objectContaining({
        ...response,
        error: null,
        debug: expect.objectContaining({
          bootstrap: expect.objectContaining({
            vendor_company_id: "vendor-company-id",
            membership_id: "membership-id",
            has_vendor_workspace_view: true,
          }),
          set_active_company: expect.objectContaining({
            active_company_id_sent: "vendor-company-id",
            response: { ok: true, session_refresh_required: true },
          }),
          session_after_refresh: expect.objectContaining({
            active_company_id: "vendor-company-id",
            user_email: "vendor@example.com",
          }),
          permission_reload: expect.objectContaining({
            current_company_id: "vendor-company-id",
            has_vendor_workspace_view: true,
          }),
        }),
      }),
    );
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_bootstrap");
    expect(functionsInvokeMock).toHaveBeenCalledWith("set-active-company", {
      body: {
        company_id: "vendor-company-id",
        reason: "vendor_workspace_bootstrap",
        request_id: "vendor-workspace-bootstrap-vendor-company-id",
      },
    });
    expect(refreshSessionMock).toHaveBeenCalled();
    expect(getSessionMock).toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith("rpc_current_company_context");
    expect(rpcMock).toHaveBeenCalledWith("current_app_user_permission_keys");
  });

  it("normalizes missing vendor workspace bootstrap responses to a denied shape", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await expect(bootstrapVendorWorkspace()).resolves.toEqual({
      ok: false,
      error: "vendor_workspace_bootstrap_unavailable",
    });
    expect(functionsInvokeMock).not.toHaveBeenCalled();
  });

  it("propagates vendor workspace bootstrap RPC errors for the route guard", async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error("app_user_not_found") });

    await expect(bootstrapVendorWorkspace()).rejects.toThrow("app_user_not_found");
  });

  it("propagates vendor workspace active-company switch errors", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        vendor_company_id: "vendor-company-id",
      },
      error: null,
    });
    functionsInvokeMock.mockResolvedValue({
      data: { ok: false, code: "company_membership_required" },
      error: null,
    });

    await expect(bootstrapVendorWorkspace()).rejects.toThrow("company_membership_required");
  });

  it("propagates missing set-active-company function errors for graceful route denial", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        vendor_company_id: "vendor-company-id",
      },
      error: null,
    });
    functionsInvokeMock.mockResolvedValue({
      data: null,
      error: new Error("Function not found"),
    });

    await expect(bootstrapVendorWorkspace()).rejects.toMatchObject({
      message: "Function not found",
      vendorWorkspaceDiagnostics: expect.objectContaining({
        bootstrap: expect.objectContaining({
          vendor_company_id: "vendor-company-id",
        }),
        set_active_company: expect.objectContaining({
          active_company_id_sent: "vendor-company-id",
          error: "Function not found",
        }),
      }),
    });
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });

  it("loads dashboard summary through the vendor-scoped RPC", async () => {
    const summary = {
      ok: true,
      counts: {
        available_work: 1,
        pending_bids: 2,
        assignment_offers: 3,
        active_assigned_orders: 4,
        submitted_awaiting_review: 5,
        needs_attention: 6,
      },
      actions: [{ kind: "bid_request", label: "Submit bid" }],
    };
    rpcMock.mockResolvedValue({ data: summary, error: null });

    await expect(fetchVendorWorkspaceDashboardSummary()).resolves.toEqual(summary);
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_dashboard_summary");
  });

  it("normalizes missing response sections to the safe empty dashboard shape", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });

    await expect(fetchVendorWorkspaceDashboardSummary()).resolves.toEqual({
      ok: true,
      counts: {
        available_work: 0,
        pending_bids: 0,
        assignment_offers: 0,
        active_assigned_orders: 0,
        submitted_awaiting_review: 0,
        needs_attention: 0,
      },
      actions: [],
    });
  });

  it("propagates RPC errors so the dashboard can show its safe error state", async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error("vendor_workspace_view_permission_required") });

    await expect(fetchVendorWorkspaceDashboardSummary()).rejects.toThrow(
      "vendor_workspace_view_permission_required",
    );
  });

  it("loads vendor profile through the vendor-scoped RPC", async () => {
    const profile = {
      ok: true,
      profile: {
        company: { name: "Field Partner Valuation" },
        coverage: { states: ["OH"], row_count: 1 },
      },
    };
    rpcMock.mockResolvedValue({ data: profile, error: null });

    await expect(fetchVendorWorkspaceProfile()).resolves.toEqual({
      ok: true,
      error: null,
      profile: profile.profile,
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_profile");
  });

  it("normalizes missing vendor profile responses to the safe empty shape", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await expect(fetchVendorWorkspaceProfile()).resolves.toEqual({
      ok: false,
      profile: null,
    });
  });

  it("propagates vendor profile RPC errors so the page can show its safe error state", async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error("vendor_profile_read_permission_required") });

    await expect(fetchVendorWorkspaceProfile()).rejects.toThrow(
      "vendor_profile_read_permission_required",
    );
  });

  it("loads Vendor Workspace payments through the vendor-scoped RPC", async () => {
    const payments = {
      ok: true,
      items: [
        {
          payment_key: "payment-key-1",
          assignment_work_key: "assignment-work-key-1",
          payment_status_key: "ready_for_invoice",
          payment_status: "Ready for Invoice",
          vendor_fee_amount: 1250,
          currency: "USD",
        },
      ],
    };
    rpcMock.mockResolvedValue({ data: payments, error: null });

    await expect(fetchVendorWorkspacePayments()).resolves.toEqual({
      ok: true,
      error: null,
      items: payments.items,
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_payments");
  });

  it("normalizes missing Vendor Workspace payments responses to the safe empty shape", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await expect(fetchVendorWorkspacePayments()).resolves.toEqual({
      ok: true,
      items: [],
    });
  });

  it("propagates Vendor Workspace payments RPC errors so the page can show its safe error state", async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error("vendor_payments_read_permission_required") });

    await expect(fetchVendorWorkspacePayments()).rejects.toThrow(
      "vendor_payments_read_permission_required",
    );
  });

  it("loads vendor profile update requests through the vendor-scoped RPC", async () => {
    const requestRows = {
      ok: true,
      requests: [
        {
          request_key: "opaque-request-key",
          status: "pending",
          proposed_changes: { comments: "Please update counties." },
        },
      ],
    };
    rpcMock.mockResolvedValue({ data: requestRows, error: null });

    await expect(fetchVendorWorkspaceProfileUpdateRequests()).resolves.toEqual({
      ok: true,
      error: null,
      requests: requestRows.requests,
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_profile_update_requests");
  });

  it("normalizes missing vendor profile update request responses to the safe empty shape", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await expect(fetchVendorWorkspaceProfileUpdateRequests()).resolves.toEqual({
      ok: true,
      requests: [],
    });
  });

  it("submits vendor profile update requests through the vendor-scoped RPC", async () => {
    const payload = {
      contact_changes: { email: "updated@example.com" },
      comments: "Update contact email.",
    };
    const response = {
      ok: true,
      request: {
        request_key: "opaque-request-key",
        status: "pending",
      },
    };
    rpcMock.mockResolvedValue({ data: response, error: null });

    await expect(submitVendorWorkspaceProfileUpdateRequest(payload)).resolves.toEqual({
      ok: true,
      error: null,
      request: response.request,
      field_errors: {},
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_submit_profile_update_request", {
      p_payload: payload,
    });
  });

  it("returns vendor profile update request validation errors without throwing", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: false,
        error: "profile_update_request_invalid",
        field_errors: { request: "Add at least one proposed change or explanation." },
      },
      error: null,
    });

    await expect(submitVendorWorkspaceProfileUpdateRequest({})).resolves.toEqual({
      ok: false,
      error: "profile_update_request_invalid",
      request: null,
      field_errors: { request: "Add at least one proposed change or explanation." },
    });
  });

  it("loads available work through the vendor-scoped RPC", async () => {
    const availableWork = {
      ok: true,
      items: [
        {
          work_key: "work-key-1",
          status: "due_soon",
          order: { order_number: "AMC-DEMO-003" },
          owner: { company_name: "Continental AMC" },
        },
      ],
    };
    rpcMock.mockResolvedValue({ data: availableWork, error: null });

    await expect(fetchVendorWorkspaceAvailableWork()).resolves.toEqual(availableWork);
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_available_work");
  });

  it("normalizes missing available work sections to the safe empty shape", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });

    await expect(fetchVendorWorkspaceAvailableWork()).resolves.toEqual({
      ok: true,
      items: [],
    });
  });

  it("propagates available work RPC errors so the page can show its safe error state", async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error("vendor_bids_read_permission_required") });

    await expect(fetchVendorWorkspaceAvailableWork()).rejects.toThrow(
      "vendor_bids_read_permission_required",
    );
  });

  it("loads available work detail through the vendor-scoped detail RPC", async () => {
    const detail = {
      ok: true,
      item: {
        work_key: "work-key-1",
        status: "available",
        order: { order_number: "AMC-DEMO-004" },
        documents: [],
      },
    };
    rpcMock.mockResolvedValue({ data: detail, error: null });

    await expect(fetchVendorWorkspaceAvailableWorkDetail("work-key-1")).resolves.toEqual({
      ok: true,
      error: null,
      item: detail.item,
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_available_work_detail", {
      p_work_key: "work-key-1",
    });
  });

  it("passes through unified history-state work detail fields safely", async () => {
    const detail = {
      ok: true,
      item: {
        work_key: "submitted-work-key",
        status: "selected",
        selection_outcome: "selected",
        order: { order_number: "AMC-DEMO-006" },
        bid: {
          fee_amount: 1800,
          currency: "USD",
          submitted_at: "2026-06-04T19:00:00.000Z",
        },
        decline: null,
        documents: [],
      },
    };
    rpcMock.mockResolvedValue({ data: detail, error: null });

    await expect(fetchVendorWorkspaceAvailableWorkDetail("submitted-work-key")).resolves.toEqual({
      ok: true,
      error: null,
      item: detail.item,
    });
  });

  it("normalizes unavailable available work detail responses to a safe empty state", async () => {
    rpcMock.mockResolvedValue({
      data: { ok: false, error: "available_work_unavailable" },
      error: null,
    });

    await expect(fetchVendorWorkspaceAvailableWorkDetail("missing")).resolves.toEqual({
      ok: false,
      error: "available_work_unavailable",
      item: null,
    });
  });

  it("loads My Bids through the vendor-scoped RPC", async () => {
    const myBids = {
      ok: true,
      items: [
        {
          work_key: "work-key-1",
          bid_status: "submitted",
          order: { order_number: "AMC-DEMO-004" },
          owner: { company_name: "Continental AMC" },
        },
      ],
    };
    rpcMock.mockResolvedValue({ data: myBids, error: null });

    await expect(fetchVendorWorkspaceMyBids()).resolves.toEqual(myBids);
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_my_bids");
  });

  it("loads assigned orders through the vendor-scoped RPC", async () => {
    const assignedOrders = {
      ok: true,
      items: [
        {
          assignment_work_key: "assignment-work-key-1",
          assignment_status: "in_progress",
          status_label: "In Progress",
          order: { order_number: "AMC-DEMO-009" },
          owner: { company_name: "Continental AMC" },
        },
      ],
    };
    rpcMock.mockResolvedValue({ data: assignedOrders, error: null });

    await expect(fetchVendorWorkspaceAssignedOrders()).resolves.toEqual(assignedOrders);
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_assigned_orders");
  });

  it("loads assigned order detail through the vendor-scoped RPC", async () => {
    const detail = {
      ok: true,
      item: {
        assignment_work_key: "assignment-work-key-1",
        assignment_status: "accepted_not_started",
        order: { order_number: "AMC-DEMO-009" },
        owner: { company_name: "Continental AMC" },
        documents: [],
      },
    };
    rpcMock.mockResolvedValue({ data: detail, error: null });

    await expect(fetchVendorWorkspaceAssignedOrderDetail("assignment-work-key-1")).resolves.toEqual({
      ok: true,
      error: null,
      item: detail.item,
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_assigned_order_detail", {
      p_assignment_work_key: "assignment-work-key-1",
    });
  });

  it("normalizes unavailable assigned order detail responses to a safe empty state", async () => {
    rpcMock.mockResolvedValue({
      data: { ok: false, error: "assigned_order_unavailable" },
      error: null,
    });

    await expect(fetchVendorWorkspaceAssignedOrderDetail("missing")).resolves.toEqual({
      ok: false,
      error: "assigned_order_unavailable",
      item: null,
    });
  });

  it("starts assigned work through the vendor-scoped progress RPC", async () => {
    const response = {
      ok: true,
      status: "in_progress",
      message: "Work started.",
      started_at: "2026-06-04T22:30:00.000Z",
    };
    rpcMock.mockResolvedValue({ data: response, error: null });

    await expect(startVendorWorkspaceAssignedOrder("assignment-work-key-1")).resolves.toEqual({
      ok: true,
      status: "in_progress",
      error: null,
      message: "Work started.",
      started_at: "2026-06-04T22:30:00.000Z",
      field_errors: {},
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_start_assigned_order", {
      p_assignment_work_key: "assignment-work-key-1",
    });
  });

  it("normalizes assigned work start validation responses", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: false,
        error: "assignment_start_invalid",
        field_errors: { action: "Only accepted assignments that have not started can be started." },
      },
      error: null,
    });

    await expect(startVendorWorkspaceAssignedOrder("assignment-work-key-1")).resolves.toEqual({
      ok: false,
      status: null,
      error: "assignment_start_invalid",
      message: null,
      started_at: null,
      field_errors: { action: "Only accepted assignments that have not started can be started." },
    });
  });

  it("submits assigned report through the vendor-scoped progress RPC", async () => {
    const response = {
      ok: true,
      status: "submitted",
      message: "Report submitted.",
      submitted_at: "2026-06-04T23:30:00.000Z",
    };
    const payload = { comments: "Report is ready for review.", document_keys: ["d".repeat(64)] };
    rpcMock.mockResolvedValue({ data: response, error: null });

    await expect(submitVendorWorkspaceReport("assignment-work-key-1", payload)).resolves.toEqual({
      ok: true,
      status: "submitted",
      error: null,
      message: "Report submitted.",
      submitted_at: "2026-06-04T23:30:00.000Z",
      field_errors: {},
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_submit_report", {
      p_assignment_work_key: "assignment-work-key-1",
      p_payload: payload,
    });
  });

  it("creates a vendor report upload URL through the assignment-scoped Edge helper", async () => {
    const response = {
      ok: true,
      document: {
        document_key: "d".repeat(64),
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
      },
      upload: {
        signed_url: "https://example.test/vendor-report-upload",
        token: "signed-token",
      },
    };
    functionsInvokeMock.mockResolvedValue({ data: response, error: null });

    await expect(
      createVendorWorkspaceReportUploadUrl("assignment-work-key-1", {
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
      }),
    ).resolves.toEqual(response);
    expect(functionsInvokeMock).toHaveBeenCalledWith("vendor-workspace-report-upload-url", {
      body: {
        assignment_work_key: "assignment-work-key-1",
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
        document_role: "submitted_report",
      },
    });
  });

  it("preserves structured vendor report upload URL errors from the Edge helper", async () => {
    functionsInvokeMock.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: new globalThis.Response(
          JSON.stringify({
            ok: false,
            code: "upload_not_authorized",
            message: "You cannot upload reports for this assignment.",
            details: {
              rpc_code: "42501",
              rpc_message: "vendor_documents_upload_permission_required",
            },
          }),
          { status: 403, headers: { "content-type": "application/json" } },
        ),
      },
    });

    await expect(
      createVendorWorkspaceReportUploadUrl("assignment-work-key-1", {
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
      }),
    ).rejects.toMatchObject({
      message: "You cannot upload reports for this assignment.",
      code: "upload_not_authorized",
      details: {
        rpc_code: "42501",
        rpc_message: "vendor_documents_upload_permission_required",
      },
    });
  });

  it("creates a vendor invoice upload URL through the assignment-scoped Edge helper", async () => {
    const response = {
      ok: true,
      document: {
        document_key: "i".repeat(64),
        file_name: "invoice.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
      },
      upload: {
        signed_url: "https://example.test/vendor-invoice-upload",
        token: "signed-token",
      },
    };
    functionsInvokeMock.mockResolvedValue({ data: response, error: null });

    await expect(
      createVendorWorkspaceInvoiceUploadUrl("assignment-work-key-1", {
        file_name: "invoice.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
      }),
    ).resolves.toEqual(response);
    expect(functionsInvokeMock).toHaveBeenCalledWith("vendor-workspace-invoice-upload-url", {
      body: {
        assignment_work_key: "assignment-work-key-1",
        file_name: "invoice.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
        document_role: "vendor_invoice",
      },
    });
  });

  it("reuses the vendor invoice upload helper for corrected invoice uploads", async () => {
    const response = {
      ok: true,
      document: {
        document_key: "j".repeat(64),
        file_name: "corrected-invoice.pdf",
      },
      upload: {
        signed_url: "https://example.test/vendor-corrected-invoice-upload",
      },
    };
    functionsInvokeMock.mockResolvedValue({ data: response, error: null });

    await expect(
      createVendorWorkspaceCorrectedInvoiceUploadUrl("assignment-work-key-1", {
        file_name: "corrected-invoice.pdf",
        mime_type: "application/pdf",
        file_size: 2345,
      }),
    ).resolves.toEqual({
      ok: true,
      document: response.document,
      upload: {
        signed_url: "https://example.test/vendor-corrected-invoice-upload",
        token: null,
      },
    });
    expect(functionsInvokeMock).toHaveBeenCalledWith("vendor-workspace-invoice-upload-url", {
      body: {
        assignment_work_key: "assignment-work-key-1",
        file_name: "corrected-invoice.pdf",
        mime_type: "application/pdf",
        file_size: 2345,
        document_role: "vendor_invoice",
      },
    });
  });

  it("registers a vendor report document through the vendor-scoped RPC", async () => {
    const response = {
      ok: true,
      document: {
        document_key: "d".repeat(64),
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
      },
    };
    rpcMock.mockResolvedValue({ data: response, error: null });

    await expect(
      registerVendorWorkspaceReportDocument("assignment-work-key-1", {
        document_key: "d".repeat(64),
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
      }),
    ).resolves.toEqual({
      ok: true,
      error: null,
      document: response.document,
      field_errors: {},
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_register_report_document", {
      p_assignment_work_key: "assignment-work-key-1",
      p_payload: {
        document_key: "d".repeat(64),
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
        document_role: "submitted_report",
      },
    });
  });

  it("registers a vendor invoice document through the vendor-scoped RPC", async () => {
    const response = {
      ok: true,
      document: {
        document_key: "i".repeat(64),
        file_name: "invoice.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
      },
    };
    rpcMock.mockResolvedValue({ data: response, error: null });

    await expect(
      registerVendorWorkspaceInvoiceDocument("assignment-work-key-1", {
        document_key: "i".repeat(64),
        file_name: "invoice.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
      }),
    ).resolves.toEqual({
      ok: true,
      error: null,
      document: response.document,
      field_errors: {},
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_register_invoice_document", {
      p_assignment_work_key: "assignment-work-key-1",
      p_payload: {
        document_key: "i".repeat(64),
        file_name: "invoice.pdf",
        mime_type: "application/pdf",
        file_size: 1234,
        document_role: "vendor_invoice",
      },
    });
  });

  it("reuses invoice document registration for corrected invoice documents", async () => {
    const response = {
      ok: true,
      document: {
        document_key: "j".repeat(64),
        file_name: "corrected-invoice.pdf",
      },
    };
    rpcMock.mockResolvedValue({ data: response, error: null });

    await expect(
      registerVendorWorkspaceCorrectedInvoiceDocument("assignment-work-key-1", {
        document_key: "j".repeat(64),
        file_name: "corrected-invoice.pdf",
      }),
    ).resolves.toEqual({
      ok: true,
      error: null,
      document: response.document,
      field_errors: {},
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_register_invoice_document", {
      p_assignment_work_key: "assignment-work-key-1",
      p_payload: {
        document_key: "j".repeat(64),
        file_name: "corrected-invoice.pdf",
        mime_type: null,
        file_size: null,
        document_role: "vendor_invoice",
      },
    });
  });

  it("submits a vendor invoice through the payment-scoped RPC", async () => {
    const response = {
      ok: true,
      status: "invoice_received",
      message: "Invoice submitted.",
      invoice: {
        invoice_number: "INV-1001",
        invoice_amount: 1250,
        currency: "USD",
      },
    };
    rpcMock.mockResolvedValue({ data: response, error: null });

    await expect(
      submitVendorWorkspaceInvoice("assignment-work-key-1", {
        invoice_number: "INV-1001",
        invoice_amount: 1250,
        currency: "USD",
        invoice_date: "2026-06-05",
        vendor_note: "Thank you.",
        document_keys: ["i".repeat(64)],
      }),
    ).resolves.toEqual({
      ok: true,
      status: "invoice_received",
      error: null,
      message: "Invoice submitted.",
      invoice: response.invoice,
      field_errors: {},
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_submit_invoice", {
      p_assignment_work_key: "assignment-work-key-1",
      p_payload: {
        invoice_number: "INV-1001",
        invoice_amount: 1250,
        currency: "USD",
        invoice_date: "2026-06-05",
        vendor_note: "Thank you.",
        document_keys: ["i".repeat(64)],
      },
    });
  });

  it("normalizes vendor invoice submission validation responses", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: false,
        error: "invoice_submission_invalid",
        field_errors: { document_keys: "Upload at least one invoice file before submitting." },
      },
      error: null,
    });

    await expect(submitVendorWorkspaceInvoice("assignment-work-key-1", {})).resolves.toEqual({
      ok: false,
      status: null,
      error: "invoice_submission_invalid",
      message: null,
      invoice: null,
      field_errors: { document_keys: "Upload at least one invoice file before submitting." },
    });
  });

  it("resubmits a corrected vendor invoice through the payment-scoped RPC", async () => {
    const response = {
      ok: true,
      status: "invoice_received",
      message: "Corrected invoice submitted.",
      invoice: {
        invoice_number: "INV-1001-R",
        invoice_amount: 1200,
        currency: "USD",
      },
    };
    rpcMock.mockResolvedValue({ data: response, error: null });

    await expect(
      resubmitVendorWorkspaceInvoice("assignment-work-key-1", {
        invoice_number: "INV-1001-R",
        invoice_amount: 1200,
        currency: "USD",
        invoice_date: "2026-06-06",
        vendor_note: "Corrected amount.",
        document_keys: ["j".repeat(64)],
      }),
    ).resolves.toEqual({
      ok: true,
      status: "invoice_received",
      error: null,
      message: "Corrected invoice submitted.",
      invoice: response.invoice,
      field_errors: {},
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_resubmit_invoice", {
      p_assignment_work_key: "assignment-work-key-1",
      p_payload: {
        invoice_number: "INV-1001-R",
        invoice_amount: 1200,
        currency: "USD",
        invoice_date: "2026-06-06",
        vendor_note: "Corrected amount.",
        document_keys: ["j".repeat(64)],
      },
    });
  });

  it("normalizes assigned report submission validation responses", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: false,
        error: "report_submission_invalid",
        field_errors: { action: "Only in-progress assignments can be submitted." },
      },
      error: null,
    });

    await expect(submitVendorWorkspaceReport("assignment-work-key-1", {})).resolves.toEqual({
      ok: false,
      status: null,
      error: "report_submission_invalid",
      message: null,
      submitted_at: null,
      field_errors: { action: "Only in-progress assignments can be submitted." },
    });
  });

  it("resubmits an assigned report through the vendor-scoped revision RPC", async () => {
    const response = {
      ok: true,
      status: "submitted",
      message: "Report resubmitted.",
      resubmitted_at: "2026-06-05T15:00:00.000Z",
      submitted_at: "2026-06-05T15:00:00.000Z",
    };
    const payload = { comments: "Revision complete.", document_keys: ["e".repeat(64)] };
    rpcMock.mockResolvedValue({ data: response, error: null });

    await expect(resubmitVendorWorkspaceReport("assignment-work-key-1", payload)).resolves.toEqual({
      ok: true,
      status: "submitted",
      error: null,
      message: "Report resubmitted.",
      resubmitted_at: "2026-06-05T15:00:00.000Z",
      submitted_at: "2026-06-05T15:00:00.000Z",
      field_errors: {},
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_resubmit_report", {
      p_assignment_work_key: "assignment-work-key-1",
      p_payload: payload,
    });
  });

  it("normalizes missing assigned orders sections to the safe empty shape", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });

    await expect(fetchVendorWorkspaceAssignedOrders()).resolves.toEqual({
      ok: true,
      items: [],
    });
  });

  it("propagates assigned orders RPC errors so the page can show its safe error state", async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error("vendor_assignments_read_permission_required") });

    await expect(fetchVendorWorkspaceAssignedOrders()).rejects.toThrow(
      "vendor_assignments_read_permission_required",
    );
  });

  it("creates a vendor document download URL through the vendor Edge helper", async () => {
    const response = {
      ok: true,
      signed_url: "https://example.test/vendor-signed-download",
      expires_in: 300,
      document: {
        document_key: "document-key-1",
        file_name: "engagement-letter.pdf",
      },
    };
    functionsInvokeMock.mockResolvedValue({ data: response, error: null });

    await expect(
      createVendorWorkspaceDocumentDownloadUrl("work-key-1", "document-key-1"),
    ).resolves.toEqual(response);
    expect(functionsInvokeMock).toHaveBeenCalledWith("vendor-workspace-document-download-url", {
      body: {
        work_key: "work-key-1",
        document_key: "document-key-1",
      },
    });
  });

  it("creates an assignment-scoped vendor document download URL through the vendor Edge helper", async () => {
    const response = {
      ok: true,
      signed_url: "https://example.test/vendor-assignment-signed-download",
      expires_in: 300,
      document: {
        document_key: "assignment-document-key-1",
        file_name: "assignment-engagement.pdf",
      },
    };
    functionsInvokeMock.mockResolvedValue({ data: response, error: null });

    await expect(
      createVendorWorkspaceAssignmentDocumentDownloadUrl(
        "assignment-work-key-1",
        "assignment-document-key-1",
      ),
    ).resolves.toEqual(response);
    expect(functionsInvokeMock).toHaveBeenCalledWith("vendor-workspace-document-download-url", {
      body: {
        assignment_work_key: "assignment-work-key-1",
        document_key: "assignment-document-key-1",
      },
    });
  });

  it("propagates vendor document download errors safely", async () => {
    functionsInvokeMock.mockResolvedValue({
      data: null,
      error: new Error("You cannot download this document."),
    });

    await expect(
      createVendorWorkspaceDocumentDownloadUrl("work-key-1", "document-key-1"),
    ).rejects.toThrow("You cannot download this document.");
  });

  it("normalizes missing My Bids sections to the safe empty shape", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });

    await expect(fetchVendorWorkspaceMyBids()).resolves.toEqual({
      ok: true,
      items: [],
    });
  });

  it("submits an authenticated vendor bid response through the vendor-scoped RPC", async () => {
    const response = {
      ok: true,
      status: "bid_submitted",
      submitted_at: "2026-06-04T18:00:00.000Z",
      message: "Your bid has been submitted.",
      bid: {
        fee_amount: 1200,
        currency: "USD",
        turn_time_days: 8,
        submitted_at: "2026-06-04T18:00:00.000Z",
      },
    };
    const payload = { fee_amount: "1200", currency: "USD", turn_time_days: "8" };
    rpcMock.mockResolvedValue({ data: response, error: null });

    await expect(submitVendorWorkspaceBidResponse("work-key-1", payload)).resolves.toEqual({
      ok: true,
      status: "bid_submitted",
      error: null,
      message: "Your bid has been submitted.",
      submitted_at: "2026-06-04T18:00:00.000Z",
      bid: response.bid,
      field_errors: {},
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_submit_bid_response", {
      p_work_key: "work-key-1",
      p_payload: payload,
    });
  });

  it("normalizes vendor submit validation responses", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: false,
        error: "bid_submission_invalid",
        field_errors: { fee_amount: "Fee amount is required." },
      },
      error: null,
    });

    await expect(submitVendorWorkspaceBidResponse("work-key-1", {})).resolves.toEqual({
      ok: false,
      status: null,
      error: "bid_submission_invalid",
      message: null,
      submitted_at: null,
      bid: null,
      field_errors: { fee_amount: "Fee amount is required." },
    });
  });

  it("declines an authenticated vendor bid opportunity through the vendor-scoped RPC", async () => {
    const response = {
      ok: true,
      status: "declined",
      declined_at: "2026-06-04T18:30:00.000Z",
      message: "Opportunity declined.",
      decline: {
        status: "declined",
        reason: "Too busy / capacity",
        comments: "At capacity next week.",
        declined_at: "2026-06-04T18:30:00.000Z",
      },
    };
    const payload = { reason: "Too busy / capacity", comments: "At capacity next week." };
    rpcMock.mockResolvedValue({ data: response, error: null });

    await expect(declineVendorWorkspaceBidOpportunity("work-key-1", payload)).resolves.toEqual({
      ok: true,
      status: "declined",
      error: null,
      message: "Opportunity declined.",
      declined_at: "2026-06-04T18:30:00.000Z",
      decline: response.decline,
      bid: null,
      field_errors: {},
    });
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_decline_bid_opportunity", {
      p_work_key: "work-key-1",
      p_payload: payload,
    });
  });

  it("normalizes vendor decline validation responses", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: false,
        error: "bid_decline_invalid",
        field_errors: { reason: "Choose a valid decline reason." },
      },
      error: null,
    });

    await expect(declineVendorWorkspaceBidOpportunity("work-key-1", {})).resolves.toEqual({
      ok: false,
      status: null,
      error: "bid_decline_invalid",
      message: null,
      declined_at: null,
      decline: null,
      bid: null,
      field_errors: { reason: "Choose a valid decline reason." },
    });
  });

  it("keeps vendor workspace API isolated from shared order and owner-side bid APIs", () => {
    expect(apiSource).not.toContain("@/features/orders");
    expect(apiSource).not.toContain("@/features/vendors");
    expect(apiSource).not.toContain("@/features/clients");
    expect(apiSource).not.toContain("@/features/bids");
    expect(apiSource).not.toContain("rpc_order_vendor_bid_request_create");
    expect(apiSource).not.toContain("rpc_order_vendor_bid_requests_for_order");
    expect(apiSource).not.toContain("rpc_order_vendor_bid_response_record");
    expect(apiSource).not.toContain("rpc_order_vendor_bid_response_select");
    expect(apiSource).not.toContain("rpc_order_vendor_bid_invitation_submit");
  });
});
