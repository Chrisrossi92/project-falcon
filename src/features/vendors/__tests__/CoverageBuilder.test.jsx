// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CoverageBuilder from "../coverage/CoverageBuilder.jsx";

const vendorApiState = vi.hoisted(() => ({
  createVendorServiceArea: vi.fn(),
  updateVendorServiceArea: vi.fn(),
}));

vi.mock("../api", () => ({
  createVendorServiceArea: vendorApiState.createVendorServiceArea,
  updateVendorServiceArea: vendorApiState.updateVendorServiceArea,
}));

function renderBuilder(props = {}) {
  return render(<CoverageBuilder {...props} />);
}

describe("CoverageBuilder", () => {
  afterEach(() => {
    cleanup();
    vendorApiState.createVendorServiceArea.mockReset();
    vendorApiState.updateVendorServiceArea.mockReset();
  });

  it("generates statewide preview rows and emits product slugs", () => {
    const onRowsChange = vi.fn();
    renderBuilder({ onRowsChange });

    fireEvent.click(screen.getByLabelText("Commercial Appraisal"));
    fireEvent.click(screen.getByLabelText("Residential Appraisal"));

    expect(screen.getByText("Coverage to add")).toBeInTheDocument();
    expect(screen.getByText("Added coverage")).toBeInTheDocument();
    expect(screen.queryByText("Pending rows")).toBeNull();
    expect(screen.queryByText("Coverage preview")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Coverage Block" })).toBeNull();
    expect(screen.getByText("OH · Statewide · 2 products")).toBeInTheDocument();
    expect(screen.queryByText("OH · Statewide · Commercial")).toBeNull();
    expect(screen.queryByText("OH · Statewide · Multifamily")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Add coverage" }));

    expect(onRowsChange).toHaveBeenCalledWith([
      expect.objectContaining({ state: "OH", product_type: "commercial_appraisal" }),
      expect.objectContaining({ state: "OH", product_type: "residential_appraisal" }),
    ]);
    expect(screen.getAllByText("OH · Statewide · 2 products").length).toBeGreaterThan(0);
    expect(vendorApiState.createVendorServiceArea).not.toHaveBeenCalled();
    expect(vendorApiState.updateVendorServiceArea).not.toHaveBeenCalled();
  });

  it("changes county options by state and generates county/product combinations", () => {
    const onAddCoverageBlock = vi.fn();
    renderBuilder({ onAddCoverageBlock });

    fireEvent.change(screen.getByLabelText("Coverage state"), { target: { value: "MI" } });
    fireEvent.change(screen.getByLabelText("Coverage mode"), {
      target: { value: "selected_counties" },
    });

    expect(screen.queryByLabelText("Franklin")).toBeNull();
    fireEvent.click(screen.getByLabelText("Wayne"));
    fireEvent.click(screen.getByLabelText("Oakland"));
    fireEvent.click(screen.getByLabelText("Commercial Appraisal"));
    fireEvent.click(screen.getByLabelText("Review"));

    fireEvent.click(screen.getByRole("button", { name: "Add coverage" }));

    expect(onAddCoverageBlock).toHaveBeenCalledWith([
      expect.objectContaining({ state: "MI", county: "Wayne", product_type: "commercial_appraisal" }),
      expect.objectContaining({ state: "MI", county: "Wayne", product_type: "review" }),
      expect.objectContaining({ state: "MI", county: "Oakland", product_type: "commercial_appraisal" }),
      expect.objectContaining({ state: "MI", county: "Oakland", product_type: "review" }),
    ]);
    expect(screen.getAllByText("MI · 2 counties · 2 products").length).toBeGreaterThan(0);
    expect(screen.queryByText("MI · Wayne County · Commercial")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View generated rows" }));
    expect(screen.getByText("MI · Wayne County · Commercial Appraisal")).toBeInTheDocument();
    expect(screen.getByText("MI · Oakland County · Review")).toBeInTheDocument();
  });

  it("generates ZIP/product combinations", () => {
    const onAddCoverageBlock = vi.fn();
    renderBuilder({ onAddCoverageBlock });

    fireEvent.change(screen.getByLabelText("Coverage mode"), {
      target: { value: "selected_zips" },
    });
    fireEvent.change(screen.getByLabelText("ZIP codes"), { target: { value: "43215, 43212" } });
    fireEvent.click(screen.getByLabelText("Residential Appraisal"));

    fireEvent.click(screen.getByRole("button", { name: "Add coverage" }));

    expect(onAddCoverageBlock).toHaveBeenCalledWith([
      expect.objectContaining({ state: "OH", zip: "43215", product_type: "residential_appraisal" }),
      expect.objectContaining({ state: "OH", zip: "43212", product_type: "residential_appraisal" }),
    ]);
    expect(screen.getAllByText("OH · 2 ZIPs · 1 product").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "View generated rows" }));
    expect(screen.getByText("OH · ZIP 43215 · Residential Appraisal")).toBeInTheDocument();
  });

  it("generates market/radius rows", () => {
    const onAddCoverageBlock = vi.fn();
    renderBuilder({ onAddCoverageBlock });

    fireEvent.change(screen.getByLabelText("Coverage mode"), {
      target: { value: "market_radius" },
    });
    fireEvent.change(screen.getByLabelText("Market"), { target: { value: "Columbus" } });
    fireEvent.change(screen.getByLabelText("Radius miles"), { target: { value: "25" } });
    fireEvent.click(screen.getByLabelText("Commercial Appraisal"));

    fireEvent.click(screen.getByRole("button", { name: "Add coverage" }));

    expect(onAddCoverageBlock).toHaveBeenCalledWith([
      expect.objectContaining({
        state: "OH",
        market: "Columbus",
        radius_miles: 25,
        product_type: "commercial_appraisal",
      }),
    ]);
    expect(screen.getAllByText("OH · Columbus · 25 mi · 1 product").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "View generated rows" }));
    expect(screen.getByText("OH · Columbus · 25 mi · Commercial Appraisal")).toBeInTheDocument();
  });

  it("prevents empty or incomplete blocks", () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: "Add coverage" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one product type.");

    fireEvent.click(screen.getByLabelText("Commercial Appraisal"));
    fireEvent.change(screen.getByLabelText("Coverage mode"), {
      target: { value: "selected_counties" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add coverage" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one county.");
  });

  it("renders empty counties for unsupported states when used directly", async () => {
    const { getCountiesForState } = await import("../coverage/counties");
    expect(getCountiesForState("KY")).toEqual([]);

    renderBuilder();
    fireEvent.change(screen.getByLabelText("Coverage mode"), {
      target: { value: "selected_counties" },
    });

    const counties = within(screen.getByRole("group", { name: "Counties" }));
    expect(counties.getByLabelText("Franklin")).toBeInTheDocument();
  });
});
