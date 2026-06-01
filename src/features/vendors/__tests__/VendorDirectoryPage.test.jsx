// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const vendorApiState = vi.hoisted(() => ({
  listVendorDirectory: vi.fn(),
}));

vi.mock("../api", () => ({
  listVendorDirectory: vendorApiState.listVendorDirectory,
}));

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
    expect(screen.getByText("Staged")).toBeInTheDocument();
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
});
