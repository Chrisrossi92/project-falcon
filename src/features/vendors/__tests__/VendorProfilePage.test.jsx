// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const vendorApiState = vi.hoisted(() => ({
  createVendorContact: vi.fn(),
  createVendorServiceArea: vi.fn(),
  getVendorCoverage: vi.fn(),
  getVendorProfileDetail: vi.fn(),
  getVendorProfileContacts: vi.fn(),
  getVendorProfileServiceAreas: vi.fn(),
  saveVendorCoverage: vi.fn(),
  updateVendorContact: vi.fn(),
  updateVendorProfile: vi.fn(),
  updateVendorServiceArea: vi.fn(),
}));

const permissionState = vi.hoisted(() => ({
  allowed: new Set(),
}));

vi.mock("../api", () => ({
  createVendorContact: vendorApiState.createVendorContact,
  createVendorServiceArea: vendorApiState.createVendorServiceArea,
  getVendorCoverage: vendorApiState.getVendorCoverage,
  getVendorProfileDetail: vendorApiState.getVendorProfileDetail,
  getVendorProfileContacts: vendorApiState.getVendorProfileContacts,
  getVendorProfileServiceAreas: vendorApiState.getVendorProfileServiceAreas,
  saveVendorCoverage: vendorApiState.saveVendorCoverage,
  updateVendorContact: vendorApiState.updateVendorContact,
  updateVendorProfile: vendorApiState.updateVendorProfile,
  updateVendorServiceArea: vendorApiState.updateVendorServiceArea,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useCan: (permissionKey) => ({
    allowed: permissionState.allowed.has(permissionKey),
    loading: false,
    error: null,
    permissionKeys: [...permissionState.allowed],
  }),
}));

const { default: VendorProfilePage } = await import("../VendorProfilePage.jsx");

const profile = {
  vendor_profile_id: "profile-1",
  vendor_company_name: "ABC Valuation",
  vendor_status: "preferred",
  relationship_status: "active",
  relationship_type: "amc_vendor",
  website: "https://abc.example",
  public_phone: "555-0100",
  primary_address: {
    line1: "100 Main St",
    city: "White Plains",
    state: "NY",
    zip: "10601",
  },
  default_assignment_instructions: "Upload report before delivery.",
  capabilities: {
    commercial: true,
    rush: "available",
  },
  product_eligibility: {
    multifamily: true,
    restricted: {
      reason: "review",
    },
  },
  internal_notes: "Reliable preferred panel vendor.",
  tags: ["preferred", "ny-metro"],
  updated_at: "2026-06-01T12:00:00.000Z",
};

const contacts = [
  {
    vendor_contact_id: "contact-1",
    name: "Mary Jones",
    email: "mary@example.test",
    phone: "555-0101",
    role_label: "Coordinator",
    is_primary: true,
    linked_user_display_name: "Mary J.",
  },
];

const serviceAreas = [
  {
    vendor_service_area_id: "area-1",
    status: "active",
    state: "NY",
    county: "Westchester",
    zip: "10601",
    market: "NY Metro",
    product_type: "commercial_appraisal",
    radius_miles: 25,
  },
];

const normalizedCoverage = {
  states: ["NY"],
  counties: [{ state_code: "NY", county_name: "Westchester" }],
  propertyTypes: ["commercial", "office"],
  assignmentTypes: ["appraisal", "review"],
};

const generatedCoverageRows = [
  ...["commercial", "multifamily", "land", "review", "industrial"].map((productType, index) => ({
    vendor_service_area_id: `mi-state-${index}`,
    status: "active",
    state: "MI",
    county: null,
    zip: null,
    market: null,
    product_type: productType,
    radius_miles: null,
  })),
  ...["Adams", "Allen", "Hamilton"].flatMap((county) =>
    ["commercial", "multifamily"].map((productType) => ({
      vendor_service_area_id: `in-${county}-${productType}`,
      status: "active",
      state: "IN",
      county,
      zip: null,
      market: null,
      product_type: productType,
      radius_miles: null,
    })),
  ),
  ...["43215", "43212", "43210"].flatMap((zip) =>
    ["residential", "restricted_appraisal"].map((productType) => ({
      vendor_service_area_id: `oh-${zip}-${productType}`,
      status: "active",
      state: "OH",
      county: null,
      zip,
      market: null,
      product_type: productType,
      radius_miles: null,
    })),
  ),
  ...["commercial", "review"].map((productType) => ({
    vendor_service_area_id: `oh-market-${productType}`,
    status: "active",
    state: "OH",
    county: null,
    zip: null,
    market: "Columbus",
    product_type: productType,
    radius_miles: 25,
  })),
];

function renderPage(initialPath = "/vendors/profile-1") {
  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route path="/vendors/:vendorProfileId" element={<VendorProfilePage />} />
        <Route path="/amc/vendors/:vendorProfileId" element={<VendorProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("VendorProfilePage", () => {
  beforeEach(() => {
    vendorApiState.createVendorContact.mockReset();
    vendorApiState.createVendorServiceArea.mockReset();
    vendorApiState.getVendorCoverage.mockReset();
    vendorApiState.getVendorCoverage.mockResolvedValue(normalizedCoverage);
    vendorApiState.getVendorProfileDetail.mockReset();
    vendorApiState.getVendorProfileContacts.mockReset();
    vendorApiState.getVendorProfileServiceAreas.mockReset();
    vendorApiState.saveVendorCoverage.mockReset();
    vendorApiState.saveVendorCoverage.mockResolvedValue(normalizedCoverage);
    vendorApiState.updateVendorContact.mockReset();
    vendorApiState.updateVendorProfile.mockReset();
    vendorApiState.updateVendorServiceArea.mockReset();
    permissionState.allowed = new Set();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads read-only profile, contact, and service-area data", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(screen.getByText("Loading vendor profile...")).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(vendorApiState.getVendorProfileDetail).toHaveBeenCalledWith("profile-1");
    expect(vendorApiState.getVendorProfileContacts).toHaveBeenCalledWith("profile-1");
    expect(vendorApiState.getVendorProfileServiceAreas).toHaveBeenCalledWith("profile-1");
    expect(vendorApiState.getVendorProfileDetail).toHaveBeenCalledTimes(1);
    expect(vendorApiState.getVendorProfileContacts).toHaveBeenCalledTimes(1);
    expect(vendorApiState.getVendorProfileServiceAreas).toHaveBeenCalledTimes(1);
    const summary = screen.getByLabelText("Vendor summary");
    expect(within(summary).getByText("Status")).toBeInTheDocument();
    expect(within(summary).getByText("Preferred")).toBeInTheDocument();
    expect(within(summary).getByText("Contacts")).toBeInTheDocument();
    expect(within(summary).getByText("1")).toBeInTheDocument();
    expect(within(summary).getByText("Vendor manager listed")).toBeInTheDocument();
    expect(within(summary).getByText("Coverage")).toBeInTheDocument();
    expect(within(summary).getByText("1 Region")).toBeInTheDocument();
    expect(within(summary).getByText("Products")).toBeInTheDocument();
    expect(within(summary).getByText("1 Product")).toBeInTheDocument();
    expect(within(summary).getByText("Network")).toBeInTheDocument();
    expect(within(summary).getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Network: Active")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vendor Manager & Contacts" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Coverage" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vendor Directory" })).toHaveAttribute("href", "/vendors");
    expect(screen.getByRole("heading", { name: "Tags and Notes" })).toBeInTheDocument();
    expect(screen.getByText("Operational Notes")).toBeInTheDocument();
    expect(screen.queryByText("Assignment Readiness")).toBeNull();
    expect(screen.queryByText("Amc Vendor")).toBeNull();
    expect(screen.queryByText(/amc_vendor/i)).toBeNull();
    expect(screen.getByText("https://abc.example")).toBeInTheDocument();
    expect(screen.getByText(/100 Main St/)).toBeInTheDocument();
    expect(screen.getByText("Upload report before delivery.")).toBeInTheDocument();
    expect(screen.getByText(/Commercial: Yes/)).toBeInTheDocument();
    expect(screen.getByText(/Commercial Appraisal: Yes/)).toBeInTheDocument();
    expect(screen.getByText(/Restricted: \{"reason":"review"\}/)).toBeInTheDocument();
    expect(screen.getByText("Mary Jones")).toBeInTheDocument();
    expect(screen.getByText("NY · 1 county · Commercial Appraisal")).toBeInTheDocument();
    expect(screen.getAllByText(/Westchester/)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "View rows" }));
    expect(screen.getAllByText(/Westchester/).length).toBeGreaterThan(1);
    expect(screen.getByText("Reliable preferred panel vendor.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create|save|assign|invite|add|delete|archive|edit/i })).toBeNull();
  });

  it("keeps the Vendor Directory back link under the AMC alias when entered through the AMC alias", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage("/amc/vendors/profile-1");

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vendor Directory" })).toHaveAttribute(
      "href",
      "/amc/vendors",
    );
  });

  it("keeps the Vendor Directory back link on compatibility paths when entered through compatibility route", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage("/vendors/profile-1");

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vendor Directory" })).toHaveAttribute("href", "/vendors");
  });

  it("shows Edit Profile only with vendors.update permission", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Profile" })).toBeNull();

    cleanup();
    permissionState.allowed = new Set(["vendors.update"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("button", { name: "Edit Profile" })).toBeInTheDocument();
  });

  it("opens Edit Profile with prefilled profile metadata", async () => {
    permissionState.allowed = new Set(["vendors.update"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit Profile" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Profile" });

    expect(within(dialog).getByLabelText("Status")).toHaveValue("preferred");
    expect(within(dialog).getByLabelText("Website")).toHaveValue("https://abc.example");
    expect(within(dialog).getByLabelText("Public phone")).toHaveValue("555-0100");
    expect(within(dialog).getByLabelText("Address line 1")).toHaveValue("100 Main St");
    expect(within(dialog).getByLabelText("City")).toHaveValue("White Plains");
    expect(within(dialog).getByLabelText("Tags")).toHaveValue("preferred, ny-metro");
    const capabilities = within(dialog).getByRole("group", { name: "Capabilities" });
    const productEligibility = within(dialog).getByRole("group", { name: "Product eligibility" });
    expect(within(capabilities).getByLabelText("Commercial")).toBeChecked();
    expect(within(capabilities).getByLabelText("Rush Orders")).not.toBeChecked();
    expect(within(productEligibility).getByLabelText("Commercial Appraisal")).toBeChecked();
    expect(within(dialog).queryByDisplayValue(/"commercial"/)).toBeNull();
    expect(within(dialog).queryByDisplayValue(/"multifamily"/)).toBeNull();
  });

  it("submits allowed profile fields only and refreshes detail on success", async () => {
    permissionState.allowed = new Set(["vendors.update"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.updateVendorProfile.mockResolvedValue("profile-1");

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit Profile" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Profile" });

    fireEvent.change(within(dialog).getByLabelText("Status"), {
      target: { value: "active" },
    });
    fireEvent.change(within(dialog).getByLabelText("Website"), {
      target: { value: " https://updated.example " },
    });
    fireEvent.change(within(dialog).getByLabelText("Public phone"), {
      target: { value: " 555-0199 " },
    });
    fireEvent.change(within(dialog).getByLabelText("Address line 1"), {
      target: { value: " 200 Market St " },
    });
    fireEvent.change(within(dialog).getByLabelText("State"), {
      target: { value: " OH " },
    });
    fireEvent.change(within(dialog).getByLabelText("Default coordination instructions"), {
      target: { value: " Updated instructions. " },
    });
    const capabilities = within(dialog).getByRole("group", { name: "Capabilities" });
    const productEligibility = within(dialog).getByRole("group", { name: "Product eligibility" });
    fireEvent.click(within(capabilities).getByLabelText("Commercial"));
    fireEvent.click(within(capabilities).getByLabelText("Rush Orders"));
    fireEvent.click(within(capabilities).getByLabelText("Tax Appeals"));
    fireEvent.click(within(productEligibility).getByLabelText("Residential Appraisal"));
    fireEvent.click(within(productEligibility).getByLabelText("Commercial Appraisal"));
    fireEvent.click(within(productEligibility).getByLabelText("Review"));
    fireEvent.change(within(dialog).getByLabelText("Tags"), {
      target: { value: " preferred, ohio, preferred " },
    });
    fireEvent.change(within(dialog).getByLabelText("Internal notes"), {
      target: { value: " Updated notes. " },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Profile" }));

    await waitFor(() => {
      expect(vendorApiState.updateVendorProfile).toHaveBeenCalledWith("profile-1", {
        vendor_status: "active",
        website: "https://updated.example",
        public_phone: "555-0199",
        primary_address: {
          line1: "200 Market St",
          city: "White Plains",
          state: "OH",
          zip: "10601",
        },
        default_assignment_instructions: "Updated instructions.",
        capabilities: {
          rush_orders: true,
          tax_appeals: true,
        },
        product_eligibility: {
          residential_appraisal: true,
          review: true,
        },
        internal_notes: "Updated notes.",
        tags: ["preferred", "ohio"],
      });
    });

    const patch = vendorApiState.updateVendorProfile.mock.calls[0][1];
    expect(patch).not.toHaveProperty("vendor_company_id");
    expect(patch).not.toHaveProperty("owner_company_id");
    expect(patch).not.toHaveProperty("relationship_id");
    expect(patch).not.toHaveProperty("relationship_status");
    expect(patch).not.toHaveProperty("contacts");
    expect(patch).not.toHaveProperty("service_areas");
    expect(patch).not.toHaveProperty("assignment");
    expect(patch).not.toHaveProperty("orders");

    await waitFor(() => {
      expect(vendorApiState.getVendorProfileDetail).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole("dialog", { name: "Edit Profile" })).toBeNull();
  });

  it("shows update errors and preserves Edit Profile values", async () => {
    permissionState.allowed = new Set(["vendors.update"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.updateVendorProfile.mockRejectedValue(Object.assign(new Error("vendor_update_permission_required"), {
      code: "42501",
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit Profile" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Profile" });
    const website = within(dialog).getByLabelText("Website");
    fireEvent.change(website, { target: { value: "https://preserved.example" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Profile" }));

    expect(await within(dialog).findByText("You do not have permission to update this vendor.")).toBeInTheDocument();
    expect(website).toHaveValue("https://preserved.example");
    expect(screen.getByRole("dialog", { name: "Edit Profile" })).toBeInTheDocument();
  });

  it("shows generic action failure for unknown profile update errors", async () => {
    permissionState.allowed = new Set(["vendors.update"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.updateVendorProfile.mockRejectedValue(new Error("unexpected profile failure"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit Profile" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Profile" });
    const website = within(dialog).getByLabelText("Website");
    fireEvent.change(website, { target: { value: "https://preserved-profile.example" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Profile" }));

    expect(await within(dialog).findByText("Vendor action failed. Please review the details and try again.")).toBeInTheDocument();
    expect(website).toHaveValue("https://preserved-profile.example");
  });

  it("prevents duplicate profile update submits while saving", async () => {
    permissionState.allowed = new Set(["vendors.update"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    let resolveUpdate;
    vendorApiState.updateVendorProfile.mockImplementation(() => new Promise((resolve) => {
      resolveUpdate = resolve;
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit Profile" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Profile" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Profile" }));
    expect(await within(dialog).findByRole("button", { name: "Saving..." })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Saving..." }));

    expect(vendorApiState.updateVendorProfile).toHaveBeenCalledTimes(1);

    resolveUpdate("profile-1");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Edit Profile" })).toBeNull();
    });
  });

  it("does not render raw JSON profile metadata textareas", async () => {
    permissionState.allowed = new Set(["vendors.update"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit Profile" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Profile" });

    expect(within(dialog).getByRole("group", { name: "Capabilities" })).toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "Product eligibility" })).toBeInTheDocument();
    expect(within(dialog).queryByText("Capabilities must be valid JSON.")).toBeNull();
    expect(within(dialog).queryByDisplayValue(/not-json|^\s*\{/)).toBeNull();
  });

  it("shows contact management controls only with vendors.contacts.manage permission", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Vendor Contact" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit Vendor Contact" })).toBeNull();

    cleanup();
    permissionState.allowed = new Set(["vendors.contacts.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("button", { name: "Add Vendor Contact" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Vendor Contact" })).toBeInTheDocument();
  });

  it("validates Add Vendor Contact name before saving", async () => {
    permissionState.allowed = new Set(["vendors.contacts.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor Contact" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor Contact" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor Contact" }));

    expect(await within(dialog).findByText("Vendor contact name is required.")).toBeInTheDocument();
    expect(vendorApiState.createVendorContact).not.toHaveBeenCalled();
  });

  it("adds a vendor contact and refreshes the profile data", async () => {
    permissionState.allowed = new Set(["vendors.contacts.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.createVendorContact.mockResolvedValue("contact-new");

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor Contact" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor Contact" });
    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: " Sam Contact " },
    });
    fireEvent.change(within(dialog).getByLabelText("Email"), {
      target: { value: " sam@example.test " },
    });
    fireEvent.change(within(dialog).getByLabelText("Phone"), {
      target: { value: " 555-0200 " },
    });
    fireEvent.change(within(dialog).getByLabelText("Role label"), {
      target: { value: " Operations " },
    });
    fireEvent.click(within(dialog).getByLabelText("Primary vendor manager / signing appraiser"));
    fireEvent.click(within(dialog).getByLabelText("Assignment notifications noted for future use"));
    fireEvent.change(within(dialog).getByLabelText("Notes"), {
      target: { value: " Backup coordinator. " },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor Contact" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorContact).toHaveBeenCalledWith("profile-1", {
        name: "Sam Contact",
        email: "sam@example.test",
        phone: "555-0200",
        role_label: "Operations",
        is_primary: true,
        receives_assignment_notifications: true,
        notes: "Backup coordinator.",
      });
    });
    await waitFor(() => {
      expect(vendorApiState.getVendorProfileContacts).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole("dialog", { name: "Add Vendor Contact" })).toBeNull();
  });

  it("edits a vendor contact with prefilled values", async () => {
    permissionState.allowed = new Set(["vendors.contacts.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue([
      {
        ...contacts[0],
        receives_assignment_notifications: true,
        notes: "Current note",
      },
    ]);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.updateVendorContact.mockResolvedValue("contact-1");

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit Vendor Contact" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Vendor Contact" });

    expect(within(dialog).getByLabelText("Name")).toHaveValue("Mary Jones");
    expect(within(dialog).getByLabelText("Email")).toHaveValue("mary@example.test");
    expect(within(dialog).getByLabelText("Primary vendor manager / signing appraiser")).toBeChecked();
    expect(within(dialog).getByLabelText("Assignment notifications noted for future use")).toBeChecked();
    expect(within(dialog).getByLabelText("Notes")).toHaveValue("Current note");

    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: " Mary Updated " },
    });
    fireEvent.change(within(dialog).getByLabelText("Role label"), {
      target: { value: " Lead Coordinator " },
    });
    fireEvent.click(within(dialog).getByLabelText("Primary vendor manager / signing appraiser"));
    fireEvent.click(within(dialog).getByLabelText("Assignment notifications noted for future use"));
    fireEvent.change(within(dialog).getByLabelText("Notes"), {
      target: { value: " Updated note. " },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Vendor Contact" }));

    await waitFor(() => {
      expect(vendorApiState.updateVendorContact).toHaveBeenCalledWith("contact-1", {
        name: "Mary Updated",
        email: "mary@example.test",
        phone: "555-0101",
        role_label: "Lead Coordinator",
        is_primary: false,
        receives_assignment_notifications: false,
        notes: "Updated note.",
      });
    });
    await waitFor(() => {
      expect(vendorApiState.getVendorProfileContacts).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole("dialog", { name: "Edit Vendor Contact" })).toBeNull();
  });

  it("shows contact save errors and preserves form values", async () => {
    permissionState.allowed = new Set(["vendors.contacts.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.createVendorContact.mockRejectedValue(Object.assign(new Error("vendor_contacts_manage_permission_required"), {
      code: "42501",
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor Contact" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor Contact" });
    const name = within(dialog).getByLabelText("Name");
    fireEvent.change(name, { target: { value: "Preserved Contact" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor Contact" }));

    expect(await within(dialog).findByText("You do not have permission to manage vendor contacts.")).toBeInTheDocument();
    expect(name).toHaveValue("Preserved Contact");
    expect(screen.getByRole("dialog", { name: "Add Vendor Contact" })).toBeInTheDocument();
  });

  it("shows contact not-found errors with a friendly message", async () => {
    permissionState.allowed = new Set(["vendors.contacts.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.updateVendorContact.mockRejectedValue(new Error("vendor_contact_not_found_or_not_authorized"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit Vendor Contact" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Vendor Contact" });
    const name = within(dialog).getByLabelText("Name");
    fireEvent.change(name, { target: { value: "Preserved Missing Contact" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Vendor Contact" }));

    expect(await within(dialog).findByText("That contact could not be found or you do not have access to it.")).toBeInTheDocument();
    expect(name).toHaveValue("Preserved Missing Contact");
  });

  it("prevents duplicate contact saves while saving", async () => {
    permissionState.allowed = new Set(["vendors.contacts.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    let resolveCreate;
    vendorApiState.createVendorContact.mockImplementation(() => new Promise((resolve) => {
      resolveCreate = resolve;
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor Contact" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor Contact" });
    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: "Slow Contact" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor Contact" }));
    expect(await within(dialog).findByRole("button", { name: "Saving..." })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Saving..." }));

    expect(vendorApiState.createVendorContact).toHaveBeenCalledTimes(1);

    resolveCreate("contact-slow");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add Vendor Contact" })).toBeNull();
    });
  });

  it("does not render contact delete archive invite or user-linking controls", async () => {
    permissionState.allowed = new Set(["vendors.contacts.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("button", { name: "Add Vendor Contact" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete contact|archive contact|invite|link user/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /invite|link user|amc/i })).toBeNull();
  });

  it("shows service area management controls only with vendors.service_areas.manage permission", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Coverage" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add single coverage row" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit coverage row" })).toBeNull();

    cleanup();
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("button", { name: "Add Coverage" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Add single coverage row" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View rows" }));
    expect(screen.getByRole("button", { name: "Edit coverage row" })).toBeInTheDocument();
  });

  it("loads normalized coverage on the vendor profile", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(vendorApiState.getVendorCoverage).toHaveBeenCalledWith("profile-1");
    const coverageSummary = screen.getByLabelText("Normalized vendor coverage");
    expect(within(coverageSummary).getByText("NY")).toBeInTheDocument();
    expect(within(coverageSummary).getByText("NY Westchester")).toBeInTheDocument();
    expect(within(coverageSummary).getByText("Commercial, Office")).toBeInTheDocument();
    expect(within(coverageSummary).getByText("Appraisal, Review")).toBeInTheDocument();
  });

  it("shows normalized coverage editor only with vendors.service_areas.manage permission", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Normalized Coverage" })).toBeNull();

    cleanup();
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("button", { name: "Edit Normalized Coverage" })).toBeInTheDocument();
  });

  it("saves normalized coverage with normalized deduplicated payload", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.saveVendorCoverage.mockResolvedValue({
      states: ["OH"],
      counties: [{ state_code: "OH", county_name: "Franklin" }],
      propertyTypes: ["commercial", "retail"],
      assignmentTypes: ["appraisal", "evaluation"],
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit Normalized Coverage" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Normalized Coverage" });

    fireEvent.click(within(dialog).getByRole("button", { name: /^NY remove$/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^NY Westchester remove$/ }));
    fireEvent.change(within(dialog).getByLabelText("State code"), {
      target: { value: " oh " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add state" }));
    fireEvent.change(within(dialog).getByLabelText("State code"), {
      target: { value: "OH" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add state" }));
    fireEvent.change(within(dialog).getByLabelText("County state code"), {
      target: { value: "oh" },
    });
    fireEvent.change(within(dialog).getByLabelText("County name"), {
      target: { value: " Franklin " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add county" }));
    fireEvent.change(within(dialog).getByLabelText("County state code"), {
      target: { value: "OH" },
    });
    fireEvent.change(within(dialog).getByLabelText("County name"), {
      target: { value: "Franklin" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add county" }));
    fireEvent.click(within(dialog).getByLabelText("Office"));
    fireEvent.click(within(dialog).getByLabelText("Review"));
    fireEvent.click(within(dialog).getByLabelText("Retail"));
    fireEvent.click(within(dialog).getByLabelText("Evaluation"));

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Normalized Coverage" }));

    await waitFor(() => {
      expect(vendorApiState.saveVendorCoverage).toHaveBeenCalledWith("profile-1", {
        states: ["OH"],
        counties: [{ state_code: "OH", county_name: "Franklin" }],
        propertyTypes: ["commercial", "retail"],
        assignmentTypes: ["appraisal", "evaluation"],
      });
    });
    expect(await screen.findByText("Normalized coverage saved.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Edit Normalized Coverage" })).toBeNull();
  });

  it("displays normalized coverage save errors and keeps the editor open", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.saveVendorCoverage.mockRejectedValue(Object.assign(new Error("vendor_service_areas_manage_permission_required"), {
      code: "42501",
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit Normalized Coverage" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Normalized Coverage" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Normalized Coverage" }));

    expect(await within(dialog).findByText("You do not have permission to manage vendor coverage.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Edit Normalized Coverage" })).toBeInTheDocument();
  });

  it("does not add matching recommendation or bid automation controls to coverage editing", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("button", { name: "Edit Normalized Coverage" })).toBeInTheDocument();
    expect(screen.getByText(/does not assign work or request bids/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /match vendors|recommend vendors|request bids|create bid/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /match vendors|recommend vendors|request bids|create bid/i })).toBeNull();
  });

  it("summarizes generated coverage rows by state and geography type", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(generatedCoverageRows);

    renderPage();

    expect(await screen.findByText("MI · Statewide · 5 products")).toBeInTheDocument();
    expect(screen.getByText("IN · 3 counties · 2 products")).toBeInTheDocument();
    expect(screen.getByText("OH · ZIP coverage · 3 ZIPs · 2 products")).toBeInTheDocument();
    expect(screen.getByText("OH · Columbus · 25 mi · 2 products")).toBeInTheDocument();
    expect(screen.queryByText("Adams")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "View rows" })[1]);
    expect(screen.getAllByText("Adams")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "View rows" }).length).toBe(3);
  });

  it("validates bulk Add Coverage requires generated rows", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Coverage" }));
    const dialog = screen.getByRole("dialog", { name: "Add Coverage" });
    expect(within(dialog).getByText(/does not assign work automatically/i)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Coverage" }));

    expect(await within(dialog).findByText("Add at least one coverage selection before saving.")).toBeInTheDocument();
    expect(vendorApiState.createVendorServiceArea).not.toHaveBeenCalled();
  });

  it("bulk adds generated coverage rows and refreshes the profile data", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.createVendorServiceArea.mockResolvedValue("area-created");

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Coverage" }));
    const dialog = screen.getByRole("dialog", { name: "Add Coverage" });
    fireEvent.change(within(dialog).getByLabelText("Coverage mode"), {
      target: { value: "selected_counties" },
    });
    fireEvent.click(within(dialog).getByLabelText("Franklin"));
    fireEvent.click(within(dialog).getByLabelText("Delaware"));
    fireEvent.click(within(dialog).getByLabelText("Commercial Appraisal"));
    fireEvent.click(within(dialog).getByLabelText("Residential Appraisal"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));

    expect(within(dialog).getAllByText("OH · 2 counties · 2 products").length).toBeGreaterThan(0);

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Coverage" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorServiceArea).toHaveBeenCalledTimes(4);
    });
    expect(vendorApiState.createVendorServiceArea).toHaveBeenNthCalledWith(1, "profile-1", {
      state: "OH",
      county: "Franklin",
      zip: null,
      market: null,
      radius_miles: null,
      product_type: "commercial_appraisal",
      status: "active",
    });
    expect(vendorApiState.createVendorServiceArea).toHaveBeenNthCalledWith(4, "profile-1", {
      state: "OH",
      county: "Delaware",
      zip: null,
      market: null,
      radius_miles: null,
      product_type: "residential_appraisal",
      status: "active",
    });
    await waitFor(() => {
      expect(vendorApiState.getVendorProfileServiceAreas).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole("dialog", { name: "Add Coverage" })).toBeNull();
  });

  it("preserves bulk Add Coverage rows after create errors", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.createVendorServiceArea.mockRejectedValue(Object.assign(new Error("vendor_service_areas_manage_permission_required"), {
      code: "42501",
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Coverage" }));
    const dialog = screen.getByRole("dialog", { name: "Add Coverage" });
    fireEvent.click(within(dialog).getByLabelText("Commercial Appraisal"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Coverage" }));

    expect(await within(dialog).findByText("You do not have permission to manage vendor coverage.")).toBeInTheDocument();
    expect(within(dialog).getAllByText("OH · Statewide · 1 product").length).toBeGreaterThan(0);
    expect(screen.getByRole("dialog", { name: "Add Coverage" })).toBeInTheDocument();
  });

  it("validates Add single coverage row coverage before saving", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add single coverage row" }));
    const dialog = screen.getByRole("dialog", { name: "Add single coverage row" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage row" }));

    expect(await within(dialog).findByText("Add at least one coverage or product field.")).toBeInTheDocument();
    expect(vendorApiState.createVendorServiceArea).not.toHaveBeenCalled();
  });

  it("adds a vendor service area and refreshes the profile data", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.createVendorServiceArea.mockResolvedValue("area-new");

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add single coverage row" }));
    const dialog = screen.getByRole("dialog", { name: "Add single coverage row" });
    fireEvent.change(within(dialog).getByLabelText("State"), {
      target: { value: " oh " },
    });
    fireEvent.change(within(dialog).getByLabelText("County"), {
      target: { value: " Franklin " },
    });
    fireEvent.change(within(dialog).getByLabelText("ZIP"), {
      target: { value: " 43215 " },
    });
    fireEvent.change(within(dialog).getByLabelText("Market"), {
      target: { value: " Columbus " },
    });
    fireEvent.change(within(dialog).getByLabelText("Radius miles"), {
      target: { value: " 25 " },
    });
    fireEvent.change(within(dialog).getByLabelText("Product type"), {
      target: { value: "commercial_appraisal" },
    });
    expect(within(dialog).getByRole("option", { name: "Construction Draw" })).toHaveValue("construction_draw");
    expect(within(dialog).getByRole("option", { name: "Short-Term Rental" })).toHaveValue("short_term_rental");

    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage row" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorServiceArea).toHaveBeenCalledWith("profile-1", {
        state: "OH",
        county: "Franklin",
        zip: "43215",
        market: "Columbus",
        radius_miles: "25",
        product_type: "commercial_appraisal",
        status: "active",
      });
    });
    await waitFor(() => {
      expect(vendorApiState.getVendorProfileServiceAreas).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole("dialog", { name: "Add single coverage row" })).toBeNull();
  });

  it("edits a vendor service area with prefilled values and inactive status", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.updateVendorServiceArea.mockResolvedValue("area-1");

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "View rows" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit coverage row" }));
    const dialog = screen.getByRole("dialog", { name: "Edit coverage row" });

    expect(within(dialog).getByLabelText("State")).toHaveValue("NY");
    expect(within(dialog).getByLabelText("County")).toHaveValue("Westchester");
    expect(within(dialog).getByLabelText("ZIP")).toHaveValue("10601");
    expect(within(dialog).getByLabelText("Market")).toHaveValue("NY Metro");
    expect(within(dialog).getByLabelText("Radius miles")).toHaveValue("25");
    expect(within(dialog).getByLabelText("Product type")).toHaveValue("commercial_appraisal");
    expect(within(dialog).getByLabelText("Status")).toHaveValue("active");

    fireEvent.change(within(dialog).getByLabelText("Status"), {
      target: { value: "inactive" },
    });
    fireEvent.change(within(dialog).getByLabelText("Product type"), {
      target: { value: "residential_appraisal" },
    });
    fireEvent.change(within(dialog).getByLabelText("Radius miles"), {
      target: { value: " 40 " },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save coverage row" }));

    await waitFor(() => {
      expect(vendorApiState.updateVendorServiceArea).toHaveBeenCalledWith("area-1", {
        state: "NY",
        county: "Westchester",
        zip: "10601",
        market: "NY Metro",
        radius_miles: "40",
        product_type: "residential_appraisal",
        status: "inactive",
      });
    });
    await waitFor(() => {
      expect(vendorApiState.getVendorProfileServiceAreas).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole("dialog", { name: "Edit coverage row" })).toBeNull();
  });

  it("shows service area save errors and preserves form values", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.createVendorServiceArea.mockRejectedValue(Object.assign(new Error("vendor_service_areas_manage_permission_required"), {
      code: "42501",
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add single coverage row" }));
    const dialog = screen.getByRole("dialog", { name: "Add single coverage row" });
    const state = within(dialog).getByLabelText("State");
    fireEvent.change(state, { target: { value: "MI" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage row" }));

    expect(await within(dialog).findByText("You do not have permission to manage vendor coverage.")).toBeInTheDocument();
    expect(state).toHaveValue("MI");
    expect(screen.getByRole("dialog", { name: "Add single coverage row" })).toBeInTheDocument();
  });

  it("shows service area not-found errors with a friendly message", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    vendorApiState.updateVendorServiceArea.mockRejectedValue(new Error("vendor_service_area_not_found_or_not_authorized"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "View rows" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit coverage row" }));
    const dialog = screen.getByRole("dialog", { name: "Edit coverage row" });
    const market = within(dialog).getByLabelText("Market");
    fireEvent.change(market, { target: { value: "Preserved Market" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save coverage row" }));

    expect(await within(dialog).findByText("That coverage could not be found or you do not have access to it.")).toBeInTheDocument();
    expect(market).toHaveValue("Preserved Market");
  });

  it("prevents duplicate service area saves while saving", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);
    let resolveCreate;
    vendorApiState.createVendorServiceArea.mockImplementation(() => new Promise((resolve) => {
      resolveCreate = resolve;
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add single coverage row" }));
    const dialog = screen.getByRole("dialog", { name: "Add single coverage row" });
    fireEvent.change(within(dialog).getByLabelText("Market"), {
      target: { value: "Slow Market" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage row" }));
    expect(await within(dialog).findByRole("button", { name: "Saving..." })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Saving..." }));

    expect(vendorApiState.createVendorServiceArea).toHaveBeenCalledTimes(1);

    resolveCreate("area-slow");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add single coverage row" })).toBeNull();
    });
  });

  it("does not render service area delete mapping or assignment controls", async () => {
    permissionState.allowed = new Set(["vendors.service_areas.manage"]);
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(serviceAreas);

    renderPage();

    expect(await screen.findByRole("button", { name: "Add single coverage row" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete service area|archive service area|map|geocode|assign|candidate/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /map|geocode|assign|candidate|amc/i })).toBeNull();
  });

  it("renders unknown legacy service-area product values without crashing", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue(profile);
    vendorApiState.getVendorProfileContacts.mockResolvedValue(contacts);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue([
      {
        ...serviceAreas[0],
        product_type: "custom legacy product",
      },
    ]);

    renderPage();

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(screen.getByText(/custom legacy product/)).toBeInTheDocument();
  });

  it("renders an error state for unauthorized or missing profiles", async () => {
    vendorApiState.getVendorProfileDetail.mockRejectedValue(new Error("vendor_profile_not_found_or_not_authorized"));
    vendorApiState.getVendorProfileContacts.mockResolvedValue([]);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("Vendor profile could not load.")).toBeInTheDocument();
    expect(screen.getByText("That vendor could not be found or you do not have access to it.")).toBeInTheDocument();
  });

  it("renders a not found state when the API returns no detail", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue(null);
    vendorApiState.getVendorProfileContacts.mockResolvedValue([]);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("Vendor profile not found.")).toBeInTheDocument();
  });

  it("renders empty contact and service-area sections without mutation affordances", async () => {
    vendorApiState.getVendorProfileDetail.mockResolvedValue({
      ...profile,
      capabilities: null,
      product_eligibility: null,
      tags: null,
      internal_notes: null,
      primary_address: null,
    });
    vendorApiState.getVendorProfileContacts.mockResolvedValue(null);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue(null);

    renderPage();

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    const summary = screen.getByLabelText("Vendor summary");
    expect(within(summary).getByText("0")).toBeInTheDocument();
    expect(within(summary).getByText("No vendor manager")).toBeInTheDocument();
    expect(within(summary).getByText("0 Regions")).toBeInTheDocument();
    expect(within(summary).getByText("No coverage listed")).toBeInTheDocument();
    expect(within(summary).getByText("0 Products")).toBeInTheDocument();
    expect(within(summary).getByText("No products listed")).toBeInTheDocument();
    expect(screen.getByText("No address listed")).toBeInTheDocument();
    expect(screen.getAllByText("None listed").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("No tags listed.")).toBeInTheDocument();
    expect(screen.getByText("No internal notes listed.")).toBeInTheDocument();
    expect(screen.getByText("No vendor manager or contacts listed.")).toBeInTheDocument();
    expect(screen.getByText("No coverage listed.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create|save|assign|invite|add|delete|archive|edit/i })).toBeNull();
  });
});
