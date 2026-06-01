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

  it("exports only read wrappers and no mutation or assignment candidate functions", () => {
    expect(Object.keys(vendorApi).sort()).toEqual([
      "getVendorProfileContacts",
      "getVendorProfileDetail",
      "getVendorProfileServiceAreas",
      "listVendorDirectory",
    ]);
    expect(vendorApi.createVendorProfile).toBeUndefined();
    expect(vendorApi.updateVendorProfile).toBeUndefined();
    expect(vendorApi.getVendorAssignmentCandidates).toBeUndefined();
  });
});
