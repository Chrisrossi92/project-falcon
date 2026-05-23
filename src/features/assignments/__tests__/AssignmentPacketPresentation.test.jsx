// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import AssignedOfferPacket from "../AssignedOfferPacket";
import AssignedWorkPacket from "../AssignedWorkPacket";
import OwnerAssignmentPacket from "../OwnerAssignmentPacket";

vi.mock("../components/AssignmentActivityTimeline", () => ({
  default: ({ assignmentId }) => (
    <section data-testid="assignment-activity">
      Assignment activity for {assignmentId}
    </section>
  ),
}));

const basePacket = {
  assignment_id: "assignment-1",
  assignment_status: "in_progress",
  assignment_type: "vendor_appraisal",
  owner_company_name: "Owner AMC",
  assigned_company_name: "Field Partner",
  order_number: "26001",
  city: "Denver",
  state: "CO",
  report_type: "Full appraisal",
  property_type: "Single family",
  due_at: "2026-05-25T12:00:00.000Z",
  review_due_at: "2026-05-26T12:00:00.000Z",
  instructions: "Confirm access before inspection.",
  terms: { scope: "Interior inspection" },
  handoff_payload: { property_summary: "Single family home" },
  submission_payload: { note: "Submitted for review" },
};

function renderPacket(ui) {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      {ui}
    </MemoryRouter>,
  );
}

describe("assignment packet detail presentation", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders assigned offer packets with the shared packet hierarchy", () => {
    renderPacket(
      <AssignedOfferPacket
        packet={{
          ...basePacket,
          assignment_status: "offered",
          expires_at: "2026-05-24T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Offer Packet")).toBeInTheDocument();
    expect(screen.getByLabelText("Offer Packet detail")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "#26001 · Vendor Appraisal" })).toBeInTheDocument();
    expect(screen.getByText(/Offer from Owner AMC/)).toBeInTheDocument();
    expect(screen.getByText("Packet Actions")).toBeInTheDocument();
    expect(screen.getByLabelText("Packet actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Packet Context" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Instructions" })).toBeInTheDocument();
    expect(screen.getByText("Confirm access before inspection.")).toBeInTheDocument();
    expect(screen.getByTestId("assignment-activity")).toHaveTextContent("assignment-1");
  });

  it("renders assigned work packets without adding owner order navigation", () => {
    renderPacket(<AssignedWorkPacket packet={basePacket} />);

    expect(screen.getByText("Assigned Work Packet")).toBeInTheDocument();
    expect(screen.getByLabelText("Assigned Work Packet detail")).toBeInTheDocument();
    expect(screen.getByText(/Assigned to your company by Owner AMC/)).toBeInTheDocument();
    expect(screen.getByText("Packet Actions")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open order/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Packet Context" })).toBeInTheDocument();
    expect(screen.getByText("Interior inspection")).toBeInTheDocument();
  });

  it("keeps owner packet order navigation as an owner-side secondary action", () => {
    renderPacket(
      <OwnerAssignmentPacket
        packet={{
          ...basePacket,
          order_id: "order-1",
          relationship_type: "vendor",
          relationship_status: "active",
          order_status: "in_review",
        }}
      />,
    );

    expect(screen.getByText("Owner Packet")).toBeInTheDocument();
    expect(screen.getByLabelText("Owner Packet detail")).toBeInTheDocument();
    expect(screen.getByText(/Owner-company management packet for Field Partner/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open order for assignment packet #26001 · Vendor Appraisal" })).toHaveAttribute(
      "href",
      "/orders/order-1",
    );
    expect(screen.getByText("Packet Actions")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Packet Context" })).toBeInTheDocument();
  });
});
