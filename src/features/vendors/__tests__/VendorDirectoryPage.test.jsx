// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const vendorApiState = vi.hoisted(() => ({
  listVendorDirectory: vi.fn(),
  createVendorProfile: vi.fn(),
}));

const permissionState = vi.hoisted(() => ({
  allowed: new Set(),
}));

const routeState = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock("../api", () => ({
  listVendorDirectory: vendorApiState.listVendorDirectory,
  createVendorProfile: vendorApiState.createVendorProfile,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useCan: (permissionKey) => ({
    allowed: permissionState.allowed.has(permissionKey),
    loading: false,
    error: null,
    permissionKeys: [...permissionState.allowed],
  }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => routeState.navigate,
  };
});

const { default: VendorDirectoryPage } = await import("../VendorDirectoryPage.jsx");

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <VendorDirectoryPage />
    </MemoryRouter>,
  );
}

const vendorRow = {
  vendor_profile_id: "profile-1",
  vendor_company_id: "company-1",
  vendor_company_name: "ABC Valuation",
  vendor_status: "preferred",
  relationship_status: "active",
  primary_contact_name: "Mary Jones",
  primary_contact_email: "mary@example.test",
  primary_contact_phone: "555-0100",
  service_area_summary: {
    active_count: 2,
    states: ["NY"],
    counties: ["Westchester"],
    zips: ["10601"],
    markets: ["NY Metro"],
    product_types: ["commercial"],
  },
  product_eligibility: {
    commercial: true,
    multifamily: true,
  },
  tags: ["preferred", "fast-turn"],
  updated_at: "2026-06-01T12:00:00.000Z",
};

describe("VendorDirectoryPage", () => {
  beforeEach(() => {
    vendorApiState.listVendorDirectory.mockReset();
    vendorApiState.createVendorProfile.mockReset();
    permissionState.allowed = new Set();
    routeState.navigate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders loading and populated Vendor Directory states", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([vendorRow]);

    renderPage();

    expect(screen.getByText("Loading vendors...")).toBeInTheDocument();

    expect(await screen.findByText("ABC Valuation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ABC Valuation" })).toHaveAttribute("href", "/vendors/profile-1");
    expect(screen.getAllByText("Preferred").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getByText(/Mary Jones/)).toBeInTheDocument();
    expect(screen.getByText(/2 active/)).toBeInTheDocument();
    expect(screen.getByText(/Commercial/)).toBeInTheDocument();
    expect(screen.getByText("fast-turn")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create|save|assign|invite|add/i })).toBeNull();
  });

  it("handles sparse read-model rows without broken detail links or summaries", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([
      {
        vendor_company_name: "Sparse Vendor",
        vendor_status: null,
        relationship_status: null,
        service_area_summary: null,
        product_eligibility: null,
        tags: null,
      },
    ]);

    renderPage();

    expect(await screen.findByText("Sparse Vendor")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sparse Vendor" })).toBeNull();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText(/Network:\s*Staged/)).toBeInTheDocument();
    expect(screen.getByText("No primary contact")).toBeInTheDocument();
    expect(screen.getByText("No active coverage")).toBeInTheDocument();
    expect(screen.getByText("No product summary")).toBeInTheDocument();
  });

  it("renders an empty state", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("No vendors found.")).toBeInTheDocument();
  });

  it("renders an error state", async () => {
    vendorApiState.listVendorDirectory.mockRejectedValue(new Error("denied"));

    renderPage();

    expect(await screen.findByText("Vendor Directory could not load.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("calls listVendorDirectory with search and status controls", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(vendorApiState.listVendorDirectory).toHaveBeenLastCalledWith({
        status: null,
        query: null,
      });
    });

    fireEvent.change(screen.getByPlaceholderText("Search vendors"), {
      target: { value: "Bergen" },
    });

    await waitFor(() => {
      expect(vendorApiState.listVendorDirectory).toHaveBeenLastCalledWith({
        status: null,
        query: "Bergen",
      });
    });

    fireEvent.change(screen.getByLabelText("Vendor status"), {
      target: { value: "preferred" },
    });

    await waitFor(() => {
      expect(vendorApiState.listVendorDirectory).toHaveBeenLastCalledWith({
        status: "preferred",
        query: "Bergen",
      });
    });
  });

  it("shows Add Vendor only with vendors.create permission", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("No vendors found.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Vendor" })).toBeNull();

    cleanup();
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole("button", { name: "Add Vendor" })).toBeInTheDocument();
  });

  it("opens and closes the Add Vendor modal", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    expect(screen.getByRole("dialog", { name: "Add Vendor" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Add Vendor" })).toBeNull();
  });

  it("resets Add Vendor form values after closing", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    let dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "Draft Vendor" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Vendor" }));
    dialog = screen.getByRole("dialog", { name: "Add Vendor" });

    expect(within(dialog).getByLabelText("Vendor company name")).toHaveValue("");
    expect(within(dialog).getByLabelText("Vendor status")).toHaveValue("active");
  });

  it("requires a vendor company name before submitting", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    expect(await within(dialog).findByText("Vendor company name is required.")).toBeInTheDocument();
    expect(vendorApiState.createVendorProfile).not.toHaveBeenCalled();
  });

  it("submits Add Vendor through createVendorProfile and navigates to detail on success", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({
      vendor_profile_id: "profile-new",
      vendor_company_id: "company-new",
      relationship_id: "relationship-new",
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });

    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "New Vendor Co" },
    });
    fireEvent.change(within(dialog).getByLabelText("Website"), {
      target: { value: "https://vendor.example" },
    });
    fireEvent.change(within(dialog).getByLabelText("Public phone"), {
      target: { value: "614-555-0199" },
    });
    fireEvent.change(within(dialog).getByLabelText("Contact name"), {
      target: { value: "Dana Vendor" },
    });
    fireEvent.change(within(dialog).getByLabelText("Contact email"), {
      target: { value: "dana@example.test" },
    });
    expect(within(dialog).getByText(/Coverage is used for directory visibility/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText("Commercial"));
    expect(within(dialog).getByLabelText("Restricted Appraisal")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Short-Term Rental")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));
    fireEvent.change(within(dialog).getByLabelText("Tags"), {
      target: { value: "preferred, commercial, preferred" },
    });
    fireEvent.change(within(dialog).getByLabelText("Default coordination instructions"), {
      target: { value: "Send report questions to the coordinator." },
    });
    fireEvent.change(within(dialog).getByLabelText("Internal notes"), {
      target: { value: "Owner-approved onboarding." },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile).toHaveBeenCalledWith(expect.objectContaining({
        vendor_company: { name: "New Vendor Co" },
        create_relationship: true,
        vendor_status: "active",
        website: "https://vendor.example",
        public_phone: "614-555-0199",
        default_assignment_instructions: "Send report questions to the coordinator.",
        internal_notes: "Owner-approved onboarding.",
        tags: ["preferred", "commercial"],
        primary_contact: expect.objectContaining({
          name: "Dana Vendor",
          email: "dana@example.test",
        }),
        service_areas: [
          expect.objectContaining({
            state: "OH",
            county: null,
            zip: null,
            market: null,
            radius_miles: null,
            product_type: "commercial",
            status: "active",
          }),
        ],
      }));
    });

    expect(vendorApiState.createVendorProfile.mock.calls[0][0]).not.toHaveProperty("relationship_id");
    await waitFor(() => {
      expect(routeState.navigate).toHaveBeenCalledWith("/vendors/profile-new");
    });
    expect(screen.queryByRole("dialog", { name: "Add Vendor" })).toBeNull();
    expect(vendorApiState.listVendorDirectory).toHaveBeenCalledTimes(2);
  });

  it("prevents duplicate submits while Add Vendor is saving", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    let resolveCreate;
    vendorApiState.createVendorProfile.mockImplementation(() => new Promise((resolve) => {
      resolveCreate = resolve;
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "Slow Vendor" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));
    expect(await within(dialog).findByRole("button", { name: "Adding..." })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Adding..." }));

    expect(vendorApiState.createVendorProfile).toHaveBeenCalledTimes(1);

    resolveCreate({ vendor_profile_id: "profile-slow" });
    await waitFor(() => {
      expect(routeState.navigate).toHaveBeenCalledWith("/vendors/profile-slow");
    });
  });

  it("refreshes safely when create succeeds without a returned profile id", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({
      vendor_company_id: "company-new",
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "Refresh Only Vendor" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.listVendorDirectory).toHaveBeenCalledTimes(2);
    });
    expect(routeState.navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Add Vendor" })).toBeNull();
  });

  it("omits empty optional sections from the create payload", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({ vendor_profile_id: "profile-minimal" });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "  Minimal Vendor  " },
    });
    fireEvent.change(within(dialog).getByLabelText("Website"), {
      target: { value: "   " },
    });
    fireEvent.change(within(dialog).getByLabelText("Contact email"), {
      target: { value: "   " },
    });
    fireEvent.change(within(dialog).getByLabelText("Tags"), {
      target: { value: " ,  " },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile).toHaveBeenCalledWith({
        vendor_company: { name: "Minimal Vendor" },
        create_relationship: true,
        vendor_status: "active",
      });
    });
  });

  it("submits Add Vendor entire-state CoverageBuilder rows", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({ vendor_profile_id: "profile-coverage" });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "Statewide Vendor" },
    });
    fireEvent.click(within(dialog).getByLabelText("Commercial"));
    fireEvent.click(within(dialog).getByLabelText("Multifamily"));
    expect(within(dialog).getByText("OH · Statewide · Commercial")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile).toHaveBeenCalledWith(expect.objectContaining({
        service_areas: [
          expect.objectContaining({ state: "OH", county: null, product_type: "commercial", status: "active" }),
          expect.objectContaining({ state: "OH", county: null, product_type: "multifamily", status: "active" }),
        ],
      }));
    });
  });

  it("submits Add Vendor county CoverageBuilder row combinations", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({ vendor_profile_id: "profile-counties" });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "County Vendor" },
    });
    fireEvent.change(within(dialog).getByLabelText("Coverage mode"), {
      target: { value: "selected_counties" },
    });
    fireEvent.click(within(dialog).getByLabelText("Franklin"));
    fireEvent.click(within(dialog).getByLabelText("Delaware"));
    fireEvent.click(within(dialog).getByLabelText("Commercial"));
    fireEvent.click(within(dialog).getByLabelText("Land"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile.mock.calls[0][0].service_areas).toEqual([
        expect.objectContaining({ state: "OH", county: "Franklin", product_type: "commercial", status: "active" }),
        expect.objectContaining({ state: "OH", county: "Franklin", product_type: "land", status: "active" }),
        expect.objectContaining({ state: "OH", county: "Delaware", product_type: "commercial", status: "active" }),
        expect.objectContaining({ state: "OH", county: "Delaware", product_type: "land", status: "active" }),
      ]);
    });
  });

  it("submits Add Vendor ZIP CoverageBuilder row combinations", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({ vendor_profile_id: "profile-zips" });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "ZIP Vendor" },
    });
    fireEvent.change(within(dialog).getByLabelText("Coverage mode"), {
      target: { value: "selected_zips" },
    });
    fireEvent.change(within(dialog).getByLabelText("ZIP codes"), {
      target: { value: "43215, 43212" },
    });
    fireEvent.click(within(dialog).getByLabelText("Residential"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile.mock.calls[0][0].service_areas).toEqual([
        expect.objectContaining({ state: "OH", zip: "43215", product_type: "residential", status: "active" }),
        expect.objectContaining({ state: "OH", zip: "43212", product_type: "residential", status: "active" }),
      ]);
    });
  });

  it("submits Add Vendor market/radius CoverageBuilder rows", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockResolvedValue({ vendor_profile_id: "profile-market" });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    fireEvent.change(within(dialog).getByLabelText("Vendor company name"), {
      target: { value: "Market Vendor" },
    });
    fireEvent.change(within(dialog).getByLabelText("Coverage mode"), {
      target: { value: "market_radius" },
    });
    fireEvent.change(within(dialog).getByLabelText("Market"), {
      target: { value: "Columbus" },
    });
    fireEvent.change(within(dialog).getByLabelText("Radius miles"), {
      target: { value: "25" },
    });
    fireEvent.click(within(dialog).getByLabelText("Commercial"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add coverage" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    await waitFor(() => {
      expect(vendorApiState.createVendorProfile.mock.calls[0][0].service_areas).toEqual([
        expect.objectContaining({
          state: "OH",
          market: "Columbus",
          radius_miles: 25,
          product_type: "commercial",
          status: "active",
        }),
      ]);
    });
  });

  it("shows duplicate create errors and preserves Add Vendor form input", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockRejectedValue(Object.assign(new Error("vendor_profile_duplicate"), {
      code: "23505",
    }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    const companyName = within(dialog).getByLabelText("Vendor company name");
    fireEvent.change(companyName, { target: { value: "Duplicate Vendor" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    expect(await within(dialog).findByText("This vendor is already in your Vendor Directory.")).toBeInTheDocument();
    expect(companyName).toHaveValue("Duplicate Vendor");
    expect(screen.getByRole("dialog", { name: "Add Vendor" })).toBeInTheDocument();
    expect(routeState.navigate).not.toHaveBeenCalled();
  });

  it("shows a self-vendor message for relationship-invalid create errors", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockRejectedValue(new Error("vendor_relationship_invalid"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    const companyName = within(dialog).getByLabelText("Vendor company name");
    fireEvent.change(companyName, { target: { value: "Falcon Default" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    expect(await within(dialog).findByText("You cannot add your current company as its own vendor.")).toBeInTheDocument();
    expect(companyName).toHaveValue("Falcon Default");
    expect(routeState.navigate).not.toHaveBeenCalled();
  });

  it("shows vendor company and permission backend errors with friendly messages", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile
      .mockRejectedValueOnce(new Error("vendor_company_required"))
      .mockRejectedValueOnce(new Error("vendor_company_name_required"))
      .mockRejectedValueOnce(Object.assign(new Error("vendor_create_permission_required"), {
        code: "42501",
      }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    const companyName = within(dialog).getByLabelText("Vendor company name");
    fireEvent.change(companyName, { target: { value: "Backend Checked Vendor" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));
    expect(await within(dialog).findByText("Choose an existing vendor company or enter a new vendor company name.")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));
    expect(await within(dialog).findByText("Vendor company name is required.")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));
    expect(await within(dialog).findByText("You do not have permission to add vendors.")).toBeInTheDocument();
    expect(companyName).toHaveValue("Backend Checked Vendor");
  });

  it("shows generic action failure for unknown create errors", async () => {
    permissionState.allowed = new Set(["vendors.create"]);
    vendorApiState.listVendorDirectory.mockResolvedValue([]);
    vendorApiState.createVendorProfile.mockRejectedValue(new Error("unexpected backend failure"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add Vendor" }));
    const dialog = screen.getByRole("dialog", { name: "Add Vendor" });
    const companyName = within(dialog).getByLabelText("Vendor company name");
    fireEvent.change(companyName, { target: { value: "Unknown Error Vendor" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Vendor" }));

    expect(await within(dialog).findByText("Vendor action failed. Please review the details and try again.")).toBeInTheDocument();
    expect(companyName).toHaveValue("Unknown Error Vendor");
  });

  it("does not render mutation controls without create permission", async () => {
    vendorApiState.listVendorDirectory.mockResolvedValue([vendorRow]);

    renderPage();

    expect(await screen.findByText("ABC Valuation")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Vendor" })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit|archive|assign|delete/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /amc/i })).toBeNull();
  });
});
