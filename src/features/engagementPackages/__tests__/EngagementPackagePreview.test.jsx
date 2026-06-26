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
    expect(screen.getAllByText("Company Guidelines").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Client Documents").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Property Information")).toBeInTheDocument();
    expect(screen.getByText("12969 Eckel Junction Road")).toBeInTheDocument();
    expect(screen.getByText("ABC Valuation")).toBeInTheDocument();
    expect(screen.getByText("Ross Bank")).toBeInTheDocument();
    expect(screen.getAllByText("Please confirm inspection availability.").length).toBeGreaterThanOrEqual(1);
  });

  it("uses honest empty states instead of fake attachment data", () => {
    render(<EngagementPackagePreview order={{ property_address: "100 Main Street" }} />);

    expect(screen.getByText("No company guideline documents are currently loaded for this order.")).toBeInTheDocument();
    expect(screen.getByText("No client documents are currently loaded for this order.")).toBeInTheDocument();
    expect(screen.getByText("No property or source documents are currently loaded for this order.")).toBeInTheDocument();
    expect(screen.getByText("No other attachments are currently loaded for this order.")).toBeInTheDocument();
    expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
  });

  it("renders package document sections from existing order document metadata", () => {
    render(
      <EngagementPackagePreview
        order={{ property_address: "100 Main Street" }}
        attachments={[
          {
            id: "guidelines-1",
            title: "Continental Vendor Guidelines.pdf",
            category: "company_guidelines",
            visibility_scope: "assigned",
            file_size: 2048,
          },
          {
            id: "client-1",
            file_name: "Engagement Letter.pdf",
            category: "engagement",
            visibility_scope: "internal",
          },
          {
            id: "source-1",
            title: "Rent Roll.xlsx",
            category: "source_documents",
            visibility_scope: "assigned",
          },
          {
            id: "media-1",
            title: "Property Photos.zip",
            category: "property_media",
            visibility_scope: "assigned",
          },
          {
            id: "other-1",
            title: "Revision Notes.pdf",
            category: "review_revisions",
            visibility_scope: "internal",
          },
          {
            id: "archived-1",
            title: "Archived Workfile.pdf",
            category: "internal_workfile",
            status: "archived",
          },
        ]}
      />,
    );

    expect(screen.getByRole("region", { name: "Company Guidelines" })).toHaveTextContent("Continental Vendor Guidelines.pdf");
    expect(screen.getByRole("region", { name: "Client Documents" })).toHaveTextContent("Engagement Letter.pdf");
    expect(screen.getByRole("region", { name: "Property / Source Documents" })).toHaveTextContent("Rent Roll.xlsx");
    expect(screen.getByRole("region", { name: "Property / Source Documents" })).toHaveTextContent("Property Photos.zip");
    expect(screen.getByRole("region", { name: "Other Attachments" })).toHaveTextContent("Revision Notes.pdf");
    expect(screen.queryByText("Archived Workfile.pdf")).toBeNull();
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
    expect(model.documentSections.find((section) => section.key === "client-documents")?.documents).toEqual([
      expect.objectContaining({
        id: "doc-1",
        name: "Rent Roll.pdf",
        type: "Client Document",
      }),
    ]);
    expect(model.sections.map((section) => section.title)).toContain("Fee");
    expect(model.sections.map((section) => section.title)).toContain("Special Instructions");
  });
});
