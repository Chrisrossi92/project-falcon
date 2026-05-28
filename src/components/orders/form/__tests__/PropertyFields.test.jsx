// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PropertyFields, { PROPERTY_TYPES, REPORT_TYPES } from "../PropertyFields";

describe("PropertyFields options", () => {
  afterEach(() => cleanup());

  it("uses the V1 appraisal-office property type list", () => {
    expect(PROPERTY_TYPES).toEqual(expect.arrayContaining([
      "Industrial",
      "Office",
      "Retail",
      "Multifamily",
      "Land",
      "Mixed-Use",
      "Special Purpose",
      "Medical Office",
      "Self Storage",
      "Hospitality",
      "Restaurant",
      "Auto Service",
      "Car Wash",
      "Gas Station/C-Store",
      "Bank Branch",
      "School/Daycare",
      "Religious Facility",
      "Agricultural",
      "Residential",
      "Other",
    ]));
  });

  it("uses V1 report/product options and preserves legacy selected values", () => {
    expect(REPORT_TYPES).toEqual([
      "Appraisal",
      "Restricted Appraisal",
      "Construction Draw",
      "Trip Fee",
      "Review",
      "Other",
    ]);

    render(
      <PropertyFields
        value={{ report_type: "Narrative" }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("option", { name: "Narrative (legacy)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Appraisal" })).toBeInTheDocument();
  });
});
