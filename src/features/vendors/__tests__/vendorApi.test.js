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
      "listVendorAssignmentCandidates",
      "getVendorProfileContacts",
      "getVendorProfileDetail",
      "getVendorProfileServiceAreas",
      "listVendorDirectory",
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
