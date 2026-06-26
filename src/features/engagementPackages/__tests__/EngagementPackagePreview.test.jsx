// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import EngagementPackagePreview from "../EngagementPackagePreview";
import { buildEngagementPackagePreviewModel } from "../engagementPackageModel";

describe("EngagementPackagePreview", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the reusable package documents and core order sections", () => {
    render(
      <EngagementPackagePreview
        order={{
          order_number: "2026-100",
          property_address: "12969 Eckel Junction Road",
          city: "Perrysburg",
          state: "OH",
          postal_code: "43551",
          property_type: "industrial",
          report_type: "full_appraisal",
          client_name: "Ross Bank",
          client_due_at: "2026-06-24T16:00:00Z",
        }}
        vendor={{
          vendor_company_name: "ABC Valuation",
          primary_contact: {
            name: "Mary Jones",
            email: "mary@example.test",
          },
        }}
        assignment={{
          assignmentType: "vendor_appraisal",
          dueAt: "2026-06-20T16:00:00Z",
          reviewDueAt: "2026-06-22T16:00:00Z",
          instructions: "Please confirm inspection availability.",
        }}
      />,
    );

    expect(screen.getByLabelText("Engagement package preview")).toBeInTheDocument();
    expect(screen.getByText("Engagement Letter")).toBeInTheDocument();
    expect(screen.getByText("Assignment Summary")).toBeInTheDocument();
    expect(screen.getByText("Company Guidelines")).toBeInTheDocument();
    expect(screen.getByText("Client Documents")).toBeInTheDocument();
    expect(screen.getByText("Property Information")).toBeInTheDocument();
    expect(screen.getByText("12969 Eckel Junction Road")).toBeInTheDocument();
    expect(screen.getByText("ABC Valuation")).toBeInTheDocument();
    expect(screen.getByText("Ross Bank")).toBeInTheDocument();
    expect(screen.getAllByText("Please confirm inspection availability.").length).toBeGreaterThanOrEqual(1);
  });

  it("uses honest empty states instead of fake attachment data", () => {
    render(<EngagementPackagePreview order={{ property_address: "100 Main Street" }} />);

    expect(screen.getByText("No client documents are currently attached to this preview.")).toBeInTheDocument();
    expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
  });

  it("builds a stable model for package generation without side effects", () => {
    const model = buildEngagementPackagePreviewModel({
      order: {
        order_number: "2026-101",
        property_address: "400 Broad Street",
      },
      vendor: {
        vendor_company_name: "Central Ohio Valuation",
      },
      attachments: [
        {
          id: "doc-1",
          name: "Rent Roll.pdf",
          document_type: "Client Document",
        },
      ],
    });

    expect(model.documents.map((document) => document.title)).toEqual([
      "Engagement Letter",
      "Assignment Summary",
      "Company Guidelines",
      "Client Documents",
    ]);
    expect(model.attachments).toEqual([
      {
        id: "doc-1",
        name: "Rent Roll.pdf",
        type: "Client Document",
      },
    ]);
    expect(model.sections.map((section) => section.title)).toContain("Fee");
    expect(model.sections.map((section) => section.title)).toContain("Special Instructions");
  });
});
