// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const vendorApiState = vi.hoisted(() => ({
  getVendorProfileDetail: vi.fn(),
  getVendorProfileContacts: vi.fn(),
  getVendorProfileServiceAreas: vi.fn(),
}));

vi.mock("../api", () => ({
  getVendorProfileDetail: vendorApiState.getVendorProfileDetail,
  getVendorProfileContacts: vendorApiState.getVendorProfileContacts,
  getVendorProfileServiceAreas: vendorApiState.getVendorProfileServiceAreas,
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
  default_assignment_instructions: "Upload report packet before delivery.",
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
    product_type: "commercial",
    radius_miles: 25,
  },
];

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={["/vendors/profile-1"]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route path="/vendors/:vendorProfileId" element={<VendorProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("VendorProfilePage", () => {
  beforeEach(() => {
    vendorApiState.getVendorProfileDetail.mockReset();
    vendorApiState.getVendorProfileContacts.mockReset();
    vendorApiState.getVendorProfileServiceAreas.mockReset();
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
    expect(screen.getByText("https://abc.example")).toBeInTheDocument();
    expect(screen.getByText(/100 Main St/)).toBeInTheDocument();
    expect(screen.getByText("Upload report packet before delivery.")).toBeInTheDocument();
    expect(screen.getByText(/Commercial: Yes/)).toBeInTheDocument();
    expect(screen.getByText(/Multifamily: Yes/)).toBeInTheDocument();
    expect(screen.getByText(/Restricted: \{"reason":"review"\}/)).toBeInTheDocument();
    expect(screen.getByText("Mary Jones")).toBeInTheDocument();
    expect(screen.getByText(/Westchester/)).toBeInTheDocument();
    expect(screen.getByText("Reliable preferred panel vendor.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create|save|assign|invite|add|delete|archive|edit/i })).toBeNull();
  });

  it("renders an error state for unauthorized or missing profiles", async () => {
    vendorApiState.getVendorProfileDetail.mockRejectedValue(new Error("denied"));
    vendorApiState.getVendorProfileContacts.mockResolvedValue([]);
    vendorApiState.getVendorProfileServiceAreas.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("Vendor profile could not load.")).toBeInTheDocument();
    expect(screen.getByText(/not authorized/)).toBeInTheDocument();
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
    expect(screen.getByText("No address listed")).toBeInTheDocument();
    expect(screen.getAllByText("None listed").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("No tags listed.")).toBeInTheDocument();
    expect(screen.getByText("No internal notes listed.")).toBeInTheDocument();
    expect(screen.getByText("No contacts listed.")).toBeInTheDocument();
    expect(screen.getByText("No service areas listed.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create|save|assign|invite|add|delete|archive|edit/i })).toBeNull();
  });
});
