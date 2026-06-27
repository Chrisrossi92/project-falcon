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

  it("renders compact steps, assignment terms, readiness, and collapsed package details", () => {
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
          notes: [
            "Parcel number(s): 123-456-789",
            "Interest appraised: Fee Simple",
            "Premise / Condition: As Is",
            "Approaches to Value: All Applicable",
          ].join("\n"),
          intended_use: "Loan underwriting",
          intended_user: "Ross Bank credit committee",
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
          expiresAt: "2026-06-18T16:00:00Z",
          instructions: "Please confirm inspection availability.",
        }}
      />,
    );

    expect(screen.getByLabelText("Engagement package preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Assignment steps")).toHaveTextContent("Vendor selected");
    expect(screen.getByLabelText("Assignment steps")).toHaveTextContent("Assignment terms");
    expect(screen.getByLabelText("Assignment steps")).toHaveTextContent("Package ready");
    expect(screen.getByLabelText("Assignment Terms")).toHaveTextContent("Vendor due date");
    expect(screen.getByLabelText("Assignment Terms")).toHaveTextContent("Review buffer");
    expect(screen.getByLabelText("Assignment Terms")).toHaveTextContent("target 3 business days");
    expect(screen.getByLabelText("Assignment Terms")).toHaveTextContent("Client delivery preview");
    expect(screen.getByLabelText("Assignment Terms")).toHaveTextContent("Offer response window");
    expect(screen.getByLabelText("Assignment Terms")).toHaveTextContent("Please confirm inspection availability.");
    expect(screen.getByLabelText("Package Readiness")).toHaveTextContent("Engagement letter");
    expect(screen.getByLabelText("Package Readiness")).toHaveTextContent("Assignment summary");
    expect(screen.getByLabelText("Package Readiness")).toHaveTextContent("Company guidelines");
    expect(screen.getByLabelText("Package Readiness")).toHaveTextContent("Client/source documents");
    expect(screen.getByLabelText("Engagement Letter Preview")).toBeInTheDocument();
    expect(screen.getByText("Assignment summary details")).toBeInTheDocument();
  });

  it("shows no exception guidance when package artifacts and timing are acceptable", () => {
    render(
      <EngagementPackagePreview
        order={{
          order_number: "2026-100",
          property_address: "12969 Eckel Junction Road",
          client_name: "Ross Bank",
          client_due_at: "2026-06-24T16:00:00Z",
        }}
        vendor={{
          vendor_company_name: "ABC Valuation",
        }}
        assignment={{
          dueAt: "2026-06-18T16:00:00Z",
          feeAmount: 2500,
          instructions: "Call before inspection.",
        }}
        attachments={[
          {
            id: "guidelines-1",
            title: "Continental Vendor Guidelines.pdf",
            category: "company_guidelines",
          },
          {
            id: "source-1",
            title: "Rent Roll.xlsx",
            category: "source_documents",
          },
        ]}
      />,
    );

    const intelligence = screen.getByLabelText("Assignment Intelligence");
    expect(intelligence).toHaveTextContent("Exception-only guidance from the current package preview data.");
    expect(intelligence).toHaveTextContent("No assignment risks detected.");
    expect(intelligence).not.toHaveTextContent("Package Health");
    expect(intelligence).not.toHaveTextContent("Vendor Readiness");
    expect(intelligence).not.toHaveTextContent("Ready");
  });

  it("shows exception guidance for missing documents and due-date issues only", () => {
    render(
      <EngagementPackagePreview
        order={{
          property_address: "100 Main Street",
          client_name: "Ross Bank",
          client_due_at: "2026-06-20T16:00:00Z",
        }}
        vendor={{ vendor_company_name: "ABC Valuation" }}
        assignment={{
          dueAt: "2026-06-24T16:00:00Z",
          feeAmount: 2500,
        }}
      />,
    );

    const intelligence = screen.getByLabelText("Assignment Intelligence");
    expect(intelligence).toHaveTextContent("Missing company guidelines");
    expect(intelligence).toHaveTextContent("No company guideline documents are loaded in the current package document groups.");
    expect(intelligence).toHaveTextContent("Missing client/source documents");
    expect(intelligence).toHaveTextContent("No client or source documents are loaded in the current package document groups.");
    expect(intelligence).toHaveTextContent("Due date after client delivery");
    expect(intelligence).toHaveTextContent("is after the client expected date");
    expect(intelligence).not.toHaveTextContent("ABC Valuation is selected for this offer.");
    expect(screen.getByLabelText("Engagement Letter Preview")).toBeInTheDocument();
  });

  it("renders compact readiness without obvious address, client, and vendor checklist cards", () => {
    render(
      <EngagementPackagePreview
        order={{
          order_number: "2026-100",
          property_address: "12969 Eckel Junction Road",
          client_name: "Ross Bank",
        }}
        vendor={{
          vendor_company_name: "ABC Valuation",
        }}
        assignment={{
          dueAt: "2026-06-20T16:00:00Z",
          feeAmount: 2500,
          instructions: "Call before inspection.",
        }}
        attachments={[
          {
            id: "guidelines-1",
            title: "Continental Vendor Guidelines.pdf",
            category: "company_guidelines",
          },
          {
            id: "source-1",
            title: "Rent Roll.xlsx",
            category: "source_documents",
          },
        ]}
      />,
    );

    const readiness = screen.getByLabelText("Package Readiness");
    expect(readiness).toHaveTextContent("4 of 4 complete");
    expect(readiness).toHaveTextContent("Engagement letter");
    expect(readiness).toHaveTextContent("Assignment summary");
    expect(readiness).toHaveTextContent("Company guidelines");
    expect(readiness).toHaveTextContent("Client/source documents");
    expect(readiness).not.toHaveTextContent("Property address");
    expect(readiness).not.toHaveTextContent("Client name");
    expect(readiness).not.toHaveTextContent("Vendor selected");
    expect(readiness).not.toHaveTextContent("Assignment fee");
  });

  it("uses honest empty states instead of fake attachment data", () => {
    render(<EngagementPackagePreview order={{ property_address: "100 Main Street" }} />);

    expect(screen.getByLabelText("Engagement Letter Preview")).toHaveTextContent("Not provided");
    expect(screen.getByText("No company guideline documents are currently loaded for this order.")).toBeInTheDocument();
    expect(screen.getByText("No client documents are currently loaded for this order.")).toBeInTheDocument();
    expect(screen.getByText("No property or source documents are currently loaded for this order.")).toBeInTheDocument();
    expect(screen.getByText("No other attachments are currently loaded for this order.")).toBeInTheDocument();
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
    expect(model.progressSteps.map((step) => step.key)).toEqual([
      "vendor-selected",
      "assignment-terms",
      "package-ready",
    ]);
    expect(model.readinessChecklist.map((item) => item.key)).toEqual([
      "engagement-letter",
      "assignment-summary",
      "company-guidelines",
      "client-source-documents",
    ]);
    expect(model.readinessSummary).toEqual({
      readyCount: 3,
      totalCount: 4,
      percent: 75,
    });
    expect(model.assignmentIntelligence.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "company-guidelines",
        }),
        expect.objectContaining({
          key: "vendor-due-date",
        }),
      ]),
    );
    expect(model.letterPreview.fields.map((field) => field.label)).toEqual([
      "Order Number",
      "Client",
      "Property",
      "Vendor",
      "Assignment Fee",
      "Requested Delivery",
      "Intended Use",
      "Intended User",
      "Parcel Number(s)",
      "Interest Appraised",
      "Premise / Condition",
      "Approaches to Value",
      "Scope Notes",
    ]);
  });
});
