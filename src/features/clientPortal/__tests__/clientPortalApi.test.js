import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

const supabase = (await import("@/lib/supabaseClient")).default;
const {
  clientPortalRpcNames,
  acceptClientPortalInvitation,
  createClientPortalReportDownloadUrl,
  getClientPortalOrderDetail,
  getClientPortalDashboard,
  listClientPortalOrders,
  listClientPortalPendingOrderRequests,
  readClientPortalInvitation,
  normalizeClientPortalOrderDetail,
  submitClientPortalOrderRequest,
} = await import("../api");

describe("clientPortalApi", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
    supabase.functions.invoke.mockReset();
  });

  it("loads dashboard summary through the dedicated dashboard RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        active_order_count: 2,
        report_available_count: 1,
        next_due_at: "2026-06-15",
        recent_orders: [
          {
            order_key: "portal-order-1",
            order_number: "CP-001",
            property_address: "100 Main St",
          },
        ],
      },
      error: null,
    });

    await expect(getClientPortalDashboard()).resolves.toEqual({
      activeOrderCount: 2,
      completedOrderCount: 0,
      reportAvailableCount: 1,
      nextDueAt: "2026-06-15",
      recentOrders: [
        expect.objectContaining({
          orderKey: "portal-order-1",
          orderNumber: "CP-001",
        }),
      ],
    });

    expect(supabase.rpc).toHaveBeenCalledWith(clientPortalRpcNames.dashboard);
  });

  it("lists client portal orders through the dedicated client-safe RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          order_key: "portal-order-1",
          order_number: "CP-001",
          property_address: "100 Main St",
          status_label: "In progress",
          client_due_at: "2026-06-15",
          vendor_bid_amount: 900,
          internal_note: "Never expose",
        },
      ],
      error: null,
    });

    const orders = await listClientPortalOrders();

    expect(orders).toEqual([
      expect.objectContaining({
        orderKey: "portal-order-1",
        orderNumber: "CP-001",
        propertyAddress: "100 Main St",
        status: "In progress",
        dueAt: "2026-06-15",
      }),
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith(clientPortalRpcNames.listOrders);
    expect(JSON.stringify(orders)).not.toMatch(/vendor_bid_amount|internal_note/i);
  });

  it("loads order detail by opaque client portal order key", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        order_key: "portal-order-1",
        order_number: "CP-001",
        property_address: "100 Main St",
        report_available: true,
      },
      error: null,
    });

    await getClientPortalOrderDetail("portal-order-1");

    expect(supabase.rpc).toHaveBeenCalledWith(clientPortalRpcNames.orderDetail, {
      p_order_key: "portal-order-1",
    });
  });

  it("requests report download through the dedicated client portal Edge Function", async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        signed_url: "https://signed.example/report.pdf",
        expires_in: 300,
        report: {
          file_name: "final-report.pdf",
        },
      },
      error: null,
    });

    await expect(createClientPortalReportDownloadUrl("portal-order-1")).resolves.toEqual({
      signedUrl: "https://signed.example/report.pdf",
      expiresIn: 300,
      fileName: "final-report.pdf",
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      clientPortalRpcNames.reportDownloadFunction,
      {
        body: {
          order_key: "portal-order-1",
        },
      },
    );
  });

  it("submits client portal order requests through the dedicated intake RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        request_key: "request-key-1",
        status: "submitted",
        submitted_at: "2026-06-07T13:00:00Z",
        property_address: "200 Oak St",
        property_city: "Toledo",
        property_state: "OH",
        property_postal_code: "43604",
        property_county: "Lucas",
        property_type: "Condo",
        report_type: "Full appraisal",
        requested_due_date: "2026-06-20",
        appraiser_id: "hidden",
        vendor_company_id: "hidden",
      },
      error: null,
    });

    await expect(
      submitClientPortalOrderRequest({
        propertyAddress: "200 Oak St",
        propertyCity: "Toledo",
        propertyState: "OH",
        propertyPostalCode: "43604",
        propertyCounty: "Lucas",
        propertyType: "Condo",
        reportType: "Full appraisal",
        loanPurpose: "Purchase",
        parcelNumbers: "12-34567, 12-34568",
        interestAppraised: "Fee Simple",
        premiseCondition: "As Is",
        approachesToValue: "All Applicable",
        requestedDueDate: "2026-06-20",
        borrowerContactName: "Borrower Name",
        clientContactName: "Avery Client",
        clientContactPhone: "555-0100",
        clientContactEmail: "avery@example.test",
        notes: "Gate code available.",
      }),
    ).resolves.toEqual({
      requestKey: "request-key-1",
      status: "submitted",
      submittedAt: "2026-06-07T13:00:00Z",
      propertyAddress: "200 Oak St",
      propertyCity: "Toledo",
      propertyState: "OH",
      propertyPostalCode: "43604",
      propertyCounty: "Lucas",
      propertyType: "Condo",
      reportType: "Full appraisal",
      requestedDueDate: "2026-06-20",
    });

    expect(supabase.rpc).toHaveBeenCalledWith(clientPortalRpcNames.orderRequestCreate, {
      p_property_address: "200 Oak St",
      p_property_city: "Toledo",
      p_property_state: "OH",
      p_property_postal_code: "43604",
      p_property_county: "Lucas",
      p_property_type: "Condo",
      p_report_type: "Full appraisal",
      p_loan_purpose: "Purchase",
      p_requested_due_date: "2026-06-20",
      p_borrower_contact_name: "Borrower Name",
      p_client_contact_name: "Avery Client",
      p_client_contact_phone: "555-0100",
      p_client_contact_email: "avery@example.test",
      p_notes: [
        "Gate code available.",
        "",
        "Additional appraisal request details:",
        "Parcel number(s): 12-34567, 12-34568",
        "Interest appraised: Fee Simple",
        "Premise / Condition: As Is",
        "Approaches to Value: All Applicable",
      ].join("\n"),
    });
  });

  it("lists pending client portal order requests through the dedicated safe RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          request_key: "request-key-1",
          status: "submitted",
          status_label: "Submitted",
          status_copy: "Your appraisal team is reviewing this request.",
          property_address: "300 Madison Ave, Toledo OH",
          property_city: "Toledo",
          property_state: "OH",
          property_postal_code: "43604",
          property_county: "Lucas",
          property_type: "Office",
          report_type: "Full",
          requested_due_date: "2026-06-20",
          submitted_at: "2026-06-08T14:00:00Z",
          accepted_order_id: "hidden",
          reviewed_by_user_id: "hidden",
        },
      ],
      error: null,
    });

    await expect(listClientPortalPendingOrderRequests()).resolves.toEqual([
      {
        requestKey: "request-key-1",
        status: "submitted",
        statusLabel: "Submitted",
        statusCopy: "Your appraisal team is reviewing this request.",
        propertyAddress: "300 Madison Ave, Toledo OH",
        propertyCity: "Toledo",
        propertyState: "OH",
        propertyPostalCode: "43604",
        propertyCounty: "Lucas",
        propertyType: "Office",
        reportType: "Full",
        requestedDueDate: "2026-06-20",
        submittedAt: "2026-06-08T14:00:00Z",
      },
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith(clientPortalRpcNames.pendingOrderRequests);
  });

  it("validates required order request fields before calling the RPC", async () => {
    await expect(
      submitClientPortalOrderRequest({
        propertyAddress: "",
        propertyCity: "Toledo",
        propertyState: "OH",
        propertyPostalCode: "43604",
        propertyType: "Condo",
        reportType: "Full appraisal",
      }),
    ).rejects.toThrow("Property address is required.");

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("reads client portal invitations through the public safe invite RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        client_name: "First American Bank",
        company_name: "Falcon AMC",
        contact_name: "Dana Miller",
        email: "dmiller@firstbank.com",
        status: "pending",
        expires_at: "2026-06-15T13:00:00Z",
      },
      error: null,
    });

    await expect(readClientPortalInvitation("token-1")).resolves.toEqual({
      clientName: "First American Bank",
      companyName: "Falcon AMC",
      contactName: "Dana Miller",
      email: "dmiller@firstbank.com",
      status: "pending",
      expiresAt: "2026-06-15T13:00:00Z",
      acceptedAt: null,
    });

    expect(supabase.rpc).toHaveBeenCalledWith(clientPortalRpcNames.invitationRead, {
      p_token: "token-1",
    });
  });

  it("accepts client portal invitations through the client portal membership RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        client_name: "First American Bank",
        email: "dmiller@firstbank.com",
        status: "accepted",
        accepted_at: "2026-06-08T13:00:00Z",
      },
      error: null,
    });

    await expect(acceptClientPortalInvitation("token-1")).resolves.toEqual({
      clientName: "First American Bank",
      companyName: null,
      contactName: null,
      email: "dmiller@firstbank.com",
      status: "accepted",
      expiresAt: null,
      acceptedAt: "2026-06-08T13:00:00Z",
    });

    expect(supabase.rpc).toHaveBeenCalledWith(clientPortalRpcNames.invitationAccept, {
      p_token: "token-1",
    });
  });

  it("normalizes detail without internal assignment, vendor, procurement, or fee fields", () => {
    const normalized = normalizeClientPortalOrderDetail({
      order_key: "portal-order-1",
      order_number: "CP-001",
      property_address: "100 Main St",
      report_available: true,
      appraiser_private_note: "hidden",
      vendor_name: "hidden vendor",
      bid_request_id: "hidden procurement",
      client_fee: 1200,
      internal_review_note: "hidden review",
    });

    const serialized = JSON.stringify(normalized);

    expect(serialized).toContain("CP-001");
    expect(serialized).not.toMatch(/appraiser_private_note|vendor_name|bid_request_id|client_fee|internal_review_note/i);
  });
});
