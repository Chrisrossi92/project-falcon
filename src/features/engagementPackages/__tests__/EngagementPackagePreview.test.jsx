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
          instructions: "Please confirm inspection availability.",
        }}
      />,
    );

    expect(screen.getByLabelText("Engagement package preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Engagement Letter Preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Package Readiness")).toBeInTheDocument();
    expect(screen.getByLabelText("Assignment Intelligence")).toBeInTheDocument();
    expect(screen.getByText("This checklist is informational and does not block assignment.")).toBeInTheDocument();
    expect(screen.getByText("Engagement Letter")).toBeInTheDocument();
    expect(screen.getByText("Assignment Summary")).toBeInTheDocument();
    expect(screen.getAllByText("Company Guidelines").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Client Documents").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Property Information")).toBeInTheDocument();
    expect(screen.getAllByText("12969 Eckel Junction Road").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("ABC Valuation").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ross Bank").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Loan underwriting")).toBeInTheDocument();
    expect(screen.getByText("Ross Bank credit committee")).toBeInTheDocument();
    expect(screen.getByText("123-456-789")).toBeInTheDocument();
    expect(screen.getByText("Fee Simple")).toBeInTheDocument();
    expect(screen.getByText("As Is")).toBeInTheDocument();
    expect(screen.getByText("All Applicable")).toBeInTheDocument();
    expect(screen.getAllByText("Please confirm inspection availability.").length).toBeGreaterThanOrEqual(1);
  });

  it("renders assignment intelligence with package health, timeline, vendor, and document reasons", () => {
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

    const intelligence = screen.getByLabelText("Assignment Intelligence");
    expect(intelligence).toHaveTextContent("Explainable, read-only checks from the current package preview data.");
    expect(intelligence).toHaveTextContent("Package Health");
    expect(intelligence).toHaveTextContent("9 of 9 ready");
    expect(intelligence).toHaveTextContent("No required readiness gaps were found in the current package data.");
    expect(intelligence).toHaveTextContent("Timeline Risk");
    expect(intelligence).toHaveTextContent("Low risk");
    expect(intelligence).toHaveTextContent("is on or before the client expected date");
    expect(intelligence).toHaveTextContent("Vendor Readiness");
    expect(intelligence).toHaveTextContent("ABC Valuation is selected for this offer.");
    expect(intelligence).toHaveTextContent("Credential data not available yet in the current vendor candidate data.");
    expect(intelligence).toHaveTextContent("Package Documents");
    expect(intelligence).toHaveTextContent("2 package documents");
    expect(intelligence).toHaveTextContent("1 company guideline document loaded from package documents.");
    expect(intelligence).toHaveTextContent("1 client or source document loaded from package documents.");
  });

  it("explains missing assignment intelligence items without disabling preview content", () => {
    render(<EngagementPackagePreview order={{ property_address: "100 Main Street" }} />);

    const intelligence = screen.getByLabelText("Assignment Intelligence");
    expect(intelligence).toHaveTextContent("Package Health");
    expect(intelligence).toHaveTextContent("2 of 9 ready");
    expect(intelligence).toHaveTextContent("Missing client name");
    expect(intelligence).toHaveTextContent("This appears because the package readiness checklist does not have this required value.");
    expect(intelligence).toHaveTextContent("Timeline Risk");
    expect(intelligence).toHaveTextContent("Missing due date");
    expect(intelligence).toHaveTextContent("Vendor due date is missing, so Falcon cannot compare assignment timing.");
    expect(intelligence).toHaveTextContent("Vendor Readiness");
    expect(intelligence).toHaveTextContent("Missing vendor");
    expect(intelligence).toHaveTextContent("No vendor is selected, so Falcon cannot prepare a vendor-specific assignment package.");
    expect(intelligence).toHaveTextContent("No company guideline documents are loaded in the current package document groups.");
    expect(intelligence).toHaveTextContent("No client or source documents are loaded in the current package document groups.");
    expect(screen.getByLabelText("Engagement Letter Preview")).toBeInTheDocument();
  });

  it("warns when vendor due date is after the client expected date", () => {
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
    expect(intelligence).toHaveTextContent("Review timing");
    expect(intelligence).toHaveTextContent("is after the client expected date");
  });

  it("renders readiness states from available package data", () => {
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
    expect(readiness).toHaveTextContent("Property address");
    expect(readiness).toHaveTextContent("Ready");
    expect(readiness).toHaveTextContent("Assignment fee");
    expect(readiness).toHaveTextContent("$2,500.00");
    expect(readiness).toHaveTextContent("Company guidelines");
    expect(readiness).toHaveTextContent("1 attached");
    expect(readiness).toHaveTextContent("Client/source documents");
    expect(readiness).toHaveTextContent("1 attached");
    expect(readiness).toHaveTextContent("Special instructions");
    expect(readiness).toHaveTextContent("Call before inspection.");
  });

  it("shows missing and optional readiness states without blocking the preview", () => {
    render(<EngagementPackagePreview order={{ property_address: "100 Main Street" }} />);

    const readiness = screen.getByLabelText("Package Readiness");
    expect(readiness).toHaveTextContent("Client name");
    expect(readiness).toHaveTextContent("Missing client name");
    expect(readiness).toHaveTextContent("Vendor selected");
    expect(readiness).toHaveTextContent("Missing selected vendor");
    expect(readiness).toHaveTextContent("Assignment fee");
    expect(readiness).toHaveTextContent("Missing assignment fee");
    expect(readiness).toHaveTextContent("Company guidelines");
    expect(readiness).toHaveTextContent("No company guidelines attached");
    expect(readiness).toHaveTextContent("Client/source documents");
    expect(readiness).toHaveTextContent("No client or source documents loaded");
    expect(readiness).toHaveTextContent("Special instructions");
    expect(readiness).toHaveTextContent("No special instructions provided");
    expect(readiness).toHaveTextContent("Optional");
    expect(screen.getByLabelText("Engagement Letter Preview")).toBeInTheDocument();
  });

  it("uses honest empty states instead of fake attachment data", () => {
    render(<EngagementPackagePreview order={{ property_address: "100 Main Street" }} />);

    expect(screen.getByLabelText("Engagement Letter Preview")).toHaveTextContent("Not provided");
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
    expect(model.readinessChecklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "property-address",
          status: "ready",
        }),
        expect.objectContaining({
          key: "company-guidelines",
          status: "missing",
        }),
        expect.objectContaining({
          key: "client-source-documents",
          status: "ready",
        }),
      ]),
    );
    expect(model.assignmentIntelligence.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "package-health",
          summary: "4 of 9 ready",
        }),
        expect.objectContaining({
          key: "timeline-risk",
          status: "missing",
        }),
        expect.objectContaining({
          key: "package-documents",
          summary: "1 package document",
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
