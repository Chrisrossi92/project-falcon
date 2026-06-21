import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    rpc: vi.fn(),
  },
}));

const supabase = (await import("@/lib/supabaseClient")).default;
const vendorApi = await import("../api.js");

describe("vendor directory API", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  it("lists Vendor Directory rows through the read RPC with default filters", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          vendor_profile_id: "profile-1",
          vendor_company_id: "company-2",
          vendor_company_name: "ABC Valuation",
          vendor_status: "active",
          relationship_id: null,
          relationship_status: null,
          service_area_summary: null,
          product_eligibility: null,
          tags: null,
        },
      ],
      error: null,
    });

    await expect(vendorApi.listVendorDirectory()).resolves.toEqual([
      expect.objectContaining({
        id: "profile-1",
        vendor_profile_id: "profile-1",
        vendor_company_name: "ABC Valuation",
        service_area_summary: expect.objectContaining({ active_count: 0 }),
        product_eligibility: {},
        tags: [],
      }),
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_directory_list", {
      p_status: null,
      p_query: null,
    });
  });

  it("normalizes malformed service-area summaries without leaking null arrays", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          vendor_profile_id: "profile-1",
          vendor_company_name: "ABC Valuation",
          service_area_summary: {
            active_count: "2",
            states: null,
            counties: "Westchester",
            zips: ["10601"],
            markets: undefined,
            product_types: ["commercial"],
          },
        },
      ],
      error: null,
    });

    await expect(vendorApi.listVendorDirectory()).resolves.toEqual([
      expect.objectContaining({
        service_area_summary: {
          active_count: 2,
          states: [],
          counties: [],
          zips: ["10601"],
          markets: [],
          product_types: ["commercial"],
        },
      }),
    ]);
  });

  it("passes Vendor Directory status and query filters to the read RPC", async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    await vendorApi.listVendorDirectory({ status: "preferred", query: "Bergen" });

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_directory_list", {
      p_status: "preferred",
      p_query: "Bergen",
    });
  });

  it("gets Vendor Profile detail through the read RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          vendor_profile_id: "profile-1",
          vendor_company_id: "company-2",
          vendor_company_name: "ABC Valuation",
          primary_address: null,
          capabilities: null,
          product_eligibility: null,
          tags: null,
        },
      ],
      error: null,
    });

    await expect(vendorApi.getVendorProfileDetail("profile-1")).resolves.toEqual(
      expect.objectContaining({
        id: "profile-1",
        vendor_profile_id: "profile-1",
        primary_address: {},
        capabilities: {},
        product_eligibility: {},
        tags: [],
      }),
    );

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_profile_detail", {
      p_vendor_profile_id: "profile-1",
    });
  });

  it("gets Vendor Profile contacts through the read RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          vendor_contact_id: "contact-1",
          vendor_profile_id: "profile-1",
          name: "Mary Jones",
          is_primary: true,
          receives_assignment_notifications: false,
        },
      ],
      error: null,
    });

    await expect(vendorApi.getVendorProfileContacts("profile-1")).resolves.toEqual([
      expect.objectContaining({
        id: "contact-1",
        vendor_contact_id: "contact-1",
        is_primary: true,
        receives_assignment_notifications: false,
      }),
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_profile_contacts", {
      p_vendor_profile_id: "profile-1",
    });
  });

  it("gets Vendor Profile service areas through the read RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          vendor_service_area_id: "service-area-1",
          vendor_profile_id: "profile-1",
          state: "NY",
          status: "active",
        },
      ],
      error: null,
    });

    await expect(vendorApi.getVendorProfileServiceAreas("profile-1")).resolves.toEqual([
      expect.objectContaining({
        id: "service-area-1",
        vendor_service_area_id: "service-area-1",
        state: "NY",
      }),
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_profile_service_areas", {
      p_vendor_profile_id: "profile-1",
    });
  });

  it("gets normalized Vendor Coverage through the coverage read RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        states: ["OH"],
        counties: [{ state_code: "OH", county_name: "Franklin" }],
        property_types: ["commercial", "office"],
        assignment_types: ["appraisal", "review"],
      },
      error: null,
    });

    await expect(vendorApi.getVendorCoverage("profile-1")).resolves.toEqual({
      states: ["OH"],
      counties: [{ state_code: "OH", county_name: "Franklin" }],
      propertyTypes: ["commercial", "office"],
      assignmentTypes: ["appraisal", "review"],
    });

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_get_vendor_coverage", {
      p_vendor_profile_id: "profile-1",
    });
  });

  it("normalizes null or malformed Vendor Coverage read payloads safely", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        states: null,
        counties: [{ stateCode: "OH", countyName: "Delaware" }, null, "invalid"],
        property_types: null,
        assignmentTypes: ["desktop"],
      },
      error: null,
    });

    await expect(vendorApi.getVendorCoverage("profile-1")).resolves.toEqual({
      states: [],
      counties: [{ state_code: "OH", county_name: "Delaware" }],
      propertyTypes: [],
      assignmentTypes: ["desktop"],
    });
  });

  it("saves Vendor Coverage through the coverage save RPC and returns normalized coverage", async () => {
    const coverage = {
      states: ["oh"],
      counties: [{ stateCode: "oh", countyName: "Franklin" }],
      propertyTypes: ["commercial", "retail"],
      assignmentTypes: ["appraisal", "evaluation"],
    };
    supabase.rpc.mockResolvedValue({
      data: {
        states: ["OH"],
        counties: [{ state_code: "OH", county_name: "Franklin" }],
        property_types: ["commercial", "retail"],
        assignment_types: ["appraisal", "evaluation"],
      },
      error: null,
    });

    await expect(vendorApi.saveVendorCoverage("profile-1", coverage)).resolves.toEqual({
      states: ["OH"],
      counties: [{ state_code: "OH", county_name: "Franklin" }],
      propertyTypes: ["commercial", "retail"],
      assignmentTypes: ["appraisal", "evaluation"],
    });

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_save_vendor_coverage", {
      p_vendor_profile_id: "profile-1",
      p_states: ["oh"],
      p_counties: [{ state_code: "oh", county_name: "Franklin" }],
      p_property_types: ["commercial", "retail"],
      p_assignment_types: ["appraisal", "evaluation"],
    });
  });

  it("uses empty arrays when saving empty Vendor Coverage", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    await expect(vendorApi.saveVendorCoverage("profile-1")).resolves.toEqual({
      states: [],
      counties: [],
      propertyTypes: [],
      assignmentTypes: [],
    });

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_save_vendor_coverage", {
      p_vendor_profile_id: "profile-1",
      p_states: [],
      p_counties: [],
      p_property_types: [],
      p_assignment_types: [],
    });
  });

  it("surfaces Vendor Coverage RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("vendor coverage denied"), { code: "42501" });
    supabase.rpc.mockResolvedValue({ data: null, error });

    await expect(vendorApi.getVendorCoverage("profile-1")).rejects.toBe(error);
  });

  it("surfaces RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("vendor directory denied"), { code: "42501" });
    supabase.rpc.mockResolvedValue({ data: null, error });

    await expect(vendorApi.listVendorDirectory()).rejects.toBe(error);
  });

  it("lists Vendor Assignment candidates through the read-only candidate RPC", async () => {
    const rows = [
      {
        vendor_profile_id: "profile-1",
        vendor_company_id: "company-2",
        vendor_company_name: "ABC Valuation",
        vendor_status: "preferred",
        relationship_id: "relationship-3",
        relationship_status: "active",
        match_score: 100,
        match_reasons: { geography: { best_match: "zip" } },
        coverage_matches: [{ state: "OH", zip: "43215", product_type: "commercial" }],
        primary_contact: { name: "Mary Jones" },
        warning_flags: [],
      },
    ];
    supabase.rpc.mockResolvedValue({ data: rows, error: null });

    await expect(vendorApi.listVendorAssignmentCandidates("order-1")).resolves.toEqual(rows);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_assignment_candidates", {
      p_order_id: "order-1",
    });
  });

  it("returns an empty candidate list when the candidate RPC returns a non-array payload", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    await expect(vendorApi.listVendorAssignmentCandidates("order-1")).resolves.toEqual([]);
  });

  it("surfaces candidate RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("candidate lookup denied"), { code: "42501" });
    supabase.rpc.mockResolvedValue({ data: null, error });

    await expect(vendorApi.listVendorAssignmentCandidates("order-1")).rejects.toBe(error);
  });

  it("gets deterministic matching vendors through the normalized coverage matching RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          vendor_profile_id: "profile-1",
          company_id: "company-2",
          company_name: "ABC Valuation",
          matched_state: "OH",
          matched_county: "Franklin",
          matched_property_type: "commercial",
          matched_assignment_type: "appraisal",
        },
      ],
      error: null,
    });

    await expect(vendorApi.getMatchingVendorsForOrder("order-1")).resolves.toEqual([
      expect.objectContaining({
        vendor_profile_id: "profile-1",
        company_id: "company-2",
        company_name: "ABC Valuation",
        vendorProfileId: "profile-1",
        vendorCompanyId: "company-2",
        vendorCompanyName: "ABC Valuation",
        matchedState: "OH",
        matchedCounty: "Franklin",
        matchedPropertyType: "commercial",
        matchedAssignmentType: "appraisal",
      }),
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_get_matching_vendors_for_order", {
      p_order_id: "order-1",
    });
  });

  it("returns an empty deterministic match list when the matching RPC returns a non-array payload", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    await expect(vendorApi.getMatchingVendorsForOrder("order-1")).resolves.toEqual([]);
  });

  it("surfaces deterministic matching RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("matching denied"), { code: "42501" });
    supabase.rpc.mockResolvedValue({ data: null, error });

    await expect(vendorApi.getMatchingVendorsForOrder("order-1")).rejects.toBe(error);
  });

  it("creates Vendor Profile records through the mutation RPC and returns the first row", async () => {
    const payload = {
      vendor_company: { name: "ABC Valuation" },
      create_relationship: true,
    };
    const row = {
      vendor_profile_id: "profile-1",
      vendor_company_id: "company-2",
      relationship_id: "relationship-3",
    };
    supabase.rpc.mockResolvedValue({ data: [row], error: null });

    await expect(vendorApi.createVendorProfile(payload)).resolves.toEqual(row);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_profile_create", {
      p_payload: payload,
    });
  });

  it("updates Vendor Profile metadata through the mutation RPC", async () => {
    const patch = { vendor_status: "preferred", tags: ["commercial"] };
    supabase.rpc.mockResolvedValue({ data: "profile-1", error: null });

    await expect(vendorApi.updateVendorProfile("profile-1", patch)).resolves.toBe("profile-1");

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_profile_update", {
      p_vendor_profile_id: "profile-1",
      p_patch: patch,
    });
  });

  it("creates Vendor Contacts through the mutation RPC", async () => {
    const payload = { name: "Mary Jones", email: "mary@example.com", is_primary: true };
    supabase.rpc.mockResolvedValue({ data: "contact-1", error: null });

    await expect(vendorApi.createVendorContact("profile-1", payload)).resolves.toBe("contact-1");

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_contact_create", {
      p_vendor_profile_id: "profile-1",
      p_payload: payload,
    });
  });

  it("updates Vendor Contacts through the mutation RPC", async () => {
    const patch = { phone: "614-555-0100", is_primary: false };
    supabase.rpc.mockResolvedValue({ data: "contact-1", error: null });

    await expect(vendorApi.updateVendorContact("contact-1", patch)).resolves.toBe("contact-1");

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_contact_update", {
      p_contact_id: "contact-1",
      p_patch: patch,
    });
  });

  it("creates Vendor Service Areas through the mutation RPC", async () => {
    const payload = { state: "OH", county: "Franklin", product_type: "commercial" };
    supabase.rpc.mockResolvedValue({ data: "service-area-1", error: null });

    await expect(vendorApi.createVendorServiceArea("profile-1", payload)).resolves.toBe("service-area-1");

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_service_area_create", {
      p_vendor_profile_id: "profile-1",
      p_payload: payload,
    });
  });

  it("updates Vendor Service Areas through the mutation RPC", async () => {
    const patch = { status: "inactive" };
    supabase.rpc.mockResolvedValue({ data: "service-area-1", error: null });

    await expect(vendorApi.updateVendorServiceArea("service-area-1", patch)).resolves.toBe("service-area-1");

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_vendor_service_area_update", {
      p_service_area_id: "service-area-1",
      p_patch: patch,
    });
  });

  it("lists internal Vendor Profile update requests through the AMC review RPC", async () => {
    const requests = [
      {
        request_key: "request-key-1",
        vendor_company_name: "ABC Valuation",
        status: "pending",
        proposed_changes: { company_changes: { public_phone: "614-555-0100" } },
      },
    ];
    supabase.rpc.mockResolvedValue({ data: { ok: true, requests }, error: null });

    await expect(vendorApi.listVendorProfileUpdateRequests()).resolves.toEqual(requests);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_amc_vendor_profile_update_requests", {
      p_status: "pending",
    });
  });

  it("passes status filters to the internal Vendor Profile update request review RPC", async () => {
    supabase.rpc.mockResolvedValue({ data: { ok: true, requests: [] }, error: null });

    await vendorApi.listVendorProfileUpdateRequests({ status: "approved" });

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_amc_vendor_profile_update_requests", {
      p_status: "approved",
    });
  });

  it("reviews Vendor Profile update requests through the AMC decision RPC", async () => {
    const result = {
      ok: true,
      request: {
        request_key: "request-key-1",
        status: "approved",
      },
    };
    const payload = { decision: "approve", reviewer_note: "Approved." };
    supabase.rpc.mockResolvedValue({ data: result, error: null });

    await expect(vendorApi.reviewVendorProfileUpdateRequest("request-key-1", payload)).resolves.toEqual(result);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_amc_review_vendor_profile_update_request", {
      p_request_key: "request-key-1",
      p_payload: payload,
    });
  });

  it("lists internal Vendor Invoice review rows through the AMC invoice RPC", async () => {
    const invoices = [
      {
        invoice_key: "invoice-key-1",
        invoice_status: "invoice_received",
        invoice_number: "INV-1001",
      },
    ];
    supabase.rpc.mockResolvedValue({ data: { ok: true, items: invoices }, error: null });

    await expect(vendorApi.listAmcVendorInvoices()).resolves.toEqual(invoices);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_amc_vendor_invoices", {
      p_status: "invoice_received",
    });
  });

  it("passes status filters to the internal Vendor Invoice review RPC", async () => {
    supabase.rpc.mockResolvedValue({ data: { ok: true, items: [] }, error: null });

    await vendorApi.listAmcVendorInvoices({ status: "on_hold" });

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_amc_vendor_invoices", {
      p_status: "on_hold",
    });
  });

  it("reviews Vendor Invoices through the AMC invoice decision RPC", async () => {
    const result = {
      ok: true,
      invoice: {
        invoice_key: "invoice-key-1",
        invoice_status: "approved",
      },
    };
    const payload = {
      decision: "approve",
      reviewer_note: "Approved internally.",
      vendor_message: null,
      approved_amount: 1250,
    };
    supabase.rpc.mockResolvedValue({ data: result, error: null });

    await expect(vendorApi.reviewAmcVendorInvoice("invoice-key-1", payload)).resolves.toEqual(result);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_amc_review_vendor_invoice", {
      p_invoice_key: "invoice-key-1",
      p_payload: payload,
    });
  });

  it("lists internal Vendor Payment ledger rows through the AMC payment ledger RPC", async () => {
    const payments = [
      {
        invoice_key: "invoice-key-1",
        payment_status: "approved",
      },
    ];
    supabase.rpc.mockResolvedValue({ data: { ok: true, items: payments }, error: null });

    await expect(vendorApi.listAmcVendorPaymentLedger()).resolves.toEqual(payments);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_amc_vendor_payment_ledger", {
      p_status: "approved",
    });
  });

  it("schedules Vendor Payments through the AMC scheduling RPC", async () => {
    const payload = {
      scheduled_payment_date: "2026-06-15",
      payment_method_label: "ACH",
      reference_label: "ACH batch 12",
      internal_note: "Private note.",
      vendor_payment_note: "Payment scheduled.",
    };
    const result = { ok: true, payment_status: "scheduled" };
    supabase.rpc.mockResolvedValue({ data: result, error: null });

    await expect(vendorApi.scheduleAmcVendorPayment("invoice-key-1", payload)).resolves.toEqual(result);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_amc_schedule_vendor_payment", {
      p_invoice_key: "invoice-key-1",
      p_payload: payload,
    });
  });

  it("marks Vendor Payments paid through the AMC payment ledger RPC", async () => {
    const payload = {
      paid_date: "2026-06-16",
      payment_method_label: "ACH",
      reference_label: "ACH trace 1234",
      internal_note: "Private paid note.",
      vendor_payment_note: "Paid.",
    };
    const result = { ok: true, payment_status: "paid" };
    supabase.rpc.mockResolvedValue({ data: result, error: null });

    await expect(vendorApi.markAmcVendorPaymentPaid("payment-key-1", payload)).resolves.toEqual(result);

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_amc_mark_vendor_payment_paid", {
      p_payment_key: "payment-key-1",
      p_payload: payload,
    });
  });

  it("surfaces mutation RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("vendor create denied"), { code: "42501" });
    supabase.rpc.mockResolvedValue({ data: null, error });

    await expect(vendorApi.createVendorProfile({ vendor_company: { name: "ABC" } })).rejects.toBe(error);
  });

  it("exports only read, candidate lookup, and approved mutation wrappers with no assignment offer, delete, or archive functions", () => {
    expect(Object.keys(vendorApi).sort()).toEqual([
      "createVendorContact",
      "createVendorProfile",
      "createVendorServiceArea",
      "getMatchingVendorsForOrder",
      "getVendorCoverage",
      "getVendorProfileContacts",
      "getVendorProfileDetail",
      "getVendorProfileServiceAreas",
      "listAmcVendorInvoices",
      "listAmcVendorPaymentLedger",
      "listVendorAssignmentCandidates",
      "listVendorDirectory",
      "listVendorProfileUpdateRequests",
      "markAmcVendorPaymentPaid",
      "reviewAmcVendorInvoice",
      "reviewVendorProfileUpdateRequest",
      "saveVendorCoverage",
      "scheduleAmcVendorPayment",
      "updateVendorContact",
      "updateVendorProfile",
      "updateVendorServiceArea",
    ].sort());
    expect(vendorApi.getVendorAssignmentCandidates).toBeUndefined();
    expect(vendorApi.createVendorAssignmentOffer).toBeUndefined();
    expect(vendorApi.createVendorBidRequest).toBeUndefined();
    expect(vendorApi.notifyVendorCandidate).toBeUndefined();
    expect(vendorApi.deleteVendorContact).toBeUndefined();
    expect(vendorApi.deleteVendorServiceArea).toBeUndefined();
    expect(vendorApi.archiveVendorProfile).toBeUndefined();
  });
});
