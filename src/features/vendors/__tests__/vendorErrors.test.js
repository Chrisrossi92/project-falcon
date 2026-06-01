import { describe, expect, it } from "vitest";

import { getVendorErrorMessage } from "../vendorErrors";

describe("vendor error messages", () => {
  it("maps stable backend vendor error codes to owner-friendly messages", () => {
    expect(getVendorErrorMessage(new Error("vendor_profile_duplicate"))).toBe("This vendor is already in your Vendor Directory.");
    expect(getVendorErrorMessage(new Error("vendor_company_required"))).toBe("Choose an existing vendor company or enter a new vendor company name.");
    expect(getVendorErrorMessage(new Error("vendor_company_name_required"))).toBe("Vendor company name is required.");
    expect(getVendorErrorMessage(new Error("vendor_payload_invalid"))).toBe("Some vendor details are invalid. Review the form and try again.");
    expect(getVendorErrorMessage(new Error("vendor_create_permission_required"))).toBe("You do not have permission to add vendors.");
    expect(getVendorErrorMessage(new Error("vendor_update_permission_required"))).toBe("You do not have permission to update this vendor.");
    expect(getVendorErrorMessage(new Error("vendor_contacts_manage_permission_required"))).toBe("You do not have permission to manage vendor contacts.");
    expect(getVendorErrorMessage(new Error("vendor_service_areas_manage_permission_required"))).toBe("You do not have permission to manage vendor coverage.");
    expect(getVendorErrorMessage(new Error("vendor_contact_not_found_or_not_authorized"))).toBe("That contact could not be found or you do not have access to it.");
    expect(getVendorErrorMessage(new Error("vendor_service_area_not_found_or_not_authorized"))).toBe("That coverage could not be found or you do not have access to it.");
    expect(getVendorErrorMessage(new Error("vendor_profile_not_found_or_not_authorized"))).toBe("That vendor could not be found or you do not have access to it.");
  });

  it("uses self-vendor copy for Add Vendor relationship-invalid errors", () => {
    expect(getVendorErrorMessage(new Error("vendor_relationship_invalid"), {
      selfVendorMessage: true,
    })).toBe("You cannot add your current company as its own vendor.");
  });

  it("keeps non-create relationship-invalid errors generic to the workspace", () => {
    expect(getVendorErrorMessage(new Error("vendor_relationship_invalid"))).toBe("This company cannot be added as a vendor for the current workspace.");
  });

  it("falls back to a generic vendor action failure", () => {
    expect(getVendorErrorMessage(new Error("unexpected"))).toBe("Vendor action failed. Please review the details and try again.");
  });
});
