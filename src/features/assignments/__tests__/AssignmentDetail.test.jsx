// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const permissionState = vi.hoisted(() => ({
  loading: false,
  allowed: new Set(["order_company_assignments.read_owner"]),
}));

const assignmentApiState = vi.hoisted(() => ({
  acceptAssignment: vi.fn(),
  cancelAssignment: vi.fn(),
  completeAssignment: vi.fn(),
  createOrderCompanyAssignmentInvitation: vi.fn(),
  declineAssignment: vi.fn(),
  getAssignedOfferPacket: vi.fn(),
  getAssignedWorkPacket: vi.fn(),
  getOwnerAssignmentPacket: vi.fn(),
  revokeAssignment: vi.fn(),
  startAssignment: vi.fn(),
  submitAssignment: vi.fn(),
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    loading: permissionState.loading,
    hasPermission: (permission) => permissionState.allowed.has(permission),
  }),
}));

vi.mock("../api", () => ({
  acceptAssignment: assignmentApiState.acceptAssignment,
  cancelAssignment: assignmentApiState.cancelAssignment,
  completeAssignment: assignmentApiState.completeAssignment,
  createOrderCompanyAssignmentInvitation: assignmentApiState.createOrderCompanyAssignmentInvitation,
  declineAssignment: assignmentApiState.declineAssignment,
  getAssignedOfferPacket: assignmentApiState.getAssignedOfferPacket,
  getAssignedWorkPacket: assignmentApiState.getAssignedWorkPacket,
  getOwnerAssignmentPacket: assignmentApiState.getOwnerAssignmentPacket,
  revokeAssignment: assignmentApiState.revokeAssignment,
  startAssignment: assignmentApiState.startAssignment,
  submitAssignment: assignmentApiState.submitAssignment,
}));

vi.mock("../components/AssignmentActivityTimeline", () => ({
  default: ({ assignmentId }) => (
    <section data-testid="assignment-activity">
      Assignment activity for {assignmentId}
    </section>
  ),
}));

const { default: AssignmentDetail } = await import("../AssignmentDetail");

const ownerPacket = {
  assignment_id: "assignment-1",
  assignment_status: "offered",
  assignment_type: "vendor_appraisal",
  owner_company_id: "owner-company-1",
  assigned_company_id: "vendor-company-1",
  assigned_company_name: "Field Partner",
  relationship_id: "relationship-1",
  relationship_type: "amc_vendor",
  relationship_status: "active",
  order_id: "order-1",
  order_number: "26001",
  order_status: "in_review",
  city: "Columbus",
  state: "OH",
  report_type: "Full appraisal",
  property_type: "Single family",
  due_at: "2026-05-25T12:00:00.000Z",
  instructions: "Confirm access before inspection.",
  terms: {},
  handoff_payload: {},
  submission_payload: {},
  compliance_snapshot: {},
};

function renderAssignmentDetail(initialPath = "/assignments/assignment-1") {
  return render(
    <MemoryRouter initialEntries={[initialPath]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route path="/assignments/:assignmentId" element={<AssignmentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

function absoluteLink(path) {
  return new URL(path, window.location.origin).toString();
}

describe("AssignmentDetail assignment invitation actions", () => {
  beforeEach(() => {
    permissionState.loading = false;
    permissionState.allowed = new Set(["order_company_assignments.read_owner"]);
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

  it("renders Generate Assignment Link for offered owner vendor appraisal assignment details", async () => {
    assignmentApiState.getOwnerAssignmentPacket.mockResolvedValue(ownerPacket);

    renderAssignmentDetail();

    expect(await screen.findByRole("button", { name: "Generate Assignment Link" })).toBeInTheDocument();
    expect(assignmentApiState.getOwnerAssignmentPacket).toHaveBeenCalledWith("assignment-1");
    expect(screen.getByText("Assignment invitation")).toBeInTheDocument();
  });

  it("generates and displays an assignment invitation link from AssignmentDetail", async () => {
    assignmentApiState.getOwnerAssignmentPacket.mockResolvedValue(ownerPacket);
    assignmentApiState.createOrderCompanyAssignmentInvitation.mockResolvedValue({
      invitation_id: "invitation-1",
      assignment_id: "assignment-1",
      path: "/vendor/assignment-offers/token-1",
    });

    renderAssignmentDetail();

    fireEvent.click(await screen.findByRole("button", { name: "Generate Assignment Link" }));

    await waitFor(() => {
      expect(assignmentApiState.createOrderCompanyAssignmentInvitation).toHaveBeenCalledWith("assignment-1");
    });
    expect(await screen.findByRole("link", { name: absoluteLink("/vendor/assignment-offers/token-1") })).toHaveAttribute(
      "href",
      absoluteLink("/vendor/assignment-offers/token-1"),
    );
  });

  it("does not render assignment invitation actions for non-offered owner assignment details", async () => {
    assignmentApiState.getOwnerAssignmentPacket.mockResolvedValue({
      ...ownerPacket,
      assignment_status: "accepted",
    });

    renderAssignmentDetail();

    await screen.findByText("Owner Packet");
    expect(screen.queryByRole("button", { name: "Generate Assignment Link" })).not.toBeInTheDocument();
  });
});
