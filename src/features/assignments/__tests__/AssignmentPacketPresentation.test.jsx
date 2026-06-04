// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const assignmentApiState = vi.hoisted(() => ({
  acceptAssignment: vi.fn(),
  cancelAssignment: vi.fn(),
  completeAssignment: vi.fn(),
  createOrderCompanyAssignmentInvitation: vi.fn(),
  createOrderCompanyAssignmentWorkInvitation: vi.fn(),
  declineAssignment: vi.fn(),
  revokeAssignment: vi.fn(),
  startAssignment: vi.fn(),
  submitAssignment: vi.fn(),
}));

vi.mock("../api", () => ({
  acceptAssignment: assignmentApiState.acceptAssignment,
  cancelAssignment: assignmentApiState.cancelAssignment,
  completeAssignment: assignmentApiState.completeAssignment,
  createOrderCompanyAssignmentInvitation: assignmentApiState.createOrderCompanyAssignmentInvitation,
  createOrderCompanyAssignmentWorkInvitation: assignmentApiState.createOrderCompanyAssignmentWorkInvitation,
  declineAssignment: assignmentApiState.declineAssignment,
  revokeAssignment: assignmentApiState.revokeAssignment,
  startAssignment: assignmentApiState.startAssignment,
  submitAssignment: assignmentApiState.submitAssignment,
}));

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
  beforeEach(() => {
    Object.values(assignmentApiState).forEach((mock) => mock.mockReset());
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

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

    expect(screen.getByText("Work Request")).toBeInTheDocument();
    expect(screen.getByLabelText("Work Request detail")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "#26001 · Vendor Appraisal" })).toBeInTheDocument();
    expect(screen.getByText(/Offer from Owner AMC/)).toBeInTheDocument();
    expect(screen.getByText("Work Request Actions")).toBeInTheDocument();
    expect(screen.getByLabelText("Work Request Actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Work Request Details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Instructions" })).toBeInTheDocument();
    expect(screen.getByText("Confirm access before inspection.")).toBeInTheDocument();
    expect(screen.getByTestId("assignment-activity")).toHaveTextContent("assignment-1");
  });

  it("renders assigned work packets without adding owner order navigation", () => {
    renderPacket(<AssignedWorkPacket packet={basePacket} />);

    expect(screen.getByText("Active Work")).toBeInTheDocument();
    expect(screen.getByLabelText("Active Work detail")).toBeInTheDocument();
    expect(screen.getByText(/Assigned to your company by Owner AMC/)).toBeInTheDocument();
    expect(screen.getByText("Assignment Actions")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open order/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Assignment Details" })).toBeInTheDocument();
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

  it("shows assignment invitation generation for offered owner vendor appraisal packets", async () => {
    assignmentApiState.createOrderCompanyAssignmentInvitation.mockResolvedValue({
      invitation_id: "invitation-1",
      assignment_id: "assignment-1",
      path: "/vendor/assignment-offers/token-1",
    });

    renderPacket(
      <OwnerAssignmentPacket
        packet={{
          ...basePacket,
          order_id: "order-1",
          assignment_status: "offered",
          relationship_type: "amc_vendor",
          relationship_status: "active",
          order_status: "in_review",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate Assignment Link" }));

    await waitFor(() => {
      expect(assignmentApiState.createOrderCompanyAssignmentInvitation).toHaveBeenCalledWith("assignment-1");
    });
    expect(await screen.findByText("/vendor/assignment-offers/token-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Email Text" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Assignment link generated.");
  });

  it("hides assignment invitation generation for non-offered owner packets", () => {
    renderPacket(
      <OwnerAssignmentPacket
        packet={{
          ...basePacket,
          order_id: "order-1",
          assignment_status: "accepted",
          relationship_type: "amc_vendor",
          relationship_status: "active",
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Generate Assignment Link" })).not.toBeInTheDocument();
    expect(assignmentApiState.createOrderCompanyAssignmentInvitation).not.toHaveBeenCalled();
  });

  it("shows work link generation for accepted owner vendor appraisal packets", async () => {
    assignmentApiState.createOrderCompanyAssignmentWorkInvitation.mockResolvedValue({
      invitation_id: "work-invitation-1",
      assignment_id: "assignment-1",
      path: "/vendor/assignment-work/token-1",
    });

    renderPacket(
      <OwnerAssignmentPacket
        packet={{
          ...basePacket,
          order_id: "order-1",
          assignment_status: "accepted",
          relationship_type: "amc_vendor",
          relationship_status: "active",
          order_status: "in_review",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate Work Link" }));

    await waitFor(() => {
      expect(assignmentApiState.createOrderCompanyAssignmentWorkInvitation).toHaveBeenCalledWith("assignment-1");
    });
    expect(await screen.findByText("/vendor/assignment-work/token-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Email Text" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Work link generated.");
  });

  it("hides work link generation for offered and submitted owner packets", () => {
    const { rerender } = renderPacket(
      <OwnerAssignmentPacket
        packet={{
          ...basePacket,
          order_id: "order-1",
          assignment_status: "offered",
          relationship_type: "amc_vendor",
          relationship_status: "active",
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Generate Work Link" })).not.toBeInTheDocument();

    rerender(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <OwnerAssignmentPacket
          packet={{
            ...basePacket,
            order_id: "order-1",
            assignment_status: "submitted",
            relationship_type: "amc_vendor",
            relationship_status: "active",
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "Generate Work Link" })).not.toBeInTheDocument();
  });

  it("copies a safe ready-to-paste assignment work email draft", async () => {
    assignmentApiState.createOrderCompanyAssignmentWorkInvitation.mockResolvedValue({
      invitation_id: "work-invitation-1",
      assignment_id: "assignment-1",
      path: "/vendor/assignment-work/token-1",
    });

    renderPacket(
      <OwnerAssignmentPacket
        packet={{
          ...basePacket,
          order_id: "order-1",
          assignment_status: "in_progress",
          relationship_type: "amc_vendor",
          relationship_status: "active",
          city: "Columbus",
          state: "OH",
          contact_name: "Jordan Franklin",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate Work Link" }));
    fireEvent.click(await screen.findByRole("button", { name: "Copy Email Text" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    });
    const draft = navigator.clipboard.writeText.mock.calls[0][0];
    expect(draft).toContain("Subject: Assignment work link for order 26001");
    expect(draft).toContain("Hello Jordan Franklin,");
    expect(draft).toContain("Order: 26001");
    expect(draft).toContain("Property: Columbus, OH");
    expect(draft).toContain("/vendor/assignment-work/token-1");
    expect(draft).not.toMatch(/client fee|AMC margin|internal id/i);
    expect(screen.getByRole("status")).toHaveTextContent("Email text copied.");
  });

  it("hides assignment invitation generation for non-vendor assignment packets", () => {
    renderPacket(
      <OwnerAssignmentPacket
        packet={{
          ...basePacket,
          order_id: "order-1",
          assignment_status: "offered",
          assignment_type: "review_provider",
          relationship_type: "review_provider",
          relationship_status: "active",
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Generate Assignment Link" })).not.toBeInTheDocument();
  });

  it("copies generated assignment invitation links to the clipboard", async () => {
    assignmentApiState.createOrderCompanyAssignmentInvitation.mockResolvedValue({
      invitation_id: "invitation-1",
      assignment_id: "assignment-1",
      path: "/vendor/assignment-offers/token-1",
    });

    renderPacket(
      <OwnerAssignmentPacket
        packet={{
          ...basePacket,
          order_id: "order-1",
          assignment_status: "offered",
          relationship_type: "amc_vendor",
          relationship_status: "active",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate Assignment Link" }));
    fireEvent.click(await screen.findByRole("button", { name: "Copy Link" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("/vendor/assignment-offers/token-1");
    });
    expect(screen.getByRole("status")).toHaveTextContent("Link copied.");
  });

  it("copies a safe ready-to-paste assignment offer email draft", async () => {
    assignmentApiState.createOrderCompanyAssignmentInvitation.mockResolvedValue({
      invitation_id: "invitation-1",
      assignment_id: "assignment-1",
      path: "/vendor/assignment-offers/token-1",
    });

    renderPacket(
      <OwnerAssignmentPacket
        packet={{
          ...basePacket,
          order_id: "order-1",
          assignment_status: "offered",
          relationship_type: "amc_vendor",
          relationship_status: "active",
          city: "Columbus",
          state: "OH",
          contact_name: "Jordan Franklin",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate Assignment Link" }));
    fireEvent.click(await screen.findByRole("button", { name: "Copy Email Text" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    });
    const draft = navigator.clipboard.writeText.mock.calls[0][0];
    expect(draft).toContain("Subject: Assignment offer for order 26001");
    expect(draft).toContain("Hello Jordan Franklin,");
    expect(draft).toContain("Order: 26001");
    expect(draft).toContain("Property: Columbus, OH");
    expect(draft).toContain("/vendor/assignment-offers/token-1");
    expect(draft).not.toMatch(/client fee|AMC margin|internal id/i);
    expect(screen.getByRole("status")).toHaveTextContent("Email text copied.");
  });

  it("keeps the generated assignment link visible when clipboard is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    assignmentApiState.createOrderCompanyAssignmentInvitation.mockResolvedValue({
      invitation_id: "invitation-1",
      assignment_id: "assignment-1",
      path: "/vendor/assignment-offers/token-1",
    });

    renderPacket(
      <OwnerAssignmentPacket
        packet={{
          ...basePacket,
          order_id: "order-1",
          assignment_status: "offered",
          relationship_type: "amc_vendor",
          relationship_status: "active",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate Assignment Link" }));
    fireEvent.click(await screen.findByRole("button", { name: "Copy Link" }));

    expect(screen.getByText("/vendor/assignment-offers/token-1")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("Select the text to copy.");
  });
});
