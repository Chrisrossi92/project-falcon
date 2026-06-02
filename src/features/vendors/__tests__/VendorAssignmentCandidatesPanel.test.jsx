// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const vendorApiState = vi.hoisted(() => ({
  listVendorAssignmentCandidates: vi.fn(),
}));

vi.mock("../api", () => ({
  listVendorAssignmentCandidates: vendorApiState.listVendorAssignmentCandidates,
}));

const { default: VendorAssignmentCandidatesPanel } = await import(
  "../components/VendorAssignmentCandidatesPanel.jsx"
);

const candidateRows = [
  {
    vendor_profile_id: "profile-1",
    vendor_company_id: "company-1",
    vendor_company_name: "ABC Valuation",
    vendor_status: "preferred",
    relationship_status: "active",
    match_score: 100,
    match_reasons: {
      geography: {
        best_match: "zip",
      },
      product: {
        matched_product_types: ["commercial"],
      },
      vendor_status: "preferred",
      relationship_status: "active",
    },
    coverage_matches: [
      {
        vendor_service_area_id: "area-1",
        state: "OH",
        zip: "43215",
        county: null,
        market: null,
        radius_miles: null,
        product_type: "commercial",
        match_type: "zip",
      },
      {
        vendor_service_area_id: "area-2",
        state: "OH",
        zip: null,
        county: "Franklin",
        market: null,
        radius_miles: null,
        product_type: "commercial",
        match_type: "county",
      },
    ],
    primary_contact: {
      name: "Mary Jones",
      email: "mary@example.test",
      phone: "614-555-0100",
      role_label: "Coordinator",
    },
    warning_flags: ["missing_order_market"],
  },
];

describe("VendorAssignmentCandidatesPanel", () => {
  beforeEach(() => {
    vendorApiState.listVendorAssignmentCandidates.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render or fetch when disabled", () => {
    render(<VendorAssignmentCandidatesPanel orderId="order-1" enabled={false} />);

    expect(screen.queryByLabelText("Vendor candidates")).toBeNull();
    expect(vendorApiState.listVendorAssignmentCandidates).not.toHaveBeenCalled();
  });

  it("does not fetch without an order id", () => {
    render(<VendorAssignmentCandidatesPanel enabled />);

    expect(screen.getByLabelText("Vendor candidates")).toBeInTheDocument();
    expect(screen.getByText("Order context is required before vendor candidates can load.")).toBeInTheDocument();
    expect(vendorApiState.listVendorAssignmentCandidates).not.toHaveBeenCalled();
  });

  it("fetches candidates when enabled with an order id", async () => {
    vendorApiState.listVendorAssignmentCandidates.mockResolvedValue(candidateRows);

    render(<VendorAssignmentCandidatesPanel orderId="order-1" enabled />);

    expect(screen.getByText("Suggested vendors")).toBeInTheDocument();
    expect(screen.getByText("Based on vendor coverage and product fit.")).toBeInTheDocument();
    expect(screen.getByText("This does not assign work automatically.")).toBeInTheDocument();

    await waitFor(() => {
      expect(vendorApiState.listVendorAssignmentCandidates).toHaveBeenCalledWith("order-1");
    });
    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
  });

  it("shows an active vendor assignment note without adding offer actions", async () => {
    vendorApiState.listVendorAssignmentCandidates.mockResolvedValue(candidateRows);

    render(
      <VendorAssignmentCandidatesPanel
        orderId="order-1"
        enabled
        activeVendorAssignment={{
          id: "assignment-1",
          assignment_type: "vendor_appraisal",
          status: "offered",
          assigned_company_name: "ABC Valuation",
        }}
      />,
    );

    expect(
      screen.getByText("This order already has an active vendor offer or assignment."),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /offer assignment/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /bid/i })).toBeNull();
  });

  it("renders loading state while candidates load", () => {
    vendorApiState.listVendorAssignmentCandidates.mockImplementation(() => new Promise(() => {}));

    render(<VendorAssignmentCandidatesPanel orderId="order-1" enabled />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading suggested vendors...");
  });

  it("renders error state when candidate loading fails", async () => {
    vendorApiState.listVendorAssignmentCandidates.mockRejectedValue(new Error("denied"));

    render(<VendorAssignmentCandidatesPanel orderId="order-1" enabled />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Suggested vendors could not load.");
    expect(screen.getByText("Review the order details and try again.")).toBeInTheDocument();
  });

  it("renders empty state when no candidates are returned", async () => {
    vendorApiState.listVendorAssignmentCandidates.mockResolvedValue([]);

    render(<VendorAssignmentCandidatesPanel orderId="order-1" enabled />);

    expect(await screen.findByText("No suggested vendors")).toBeInTheDocument();
    expect(screen.getByText(/matching coverage and product fit/i)).toBeInTheDocument();
  });

  it("renders candidate score, reasons, coverage, contact, and warnings", async () => {
    vendorApiState.listVendorAssignmentCandidates.mockResolvedValue(candidateRows);

    render(<VendorAssignmentCandidatesPanel orderId="order-1" enabled />);

    const card = await screen.findByRole("heading", { name: "ABC Valuation" });
    const candidate = card.closest("article");

    expect(within(candidate).getByText("Strong match")).toBeInTheDocument();
    expect(within(candidate).getByText("100 score")).toBeInTheDocument();
    expect(within(candidate).getByText("Preferred")).toBeInTheDocument();
    expect(within(candidate).getByText("Network: Active")).toBeInTheDocument();
    expect(within(candidate).getByText("Why this vendor?")).toBeInTheDocument();
    expect(within(candidate).getByText("ZIP coverage matches this order")).toBeInTheDocument();
    expect(within(candidate).getByText("Commercial product coverage")).toBeInTheDocument();
    expect(within(candidate).getByText("Preferred vendor")).toBeInTheDocument();
    expect(within(candidate).getByText("Active network vendor")).toBeInTheDocument();
    expect(within(candidate).getByText("Best match: OH · ZIP 43215 · Commercial · Zip")).toBeInTheDocument();
    expect(within(candidate).getByText("OH · ZIP 43215 · Commercial · Zip")).toBeInTheDocument();
    expect(within(candidate).getByText("Mary Jones")).toBeInTheDocument();
    expect(within(candidate).getByText("mary@example.test · 614-555-0100 · Coordinator")).toBeInTheDocument();
    expect(within(candidate).getByText("Review before using")).toBeInTheDocument();
    expect(within(candidate).getByText("Order market is missing, so market coverage could not be checked.")).toBeInTheDocument();
  });

  it("renders match strength labels by score", async () => {
    vendorApiState.listVendorAssignmentCandidates.mockResolvedValue([
      { ...candidateRows[0], vendor_profile_id: "strong", vendor_company_name: "Strong Vendor", match_score: 90 },
      { ...candidateRows[0], vendor_profile_id: "good", vendor_company_name: "Good Vendor", match_score: 70 },
      { ...candidateRows[0], vendor_profile_id: "possible", vendor_company_name: "Possible Vendor", match_score: 50 },
      { ...candidateRows[0], vendor_profile_id: "limited", vendor_company_name: "Limited Vendor", match_score: 49 },
    ]);

    render(<VendorAssignmentCandidatesPanel orderId="order-1" enabled />);

    expect(await screen.findByRole("heading", { name: "Strong Vendor" })).toBeInTheDocument();
    expect(screen.getByText("Strong match")).toBeInTheDocument();
    expect(screen.getByText("Good match")).toBeInTheDocument();
    expect(screen.getByText("Possible match")).toBeInTheDocument();
    expect(screen.getByText("Limited match")).toBeInTheDocument();
  });

  it("maps friendly warning flags", async () => {
    vendorApiState.listVendorAssignmentCandidates.mockResolvedValue([
      {
        ...candidateRows[0],
        warning_flags: [
          "missing_order_zip",
          "missing_order_county",
          "unknown_order_product",
          "market_text_match_only",
          "probation_vendor",
        ],
      },
    ]);

    render(<VendorAssignmentCandidatesPanel orderId="order-1" enabled />);

    expect(await screen.findByText("Order ZIP is missing, so ZIP coverage could not be checked.")).toBeInTheDocument();
    expect(screen.getByText("Order county is missing, so county coverage could not be checked.")).toBeInTheDocument();
    expect(screen.getByText("Order product could not be mapped confidently.")).toBeInTheDocument();
    expect(screen.getByText("Market match is text-only; radius distance was not verified.")).toBeInTheDocument();
    expect(screen.getByText("Vendor is on probation.")).toBeInTheDocument();
  });

  it("keeps additional coverage matches expandable", async () => {
    vendorApiState.listVendorAssignmentCandidates.mockResolvedValue(candidateRows);

    render(<VendorAssignmentCandidatesPanel orderId="order-1" enabled />);

    const summary = await screen.findByText("View all coverage matches");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");

    fireEvent.click(summary);

    expect(details).toHaveAttribute("open");
    expect(screen.getByText("OH · Franklin County · Commercial · County")).toBeInTheDocument();
  });

  it("does not render a fake reason breakdown when reason data is unavailable", async () => {
    vendorApiState.listVendorAssignmentCandidates.mockResolvedValue([
      {
        ...candidateRows[0],
        match_reasons: {},
      },
    ]);

    render(<VendorAssignmentCandidatesPanel orderId="order-1" enabled />);

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(screen.queryByText("Why this vendor?")).toBeNull();
    expect(screen.queryByText("Geography")).toBeNull();
    expect(screen.queryByText("Product")).toBeNull();
  });

  it("does not render assignment, bid, or notification actions", async () => {
    vendorApiState.listVendorAssignmentCandidates.mockResolvedValue(candidateRows);

    render(<VendorAssignmentCandidatesPanel orderId="order-1" enabled />);

    expect(await screen.findByRole("heading", { name: "ABC Valuation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /assign/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /bid/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /notify|notification/i })).toBeNull();
  });
});
